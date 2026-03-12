import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { HttpError } from '@/lib/server/multi-tenant';
import { getPlatformRoleForEmail, requireSuperadminAccess } from '@/lib/server/platform-access';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PLAN_PRIORITY = {
  FREE: 0,
  PRO: 1,
  PREMIUM: 2,
} as const;

function toIso(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

function normalizeSearch(value: string | null) {
  return (value || '').trim();
}

export async function GET(req: Request) {
  try {
    await requireSuperadminAccess(req);
    const { searchParams } = new URL(req.url);
    const query = normalizeSearch(searchParams.get('q'));
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const users = await prisma.user.findMany({
      where: query
        ? {
            OR: [
              { id: { contains: query } },
              { email: { contains: query, mode: 'insensitive' } },
              { name: { contains: query, mode: 'insensitive' } },
            ],
          }
        : undefined,
      orderBy: {
        created_at: 'desc',
      },
      include: {
        profile: true,
        subscription: true,
        workspaces: {
          include: {
            workspace: {
              select: {
                id: true,
                name: true,
                whatsapp_status: true,
              },
            },
          },
        },
        workspace_events: {
          take: 1,
          orderBy: {
            created_at: 'desc',
          },
          select: {
            created_at: true,
          },
        },
      },
    });

    const workspaceIds = Array.from(
      new Set(users.flatMap((user) => user.workspaces.map((membership) => membership.workspace_id)))
    );

    const [workspaceSubscriptions, aiUsageEvents] = await Promise.all([
      prisma.workspaceSubscription.findMany({
        where: {
          workspace_id: {
            in: workspaceIds.length ? workspaceIds : ['__none__'],
          },
        },
        select: {
          workspace_id: true,
          plan: true,
          status: true,
        },
      }),
      prisma.workspaceEvent.findMany({
        where: {
          user_id: {
            in: users.map((user) => user.id),
          },
          created_at: {
            gte: thirtyDaysAgo,
          },
          OR: [{ type: { contains: 'ai' } }, { type: { contains: 'insight' } }],
        },
        select: {
          user_id: true,
        },
      }),
    ]);

    const subscriptionByWorkspace = new Map(
      workspaceSubscriptions.map((subscription) => [subscription.workspace_id, subscription])
    );
    const aiUsageByUser = new Map<string, number>();

    for (const event of aiUsageEvents) {
      if (!event.user_id) continue;
      aiUsageByUser.set(event.user_id, (aiUsageByUser.get(event.user_id) || 0) + 1);
    }

    const responseUsers = users.map((user) => {
      let currentPlan = user.profile?.plan || user.subscription?.plan || 'FREE';
      let subscriptionStatus = user.subscription?.status || null;

      for (const membership of user.workspaces) {
        const subscription = subscriptionByWorkspace.get(membership.workspace_id);
        if (!subscription) continue;
        if ((PLAN_PRIORITY[subscription.plan as keyof typeof PLAN_PRIORITY] ?? 0) > (PLAN_PRIORITY[currentPlan as keyof typeof PLAN_PRIORITY] ?? 0)) {
          currentPlan = subscription.plan;
          subscriptionStatus = subscription.status;
        }
      }

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: toIso(user.created_at),
        lastAccessAt: toIso(user.workspace_events[0]?.created_at ?? null),
        workspaceCount: user.workspaces.length,
        currentPlan,
        subscriptionStatus,
        platformRole: getPlatformRoleForEmail(user.email),
        whatsappConnected: user.workspaces.some((membership) => membership.workspace.whatsapp_status === 'CONNECTED'),
        aiUsageLast30Days: aiUsageByUser.get(user.id) || 0,
      };
    });

    return NextResponse.json({
      query,
      total: responseUsers.length,
      users: responseUsers,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: 'Falha ao carregar usuários do Super Admin.' }, { status: 500 });
  }
}
