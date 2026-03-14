import 'server-only';
import { Prisma } from '@prisma/client';
import { asPrismaServiceUnavailableError, assertPrismaAvailable, prisma } from '@/lib/prisma';
import { getSupabaseClient } from '@/lib/supabase';
import { setupUser } from '@/lib/auth-setup';
import { PLAN_LIMITS, type WorkspacePlan } from '@/lib/billing/limits';
import { getPlanForStoredSubscription, normalizeBillingPlan } from '@/lib/server/billing-status';

export type WorkspaceRole = 'OWNER' | 'ADMIN' | 'MEMBER';
export { PLAN_LIMITS };
export type { WorkspacePlan };

export type WorkspaceSummary = {
  id: string;
  name: string;
  role: WorkspaceRole;
};

export type WorkspaceContext = {
  userId: string;
  email: string | null;
  workspaceId: string;
  role: WorkspaceRole;
  workspaces: WorkspaceSummary[];
};

export class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function normalizePlan(value: string | null | undefined): WorkspacePlan {
  return normalizeBillingPlan(value);
}

function readBearerToken(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  return authHeader.slice('Bearer '.length).trim();
}

function readWorkspaceHint(req: Request) {
  const headerWorkspaceId = req.headers.get('x-workspace-id')?.trim();
  if (headerWorkspaceId) return headerWorkspaceId;

  const url = new URL(req.url);
  const queryWorkspaceId = url.searchParams.get('workspaceId')?.trim();
  if (queryWorkspaceId) return queryWorkspaceId;

  return null;
}

function isMissingTableError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === 'P2021' || error.code === 'P2022';
  }
  const message = error instanceof Error ? error.message : String(error || '');
  return /does not exist|relation .* does not exist|table .* doesn't exist|column .* does not exist/i.test(
    message
  );
}

function throwWorkspaceDatabaseError(error: unknown): never {
  const prismaError = asPrismaServiceUnavailableError(error);
  if (prismaError) {
    throw new HttpError(503, prismaError.message);
  }
  throw error instanceof Error ? error : new Error(String(error || 'Unknown workspace database error'));
}

async function findWorkspaceMemberships(userId: string) {
  assertPrismaAvailable();

  try {
    return await prisma.workspaceMember.findMany({
      where: { user_id: userId },
      include: {
        workspace: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        workspace: {
          created_at: 'asc',
        },
      },
    });
  } catch (error) {
    if (asPrismaServiceUnavailableError(error)) {
      throwWorkspaceDatabaseError(error);
    }

    if (!isMissingTableError(error)) throw error;

    try {
      return await prisma.workspaceMember.findMany({
        where: { user_id: userId },
        include: {
          workspace: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          workspace_id: 'asc',
        },
      });
    } catch (fallbackError) {
      if (asPrismaServiceUnavailableError(fallbackError)) {
        throwWorkspaceDatabaseError(fallbackError);
      }
      throw fallbackError;
    }
  }
}

export async function requireAuthenticatedUser(req: Request) {
  const token = readBearerToken(req);
  if (!token) {
    throw new HttpError(401, 'Unauthorized');
  }

  const supabase = getSupabaseClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user?.id) {
    throw new HttpError(401, 'Unauthorized');
  }

  return {
    userId: user.id,
    email: user.email ?? null,
    token,
  };
}

export async function resolveWorkspaceContext(req: Request): Promise<WorkspaceContext> {
  const authUser = await requireAuthenticatedUser(req);

  let memberships = await findWorkspaceMemberships(authUser.userId);

  if (memberships.length === 0 && authUser.email) {
    await setupUser({
      id: authUser.userId,
      email: authUser.email,
    });
    memberships = await findWorkspaceMemberships(authUser.userId);
  }

  if (memberships.length === 0) {
    throw new HttpError(404, 'Workspace not found');
  }

  const workspaceHint = readWorkspaceHint(req);
  const membership =
    (workspaceHint
      ? memberships.find((item) => item.workspace_id === workspaceHint)
      : null) || memberships[0];

  if (!membership) {
    throw new HttpError(403, 'Workspace access denied');
  }

  return {
    userId: authUser.userId,
    email: authUser.email,
    workspaceId: membership.workspace_id,
    role: (membership.role as WorkspaceRole) || 'MEMBER',
    workspaces: memberships.map((item) => ({
      id: item.workspace.id,
      name: item.workspace.name,
      role: (item.role as WorkspaceRole) || 'MEMBER',
    })),
  };
}

async function readUserFallbackPlan(userId: string): Promise<WorkspacePlan> {
  assertPrismaAvailable();

  try {
    const [entitlement, profile] = await Promise.all([
      prisma.subscriptionEntitlement.findUnique({
        where: { user_id: userId },
        select: { plan: true, status: true },
      }),
      prisma.profile.findUnique({
        where: { user_id: userId },
        select: { plan: true },
      }),
    ]);

    if (entitlement) {
      return entitlement.status === 'ACTIVE' ? normalizePlan(entitlement.plan) : 'FREE';
    }

    return normalizePlan(profile?.plan);
  } catch (error) {
    if (asPrismaServiceUnavailableError(error)) {
      throwWorkspaceDatabaseError(error);
    }
    if (!isMissingTableError(error)) {
      throw error;
    }
    return 'FREE';
  }
}

export async function getWorkspacePlan(workspaceId: string, userId: string): Promise<WorkspacePlan> {
  assertPrismaAvailable();

  try {
    const workspaceSubscription = await prisma.workspaceSubscription.findUnique({
      where: { workspace_id: workspaceId },
      select: { plan: true, status: true },
    });

    if (workspaceSubscription) {
      return getPlanForStoredSubscription({
        plan: workspaceSubscription.plan,
        status: workspaceSubscription.status as 'ACTIVE' | 'CANCELED' | 'PENDING' | null,
      });
    }
  } catch (error) {
    if (asPrismaServiceUnavailableError(error)) {
      throwWorkspaceDatabaseError(error);
    }
    if (!isMissingTableError(error)) {
      throw error;
    }
  }

  return readUserFallbackPlan(userId);
}

export async function upsertWorkspaceSubscriptionSafe(params: {
  workspaceId: string;
  plan: WorkspacePlan;
  status: 'ACTIVE' | 'CANCELED' | 'PENDING';
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  currentPeriodEnd?: Date | null;
}) {
  try {
    return await prisma.workspaceSubscription.upsert({
      where: { workspace_id: params.workspaceId },
      update: {
        plan: params.plan,
        status: params.status,
        stripe_customer_id: params.stripeCustomerId ?? undefined,
        stripe_subscription_id: params.stripeSubscriptionId ?? undefined,
        current_period_end: params.currentPeriodEnd ?? null,
      },
      create: {
        workspace_id: params.workspaceId,
        plan: params.plan,
        status: params.status,
        stripe_customer_id: params.stripeCustomerId ?? undefined,
        stripe_subscription_id: params.stripeSubscriptionId ?? undefined,
        current_period_end: params.currentPeriodEnd ?? null,
      },
    });
  } catch (error) {
    if (asPrismaServiceUnavailableError(error)) {
      return null;
    }
    if (isMissingTableError(error)) return null;
    throw error;
  }
}

export async function getWorkspacePreference(workspaceId: string, userId: string) {
  assertPrismaAvailable();

  try {
    const preference = await prisma.workspacePreference.findUnique({
      where: { workspace_id: workspaceId },
      select: {
        onboarding_completed: true,
        objective: true,
        financial_profile: true,
        ai_suggestions_enabled: true,
      },
    });

    if (preference) return preference;
  } catch (error) {
    if (asPrismaServiceUnavailableError(error)) {
      throwWorkspaceDatabaseError(error);
    }
    if (!isMissingTableError(error)) {
      throw error;
    }
  }

  let profile: { tutorial_completed: boolean | null } | null = null;
  try {
    profile = await prisma.profile.findUnique({
      where: { user_id: userId },
      select: { tutorial_completed: true },
    });
  } catch (error) {
    if (asPrismaServiceUnavailableError(error)) {
      throwWorkspaceDatabaseError(error);
    }
    if (!isMissingTableError(error)) {
      throw error;
    }
  }

  return {
    onboarding_completed: Boolean(profile?.tutorial_completed),
    objective: null,
    financial_profile: null,
    ai_suggestions_enabled: true,
  };
}

export async function upsertWorkspacePreferenceSafe(params: {
  workspaceId: string;
  onboardingCompleted?: boolean;
  objective?: string | null;
  financialProfile?: string | null;
  aiSuggestionsEnabled?: boolean;
  userId?: string;
}) {
  try {
    return await prisma.workspacePreference.upsert({
      where: { workspace_id: params.workspaceId },
      update: {
        onboarding_completed:
          typeof params.onboardingCompleted === 'boolean'
            ? params.onboardingCompleted
            : undefined,
        objective: params.objective ?? undefined,
        financial_profile: params.financialProfile ?? undefined,
        ai_suggestions_enabled:
          typeof params.aiSuggestionsEnabled === 'boolean'
            ? params.aiSuggestionsEnabled
            : undefined,
      },
      create: {
        workspace_id: params.workspaceId,
        onboarding_completed: Boolean(params.onboardingCompleted),
        objective: params.objective ?? undefined,
        financial_profile: params.financialProfile ?? undefined,
        ai_suggestions_enabled:
          typeof params.aiSuggestionsEnabled === 'boolean'
            ? params.aiSuggestionsEnabled
            : true,
      },
    });
  } catch (error) {
    if (asPrismaServiceUnavailableError(error)) {
      return null;
    }
    if (!isMissingTableError(error)) {
      throw error;
    }

    if (params.userId && typeof params.onboardingCompleted === 'boolean') {
      try {
        await prisma.profile.upsert({
          where: { user_id: params.userId },
          update: {
            tutorial_completed: params.onboardingCompleted,
          },
          create: {
            user_id: params.userId,
            tutorial_completed: params.onboardingCompleted,
            plan: 'FREE',
          },
        });
      } catch (profileError) {
        if (!asPrismaServiceUnavailableError(profileError)) {
          throw profileError;
        }
      }
    }
    return null;
  }
}

export async function logWorkspaceEventSafe(params: {
  workspaceId: string;
  userId?: string | null;
  type: string;
  payload?: Prisma.InputJsonObject;
}) {
  try {
    await prisma.workspaceEvent.create({
      data: {
        workspace_id: params.workspaceId,
        user_id: params.userId ?? undefined,
        type: params.type,
        payload: params.payload,
      },
    });
  } catch (error) {
    if (asPrismaServiceUnavailableError(error)) {
      return;
    }
    if (!isMissingTableError(error)) {
      console.error('Workspace event write failed:', error);
    }
  }
}
