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
import { formatBillingPrice } from '@/lib/billing/plans';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type ManageSubscriptionAction = 'cancel' | 'reactivate';

const FREE_PLAN_FEATURES = [
  'Acompanhamento de saldo e movimentacoes essenciais',
  'Dashboard inicial para organizar sua rotina financeira',
  'Relatorios simples para acompanhar sua evolucao',
];

const PLAN_FEATURES: Record<'FREE' | 'PRO' | 'PREMIUM', string[]> = {
  FREE: FREE_PLAN_FEATURES,
  PRO: [
    'Lancamentos ilimitados',
    'Relatorios completos e graficos avancados',
    'Analises inteligentes com IA',
    'Metas financeiras ilimitadas',
    'Acompanhamento de dividas',
    'Controle de investimentos',
    'Suporte prioritario por e-mail',
  ],
  PREMIUM: [
    'Tudo do plano Pro',
    'Insights financeiros avancados',
    'Previsoes de saldo e alertas inteligentes',
    'Analise profunda de despesas',
    'Suporte prioritario com acompanhamento acelerado',
  ],
};

function getCurrentPeriodEnd(subscription: Stripe.Subscription) {
  const currentPeriodEndRaw = (subscription as Stripe.Subscription & { current_period_end?: number | null })
    .current_period_end;

  return typeof currentPeriodEndRaw === 'number' ? new Date(currentPeriodEndRaw * 1000) : null;
}

function mapPlan(plan: string | null | undefined): 'FREE' | 'PRO' | 'PREMIUM' {
  const normalized = String(plan || '')
    .trim()
    .toUpperCase();

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
      message: 'Seu workspace esta no plano Free. Quando quiser evoluir, voce pode fazer upgrade sem sair do app.',
    };
  }

  if (params.stripeStatus === 'trialing') {
    return {
      code: 'TRIALING',
      label: 'Em teste gratuito',
      message:
        'Voce esta no periodo de teste. Aproveite todos os recursos disponiveis ate o fim do teste.',
    };
  }

  if (
    params.stripeStatus === 'past_due' ||
    params.stripeStatus === 'incomplete' ||
    params.stripeStatus === 'unpaid'
  ) {
    return {
      code: 'PENDING',
      label: 'Pagamento pendente',
      message:
        'Nao conseguimos confirmar seu pagamento. Atualize sua forma de pagamento para manter seu acesso.',
    };
  }

  if (params.stripeStatus === 'canceled' || params.stripeStatus === 'incomplete_expired') {
    return {
      code: 'CANCELED',
      label: 'Cancelada',
      message: 'Sua assinatura foi cancelada. Voce ainda pode reativar seu plano quando quiser.',
    };
  }

  if (params.dbStatus === 'CANCELED') {
    return {
      code: 'CANCELED',
      label: 'Cancelada',
      message: 'Sua assinatura foi cancelada. Voce ainda pode reativar seu plano quando quiser.',
    };
  }

  if (params.dbStatus === 'PENDING') {
    return {
      code: 'PENDING',
      label: 'Pagamento pendente',
      message:
        'Nao conseguimos confirmar seu pagamento. Atualize sua forma de pagamento para manter seu acesso.',
    };
  }

  if (params.cancelAtPeriodEnd) {
    return {
      code: 'ACTIVE',
      label: 'Ativa',
      message:
        'Sua assinatura segue ativa ate o fim do ciclo atual. Se quiser, voce ainda pode reativar antes da data final.',
    };
  }

  return {
    code: 'ACTIVE',
    label: 'Ativa',
    message: 'Sua assinatura esta ativa e seu acesso aos recursos do plano continua normalmente.',
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
      ? 'R$ 0 / mes'
      : interval
        ? formatBillingPrice(plan, interval).replace('/ano', ' / ano').replace('/mes', ' / mes')
        : plan === 'PRO'
          ? 'R$ 29 / mes'
          : 'R$ 49 / mes';

  return {
    workspaceId: context.workspaceId,
    workspaceName,
    plan,
    planLabel: plan === 'FREE' ? 'Free' : plan === 'PRO' ? 'Pro' : 'Premium',
    billingLabel,
    status: status.code,
    statusLabel: status.label,
    statusMessage: status.message,
    nextBillingDate: nextBillingDate ? nextBillingDate.toISOString() : null,
    cancelAtPeriodEnd: Boolean(stripeSubscription?.cancel_at_period_end),
    features: PLAN_FEATURES[plan],
    stripeConfigured: !stripeConfigMissing,
    hasStripeCustomer: Boolean(storedSubscription?.stripe_customer_id),
    hasStripeSubscription: Boolean(storedSubscription?.stripe_subscription_id),
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
      (plan === 'PRO' || plan === 'PREMIUM'),
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
    return NextResponse.json({ error: 'Nao foi possivel carregar a assinatura.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const context = await resolveWorkspaceContext(req);
    const body = (await req.json().catch(() => null)) as { action?: ManageSubscriptionAction } | null;
    const action = body?.action;

    if (action !== 'cancel' && action !== 'reactivate') {
      return NextResponse.json({ error: 'Acao de assinatura invalida.' }, { status: 400 });
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
    return NextResponse.json({ error: 'Nao foi possivel atualizar a assinatura.' }, { status: 500 });
  }
}
