import 'server-only';

import { Type } from '@google/genai';
import { prisma } from '@/lib/prisma';
import { getGeminiClient, GEMINI_KEY_MISSING_ERROR } from '@/lib/gemini';
import { getWorkspaceFeatureAccess } from '@/lib/billing/feature-access-service';
import { logWorkspaceEventSafe } from '@/lib/server/multi-tenant';
import { mapConventionalStatusToLegacyDebtStatus } from '@/lib/debts';
import {
  appendConversationMemory,
  findLatestTransactionIdFromMemory,
  getConversationMemory,
  resolveConversationMemoryParticipant,
  type ConversationMemoryMessage,
} from '@/lib/ai/conversation-memory';
import { createTransactionTool } from '@/lib/ai/tools/create-transaction';
import { updateTransactionTool } from '@/lib/ai/tools/update-transaction';
import { addGoalContributionTool } from '@/lib/ai/tools/add-goal-contribution';
import {
  buildShortCategoryName,
  isLikelyEnglishCategoryName,
  normalizeCategoryKey,
  toCategoryDisplayName,
} from '@/lib/finance-assistant/category-normalizer';

const PREMIUM_ONLY_MESSAGE = 'Esse recurso está disponível apenas no plano Premium.';

type FinancialAgentAction =
  | 'createTransaction'
  | 'updateTransaction'
  | 'deleteTransaction'
  | 'addGoalContribution'
  | 'createGoal'
  | 'addInvestment'
  | 'registerDebtPayment'
  | 'createCategory'
  | 'unknown';

type FinancialAgentReplyMode = 'text' | 'audio' | 'both';
type FinancialAgentChannel = 'whatsapp' | 'app';

type AgentIntent = {
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

type AgentToolOutput = {
  summaryText: string;
  transactionId?: string | null;
  goalId?: string | null;
  payload?: Record<string, unknown> | null;
};

export type RunFinancialAgentInput = {
  workspaceId: string;
  text: string;
  channel: FinancialAgentChannel;
  userPhone?: string | null;
  userId?: string | null;
  messageId?: string | null;
  preferredReplyMode?: FinancialAgentReplyMode;
};

export type RunFinancialAgentResult = {
  handled: boolean;
  blockedByPlan: boolean;
  responseText: string | null;
  responseMode: FinancialAgentReplyMode;
  intent: FinancialAgentAction;
  toolName: FinancialAgentAction | null;
  toolResult: Record<string, unknown> | null;
};

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

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
  const value = toCategoryDisplayName(match[1]);
  return sanitizeShortText(value, 40);
}

function createHeuristicIntent(text: string): AgentIntent {
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

export function deriveFinancialIntentHeuristically(text: string) {
  return createHeuristicIntent(text);
}

function conversationToPrompt(messages: ConversationMemoryMessage[]) {
  if (!messages.length) return 'Sem historico recente.';
  return messages
    .slice(-20)
    .map((message) => `${message.role === 'assistant' ? 'ASSISTENTE' : 'USUARIO'}: ${message.content}`)
    .join('\n');
}

function toAgentIntent(payload: Partial<Record<string, unknown>>, fallback: AgentIntent): AgentIntent {
  const action = String(payload.action || '').trim() as FinancialAgentAction;
  const supportedAction: FinancialAgentAction =
    action === 'createTransaction' ||
    action === 'updateTransaction' ||
    action === 'deleteTransaction' ||
    action === 'addGoalContribution' ||
    action === 'createGoal' ||
    action === 'addInvestment' ||
    action === 'registerDebtPayment' ||
    action === 'createCategory'
      ? action
      : 'unknown';

  const amountRaw = Number(payload.amount);
  const amount = Number.isFinite(amountRaw) && amountRaw > 0 ? amountRaw : null;
  const targetAmountRaw = Number(payload.targetAmount);
  const targetAmount = Number.isFinite(targetAmountRaw) && targetAmountRaw > 0 ? targetAmountRaw : null;

  const typeRaw = String(payload.transactionType || '').trim().toUpperCase();
  const transactionType = typeRaw === 'INCOME' || typeRaw === 'EXPENSE' ? typeRaw : null;
  const confidenceRaw = Number(payload.confidence);
  const confidence = Number.isFinite(confidenceRaw) ? Math.max(0, Math.min(1, confidenceRaw)) : fallback.confidence;

  const parsed: AgentIntent = {
    action: supportedAction,
    confidence,
    amount: amount ?? fallback.amount,
    transactionType: transactionType ?? fallback.transactionType,
    categoryHint: sanitizeShortText(String(payload.categoryHint || ''), 30) || fallback.categoryHint,
    description: sanitizeShortText(String(payload.description || ''), 80) || fallback.description,
    merchant: sanitizeShortText(String(payload.merchant || ''), 40) || fallback.merchant,
    goalName: sanitizeShortText(String(payload.goalName || ''), 40) || fallback.goalName,
    targetAmount: targetAmount ?? fallback.targetAmount,
    investmentName: sanitizeShortText(String(payload.investmentName || ''), 48) || fallback.investmentName,
    investmentType: sanitizeShortText(String(payload.investmentType || ''), 24) || fallback.investmentType,
    institution: sanitizeShortText(String(payload.institution || ''), 32) || fallback.institution,
    debtCreditor: sanitizeShortText(String(payload.debtCreditor || ''), 48) || fallback.debtCreditor,
    transactionId: sanitizeShortText(String(payload.transactionId || ''), 80) || fallback.transactionId,
    shouldUseLastTransaction:
      typeof payload.shouldUseLastTransaction === 'boolean'
        ? payload.shouldUseLastTransaction
        : fallback.shouldUseLastTransaction,
    isFinancial: supportedAction !== 'unknown' || fallback.isFinancial,
  };

  return parsed;
}

async function parseIntentWithGemini(params: {
  text: string;
  conversation: ConversationMemoryMessage[];
  fallback: AgentIntent;
}) {
  const ai = getGeminiClient();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: [
              'Voce e um agente financeiro que converte texto em acao estruturada.',
              'Responda apenas JSON valido seguindo o schema.',
              'Use portugues do Brasil.',
              'Acoes permitidas: createTransaction, updateTransaction, deleteTransaction, addGoalContribution, createGoal, addInvestment, registerDebtPayment, createCategory, unknown.',
              'Regras:',
              '- "na verdade foram 75" depois de um lancamento significa updateTransaction com shouldUseLastTransaction=true.',
              '- Para gastei/paguei/comprei use createTransaction com transactionType=EXPENSE.',
              '- Para recebi/ganhei use createTransaction com transactionType=INCOME.',
              '- Para comandos de meta ("coloque 200 na meta viagem") use addGoalContribution.',
              '- Nunca invente IDs.',
              '- Nunca retorne categoria em ingles.',
              '',
              'Historico recente:',
              conversationToPrompt(params.conversation),
              '',
              'Mensagem do usuario:',
              params.text,
            ].join('\n'),
          },
        ],
      },
    ],
    config: {
      temperature: 0.1,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          action: {
            type: Type.STRING,
            enum: [
              'createTransaction',
              'updateTransaction',
              'deleteTransaction',
              'addGoalContribution',
              'createGoal',
              'addInvestment',
              'registerDebtPayment',
              'createCategory',
              'unknown',
            ],
          },
          confidence: { type: Type.NUMBER },
          amount: { type: Type.NUMBER, nullable: true },
          transactionType: { type: Type.STRING, enum: ['INCOME', 'EXPENSE'], nullable: true },
          categoryHint: { type: Type.STRING, nullable: true },
          description: { type: Type.STRING, nullable: true },
          merchant: { type: Type.STRING, nullable: true },
          goalName: { type: Type.STRING, nullable: true },
          targetAmount: { type: Type.NUMBER, nullable: true },
          investmentName: { type: Type.STRING, nullable: true },
          investmentType: { type: Type.STRING, nullable: true },
          institution: { type: Type.STRING, nullable: true },
          debtCreditor: { type: Type.STRING, nullable: true },
          transactionId: { type: Type.STRING, nullable: true },
          shouldUseLastTransaction: { type: Type.BOOLEAN },
        },
      },
    },
  });

  const payload = JSON.parse(response.text || '{}') as Partial<Record<string, unknown>>;
  return toAgentIntent(payload, params.fallback);
}

async function parseAgentIntent(params: { text: string; conversation: ConversationMemoryMessage[] }) {
  const heuristic = createHeuristicIntent(params.text);

  try {
    const parsedByGemini = await parseIntentWithGemini({
      text: params.text,
      conversation: params.conversation,
      fallback: heuristic,
    });

    if (parsedByGemini.action !== 'unknown') {
      return parsedByGemini;
    }

    if (heuristic.action !== 'unknown') {
      return heuristic;
    }

    return parsedByGemini;
  } catch (error) {
    if (!(error instanceof Error && error.message === GEMINI_KEY_MISSING_ERROR)) {
      console.error('Financial agent intent parser fallback:', error);
    }
    return heuristic;
  }
}

function ensureWorkspaceId(value: string) {
  const workspaceId = String(value || '').trim();
  if (!workspaceId) {
    throw new Error('workspaceId is required.');
  }
  return workspaceId;
}

async function logFinancialAgentEvent(params: {
  workspaceId: string;
  event: 'FINANCIAL_AGENT_START' | 'FINANCIAL_AGENT_INTENT_DETECTED' | 'FINANCIAL_AGENT_TOOL_EXECUTED' | 'FINANCIAL_AGENT_RESPONSE_GENERATED' | 'FINANCIAL_AGENT_ERROR';
  payload?: Record<string, unknown>;
}) {
  console.info(params.event, {
    workspaceId: params.workspaceId,
    ...(params.payload || {}),
  });

  await logWorkspaceEventSafe({
    workspaceId: params.workspaceId,
    type: params.event,
    payload: {
      workspaceId: params.workspaceId,
      event: params.event,
      ...(params.payload || {}),
    },
  });
}

async function createGoalTool(params: {
  workspaceId: string;
  goalName: string;
  targetAmount: number;
}) {
  const goal = await prisma.goal.create({
    data: {
      workspace_id: params.workspaceId,
      name: params.goalName,
      target_amount: params.targetAmount,
      current_amount: 0,
      deadline: null,
    },
    select: {
      id: true,
      name: true,
      target_amount: true,
    },
  });

  return {
    goalId: goal.id,
    goalName: goal.name,
    targetAmount: Number(goal.target_amount || 0),
  };
}

async function deleteTransactionTool(params: {
  workspaceId: string;
  transactionId?: string | null;
}) {
  const transactionId = String(params.transactionId || '').trim();
  const transaction =
    (transactionId
      ? await prisma.transaction.findFirst({
          where: {
            workspace_id: params.workspaceId,
            id: transactionId,
          },
          select: {
            id: true,
            amount: true,
            type: true,
            wallet_id: true,
          },
        })
      : null) ||
    (await prisma.transaction.findFirst({
      where: { workspace_id: params.workspaceId },
      orderBy: { date: 'desc' },
      select: {
        id: true,
        amount: true,
        type: true,
        wallet_id: true,
      },
    }));

  if (!transaction) return null;

  const amount = Number(transaction.amount || 0);
  const type = String(transaction.type || 'EXPENSE').toUpperCase();
  const walletDelta = type === 'INCOME' ? -amount : amount;

  return prisma.$transaction(async (tx) => {
    await tx.transaction.delete({
      where: {
        id: transaction.id,
        workspace_id: params.workspaceId,
      },
    });

    const wallet = await tx.wallet.update({
      where: {
        id: transaction.wallet_id,
        workspace_id: params.workspaceId,
      },
      data: {
        balance: {
          increment: walletDelta,
        },
      },
      select: {
        id: true,
        balance: true,
      },
    });

    return {
      transactionId: transaction.id,
      walletId: wallet.id,
      walletBalance: Number(wallet.balance || 0),
      amount,
    };
  });
}

async function addInvestmentTool(params: {
  workspaceId: string;
  amount: number;
  name: string | null;
  investmentType: string | null;
  institution: string | null;
}) {
  const now = new Date().toLocaleDateString('pt-BR');
  const investment = await prisma.investment.create({
    data: {
      workspace_id: params.workspaceId,
      name: sanitizeShortText(params.name, 48) || `Aporte ${now}`,
      type: sanitizeShortText(params.investmentType, 24) || 'Outros',
      institution: sanitizeShortText(params.institution, 32) || 'Carteira Principal',
      invested_amount: params.amount,
      current_amount: params.amount,
      expected_return_annual: 0,
    },
    select: {
      id: true,
      name: true,
      current_amount: true,
    },
  });

  return {
    investmentId: investment.id,
    name: investment.name,
    amount: Number(investment.current_amount || 0),
  };
}

async function registerDebtPaymentTool(params: {
  workspaceId: string;
  amount: number;
  creditorHint: string | null;
}) {
  const normalizedHint = normalize(String(params.creditorHint || ''));
  const debts = await prisma.debt.findMany({
    where: {
      workspace_id: params.workspaceId,
    },
    select: {
      id: true,
      creditor: true,
      remaining_amount: true,
    },
    orderBy: {
      created_at: 'desc',
    },
    take: 25,
  });

  const targetDebt =
    (normalizedHint
      ? debts.find((debt) => normalize(debt.creditor).includes(normalizedHint) && Number(debt.remaining_amount) > 0)
      : null) || debts.find((debt) => Number(debt.remaining_amount) > 0);

  if (!targetDebt) return null;

  const previousRemaining = Number(targetDebt.remaining_amount || 0);
  const remaining = Math.max(0, previousRemaining - params.amount);
  const status =
    remaining <= 0
      ? mapConventionalStatusToLegacyDebtStatus('Quitada')
      : mapConventionalStatusToLegacyDebtStatus('Em aberto');

  const updated = await prisma.debt.update({
    where: {
      id: targetDebt.id,
      workspace_id: params.workspaceId,
    },
    data: {
      remaining_amount: remaining,
      status,
    },
    select: {
      id: true,
      creditor: true,
      remaining_amount: true,
    },
  });

  return {
    debtId: updated.id,
    creditor: updated.creditor,
    paidAmount: params.amount,
    remainingAmount: Number(updated.remaining_amount || 0),
  };
}

async function createCategoryTool(params: { workspaceId: string; categoryHint: string | null }) {
  const hint = sanitizeShortText(params.categoryHint, 40) || 'Outros';
  const shortName = buildShortCategoryName({
    hint,
    flowType: 'expense',
  });
  const normalized = normalizeCategoryKey(shortName);
  const finalName = !isLikelyEnglishCategoryName(shortName) && shortName ? shortName : 'Outros';

  const existing = await prisma.category.findMany({
    select: {
      id: true,
      name: true,
    },
    orderBy: {
      name: 'asc',
    },
    take: 400,
  });

  const matched = existing.find((category) => normalizeCategoryKey(category.name) === normalized);
  if (matched) {
    return {
      categoryId: matched.id,
      categoryName: matched.name,
      created: false,
    };
  }

  const created = await prisma.category.create({
    data: {
      name: toCategoryDisplayName(finalName) || 'Outros',
      icon: 'tag',
      color: '#3B82F6',
    },
    select: {
      id: true,
      name: true,
    },
  });

  return {
    categoryId: created.id,
    categoryName: created.name,
    created: true,
  };
}

function resolveResponseMode(mode: FinancialAgentReplyMode | undefined): FinancialAgentReplyMode {
  if (mode === 'audio' || mode === 'both') return mode;
  return 'text';
}

function summaryFromTool(params: {
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

export function buildFinancialAgentSummaryForTest(params: {
  action: FinancialAgentAction;
  toolResult: Record<string, unknown> | null;
  fallback: string;
}) {
  return summaryFromTool(params);
}

export function isLikelyFinancialCommand(text: string) {
  return createHeuristicIntent(text).isFinancial;
}

function shortAssistantHelp() {
  return 'Posso registrar lancamentos, corrigir valores, criar metas e registrar aportes. Exemplo: "gastei 60 no iFood".';
}

export async function runFinancialAgent(input: RunFinancialAgentInput): Promise<RunFinancialAgentResult> {
  const workspaceId = ensureWorkspaceId(input.workspaceId);
  const text = String(input.text || '').trim();
  const responseMode = resolveResponseMode(input.preferredReplyMode);

  if (!text) {
    return {
      handled: false,
      blockedByPlan: false,
      responseText: null,
      responseMode,
      intent: 'unknown',
      toolName: null,
      toolResult: null,
    };
  }

  const participant = resolveConversationMemoryParticipant({
    channel: input.channel,
    userPhone: input.userPhone,
    userId: input.userId,
  });

  await logFinancialAgentEvent({
    workspaceId,
    event: 'FINANCIAL_AGENT_START',
    payload: {
      messageId: input.messageId || null,
      channel: input.channel,
      participant,
      textPreview: text.slice(0, 120),
    },
  });

  try {
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { id: true },
    });
    if (!workspace) {
      throw new Error('Workspace not found for financial agent execution.');
    }

    const memory = await getConversationMemory({
      workspaceId,
      userPhone: participant,
    });

    const parsedIntent = await parseAgentIntent({
      text,
      conversation: memory,
    });

    await logFinancialAgentEvent({
      workspaceId,
      event: 'FINANCIAL_AGENT_INTENT_DETECTED',
      payload: {
        messageId: input.messageId || null,
        action: parsedIntent.action,
        confidence: parsedIntent.confidence,
        isFinancial: parsedIntent.isFinancial,
        shouldUseLastTransaction: parsedIntent.shouldUseLastTransaction,
      },
    });

    if (!parsedIntent.isFinancial) {
      return {
        handled: false,
        blockedByPlan: false,
        responseText: null,
        responseMode,
        intent: parsedIntent.action,
        toolName: null,
        toolResult: null,
      };
    }

    const premiumAccess = await getWorkspaceFeatureAccess({
      workspaceId,
      featureKey: 'premium_financial_conversational_assistant',
    });
    if (!premiumAccess.allowed) {
      await appendConversationMemory({
        workspaceId,
        userPhone: participant,
        messages: [
          {
            role: 'user',
            content: text,
          },
          {
            role: 'assistant',
            content: PREMIUM_ONLY_MESSAGE,
            metadata: {
              blockedByPlan: true,
              requiredPlan: 'PREMIUM',
              currentPlan: premiumAccess.plan,
            },
          },
        ],
      });

      await logFinancialAgentEvent({
        workspaceId,
        event: 'FINANCIAL_AGENT_RESPONSE_GENERATED',
        payload: {
          messageId: input.messageId || null,
          blockedByPlan: true,
          currentPlan: premiumAccess.plan,
          reason: premiumAccess.reason,
        },
      });

      return {
        handled: true,
        blockedByPlan: true,
        responseText: PREMIUM_ONLY_MESSAGE,
        responseMode: 'text',
        intent: parsedIntent.action,
        toolName: null,
        toolResult: null,
      };
    }

    if (parsedIntent.action === 'unknown') {
      const helpMessage = shortAssistantHelp();
      await appendConversationMemory({
        workspaceId,
        userPhone: participant,
        messages: [
          {
            role: 'user',
            content: text,
          },
          {
            role: 'assistant',
            content: helpMessage,
            metadata: {
              intent: 'unknown',
            },
          },
        ],
      });
      await logFinancialAgentEvent({
        workspaceId,
        event: 'FINANCIAL_AGENT_RESPONSE_GENERATED',
        payload: {
          messageId: input.messageId || null,
          action: 'unknown',
          responsePreview: helpMessage,
        },
      });

      return {
        handled: true,
        blockedByPlan: false,
        responseText: helpMessage,
        responseMode,
        intent: 'unknown',
        toolName: null,
        toolResult: null,
      };
    }

    const fallbackTransactionId = parsedIntent.shouldUseLastTransaction
      ? findLatestTransactionIdFromMemory(memory)
      : null;

    let toolResult: AgentToolOutput | null = null;
    if (parsedIntent.action === 'createTransaction' && parsedIntent.amount) {
      const result = await createTransactionTool({
        workspaceId,
        type: parsedIntent.transactionType || 'EXPENSE',
        amount: parsedIntent.amount,
        categoryHint: parsedIntent.categoryHint,
        description: parsedIntent.description,
        merchant: parsedIntent.merchant,
        originId: input.messageId ? `assistant:${input.messageId}` : null,
      });
      toolResult = {
        summaryText: `Pronto! Registrei ${formatCurrency(result.amount)} em ${result.categoryName}.`,
        transactionId: result.transactionId,
        payload: result as unknown as Record<string, unknown>,
      };
    } else if (parsedIntent.action === 'updateTransaction' && parsedIntent.amount) {
      const result = await updateTransactionTool({
        workspaceId,
        transactionId: parsedIntent.transactionId || fallbackTransactionId,
        amount: parsedIntent.amount,
        categoryHint: parsedIntent.categoryHint,
        description: parsedIntent.description,
      });
      if (result) {
        toolResult = {
          summaryText: `Atualizei para ${formatCurrency(result.updatedAmount)}.`,
          transactionId: result.transactionId,
          payload: result as unknown as Record<string, unknown>,
        };
      }
    } else if (parsedIntent.action === 'deleteTransaction') {
      const result = await deleteTransactionTool({
        workspaceId,
        transactionId: parsedIntent.transactionId || fallbackTransactionId,
      });
      if (result) {
        toolResult = {
          summaryText: 'Removi o lançamento anterior.',
          transactionId: result.transactionId,
          payload: result as unknown as Record<string, unknown>,
        };
      }
    } else if (parsedIntent.action === 'addGoalContribution' && parsedIntent.amount) {
      const result = await addGoalContributionTool({
        workspaceId,
        amount: parsedIntent.amount,
        goalNameHint: parsedIntent.goalName || parsedIntent.description || text,
      });
      if (result) {
        toolResult = {
          summaryText: `Adicionei ${formatCurrency(result.contributedAmount)} à meta ${result.goalName}.`,
          goalId: result.goalId,
          payload: result as unknown as Record<string, unknown>,
        };
      }
    } else if (parsedIntent.action === 'createGoal' && parsedIntent.targetAmount) {
      const goalName = parsedIntent.goalName || 'Nova Meta';
      const result = await createGoalTool({
        workspaceId,
        goalName,
        targetAmount: parsedIntent.targetAmount,
      });
      toolResult = {
        summaryText: `Meta ${result.goalName} criada com alvo de ${formatCurrency(result.targetAmount)}.`,
        goalId: result.goalId,
        payload: result as unknown as Record<string, unknown>,
      };
    } else if (parsedIntent.action === 'addInvestment' && parsedIntent.amount) {
      const result = await addInvestmentTool({
        workspaceId,
        amount: parsedIntent.amount,
        name: parsedIntent.investmentName,
        investmentType: parsedIntent.investmentType,
        institution: parsedIntent.institution,
      });
      toolResult = {
        summaryText: `Registrei ${formatCurrency(result.amount)} no investimento ${result.name}.`,
        payload: result as unknown as Record<string, unknown>,
      };
    } else if (parsedIntent.action === 'registerDebtPayment' && parsedIntent.amount) {
      const result = await registerDebtPaymentTool({
        workspaceId,
        amount: parsedIntent.amount,
        creditorHint: parsedIntent.debtCreditor || parsedIntent.description || text,
      });
      if (result) {
        toolResult = {
          summaryText: `Pagamento de ${formatCurrency(result.paidAmount)} registrado para ${result.creditor}.`,
          payload: result as unknown as Record<string, unknown>,
        };
      }
    } else if (parsedIntent.action === 'createCategory') {
      const result = await createCategoryTool({
        workspaceId,
        categoryHint: parsedIntent.categoryHint || parsedIntent.description || text,
      });
      toolResult = {
        summaryText: `Categoria ${result.categoryName} pronta para uso.`,
        payload: result as unknown as Record<string, unknown>,
      };
    }

    const summaryText = summaryFromTool({
      action: parsedIntent.action,
      toolResult: toolResult?.payload || null,
      fallback:
        toolResult?.summaryText ||
        'Preciso de um pouco mais de detalhe para executar essa ação financeira.',
    });

    await logFinancialAgentEvent({
      workspaceId,
      event: 'FINANCIAL_AGENT_TOOL_EXECUTED',
      payload: {
        messageId: input.messageId || null,
        toolName: parsedIntent.action,
        executed: Boolean(toolResult),
      },
    });

    await appendConversationMemory({
      workspaceId,
      userPhone: participant,
      messages: [
        {
          role: 'user',
          content: text,
        },
        {
          role: 'assistant',
          content: summaryText,
          metadata: {
            intent: parsedIntent.action,
            toolName: parsedIntent.action,
            toolResult: toolResult?.payload || null,
            transactionId: toolResult?.transactionId || null,
            goalId: toolResult?.goalId || null,
          },
        },
      ],
    });

    await logFinancialAgentEvent({
      workspaceId,
      event: 'FINANCIAL_AGENT_RESPONSE_GENERATED',
      payload: {
        messageId: input.messageId || null,
        action: parsedIntent.action,
        responsePreview: summaryText,
      },
    });

    return {
      handled: true,
      blockedByPlan: false,
      responseText: summaryText,
      responseMode,
      intent: parsedIntent.action,
      toolName: parsedIntent.action,
      toolResult: (toolResult?.payload as Record<string, unknown>) || null,
    };
  } catch (error) {
    await logFinancialAgentEvent({
      workspaceId,
      event: 'FINANCIAL_AGENT_ERROR',
      payload: {
        messageId: input.messageId || null,
        error: error instanceof Error ? error.message : String(error || 'unknown_error'),
      },
    });

    return {
      handled: true,
      blockedByPlan: false,
      responseText: 'Nao consegui concluir essa acao agora. Tente novamente em alguns segundos.',
      responseMode,
      intent: 'unknown',
      toolName: null,
      toolResult: null,
    };
  }
}

export { PREMIUM_ONLY_MESSAGE };
