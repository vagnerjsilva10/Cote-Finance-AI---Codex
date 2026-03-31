import test from 'node:test';
import assert from 'node:assert/strict';
import { matchCategoryCandidate } from '@/lib/finance-assistant/category-matcher';
import { normalizeCategoryKey, toCategoryDisplayName } from '@/lib/finance-assistant/category-normalizer';

test('ifood maps to existing Alimentacao category when available', () => {
  const result = matchCategoryCandidate({
    categoryHint: 'gastei 60 no iFood',
    flowType: 'expense',
    candidates: [
      { id: 'c1', name: 'Alimentacao' },
      { id: 'c2', name: 'Transporte' },
    ],
  });

  assert.equal(result.candidate?.id, 'c1');
  assert.equal(result.reason, 'alias_match');
  assert.ok(result.score >= 0.9);
});

test('gasolina maps to Transporte category', () => {
  const result = matchCategoryCandidate({
    categoryHint: 'paguei 120 de gasolina',
    flowType: 'expense',
    candidates: [{ id: 'c2', name: 'Transporte' }],
  });

  assert.equal(result.candidate?.id, 'c2');
  assert.equal(result.reason, 'alias_match');
});

test('no strong candidate yields no_match and keeps canonical hint for auto-create', () => {
  const result = matchCategoryCandidate({
    categoryHint: 'compra de livro tecnico',
    flowType: 'expense',
    candidates: [{ id: 'c9', name: 'Mercado' }],
  });

  assert.equal(result.candidate, null);
  assert.equal(result.reason, 'no_match');
});

test('normalization avoids duplicate keys for iFood variants', () => {
  assert.equal(normalizeCategoryKey('iFood'), normalizeCategoryKey('ifood'));
  assert.equal(normalizeCategoryKey('Assinaturas'), normalizeCategoryKey('Assinatura'));
});

test('display name normalizer builds coherent labels', () => {
  assert.equal(toCategoryDisplayName('  energia eletrica  '), 'Energia Eletrica');
});
