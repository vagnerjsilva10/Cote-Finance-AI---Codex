import { NextResponse } from 'next/server';
import { getStripe, STRIPE_NOT_CONFIGURED_RESPONSE, STRIPE_SECRET_KEY_MISSING_ERROR } from '@/lib/stripe';
import { asPrismaServiceUnavailableError, prisma } from '@/lib/prisma';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { logWorkspaceEventSafe, upsertWorkspaceSubscriptionSafe } from '@/lib/server/multi-tenant';
import {
  mapStripeStatusToStoredStatus,
  normalizeBillingPlan,
  type StoredBillingStatus,
  isEntitledStripeStatus,
} from '@/lib/server/billing-status';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type AppPlan = 'FREE' | 'PRO' | 'PREMIUM';
type EntitlementStatus = 'ACTIVE' | 'CANCELED';

const PLAN_BY_PRICE_ID: Record<string, AppPlan> = {
  ...(process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY
    ? { [process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY]: 'PRO' as const }
    : {}),
  ...(process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_ANNUAL
    ? { [process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_ANNUAL]: 'PRO' as const }
    : {}),
  ...(process.env.NEXT_PUBLIC_STRIPE_PRICE_PREMIUM_MONTHLY
    ? { [process.env.NEXT_PUBLIC_STRIPE_PRICE_PREMIUM_MONTHLY]: 'PREMIUM' as const }
    : {}),
  ...(process.env.NEXT_PUBLIC_STRIPE_PRICE_PREMIUM_ANNUAL
    ? { [process.env.NEXT_PUBLIC_STRIPE_PRICE_PREMIUM_ANNUAL]: 'PREMIUM' as const }
    : {}),
};

function normalizePlan(plan?: string | null): AppPlan | null {
  if (!plan) return null;
  return normalizeBillingPlan(plan);
}

function planFromPriceId(priceId?: string | null): AppPlan | null {
  if (!priceId) return null;
  return PLAN_BY_PRICE_ID[priceId] ?? null;
}

async function syncSubscriptionByUserId(params: {
  userId: string;
  plan: AppPlan | null;
  status: EntitlementStatus;
  customerId?: string | null;
  currentPeriodEnd?: Date | null;
}) {
  const { userId, plan, status, customerId, currentPeriodEnd } = params;
  const effectivePlan = status === 'ACTIVE' && plan ? plan : 'FREE';
  const profileUpdate: { stripe_customer_id?: string; plan?: AppPlan } = {};

  if (customerId) {
    profileUpdate.stripe_customer_id = customerId;
  }
  profileUpdate.plan = effectivePlan;

  if (Object.keys(profileUpdate).length > 0) {
    try {
      await prisma.profile.upsert({
        where: { user_id: userId },
        update: profileUpdate,
        create: {
          user_id: userId,
          stripe_customer_id: customerId || undefined,
          plan: effectivePlan,
        },
      });
    } catch (error) {
      console.error('Stripe webhook: failed to sync Profile', { userId, error });
    }
  }

  try {
    await prisma.subscriptionEntitlement.upsert({
      where: { user_id: userId },
      update: {
        plan: effectivePlan,
        status,
        current_period_end: currentPeriodEnd ?? null,
      },
      create: {
        user_id: userId,
        plan: effectivePlan,
        status,
        current_period_end: currentPeriodEnd ?? null,
      },
    });
  } catch (error) {
    console.error('Stripe webhook: failed to sync SubscriptionEntitlement', { userId, error });
  }
}

async function syncSubscriptionByCustomerId(params: {
  customerId: string;
  plan: AppPlan | null;
  status: EntitlementStatus;
  currentPeriodEnd?: Date | null;
}) {
  const profiles = await prisma.profile.findMany({
    where: { stripe_customer_id: params.customerId },
    select: { user_id: true },
  });

  for (const profile of profiles) {
    await syncSubscriptionByUserId({
      userId: profile.user_id,
      plan: params.plan,
      status: params.status,
      customerId: params.customerId,
      currentPeriodEnd: params.currentPeriodEnd,
    });
  }
}

async function syncCustomerReferenceByUserId(params: { userId: string; customerId: string }) {
  try {
    await prisma.profile.upsert({
      where: { user_id: params.userId },
      update: {
        stripe_customer_id: params.customerId,
      },
      create: {
        user_id: params.userId,
        stripe_customer_id: params.customerId,
        plan: 'FREE',
      },
    });
  } catch (error) {
    console.error('Stripe webhook: failed to sync customer reference', params, error);
  }
}

async function syncSubscriptionByWorkspaceId(params: {
  workspaceId: string;
  plan: AppPlan | null;
  status: EntitlementStatus | 'PENDING';
  customerId?: string | null;
  subscriptionId?: string | null;
  currentPeriodEnd?: Date | null;
  userId?: string | null;
  eventType?: string;
}) {
  await upsertWorkspaceSubscriptionSafe({
    workspaceId: params.workspaceId,
    plan: params.plan || 'FREE',
    status: params.status,
    stripeCustomerId: params.customerId ?? null,
    stripeSubscriptionId: params.subscriptionId ?? null,
    currentPeriodEnd: params.currentPeriodEnd ?? null,
  });

  await logWorkspaceEventSafe({
    workspaceId: params.workspaceId,
    userId: params.userId ?? null,
    type: params.eventType || 'stripe.subscription_synced',
    payload: {
      plan: params.plan || 'FREE',
      status: params.status,
      customerId: params.customerId || null,
      subscriptionId: params.subscriptionId || null,
    },
  });
}

async function syncSubscriptionBySubscriptionRef(params: {
  subscriptionId?: string | null;
  customerId?: string | null;
  plan: AppPlan | null;
  status: EntitlementStatus;
  currentPeriodEnd?: Date | null;
}) {
  try {
    const whereClauses: Array<{ stripe_subscription_id?: string; stripe_customer_id?: string }> = [];
    if (params.subscriptionId) {
      whereClauses.push({ stripe_subscription_id: params.subscriptionId });
    }
    if (params.customerId) {
      whereClauses.push({ stripe_customer_id: params.customerId });
    }
    if (whereClauses.length === 0) return;

    const workspaceSubscriptions = await prisma.workspaceSubscription.findMany({
      where: {
        OR: whereClauses,
      },
      select: {
        workspace_id: true,
      },
    });

    for (const workspaceSubscription of workspaceSubscriptions) {
      await syncSubscriptionByWorkspaceId({
        workspaceId: workspaceSubscription.workspace_id,
        plan: params.plan,
        status: params.status,
        customerId: params.customerId ?? null,
        subscriptionId: params.subscriptionId ?? null,
        currentPeriodEnd: params.currentPeriodEnd ?? null,
        eventType: 'stripe.subscription_synced_by_reference',
      });
    }
  } catch {
    // Optional table not migrated yet.
  }
}

async function syncWorkspaceStatusByReference(params: {
  subscriptionId?: string | null;
  customerId?: string | null;
  plan: AppPlan | null;
  status: EntitlementStatus | 'PENDING';
  currentPeriodEnd?: Date | null;
  eventType?: string;
}) {
  try {
    const whereClauses: Array<{ stripe_subscription_id?: string; stripe_customer_id?: string }> = [];
    if (params.subscriptionId) {
      whereClauses.push({ stripe_subscription_id: params.subscriptionId });
    }
    if (params.customerId) {
      whereClauses.push({ stripe_customer_id: params.customerId });
    }
    if (whereClauses.length === 0) return;

    const workspaceSubscriptions = await prisma.workspaceSubscription.findMany({
      where: {
        OR: whereClauses,
      },
      select: {
        workspace_id: true,
      },
    });

    for (const workspaceSubscription of workspaceSubscriptions) {
      await syncSubscriptionByWorkspaceId({
        workspaceId: workspaceSubscription.workspace_id,
        plan: params.plan,
        status: params.status,
        customerId: params.customerId ?? null,
        subscriptionId: params.subscriptionId ?? null,
        currentPeriodEnd: params.currentPeriodEnd ?? null,
        eventType: params.eventType || 'stripe.invoice_synced_by_reference',
      });
    }
  } catch {
    // Optional table not migrated yet.
  }
}

export async function POST(req: Request) {
  let stripe: ReturnType<typeof getStripe>;

  try {
    stripe = getStripe();
  } catch (error: any) {
    if (error instanceof Error && error.message === STRIPE_SECRET_KEY_MISSING_ERROR) {
      return NextResponse.json({ error: STRIPE_NOT_CONFIGURED_RESPONSE }, { status: 500 });
    }
    return NextResponse.json({ error: 'Stripe unavailable' }, { status: 500 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json(
      { error: 'Stripe webhook não configurado. Defina STRIPE_WEBHOOK_SECRET no .env' },
      { status: 500 }
    );
  }

  const signature = (await headers()).get('Stripe-Signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing Stripe-Signature header' }, { status: 400 });
  }

  const body = await req.text();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId || session.client_reference_id;
        const workspaceId = session.metadata?.workspaceId || null;
        const customerId = typeof session.customer === 'string' ? session.customer : null;
        const subscriptionId = typeof session.subscription === 'string' ? session.subscription : null;
        const plan = normalizePlan(session.metadata?.plan);

        if (userId && customerId) {
          await syncCustomerReferenceByUserId({
            userId,
            customerId,
          });
        }

        if (workspaceId) {
          await syncSubscriptionByWorkspaceId({
            workspaceId,
            userId,
            customerId,
            subscriptionId,
            plan: plan || 'FREE',
            status: 'PENDING',
            eventType: 'stripe.checkout_completed',
          });
        } else if (!userId && !customerId) {
          console.warn('Stripe webhook: checkout.session.completed without user/customer reference');
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = typeof subscription.customer === 'string' ? subscription.customer : null;
        const priceId = subscription.items.data[0]?.price?.id ?? null;
        const metadataUserId = subscription.metadata?.userId || null;
        const metadataWorkspaceId = subscription.metadata?.workspaceId || null;
        const metadataPlan = normalizePlan(subscription.metadata?.plan);
        const storedStatus: StoredBillingStatus =
          event.type === 'customer.subscription.deleted'
            ? 'CANCELED'
            : mapStripeStatusToStoredStatus(subscription.status);
        const entitlementStatus: EntitlementStatus =
          event.type === 'customer.subscription.deleted'
            ? 'CANCELED'
            : isEntitledStripeStatus(subscription.status)
              ? 'ACTIVE'
              : 'CANCELED';
        const plan = metadataPlan || planFromPriceId(priceId) || null;
        const currentPeriodEndRaw = (subscription as any).current_period_end;
        const currentPeriodEnd =
          entitlementStatus === 'ACTIVE' && typeof currentPeriodEndRaw === 'number'
            ? new Date(currentPeriodEndRaw * 1000)
            : null;

        if (metadataUserId) {
          await syncSubscriptionByUserId({
            userId: metadataUserId,
            customerId,
            plan,
            status: entitlementStatus,
            currentPeriodEnd,
          });
        } else if (customerId) {
          await syncSubscriptionByCustomerId({
            customerId,
            plan,
            status: entitlementStatus,
            currentPeriodEnd,
          });
        } else {
          console.warn(`Stripe webhook: ${event.type} without customer reference`);
        }

        if (metadataWorkspaceId) {
          await syncSubscriptionByWorkspaceId({
            workspaceId: metadataWorkspaceId,
            userId: metadataUserId,
            customerId,
            subscriptionId: subscription.id,
            plan,
            status: storedStatus,
            currentPeriodEnd,
            eventType: `stripe.${event.type}`,
          });
        } else {
          await syncSubscriptionBySubscriptionRef({
            subscriptionId: subscription.id,
            customerId,
            plan,
            status: storedStatus === 'ACTIVE' ? 'ACTIVE' : 'CANCELED',
            currentPeriodEnd,
          });
          await syncWorkspaceStatusByReference({
            subscriptionId: subscription.id,
            customerId,
            plan,
            status: storedStatus,
            currentPeriodEnd,
            eventType: `stripe.${event.type}`,
          });
        }
        break;
      }

      case 'invoice.paid':
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = typeof invoice.customer === 'string' ? invoice.customer : null;
        const parentSubscription = invoice.parent?.subscription_details?.subscription;
        const subscriptionId = typeof parentSubscription === 'string' ? parentSubscription : null;
        const recurringLine = invoice.lines.data.find((line) => {
          const linePrice = line.pricing?.price_details?.price;
          if (!linePrice || typeof linePrice === 'string') {
            return false;
          }
          return linePrice.type === 'recurring';
        }) ?? null;
        const recurringPrice = recurringLine?.pricing?.price_details?.price;
        const priceId =
          typeof recurringPrice === 'string' ? recurringPrice : recurringPrice?.id ?? null;
        const plan = planFromPriceId(priceId);
        const status = event.type === 'invoice.paid' ? 'ACTIVE' : 'PENDING';

        if (customerId) {
          await syncSubscriptionByCustomerId({
            customerId,
            plan,
            status: event.type === 'invoice.paid' ? 'ACTIVE' : 'CANCELED',
            currentPeriodEnd: null,
          });
        }

        await syncWorkspaceStatusByReference({
          subscriptionId,
          customerId,
          plan,
          status,
          eventType: `stripe.${event.type}`,
        });

        break;
      }

      default:
        break;
    }
  } catch (error) {
    const prismaError = asPrismaServiceUnavailableError(error);
    if (prismaError) {
      console.error('Stripe webhook database unavailable:', prismaError.detail || prismaError.message);
      return NextResponse.json({ error: prismaError.message }, { status: 503 });
    }

    console.error('Stripe webhook processing error:', error);
  }

  return NextResponse.json({ received: true });
}

