import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateFeatureAccessFromSnapshot } from '@/lib/billing/feature-access-evaluator';

test('free bloqueado no premium financial conversational assistant', () => {
  const result = evaluateFeatureAccessFromSnapshot({
    featureKey: 'premium_financial_conversational_assistant',
    plan: 'FREE',
    status: 'ACTIVE',
    currentPeriodEnd: null,
    source: 'workspace_subscription',
  });

  assert.equal(result.allowed, false);
  assert.equal(result.reason, 'plan_not_allowed');
});

test('pro bloqueado no premium financial conversational assistant', () => {
  const result = evaluateFeatureAccessFromSnapshot({
    featureKey: 'premium_financial_conversational_assistant',
    plan: 'PRO',
    status: 'ACTIVE',
    currentPeriodEnd: new Date(Date.now() + 24 * 60 * 60 * 1000),
    source: 'workspace_subscription',
  });

  assert.equal(result.allowed, false);
  assert.equal(result.reason, 'plan_not_allowed');
});

test('premium ativo liberado no premium financial conversational assistant', () => {
  const result = evaluateFeatureAccessFromSnapshot({
    featureKey: 'premium_financial_conversational_assistant',
    plan: 'PREMIUM',
    status: 'ACTIVE',
    currentPeriodEnd: new Date(Date.now() + 24 * 60 * 60 * 1000),
    source: 'workspace_subscription',
  });

  assert.equal(result.allowed, true);
  assert.equal(result.reason, 'granted');
});
