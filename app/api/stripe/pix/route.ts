import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripe, STRIPE_NOT_CONFIGURED_RESPONSE, STRIPE_SECRET_KEY_MISSING_ERROR } from '@/lib/stripe';
import { asPrismaServiceUnavailableError } from '@/lib/prisma';
import {
  HttpError,
  logWorkspaceEventSafe,
  resolveWorkspaceContext,
  upsertWorkspaceSubscriptionSafe,
} from '@/lib/server/multi-tenant';
import {
  normalizeBillingInterval,
  normalizeBillingPlan,
  type BillingIntervalCode,
  type BillingPlanCode,
} from '@/lib/billing/plans';
import { ensureStripeCustomer } from '@/lib/server/stripe-billing';
import { readAttributionFromCookies, upsertAttributionForUser } from '@/lib/server/tracking';
import { getEditablePlanConfig, getRuntimeBillingPriceLabel } from '@/lib/server/superadmin-governance';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type PixCheckoutBody = {
  plan?: string;
  interval?: string;
};

type PixCheckoutStatus = 'awaiting_payment' | 'processing' | 'confirmed' | 'expired' | 'failed';

async function resolvePlanAmount(plan: BillingPlanCode, interval: BillingIntervalCode) {
  const planDetails = await getEditablePlanConfig(plan);
  return interval === 'ANNUAL' ? planDetails.annualPrice : planDetails.monthlyPrice;
}

function getPixPayload(paymentIntent: Stripe.PaymentIntent) {
  const nextAction = (paymentIntent.next_action ?? null) as Stripe.PaymentIntent.NextAction | null;
  const pixDetails = (nextAction as Stripe.PaymentIntent.NextAction & {
    pix_display_qr_code?: {
      image_url_png?: string | null;
      image_url_svg?: string | null;
      hosted_instructions_url?: string | null;
      data?: string | null;
    } | null;
  })?.pix_display_qr_code;

  return {
    qrCodeUrl: pixDetails?.image_url_png || pixDetails?.image_url_svg || null,
    copyAndPasteCode: pixDetails?.data || null,
    hostedInstructionsUrl: pixDetails?.hosted_instructions_url || null,
  };
}

function resolvePixStatus(paymentIntent: Stripe.PaymentIntent): PixCheckoutStatus {
  if (paymentIntent.status === 'succeeded') return 'confirmed';
  if (paymentIntent.status === 'processing') return 'processing';
  if (paymentIntent.status === 'canceled') return 'expired';
  const expiresAt = paymentIntent.metadata?.pixExpiresAt;
  if (expiresAt && new Date(expiresAt).getTime() <= Date.now()) return 'expired';
  return 'awaiting_payment';
}

async function serializePixPaymentIntent(params: {
  paymentIntent: Stripe.PaymentIntent;
  plan: BillingPlanCode;
  interval: BillingIntervalCode;
  workspaceId: string;
  workspaceName: string;
}) {
  const planConfig = await getEditablePlanConfig(params.plan);
  const amount = await resolvePlanAmount(params.plan, params.interval);
  const pixPayload = getPixPayload(params.paymentIntent);

  return {
    paymentIntentId: params.paymentIntent.id,
    status: resolvePixStatus(params.paymentIntent),
    amount,
    currency: 'BRL' as const,
    plan: params.plan,
    interval: params.interval,
    workspaceId: params.workspaceId,
    workspaceName: params.workspaceName,
    planName: planConfig.name,
    planDescription: planConfig.description,
    priceLabel: await getRuntimeBillingPriceLabel(params.plan, params.interval),
    features: planConfig.features,
    trustBadges: planConfig.trustBadges,
    qrCodeUrl: pixPayload.qrCodeUrl,
    copyAndPasteCode: pixPayload.copyAndPasteCode,
    hostedInstructionsUrl: pixPayload.hostedInstructionsUrl,
    expiresAt: params.paymentIntent.metadata?.pixExpiresAt || null,
  };
}

export async function POST(req: Request) {
  try {
    const stripe = getStripe();
    const body = (await req.json().catch(() => null)) as PixCheckoutBody | null;
    const plan = normalizeBillingPlan(body?.plan);
    const interval = normalizeBillingInterval(body?.interval);

    if (!plan || !interval) {
      return NextResponse.json({ error: 'Selecione um plano válido para gerar o Pix.' }, { status: 400 });
    }

    const context = await resolveWorkspaceContext(req);
    const workspace = context.workspaces.find((item) => item.id === context.workspaceId);
    const workspaceName = workspace?.name || 'Workspace atual';
    const customerId = await ensureStripeCustomer({
      userId: context.userId,
      email: context.email,
    });
    const attribution = await readAttributionFromCookies();

    await upsertAttributionForUser({
      userId: context.userId,
      workspaceId: context.workspaceId,
      attribution,
    });

    const planConfig = await getEditablePlanConfig(plan);
    const amount = Math.round((await resolvePlanAmount(plan, interval)) * 100);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 30).toISOString();
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'brl',
      customer: customerId,
      confirm: true,
      payment_method_types: ['pix'],
      payment_method_data: {
        type: 'pix',
      },
      description: `${planConfig.name} via Pix`,
      metadata: {
        checkoutMode: 'pix',
        userId: context.userId,
        workspaceId: context.workspaceId,
        plan,
        interval,
        customerId,
        pixExpiresAt: expiresAt,
        utm_source: attribution?.utm_source || '',
        utm_medium: attribution?.utm_medium || '',
        utm_campaign: attribution?.utm_campaign || '',
        utm_content: attribution?.utm_content || '',
        utm_term: attribution?.utm_term || '',
        fbclid: attribution?.fbclid || '',
        xcod: attribution?.xcod || '',
      },
    });

    await upsertWorkspaceSubscriptionSafe({
      workspaceId: context.workspaceId,
      plan,
      status: 'PENDING',
      stripeCustomerId: customerId,
      stripeSubscriptionId: paymentIntent.id,
      currentPeriodEnd: null,
    });

    await logWorkspaceEventSafe({
      workspaceId: context.workspaceId,
      userId: context.userId,
      type: 'stripe.pix_started',
      payload: {
        paymentIntentId: paymentIntent.id,
        amount: amount / 100,
        plan,
        interval,
        attribution,
      },
    });

    return NextResponse.json(
      await serializePixPaymentIntent({
        paymentIntent,
        plan,
        interval,
        workspaceId: context.workspaceId,
        workspaceName,
      })
    );
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

    console.error('Stripe Pix Error:', error);
    return NextResponse.json({ error: 'Não foi possível gerar o Pix no momento.' }, { status: 500 });
  }
}
