export type FinancialAgentAction =
  | 'createTransaction'
  | 'updateTransaction'
  | 'deleteTransaction'
  | 'addGoalContribution'
  | 'createGoal'
  | 'addInvestment'
  | 'registerDebtPayment'
  | 'createCategory'
  | 'unknown';

export type FinancialAgentHeuristicIntent = {
  action: FinancialAgentAction;
  confidence: number;
  amount: number | null;
  transactionType: 'INCOME' | 'EXPENSE' | null;
  categoryHint: string | null;
  description: string | null;
  merchant: string | null;
  goalName: string | null;
  targetAmount: number | null;
  investmentName: string | null;
  investmentType: string | null;
  institution: string | null;
  debtCreditor: string | null;
  transactionId: string | null;
  shouldUseLastTransaction: boolean;
  isFinancial: boolean;
};

export const PREMIUM_ONLY_MESSAGE = 'Esse recurso está disponível apenas no plano Premium.';

function normalize(text: string) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function parseAmount(value: string) {
  const match = value.match(/(?:r\$\s*)?(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})|\d+(?:[.,]\d{1,2})?)/i);
  if (!match) return null;
  const token = match[1];
  const parsed = Number(
    token.includes(',') && token.includes('.')
      ? token.replace(/\./g, '').replace(',', '.')
      : token.replace(',', '.')
  );
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function sanitizeShortText(value: string | null | undefined, maxLength = 80) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (!text) return null;
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim();
}

function inferCategoryHintFromText(text: string) {
  const normalized = normalize(text);
  if (normalized.includes('ifood') || normalized.includes('delivery')) return 'Delivery';
  if (normalized.includes('mercado') || normalized.includes('supermercado')) return 'Mercado';
  if (normalized.includes('uber') || normalized.includes('99') || normalized.includes('transporte')) return 'Transporte';
  if (normalized.includes('gasolina') || normalized.includes('posto')) return 'Combustivel';
  if (normalized.includes('farmacia')) return 'Farmacia';
  return null;
}

function extractGoalNameHint(text: string) {
  const normalized = normalize(text);
  const match = normalized.match(/meta\s+de\s+(.+)$/i) || normalized.match(/meta\s+(.+)$/i);
  if (!match?.[1]) return null;
  const value = match[1]
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ');
  return sanitizeShortText(value, 40);
}

export function deriveFinancialIntentHeuristically(text: string): FinancialAgentHeuristicIntent {
  const normalized = normalize(text);
  const amount = parseAmount(normalized);
  const categoryHint = inferCategoryHintFromText(normalized);
  const goalName = extractGoalNameHint(text);
  const containsFinancialWord =
    /(gastei|paguei|comprei|recebi|ganhei|meta|investi|aporte|divida|dívida|categoria|lancamento|lançamento|corrigir|na verdade|deleta|apaga|remove)/i.test(
      normalized
    );

  if (/(na verdade|corrig|ajusta|atualiza)/i.test(normalized) && amount) {
    return {
      action: 'updateTransaction',
      confidence: 0.84,
      amount,
      transactionType: null,
      categoryHint,
      description: null,
      merchant: null,
      goalName: null,
      targetAmount: null,
      investmentName: null,
      investmentType: null,
      institution: null,
      debtCreditor: null,
      transactionId: null,
      shouldUseLastTransaction: true,
      isFinancial: true,
    };
  }

  if (/(deleta|apaga|remove|exclui).*(lancamento|lançamento|transacao|transação)/i.test(normalized)) {
    return {
      action: 'deleteTransaction',
      confidence: 0.82,
      amount: null,
      transactionType: null,
      categoryHint: null,
      description: null,
      merchant: null,
      goalName: null,
      targetAmount: null,
      investmentName: null,
      investmentType: null,
      institution: null,
      debtCreditor: null,
      transactionId: null,
      shouldUseLastTransaction: true,
      isFinancial: true,
    };
  }

  if (/(coloque|adicione|adiciona|aporte).*(meta)/i.test(normalized) && amount) {
    return {
      action: 'addGoalContribution',
      confidence: 0.9,
      amount,
      transactionType: null,
      categoryHint: null,
      description: null,
      merchant: null,
      goalName,
      targetAmount: null,
      investmentName: null,
      investmentType: null,
      institution: null,
      debtCreditor: null,
      transactionId: null,
      shouldUseLastTransaction: false,
      isFinancial: true,
    };
  }

  if (/(crie|criar|nova).*(meta)/i.test(normalized) && amount) {
    return {
      action: 'createGoal',
      confidence: 0.89,
      amount: null,
      transactionType: null,
      categoryHint: null,
      description: null,
      merchant: null,
      goalName,
      targetAmount: amount,
      investmentName: null,
      investmentType: null,
      institution: null,
      debtCreditor: null,
      transactionId: null,
      shouldUseLastTransaction: false,
      isFinancial: true,
    };
  }

  if (/(investi|apliquei|aportei)/i.test(normalized) && amount) {
    return {
      action: 'addInvestment',
      confidence: 0.87,
      amount,
      transactionType: null,
      categoryHint: null,
      description: null,
      merchant: null,
      goalName: null,
      targetAmount: null,
      investmentName: sanitizeShortText(text, 48),
      investmentType: null,
      institution: null,
      debtCreditor: null,
      transactionId: null,
      shouldUseLastTransaction: false,
      isFinancial: true,
    };
  }

  if (/(paguei|quitei).*(divida|dívida|fatura)/i.test(normalized) && amount) {
    return {
      action: 'registerDebtPayment',
      confidence: 0.84,
      amount,
      transactionType: null,
      categoryHint: null,
      description: null,
      merchant: null,
      goalName: null,
      targetAmount: null,
      investmentName: null,
      investmentType: null,
      institution: null,
      debtCreditor: sanitizeShortText(text, 48),
      transactionId: null,
      shouldUseLastTransaction: false,
      isFinancial: true,
    };
  }

  if (/(cria|criar).*(categoria)/i.test(normalized)) {
    return {
      action: 'createCategory',
      confidence: 0.78,
      amount: null,
      transactionType: null,
      categoryHint: sanitizeShortText(text, 28),
      description: null,
      merchant: null,
      goalName: null,
      targetAmount: null,
      investmentName: null,
      investmentType: null,
      institution: null,
      debtCreditor: null,
      transactionId: null,
      shouldUseLastTransaction: false,
      isFinancial: true,
    };
  }

  if (/(gastei|paguei|comprei|despesa|saida|saída)/i.test(normalized) && amount) {
    return {
      action: 'createTransaction',
      confidence: 0.92,
      amount,
      transactionType: 'EXPENSE',
      categoryHint,
      description: sanitizeShortText(text, 64),
      merchant: sanitizeShortText(text, 32),
      goalName: null,
      targetAmount: null,
      investmentName: null,
      investmentType: null,
      institution: null,
      debtCreditor: null,
      transactionId: null,
      shouldUseLastTransaction: false,
      isFinancial: true,
    };
  }

  if (/(recebi|ganhei|entrada)/i.test(normalized) && amount) {
    return {
      action: 'createTransaction',
      confidence: 0.9,
      amount,
      transactionType: 'INCOME',
      categoryHint: categoryHint || 'Recebimento',
      description: sanitizeShortText(text, 64),
      merchant: sanitizeShortText(text, 32),
      goalName: null,
      targetAmount: null,
      investmentName: null,
      investmentType: null,
      institution: null,
      debtCreditor: null,
      transactionId: null,
      shouldUseLastTransaction: false,
      isFinancial: true,
    };
  }

  return {
    action: 'unknown',
    confidence: containsFinancialWord ? 0.45 : 0.2,
    amount,
    transactionType: null,
    categoryHint,
    description: null,
    merchant: null,
    goalName,
    targetAmount: null,
    investmentName: null,
    investmentType: null,
    institution: null,
    debtCreditor: null,
    transactionId: null,
    shouldUseLastTransaction: false,
    isFinancial: containsFinancialWord,
  };
}

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export function buildFinancialAgentSummary(params: {
  action: FinancialAgentAction;
  toolResult: Record<string, unknown> | null;
  fallback: string;
}) {
  if (!params.toolResult) return params.fallback;
  const result = params.toolResult;

  if (params.action === 'createTransaction') {
    const amount = Number(result.amount || 0);
    const categoryName = String(result.categoryName || 'Outros').trim();
    return `Pronto! Registrei ${formatCurrency(amount)} em ${categoryName}.`;
  }

  if (params.action === 'updateTransaction') {
    const amount = Number(result.updatedAmount || result.amount || 0);
    return `Atualizei para ${formatCurrency(amount)}.`;
  }

  if (params.action === 'deleteTransaction') {
    return 'Removi o lançamento anterior.';
  }

  if (params.action === 'addGoalContribution') {
    const amount = Number(result.contributedAmount || 0);
    const goalName = String(result.goalName || 'sua meta').trim();
    return `Adicionei ${formatCurrency(amount)} à meta ${goalName}.`;
  }

  if (params.action === 'createGoal') {
    const goalName = String(result.goalName || 'Nova meta').trim();
    const targetAmount = Number(result.targetAmount || 0);
    return `Meta ${goalName} criada com alvo de ${formatCurrency(targetAmount)}.`;
  }

  if (params.action === 'addInvestment') {
    const amount = Number(result.amount || 0);
    const name = String(result.name || 'investimento').trim();
    return `Registrei ${formatCurrency(amount)} no investimento ${name}.`;
  }

  if (params.action === 'registerDebtPayment') {
    const amount = Number(result.paidAmount || 0);
    const creditor = String(result.creditor || 'dívida').trim();
    return `Pagamento de ${formatCurrency(amount)} registrado para ${creditor}.`;
  }

  if (params.action === 'createCategory') {
    const categoryName = String(result.categoryName || 'Outros').trim();
    return `Categoria ${categoryName} pronta para uso.`;
  }

  return params.fallback;
}

export function isLikelyFinancialCommand(text: string) {
  return deriveFinancialIntentHeuristically(text).isFinancial;
}
