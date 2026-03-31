import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldRequireConfirmation } from '@/lib/finance-assistant/confirmation-policy';

test('requires confirmation on low confidence', () => {
  const result = shouldRequireConfirmation({
    intent: 'create_expense',
    confidence: 0.4,
    needsConfirmation: false,
    replyModeRequested: 'unchanged',
    transaction: { amount: 60, currency: 'BRL', description: 'ifood' },
    goal: null,
    investment: null,
    debt: null,
    query: null,
  });

  assert.equal(result, true);
});

test('requires confirmation when amount is ambiguous in financial write intents', () => {
  const result = shouldRequireConfirmation({
    intent: 'create_income',
    confidence: 0.9,
    needsConfirmation: false,
    replyModeRequested: 'unchanged',
    transaction: { amount: null, currency: 'BRL', description: 'recebi do cliente' },
    goal: null,
    investment: null,
    debt: null,
    query: null,
  });

  assert.equal(result, true);
});

test('does not require confirmation on high confidence query', () => {
  const result = shouldRequireConfirmation({
    intent: 'query_summary',
    confidence: 0.87,
    needsConfirmation: false,
    replyModeRequested: 'unchanged',
    transaction: null,
    goal: null,
    investment: null,
    debt: null,
    query: { metric: 'monthly_summary' },
  });

  assert.equal(result, false);
});
