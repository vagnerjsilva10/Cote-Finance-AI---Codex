import 'server-only';
import { assertPrismaAvailable, prisma } from './prisma';
import { Prisma } from '@prisma/client';

type AuthUserInput = {
  id: string;
  email: string;
  name?: string | null;
  avatar_url?: string | null;
  company_name?: string | null;
  phone?: string | null;
  segment?: string | null;
  operations_count?: number | null;
  objective?: string | null;
};

const isMissingTableError = (error: unknown) => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === 'P2021' || error.code === 'P2022';
  }
  const message = error instanceof Error ? error.message : String(error || '');
  return /does not exist|relation .* does not exist|column .* does not exist/i.test(message);
};

const normalizeWorkspacePlan = (value: string | null | undefined) => {
  const normalized = String(value || '')
    .trim()
    .toUpperCase();
  if (normalized === 'PRO' || normalized === 'PREMIUM') {
    return normalized;
  }
  return 'FREE';
};

const serializeError = (error: unknown) => {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
    };
  }
  return {
    name: 'UnknownError',
    message: String(error || 'Unknown error'),
  };
};

const logSubscriptionSyncError = (params: { userId: string; context: string; error: unknown }) => {
  const details = serializeError(params.error);
  console.error('SUBSCRIPTION_SYNC_ERROR', {
    userId: params.userId,
    context: params.context,
    ...details,
  });
};

export async function setupUser(input: AuthUserInput) {
  assertPrismaAvailable();

  const { id, email, name, avatar_url, company_name, segment, objective } = input;
  const defaultWorkspaceName =
    (company_name?.trim() || (name ? `${name.split(' ')[0]} Workspace` : null)) || 'Minha Conta';

  const user = await prisma.user.upsert({
    where: { id },
    update: {
      email,
      name: name ?? undefined,
      avatar_url: avatar_url ?? undefined,
    },
    create: {
      id,
      email,
      name: name ?? undefined,
      avatar_url: avatar_url ?? undefined,
    },
  });

  try {
    await prisma.profile.upsert({
      where: { user_id: id },
      update: {},
      create: {
        user_id: id,
        plan: 'FREE',
      },
    });
  } catch (error) {
    if (!isMissingTableError(error)) {
      throw error;
    }
  }

  let userPlan: { plan: string | null } | null = null;
  try {
    userPlan = await prisma.subscriptionEntitlement.upsert({
      where: { user_id: id },
      update: {},
      create: {
        user_id: id,
        plan: 'FREE',
        status: 'ACTIVE',
      },
      select: { plan: true },
    });
  } catch (error) {
    if (isMissingTableError(error)) {
      logSubscriptionSyncError({
        userId: id,
        context: 'setupUser.subscriptionEntitlement.missing_table',
        error,
      });
    } else {
      logSubscriptionSyncError({
        userId: id,
        context: 'setupUser.subscriptionEntitlement.upsert',
        error,
      });
      try {
        userPlan = await prisma.subscriptionEntitlement.findUnique({
          where: { user_id: id },
          select: { plan: true },
        });
      } catch (readError) {
        if (!isMissingTableError(readError)) {
          logSubscriptionSyncError({
            userId: id,
            context: 'setupUser.subscriptionEntitlement.findUniqueAfterFailure',
            error: readError,
          });
        }
      }
    }
  }

  let membership = await prisma.workspaceMember.findFirst({
    where: { user_id: id },
    orderBy: { id: 'asc' },
  });

  if (!membership) {
    try {
      const workspace = await prisma.workspace.create({
        data: {
          name: defaultWorkspaceName,
        },
      });

      membership = await prisma.workspaceMember.create({
        data: {
          workspace_id: workspace.id,
          user_id: id,
          role: 'OWNER',
        },
      });

      await prisma.wallet.create({
        data: {
          workspace_id: workspace.id,
          name: 'Carteira Principal',
          type: 'CASH',
          balance: 0,
        },
      });

      try {
        await prisma.workspaceSubscription.upsert({
          where: { workspace_id: workspace.id },
          update: {},
          create: {
            workspace_id: workspace.id,
            plan: normalizeWorkspacePlan(userPlan?.plan),
            status: 'ACTIVE',
          },
        });
      } catch {
        // Optional multi-tenant extension table. Ignore when not migrated yet.
      }

      try {
        await prisma.workspacePreference.upsert({
          where: { workspace_id: workspace.id },
          update: {},
          create: {
            workspace_id: workspace.id,
            onboarding_completed: false,
            objective: objective?.trim() || undefined,
            financial_profile: segment?.trim() || undefined,
            ai_suggestions_enabled: true,
          },
        });
      } catch {
        // Optional multi-tenant extension table. Ignore when not migrated yet.
      }
    } catch (error) {
      const existingMembership = await prisma.workspaceMember.findFirst({
        where: { user_id: id },
        orderBy: { id: 'asc' },
      });

      if (!existingMembership) {
        throw error;
      }

      membership = existingMembership;
    }
  }

  return { user, workspaceMember: membership };
}
