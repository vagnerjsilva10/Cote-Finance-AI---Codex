import 'server-only';
import { prisma } from './prisma';
import { normalizePlan } from '@/lib/server/multi-tenant';
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

export async function setupUser(input: AuthUserInput) {
  const { id, email, name, avatar_url, company_name, segment, objective } = input;
  const defaultWorkspaceName =
    (company_name?.trim() || (name ? `${name.split(' ')[0]} Workspace` : null)) || 'Minha Conta';

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.upsert({
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
      await tx.profile.upsert({
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

    try {
      await tx.subscriptionEntitlement.upsert({
        where: { user_id: id },
        update: {},
        create: {
          user_id: id,
          plan: 'FREE',
          status: 'ACTIVE',
        },
      });
    } catch (error) {
      if (!isMissingTableError(error)) {
        throw error;
      }
    }

    let membership = await tx.workspaceMember.findFirst({
      where: { user_id: id },
      orderBy: { id: 'asc' },
    });

    if (!membership) {
      const workspace = await tx.workspace.create({
        data: {
          name: defaultWorkspaceName,
        },
      });

      membership = await tx.workspaceMember.create({
        data: {
          workspace_id: workspace.id,
          user_id: id,
          role: 'OWNER',
        },
      });

      await tx.wallet.create({
        data: {
          workspace_id: workspace.id,
          name: 'Carteira Principal',
          type: 'CASH',
          balance: 0,
        },
      });

      let userPlan: { plan: string | null } | null = null;
      try {
        userPlan = await tx.subscriptionEntitlement.findUnique({
          where: { user_id: id },
          select: { plan: true },
        });
      } catch (error) {
        if (!isMissingTableError(error)) {
          throw error;
        }
      }

      try {
        await tx.workspaceSubscription.upsert({
          where: { workspace_id: workspace.id },
          update: {},
          create: {
            workspace_id: workspace.id,
            plan: normalizePlan(userPlan?.plan),
            status: 'ACTIVE',
          },
        });
      } catch {
        // Optional multi-tenant extension table. Ignore when not migrated yet.
      }

      try {
        await tx.workspacePreference.upsert({
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
    }

    return { user, workspaceMember: membership };
  });
}
