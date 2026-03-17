import 'server-only';

import { prisma } from '@/lib/prisma';
import { logWorkspaceEventSafe } from '@/lib/server/multi-tenant';
import { sendWhatsAppTextMessage } from '@/lib/whatsapp';

const SAO_PAULO_TIMEZONE = 'America/Sao_Paulo';
const UPCOMING_WINDOW_DAYS = 7;

type AlertKind = 'low_balance' | 'high_spending' | 'upcoming_due' | 'category_spike' | 'goal_overdue' | 'recurring_heavy';
const RECURRING_BILL_CATEGORIES = ['Ãgua', 'Luz', 'Internet', 'Aluguel', 'Telefone', 'CondomÃ­nio', 'Assinatura'];

type WorkspaceAlert = {
  kind: AlertKind;
  title: string;
  message: string;
};

export type WhatsAppAlertsResult =
  | {
      sent: true;
      workspaceId: string;
      phoneNumber: string;
      plan: string;
      alerts: WorkspaceAlert[];
      count: number;
    }
  | {
      sent: false;
      workspaceId: string;
      phoneNumber?: string;
      plan?: string;
      alerts?: WorkspaceAlert[];
      count?: number;
      reason: 'workspace_not_found' | 'not_connected' | 'no_alerts' | 'already_sent';
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
    month: '2-digit',
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

function buildAlertMessage(workspaceName: string, alerts: WorkspaceAlert[]) {
  const lines = [`Cote Finance AI | Alertas do workspace ${workspaceName}`, ''];

  for (const alert of alerts) {
    lines.push(`${alert.title}: ${alert.message}`);
  }

  return lines.join('\n');
}

export async function sendWorkspaceWhatsAppAlerts(params: {
  workspaceId: string;
  now?: Date;
  force?: boolean;
  source?: 'cron' | 'manual';
}) {
  const now = params.now ?? new Date();
  const force = params.force === true;
  const source = params.source || 'cron';
  const dateKey = getDateKey(now);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

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
            gte: prevMonthStart,
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
      },
      goals: {
        where: {
          deadline: {
            not: null,
          },
        },
        select: {
          name: true,
          current_amount: true,
          target_amount: true,
          deadline: true,
        },
      },
      debts: {
        where: {
          status: 'ACTIVE',
        },
        select: {
          creditor: true,
          category: true,
          remaining_amount: true,
          due_day: true,
        },
      },
    },
  });

  if (!workspace) {
    return {
      sent: false,
      workspaceId: params.workspaceId,
      reason: 'workspace_not_found',
    } satisfies WhatsAppAlertsResult;
  }

  const destinationPhone = workspace.whatsapp_phone_number?.trim() || '';
  const plan = String(workspace.subscription?.plan || 'FREE').toUpperCase();
  const status = String(workspace.subscription?.status || 'INACTIVE').toUpperCase();

  if (workspace.whatsapp_status !== 'CONNECTED' || !destinationPhone || status !== 'ACTIVE') {
    return {
      sent: false,
      workspaceId: workspace.id,
      phoneNumber: destinationPhone || undefined,
      plan,
      reason: 'not_connected',
    } satisfies WhatsAppAlertsResult;
  }

  const totalBalance = workspace.wallets.reduce((acc, wallet) => acc + Number(wallet.balance || 0), 0);
  const currentMonthTransactions = workspace.transactions.filter((tx) => tx.date >= monthStart);
  const prevMonthTransactions = workspace.transactions.filter(
    (tx) => tx.date >= prevMonthStart && tx.date <= prevMonthEnd
  );

  const sumByType = (items: typeof workspace.transactions, type: 'INCOME' | 'EXPENSE') =>
    items
      .filter((tx) => {
        const normalizedType = String(tx.type || '').toUpperCase();
        if (type === 'INCOME') return normalizedType === 'INCOME' || normalizedType === 'PIX_IN';
        return normalizedType === 'EXPENSE' || normalizedType === 'PIX_OUT';
      })
      .reduce((acc, tx) => acc + Number(tx.amount || 0), 0);

  const currentExpense = sumByType(currentMonthTransactions, 'EXPENSE');
  const prevExpense = sumByType(prevMonthTransactions, 'EXPENSE');
  const alerts: WorkspaceAlert[] = [];

  if (currentExpense > 0) {
    const lowBalanceThreshold = Math.max(100, currentExpense * 0.25);
    if (totalBalance <= 0 || totalBalance <= lowBalanceThreshold) {
      alerts.push({
        kind: 'low_balance',
        title: 'Saldo baixo',
        message: `Seu saldo atual estÃ¡ em ${formatCurrency(totalBalance)} e merece atenÃ§Ã£o nesta semana.`,
      });
    }
  }

  if (plan === 'PREMIUM' && prevExpense > 0) {
    const delta = ((currentExpense - prevExpense) / prevExpense) * 100;
    if (delta >= 20) {
      alerts.push({
        kind: 'high_spending',
        title: 'Gasto acima da mÃ©dia',
        message: `Suas saÃ­das subiram ${delta.toFixed(1)}% em relaÃ§Ã£o ao mÃªs anterior.`,
      });
    }
  }

  if (plan === 'PREMIUM') {
    const currentExpenseByCategory = new Map<string, number>();
    const previousExpenseByCategory = new Map<string, number>();

    for (const tx of currentMonthTransactions) {
      const normalizedType = String(tx.type || '').toUpperCase();
      if (normalizedType !== 'EXPENSE' && normalizedType !== 'PIX_OUT') continue;
      const categoryName = tx.category?.name || 'Outros';
      currentExpenseByCategory.set(
        categoryName,
        (currentExpenseByCategory.get(categoryName) || 0) + Number(tx.amount || 0)
      );
    }

    for (const tx of prevMonthTransactions) {
      const normalizedType = String(tx.type || '').toUpperCase();
      if (normalizedType !== 'EXPENSE' && normalizedType !== 'PIX_OUT') continue;
      const categoryName = tx.category?.name || 'Outros';
      previousExpenseByCategory.set(
        categoryName,
        (previousExpenseByCategory.get(categoryName) || 0) + Number(tx.amount || 0)
      );
    }

    const topCurrentCategory = [...currentExpenseByCategory.entries()].sort((a, b) => b[1] - a[1])[0];
    if (topCurrentCategory) {
      const previousAmount = previousExpenseByCategory.get(topCurrentCategory[0]) || 0;
      const categoryShare = currentExpense > 0 ? (topCurrentCategory[1] / currentExpense) * 100 : 0;
      const categoryDelta =
        previousAmount > 0 ? ((topCurrentCategory[1] - previousAmount) / previousAmount) * 100 : null;

      if (categoryShare >= 35 || (categoryDelta !== null && categoryDelta >= 30)) {
        alerts.push({
          kind: 'category_spike',
          title: 'Categoria em destaque',
          message:
            categoryDelta !== null && categoryDelta >= 30
              ? `${topCurrentCategory[0]} subiu ${categoryDelta.toFixed(1)}% e jÃ¡ soma ${formatCurrency(topCurrentCategory[1])} no mÃªs.`
              : `${topCurrentCategory[0]} concentra ${categoryShare.toFixed(1)}% das saÃ­das do mÃªs, com ${formatCurrency(topCurrentCategory[1])}.`,
        });
      }
    }
  }

  const upcomingDebts = workspace.debts
    .map((debt) => ({
      creditor: debt.creditor,
      amount: Number(debt.remaining_amount || 0),
      nextDueDate: getNextDueDate(Number(debt.due_day || 1), now),
    }))
    .map((item) => ({
      ...item,
      daysUntil: getDaysUntil(item.nextDueDate, now),
    }))
    .filter((item) => item.daysUntil >= 0 && item.daysUntil <= UPCOMING_WINDOW_DAYS)
    .sort((a, b) => a.nextDueDate.getTime() - b.nextDueDate.getTime());

  if (upcomingDebts.length > 0) {
    const topDebt = upcomingDebts[0];
    alerts.push({
      kind: 'upcoming_due',
      title: 'Vencimento prÃ³ximo',
      message: `${topDebt.creditor} vence em ${formatDateLabel(topDebt.nextDueDate)} com ${formatCurrency(topDebt.amount)} em aberto.`,
    });
  }

  const overdueGoals = workspace.goals
    .map((goal) => ({
      name: goal.name,
      deadline: goal.deadline,
      currentAmount: Number(goal.current_amount || 0),
      targetAmount: Number(goal.target_amount || 0),
    }))
    .filter(
      (goal) =>
        goal.deadline &&
        goal.targetAmount > goal.currentAmount &&
        startOfDay(goal.deadline).getTime() < startOfDay(now).getTime()
    )
    .sort((a, b) => {
      const left = a.deadline ? a.deadline.getTime() : 0;
      const right = b.deadline ? b.deadline.getTime() : 0;
      return left - right;
    });

  if (overdueGoals.length > 0) {
    const topGoal = overdueGoals[0];
    alerts.push({
      kind: 'goal_overdue',
      title: 'Meta atrasada',
      message: `${topGoal.name} venceu em ${formatDateLabel(topGoal.deadline as Date)} e ainda faltam ${formatCurrency(
        Math.max(0, topGoal.targetAmount - topGoal.currentAmount)
      )}.`,
    });
  }

  if (plan !== 'FREE') {
    const recurringDebts = workspace.debts.filter((debt) =>
      RECURRING_BILL_CATEGORIES.includes(String(debt.category || ''))
    );
    const recurringTotal = recurringDebts.reduce(
      (acc, debt) => acc + Number(debt.remaining_amount || 0),
      0
    );

    if (recurringDebts.length > 0 && currentExpense > 0) {
      const recurringShare = (recurringTotal / currentExpense) * 100;
      if (recurringShare >= 30 || recurringTotal >= 500) {
        alerts.push({
          kind: 'recurring_heavy',
          title: 'RecorrÃªncia pesada',
          message: `As contas recorrentes jÃ¡ somam ${formatCurrency(recurringTotal)} e representam ${recurringShare.toFixed(
            1
          )}% das saÃ­das do mÃªs.`,
        });
      }
    }
  }

  if (alerts.length === 0) {
    return {
      sent: false,
      workspaceId: workspace.id,
      phoneNumber: destinationPhone,
      plan,
      reason: 'no_alerts',
    } satisfies WhatsAppAlertsResult;
  }

  const kindsToSend: WorkspaceAlert[] = [];
  for (const alert of alerts) {
    if (force) {
      kindsToSend.push(alert);
      continue;
    }

    const eventType = `whatsapp.alert.sent.${alert.kind}.${dateKey}`;
    const existing = await prisma.workspaceEvent.findFirst({
      where: {
        workspace_id: workspace.id,
        type: eventType,
      },
      select: { id: true },
    });

    if (!existing) {
      kindsToSend.push(alert);
    }
  }

  if (kindsToSend.length === 0) {
    return {
      sent: false,
      workspaceId: workspace.id,
      phoneNumber: destinationPhone,
      plan,
      alerts,
      count: 0,
      reason: 'already_sent',
    } satisfies WhatsAppAlertsResult;
  }

  const message = buildAlertMessage(workspace.name, kindsToSend);
  await sendWhatsAppTextMessage({
    to: destinationPhone,
    text: message,
  });

  for (const alert of kindsToSend) {
    await logWorkspaceEventSafe({
      workspaceId: workspace.id,
      type: `whatsapp.alert.sent.${alert.kind}.${dateKey}`,
      payload: {
        plan,
        title: alert.title,
        message: alert.message,
        source,
      },
    });
  }

  return {
    sent: true,
    workspaceId: workspace.id,
    phoneNumber: destinationPhone,
    plan,
    alerts: kindsToSend,
    count: kindsToSend.length,
  } satisfies WhatsAppAlertsResult;
}
