import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  HttpError,
  getWorkspacePlan,
  getWorkspacePreference,
  logWorkspaceEventSafe,
  resolveWorkspaceContext,
  upsertWorkspacePreferenceSafe,
  upsertWorkspaceSubscriptionSafe,
} from '@/lib/server/multi-tenant';

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

    console.error('Workspaces GET Error:', error);
    return NextResponse.json({ error: 'Failed to fetch workspaces' }, { status: 500 });
  }
}

type CreateWorkspaceBody = {
  name?: string;
};

export async function POST(req: Request) {
  try {
    const context = await resolveWorkspaceContext(req);
    const body = (await req.json().catch(() => null)) as CreateWorkspaceBody | null;
    const name = body?.name?.trim() || 'Nova Conta';

    const currentWorkspacePlan = await getWorkspacePlan(context.workspaceId, context.userId);

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
          user_id: context.userId,
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

    await Promise.all([
      upsertWorkspaceSubscriptionSafe({
        workspaceId: created.id,
        plan: currentWorkspacePlan,
        status: 'ACTIVE',
      }),
      upsertWorkspacePreferenceSafe({
        workspaceId: created.id,
        onboardingCompleted: false,
        aiSuggestionsEnabled: true,
        userId: context.userId,
      }),
      logWorkspaceEventSafe({
        workspaceId: created.id,
        userId: context.userId,
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

    console.error('Workspaces POST Error:', error);
    return NextResponse.json({ error: 'Failed to create workspace' }, { status: 500 });
  }
}
