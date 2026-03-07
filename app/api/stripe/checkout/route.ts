import { NextResponse } from 'next/server';
import {
  getStripe,
  STRIPE_SECRET_KEY_MISSING_ERROR,
  STRIPE_NOT_CONFIGURED_RESPONSE,
} from '@/lib/stripe';
import { prisma } from '@/lib/prisma';
import {
  HttpError,
  logWorkspaceEventSafe,
  resolveWorkspaceContext,
  upsertWorkspaceSubscriptionSafe,
} from '@/lib/server/multi-tenant';
import { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type CheckoutBody = {
  priceId?: string;
  plan?: string;
  interval?: string;
};

type StripePlan = 'PRO' | 'PREMIUM';
type StripeInterval = 'MONTHLY' | 'ANNUAL';

const PLAN_INTERVAL_PRICE_IDS: Record<StripePlan, Record<StripeInterval, string | undefined>> = {
  PRO: {
    MONTHLY: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY,
    ANNUAL: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_ANNUAL,
  },
  PREMIUM: {
    MONTHLY: process.env.NEXT_PUBLIC_STRIPE_PRICE_PREMIUM_MONTHLY,
    ANNUAL: process.env.NEXT_PUBLIC_STRIPE_PRICE_PREMIUM_ANNUAL,
  },
};

const isMissingTableError = (error: unknown) => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === 'P2021' || error.code === 'P2022';
  }
  const message = error instanceof Error ? error.message : String(error || '');
  return /does not exist|relation .* does not exist|column .* does not exist/i.test(message);
};

function normalizePlan(plan?: string): StripePlan | null {
  if (!plan) return null;
  const normalized = plan.trim().toUpperCase();
  if (normalized === 'PRO' || normalized === 'PREMIUM') return normalized;
  return null;
}

function normalizeInterval(interval?: string): StripeInterval | null {
  if (!interval) return null;
  const normalized = interval.trim().toUpperCase();
  if (normalized === 'MONTHLY' || normalized === 'ANNUAL') return normalized;
  return null;
}

function resolvePriceId(body: CheckoutBody): string | null {
  if (typeof body.priceId === 'string' && body.priceId.trim().length > 0) {
    return body.priceId.trim();
  }

  const plan = normalizePlan(body.plan);
  const interval = normalizeInterval(body.interval);
  if (!plan || !interval) return null;

  return PLAN_INTERVAL_PRICE_IDS[plan][interval] ?? null;
}

function resolvePlanAndIntervalFromPriceId(priceId: string): {
  plan: StripePlan | null;
  interval: StripeInterval | null;
} {
  for (const plan of Object.keys(PLAN_INTERVAL_PRICE_IDS) as StripePlan[]) {
    for (const interval of Object.keys(PLAN_INTERVAL_PRICE_IDS[plan]) as StripeInterval[]) {
      if (PLAN_INTERVAL_PRICE_IDS[plan][interval] === priceId) {
        return { plan, interval };
      }
    }
  }
  return { plan: null, interval: null };
}

export async function POST(req: Request) {
  try {
    const stripe = getStripe();
    const body = (await req.json().catch(() => null)) as CheckoutBody | null;
    if (!body) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const priceId = resolvePriceId(body);
    if (!priceId) {
      return NextResponse.json(
        { error: 'Missing or invalid priceId. Send priceId or valid plan/interval.' },
        { status: 400 }
      );
    }

    const context = await resolveWorkspaceContext(req);
    const user = {
      id: context.userId,
      email: context.email,
    };

    let profile: { stripe_customer_id: string | null } | null = null;
    try {
      profile = await prisma.profile.findUnique({
        where: { user_id: user.id },
        select: {
          stripe_customer_id: true,
        },
      });
    } catch (error) {
      if (!isMissingTableError(error)) {
        throw error;
      }
    }

    let customerId = profile?.stripe_customer_id || null;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: {
          userId: user.id,
        },
      });
      customerId = customer.id;

      try {
        await prisma.profile.upsert({
          where: { user_id: user.id },
          update: {
            stripe_customer_id: customerId,
          },
          create: {
            user_id: user.id,
            stripe_customer_id: customerId,
            plan: 'FREE',
          },
        });
      } catch (error) {
        if (!isMissingTableError(error)) {
          throw error;
        }
      }
    }

    const requestUrl = new URL(req.url);
    const baseUrl = process.env.APP_URL || requestUrl.origin;
    const successUrl = new URL('/?checkout=success', baseUrl).toString();
    const cancelUrl = new URL('/?checkout=canceled', baseUrl).toString();
    const normalizedPlan = normalizePlan(body.plan);
    const normalizedInterval = normalizeInterval(body.interval);
    const derived = resolvePlanAndIntervalFromPriceId(priceId);
    const workspaceId = context.workspaceId;
    const selectedPlan = normalizedPlan || derived.plan;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
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
        plan: normalizedPlan || derived.plan || '',
        interval: normalizedInterval || derived.interval || '',
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
        priceId,
        plan: selectedPlan || null,
        interval: normalizedInterval || derived.interval || null,
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
