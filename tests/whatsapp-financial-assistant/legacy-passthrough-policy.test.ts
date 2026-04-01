import test from 'node:test';
import assert from 'node:assert/strict';

import type { ParsedFinancialIntent } from '@/lib/ai/schemas/financial-intent.schema';
import { decideLegacyPassthrough } from '@/lib/finance-assistant/legacy-passthrough-policy';

function makeUnknownIntent(): ParsedFinancialIntent {
  return {
    intent: 'unknown',
    confidence: 0.2,
    needsConfirmation: true,
    replyModeRequested: 'unchanged',
    rawUserUtterance: null,
    normalizedMeaning: null,
    responseStyleHint: null,
    transaction: null,
    goal: null,
    investment: null,
    debt: null,
    query: null,
  };
}

test('mensagem financeira com intent desconhecida nao deve ir para legado', () => {
  const decision = decideLegacyPassthrough({
    messageKind: 'text',
    rawText: 'gastei 10 no mercado ontem',
    previewIntent: makeUnknownIntent(),
  });

  assert.equal(decision.shouldPassthrough, false);
  assert.equal(decision.reason, 'financial_signal_detected');
  assert.equal(decision.isLikelyFinancial, true);
});

test('mensagem nao financeira desconhecida pode ir para legado', () => {
  const decision = decideLegacyPassthrough({
    messageKind: 'text',
    rawText: 'bom dia, tudo certo ai?',
    previewIntent: makeUnknownIntent(),
  });

  assert.equal(decision.shouldPassthrough, true);
  assert.equal(decision.reason, 'non_financial_unknown');
  assert.equal(decision.isLikelyFinancial, false);
});

test('quando intent preliminar e conhecida, nao permite passthrough', () => {
  const decision = decideLegacyPassthrough({
    messageKind: 'text',
    rawText: 'texto qualquer',
    previewIntent: {
      ...makeUnknownIntent(),
      intent: 'create_expense',
      needsConfirmation: false,
      confidence: 0.8,
    },
  });

  assert.equal(decision.shouldPassthrough, false);
  assert.equal(decision.reason, 'known_intent');
  assert.equal(decision.isLikelyFinancial, true);
});
