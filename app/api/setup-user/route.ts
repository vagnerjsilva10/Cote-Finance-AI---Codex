import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { setupUser } from '@/lib/auth-setup';
import { getWorkspacePlan, getWorkspacePreference } from '@/lib/server/multi-tenant';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const isMissingTableError = (error: unknown) => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === 'P2021' || error.code === 'P2022';
  }
  const message = error instanceof Error ? error.message : String(error || '');
  return /does not exist|relation .* does not exist|column .* does not exist/i.test(message);
};

export async function POST(req: Request) {
  try {
    const supabase = getSupabaseClient();
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice('Bearer '.length)
      : null;

    if (!token) {
      return NextResponse.json({ error: 'Missing bearer token' }, { status: 401 });
    }

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user?.id || !user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dbData = await setupUser({
      id: user.id,
      email: user.email,
      name: user.user_metadata?.full_name || user.user_metadata?.name,
      avatar_url: user.user_metadata?.avatar_url,
      company_name: user.user_metadata?.company_name,
      phone: user.user_metadata?.phone,
      segment: user.user_metadata?.segment,
      operations_count:
        typeof user.user_metadata?.operations_count === 'number'
          ? user.user_metadata.operations_count
          : null,
      objective: user.user_metadata?.objective,
    });

    let memberships: Array<{
      workspace: {
        id: string;
        name: string;
      };
      role: string;
    }> = [];
    try {
      memberships = await prisma.workspaceMember.findMany({
        where: { user_id: user.id },
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
      if (!isMissingTableError(error)) throw error;
      memberships = await prisma.workspaceMember.findMany({
        where: { user_id: user.id },
        include: {
          workspace: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { workspace_id: 'asc' },
      });
    }

    const activeWorkspaceId = dbData.workspaceMember.workspace_id;
    const [plan, onboardingPreference] = await Promise.all([
      getWorkspacePlan(activeWorkspaceId, user.id),
      getWorkspacePreference(activeWorkspaceId, user.id),
    ]);

    return NextResponse.json({
      ...dbData,
      activeWorkspaceId,
      plan,
      onboarding: {
        completed: Boolean(onboardingPreference.onboarding_completed),
        objective: onboardingPreference.objective,
        financialProfile: onboardingPreference.financial_profile,
        aiSuggestionsEnabled: onboardingPreference.ai_suggestions_enabled,
      },
      workspaces: memberships.map((membership) => ({
        id: membership.workspace.id,
        name: membership.workspace.name,
        role: membership.role,
      })),
    });
  } catch (error: any) {
    console.error('Setup User Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to setup user' }, { status: 500 });
  }
}
