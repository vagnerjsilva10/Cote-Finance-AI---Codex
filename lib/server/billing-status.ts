import 'server-only';

export type AppBillingPlan = 'FREE' | 'PRO' | 'PREMIUM';
export type StoredBillingStatus = 'ACTIVE' | 'CANCELED' | 'PENDING';
export type StripeSubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'unpaid'
  | 'incomplete'
  | 'incomplete_expired'
  | 'canceled'
  | 'paused'
  | null
  | undefined;

const ENTITLED_STATUSES = new Set<NonNullable<StripeSubscriptionStatus>>(['active', 'trialing']);
const CANCELED_STATUSES = new Set<NonNullable<StripeSubscriptionStatus>>([
  'canceled',
  'incomplete_expired',
]);

export function normalizeBillingPlan(value: string | null | undefined): AppBillingPlan {
  const normalized = String(value || '')
    .trim()
    .toUpperCase();

  if (normalized === 'PRO' || normalized === 'PREMIUM') {
    return normalized;
  }

  return 'FREE';
}

export function hasPaidEntitlement(plan: string | null | undefined, status: StoredBillingStatus | null | undefined) {
  return normalizeBillingPlan(plan) !== 'FREE' && status === 'ACTIVE';
}

export function isEntitledStripeStatus(status: StripeSubscriptionStatus) {
  return status ? ENTITLED_STATUSES.has(status) : false;
}

export function mapStripeStatusToStoredStatus(status: StripeSubscriptionStatus): StoredBillingStatus {
  if (isEntitledStripeStatus(status)) {
    return 'ACTIVE';
  }

  if (status && CANCELED_STATUSES.has(status)) {
    return 'CANCELED';
  }

  return 'PENDING';
}

export function getPlanForStoredSubscription(params: {
  plan: string | null | undefined;
  status: StoredBillingStatus | null | undefined;
}) {
  if (!hasPaidEntitlement(params.plan, params.status)) {
    return 'FREE' as const;
  }

  return normalizeBillingPlan(params.plan);
}
