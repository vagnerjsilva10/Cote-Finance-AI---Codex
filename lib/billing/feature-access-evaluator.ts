export type FeatureKey = 'whatsapp_financial_assistant';
export type WorkspacePlan = 'FREE' | 'PRO' | 'PREMIUM';

type AccessReason =
  | 'granted'
  | 'missing_subscription'
  | 'plan_not_allowed'
  | 'status_not_active'
  | 'period_expired';

export type FeatureAccessResult = {
  featureKey: FeatureKey;
  allowed: boolean;
  reason: AccessReason;
  plan: WorkspacePlan;
  status: string | null;
  currentPeriodEnd: string | null;
  source: 'workspace_subscription' | 'subscription_entitlement' | 'none';
};

const FEATURE_MIN_PLAN: Record<FeatureKey, WorkspacePlan> = {
  whatsapp_financial_assistant: 'PRO',
};

const PLAN_WEIGHT: Record<WorkspacePlan, number> = {
  FREE: 0,
  PRO: 1,
  PREMIUM: 2,
};

export const ENTITLED_STATUSES = new Set(['ACTIVE', 'TRIALING']);

export function normalizePlan(value: string | null | undefined): WorkspacePlan {
  const normalized = String(value || '')
    .trim()
    .toUpperCase();

  if (normalized === 'PRO' || normalized === 'PREMIUM') {
    return normalized;
  }

  return 'FREE';
}

export function normalizeStatus(value: string | null | undefined) {
  const normalized = String(value || '').trim().toUpperCase();
  return normalized || null;
}

function toIso(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

function isPeriodActive(currentPeriodEnd: Date | null | undefined, now = new Date()) {
  if (!currentPeriodEnd) return true;
  return currentPeriodEnd.getTime() >= now.getTime();
}

export function evaluateFeatureAccessFromSnapshot(params: {
  featureKey: FeatureKey;
  plan: WorkspacePlan;
  status: string | null;
  currentPeriodEnd: Date | null;
  source: FeatureAccessResult['source'];
  now?: Date;
}): FeatureAccessResult {
  const minPlan = FEATURE_MIN_PLAN[params.featureKey];
  const status = normalizeStatus(params.status);
  const plan = params.plan;
  const currentPeriodEnd = params.currentPeriodEnd;

  if (plan === 'FREE') {
    return {
      featureKey: params.featureKey,
      allowed: false,
      reason: 'plan_not_allowed',
      plan,
      status,
      currentPeriodEnd: toIso(currentPeriodEnd),
      source: params.source,
    };
  }

  if (PLAN_WEIGHT[plan] < PLAN_WEIGHT[minPlan]) {
    return {
      featureKey: params.featureKey,
      allowed: false,
      reason: 'plan_not_allowed',
      plan,
      status,
      currentPeriodEnd: toIso(currentPeriodEnd),
      source: params.source,
    };
  }

  if (!status || !ENTITLED_STATUSES.has(status)) {
    return {
      featureKey: params.featureKey,
      allowed: false,
      reason: 'status_not_active',
      plan,
      status,
      currentPeriodEnd: toIso(currentPeriodEnd),
      source: params.source,
    };
  }

  if (!isPeriodActive(currentPeriodEnd, params.now)) {
    return {
      featureKey: params.featureKey,
      allowed: false,
      reason: 'period_expired',
      plan,
      status,
      currentPeriodEnd: toIso(currentPeriodEnd),
      source: params.source,
    };
  }

  return {
    featureKey: params.featureKey,
    allowed: true,
    reason: 'granted',
    plan,
    status,
    currentPeriodEnd: toIso(currentPeriodEnd),
    source: params.source,
  };
}

export function getWorkspacePlanWeight(plan: WorkspacePlan) {
  return PLAN_WEIGHT[plan];
}
