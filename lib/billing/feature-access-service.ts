import 'server-only';

import { prisma } from '@/lib/prisma';
import {
  ENTITLED_STATUSES,
  evaluateFeatureAccessFromSnapshot,
  getWorkspacePlanWeight,
  normalizePlan,
  normalizeStatus,
  type FeatureAccessResult,
  type FeatureKey,
  type WorkspacePlan,
} from '@/lib/billing/feature-access-evaluator';

export type { FeatureAccessResult, FeatureKey, WorkspacePlan };
export { evaluateFeatureAccessFromSnapshot };

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

    if (!best || getWorkspacePlanWeight(snapshot.plan) > getWorkspacePlanWeight(best.plan)) {
      best = snapshot;
      continue;
    }

    if (
      best &&
      getWorkspacePlanWeight(snapshot.plan) === getWorkspacePlanWeight(best.plan) &&
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

