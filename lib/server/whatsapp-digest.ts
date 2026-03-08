import 'server-only';

import { prisma } from '@/lib/prisma';
import { logWorkspaceEventSafe } from '@/lib/server/multi-tenant';
import { buildFinancialInsights } from '@/lib/server/financial-insights';
import { sendWhatsAppTextMessage } from '@/lib/whatsapp';

const SAO_PAULO_TIMEZONE = 'America/Sao_Paulo';
const UPCOMING_WINDOW_DAYS = 30;

type DigestAgendaItem = {
  label: string;
  date: Date;
  amount: number;
  type: 'debt' | 'goal';
};

export type WhatsAppDigestResult =
  | {
      sent: true;
      preview: string;
      workspaceId: string;
      phoneNumber: string;
      reason?: never;
    }
  | {
      sent: false;
      preview?: string;
      workspaceId: string;
      phoneNumber?: string;
      reason:
        | 'not_connected'
        | 'already_sent'
        | 'no_content'
        | 'workspace_not_found';
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
    const nextDueDate = getNextDueDate(Number(debt.due_day || 1), now);
    const daysUntil = getDaysUntil(nextDueDate, now);
    if (daysUntil < 0 || daysUntil > UPCOMING_WINDOW_DAYS) continue;

    items.push({
      label: debt.creditor,
      date: nextDueDate,
      amount: Number(debt.remaining_amount || 0),
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
  totalBalance: number;
  monthIncome: number;
  monthExpenses: number;
  insights: string[];
  upcomingItems: DigestAgendaItem[];
}) {
  const lines: string[] = [
    `Cote Finance AI | Resumo de ${params.workspaceName}`,
    '',
    `Saldo atual: ${formatCurrency(params.totalBalance)}`,
    `Entradas do m\u00eas: ${formatCurrency(params.monthIncome)}`,
    `Sa\u00eddas do m\u00eas: ${formatCurrency(params.monthExpenses)}`,
  ];

  if (params.upcomingItems.length > 0) {
    lines.push('', 'Pr\u00f3ximos compromissos:');
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

export async function sendWorkspaceWhatsAppDigest(params: {
  workspaceId: string;
  force?: boolean;
  source?: 'cron' | 'manual';
  now?: Date;
}) {
  const now = params.now ?? new Date();
  const workspace = await prisma.workspace.findUnique({
    where: { id: params.workspaceId },
    select: {
      id: true,
      name: true,
      whatsapp_phone_number: true,
      whatsapp_status: true,
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

  if (
    workspace.whatsapp_status !== 'CONNECTED' ||
    typeof workspace.whatsapp_phone_number !== 'string' ||
    !workspace.whatsapp_phone_number
  ) {
    return {
      sent: false,
      workspaceId: workspace.id,
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
        phoneNumber: workspace.whatsapp_phone_number,
        reason: 'already_sent',
      } satisfies WhatsAppDigestResult;
    }
  }

  const totalBalance = workspace.wallets.reduce(
    (acc, wallet) => acc + Number(wallet.balance || 0),
    0
  );
  const monthIncome = workspace.transactions
    .filter((tx) => String(tx.type || '').toUpperCase().includes('INCOME') || String(tx.type || '').toUpperCase() === 'PIX_IN')
    .reduce((acc, tx) => acc + Number(tx.amount || 0), 0);
  const monthExpenses = workspace.transactions
    .filter((tx) => {
      const type = String(tx.type || '').toUpperCase();
      return type.includes('EXPENSE') || type === 'PIX_OUT';
    })
    .reduce((acc, tx) => acc + Number(tx.amount || 0), 0);
  const insights = buildFinancialInsights(workspace.transactions as any, totalBalance, now);
  const upcomingItems = buildUpcomingAgendaItems({
    debts: workspace.debts,
    goals: workspace.goals,
    now,
  });

  if (insights.length === 0 && upcomingItems.length === 0 && monthIncome === 0 && monthExpenses === 0) {
    return {
      sent: false,
      workspaceId: workspace.id,
      phoneNumber: workspace.whatsapp_phone_number,
      reason: 'no_content',
    } satisfies WhatsAppDigestResult;
  }

  const preview = buildDigestMessage({
    workspaceName: workspace.name,
    totalBalance,
    monthIncome,
    monthExpenses,
    insights,
    upcomingItems,
  });

  await sendWhatsAppTextMessage({
    to: workspace.whatsapp_phone_number,
    text: preview,
  });

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
    },
  });

  return {
    sent: true,
    workspaceId: workspace.id,
    phoneNumber: workspace.whatsapp_phone_number,
    preview,
  } satisfies WhatsAppDigestResult;
}

