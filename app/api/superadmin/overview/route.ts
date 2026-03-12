import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { PLAN_LIMITS } from '@/lib/server/multi-tenant';
import { HttpError } from '@/lib/server/multi-tenant';
import { requireSuperadminAccess } from '@/lib/server/platform-access';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function toIso(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

export async function GET(req: Request) {
  try {
    await requireSuperadminAccess(req);

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      totalWorkspaces,
      newSignupsLast30Days,
      subscriptions,
      totalTransactions,
      totalWallets,
      totalInvestments,
      totalDebts,
      whatsappConnectedWorkspaces,
      recentEvents,
      aiUsageEvents,
      errorEvents,
      activeUserEvents,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.workspace.count(),
      prisma.user.count({
        where: {
          created_at: {
            gte: thirtyDaysAgo,
          },
        },
      }),
      prisma.workspaceSubscription.findMany({
        select: {
          plan: true,
          status: true,
          current_period_end: true,
          created_at: true,
        },
      }),
      prisma.transaction.count(),
      prisma.wallet.count(),
      prisma.investment.count(),
      prisma.debt.count(),
      prisma.workspace.count({
        where: {
          whatsapp_status: 'CONNECTED',
        },
      }),
      prisma.workspaceEvent.findMany({
        take: 10,
        orderBy: {
          created_at: 'desc',
        },
        include: {
          workspace: {
            select: {
              name: true,
            },
          },
          user: {
            select: {
              email: true,
            },
          },
        },
      }),
      prisma.workspaceEvent.count({
        where: {
          created_at: {
            gte: thirtyDaysAgo,
          },
          OR: [{ type: { contains: 'ai' } }, { type: { contains: 'insight' } }],
        },
      }),
      prisma.workspaceEvent.count({
        where: {
          created_at: {
            gte: thirtyDaysAgo,
          },
          OR: [{ type: { contains: 'error' } }, { type: { contains: 'failed' } }],
        },
      }),
      prisma.workspaceEvent.findMany({
        where: {
          created_at: {
            gte: thirtyDaysAgo,
          },
          user_id: {
            not: null,
          },
        },
        distinct: ['user_id'],
        select: {
          user_id: true,
        },
      }),
    ]);

    const activeSubscriptions = subscriptions.filter((subscription) => subscription.status === 'ACTIVE');
    const proWorkspaces = activeSubscriptions.filter((subscription) => subscription.plan === 'PRO').length;
    const premiumWorkspaces = activeSubscriptions.filter((subscription) => subscription.plan === 'PREMIUM').length;
    const canceledWorkspaces = subscriptions.filter((subscription) => subscription.status === 'CANCELED').length;
    const payingWorkspaces = proWorkspaces + premiumWorkspaces;
    const estimatedMrr = proWorkspaces * 29 + premiumWorkspaces * 49;

    return NextResponse.json({
      metrics: {
        totalUsers,
        totalWorkspaces,
        activeUsers: activeUserEvents.length,
        newSignupsLast30Days,
        activeTrials: null,
        payingWorkspaces,
        proWorkspaces,
        premiumWorkspaces,
        canceledWorkspaces,
        estimatedMrr,
        aiUsageLast30Days: aiUsageEvents,
        whatsappConnectedWorkspaces,
        totalTransactions,
        totalWallets,
        totalInvestments,
        totalDebts,
        errorEventsLast30Days: errorEvents,
      },
      conversion: {
        proRate: totalWorkspaces > 0 ? Number(((proWorkspaces / totalWorkspaces) * 100).toFixed(1)) : 0,
        premiumRate: totalWorkspaces > 0 ? Number(((premiumWorkspaces / totalWorkspaces) * 100).toFixed(1)) : 0,
      },
      recentEvents: recentEvents.map((event) => ({
        id: event.id,
        type: event.type,
        createdAt: toIso(event.created_at),
        workspaceName: event.workspace.name,
        userEmail: event.user?.email ?? null,
      })),
      notes: {
        trialsTracked: false,
        churnTracked: canceledWorkspaces > 0,
      },
      limitsReference: PLAN_LIMITS,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: 'Falha ao carregar a visão geral do Super Admin.' }, { status: 500 });
  }
}
