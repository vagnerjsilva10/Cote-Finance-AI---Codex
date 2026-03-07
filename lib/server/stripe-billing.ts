import 'server-only';

import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getStripe } from '@/lib/stripe';
import {
  normalizeBillingInterval,
  normalizeBillingPlan,
  type BillingIntervalCode,
  type BillingPlanCode,
} from '@/lib/billing/plans';

type StripePriceMatrix = Record<BillingPlanCode, Record<BillingIntervalCode, string | undefined>>;

export type ResolvedStripePlan = {
  plan: BillingPlanCode | null;
  interval: BillingIntervalCode | null;
  priceId: string | null;
};

export const STRIPE_PRICE_IDS: StripePriceMatrix = {
  PRO: {
    MONTHLY: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY,
    ANNUAL: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_ANNUAL,
  },
  PREMIUM: {
    MONTHLY: process.env.NEXT_PUBLIC_STRIPE_PRICE_PREMIUM_MONTHLY,
    ANNUAL: process.env.NEXT_PUBLIC_STRIPE_PRICE_PREMIUM_ANNUAL,
  },
};

export function isMissingOptionalBillingTableError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === 'P2021' || error.code === 'P2022';
  }

  const message = error instanceof Error ? error.message : String(error || '');
  return /does not exist|relation .* does not exist|table .* doesn't exist|column .* does not exist/i.test(
    message
  );
}

function isAllowedStripePriceId(priceId: string) {
  return Object.values(STRIPE_PRICE_IDS).some((intervalMap) =>
    Object.values(intervalMap).includes(priceId)
  );
}

export function resolveStripePlan(params: {
  priceId?: string | null;
  plan?: string | null;
  interval?: string | null;
}): ResolvedStripePlan {
  const requestedPriceId = typeof params.priceId === 'string' ? params.priceId.trim() : '';

  if (requestedPriceId) {
    if (!isAllowedStripePriceId(requestedPriceId)) {
      return { plan: null, interval: null, priceId: null };
    }

    for (const plan of Object.keys(STRIPE_PRICE_IDS) as BillingPlanCode[]) {
      for (const interval of Object.keys(STRIPE_PRICE_IDS[plan]) as BillingIntervalCode[]) {
        if (STRIPE_PRICE_IDS[plan][interval] === requestedPriceId) {
          return { plan, interval, priceId: requestedPriceId };
        }
      }
    }
  }

  const plan = normalizeBillingPlan(params.plan);
  const interval = normalizeBillingInterval(params.interval);
  if (!plan || !interval) {
    return { plan: null, interval: null, priceId: null };
  }

  const priceId = STRIPE_PRICE_IDS[plan][interval] ?? null;
  if (!priceId) {
    return { plan, interval, priceId: null };
  }

  return { plan, interval, priceId };
}

export async function ensureStripeCustomer(params: {
  userId: string;
  email?: string | null;
}) {
  let profile: { stripe_customer_id: string | null } | null = null;

  try {
    profile = await prisma.profile.findUnique({
      where: { user_id: params.userId },
      select: {
        stripe_customer_id: true,
      },
    });
  } catch (error) {
    if (!isMissingOptionalBillingTableError(error)) {
      throw error;
    }
  }

  if (profile?.stripe_customer_id) {
    return profile.stripe_customer_id;
  }

  const stripe = getStripe();
  const customer = await stripe.customers.create({
    email: params.email ?? undefined,
    metadata: {
      userId: params.userId,
    },
  });

  try {
    await prisma.profile.upsert({
      where: { user_id: params.userId },
      update: {
        stripe_customer_id: customer.id,
      },
      create: {
        user_id: params.userId,
        stripe_customer_id: customer.id,
        plan: 'FREE',
      },
    });
  } catch (error) {
    if (!isMissingOptionalBillingTableError(error)) {
      throw error;
    }
  }

  return customer.id;
}
