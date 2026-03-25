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

type DeleteWorkspaceBody = {
  workspaceId?: string;
  confirmationName?: string;
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

export async function DELETE(req: Request) {
  try {
    const context = await resolveWorkspaceContext(req);
    const body = (await req.json().catch(() => null)) as DeleteWorkspaceBody | null;
    const url = new URL(req.url);

    const workspaceId =
      body?.workspaceId?.trim() || url.searchParams.get('id')?.trim() || context.workspaceId;

    const targetWorkspace = context.workspaces.find((workspace) => workspace.id === workspaceId);
    if (!targetWorkspace) {
      throw new HttpError(403, 'Workspace access denied');
    }

    if (targetWorkspace.role !== 'OWNER') {
      throw new HttpError(403, 'Somente o proprietário pode excluir este workspace.');
    }

    const remainingWorkspaces = context.workspaces.filter((workspace) => workspace.id !== workspaceId);
    if (remainingWorkspaces.length === 0) {
      throw new HttpError(409, 'Crie outra conta antes de excluir este workspace.');
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { id: true, name: true },
    });
    if (!workspace) {
      throw new HttpError(404, 'Workspace not found');
    }

    const confirmationName = body?.confirmationName?.trim() || '';
    if (confirmationName !== workspace.name) {
      throw new HttpError(400, 'Digite o nome do workspace exatamente para confirmar a exclusão.');
    }

    await prisma.$transaction(async (tx) => {
      await tx.workspaceEvent.deleteMany({
        where: { workspace_id: workspace.id },
      });
      await tx.dashboardReadModel.deleteMany({
        where: { workspace_id: workspace.id },
      });
      await tx.calendarEventReadModel.deleteMany({
        where: { workspace_id: workspace.id },
      });
      await tx.dailyCashProjection.deleteMany({
        where: { workspace_id: workspace.id },
      });
      await tx.categorySuggestion.deleteMany({
        where: { workspace_id: workspace.id },
      });
      await tx.recurrenceRule.deleteMany({
        where: { workspace_id: workspace.id },
      });
      await tx.financialEvent.deleteMany({
        where: { workspace_id: workspace.id },
      });
      await tx.transaction.deleteMany({
        where: { workspace_id: workspace.id },
      });
      await tx.investment.deleteMany({
        where: { workspace_id: workspace.id },
      });
      await tx.goal.deleteMany({
        where: { workspace_id: workspace.id },
      });
      await tx.recurringDebt.deleteMany({
        where: { workspace_id: workspace.id },
      });
      await tx.debt.deleteMany({
        where: { workspace_id: workspace.id },
      });
      await tx.wallet.deleteMany({
        where: { workspace_id: workspace.id },
      });
      await tx.workspacePreference.deleteMany({
        where: { workspace_id: workspace.id },
      });
      await tx.workspaceSubscription.deleteMany({
        where: { workspace_id: workspace.id },
      });
      await tx.workspaceMember.deleteMany({
        where: { workspace_id: workspace.id },
      });
      await tx.marketingAttribution.deleteMany({
        where: { workspace_id: workspace.id },
      });
      await tx.workspace.delete({
        where: { id: workspace.id },
      });
    });

    return NextResponse.json({
      ok: true,
      deletedWorkspaceId: workspace.id,
      deletedWorkspaceName: workspace.name,
      nextWorkspaceId: remainingWorkspaces[0]?.id || null,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    const prismaError = asPrismaServiceUnavailableError(error);
    if (prismaError) {
      return NextResponse.json({ error: prismaError.message }, { status: 503 });
    }

    console.error('Workspaces DELETE Error:', error);
    return NextResponse.json({ error: 'Failed to delete workspace' }, { status: 500 });
  }
}
