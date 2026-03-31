import 'server-only';

import { prisma } from '@/lib/prisma';
import { normalizeBillingPlan } from '@/lib/server/billing-status';

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

function normalizePlan(value: string | null | undefined): WorkspacePlan {
  return normalizeBillingPlan(value);
}

function normalizeStatus(value: string | null | undefined) {
  const normalized = String(value || '').trim().toUpperCase();
  return normalized || null;
}

const ENTITLED_STATUSES = new Set(['ACTIVE', 'TRIALING']);

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

type WorkspaceBillingSnapshot = {
  plan: WorkspacePlan;
  status: string | null;
  currentPeriodEnd: Date | null;
  source: FeatureAccessResult['source'];
};

async function readWorkspaceSubscriptionSnapshot(workspaceId: string): Promise<WorkspaceBillingSnapshot | null> {
  const workspaceSubscription = await prisma.workspaceSubscription.findUnique({
    where: { workspace_id: workspaceId },
    select: {
      plan: true,
      status: true,
      current_period_end: true,
    },
  });

  if (!workspaceSubscription) return null;

  return {
    plan: normalizePlan(workspaceSubscription.plan),
    status: normalizeStatus(workspaceSubscription.status),
    currentPeriodEnd: workspaceSubscription.current_period_end ?? null,
    source: 'workspace_subscription',
  };
}

async function readWorkspaceEntitlementFallbackSnapshot(workspaceId: string): Promise<WorkspaceBillingSnapshot | null> {
  const memberships = await prisma.workspaceMember.findMany({
    where: {
      workspace_id: workspaceId,
      role: {
        in: ['OWNER', 'ADMIN'],
      },
    },
    select: {
      user: {
        select: {
          subscription: {
            select: {
              plan: true,
              status: true,
              current_period_end: true,
            },
          },
        },
      },
    },
  });

  let best: WorkspaceBillingSnapshot | null = null;

  for (const membership of memberships) {
    const entitlement = membership.user?.subscription;
    if (!entitlement) continue;

    const snapshot: WorkspaceBillingSnapshot = {
      plan: normalizePlan(entitlement.plan),
      status: normalizeStatus(entitlement.status),
      currentPeriodEnd: entitlement.current_period_end ?? null,
      source: 'subscription_entitlement',
    };

    if (!best || PLAN_WEIGHT[snapshot.plan] > PLAN_WEIGHT[best.plan]) {
      best = snapshot;
      continue;
    }

    if (
      best &&
      PLAN_WEIGHT[snapshot.plan] === PLAN_WEIGHT[best.plan] &&
      snapshot.status &&
      ENTITLED_STATUSES.has(snapshot.status) &&
      (!best.status || !ENTITLED_STATUSES.has(best.status))
    ) {
      best = snapshot;
    }
  }

  return best;
}

export async function getWorkspaceFeatureAccess(params: {
  workspaceId: string;
  featureKey: FeatureKey;
  now?: Date;
}): Promise<FeatureAccessResult> {
  const workspaceSubscription = await readWorkspaceSubscriptionSnapshot(params.workspaceId);
  if (workspaceSubscription) {
    return evaluateFeatureAccessFromSnapshot({
      featureKey: params.featureKey,
      plan: workspaceSubscription.plan,
      status: workspaceSubscription.status,
      currentPeriodEnd: workspaceSubscription.currentPeriodEnd,
      source: workspaceSubscription.source,
      now: params.now,
    });
  }

  const entitlementFallback = await readWorkspaceEntitlementFallbackSnapshot(params.workspaceId);
  if (entitlementFallback) {
    return evaluateFeatureAccessFromSnapshot({
      featureKey: params.featureKey,
      plan: entitlementFallback.plan,
      status: entitlementFallback.status,
      currentPeriodEnd: entitlementFallback.currentPeriodEnd,
      source: entitlementFallback.source,
      now: params.now,
    });
  }

  return {
    featureKey: params.featureKey,
    allowed: false,
    reason: 'missing_subscription',
    plan: 'FREE',
    status: null,
    currentPeriodEnd: null,
    source: 'none',
  };
}

export async function assertWorkspaceFeatureAccess(params: {
  workspaceId: string;
  featureKey: FeatureKey;
  now?: Date;
}) {
  const result = await getWorkspaceFeatureAccess(params);
  if (!result.allowed) {
    throw new Error(
      `Feature access denied (${result.featureKey}): reason=${result.reason} plan=${result.plan} status=${result.status || 'null'}`
    );
  }
  return result;
}
