import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  HttpError,
  WorkspacePlan,
  getWorkspacePlan,
  getWorkspacePreference,
  logWorkspaceEventSafe,
  normalizePlan,
  resolveWorkspaceContext,
  upsertWorkspacePreferenceSafe,
} from '@/lib/server/multi-tenant';
import { getRuntimePlanLimits } from '@/lib/server/superadmin-governance';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type OnboardingBody = {
  workspaceName?: string;
  objective?: string;
  financialProfile?: string;
  desiredPlan?: string;
  aiSuggestionsEnabled?: boolean;
  dismissed?: boolean;
};

export async function GET(req: Request) {
  try {
    const context = await resolveWorkspaceContext(req);
    const [plan, preference, workspace] = await Promise.all([
      getWorkspacePlan(context.workspaceId, context.userId),
      getWorkspacePreference(context.workspaceId, context.userId),
      prisma.workspace.findUnique({
        where: { id: context.workspaceId },
        select: { id: true, name: true },
      }),
    ]);
    const limits = await getRuntimePlanLimits(plan);

    return NextResponse.json({
      workspace,
      plan,
      limits,
      onboarding: {
        completed: Boolean(preference.onboarding_completed),
        dismissed: Boolean(preference.onboarding_dismissed),
        shouldShow: !preference.onboarding_completed && !preference.onboarding_dismissed,
        objective: preference.objective,
        financialProfile: preference.financial_profile,
        aiSuggestionsEnabled: preference.ai_suggestions_enabled,
      },
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error('Onboarding GET Error:', error);
    return NextResponse.json({ error: 'Failed to load onboarding' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const context = await resolveWorkspaceContext(req);
    const body = (await req.json().catch(() => null)) as OnboardingBody | null;
    if (!body) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const workspaceName = body.workspaceName?.trim();
    const objective = body.objective?.trim() || null;
    const financialProfile = body.financialProfile?.trim() || null;
    const desiredPlan = normalizePlan(body.desiredPlan);
    const aiSuggestionsEnabled =
      typeof body.aiSuggestionsEnabled === 'boolean' ? body.aiSuggestionsEnabled : true;

    if (workspaceName) {
      await prisma.workspace.update({
        where: { id: context.workspaceId },
        data: {
          name: workspaceName,
        },
      });
    }

    await upsertWorkspacePreferenceSafe({
      workspaceId: context.workspaceId,
      onboardingCompleted: true,
      onboardingDismissed: true,
      objective,
      financialProfile,
      aiSuggestionsEnabled,
      userId: context.userId,
    });

    await logWorkspaceEventSafe({
      workspaceId: context.workspaceId,
      userId: context.userId,
      type: 'onboarding.completed',
      payload: {
        objective,
        financialProfile,
        desiredPlan,
      },
    });

    const currentPlan = await getWorkspacePlan(context.workspaceId, context.userId);
    const upgradeRequired =
      (desiredPlan === 'PRO' || desiredPlan === 'PREMIUM') && desiredPlan !== currentPlan;

    return NextResponse.json({
      success: true,
      workspaceId: context.workspaceId,
      currentPlan,
      desiredPlan: desiredPlan as WorkspacePlan,
      upgradeRequired,
      onboarding: {
        completed: true,
        dismissed: true,
        shouldShow: false,
      },
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error('Onboarding POST Error:', error);
    return NextResponse.json({ error: 'Failed to save onboarding' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const context = await resolveWorkspaceContext(req);
    const body = (await req.json().catch(() => null)) as OnboardingBody | null;
    if (!body || typeof body.dismissed !== 'boolean') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    await upsertWorkspacePreferenceSafe({
      workspaceId: context.workspaceId,
      onboardingDismissed: body.dismissed,
      userId: context.userId,
    });

    if (body.dismissed) {
      await logWorkspaceEventSafe({
        workspaceId: context.workspaceId,
        userId: context.userId,
        type: 'onboarding.dismissed',
        payload: {},
      });
    }

    return NextResponse.json({
      success: true,
      onboarding: {
        completed: false,
        dismissed: body.dismissed,
        shouldShow: !body.dismissed,
      },
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error('Onboarding PATCH Error:', error);
    return NextResponse.json({ error: 'Failed to update onboarding' }, { status: 500 });
  }
}
