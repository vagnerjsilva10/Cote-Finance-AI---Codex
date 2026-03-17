import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { asPrismaServiceUnavailableError, prisma } from '@/lib/prisma';
import {
  HttpError,
  getWorkspacePlan,
  getWorkspacePreference,
  logWorkspaceEventSafe,
  normalizePlan,
  requireAuthenticatedUser,
  resolveWorkspaceContext,
  upsertWorkspacePreferenceSafe,
  upsertWorkspaceSubscriptionSafe,
} from '@/lib/server/multi-tenant';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const context = await resolveWorkspaceContext(req);

    const workspaces = await Promise.all(
      context.workspaces.map(async (workspace) => {
        const [plan, preference] = await Promise.all([
          getWorkspacePlan(workspace.id, context.userId),
          getWorkspacePreference(workspace.id, context.userId),
        ]);

        return {
          id: workspace.id,
          name: workspace.name,
          role: workspace.role,
          plan,
          onboardingCompleted: Boolean(preference.onboarding_completed),
        };
      })
    );

    return NextResponse.json({
      workspaces,
      activeWorkspaceId: context.workspaceId,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    const prismaError = asPrismaServiceUnavailableError(error);
    if (prismaError) {
      return NextResponse.json({ error: prismaError.message }, { status: 503 });
    }

    console.error('Workspaces GET Error:', error);
    return NextResponse.json({ error: 'Failed to fetch workspaces' }, { status: 500 });
  }
}

type CreateWorkspaceBody = {
  name?: string;
};

const isMissingTableError = (error: unknown) => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === 'P2021' || error.code === 'P2022';
  }
  const message = error instanceof Error ? error.message : String(error || '');
  return /does not exist|relation .* does not exist|table .* doesn't exist|column .* does not exist/i.test(
    message
  );
};

async function readCurrentUserPlan(userId: string) {
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
      throw error;
    }
    if (!isMissingTableError(error)) {
      throw error;
    }
    return 'FREE' as const;
  }
}

export async function POST(req: Request) {
  try {
    const authUser = await requireAuthenticatedUser(req);
    const body = (await req.json().catch(() => null)) as CreateWorkspaceBody | null;
    const name = body?.name?.trim() || 'Nova Conta';

    const currentWorkspacePlan = await readCurrentUserPlan(authUser.userId);

    const created = await prisma.$transaction(async (tx) => {
      const workspace = await tx.workspace.create({
        data: {
          name,
        },
        select: {
          id: true,
          name: true,
        },
      });

      await tx.workspaceMember.create({
        data: {
          workspace_id: workspace.id,
          user_id: authUser.userId,
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

      return workspace;
    });

    await Promise.allSettled([
      upsertWorkspaceSubscriptionSafe({
        workspaceId: created.id,
        plan: currentWorkspacePlan,
        status: 'ACTIVE',
      }),
      upsertWorkspacePreferenceSafe({
        workspaceId: created.id,
        onboardingCompleted: false,
        aiSuggestionsEnabled: true,
        userId: authUser.userId,
      }),
      logWorkspaceEventSafe({
        workspaceId: created.id,
        userId: authUser.userId,
        type: 'workspace.created',
        payload: {
          source: 'api/workspaces',
        },
      }),
    ]);

    return NextResponse.json(
      {
        workspace: created,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    const prismaError = asPrismaServiceUnavailableError(error);
    if (prismaError) {
      return NextResponse.json({ error: prismaError.message }, { status: 503 });
    }

    console.error('Workspaces POST Error:', error);
    return NextResponse.json({ error: 'Failed to create workspace' }, { status: 500 });
  }
}
