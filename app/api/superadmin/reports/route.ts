import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { HttpError } from '@/lib/server/multi-tenant';
import { requireSuperadminAccess } from '@/lib/server/platform-access';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function buildMonthKey(date: Date) {
  return date.toISOString().slice(0, 7);
}

function buildMonthBuckets(months: number) {
  const buckets = new Map<
    string,
    {
      month: string;
      signups: number;
      newWorkspaces: number;
      aiEvents: number;
      transactions: number;
    }
  >();

  for (let offset = months - 1; offset >= 0; offset -= 1) {
    const date = new Date();
    date.setDate(1);
    date.setMonth(date.getMonth() - offset);
    const key = buildMonthKey(date);
    buckets.set(key, {
      month: key,
      signups: 0,
      newWorkspaces: 0,
      aiEvents: 0,
      transactions: 0,
    });
  }

  return buckets;
}

function classifyOperationalEvent(type: string) {
  if (type.startsWith('ai.')) return 'ai';
  if (type.startsWith('whatsapp.')) return 'whatsapp';
  if (type.startsWith('stripe.')) return 'billing';
  if (type.startsWith('tracking.')) return 'tracking';
  return 'product';
}

export async function GET(req: Request) {
  try {
    await requireSuperadminAccess(req);

    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      totalWorkspaces,
      users,
      workspaces,
      subscriptions,
      transactionsLast6Months,
      transactionsLast30Days,
      eventsLast6Months,
      eventsLast30Days,
      totalTransactions,
      activeUsersLast30Days,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.workspace.count(),
      prisma.user.findMany({
        where: { created_at: { gte: sixMonthsAgo } },
        select: { created_at: true },
      }),
      prisma.workspace.findMany({
        where: { created_at: { gte: sixMonthsAgo } },
        select: { created_at: true },
      }),
      prisma.workspaceSubscription.findMany({
        select: {
          plan: true,
          status: true,
        },
      }),
      prisma.transaction.findMany({
        where: { date: { gte: sixMonthsAgo } },
        select: { date: true },
      }),
      prisma.transaction.count({
        where: { date: { gte: thirtyDaysAgo } },
      }),
      prisma.workspaceEvent.findMany({
        where: {
          created_at: { gte: sixMonthsAgo },
          type: { in: ['ai.chat.used', 'ai.classify.used'] },
        },
        select: {
          created_at: true,
          workspace_id: true,
          type: true,
        },
      }),
      prisma.workspaceEvent.findMany({
        where: { created_at: { gte: thirtyDaysAgo } },
        select: {
          created_at: true,
          workspace_id: true,
          user_id: true,
          type: true,
        },
      }),
      prisma.transaction.count(),
      prisma.workspaceEvent.findMany({
        where: {
          created_at: { gte: thirtyDaysAgo },
          user_id: { not: null },
        },
        distinct: ['user_id'],
        select: { user_id: true },
      }),
    ]);

    const monthBuckets = buildMonthBuckets(6);

    for (const user of users) {
      const bucket = monthBuckets.get(buildMonthKey(user.created_at));
      if (bucket) bucket.signups += 1;
    }

    for (const workspace of workspaces) {
      const bucket = monthBuckets.get(buildMonthKey(workspace.created_at));
      if (bucket) bucket.newWorkspaces += 1;
    }

    for (const transaction of transactionsLast6Months) {
      const bucket = monthBuckets.get(buildMonthKey(transaction.date));
      if (bucket) bucket.transactions += 1;
    }

    for (const event of eventsLast6Months) {
      const bucket = monthBuckets.get(buildMonthKey(event.created_at));
      if (bucket) bucket.aiEvents += 1;
    }

    const activeSubscriptions = subscriptions.filter((item) => item.status === 'ACTIVE');
    const freeWorkspaces = activeSubscriptions.filter((item) => item.plan === 'FREE').length;
    const proWorkspaces = activeSubscriptions.filter((item) => item.plan === 'PRO').length;
    const premiumWorkspaces = activeSubscriptions.filter((item) => item.plan === 'PREMIUM').length;
    const payingWorkspaces = proWorkspaces + premiumWorkspaces;
    const estimatedMrr = proWorkspaces * 29 + premiumWorkspaces * 49;

    const aiUsageLast30Days = eventsLast30Days.filter((event) => event.type.startsWith('ai.')).length;
    const aiActiveWorkspacesLast30Days = new Set(
      eventsLast30Days.filter((event) => event.type.startsWith('ai.')).map((event) => event.workspace_id)
    ).size;
    const whatsappConnectedWorkspaces = new Set(
      eventsLast30Days.filter((event) => event.type.startsWith('whatsapp.connected')).map((event) => event.workspace_id)
    ).size;

    const operations = eventsLast30Days.reduce(
      (acc, event) => {
        const category = classifyOperationalEvent(event.type);
        acc[category] += 1;
        return acc;
      },
      {
        ai: 0,
        whatsapp: 0,
        billing: 0,
        tracking: 0,
        product: 0,
      }
    );

    return NextResponse.json({
      summary: {
        totalUsers,
        totalWorkspaces,
        payingWorkspaces,
        estimatedMrr,
        newSignupsLast30Days: users.filter((user) => user.created_at >= thirtyDaysAgo).length,
        activeUsersLast30Days: activeUsersLast30Days.length,
        aiUsageLast30Days,
        aiActiveWorkspacesLast30Days,
        whatsappConnectedWorkspaces,
        totalTransactions,
        transactionsLast30Days,
      },
      monthlyTrend: Array.from(monthBuckets.values()),
      planMix: [
        { plan: 'FREE', workspaces: freeWorkspaces, estimatedMrr: 0 },
        { plan: 'PRO', workspaces: proWorkspaces, estimatedMrr: proWorkspaces * 29 },
        { plan: 'PREMIUM', workspaces: premiumWorkspaces, estimatedMrr: premiumWorkspaces * 49 },
      ],
      funnel: {
        totalUsers,
        totalWorkspaces,
        payingWorkspaces,
        aiActiveWorkspacesLast30Days,
        whatsappConnectedWorkspaces,
      },
      operations,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: 'Falha ao carregar relatórios do Super Admin.' }, { status: 500 });
  }
}
