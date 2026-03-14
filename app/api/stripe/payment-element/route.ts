import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import {
  getStripe,
  STRIPE_NOT_CONFIGURED_RESPONSE,
  STRIPE_SECRET_KEY_MISSING_ERROR,
} from '@/lib/stripe';
import { asPrismaServiceUnavailableError, prisma } from '@/lib/prisma';
import {
  HttpError,
  logWorkspaceEventSafe,
  resolveWorkspaceContext,
  upsertWorkspaceSubscriptionSafe,
} from '@/lib/server/multi-tenant';
import {
  ensureStripeCustomer,
  isMissingOptionalBillingTableError,
  resolveStripePlan,
} from '@/lib/server/stripe-billing';
import {
  BILLING_PLAN_DETAILS,
  formatBillingPrice,
  getBillingTrialDays,
  normalizeBillingPlan,
  type BillingIntervalCode,
  type BillingPlanCode,
} from '@/lib/billing/plans';
import { mapStripeStatusToStoredStatus } from '@/lib/server/billing-status';
import { readAttributionFromCookies, upsertAttributionForUser } from '@/lib/server/tracking';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type PaymentElementBody = {
  priceId?: string;
  plan?: string;
  interval?: string;
};

type CheckoutIntentType = 'payment' | 'setup' | 'none';
type StripeMode = 'live' | 'test' | 'unknown';
const STRIPE_REQUEST_TIMEOUT_MS = 15000;

class StripeRequestTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StripeRequestTimeoutError';
  }
}

async function withStripeTimeout<T>(promise: Promise<T>, message: string, timeoutMs = STRIPE_REQUEST_TIMEOUT_MS) {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => reject(new StripeRequestTimeoutError(message)), timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

function getCurrentPeriodEnd(subscription: Stripe.Subscription) {
  const currentPeriodEndRaw = (subscription as Stripe.Subscription & { current_period_end?: number | null })
    .current_period_end;

  return typeof currentPeriodEndRaw === 'number' ? new Date(currentPeriodEndRaw * 1000) : null;
}

function getExpandedInvoice(invoice: string | Stripe.Invoice | null) {
  if (!invoice || typeof invoice === 'string') {
    return null;
  }

  return invoice;
}

function getInvoicePaymentIntent(invoice: Stripe.Invoice | null) {
  if (!invoice) {
    return null;
  }

  const expandedInvoice = invoice as Stripe.Invoice & {
    payment_intent?: string | Stripe.PaymentIntent | null;
  };

  return expandedInvoice.payment_intent ?? null;
}

function getExpandedPaymentIntent(paymentIntent: string | Stripe.PaymentIntent | null | undefined) {
  if (!paymentIntent || typeof paymentIntent === 'string') {
    return null;
  }

  return paymentIntent;
}

function getExpandedSetupIntent(setupIntent: string | Stripe.SetupIntent | null) {
  if (!setupIntent || typeof setupIntent === 'string') {
    return null;
  }

  return setupIntent;
}

function serializeSubscriptionState(params: {
  subscription: Stripe.Subscription;
  plan: BillingPlanCode;
  interval: BillingIntervalCode;
  workspaceId: string;
  workspaceName: string;
  customerId: string;
  priceId: string;
}) {
  const invoice = getExpandedInvoice(params.subscription.latest_invoice);
  const paymentIntent = getExpandedPaymentIntent(getInvoicePaymentIntent(invoice));
  const setupIntent = getExpandedSetupIntent(params.subscription.pending_setup_intent);
  const paymentClientSecret = paymentIntent?.client_secret ?? invoice?.confirmation_secret?.client_secret ?? null;
  const setupClientSecret = setupIntent?.client_secret ?? null;
  const clientSecret = paymentClientSecret || setupClientSecret;
  const intentType: CheckoutIntentType = paymentClientSecret
    ? 'payment'
    : setupClientSecret
      ? 'setup'
      : 'none';

  return {
    clientSecret,
    intentType,
    stripeMode: params.subscription.livemode ? ('live' as StripeMode) : ('test' as StripeMode),
    subscriptionId: params.subscription.id,
    customerId: params.customerId,
    workspaceId: params.workspaceId,
    workspaceName: params.workspaceName,
    plan: params.plan,
    interval: params.interval,
    planName: BILLING_PLAN_DETAILS[params.plan].name,
    priceLabel: formatBillingPrice(params.plan, params.interval),
    priceId: params.priceId,
    subscriptionStatus: params.subscription.status,
    requiresConfirmation: intentType !== 'none',
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
      },
    });
  } catch (error) {
    if (!isMissingOptionalBillingTableError(error)) {
      throw error;
    }
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const stripe = getStripe();
    const body = (await req.json().catch(() => null)) as PaymentElementBody | null;

    if (!body) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const resolved = resolveStripePlan(body);
    if (!resolved.plan || !resolved.interval || !resolved.priceId) {
      return NextResponse.json(
        { error: 'Missing or invalid billing selection. Send a valid plan/interval.' },
        { status: 400 }
      );
    }

    const context = await withStripeTimeout(
      resolveWorkspaceContext(req),
      'Não foi possível validar o workspace a tempo. Tente novamente.'
    );
    const workspace = context.workspaces.find((item) => item.id === context.workspaceId);
    const workspaceName = workspace?.name || 'Workspace atual';
    const attribution = await readAttributionFromCookies();
    await upsertAttributionForUser({
      userId: context.userId,
      workspaceId: context.workspaceId,
      attribution,
    });
    const customerId = await withStripeTimeout(
      ensureStripeCustomer({
        userId: context.userId,
        email: context.email,
      }),
      'A criação do cliente Stripe demorou demais. Tente novamente.'
    );

    const existingWorkspaceSubscription = await readWorkspaceSubscription(context.workspaceId);
    const existingSubscriptionId = existingWorkspaceSubscription?.stripe_subscription_id ?? null;
    const shouldApplyTrial =
      getBillingTrialDays(resolved.plan) > 0 && !existingWorkspaceSubscription?.stripe_subscription_id;

    if (existingSubscriptionId) {
      try {
        const existingSubscription = await withStripeTimeout(
          stripe.subscriptions.retrieve(existingSubscriptionId, {
            expand: ['latest_invoice.payment_intent', 'latest_invoice.confirmation_secret', 'pending_setup_intent'],
          }),
          'A validação da assinatura atual demorou demais. Tente novamente.'
        );

        const existingPriceId = existingSubscription.items.data[0]?.price?.id ?? null;
        const requestedSelectionMatches =
          existingPriceId === resolved.priceId ||
          normalizeBillingPlan(existingWorkspaceSubscription?.plan) === resolved.plan;

        if (existingSubscription.status === 'active' || existingSubscription.status === 'trialing') {
          return NextResponse.json(
            {
              error:
                'Este workspace já possui uma assinatura ativa. Use o portal do cliente para trocar ou cancelar o plano.',
              code: 'ACTIVE_SUBSCRIPTION_EXISTS',
              currentPlan: existingWorkspaceSubscription?.plan || null,
              currentStatus: existingSubscription.status,
            },
            { status: 409 }
          );
        }

        if (
          requestedSelectionMatches &&
          (existingSubscription.status === 'incomplete' ||
            existingSubscription.status === 'past_due' ||
            existingSubscription.status === 'unpaid')
        ) {
          const reusedState = serializeSubscriptionState({
            subscription: existingSubscription,
            plan: resolved.plan,
            interval: resolved.interval,
            workspaceId: context.workspaceId,
            workspaceName,
            customerId,
            priceId: resolved.priceId,
          });

          if (!reusedState.requiresConfirmation) {
            return NextResponse.json(
              {
                error:
                  'Existe uma cobrança pendente para este workspace. Atualize a forma de pagamento para regularizar a assinatura antes de trocar de plano.',
                code: 'PAYMENT_METHOD_UPDATE_REQUIRED',
                currentStatus: existingSubscription.status,
              },
              { status: 409 }
            );
          }

          await upsertWorkspaceSubscriptionSafe({
            workspaceId: context.workspaceId,
            plan: resolved.plan,
            status: mapStripeStatusToStoredStatus(existingSubscription.status),
            stripeCustomerId: customerId,
            stripeSubscriptionId: existingSubscription.id,
            currentPeriodEnd: getCurrentPeriodEnd(existingSubscription),
          });

          return NextResponse.json(reusedState);
        }

        if (
          (existingSubscription.status === 'incomplete' ||
            existingSubscription.status === 'incomplete_expired') &&
          !requestedSelectionMatches
        ) {
          await withStripeTimeout(
            stripe.subscriptions.cancel(existingSubscription.id),
            'O ajuste da assinatura anterior demorou demais. Tente novamente.'
          );
        }
      } catch (error) {
        console.warn('Stripe Payment Element: failed to inspect existing subscription', error);
      }
    }

    const subscription = await withStripeTimeout(
      stripe.subscriptions.create({
        customer: customerId,
        items: [
          {
            price: resolved.priceId,
          },
        ],
        payment_behavior: 'default_incomplete',
        payment_settings: {
          save_default_payment_method: 'on_subscription',
        },
        ...(shouldApplyTrial ? { trial_period_days: getBillingTrialDays(resolved.plan) } : {}),
        metadata: {
          userId: context.userId,
          workspaceId: context.workspaceId,
          plan: resolved.plan,
          interval: resolved.interval,
          priceId: resolved.priceId,
          utm_source: attribution?.utm_source || '',
          utm_medium: attribution?.utm_medium || '',
          utm_campaign: attribution?.utm_campaign || '',
          utm_content: attribution?.utm_content || '',
          utm_term: attribution?.utm_term || '',
          fbclid: attribution?.fbclid || '',
          xcod: attribution?.xcod || '',
        },
        expand: ['latest_invoice.payment_intent', 'latest_invoice.confirmation_secret', 'pending_setup_intent'],
      }),
      'A criação da assinatura no Stripe demorou demais. Tente novamente.'
    );

    const checkoutState = serializeSubscriptionState({
      subscription,
      plan: resolved.plan,
      interval: resolved.interval,
      workspaceId: context.workspaceId,
      workspaceName,
      customerId,
      priceId: resolved.priceId,
    });

    if (!checkoutState.clientSecret && checkoutState.intentType !== 'none') {
      return NextResponse.json(
        { error: 'Stripe did not return a client secret for the subscription.' },
        { status: 500 }
      );
    }

    await upsertWorkspaceSubscriptionSafe({
      workspaceId: context.workspaceId,
      plan: resolved.plan,
      status: mapStripeStatusToStoredStatus(subscription.status),
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id,
      currentPeriodEnd: getCurrentPeriodEnd(subscription),
    });

    await logWorkspaceEventSafe({
      workspaceId: context.workspaceId,
      userId: context.userId,
      type: 'stripe.payment_element_started',
      payload: {
        plan: resolved.plan,
        interval: resolved.interval,
        priceId: resolved.priceId,
        subscriptionId: subscription.id,
        intentType: checkoutState.intentType,
        trialDays: shouldApplyTrial ? getBillingTrialDays(resolved.plan) : 0,
        attribution,
      },
    });

    return NextResponse.json(checkoutState);
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

    if (error instanceof StripeRequestTimeoutError) {
      return NextResponse.json({ error: error.message }, { status: 504 });
    }

    console.error('Stripe Payment Element Error:', error);
    const message =
      process.env.NODE_ENV === 'development' && error instanceof Error
        ? error.message
        : 'Failed to initialize embedded checkout.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


