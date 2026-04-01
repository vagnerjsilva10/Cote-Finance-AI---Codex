import test from 'node:test';
import assert from 'node:assert/strict';
import { generateTransactionDescription, ABSOLUTE_DESCRIPTION_MAX_LENGTH } from '@/lib/finance-assistant/generate-transaction-description';
import { generateWhatsAppConfirmationMessage } from '@/lib/finance-assistant/generate-whatsapp-confirmation-message';
import { buildShortCategoryName, MAX_CATEGORY_NAME_LENGTH } from '@/lib/finance-assistant/category-normalizer';

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

test('ganhei 800 no pix -> descricao limpa e resposta natural', () => {
  const description = generateTransactionDescription({
    intent: 'create_income',
    categoryName: 'Pix',
    categoryHint: 'pix',
    rawUtterance: 'Ganhei 800 no Pix.',
  });
  const response = generateWhatsAppConfirmationMessage({
    intent: 'create_income',
    amount: 800,
    categoryName: 'Pix',
    seed: 'm1',
  });

  assert.equal(description, 'Recebimento no Pix');
  assert.match(response, /pix/i);
  assert.match(response, /800/);
});

test('gastei 50 no mercado -> categoria e descricao premium', () => {
  const category = buildShortCategoryName({
    hint: 'gastei 50 no mercado',
    flowType: 'expense',
  });
  const description = generateTransactionDescription({
    intent: 'create_expense',
    categoryName: category,
    categoryHint: 'mercado',
    rawUtterance: 'gastei 50 no mercado',
  });

  assert.equal(category, 'Mercado');
  assert.equal(description, 'Despesa no mercado');
});

test('paguei 120 de gasolina -> descricao Abastecimento', () => {
  const description = generateTransactionDescription({
    intent: 'create_expense',
    categoryName: 'Combustivel',
    categoryHint: 'gasolina',
    rawUtterance: 'paguei 120 de gasolina',
  });

  assert.equal(description, 'Abastecimento');
});

test('comprei 80 no ifood -> categoria Delivery e descricao curta', () => {
  const category = buildShortCategoryName({
    hint: 'comprei 80 no ifood',
    flowType: 'expense',
  });
  const description = generateTransactionDescription({
    intent: 'create_expense',
    categoryName: category,
    categoryHint: 'ifood',
    merchant: 'ifood',
    rawUtterance: 'comprei 80 no ifood',
  });

  assert.equal(category, 'Delivery');
  assert.equal(description, 'Compra no iFood');
});

test('categoria nunca vira frase longa', () => {
  const category = buildShortCategoryName({
    hint: 'coach finance gastei 50 no mercado registra pra mim por gentileza',
    flowType: 'expense',
  });

  assert.ok(category.length <= MAX_CATEGORY_NAME_LENGTH);
  assert.ok(!/coach finance/i.test(category));
});

test('descricao nunca ultrapassa limite maximo', () => {
  const description = generateTransactionDescription({
    intent: 'create_income',
    categoryName: 'Cliente',
    categoryHint: 'cliente',
    modelShortDescription: 'Recebimento do cliente muito importante com observacao extensa que deve ser reduzida',
    rawUtterance: 'recebi 2300 do cliente Joao',
  });

  assert.ok(description.length <= ABSOLUTE_DESCRIPTION_MAX_LENGTH);
});

test('resposta nao replica transcricao literal', () => {
  const utterance = 'coach finance gastei 50 no mercado registra pra mim';
  const response = generateWhatsAppConfirmationMessage({
    intent: 'create_expense',
    amount: 50,
    categoryName: 'Mercado',
    seed: 'm2',
  });

  assert.notEqual(normalize(response), normalize(utterance));
  assert.ok(!normalize(response).includes(normalize(utterance)));
});

test('fallback de descricao curta e fraca e substituido por template melhor', () => {
  const description = generateTransactionDescription({
    intent: 'create_expense',
    categoryName: 'Mercado',
    categoryHint: 'mercado',
    modelShortDescription: 'mercado',
    rawUtterance: 'gastei 60 reais no mercado',
  });

  assert.equal(description, 'Despesa no mercado');
});

test('resposta usa emoji discreto no inicio', () => {
  const response = generateWhatsAppConfirmationMessage({
    intent: 'create_expense',
    amount: 60,
    categoryName: 'Mercado',
    seed: 'emoji-expense',
  });

  assert.match(response, /^[✅💸💰📈🎯🏦]/);
});
