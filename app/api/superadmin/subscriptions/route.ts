import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { HttpError, normalizePlan } from '@/lib/server/multi-tenant';
import { requireSuperadminAccess } from '@/lib/server/platform-access';
import { getSubscriptionMetadataMap, setSubscriptionMetadata } from '@/lib/server/superadmin-governance';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED_STATUSES = new Set(['ACTIVE', 'PENDING', 'CANCELED']);

function toIso(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

function getEstimatedMrr(plan: string, status: string | null) {
  if (status !== 'ACTIVE') return 0;
  if (plan === 'PREMIUM') return 49;
  if (plan === 'PRO') return 29;
  return 0;
}

function normalizeStatus(value: unknown) {
  const normalized = typeof value === 'string' ? value.trim().toUpperCase() : '';
  return ALLOWED_STATUSES.has(normalized) ? normalized : null;
}

function normalizePeriodEnd(value: unknown) {
  if (value === null || value === '' || typeof value === 'undefined') return null;
  if (typeof value !== 'string') return null;
  const nextDate = new Date(value);
  return Number.isNaN(nextDate.getTime()) ? null : nextDate;
}

function isMissingPlatformSettingError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || '');
  return /does not exist|relation .* does not exist|table .* doesn't exist|column .* does not exist/i.test(message);
}

export async function GET(req: Request) {
  try {
    await requireSuperadminAccess(req);

    const { searchParams } = new URL(req.url);
    const query = (searchParams.get('q') || '').trim();
    const plan = (searchParams.get('plan') || '').trim().toUpperCase();
    const status = (searchParams.get('status') || '').trim().toUpperCase();

    const [workspaces, subscriptionMetadataMap] = await Promise.all([
      prisma.workspace.findMany({
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
      }),
      getSubscriptionMetadataMap(),
    ]);

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
        stripeCustomerId: subscription?.stripe_customer_id || null,
        stripeSubscriptionId: subscription?.stripe_subscription_id || null,
        adminNote: subscriptionMetadataMap[workspace.id]?.adminNote || null,
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

export async function PATCH(req: Request) {
  try {
    await requireSuperadminAccess(req);

    const body = (await req.json()) as {
      workspaceId?: string;
      plan?: string;
      status?: string;
      currentPeriodEnd?: string | null;
      stripeCustomerId?: string | null;
      stripeSubscriptionId?: string | null;
      clearStripeLinks?: boolean;
      adminNote?: string | null;
    };

    const workspaceId = typeof body.workspaceId === 'string' ? body.workspaceId.trim() : '';
    if (!workspaceId) {
      return NextResponse.json({ error: 'Workspace inválido para atualização de assinatura.' }, { status: 400 });
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: { subscription: true },
    });

    if (!workspace) {
      return NextResponse.json({ error: 'Workspace não encontrado.' }, { status: 404 });
    }

    const plan = normalizePlan(body.plan || workspace.subscription?.plan || 'FREE');
    const status = normalizeStatus(body.status || workspace.subscription?.status || 'ACTIVE');
    if (!status) {
      return NextResponse.json({ error: 'Status de assinatura inválido.' }, { status: 400 });
    }

    const currentPeriodEnd = normalizePeriodEnd(body.currentPeriodEnd);
    if (body.currentPeriodEnd && !currentPeriodEnd) {
      return NextResponse.json({ error: 'Período atual inválido.' }, { status: 400 });
    }

    const subscription = await prisma.workspaceSubscription.upsert({
      where: { workspace_id: workspaceId },
      update: {
        plan,
        status,
        current_period_end: currentPeriodEnd,
        stripe_customer_id: body.clearStripeLinks
          ? null
          : typeof body.stripeCustomerId === 'string'
            ? body.stripeCustomerId.trim() || null
            : undefined,
        stripe_subscription_id: body.clearStripeLinks
          ? null
          : typeof body.stripeSubscriptionId === 'string'
            ? body.stripeSubscriptionId.trim() || null
            : undefined,
      },
      create: {
        workspace_id: workspaceId,
        plan,
        status,
        current_period_end: currentPeriodEnd,
        stripe_customer_id:
          body.clearStripeLinks || typeof body.stripeCustomerId !== 'string'
            ? null
            : body.stripeCustomerId.trim() || null,
        stripe_subscription_id:
          body.clearStripeLinks || typeof body.stripeSubscriptionId !== 'string'
            ? null
            : body.stripeSubscriptionId.trim() || null,
      },
    });

    let metadata = { workspaceId, adminNote: body.adminNote ?? null };
    try {
      metadata = await setSubscriptionMetadata({
        workspaceId,
        adminNote: body.adminNote ?? null,
      });
    } catch (metadataError) {
      if (!isMissingPlatformSettingError(metadataError)) {
        throw metadataError;
      }
    }

    await prisma.workspaceEvent.create({
      data: {
        workspace_id: workspaceId,
        type: 'superadmin.subscription.updated',
        payload: {
          source: 'superadmin',
          previous: workspace.subscription
            ? {
                plan: workspace.subscription.plan,
              status: workspace.subscription.status,
              currentPeriodEnd: toIso(workspace.subscription.current_period_end),
              stripeCustomerId: workspace.subscription.stripe_customer_id,
              stripeSubscriptionId: workspace.subscription.stripe_subscription_id,
            }
            : null,
          next: {
            plan: subscription.plan,
            status: subscription.status,
            currentPeriodEnd: toIso(subscription.current_period_end),
            stripeCustomerId: subscription.stripe_customer_id,
            stripeSubscriptionId: subscription.stripe_subscription_id,
            adminNote: metadata.adminNote,
          },
        },
      },
    });

    return NextResponse.json({
      ok: true,
      subscription: {
        workspaceId,
        plan: subscription.plan,
        status: subscription.status,
        currentPeriodEnd: toIso(subscription.current_period_end),
        estimatedMrr: getEstimatedMrr(subscription.plan, subscription.status),
        stripeCustomerId: subscription.stripe_customer_id,
        stripeSubscriptionId: subscription.stripe_subscription_id,
        adminNote: metadata.adminNote,
      },
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Falha ao atualizar assinatura.' },
      { status: 500 }
    );
  }
}
