import type { ParsedFinancialIntent } from '@/lib/ai/schemas/financial-intent.schema';

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function parseAmount(rawText: string) {
  const match = rawText.match(/(?:r\$\s*)?(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})|\d+(?:[.,]\d{1,2})?)/i);
  if (!match) return null;
  const token = match[1];
  const parsed = Number(token.includes(',') && token.includes('.') ? token.replace(/\./g, '').replace(',', '.') : token.replace(',', '.'));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function inferExpenseHint(text: string) {
  if (text.includes('ifood')) return 'Delivery';
  if (text.includes('gasolina') || text.includes('posto')) return 'Combustivel';
  if (text.includes('mercado') || text.includes('supermercado')) return 'Mercado';
  if (text.includes('uber') || text.includes('99')) return 'Transporte';
  if (text.includes('farmacia') || text.includes('remedio')) return 'Farmacia';
  return null;
}

function inferIncomeHint(text: string) {
  if (text.includes('pix')) return 'Pix';
  if (text.includes('cliente')) return 'Cliente';
  if (text.includes('comissao')) return 'Comissao';
  if (text.includes('salario')) return 'Salario';
  return null;
}

export function parseIntentHeuristically(messageText: string): ParsedFinancialIntent {
  const normalized = normalize(messageText);
  const amount = parseAmount(normalized);

  if (normalized.includes('responda por audio') || normalized === 'audio') {
    return {
      intent: 'set_reply_mode',
      confidence: 0.93,
      needsConfirmation: false,
      replyModeRequested: 'audio',
      rawUserUtterance: messageText,
      normalizedMeaning: 'alterar modo para audio',
      responseStyleHint: 'breve',
      transaction: null,
      goal: null,
      investment: null,
      debt: null,
      query: null,
    };
  }

  if (normalized.includes('texto e audio')) {
    return {
      intent: 'set_reply_mode',
      confidence: 0.93,
      needsConfirmation: false,
      replyModeRequested: 'both',
      rawUserUtterance: messageText,
      normalizedMeaning: 'alterar modo para texto e audio',
      responseStyleHint: 'breve',
      transaction: null,
      goal: null,
      investment: null,
      debt: null,
      query: null,
    };
  }

  if (normalized.includes('so texto') || normalized === 'texto') {
    return {
      intent: 'set_reply_mode',
      confidence: 0.92,
      needsConfirmation: false,
      replyModeRequested: 'text',
      rawUserUtterance: messageText,
      normalizedMeaning: 'alterar modo para texto',
      responseStyleHint: 'breve',
      transaction: null,
      goal: null,
      investment: null,
      debt: null,
      query: null,
    };
  }

  if (normalized.includes('gastei') || normalized.includes('paguei') || normalized.includes('comprei')) {
    const hint = inferExpenseHint(normalized);
    return {
      intent: 'create_expense',
      confidence: amount ? 0.84 : 0.48,
      needsConfirmation: !amount,
      replyModeRequested: 'unchanged',
      rawUserUtterance: messageText,
      normalizedMeaning: 'registrar saida',
      responseStyleHint: 'natural_curto',
      transaction: {
        amount,
        currency: 'BRL',
        description: null,
        merchant: null,
        categoryHint: hint,
        shortCategoryName: hint,
        shortDescription: null,
        walletHint: null,
        date: null,
        notes: null,
      },
      goal: null,
      investment: null,
      debt: null,
      query: null,
    };
  }

  if (normalized.includes('recebi') || normalized.includes('entrou') || normalized.includes('ganhei')) {
    const hint = inferIncomeHint(normalized);
    return {
      intent: 'create_income',
      confidence: amount ? 0.84 : 0.48,
      needsConfirmation: !amount,
      replyModeRequested: 'unchanged',
      rawUserUtterance: messageText,
      normalizedMeaning: 'registrar entrada',
      responseStyleHint: 'natural_curto',
      transaction: {
        amount,
        currency: 'BRL',
        description: null,
        merchant: null,
        categoryHint: hint,
        shortCategoryName: hint,
        shortDescription: null,
        walletHint: null,
        date: null,
        notes: null,
      },
      goal: null,
      investment: null,
      debt: null,
      query: null,
    };
  }

  if (normalized.includes('meta') && normalized.includes('crie')) {
    return {
      intent: 'create_goal',
      confidence: amount ? 0.82 : 0.45,
      needsConfirmation: !amount,
      replyModeRequested: 'unchanged',
      rawUserUtterance: messageText,
      normalizedMeaning: 'criar meta',
      responseStyleHint: 'natural_curto',
      transaction: null,
      goal: {
        name: messageText,
        targetAmount: amount,
        contributionAmount: null,
        deadlineHint: null,
      },
      investment: null,
      debt: null,
      query: null,
    };
  }

  if (normalized.includes('adicione') && normalized.includes('meta')) {
    return {
      intent: 'contribute_goal',
      confidence: amount ? 0.78 : 0.42,
      needsConfirmation: !amount,
      replyModeRequested: 'unchanged',
      rawUserUtterance: messageText,
      normalizedMeaning: 'adicionar valor em meta',
      responseStyleHint: 'natural_curto',
      transaction: null,
      goal: {
        name: messageText,
        targetAmount: null,
        contributionAmount: amount,
        deadlineHint: null,
      },
      investment: null,
      debt: null,
      query: null,
    };
  }

  if (normalized.includes('quanto eu gastei') || normalized.includes('quanto falta') || normalized.includes('qual meu total')) {
    return {
      intent: 'query_summary',
      confidence: 0.68,
      needsConfirmation: false,
      replyModeRequested: 'unchanged',
      rawUserUtterance: messageText,
      normalizedMeaning: 'consulta financeira',
      responseStyleHint: 'natural_curto',
      transaction: null,
      goal: null,
      investment: null,
      debt: null,
      query: {
        metric: normalized.includes('invest') ? 'investment_total' : normalized.includes('meta') ? 'goal_remaining' : 'category_spend_month',
        categoryHint: normalized.includes('gastei com') ? messageText : null,
        goalHint: normalized.includes('meta') ? messageText : null,
        periodHint: 'mes_atual',
      },
    };
  }

  if (/\binvesti\b/.test(normalized) || /\bapliquei\b/.test(normalized)) {
    return {
      intent: 'create_investment',
      confidence: amount ? 0.79 : 0.43,
      needsConfirmation: !amount,
      replyModeRequested: 'unchanged',
      rawUserUtterance: messageText,
      normalizedMeaning: 'registrar investimento',
      responseStyleHint: 'natural_curto',
      transaction: null,
      goal: null,
      investment: {
        name: messageText,
        amount,
        typeHint: null,
        institutionHint: null,
        expectedReturnAnnual: null,
      },
      debt: null,
      query: null,
    };
  }

  if (normalized.includes('divida')) {
    return {
      intent: 'create_debt',
      confidence: amount ? 0.76 : 0.4,
      needsConfirmation: !amount,
      replyModeRequested: 'unchanged',
      rawUserUtterance: messageText,
      normalizedMeaning: 'registrar divida',
      responseStyleHint: 'natural_curto',
      transaction: null,
      goal: null,
      investment: null,
      debt: {
        creditor: messageText,
        amount,
        dueDateHint: null,
        dueDay: null,
        categoryHint: null,
      },
      query: null,
    };
  }

  if (normalized.includes('fatura') && normalized.includes('paguei')) {
    return {
      intent: 'pay_debt',
      confidence: amount ? 0.77 : 0.41,
      needsConfirmation: !amount,
      replyModeRequested: 'unchanged',
      rawUserUtterance: messageText,
      normalizedMeaning: 'pagar divida',
      responseStyleHint: 'natural_curto',
      transaction: null,
      goal: null,
      investment: null,
      debt: {
        creditor: messageText,
        amount,
        dueDateHint: null,
        dueDay: null,
        categoryHint: null,
      },
      query: null,
    };
  }

  return {
    intent: 'unknown',
    confidence: 0.3,
    needsConfirmation: true,
    replyModeRequested: 'unchanged',
    rawUserUtterance: messageText,
    normalizedMeaning: null,
    responseStyleHint: null,
    transaction: null,
    goal: null,
    investment: null,
    debt: null,
    query: null,
  };
}
