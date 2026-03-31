import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateFeatureAccessFromSnapshot } from '@/lib/billing/feature-access-evaluator';

test('free workspace is blocked from whatsapp financial assistant', () => {
  const result = evaluateFeatureAccessFromSnapshot({
    featureKey: 'whatsapp_financial_assistant',
    plan: 'FREE',
    status: 'ACTIVE',
    currentPeriodEnd: null,
    source: 'workspace_subscription',
  });

  assert.equal(result.allowed, false);
  assert.equal(result.reason, 'plan_not_allowed');
});

test('pro active workspace is allowed', () => {
  const result = evaluateFeatureAccessFromSnapshot({
    featureKey: 'whatsapp_financial_assistant',
    plan: 'PRO',
    status: 'ACTIVE',
    currentPeriodEnd: new Date(Date.now() + 24 * 60 * 60 * 1000),
    source: 'workspace_subscription',
  });

  assert.equal(result.allowed, true);
  assert.equal(result.reason, 'granted');
});

test('pro trialing workspace is allowed', () => {
  const result = evaluateFeatureAccessFromSnapshot({
    featureKey: 'whatsapp_financial_assistant',
    plan: 'PRO',
    status: 'TRIALING',
    currentPeriodEnd: new Date(Date.now() + 24 * 60 * 60 * 1000),
    source: 'workspace_subscription',
  });

  assert.equal(result.allowed, true);
  assert.equal(result.reason, 'granted');
});

test('canceled expired workspace is blocked', () => {
  const result = evaluateFeatureAccessFromSnapshot({
    featureKey: 'whatsapp_financial_assistant',
    plan: 'PRO',
    status: 'CANCELED',
    currentPeriodEnd: new Date(Date.now() - 10 * 60 * 1000),
    source: 'workspace_subscription',
  });

  assert.equal(result.allowed, false);
  assert.equal(result.reason, 'status_not_active');
});

test('past due workspace is blocked', () => {
  const result = evaluateFeatureAccessFromSnapshot({
    featureKey: 'whatsapp_financial_assistant',
    plan: 'PRO',
    status: 'PAST_DUE',
    currentPeriodEnd: new Date(Date.now() + 24 * 60 * 60 * 1000),
    source: 'workspace_subscription',
  });

  assert.equal(result.allowed, false);
  assert.equal(result.reason, 'status_not_active');
});

test('downgrade to free blocks feature automatically on next check', () => {
  const beforeDowngrade = evaluateFeatureAccessFromSnapshot({
    featureKey: 'whatsapp_financial_assistant',
    plan: 'PRO',
    status: 'ACTIVE',
    currentPeriodEnd: new Date(Date.now() + 24 * 60 * 60 * 1000),
    source: 'workspace_subscription',
  });

  const afterDowngrade = evaluateFeatureAccessFromSnapshot({
    featureKey: 'whatsapp_financial_assistant',
    plan: 'FREE',
    status: 'ACTIVE',
    currentPeriodEnd: null,
    source: 'workspace_subscription',
  });

  assert.equal(beforeDowngrade.allowed, true);
  assert.equal(afterDowngrade.allowed, false);
  assert.equal(afterDowngrade.reason, 'plan_not_allowed');
});
