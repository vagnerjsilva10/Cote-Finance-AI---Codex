import test from 'node:test';
import assert from 'node:assert/strict';
import { parseIntentHeuristically } from '@/lib/finance-assistant/heuristic-intent';

test('parses create_expense intent', () => {
  const result = parseIntentHeuristically('gastei 60 no ifood');
  assert.equal(result.intent, 'create_expense');
  assert.equal(result.transaction?.amount, 60);
});

test('parses create_income intent', () => {
  const result = parseIntentHeuristically('recebi 2300 do cliente Joao');
  assert.equal(result.intent, 'create_income');
  assert.equal(result.transaction?.amount, 2300);
});

test('parses create_goal intent', () => {
  const result = parseIntentHeuristically('crie uma meta de 5000 para viagem');
  assert.equal(result.intent, 'create_goal');
  assert.equal(result.goal?.targetAmount, 5000);
});

test('parses create_investment intent', () => {
  const result = parseIntentHeuristically('investi 500 no tesouro selic');
  assert.equal(result.intent, 'create_investment');
  assert.equal(result.investment?.amount, 500);
});

test('parses create_debt intent', () => {
  const result = parseIntentHeuristically('adicione uma divida de 1200 no Nubank');
  assert.equal(result.intent, 'create_debt');
  assert.equal(result.debt?.amount, 1200);
});

test('parses query_summary intent', () => {
  const result = parseIntentHeuristically('qual meu total em investimentos?');
  assert.equal(result.intent, 'query_summary');
  assert.equal(result.query?.metric, 'investment_total');
});

test('parses set_reply_mode intent', () => {
  const result = parseIntentHeuristically('texto e audio');
  assert.equal(result.intent, 'set_reply_mode');
  assert.equal(result.replyModeRequested, 'both');
});
