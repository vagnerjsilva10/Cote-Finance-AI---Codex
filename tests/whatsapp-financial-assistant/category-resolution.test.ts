import test from 'node:test';
import assert from 'node:assert/strict';
import { matchCategoryCandidate } from '@/lib/finance-assistant/category-matcher';
import {
  buildShortCategoryName,
  normalizeCategoryKey,
  toCategoryDisplayName,
  MAX_CATEGORY_NAME_LENGTH,
} from '@/lib/finance-assistant/category-normalizer';

test('ifood reuses existing category from same family', () => {
  const result = matchCategoryCandidate({
    categoryHint: 'comprei 80 no ifood',
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

test('gasolina can reuse existing Transporte when category family already exists', () => {
  const result = matchCategoryCandidate({
    categoryHint: 'paguei 120 de gasolina',
    flowType: 'expense',
    candidates: [{ id: 'c2', name: 'Transporte' }],
  });

  assert.equal(result.candidate?.id, 'c2');
  assert.equal(result.reason, 'alias_match');
});

test('when no similar category exists, hint remains usable for short auto-create', () => {
  const result = matchCategoryCandidate({
    categoryHint: 'lancei 45 no servico de streaming premium',
    flowType: 'expense',
    candidates: [{ id: 'c9', name: 'Mercado' }],
  });

  const nextCategory = buildShortCategoryName({
    hint: result.canonicalHint || 'lancei 45 no servico de streaming premium',
    flowType: 'expense',
  });

  assert.equal(result.candidate, null);
  assert.equal(result.reason, 'no_match');
  assert.ok(nextCategory.length <= MAX_CATEGORY_NAME_LENGTH);
});

test('short category generator never returns a phrase-sized label', () => {
  const category = buildShortCategoryName({
    hint: 'coach finance gastei 50 no mercado registra pra mim por favor',
    flowType: 'expense',
  });

  assert.ok(category.length <= MAX_CATEGORY_NAME_LENGTH);
  assert.ok(!/coach finance gastei/i.test(category));
});

test('normalization avoids duplicate keys for plural and brand variants', () => {
  assert.equal(normalizeCategoryKey('iFood'), normalizeCategoryKey('ifood'));
  assert.equal(normalizeCategoryKey('Assinaturas'), normalizeCategoryKey('Assinatura'));
});

test('display name normalizer builds coherent labels', () => {
  assert.equal(toCategoryDisplayName('  energia eletrica  '), 'Energia Eletrica');
});
