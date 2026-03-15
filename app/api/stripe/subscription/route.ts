import { NextResponse } from 'next/server';
import Stripe from 'stripe';

import {
  getStripe,
  STRIPE_NOT_CONFIGURED_RESPONSE,
  STRIPE_SECRET_KEY_MISSING_ERROR,
} from '@/lib/stripe';
import { asPrismaServiceUnavailableError, prisma } from '@/lib/prisma';
import {
  getWorkspacePlan,
  HttpError,
  logWorkspaceEventSafe,
  resolveWorkspaceContext,
} from '@/lib/server/multi-tenant';
import { isMissingOptionalBillingTableError, resolveStripePlan } from '@/lib/server/stripe-billing';
import { isEntitledStripeStatus } from '@/lib/server/billing-status';
import { getEditablePlanCatalog, getRuntimeBillingPriceLabel } from '@/lib/server/superadmin-governance';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type ManageSubscriptionAction = 'cancel' | 'reactivate';

function getCurrentPeriodEnd(subscription: Stripe.Subscription) {
  const currentPeriodEndRaw = (subscription as Stripe.Subscription & { current_period_end?: number | null })
    .current_period_end;

  return typeof currentPeriodEndRaw === 'number' ? new Date(currentPeriodEndRaw * 1000) : null;
}

function mapPlan(plan: string | null | undefined): 'FREE' | 'PRO' | 'PREMIUM' {
  const normalized = String(plan || '').trim().toUpperCase();
  if (normalized === 'PRO' || normalized === 'PREMIUM') {
    return normalized;
  }
  return 'FREE';
}

function mapStatus(params: {
  plan: 'FREE' | 'PRO' | 'PREMIUM';
  dbStatus?: string | null;
  stripeStatus?: Stripe.Subscription.Status | null;
  cancelAtPeriodEnd?: boolean;
}) {
  if (params.plan === 'FREE' && !params.stripeStatus) {
    return {
      code: 'FREE',
      label: 'Ativa',
      message: 'Seu workspace está no plano Free. Quando quiser evoluir, você pode fazer upgrade sem sair do app.',
    };
  }

  if (params.stripeStatus === 'trialing') {
    return {
      code: 'TRIALING',
      label: 'Em teste gratuito',
      message: 'Você está no período de teste. Aproveite todos os recursos disponíveis até o fim do teste.',
    };
  }

  if (
    params.stripeStatus === 'past_due' ||
    params.stripeStatus === 'incomplete' ||
    params.stripeStatus === 'unpaid' ||
    params.stripeStatus === 'paused'
  ) {
    return {
      code: 'PENDING',
      label: 'Pagamento pendente',
      message: 'Não conseguimos confirmar seu pagamento. Atualize sua forma de pagamento para manter seu acesso.',
    };
  }

  if (params.stripeStatus === 'canceled' || params.stripeStatus === 'incomplete_expired') {
    return {
      code: 'CANCELED',
      label: 'Cancelada',
      message: 'Sua assinatura foi cancelada. Você ainda pode reativar seu plano quando quiser.',
    };
  }

  if (params.dbStatus === 'CANCELED') {
    return {
      code: 'CANCELED',
      label: 'Cancelada',
      message: 'Sua assinatura foi cancelada. Você ainda pode reativar seu plano quando quiser.',
    };
  }

  if (params.dbStatus === 'PENDING') {
    return {
      code: 'PENDING',
      label: 'Pagamento pendente',
      message: 'Não conseguimos confirmar seu pagamento. Atualize sua forma de pagamento para manter seu acesso.',
    };
  }

  if (params.cancelAtPeriodEnd) {
    return {
      code: 'ACTIVE',
      label: 'Ativa',
      message:
        'Sua assinatura segue ativa até o fim do ciclo atual. Se quiser, você ainda pode reativar antes da data final.',
    };
  }

  return {
    code: 'ACTIVE',
    label: 'Ativa',
    message: 'Sua assinatura está ativa e seu acesso aos recursos do plano continua normalmente.',
  };
}

async function readWorkspaceSubscription(workspaceId: string) {
  try {
    return await prisma.workspaceSubscription.findUnique({
      where: { workspace_id: workspaceId },
      select: {
        plan: true,
        status: true,
        stripe_customer_id: true,
        stripe_subscription_id: true,
        current_period_end: true,
      },
    });
  } catch (error) {
    if (!isMissingOptionalBillingTableError(error)) {
      throw error;
    }

    return null;
  }
}

async function buildSubscriptionResponse(req: Request) {
  const context = await resolveWorkspaceContext(req);
  const catalog = await getEditablePlanCatalog();
  const workspace = context.workspaces.find((item) => item.id === context.workspaceId);
  const workspaceName = workspace?.name || 'Meu Workspace';
  const storedSubscription = await readWorkspaceSubscription(context.workspaceId);
  const fallbackPlan = await getWorkspacePlan(context.workspaceId, context.userId);
  const initialPlan = mapPlan(storedSubscription?.plan || fallbackPlan);

  let stripeSubscription: Stripe.Subscription | null = null;
  let stripeConfigMissing = false;

  if (storedSubscription?.stripe_subscription_id) {
    try {
      const stripe = getStripe();
      stripeSubscription = await stripe.subscriptions.retrieve(storedSubscription.stripe_subscription_id, {
        expand: ['default_payment_method', 'latest_invoice'],
      });
    } catch (error) {
      if (error instanceof Error && error.message === STRIPE_SECRET_KEY_MISSING_ERROR) {
        stripeConfigMissing = true;
      } else {
        console.warn('Subscription area: failed to read Stripe subscription', error);
      }
    }
  }

  const livePriceId = stripeSubscription?.items.data[0]?.price?.id ?? null;
  const resolvedPlan = resolveStripePlan({ priceId: livePriceId });
  const plan = mapPlan(resolvedPlan.plan || storedSubscription?.plan || initialPlan);
  const interval = resolvedPlan.interval || null;
  const nextBillingDate =
    (stripeSubscription ? getCurrentPeriodEnd(stripeSubscription) : null) ||
    storedSubscription?.current_period_end ||
    null;
  const status = mapStatus({
    plan,
    dbStatus: storedSubscription?.status || null,
    stripeStatus: stripeSubscription?.status || null,
    cancelAtPeriodEnd: stripeSubscription?.cancel_at_period_end || false,
  });

  const billingLabel =
    plan === 'FREE'
      ? 'R$ 0 / mês'
      : interval
        ? (await getRuntimeBillingPriceLabel(plan, interval)).replace('/ano', ' / ano').replace('/mês', ' / mês')
        : plan === 'PRO'
          ? `R$ ${catalog.find((item) => item.code === 'PRO')?.monthlyPrice.toLocaleString('pt-BR')} / mês`
          : `R$ ${catalog.find((item) => item.code === 'PREMIUM')?.monthlyPrice.toLocaleString('pt-BR')} / mês`;
  const hasActiveStripeSubscription = Boolean(stripeSubscription && isEntitledStripeStatus(stripeSubscription.status));
  const recommendedAction =
    status.code === 'PENDING'
      ? 'regularize'
      : plan === 'FREE' || status.code === 'CANCELED'
        ? 'checkout'
        : 'change_plan';
  const primaryActionLabel =
    recommendedAction === 'regularize'
      ? 'Regularizar pagamento'
      : recommendedAction === 'checkout'
        ? 'Assinar plano'
        : 'Alterar plano';
  const planConfig = catalog.find((item) => item.code === plan);

  return {
    workspaceId: context.workspaceId,
    workspaceName,
    plan,
    planLabel: planConfig?.name || (plan === 'FREE' ? 'Free' : plan === 'PRO' ? 'Pro' : 'Premium'),
    interval,
    billingLabel,
    status: status.code,
    statusLabel: status.label,
    statusMessage: status.message,
    nextBillingDate: nextBillingDate ? nextBillingDate.toISOString() : null,
    cancelAtPeriodEnd: Boolean(stripeSubscription?.cancel_at_period_end),
    features: planConfig?.features || [],
    stripeConfigured: !stripeConfigMissing,
    hasStripeCustomer: Boolean(storedSubscription?.stripe_customer_id),
    hasStripeSubscription: Boolean(storedSubscription?.stripe_subscription_id),
    recommendedAction,
    primaryActionLabel,
    canCancel:
      Boolean(stripeSubscription?.id) &&
      Boolean(stripeSubscription?.status === 'active' || stripeSubscription?.status === 'trialing') &&
      !stripeSubscription?.cancel_at_period_end,
    canReactivate:
      Boolean(stripeSubscription?.id) &&
      Boolean(
        (stripeSubscription?.status === 'active' || stripeSubscription?.status === 'trialing') &&
          stripeSubscription?.cancel_at_period_end
      ),
    canManageBilling:
      !stripeConfigMissing &&
      Boolean(storedSubscription?.stripe_customer_id) &&
      (plan === 'PRO' || plan === 'PREMIUM' || status.code === 'PENDING'),
    canOpenCheckout: !hasActiveStripeSubscription,
  };
}

export async function GET(req: Request) {
  try {
    const payload = await buildSubscriptionResponse(req);
    return NextResponse.json(payload);
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    const prismaError = asPrismaServiceUnavailableError(error);
    if (prismaError) {
      return NextResponse.json({ error: prismaError.message }, { status: 503 });
    }

    console.error('Subscription overview error:', error);
    return NextResponse.json({ error: 'Não foi possível carregar a assinatura.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const context = await resolveWorkspaceContext(req);
    const body = (await req.json().catch(() => null)) as { action?: ManageSubscriptionAction } | null;
    const action = body?.action;

    if (action !== 'cancel' && action !== 'reactivate') {
      return NextResponse.json({ error: 'Ação de assinatura inválida.' }, { status: 400 });
    }

    const storedSubscription = await readWorkspaceSubscription(context.workspaceId);
    if (!storedSubscription?.stripe_subscription_id) {
      return NextResponse.json({ error: 'Nenhuma assinatura ativa encontrada para este workspace.' }, { status: 404 });
    }

    const stripe = getStripe();
    const updatedSubscription = await stripe.subscriptions.update(storedSubscription.stripe_subscription_id, {
      cancel_at_period_end: action === 'cancel',
    });

    await logWorkspaceEventSafe({
      workspaceId: context.workspaceId,
      userId: context.userId,
      type: action === 'cancel' ? 'stripe.subscription_cancel_scheduled' : 'stripe.subscription_reactivated',
      payload: {
        subscriptionId: updatedSubscription.id,
        cancelAtPeriodEnd: updatedSubscription.cancel_at_period_end,
      },
    });

    const payload = await buildSubscriptionResponse(req);
    return NextResponse.json(payload);
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    const prismaError = asPrismaServiceUnavailableError(error);
    if (prismaError) {
      return NextResponse.json({ error: prismaError.message }, { status: 503 });
    }

    if (error instanceof Error && error.message === STRIPE_SECRET_KEY_MISSING_ERROR) {
      return NextResponse.json({ error: STRIPE_NOT_CONFIGURED_RESPONSE }, { status: 500 });
    }

    console.error('Subscription action error:', error);
    return NextResponse.json({ error: 'Não foi possível atualizar a assinatura.' }, { status: 500 });
  }
}
