import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildFinancialAgentSummary,
  deriveFinancialIntentHeuristically,
  PREMIUM_ONLY_MESSAGE,
} from '@/lib/ai/financial-agent-helpers';

test('lancamento por linguagem natural vira createTransaction de despesa', () => {
  const parsed = deriveFinancialIntentHeuristically('Cote, gastei 60 reais no iFood');

  assert.equal(parsed.action, 'createTransaction');
  assert.equal(parsed.transactionType, 'EXPENSE');
  assert.equal(parsed.amount, 60);
  assert.equal(parsed.categoryHint, 'Delivery');
});

test('correcao de valor usa updateTransaction com contexto da ultima transacao', () => {
  const parsed = deriveFinancialIntentHeuristically('na verdade foram 75');

  assert.equal(parsed.action, 'updateTransaction');
  assert.equal(parsed.shouldUseLastTransaction, true);
  assert.equal(parsed.amount, 75);
});

test('comando de meta usa addGoalContribution', () => {
  const parsed = deriveFinancialIntentHeuristically('coloque 200 reais na meta de viagem');

  assert.equal(parsed.action, 'addGoalContribution');
  assert.equal(parsed.amount, 200);
});

test('respostas sao naturais e curtas para tools principais', () => {
  const response = buildFinancialAgentSummary({
    action: 'createTransaction',
    fallback: 'fallback',
    toolResult: {
      amount: 60,
      categoryName: 'Delivery',
    },
  });

  assert.match(response, /Registrei/i);
  assert.match(response, /Delivery/i);
  assert.match(response, /60/);
});

test('mensagem de bloqueio premium mantem texto oficial', () => {
  assert.equal(PREMIUM_ONLY_MESSAGE, 'Esse recurso está disponível apenas no plano Premium.');
});
