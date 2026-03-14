import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { HttpError } from '@/lib/server/multi-tenant';
import { requireSuperadminAccess } from '@/lib/server/platform-access';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function toIso(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

function getEstimatedMrr(plan: string, status: string | null) {
  if (status !== 'ACTIVE') return 0;
  if (plan === 'PREMIUM') return 49;
  if (plan === 'PRO') return 29;
  return 0;
}

export async function GET(req: Request) {
  try {
    await requireSuperadminAccess(req);

    const { searchParams } = new URL(req.url);
    const query = (searchParams.get('q') || '').trim();
    const plan = (searchParams.get('plan') || '').trim().toUpperCase();
    const status = (searchParams.get('status') || '').trim().toUpperCase();

    const workspaces = await prisma.workspace.findMany({
      where: {
        ...(query
          ? {
              OR: [{ id: { contains: query } }, { name: { contains: query, mode: 'insensitive' } }],
            }
          : {}),
        ...(plan || status
          ? {
              subscription: {
                ...(plan ? { plan } : {}),
                ...(status ? { status } : {}),
              },
            }
          : {}),
      },
      orderBy: [{ created_at: 'desc' }],
      include: {
        subscription: true,
        members: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    const subscriptions = workspaces.map((workspace) => {
      const owner = workspace.members.find((member) => member.role === 'OWNER') || null;
      const subscription = workspace.subscription;
      const resolvedPlan = subscription?.plan || 'FREE';
      const resolvedStatus = subscription?.status || 'ACTIVE';

      return {
        workspaceId: workspace.id,
        workspaceName: workspace.name,
        ownerName: owner?.user.name ?? null,
        ownerEmail: owner?.user.email ?? null,
        plan: resolvedPlan,
        status: resolvedStatus,
        currentPeriodEnd: toIso(subscription?.current_period_end),
        createdAt: toIso(workspace.created_at),
        updatedAt: toIso(subscription?.updated_at ?? workspace.updated_at),
        estimatedMrr: getEstimatedMrr(resolvedPlan, resolvedStatus),
        hasStripeCustomer: Boolean(subscription?.stripe_customer_id),
        hasStripeSubscription: Boolean(subscription?.stripe_subscription_id),
      };
    });

    const metrics = subscriptions.reduce(
      (acc, item) => {
        acc.total += 1;
        acc.estimatedMrr += item.estimatedMrr;

        if (item.plan === 'FREE') acc.free += 1;
        if (item.plan === 'PRO') acc.pro += 1;
        if (item.plan === 'PREMIUM') acc.premium += 1;
        if (item.plan !== 'FREE') acc.paying += 1;

        if (item.status === 'ACTIVE') acc.active += 1;
        if (item.status === 'PENDING') acc.pending += 1;
        if (item.status === 'CANCELED') acc.canceled += 1;

        return acc;
      },
      {
        total: 0,
        active: 0,
        pending: 0,
        canceled: 0,
        free: 0,
        paying: 0,
        pro: 0,
        premium: 0,
        estimatedMrr: 0,
      }
    );

    return NextResponse.json({
      query,
      filters: {
        plan: plan || 'ALL',
        status: status || 'ALL',
      },
      metrics,
      total: subscriptions.length,
      subscriptions,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: 'Falha ao carregar assinaturas do Super Admin.' }, { status: 500 });
  }
}
