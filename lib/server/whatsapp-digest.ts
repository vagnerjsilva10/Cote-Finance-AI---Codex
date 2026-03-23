import 'server-only';

import { prisma } from '@/lib/prisma';
import { buildFinancialInsights } from '@/lib/server/financial-insights';
import { logWorkspaceEventSafe } from '@/lib/server/multi-tenant';
import { hasWhatsAppCapabilityForSubscription } from '@/lib/server/whatsapp-capabilities';
import { ResolvedWorkspaceWhatsAppConfig } from '@/lib/server/whatsapp-config';
import {
  extractMetaMessageAcceptance,
  sendWhatsAppTemplate,
  sendWhatsAppTextMessage,
  WHATSAPP_TEMPLATES,
  WhatsAppApiError,
} from '@/lib/whatsapp';

const SAO_PAULO_TIMEZONE = 'America/Sao_Paulo';
const UPCOMING_WINDOW_DAYS = 30;

type DigestAgendaItem = {
  label: string;
  date: Date;
  amount: number;
  type: 'debt' | 'goal';
};

type ExpenseCategorySnapshot = {
  name: string;
  amount: number;
};

export type WhatsAppDigestResult =
  | {
      sent: true;
      preview: string;
      workspaceId: string;
      phoneNumber: string;
      deliveryMode: 'template' | 'text';
      messageId: string | null;
      messageIds: string[];
      templateName: string | null;
      reason?: never;
    }
  | {
      sent: false;
      preview?: string;
      workspaceId: string;
      phoneNumber?: string;
      reason: 'not_connected' | 'already_sent' | 'no_content' | 'workspace_not_found' | 'plan_not_eligible';
    };

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function formatDateLabel(date: Date) {
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    timeZone: SAO_PAULO_TIMEZONE,
  });
}

function getDateKey(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: SAO_PAULO_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getDaysUntil(date: Date, now: Date) {
  const diffMs = startOfDay(date).getTime() - startOfDay(now).getTime();
  return Math.round(diffMs / 86_400_000);
}

function getNextDueDate(dueDay: number, now: Date) {
  const year = now.getFullYear();
  const month = now.getMonth();
  const lastDayCurrentMonth = new Date(year, month + 1, 0).getDate();
  const currentCandidate = new Date(year, month, Math.min(dueDay, lastDayCurrentMonth));

  if (startOfDay(currentCandidate) >= startOfDay(now)) {
    return currentCandidate;
  }

  const nextMonthDate = new Date(year, month + 1, 1);
  const nextYear = nextMonthDate.getFullYear();
  const nextMonth = nextMonthDate.getMonth();
  const lastDayNextMonth = new Date(nextYear, nextMonth + 1, 0).getDate();
  return new Date(nextYear, nextMonth, Math.min(dueDay, lastDayNextMonth));
}

function buildUpcomingAgendaItems(params: {
  debts: Array<{
    creditor: string;
    remaining_amount: unknown;
    due_day: number;
    due_date?: Date | null;
    status: string;
  }>;
  recurringDebts: Array<{
    creditor: string;
    amount: unknown;
    next_due_date: Date;
    status: string;
  }>;
  goals: Array<{
    name: string;
    target_amount: unknown;
    current_amount: unknown;
    deadline: Date | null;
  }>;
  now?: Date;
}) {
  const now = params.now ?? new Date();
  const items: DigestAgendaItem[] = [];

  for (const debt of params.debts) {
    if (String(debt.status || '').toUpperCase() === 'PAID') continue;
    const nextDueDate = debt.due_date || getNextDueDate(Number(debt.due_day || 1), now);
    const daysUntil = getDaysUntil(nextDueDate, now);
    if (daysUntil < 0 || daysUntil > UPCOMING_WINDOW_DAYS) continue;

    items.push({
      label: debt.creditor,
      date: nextDueDate,
      amount: Number(debt.remaining_amount || 0),
      type: 'debt',
    });
  }

  for (const debt of params.recurringDebts) {
    if (String(debt.status || '').toUpperCase() !== 'ACTIVE') continue;
    const daysUntil = getDaysUntil(debt.next_due_date, now);
    if (daysUntil < 0 || daysUntil > UPCOMING_WINDOW_DAYS) continue;

    items.push({
      label: debt.creditor,
      date: debt.next_due_date,
      amount: Number(debt.amount || 0),
      type: 'debt',
    });
  }

  for (const goal of params.goals) {
    if (!goal.deadline) continue;
    if (Number(goal.current_amount || 0) >= Number(goal.target_amount || 0)) continue;
    const daysUntil = getDaysUntil(goal.deadline, now);
    if (daysUntil < 0 || daysUntil > UPCOMING_WINDOW_DAYS) continue;

    items.push({
      label: goal.name,
      date: goal.deadline,
      amount: Math.max(0, Number(goal.target_amount || 0) - Number(goal.current_amount || 0)),
      type: 'goal',
    });
  }

  return items.sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, 4);
}

function buildDigestMessage(params: {
  workspaceName: string;
  periodLabel: string;
  totalBalance: number;
  monthIncome: number;
  monthExpenses: number;
  monthNet: number;
  transactionsCount: number;
  topExpenseCategory: ExpenseCategorySnapshot | null;
  insights: string[];
  upcomingItems: DigestAgendaItem[];
}) {
  const lines: string[] = [
    `Cote Finance AI | Resumo de ${params.workspaceName}`,
    '',
    `Período: ${params.periodLabel}`,
    `Saldo atual: ${formatCurrency(params.totalBalance)}`,
    `Entradas do mês: ${formatCurrency(params.monthIncome)}`,
    `Saídas do mês: ${formatCurrency(params.monthExpenses)}`,
    `Resultado do mês: ${formatCurrency(params.monthNet)}`,
    `Movimentações registradas: ${params.transactionsCount}`,
  ];

  if (params.topExpenseCategory) {
    lines.push(
      `Categoria com maior peso: ${params.topExpenseCategory.name} (${formatCurrency(params.topExpenseCategory.amount)})`
    );
  }

  if (params.upcomingItems.length > 0) {
    lines.push('', 'Próximos compromissos:');
    for (const item of params.upcomingItems.slice(0, 3)) {
      const prefix = item.type === 'debt' ? 'Conta' : 'Meta';
      lines.push(`- ${prefix}: ${item.label} em ${formatDateLabel(item.date)} (${formatCurrency(item.amount)})`);
    }
  }

  if (params.insights.length > 0) {
    lines.push('', 'Insights de hoje:');
    for (const insight of params.insights.slice(0, 2)) {
      lines.push(`- ${insight}`);
    }
  }

  lines.push('', 'Abra o painel para acompanhar tudo com mais detalhes.');
  return lines.join('\n');
}

function buildDigestHighlights(params: {
  monthNet: number;
  topExpenseCategory: ExpenseCategorySnapshot | null;
  upcomingItems: DigestAgendaItem[];
  insights: string[];
}) {
  const parts: string[] = [];

  parts.push(
    params.monthNet >= 0
      ? `Resultado positivo de ${formatCurrency(params.monthNet)}`
      : `Resultado negativo de ${formatCurrency(Math.abs(params.monthNet))}`
  );

  if (params.topExpenseCategory) {
    parts.push(`Categoria líder: ${params.topExpenseCategory.name}`);
  }

  for (const item of params.upcomingItems.slice(0, 2)) {
    const prefix = item.type === 'debt' ? 'Conta' : 'Meta';
    parts.push(`${prefix}: ${item.label} em ${formatDateLabel(item.date)}`);
  }

  for (const insight of params.insights.slice(0, Math.max(0, 4 - parts.length))) {
    parts.push(insight);
  }

  return parts.join(' | ').slice(0, 1024);
}

function shouldFallbackToText(error: unknown) {
  if (!(error instanceof WhatsAppApiError)) return false;

  if (error.category === 'template') return true;
  if (/template/i.test(error.message)) return true;

  return [131058, 132000, 132001, 132007, 132012].includes(error.metaCode ?? -1);
}

export async function sendWorkspaceWhatsAppDigest(params: {
  workspaceId: string;
  force?: boolean;
  source?: 'cron' | 'manual';
  now?: Date;
  destinationOverride?: string | null;
  resolvedConfig?: Pick<ResolvedWorkspaceWhatsAppConfig, 'testPhoneNumber'>;
}) {
  const now = params.now ?? new Date();
  const workspace = await prisma.workspace.findUnique({
    where: { id: params.workspaceId },
    select: {
      id: true,
      name: true,
      whatsapp_phone_number: true,
      whatsapp_status: true,
      subscription: {
        select: {
          plan: true,
          status: true,
        },
      },
      wallets: {
        select: { balance: true },
      },
      transactions: {
        where: {
          date: {
            gte: new Date(now.getFullYear(), now.getMonth(), 1),
          },
        },
        select: {
          type: true,
          amount: true,
          date: true,
          category: {
            select: {
              name: true,
            },
          },
        },
        take: 250,
      },
      debts: {
        select: {
          creditor: true,
          remaining_amount: true,
          due_day: true,
          due_date: true,
          status: true,
        },
      },
      recurring_debts: {
        select: {
          creditor: true,
          amount: true,
          next_due_date: true,
          status: true,
        },
      },
      goals: {
        select: {
          name: true,
          target_amount: true,
          current_amount: true,
          deadline: true,
        },
      },
    },
  });

  if (!workspace) {
    return {
      sent: false,
      workspaceId: params.workspaceId,
      reason: 'workspace_not_found',
    } satisfies WhatsAppDigestResult;
  }

  const requiredCapability = params.source === 'manual' ? 'manual_test_send' : 'auto_daily_digest';
  const hasDigestCapability = hasWhatsAppCapabilityForSubscription({
    plan: workspace.subscription?.plan,
    status: workspace.subscription?.status,
    capability: requiredCapability,
  });

  if (!hasDigestCapability) {
    return {
      sent: false,
      workspaceId: workspace.id,
      phoneNumber: workspace.whatsapp_phone_number || undefined,
      reason: 'plan_not_eligible',
    } satisfies WhatsAppDigestResult;
  }

  const destinationPhone =
    params.destinationOverride?.trim() ||
    params.resolvedConfig?.testPhoneNumber?.trim() ||
    workspace.whatsapp_phone_number;

  if (
    workspace.whatsapp_status !== 'CONNECTED' ||
    typeof destinationPhone !== 'string' ||
    !destinationPhone
  ) {
    return {
      sent: false,
      workspaceId: workspace.id,
      phoneNumber: destinationPhone || undefined,
      reason: 'not_connected',
    } satisfies WhatsAppDigestResult;
  }

  const dateKey = getDateKey(now);
  const eventType =
    params.source === 'manual'
      ? `whatsapp.digest.preview.${dateKey}`
      : `whatsapp.daily_digest.sent.${dateKey}`;

  if (!params.force) {
    const existingEvent = await prisma.workspaceEvent.findFirst({
      where: {
        workspace_id: workspace.id,
        type: eventType,
      },
      select: { id: true },
    });

    if (existingEvent) {
      return {
        sent: false,
        workspaceId: workspace.id,
        phoneNumber: destinationPhone,
        reason: 'already_sent',
      } satisfies WhatsAppDigestResult;
    }
  }

  const totalBalance = workspace.wallets.reduce((acc, wallet) => acc + Number(wallet.balance || 0), 0);
  const monthIncome = workspace.transactions
    .filter((tx) => {
      const type = String(tx.type || '').toUpperCase();
      return type.includes('INCOME') || type === 'PIX_IN';
    })
    .reduce((acc, tx) => acc + Number(tx.amount || 0), 0);
  const monthExpenses = workspace.transactions
    .filter((tx) => {
      const type = String(tx.type || '').toUpperCase();
      return type.includes('EXPENSE') || type === 'PIX_OUT';
    })
    .reduce((acc, tx) => acc + Number(tx.amount || 0), 0);
  const monthNet = monthIncome - monthExpenses;
  const periodLabel = now.toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
    timeZone: SAO_PAULO_TIMEZONE,
  });
  const transactionsCount = workspace.transactions.length;
  const categoryExpenseMap = new Map<string, number>();
  for (const tx of workspace.transactions) {
    const type = String(tx.type || '').toUpperCase();
    if (!(type.includes('EXPENSE') || type === 'PIX_OUT')) continue;
    const categoryName = tx.category?.name || 'Outros';
    categoryExpenseMap.set(categoryName, (categoryExpenseMap.get(categoryName) || 0) + Number(tx.amount || 0));
  }
  const topExpenseCategory = [...categoryExpenseMap.entries()]
    .sort((a, b) => b[1] - a[1])[0];
  const insights = buildFinancialInsights(workspace.transactions as any, totalBalance, now);
  const upcomingItems = buildUpcomingAgendaItems({
    debts: workspace.debts,
    recurringDebts: workspace.recurring_debts,
    goals: workspace.goals,
    now,
  });

  if (insights.length === 0 && upcomingItems.length === 0 && monthIncome === 0 && monthExpenses === 0) {
    return {
      sent: false,
      workspaceId: workspace.id,
      phoneNumber: destinationPhone,
      reason: 'no_content',
    } satisfies WhatsAppDigestResult;
  }

  const preview = buildDigestMessage({
    workspaceName: workspace.name,
    periodLabel,
    totalBalance,
    monthIncome,
    monthExpenses,
    monthNet,
    transactionsCount,
    topExpenseCategory: topExpenseCategory
      ? { name: topExpenseCategory[0], amount: topExpenseCategory[1] }
      : null,
    insights,
    upcomingItems,
  });

  let deliveryMode: 'template' | 'text' = 'text';
  let acceptanceMessageIds: string[] = [];
  let templateName: string | null = null;

  try {
    const templateResponse = await sendWhatsAppTemplate({
      to: destinationPhone,
      templateName: WHATSAPP_TEMPLATES.DIGEST.name,
      languageCode: WHATSAPP_TEMPLATES.DIGEST.language,
      variables: [
        'cliente',
        workspace.name,
        periodLabel,
        formatCurrency(totalBalance),
        formatCurrency(monthIncome),
        formatCurrency(monthExpenses),
        buildDigestHighlights({
          monthNet,
          topExpenseCategory: topExpenseCategory
            ? { name: topExpenseCategory[0], amount: topExpenseCategory[1] }
            : null,
          upcomingItems,
          insights,
        }) || 'Abra o painel para acompanhar tudo com mais detalhes.',
      ],
    });
    deliveryMode = 'template';
    templateName = WHATSAPP_TEMPLATES.DIGEST.name;
    acceptanceMessageIds = extractMetaMessageAcceptance(templateResponse).messageIds;
  } catch (error) {
    if (!shouldFallbackToText(error)) {
      throw error;
    }

    const textResponse = await sendWhatsAppTextMessage({
      to: destinationPhone,
      text: preview,
    });
    deliveryMode = 'text';
    templateName = null;
    acceptanceMessageIds = extractMetaMessageAcceptance(textResponse).messageIds;
  }

  await logWorkspaceEventSafe({
    workspaceId: workspace.id,
    type: eventType,
    payload: {
      source: params.source ?? 'cron',
      monthIncome,
      monthExpenses,
      totalBalance,
      insightsSent: insights.slice(0, 2),
      agendaCount: upcomingItems.length,
      deliveryMode,
      phoneNumber: destinationPhone,
      messageIds: acceptanceMessageIds,
    },
  });

  return {
    sent: true,
    workspaceId: workspace.id,
    phoneNumber: destinationPhone,
    preview,
    deliveryMode,
    messageId: acceptanceMessageIds[0] ?? null,
    messageIds: acceptanceMessageIds,
    templateName,
  } satisfies WhatsAppDigestResult;
}



