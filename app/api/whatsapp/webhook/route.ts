import { NextResponse } from 'next/server';
import { Type } from '@google/genai';
import { getGeminiClient, GEMINI_KEY_MISSING_ERROR } from '@/lib/gemini';
import { prisma } from '@/lib/prisma';
import { getWorkspaceFeatureAccess } from '@/lib/billing/feature-access-service';
import {
  getWhatsAppConfig,
  getWhatsAppVerifyToken,
  normalizeWhatsappPhone,
  sendWhatsAppTextMessage,
  verifyWhatsAppSignature,
  WHATSAPP_CONFIG_MISSING_ERROR,
  WHATSAPP_VERIFY_TOKEN_MISSING_ERROR,
} from '@/lib/whatsapp';
import { hasWhatsAppCapabilityForSubscription } from '@/lib/server/whatsapp-capabilities';
import { getWorkspaceWhatsAppConfig, saveWorkspaceWhatsAppConfig } from '@/lib/server/whatsapp-config';
import { logWhatsAppOperationalEvent } from '@/lib/server/whatsapp-observability';
import { logWorkspaceEventSafe } from '@/lib/server/multi-tenant';
import { normalizeIncomingWhatsAppMessages } from '@/lib/whatsapp/normalize-incoming-message';
import { orchestrateWhatsAppFinancialMessage } from '@/lib/finance-assistant/orchestrate-whatsapp-financial-message';
import { parseIntentHeuristically } from '@/lib/finance-assistant/heuristic-intent';
import { decideLegacyPassthrough } from '@/lib/finance-assistant/legacy-passthrough-policy';
import { warnIfTtsEnvMissingAtStartup } from '@/lib/config/env';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type TransactionType = 'INCOME' | 'EXPENSE';
type PaymentMethod = 'PIX' | 'CARD' | 'CASH' | 'BANK_TRANSFER' | 'BOLETO' | 'OTHER';

type IncomingTextMessage = {
  id: string;
  from: string;
  body: string;
};

type IncomingMessageStatus = {
  id: string;
  status: string;
  recipientId: string;
  timestamp: string | null;
  errors: Array<{
    code: number | null;
    title: string | null;
    message: string | null;
    details: string | null;
  }>;
};

type ParsedFinancialCommand = {
  type: TransactionType;
  paymentMethod: PaymentMethod;
  amount: number;
  description: string;
  category: string;
};

type GeminiTransactionExtraction = ParsedFinancialCommand & {
  matched: boolean;
};

type WhatsAppAiIntent =
  | { type: 'monthly_summary' }
  | { type: 'top_spending' }
  | { type: 'category_spend'; categoryHint: string }
  | { type: 'month_income' }
  | { type: 'top_categories' }
  | { type: 'goal_status' }
  | { type: 'upcoming_dues' };

type WhatsAppActionIntent =
  | { type: 'create_goal'; name: string; targetAmount: number }
  | { type: 'mark_debt_paid'; creditorHint: string }
  | { type: 'undo_last_transaction' }
  | { type: 'edit_last_transaction'; commandText: string }
  | { type: 'list_recent_transactions' }
  | { type: 'remove_recent_transaction'; index: number };

const DELIVERY_SUCCESS_STATUSES = new Set(['delivered', 'read']);
const DELIVERY_FAILURE_STATUSES = new Set(['failed', 'undelivered']);

const DEFAULT_HELP_MESSAGE =
  'Formato inválido. Envie, por exemplo: "gastei 50 mercado", "recebi 200 pix" ou "ajuda".';

const HELP_MESSAGE = [
  'Comandos do Cote Finance AI no WhatsApp:',
  '- gastei 50 mercado',
  '- paguei 120 aluguel',
  '- recebi 1500 pix',
  '- ganhei 300 freelance',
  '- criar meta viagem 5000',
  '- quitar dívida nubank',
  '- desfazer ultimo lancamento',
  '- editar ultimo 89 mercado',
  '- ultimos lancamentos',
  '- remover lancamento 2',
  '- confirmar',
  '- cancelar',
  '- saldo',
  '- resuma meu mês',
  '- onde estou gastando mais',
  '- quanto gastei com mercado este mês',
  '- quanto recebi este mês',
  '- quais categorias mais pesaram',
  '- como está minha meta',
  '- quais contas vencem primeiro',
  '- ajuda',
].join('\n');

const WHATSAPP_PRO_FEATURE_BLOCK_MESSAGE =
  'Essa automacao inteligente via WhatsApp faz parte do plano Pro do Cote Finance AI. Quando quiser, posso te orientar a ativar o Pro para lancar saidas, metas, dividas e investimentos por mensagem.';

const EXPENSE_KEYWORDS = ['gastei', 'paguei', 'saida', 'saída', 'despesa', 'comprei', 'debito', 'conta'];
const INCOME_KEYWORDS = ['recebi', 'ganhei', 'entrada', 'receita', 'salario', 'faturei', 'credito'];
const PIX_IN_KEYWORDS = ['pix in', 'pixin', 'recebi pix'];
const PIX_OUT_KEYWORDS = ['pix out', 'pixout', 'enviei pix', 'paguei pix'];
const HELP_KEYWORDS = ['ajuda', 'help', 'menu', 'comandos', 'exemplos'];
const BALANCE_KEYWORDS = ['saldo', 'meu saldo', 'resumo', 'quanto tenho'];
const SUMMARY_KEYWORDS = ['resuma meu mes', 'como foi meu mes'];
const TOP_SPENDING_KEYWORDS = ['onde estou gastando mais', 'maior gasto do mes'];
const MONTH_INCOME_KEYWORDS = ['quanto recebi este mes', 'quanto entrou este mes', 'minhas entradas este mes'];
const TOP_CATEGORIES_KEYWORDS = ['quais categorias mais pesaram', 'categorias com mais gasto', 'top categorias'];
const GOAL_STATUS_KEYWORDS = ['como esta minha meta', 'como esta minha meta principal', 'como estao minhas metas'];
const UPCOMING_DUES_KEYWORDS = ['quais contas vencem primeiro', 'o que vence primeiro', 'proximos vencimentos'];

const toAsciiLower = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const containsKeyword = (text: string, keywords: string[]) =>
  keywords.some((keyword) => text.includes(keyword));

const formatCurrency = (value: number) =>
  value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

const truncateText = (value: string, maxLength: number) => {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
};

const LOW_SIGNAL_DESCRIPTION_TOKENS = [
  'pix',
  'debito',
  'credito',
  'cartao',
  'cartão',
  'dinheiro',
  'boleto',
  'transferencia',
  'transferência',
];

function parseAmountFromText(text: string) {
  const sanitized = text.replace(/\s+/g, ' ');
  const match = sanitized.match(/(?:r\$\s*)?(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})|\d+(?:[.,]\d{1,2})?)/i);
  if (!match) return null;

  const raw = match[1];
  const amount = Number(
    raw.includes(',') && raw.includes('.')
      ? raw.replace(/\./g, '').replace(',', '.')
      : raw.replace(',', '.')
  );

  if (!Number.isFinite(amount) || amount <= 0) return null;

  return { amount, rawAmount: raw };
}

function inferCategory(type: TransactionType, description: string) {
  const text = toAsciiLower(description);

  if (text.includes('pix')) return 'PIX';
  if (text.includes('mercado') || text.includes('aliment') || text.includes('restaurante')) return 'Alimentação';
  if (text.includes('uber') || text.includes('transporte') || text.includes('onibus') || text.includes('gasolina')) {
    return 'Transporte';
  }
  if (text.includes('saude') || text.includes('farmacia') || text.includes('medico')) return 'Saúde';
  if (text.includes('educa') || text.includes('curso') || text.includes('faculdade')) return 'Educação';
  if (text.includes('lazer') || text.includes('cinema') || text.includes('show') || text.includes('bar')) return 'Lazer';
  if (
    text.includes('moradia') ||
    text.includes('aluguel') ||
    text.includes('condominio') ||
    text.includes('internet') ||
    text.includes('luz') ||
    text.includes('agua')
  ) {
    return 'Moradia';
  }
  if (text.includes('freela') || text.includes('freelance')) return 'Freelance';
  if (text.includes('invest') || text.includes('tesouro') || text.includes('cdb') || text.includes('acoes') || text.includes('fundo') || text.includes('cripto')) {
    return 'Investimentos';
  }
  if (type === 'INCOME') return 'Salário';

  return 'Outros';
}

function inferPaymentMethod(text: string): PaymentMethod {
  if (text.includes('pix')) return 'PIX';
  if (text.includes('cartao') || text.includes('credito')) return 'CARD';
  if (text.includes('debito')) return 'CARD';
  if (text.includes('boleto')) return 'BOLETO';
  if (text.includes('transferencia') || text.includes('ted')) return 'BANK_TRANSFER';
  if (text.includes('dinheiro') || text.includes('especie')) return 'CASH';
  return 'OTHER';
}

function parseFinancialCommand(rawText: string): ParsedFinancialCommand | null {
  const normalizedText = toAsciiLower(rawText);
  const amountData = parseAmountFromText(normalizedText);
  if (!amountData) return null;

  let type: TransactionType = 'EXPENSE';
  let paymentMethod: PaymentMethod = inferPaymentMethod(normalizedText);

  if (containsKeyword(normalizedText, PIX_OUT_KEYWORDS)) {
    type = 'EXPENSE';
    paymentMethod = 'PIX';
  } else if (containsKeyword(normalizedText, PIX_IN_KEYWORDS)) {
    type = 'INCOME';
    paymentMethod = 'PIX';
  } else if (containsKeyword(normalizedText, INCOME_KEYWORDS)) {
    type = 'INCOME';
  } else if (containsKeyword(normalizedText, EXPENSE_KEYWORDS)) {
    type = 'EXPENSE';
  } else if (normalizedText.includes('pix')) {
    type = normalizedText.includes('recebi') ? 'INCOME' : 'EXPENSE';
    paymentMethod = 'PIX';
  }

  const tokens = normalizedText.split(/\s+/);
  const amountTokenIndex = tokens.findIndex((token) => token.includes(amountData.rawAmount));
  const descriptionTokens = amountTokenIndex >= 0 ? tokens.slice(amountTokenIndex + 1) : [];
  const description = descriptionTokens.join(' ').replace(/^(de|do|da|no|na|em|para)\s+/i, '').trim();
  const finalDescription = description || (type === 'INCOME' ? 'Entrada via WhatsApp' : 'Saída via WhatsApp');

  return {
    type,
    paymentMethod,
    amount: amountData.amount,
    description: finalDescription,
    category: inferCategory(type, finalDescription),
  };
}

function shouldTryGeminiTransactionParser(rawText: string, parsed: ParsedFinancialCommand | null) {
  const normalized = toAsciiLower(rawText);
  const hasAmount = parseAmountFromText(normalized) !== null;
  if (!hasAmount) return false;
  if (!parsed) return true;

  const rawTokenCount = normalized.split(/\s+/).filter(Boolean).length;
  const description = toAsciiLower(parsed.description);
  const descriptionTokenCount = description.split(/\s+/).filter(Boolean).length;
  const isLowSignalDescription =
    !description ||
    descriptionTokenCount <= 2 ||
    LOW_SIGNAL_DESCRIPTION_TOKENS.some((token) => description.includes(token));

  return rawTokenCount >= 5 && isLowSignalDescription;
}

async function extractFinancialCommandWithGemini(rawText: string) {
  const ai = getGeminiClient();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Analise a mensagem abaixo e identifique se ela descreve um lançamento financeiro para ser registrado.

Mensagem:
${rawText}

Regras:
- Se não for claramente um lançamento financeiro, retorne matched=false.
- Se for lançamento, retorne:
  - type: INCOME ou EXPENSE
  - paymentMethod: PIX, CARD, CASH, BANK_TRANSFER, BOLETO ou OTHER
  - amount: número positivo
  - description: descrição curta e útil
  - category: categoria curta em português do Brasil
- Não invente valor ausente.
- Não adicione texto fora do JSON.`,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          matched: { type: Type.BOOLEAN },
          type: { type: Type.STRING, enum: ['INCOME', 'EXPENSE'] },
          paymentMethod: {
            type: Type.STRING,
            enum: ['PIX', 'CARD', 'CASH', 'BANK_TRANSFER', 'BOLETO', 'OTHER'],
          },
          amount: { type: Type.NUMBER },
          description: { type: Type.STRING },
          category: { type: Type.STRING },
        },
        required: ['matched'],
      },
    },
  });

  const parsed = JSON.parse(response.text || '{}') as Partial<GeminiTransactionExtraction>;
  if (!parsed.matched) return null;
  if (
    (parsed.type !== 'INCOME' && parsed.type !== 'EXPENSE') ||
    typeof parsed.amount !== 'number' ||
    !Number.isFinite(parsed.amount) ||
    parsed.amount <= 0 ||
    typeof parsed.description !== 'string' ||
    !parsed.description.trim() ||
    typeof parsed.category !== 'string' ||
    !parsed.category.trim()
  ) {
    return null;
  }

  const paymentMethod: PaymentMethod =
    parsed.paymentMethod === 'PIX' ||
    parsed.paymentMethod === 'CARD' ||
    parsed.paymentMethod === 'CASH' ||
    parsed.paymentMethod === 'BANK_TRANSFER' ||
    parsed.paymentMethod === 'BOLETO'
      ? parsed.paymentMethod
      : 'OTHER';

  return {
    type: parsed.type,
    amount: parsed.amount,
    paymentMethod,
    description: parsed.description.trim(),
    category: parsed.category.trim(),
  } satisfies ParsedFinancialCommand;
}

function isHelpCommand(text: string) {
  return HELP_KEYWORDS.includes(toAsciiLower(text));
}

function isBalanceCommand(text: string) {
  return BALANCE_KEYWORDS.includes(toAsciiLower(text));
}

function isConfirmCommand(text: string) {
  const normalized = toAsciiLower(text);
  return normalized === 'confirmar' || normalized === 'confirmo';
}

function isCancelCommand(text: string) {
  const normalized = toAsciiLower(text);
  return normalized === 'cancelar' || normalized === 'cancela';
}

function detectWhatsAppAiIntent(text: string): WhatsAppAiIntent | null {
  const normalized = toAsciiLower(text);

  if (SUMMARY_KEYWORDS.includes(normalized)) return { type: 'monthly_summary' };
  if (TOP_SPENDING_KEYWORDS.includes(normalized)) return { type: 'top_spending' };
  if (MONTH_INCOME_KEYWORDS.includes(normalized)) return { type: 'month_income' };
  if (TOP_CATEGORIES_KEYWORDS.includes(normalized)) return { type: 'top_categories' };
  if (GOAL_STATUS_KEYWORDS.includes(normalized)) return { type: 'goal_status' };
  if (UPCOMING_DUES_KEYWORDS.includes(normalized)) return { type: 'upcoming_dues' };

  const categorySpendMatch = normalized.match(
    /quanto gastei com (.+?) (este mes|esse mes|neste mes|nesse mes|no mes)$/
  );
  if (categorySpendMatch?.[1]) {
    return {
      type: 'category_spend',
      categoryHint: categorySpendMatch[1].trim(),
    };
  }

  return null;
}

function detectWhatsAppActionIntent(text: string): WhatsAppActionIntent | null {
  const normalized = toAsciiLower(text);

  if (
    normalized === 'ultimos lancamentos' ||
    normalized === 'ultimos lançamentos' ||
    normalized === 'listar lancamentos' ||
    normalized === 'listar lançamentos'
  ) {
    return { type: 'list_recent_transactions' };
  }

  const removeRecentMatch = normalized.match(
    /^(remover lancamento|remover lançamento|apagar lancamento|apagar lançamento)\s+(\d+)$/
  );
  if (removeRecentMatch?.[2]) {
    return {
      type: 'remove_recent_transaction',
      index: Number(removeRecentMatch[2]),
    };
  }

  if (
    normalized === 'desfazer ultimo lancamento' ||
    normalized === 'desfazer ultimo lançamento' ||
    normalized === 'cancelar ultimo lancamento' ||
    normalized === 'cancelar ultimo lançamento'
  ) {
    return { type: 'undo_last_transaction' };
  }

  const editLastMatch = normalized.match(
    /^(editar ultimo|editar ultimo lancamento|editar ultimo lançamento|corrigir ultimo|corrigir ultimo lancamento|corrigir ultimo lançamento)\s+(.+)$/
  );
  if (editLastMatch?.[2]) {
    return {
      type: 'edit_last_transaction',
      commandText: editLastMatch[2].trim(),
    };
  }

  const createGoalMatch = normalized.match(
    /^(criar meta|nova meta|adicionar meta)\s+(.+?)\s+(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})|\d+(?:[.,]\d{1,2})?)$/
  );
  if (createGoalMatch?.[2] && createGoalMatch?.[3]) {
    const rawAmount = createGoalMatch[3];
    const targetAmount = Number(
      rawAmount.includes(',') && rawAmount.includes('.')
        ? rawAmount.replace(/\./g, '').replace(',', '.')
        : rawAmount.replace(',', '.')
    );

    if (Number.isFinite(targetAmount) && targetAmount > 0) {
      return {
        type: 'create_goal',
        name: createGoalMatch[2].trim(),
        targetAmount,
      };
    }
  }

  const markDebtPaidMatch = normalized.match(
    /^(quitar divida|quitar dívida|marcar divida como paga|marcar dívida como paga|divida paga|dívida paga)\s+(.+)$/
  );
  if (markDebtPaidMatch?.[2]) {
    return {
      type: 'mark_debt_paid',
      creditorHint: markDebtPaidMatch[2].trim(),
    };
  }

  return null;
}

function getNextDueDate(dueDay: number, now: Date) {
  const year = now.getFullYear();
  const month = now.getMonth();
  const lastDayCurrentMonth = new Date(year, month + 1, 0).getDate();
  const currentCandidate = new Date(year, month, Math.min(dueDay, lastDayCurrentMonth));

  if (currentCandidate >= new Date(year, month, now.getDate())) {
    return currentCandidate;
  }

  const nextMonthDate = new Date(year, month + 1, 1);
  const nextYear = nextMonthDate.getFullYear();
  const nextMonth = nextMonthDate.getMonth();
  const lastDayNextMonth = new Date(nextYear, nextMonth + 1, 0).getDate();
  return new Date(nextYear, nextMonth, Math.min(dueDay, lastDayNextMonth));
}

function getConfirmationExpiryDate(now = new Date()) {
  return new Date(now.getTime() + 5 * 60 * 1000);
}

async function saveWhatsAppPendingConfirmation(params: {
  workspaceId: string;
  action: 'undo_last_transaction' | 'remove_recent_transaction';
  transactionId: string;
  description: string;
  amount: number;
}) {
  return saveWorkspaceWhatsAppConfig({
    workspaceId: params.workspaceId,
    userId: null,
    pendingConfirmation: {
      action: params.action,
      transactionId: params.transactionId,
      description: params.description,
      amount: params.amount,
      requestedAt: new Date().toISOString(),
      expiresAt: getConfirmationExpiryDate().toISOString(),
    },
  });
}

async function clearWhatsAppPendingConfirmation(workspaceId: string) {
  return saveWorkspaceWhatsAppConfig({
    workspaceId,
    userId: null,
    pendingConfirmation: null,
  });
}

async function handleWhatsAppAiIntent(params: {
  workspaceId: string;
  workspaceName: string;
  sender: string;
  messageId: string;
  intent: WhatsAppAiIntent;
}) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [wallets, transactions, goals, debts] = await Promise.all([
    prisma.wallet.findMany({
      where: { workspace_id: params.workspaceId },
      select: { balance: true },
    }),
    prisma.transaction.findMany({
      where: {
        workspace_id: params.workspaceId,
        date: { gte: monthStart },
      },
      select: {
        type: true,
        amount: true,
        category: { select: { name: true } },
      },
      orderBy: { date: 'desc' },
      take: 300,
    }),
    prisma.goal.findMany({
      where: { workspace_id: params.workspaceId },
      select: {
        name: true,
        target_amount: true,
        current_amount: true,
        deadline: true,
      },
      orderBy: { created_at: 'desc' },
      take: 5,
    }),
    prisma.debt.findMany({
      where: {
        workspace_id: params.workspaceId,
        status: 'ACTIVE',
      },
      select: {
        creditor: true,
        remaining_amount: true,
        due_day: true,
        due_date: true,
      },
      take: 6,
    }),
  ]);

  const totalBalance = wallets.reduce((acc, wallet) => acc + Number(wallet.balance || 0), 0);
  const expenses = transactions.filter((tx) => {
    const type = String(tx.type || '').toUpperCase();
    return type === 'EXPENSE' || type === 'PIX_OUT';
  });
  const incomes = transactions.filter((tx) => {
    const type = String(tx.type || '').toUpperCase();
    return type === 'INCOME' || type === 'PIX_IN';
  });

  const expenseByCategory = new Map<string, number>();
  for (const tx of expenses) {
    const categoryName = tx.category?.name || 'Outros';
    expenseByCategory.set(categoryName, (expenseByCategory.get(categoryName) || 0) + Number(tx.amount || 0));
  }

  const sortedCategories = [...expenseByCategory.entries()].sort((a, b) => b[1] - a[1]);
  let responseText = '';

  if (params.intent.type === 'monthly_summary') {
    const totalIncome = incomes.reduce((acc, tx) => acc + Number(tx.amount || 0), 0);
    const totalExpense = expenses.reduce((acc, tx) => acc + Number(tx.amount || 0), 0);
    const monthNet = totalIncome - totalExpense;
    const topCategory = sortedCategories[0];

    responseText = [
      `Resumo do mês no workspace ${params.workspaceName}:`,
      `Saldo atual: ${formatCurrency(totalBalance)}.`,
      `Entradas: ${formatCurrency(totalIncome)}.`,
      `Saídas: ${formatCurrency(totalExpense)}.`,
      `Resultado do mês: ${formatCurrency(monthNet)}.`,
      topCategory
        ? `Categoria com maior peso: ${topCategory[0]} (${formatCurrency(topCategory[1])}).`
        : 'Ainda não há categoria dominante registrada neste mês.',
    ].join('\n');
  } else if (params.intent.type === 'top_spending') {
    const topCategory = sortedCategories[0];
    responseText = topCategory
      ? `Seu maior gasto do mês está em ${topCategory[0]}, com ${formatCurrency(topCategory[1])}.`
      : 'Ainda não há saídas suficientes neste mês para identificar a categoria com maior gasto.';
  } else if (params.intent.type === 'category_spend') {
    const normalizedHint = toAsciiLower(params.intent.categoryHint);
    const categoryEntry = sortedCategories.find(([category]) =>
      toAsciiLower(category).includes(normalizedHint) || normalizedHint.includes(toAsciiLower(category))
    );

    responseText = categoryEntry
      ? `Neste mês, você registrou ${formatCurrency(categoryEntry[1])} em ${categoryEntry[0]}.`
      : `Não encontrei gastos em "${params.intent.categoryHint}" neste mês.`;
  } else if (params.intent.type === 'month_income') {
    const totalIncome = incomes.reduce((acc, tx) => acc + Number(tx.amount || 0), 0);
    responseText = `Neste mês, você registrou ${formatCurrency(totalIncome)} em entradas no workspace ${params.workspaceName}.`;
  } else if (params.intent.type === 'top_categories') {
    const topThree = sortedCategories.slice(0, 3);
    responseText =
      topThree.length > 0
        ? [
            'As categorias que mais pesaram neste mês foram:',
            ...topThree.map(([name, amount], index) => `${index + 1}. ${name}: ${formatCurrency(amount)}.`),
          ].join('\n')
        : 'Ainda não há saídas suficientes neste mês para listar categorias relevantes.';
  } else if (params.intent.type === 'goal_status') {
    const topGoals = goals
      .map((goal) => ({
        ...goal,
        target: Number(goal.target_amount || 0),
        current: Number(goal.current_amount || 0),
      }))
      .filter((goal) => goal.target > 0)
      .slice(0, 3);

    responseText =
      topGoals.length > 0
        ? [
            'Status das metas mais recentes:',
            ...topGoals.map((goal) => {
              const progress = Math.min(100, (goal.current / goal.target) * 100);
              return `${goal.name}: ${formatCurrency(goal.current)} de ${formatCurrency(goal.target)} (${progress.toFixed(1)}%).`;
            }),
          ].join('\n')
        : 'Ainda não encontrei metas suficientes para resumir por aqui.';
  } else if (params.intent.type === 'upcoming_dues') {
    const upcomingDebts = debts
      .map((debt) => ({
        creditor: debt.creditor,
        amount: Number(debt.remaining_amount || 0),
        dueDate: debt.due_date || getNextDueDate(Number(debt.due_day || 1), now),
      }))
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
      .slice(0, 3);

    responseText =
      upcomingDebts.length > 0
        ? [
            'Próximos vencimentos do workspace:',
            ...upcomingDebts.map(
              (debt) =>
                `${debt.creditor}: ${formatCurrency(debt.amount)} com vencimento em ${debt.dueDate.toLocaleDateString('pt-BR')}.`
            ),
          ].join('\n')
        : 'Não encontrei dívidas ativas com vencimento próximo neste workspace.';
  }

  await sendWhatsAppTextMessage({
    to: params.sender,
    text: responseText,
  });

  await logWorkspaceEventSafe({
    workspaceId: params.workspaceId,
    type: 'ai.chat.used',
    payload: {
      channel: 'whatsapp',
      messageId: params.messageId,
      intent: params.intent.type,
    },
  });
}

async function handleWhatsAppGeminiIntent(params: {
  workspaceId: string;
  workspaceName: string;
  sender: string;
  messageId: string;
  messageText: string;
}) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [wallets, transactions, goals, debts] = await Promise.all([
    prisma.wallet.findMany({
      where: { workspace_id: params.workspaceId },
      select: { balance: true, name: true },
    }),
    prisma.transaction.findMany({
      where: {
        workspace_id: params.workspaceId,
        date: { gte: monthStart },
      },
      select: {
        type: true,
        amount: true,
        description: true,
        date: true,
        category: { select: { name: true } },
      },
      orderBy: { date: 'desc' },
      take: 60,
    }),
    prisma.goal.findMany({
      where: { workspace_id: params.workspaceId },
      select: {
        name: true,
        target_amount: true,
        current_amount: true,
        deadline: true,
      },
      orderBy: { created_at: 'desc' },
      take: 5,
    }),
    prisma.debt.findMany({
      where: {
        workspace_id: params.workspaceId,
        status: 'ACTIVE',
      },
      select: {
        creditor: true,
        remaining_amount: true,
        due_day: true,
        due_date: true,
      },
      take: 5,
    }),
  ]);

  const totalBalance = wallets.reduce((acc, wallet) => acc + Number(wallet.balance || 0), 0);
  const expenses = transactions.filter((tx) => {
    const type = String(tx.type || '').toUpperCase();
    return type === 'EXPENSE' || type === 'PIX_OUT';
  });
  const incomes = transactions.filter((tx) => {
    const type = String(tx.type || '').toUpperCase();
    return type === 'INCOME' || type === 'PIX_IN';
  });

  const totalIncome = incomes.reduce((acc, tx) => acc + Number(tx.amount || 0), 0);
  const totalExpense = expenses.reduce((acc, tx) => acc + Number(tx.amount || 0), 0);
  const expenseByCategory = new Map<string, number>();
  for (const tx of expenses) {
    const categoryName = tx.category?.name || 'Outros';
    expenseByCategory.set(categoryName, (expenseByCategory.get(categoryName) || 0) + Number(tx.amount || 0));
  }

  const topCategories = [...expenseByCategory.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, amount]) => ({
      name,
      amount,
    }));

  const contextPayload = {
    workspaceName: params.workspaceName,
    currentMonth: now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
    totalBalance,
    totalIncome,
    totalExpense,
    topCategories,
    recentTransactions: transactions.slice(0, 8).map((tx) => ({
      type: tx.type,
      amount: Number(tx.amount || 0),
      description: tx.description,
      category: tx.category?.name || 'Outros',
      date: tx.date,
    })),
    goals: goals.map((goal) => ({
      name: goal.name,
      targetAmount: Number(goal.target_amount || 0),
      currentAmount: Number(goal.current_amount || 0),
      deadline: goal.deadline,
    })),
    debts: debts.map((debt) => ({
      creditor: debt.creditor,
      remainingAmount: Number(debt.remaining_amount || 0),
      dueDate: debt.due_date,
      dueDay: Number(debt.due_day || 1),
    })),
  };

  const ai = getGeminiClient();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: `Você é o Cote, assistente financeiro do Cote Finance AI no WhatsApp.
Responda sempre em português do Brasil.
Use apenas os dados do contexto abaixo.
Se a pergunta não puder ser respondida com o contexto, diga isso com objetividade.
Se a pergunta não for sobre finanças pessoais, gastos, metas, dívidas, saldo, entradas, categorias ou uso do workspace, responda de forma curta dizendo que aqui você ajuda com finanças do workspace.
Responda em no máximo 5 linhas curtas, sem markdown pesado, sem inventar números e sem tom promocional.

CONTEXTO:
${JSON.stringify(contextPayload)}

PERGUNTA DO USUÁRIO:
${params.messageText}`,
          },
        ],
      },
    ],
  });

  const text = truncateText(
    (response.text || '').trim() ||
      'Não consegui montar uma resposta útil com os dados atuais do workspace.',
    900
  );

  await sendWhatsAppTextMessage({
    to: params.sender,
    text,
  });

  await logWorkspaceEventSafe({
    workspaceId: params.workspaceId,
    type: 'ai.chat.used',
    payload: {
      channel: 'whatsapp',
      mode: 'gemini',
      messageId: params.messageId,
      promptChars: params.messageText.length,
    },
  });
}

async function handleWhatsAppActionIntent(params: {
  workspaceId: string;
  workspaceName: string;
  sender: string;
  messageId: string;
  intent: WhatsAppActionIntent;
}) {
  if (params.intent.type === 'list_recent_transactions') {
    const recentTransactions = await prisma.transaction.findMany({
      where: {
        workspace_id: params.workspaceId,
        status: 'CONFIRMED',
      },
      select: {
        id: true,
        type: true,
        amount: true,
        description: true,
        date: true,
        category: { select: { name: true } },
      },
      orderBy: { date: 'desc' },
      take: 5,
    });

    if (recentTransactions.length === 0) {
      await sendWhatsAppTextMessage({
        to: params.sender,
        text: 'Não encontrei lançamentos recentes neste workspace.',
      });
      return;
    }

    await sendWhatsAppTextMessage({
      to: params.sender,
      text: [
        `Últimos lançamentos do workspace ${params.workspaceName}:`,
        ...recentTransactions.map((tx, index) => {
          const label = String(tx.type).toUpperCase() === 'INCOME' ? 'entrada' : 'saída';
          return `${index + 1}. ${label} de ${formatCurrency(Number(tx.amount || 0))} em ${tx.category?.name || 'Outros'} - ${tx.description}.`;
        }),
        'Para remover, envie por exemplo: remover lancamento 2',
      ].join('\n'),
    });
    return;
  }

  if (params.intent.type === 'remove_recent_transaction') {
    if (!Number.isInteger(params.intent.index) || params.intent.index < 1 || params.intent.index > 5) {
      await sendWhatsAppTextMessage({
        to: params.sender,
        text: 'Escolha um número entre 1 e 5 para remover um lançamento recente.',
      });
      return;
    }

    const recentTransactions = await prisma.transaction.findMany({
      where: {
        workspace_id: params.workspaceId,
        status: 'CONFIRMED',
      },
      select: {
        id: true,
        type: true,
        amount: true,
        description: true,
        wallet_id: true,
      },
      orderBy: { date: 'desc' },
      take: 5,
    });

    const transactionToRemove = recentTransactions[params.intent.index - 1];
    if (!transactionToRemove) {
      await sendWhatsAppTextMessage({
        to: params.sender,
        text: 'Não encontrei esse lançamento na lista recente.',
      });
      return;
    }

    await saveWhatsAppPendingConfirmation({
      workspaceId: params.workspaceId,
      action: 'remove_recent_transaction',
      transactionId: transactionToRemove.id,
      description: transactionToRemove.description,
      amount: Number(transactionToRemove.amount || 0),
    });

    await sendWhatsAppTextMessage({
      to: params.sender,
      text: `Confirme a remoção do lançamento ${params.intent.index}: ${transactionToRemove.description} (${formatCurrency(
        Number(transactionToRemove.amount || 0)
      )}). Responda "confirmar" para seguir ou "cancelar" para desistir.`,
    });
    return;
  }

  if (params.intent.type === 'undo_last_transaction') {
    const lastTransaction = await prisma.transaction.findFirst({
      where: {
        workspace_id: params.workspaceId,
        status: 'CONFIRMED',
      },
      orderBy: { date: 'desc' },
      select: {
        id: true,
        type: true,
        amount: true,
        description: true,
        wallet_id: true,
      },
    });

    if (!lastTransaction) {
      await sendWhatsAppTextMessage({
        to: params.sender,
        text: 'Não encontrei um lançamento recente para desfazer neste workspace.',
      });
      return;
    }

    await saveWhatsAppPendingConfirmation({
      workspaceId: params.workspaceId,
      action: 'undo_last_transaction',
      transactionId: lastTransaction.id,
      description: lastTransaction.description,
      amount: Number(lastTransaction.amount || 0),
    });

    await sendWhatsAppTextMessage({
      to: params.sender,
      text: `Confirme o desfazimento do último lançamento: ${lastTransaction.description} (${formatCurrency(
        Number(lastTransaction.amount || 0)
      )}). Responda "confirmar" para seguir ou "cancelar" para desistir.`,
    });
    return;
  }

  if (params.intent.type === 'edit_last_transaction') {
    const replacement = parseFinancialCommand(params.intent.commandText);
    if (!replacement) {
      await sendWhatsAppTextMessage({
        to: params.sender,
        text: 'Não consegui entender a correção. Exemplo: editar ultimo 89 mercado.',
      });
      return;
    }

    const lastTransaction = await prisma.transaction.findFirst({
      where: {
        workspace_id: params.workspaceId,
        status: 'CONFIRMED',
      },
      orderBy: { date: 'desc' },
      select: {
        id: true,
        type: true,
        amount: true,
        description: true,
        wallet_id: true,
        category_id: true,
      },
    });

    if (!lastTransaction) {
      await sendWhatsAppTextMessage({
        to: params.sender,
        text: 'Não encontrei um lançamento recente para editar neste workspace.',
      });
      return;
    }

    await prisma.$transaction(async (tx) => {
      let category = await tx.category.findFirst({
        where: { name: replacement.category },
      });

      if (!category) {
        category = await tx.category.create({
          data: { name: replacement.category },
        });
      }

      const oldType = String(lastTransaction.type).toUpperCase();
      const oldSignedAmount =
        oldType === 'INCOME' ? Number(lastTransaction.amount || 0) : -Number(lastTransaction.amount || 0);
      const newSignedAmount =
        replacement.type === 'INCOME' ? Number(replacement.amount || 0) : -Number(replacement.amount || 0);
      const balanceDelta = newSignedAmount - oldSignedAmount;

      await tx.transaction.update({
        where: { id: lastTransaction.id },
        data: {
          type: replacement.type,
          payment_method: replacement.paymentMethod,
          amount: replacement.amount,
          description: replacement.description,
          category_id: category.id,
        },
      });

      await tx.wallet.update({
        where: { id: lastTransaction.wallet_id },
        data: {
          balance: {
            increment: balanceDelta,
          },
        },
      });
    });

    await logWorkspaceEventSafe({
      workspaceId: params.workspaceId,
      type: 'whatsapp.transaction.edited',
      payload: {
        messageId: params.messageId,
        transactionId: lastTransaction.id,
        previousDescription: lastTransaction.description,
        newDescription: replacement.description,
      },
    });

    await sendWhatsAppTextMessage({
      to: params.sender,
      text: `Último lançamento atualizado para ${formatCurrency(replacement.amount)} em ${replacement.category}. Descrição: ${replacement.description}.`,
    });
    return;
  }

  if (params.intent.type === 'create_goal') {
    const goal = await prisma.goal.create({
      data: {
        workspace_id: params.workspaceId,
        name: params.intent.name,
        target_amount: params.intent.targetAmount,
        current_amount: 0,
      },
    });

    await logWorkspaceEventSafe({
      workspaceId: params.workspaceId,
      type: 'goal.created',
      payload: {
        goalId: goal.id,
        source: 'whatsapp',
      },
    });

    await logWorkspaceEventSafe({
      workspaceId: params.workspaceId,
      type: 'whatsapp.goal.created',
      payload: {
        messageId: params.messageId,
        goalId: goal.id,
        name: params.intent.name,
        targetAmount: params.intent.targetAmount,
      },
    });

    await sendWhatsAppTextMessage({
      to: params.sender,
      text: `Meta criada com sucesso no workspace ${params.workspaceName}: ${params.intent.name}, com objetivo de ${formatCurrency(params.intent.targetAmount)}.`,
    });
    return;
  }

  if (params.intent.type === 'mark_debt_paid') {
    const debts = await prisma.debt.findMany({
      where: {
        workspace_id: params.workspaceId,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        creditor: true,
        remaining_amount: true,
      },
      orderBy: { created_at: 'desc' },
      take: 20,
    });

    const normalizedHint = toAsciiLower(params.intent.creditorHint);
    const matchedDebt = debts.find((debt) => {
      const creditor = toAsciiLower(debt.creditor);
      return creditor.includes(normalizedHint) || normalizedHint.includes(creditor);
    });

    if (!matchedDebt) {
      await sendWhatsAppTextMessage({
        to: params.sender,
        text: `Não encontrei uma dívida ativa com o nome "${params.intent.creditorHint}" para marcar como paga.`,
      });
      return;
    }

    await prisma.debt.update({
      where: { id: matchedDebt.id },
      data: {
        status: 'PAID',
        remaining_amount: 0,
      },
    });

    await logWorkspaceEventSafe({
      workspaceId: params.workspaceId,
      type: 'debt.updated',
      payload: {
        debtId: matchedDebt.id,
        status: 'PAID',
        source: 'whatsapp',
      },
    });

    await logWorkspaceEventSafe({
      workspaceId: params.workspaceId,
      type: 'whatsapp.debt.marked_paid',
      payload: {
        messageId: params.messageId,
        debtId: matchedDebt.id,
        creditor: matchedDebt.creditor,
      },
    });

    await sendWhatsAppTextMessage({
      to: params.sender,
      text: `Dívida marcada como paga: ${matchedDebt.creditor}. Valor anterior em aberto: ${formatCurrency(Number(matchedDebt.remaining_amount || 0))}.`,
    });
  }
}

async function handlePendingConfirmation(params: {
  workspaceId: string;
  sender: string;
  messageId: string;
  command: 'confirm' | 'cancel';
}) {
  const config = await getWorkspaceWhatsAppConfig(params.workspaceId);
  const pending = config.pendingConfirmation;

  if (!pending) {
    await sendWhatsAppTextMessage({
      to: params.sender,
      text: 'Não há nenhuma ação pendente para confirmar neste momento.',
    });
    return true;
  }

  if (new Date(pending.expiresAt).getTime() < Date.now()) {
    await clearWhatsAppPendingConfirmation(params.workspaceId);
    await sendWhatsAppTextMessage({
      to: params.sender,
      text: 'A confirmação pendente expirou. Se quiser, envie o comando novamente.',
    });
    return true;
  }

  if (params.command === 'cancel') {
    await clearWhatsAppPendingConfirmation(params.workspaceId);
    await logWorkspaceEventSafe({
      workspaceId: params.workspaceId,
      type: 'whatsapp.confirmation.canceled',
      payload: {
        messageId: params.messageId,
        action: pending.action,
        transactionId: pending.transactionId,
      },
    });
    await sendWhatsAppTextMessage({
      to: params.sender,
      text: 'Ação cancelada com sucesso.',
    });
    return true;
  }

  const transaction = await prisma.transaction.findFirst({
    where: {
      id: pending.transactionId,
      workspace_id: params.workspaceId,
      status: 'CONFIRMED',
    },
    select: {
      id: true,
      type: true,
      amount: true,
      description: true,
      wallet_id: true,
    },
  });

  if (!transaction) {
    await clearWhatsAppPendingConfirmation(params.workspaceId);
    await sendWhatsAppTextMessage({
      to: params.sender,
      text: 'Não encontrei mais o lançamento pendente. A confirmação foi limpa.',
    });
    return true;
  }

  await prisma.$transaction(async (tx) => {
    await tx.transaction.update({
      where: { id: transaction.id },
      data: { status: 'CANCELLED' },
    });

    const balanceDelta =
      String(transaction.type).toUpperCase() === 'INCOME'
        ? -Number(transaction.amount || 0)
        : Number(transaction.amount || 0);

    await tx.wallet.update({
      where: { id: transaction.wallet_id },
      data: {
        balance: {
          increment: balanceDelta,
        },
      },
    });
  });

  await clearWhatsAppPendingConfirmation(params.workspaceId);
  await logWorkspaceEventSafe({
    workspaceId: params.workspaceId,
    type:
      pending.action === 'remove_recent_transaction'
        ? 'whatsapp.transaction.removed'
        : 'whatsapp.transaction.undone',
    payload: {
      messageId: params.messageId,
      transactionId: transaction.id,
      description: transaction.description,
      confirmationAction: pending.action,
    },
  });

  await sendWhatsAppTextMessage({
    to: params.sender,
    text:
      pending.action === 'remove_recent_transaction'
        ? `Lançamento removido: ${transaction.description} (${formatCurrency(Number(transaction.amount || 0))}).`
        : `Último lançamento desfeito: ${transaction.description} (${formatCurrency(Number(transaction.amount || 0))}).`,
  });
  return true;
}

function extractIncomingMessages(payload: any): IncomingTextMessage[] {
  const output: IncomingTextMessage[] = [];
  const entries = Array.isArray(payload?.entry) ? payload.entry : [];

  for (const entry of entries) {
    const changes = Array.isArray(entry?.changes) ? entry.changes : [];
    for (const change of changes) {
      const value = change?.value;
      const messages = Array.isArray(value?.messages) ? value.messages : [];
      for (const message of messages) {
        if (message?.type !== 'text') continue;
        if (typeof message?.from !== 'string') continue;
        if (typeof message?.text?.body !== 'string') continue;

        output.push({
          id: typeof message.id === 'string' ? message.id : `${message.from}-${Date.now()}`,
          from: message.from,
          body: message.text.body.trim(),
        });
      }
    }
  }

  return output;
}

function extractIncomingStatuses(payload: any): IncomingMessageStatus[] {
  const output: IncomingMessageStatus[] = [];
  const entries = Array.isArray(payload?.entry) ? payload.entry : [];

  for (const entry of entries) {
    const changes = Array.isArray(entry?.changes) ? entry.changes : [];
    for (const change of changes) {
      const value = change?.value;
      const statuses = Array.isArray(value?.statuses) ? value.statuses : [];
      for (const statusItem of statuses) {
        if (!statusItem || typeof statusItem !== 'object') continue;
        const raw = statusItem as Record<string, unknown>;
        const id = typeof raw.id === 'string' ? raw.id.trim() : '';
        const status = typeof raw.status === 'string' ? raw.status.trim().toLowerCase() : '';
        const recipientId = typeof raw.recipient_id === 'string' ? raw.recipient_id.trim() : '';
        const timestamp = typeof raw.timestamp === 'string' ? raw.timestamp.trim() : null;
        const errors = Array.isArray(raw.errors) ? raw.errors : [];

        if (!id || !status || !recipientId) continue;

        output.push({
          id,
          status,
          recipientId,
          timestamp,
          errors: errors.map((errorItem) => {
            if (!errorItem || typeof errorItem !== 'object') {
              return {
                code: null,
                title: null,
                message: null,
                details: null,
              };
            }
            const item = errorItem as Record<string, unknown>;
            return {
              code: typeof item.code === 'number' ? item.code : null,
              title: typeof item.title === 'string' ? item.title : null,
              message: typeof item.message === 'string' ? item.message : null,
              details: typeof item.error_data === 'object' && item.error_data && !Array.isArray(item.error_data)
                ? typeof (item.error_data as Record<string, unknown>).details === 'string'
                  ? ((item.error_data as Record<string, unknown>).details as string)
                  : null
                : null,
            };
          }),
        });
      }
    }
  }

  return output;
}

function getStatusFailureReason(status: IncomingMessageStatus) {
  const firstError = status.errors[0];
  if (!firstError) return null;
  return (
    firstError.details ||
    firstError.message ||
    firstError.title ||
    (typeof firstError.code === 'number' ? `Meta error ${firstError.code}` : null)
  );
}

type PendingDeliveryKind = 'connect' | 'test';

type PendingDeliveryMatch = {
  kind: PendingDeliveryKind;
  templateName: string | null;
  deliveryMode: 'template' | 'text';
};

function resolvePendingDeliveryMatch(
  workspaceConfig: Awaited<ReturnType<typeof getWorkspaceWhatsAppConfig>>,
  recipient: string,
  messageId: string
): PendingDeliveryMatch | null {
  const candidates: Array<{
    kind: PendingDeliveryKind;
    pending:
      | NonNullable<Awaited<ReturnType<typeof getWorkspaceWhatsAppConfig>>['pendingConnection']>
      | NonNullable<Awaited<ReturnType<typeof getWorkspaceWhatsAppConfig>>['pendingTest']>;
  }> = [];

  if (workspaceConfig.pendingConnection) {
    candidates.push({ kind: 'connect', pending: workspaceConfig.pendingConnection });
  }

  if (workspaceConfig.pendingTest) {
    candidates.push({ kind: 'test', pending: workspaceConfig.pendingTest });
  }

  for (const candidate of candidates) {
    const pendingPhone = normalizeWhatsappPhone(candidate.pending.phoneNumber);
    const matchesRecipient = pendingPhone === recipient;
    const matchesMessageId = !candidate.pending.messageId || candidate.pending.messageId === messageId;
    if (!matchesRecipient || !matchesMessageId) continue;

    return {
      kind: candidate.kind,
      templateName: candidate.pending.templateName,
      deliveryMode: candidate.pending.deliveryMode,
    };
  }

  return null;
}

async function processIncomingStatus(status: IncomingMessageStatus) {
  const recipient = normalizeWhatsappPhone(status.recipientId);
  if (!recipient) return;

  const candidates = await prisma.workspace.findMany({
    where: {
      whatsapp_phone_number: recipient,
    },
    select: {
      id: true,
      whatsapp_status: true,
      whatsapp_phone_number: true,
    },
    orderBy: {
      updated_at: 'desc',
    },
    take: 3,
  });

  if (candidates.length === 0) {
    return;
  }

  const resolvedCandidates = await Promise.all(
    candidates.map(async (workspace) => {
      const workspaceConfig = await getWorkspaceWhatsAppConfig(workspace.id);
      return {
        workspace,
        workspaceConfig,
        pendingMatch: resolvePendingDeliveryMatch(workspaceConfig, recipient, status.id),
      };
    })
  );

  const matchedCandidate = resolvedCandidates.find((item) => item.pendingMatch);
  const workspace = matchedCandidate?.workspace || candidates[0];
  if (!workspace) return;

  const workspaceConfig = matchedCandidate?.workspaceConfig || (await getWorkspaceWhatsAppConfig(workspace.id));
  const pendingMatch = matchedCandidate?.pendingMatch || null;

  await logWorkspaceEventSafe({
    workspaceId: workspace.id,
    type: pendingMatch ? `whatsapp.${pendingMatch.kind}.status_webhook` : 'whatsapp.status_webhook',
    payload: {
      messageId: status.id,
      status: status.status,
      recipient,
      isPendingMatch: Boolean(pendingMatch),
      matchKind: pendingMatch?.kind ?? null,
      errors: status.errors,
    },
  });

  // Evita falso positivo/negativo: só a mensagem pendente de conexão pode
  // transicionar o estado de CONNECTING -> CONNECTED/FAILED.
  if (!pendingMatch) {
    return;
  }

  if (DELIVERY_SUCCESS_STATUSES.has(status.status)) {
    if (pendingMatch.kind === 'connect') {
      await prisma.workspace.update({
        where: { id: workspace.id },
        data: {
          whatsapp_status: 'CONNECTED',
          whatsapp_phone_number: recipient,
          whatsapp_connected_at: new Date(),
        },
      });
    }

    await saveWorkspaceWhatsAppConfig({
      workspaceId: workspace.id,
      userId: null,
      lastConnectionState: 'connected',
      lastErrorMessage: null,
      lastErrorCategory: null,
      lastValidatedAt: new Date().toISOString(),
      pendingConnection: pendingMatch.kind === 'connect' ? null : workspaceConfig.pendingConnection,
      pendingTest: pendingMatch.kind === 'test' ? null : workspaceConfig.pendingTest,
    });

    await logWorkspaceEventSafe({
      workspaceId: workspace.id,
      type: `whatsapp.${pendingMatch.kind}.delivered`,
      payload: {
        messageId: status.id,
        status: status.status,
        recipient,
      },
    });

    logWhatsAppOperationalEvent(
      pendingMatch.kind === 'connect' ? 'WHATSAPP_CONNECT_WEBHOOK_DELIVERED' : 'WHATSAPP_TEST_WEBHOOK_DELIVERED',
      {
        workspaceId: workspace.id,
        destination: recipient,
        templateName: pendingMatch.templateName,
        messageId: status.id,
        statusFinal: status.status,
        failureReason: null,
        deliveryMode: pendingMatch.deliveryMode,
      }
    );
    return;
  }

  if (DELIVERY_FAILURE_STATUSES.has(status.status)) {
    if (pendingMatch.kind === 'test') {
      const failureReason =
        getStatusFailureReason(status) || 'A Meta retornou falha de entrega para o teste de WhatsApp.';

      await saveWorkspaceWhatsAppConfig({
        workspaceId: workspace.id,
        userId: null,
        lastConnectionState: 'connected',
        lastErrorMessage: failureReason,
        lastErrorCategory: 'delivery',
        lastValidatedAt: new Date().toISOString(),
        pendingConnection: workspaceConfig.pendingConnection,
        pendingTest: null,
      });

      await logWorkspaceEventSafe({
        workspaceId: workspace.id,
        type: 'whatsapp.test.failed',
        payload: {
          messageId: status.id,
          status: status.status,
          recipient,
          errors: status.errors,
        },
      });

      logWhatsAppOperationalEvent('WHATSAPP_TEST_WEBHOOK_FAILED', {
        workspaceId: workspace.id,
        destination: recipient,
        templateName: pendingMatch.templateName,
        messageId: status.id,
        statusFinal: status.status,
        failureReason,
        deliveryMode: pendingMatch.deliveryMode,
      });
      return;
    }
    const failureReason = getStatusFailureReason(status) || 'A Meta retornou falha de entrega para a mensagem de conexão.';

    await prisma.workspace.update({
      where: { id: workspace.id },
      data: {
        whatsapp_status: 'FAILED',
        whatsapp_connected_at: null,
      },
    });

    await saveWorkspaceWhatsAppConfig({
      workspaceId: workspace.id,
      userId: null,
      lastConnectionState: 'failed',
      lastErrorMessage: failureReason,
      lastErrorCategory: 'delivery',
      lastValidatedAt: new Date().toISOString(),
      pendingConnection: null,
      pendingTest: workspaceConfig.pendingTest,
    });

    await logWorkspaceEventSafe({
      workspaceId: workspace.id,
      type: 'whatsapp.connect.failed',
      payload: {
        messageId: status.id,
        status: status.status,
        recipient,
        errors: status.errors,
      },
    });

    logWhatsAppOperationalEvent('WHATSAPP_CONNECT_WEBHOOK_FAILED', {
      workspaceId: workspace.id,
      destination: recipient,
      templateName: pendingMatch.templateName,
      messageId: status.id,
      statusFinal: status.status,
      failureReason,
      deliveryMode: pendingMatch.deliveryMode,
    });
  }
}

async function processIncomingMessage(message: IncomingTextMessage) {
  const sender = normalizeWhatsappPhone(message.from);
  if (!sender) return;

  const workspace = await prisma.workspace.findFirst({
    where: {
      whatsapp_status: 'CONNECTED',
      whatsapp_phone_number: sender,
    },
    select: {
      id: true,
      name: true,
      whatsapp_phone_number: true,
      subscription: {
        select: {
          plan: true,
          status: true,
        },
      },
    },
  });

  if (!workspace) {
    await sendWhatsAppTextMessage({
      to: sender,
      text: 'Número não vinculado ao Cote Finance AI. Conecte seu WhatsApp na aba Integrações.',
    });
    return;
  }

  await logWorkspaceEventSafe({
    workspaceId: workspace.id,
    type: 'whatsapp.message.received',
    payload: {
      messageId: message.id,
      from: sender,
      bodyPreview: message.body.slice(0, 120),
    },
  });

  if (isConfirmCommand(message.body)) {
    await handlePendingConfirmation({
      workspaceId: workspace.id,
      sender,
      messageId: message.id,
      command: 'confirm',
    });
    return;
  }

  if (isCancelCommand(message.body)) {
    await handlePendingConfirmation({
      workspaceId: workspace.id,
      sender,
      messageId: message.id,
      command: 'cancel',
    });
    return;
  }

  if (isHelpCommand(message.body)) {
    await sendWhatsAppTextMessage({
      to: sender,
      text: HELP_MESSAGE,
    });
    return;
  }

  if (isBalanceCommand(message.body)) {
    const wallets = await prisma.wallet.findMany({
      where: { workspace_id: workspace.id },
      select: { balance: true },
    });
    const totalBalance = wallets.reduce((acc, wallet) => acc + Number(wallet.balance || 0), 0);

    await sendWhatsAppTextMessage({
      to: sender,
      text: `Saldo atual do workspace ${workspace.name}: ${formatCurrency(totalBalance)}.`,
    });

    await logWorkspaceEventSafe({
      workspaceId: workspace.id,
      type: 'whatsapp.balance.requested',
      payload: {
        messageId: message.id,
        totalBalance,
      },
    });
    return;
  }

  const aiIntent = detectWhatsAppAiIntent(message.body);
  const subscriptionPlan = workspace.subscription?.plan;
  const subscriptionStatus = workspace.subscription?.status;
  const canUseWhatsAppAi = hasWhatsAppCapabilityForSubscription({
    plan: subscriptionPlan,
    status: subscriptionStatus,
    capability: 'ai_assistant',
  });
  const canUseAdminActions = hasWhatsAppCapabilityForSubscription({
    plan: subscriptionPlan,
    status: subscriptionStatus,
    capability: 'admin_actions',
  });
  const canUseGeminiParser = hasWhatsAppCapabilityForSubscription({
    plan: subscriptionPlan,
    status: subscriptionStatus,
    capability: 'gemini_transaction_parser',
  });

  if (aiIntent) {
    if (!canUseWhatsAppAi) {
      await sendWhatsAppTextMessage({
        to: sender,
        text: 'As consultas com IA no WhatsApp estão disponíveis no plano Premium.',
      });
      return;
    }

    await handleWhatsAppAiIntent({
      workspaceId: workspace.id,
      workspaceName: workspace.name,
      sender,
      messageId: message.id,
      intent: aiIntent,
    });
    return;
  }

  const actionIntent = detectWhatsAppActionIntent(message.body);
  if (actionIntent) {
    if (!canUseAdminActions) {
      await sendWhatsAppTextMessage({
        to: sender,
        text: 'As ações administrativas pelo WhatsApp estão disponíveis no plano Premium.',
      });
      return;
    }

    await handleWhatsAppActionIntent({
      workspaceId: workspace.id,
      workspaceName: workspace.name,
      sender,
      messageId: message.id,
      intent: actionIntent,
    });
    return;
  }

  let parsed = parseFinancialCommand(message.body);
  let parserMode: 'simple' | 'gemini' = 'simple';
  if (canUseGeminiParser && shouldTryGeminiTransactionParser(message.body, parsed)) {
    try {
      const geminiParsed = await extractFinancialCommandWithGemini(message.body);
      if (geminiParsed) {
        parsed = geminiParsed;
        parserMode = 'gemini';
        await logWorkspaceEventSafe({
          workspaceId: workspace.id,
          type: 'ai.classify.used',
          payload: {
            channel: 'whatsapp',
            mode: 'transaction_parser',
            messageId: message.id,
            promptChars: message.body.length,
          },
        });
      }
    } catch (error) {
      if (!(error instanceof Error && error.message === GEMINI_KEY_MISSING_ERROR)) {
        console.error('WhatsApp Gemini transaction parser error:', {
          workspaceId: workspace.id,
          messageId: message.id,
          error,
        });
      }
    }
  }

  if (!parsed) {
    if (canUseWhatsAppAi) {
      try {
        await handleWhatsAppGeminiIntent({
          workspaceId: workspace.id,
          workspaceName: workspace.name,
          sender,
          messageId: message.id,
          messageText: message.body,
        });
        return;
      } catch (error) {
        if (!(error instanceof Error && error.message === GEMINI_KEY_MISSING_ERROR)) {
          console.error('WhatsApp Gemini fallback error:', {
            workspaceId: workspace.id,
            messageId: message.id,
            error,
          });
        }
      }
    }

    await logWorkspaceEventSafe({
      workspaceId: workspace.id,
      type: 'whatsapp.command.invalid',
      payload: {
        messageId: message.id,
        bodyPreview: message.body.slice(0, 120),
      },
    });
    await sendWhatsAppTextMessage({ to: sender, text: DEFAULT_HELP_MESSAGE });
    return;
  }

  const financialAssistantAccess = await getWorkspaceFeatureAccess({
    workspaceId: workspace.id,
    featureKey: 'whatsapp_financial_assistant',
  });

  if (!financialAssistantAccess.allowed) {
    await sendWhatsAppTextMessage({
      to: sender,
      text: WHATSAPP_PRO_FEATURE_BLOCK_MESSAGE,
    });
    await logWorkspaceEventSafe({
      workspaceId: workspace.id,
      type: 'whatsapp.financial_assistant.denied',
      payload: {
        messageId: message.id,
        reason: financialAssistantAccess.reason,
        plan: financialAssistantAccess.plan,
        status: financialAssistantAccess.status,
        source: financialAssistantAccess.source,
      },
    });
    return;
  }

  const txResult = await prisma.$transaction(async (tx) => {
    let wallet = await tx.wallet.findFirst({
      where: { workspace_id: workspace.id },
      orderBy: { id: 'asc' },
    });

    if (!wallet) {
      wallet = await tx.wallet.create({
        data: {
          workspace_id: workspace.id,
          name: 'Carteira Principal',
          type: 'CASH',
          balance: 0,
        },
      });
    }

    let category = await tx.category.findFirst({
      where: { name: parsed.category },
    });

    if (!category) {
      category = await tx.category.create({
        data: {
          name: parsed.category,
        },
      });
    }

    const duplicateWindowStart = new Date(Date.now() - 2 * 60 * 1000);
    const duplicated = await tx.transaction.findFirst({
      where: {
        workspace_id: workspace.id,
        wallet_id: wallet.id,
        type: parsed.type,
        payment_method: parsed.paymentMethod,
        amount: parsed.amount,
        description: parsed.description,
        date: { gte: duplicateWindowStart },
      },
      orderBy: { date: 'desc' },
    });

    if (duplicated) {
      return {
        duplicated: true,
        walletBalance: Number(wallet.balance),
        transactionId: duplicated.id,
      };
    }

    const createdTransaction = await tx.transaction.create({
      data: {
        workspace_id: workspace.id,
        wallet_id: wallet.id,
        category_id: category.id,
        type: parsed.type,
        payment_method: parsed.paymentMethod,
        amount: parsed.amount,
        date: new Date(),
        description: parsed.description,
        status: 'CONFIRMED',
        origin_type: 'SYSTEM',
        origin_id: message.id ? `whatsapp:${message.id}` : null,
      },
    });

    const balanceDelta = parsed.type === 'INCOME' ? parsed.amount : -parsed.amount;

    const updatedWallet = await tx.wallet.update({
      where: { id: wallet.id },
      data: {
        balance: {
          increment: balanceDelta,
        },
      },
    });

    return {
      duplicated: false,
      walletBalance: Number(updatedWallet.balance),
      transactionId: createdTransaction.id,
    };
  });

  if (txResult.duplicated) {
    await logWorkspaceEventSafe({
      workspaceId: workspace.id,
      type: 'whatsapp.transaction.duplicate',
      payload: {
        messageId: message.id,
        transactionId: txResult.transactionId,
        amount: parsed.amount,
        description: parsed.description,
      },
    });

    await sendWhatsAppTextMessage({
      to: sender,
      text: 'Lançamento já registrado recentemente. Se quiser, envie com outra descrição.',
    });
    return;
  }

  await logWorkspaceEventSafe({
    workspaceId: workspace.id,
    type: 'whatsapp.transaction.created',
    payload: {
      messageId: message.id,
      transactionId: txResult.transactionId,
      amount: parsed.amount,
      type: parsed.type,
      paymentMethod: parsed.paymentMethod,
      category: parsed.category,
      description: parsed.description,
    },
  });

  await sendWhatsAppTextMessage({
    to: sender,
    text:
      parserMode === 'gemini'
        ? `Lançamento confirmado com interpretação assistida: ${parsed.type === 'INCOME' ? 'entrada' : 'saída'} de ${formatCurrency(parsed.amount)} em ${parsed.category}. Descrição considerada: ${parsed.description}. Método: ${parsed.paymentMethod}. Saldo da carteira: ${formatCurrency(txResult.walletBalance)}.`
        : `Lançamento confirmado: ${parsed.type === 'INCOME' ? 'entrada' : 'saída'} de ${formatCurrency(parsed.amount)} em ${parsed.category}. Método: ${parsed.paymentMethod}. Saldo da carteira: ${formatCurrency(txResult.walletBalance)}.`,
  });
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');
    const verifyToken = getWhatsAppVerifyToken();

    if (mode === 'subscribe' && token === verifyToken && challenge) {
      return new Response(challenge, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
        },
      });
    }

    return new Response('Forbidden', {
      status: 403,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });
  } catch (error: any) {
    if (error instanceof Error && error.message === WHATSAPP_VERIFY_TOKEN_MISSING_ERROR) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ error: error?.message || 'Webhook verify failed' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-hub-signature-256');

    if (!verifyWhatsAppSignature(rawBody, signature)) {
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
    }

    const body = rawBody ? JSON.parse(rawBody) : {};
    const incomingStatuses = extractIncomingStatuses(body);
    const incomingMessages = normalizeIncomingWhatsAppMessages(body);
    if (incomingMessages.length > 0 || incomingStatuses.length > 0) {
      getWhatsAppConfig();
      warnIfTtsEnvMissingAtStartup();
    }

    for (const status of incomingStatuses) {
      try {
        await processIncomingStatus(status);
      } catch (error) {
        console.error('WhatsApp status processing error:', {
          messageId: status.id,
          recipient: status.recipientId,
          status: status.status,
          error,
        });
      }
    }

    for (const message of incomingMessages) {
      try {
        if (message.kind === 'audio') {
          await orchestrateWhatsAppFinancialMessage({ message });
          continue;
        }

        const orchestrationResult = await orchestrateWhatsAppFinancialMessage({
          message,
          allowUnknownPassthrough: true,
        });
        if (orchestrationResult.handled) {
          continue;
        }

        const passthroughPreview = parseIntentHeuristically(message.text);
        const passthroughDecision = decideLegacyPassthrough({
          messageKind: message.kind,
          rawText: message.text,
          previewIntent: passthroughPreview,
        });
        if (!passthroughDecision.shouldPassthrough) {
          await orchestrateWhatsAppFinancialMessage({
            message,
            allowUnknownPassthrough: false,
          });
          continue;
        }

        await processIncomingMessage({
          id: message.messageId,
          from: message.from,
          body: message.text,
        });
      } catch (error) {
        console.error('WhatsApp message processing error:', {
          messageId: message.messageId,
          from: message.from,
          kind: message.kind,
          error,
        });
      }
    }

    return NextResponse.json({ status: 'ok' });
  } catch (error: any) {
    if (
      error instanceof Error &&
      (error.message === WHATSAPP_CONFIG_MISSING_ERROR ||
        error.message === WHATSAPP_VERIFY_TOKEN_MISSING_ERROR)
    ) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.error('WhatsApp Webhook Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
