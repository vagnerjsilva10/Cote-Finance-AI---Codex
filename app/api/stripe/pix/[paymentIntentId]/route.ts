import { NextResponse } from 'next/server';
import { asPrismaServiceUnavailableError } from '@/lib/prisma';
import { HttpError, resolveWorkspaceContext } from '@/lib/server/multi-tenant';
import {
  normalizeBillingInterval,
  normalizeBillingPlan,
} from '@/lib/billing/plans';
import { getStripe, STRIPE_NOT_CONFIGURED_RESPONSE, STRIPE_SECRET_KEY_MISSING_ERROR } from '@/lib/stripe';
import { getEditablePlanConfig, getRuntimeBillingPriceLabel } from '@/lib/server/superadmin-governance';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{
    paymentIntentId: string;
  }>;
};

type PixCheckoutStatus = 'awaiting_payment' | 'processing' | 'confirmed' | 'expired' | 'failed';

function resolvePixStatus(status: string, expiresAt?: string | null): PixCheckoutStatus {
  if (status === 'succeeded') return 'confirmed';
  if (status === 'processing') return 'processing';
  if (status === 'canceled') return 'expired';
  if (expiresAt && new Date(expiresAt).getTime() <= Date.now()) return 'expired';
  return 'awaiting_payment';
}

export async function GET(req: Request, context: RouteContext) {
  try {
    const stripe = getStripe();
    const { paymentIntentId } = await context.params;
    const workspaceContext = await resolveWorkspaceContext(req);
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (
      paymentIntent.metadata?.workspaceId &&
      paymentIntent.metadata.workspaceId !== workspaceContext.workspaceId
    ) {
      return NextResponse.json({ error: 'Pix não encontrado para este workspace.' }, { status: 404 });
    }

    const plan = normalizeBillingPlan(paymentIntent.metadata?.plan);
    const interval = normalizeBillingInterval(paymentIntent.metadata?.interval);
    if (!plan || !interval) {
      return NextResponse.json({ error: 'Pix inválido para este plano.' }, { status: 400 });
    }

    const nextAction = (paymentIntent.next_action ?? null) as {
      pix_display_qr_code?: {
        image_url_png?: string | null;
        image_url_svg?: string | null;
        hosted_instructions_url?: string | null;
        data?: string | null;
      } | null;
    } | null;
    const workspace = workspaceContext.workspaces.find((item) => item.id === workspaceContext.workspaceId);
    const planConfig = await getEditablePlanConfig(plan);
    const amount = interval === 'ANNUAL' ? planConfig.annualPrice : planConfig.monthlyPrice;

    return NextResponse.json({
      paymentIntentId: paymentIntent.id,
      status: resolvePixStatus(paymentIntent.status, paymentIntent.metadata?.pixExpiresAt),
      amount,
      currency: 'BRL',
      plan,
      interval,
      workspaceId: workspaceContext.workspaceId,
      workspaceName: workspace?.name || 'Workspace atual',
      planName: planConfig.name,
      planDescription: planConfig.description,
      priceLabel: await getRuntimeBillingPriceLabel(plan, interval),
      features: planConfig.features,
      trustBadges: planConfig.trustBadges,
      qrCodeUrl: nextAction?.pix_display_qr_code?.image_url_png || nextAction?.pix_display_qr_code?.image_url_svg || null,
      copyAndPasteCode: nextAction?.pix_display_qr_code?.data || null,
      hostedInstructionsUrl: nextAction?.pix_display_qr_code?.hosted_instructions_url || null,
      expiresAt: paymentIntent.metadata?.pixExpiresAt || null,
    });
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

    console.error('Stripe Pix Status Error:', error);
    return NextResponse.json({ error: 'Não foi possível consultar o Pix.' }, { status: 500 });
  }
}
