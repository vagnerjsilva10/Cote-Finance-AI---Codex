import { NextResponse } from 'next/server';
import {
  getStripe,
  STRIPE_SECRET_KEY_MISSING_ERROR,
  STRIPE_NOT_CONFIGURED_RESPONSE,
} from '@/lib/stripe';
import { asPrismaServiceUnavailableError } from '@/lib/prisma';
import {
  HttpError,
  logWorkspaceEventSafe,
  resolveWorkspaceContext,
  upsertWorkspaceSubscriptionSafe,
} from '@/lib/server/multi-tenant';
import { ensureStripeCustomer, resolveStripePlan } from '@/lib/server/stripe-billing';
import { getBillingTrialDays } from '@/lib/billing/plans';
import { readAttributionFromCookies, upsertAttributionForUser } from '@/lib/server/tracking';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type CheckoutBody = {
  priceId?: string;
  plan?: string;
  interval?: string;
};

export async function POST(req: Request) {
  try {
    const stripe = getStripe();
    const body = (await req.json().catch(() => null)) as CheckoutBody | null;
    if (!body) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const resolved = resolveStripePlan(body);
    if (!resolved.priceId || !resolved.plan || !resolved.interval) {
      return NextResponse.json(
        { error: 'Missing or invalid billing selection. Send a valid priceId or plan/interval.' },
        { status: 400 }
      );
    }

    const context = await resolveWorkspaceContext(req);
    const user = {
      id: context.userId,
      email: context.email,
    };

    const customerId = await ensureStripeCustomer({
      userId: user.id,
      email: user.email,
    });

    const requestUrl = new URL(req.url);
    const baseUrl = process.env.APP_URL || requestUrl.origin;
    const successUrl = new URL('/app?checkout=success', baseUrl).toString();
    const cancelUrl = new URL('/app?checkout=canceled', baseUrl).toString();
    const workspaceId = context.workspaceId;
    const selectedPlan = resolved.plan;
    const attribution = await readAttributionFromCookies();
    await upsertAttributionForUser({
      userId: user.id,
      workspaceId,
      attribution,
    });
    const trialDays = selectedPlan ? getBillingTrialDays(selectedPlan) : 0;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: resolved.priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      ...(customerId
        ? { customer: customerId }
        : { customer_email: user.email ?? undefined }),
      client_reference_id: user.id,
      metadata: {
        userId: user.id,
        workspaceId,
        plan: resolved.plan,
        interval: resolved.interval,
        utm_source: attribution?.utm_source || '',
        utm_medium: attribution?.utm_medium || '',
        utm_campaign: attribution?.utm_campaign || '',
        utm_content: attribution?.utm_content || '',
        utm_term: attribution?.utm_term || '',
        fbclid: attribution?.fbclid || '',
        xcod: attribution?.xcod || '',
      },
      subscription_data: {
        ...(trialDays > 0 ? { trial_period_days: trialDays } : {}),
        metadata: {
          userId: user.id,
          workspaceId,
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
      },
    });

    if (selectedPlan) {
      await upsertWorkspaceSubscriptionSafe({
        workspaceId,
        plan: selectedPlan,
        status: 'PENDING',
        stripeCustomerId: customerId,
      });
    }

    await logWorkspaceEventSafe({
      workspaceId,
      userId: user.id,
      type: 'stripe.checkout_started',
      payload: {
        priceId: resolved.priceId,
        plan: selectedPlan || null,
        interval: resolved.interval,
        trialDays,
        attribution,
      },
    });

    if (!session.url) {
      return NextResponse.json({ error: 'Stripe did not return a checkout URL' }, { status: 500 });
    }

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const prismaError = asPrismaServiceUnavailableError(error);
    if (prismaError) {
      return NextResponse.json({ error: prismaError.message }, { status: 503 });
    }
    if (error instanceof Error && error.message === STRIPE_SECRET_KEY_MISSING_ERROR) {
      return NextResponse.json(
        { error: STRIPE_NOT_CONFIGURED_RESPONSE },
        { status: 500 }
      );
    }

    console.error('Stripe Checkout Error:', error);
    const message =
      process.env.NODE_ENV === 'development' && error instanceof Error
        ? error.message
        : 'Failed to create checkout session';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

