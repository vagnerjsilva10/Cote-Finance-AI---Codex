import 'server-only';

import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import type { ReportsOverviewPayload } from '@/domain/reports/report-overview';
import {
  getComparisonRange,
  getDatePartsInTimeZone,
  resolveDateRange,
  toDateKeyInTimeZone,
  zonedDateTimeToUtc,
  type DateRangeSelection,
  type ResolvedDateRange,
} from '@/lib/date/period-resolver';

type DecimalLike = Prisma.Decimal | number | string | null;

type TransactionRow = {
  id: string;
  amount: DecimalLike;
  type: string;
  description: string;
  date: Date;
  due_date: Date | null;
  category_name: string | null;
  status: string | null;
};

type GoalRow = {
  id: string;
  name: string;
  target_amount: DecimalLike;
  current_amount: DecimalLike;
  deadline: Date | null;
};

const numberFrom = (value: DecimalLike) => Number(value || 0);
const PALETTE = ['var(--primary)', 'var(--text-secondary)', 'var(--positive)', 'var(--danger)', 'var(--text-muted)'];

function normalizeTransactionType(rawType: string) {
  const normalized = String(rawType || '').trim().toUpperCase();
  if (normalized === 'PIX_IN') return 'INCOME';
  if (normalized === 'PIX_OUT') return 'EXPENSE';
  return normalized;
}

function isConfirmedStatus(status: string | null | undefined) {
  return String(status || 'CONFIRMED').trim().toUpperCase() === 'CONFIRMED';
}

function isPendingStatus(status: string | null | undefined) {
  return String(status || '').trim().toUpperCase() === 'PENDING';
}

function isIncomeType(type: string) {
  const normalized = normalizeTransactionType(type);
  return normalized === 'INCOME';
}

function isExpenseType(type: string) {
  const normalized = normalizeTransactionType(type);
  return normalized === 'EXPENSE';
}

function inRange(value: Date, range: { start: Date; end: Date }) {
  const ms = value.getTime();
  return ms >= range.start.getTime() && ms <= range.end.getTime();
}

function buildWindowSeries(params: {
  range: ResolvedDateRange;
  rows: TransactionRow[];
  windows: number;
}) {
  const totalDays = Math.max(1, params.range.totalDays);
  const windowCount = Math.max(1, Math.min(params.windows, totalDays));
  const chunkSizeDays = Math.max(1, Math.ceil(totalDays / windowCount));
  const dayMs = 86_400_000;

  const buckets = Array.from({ length: windowCount }, (_, index) => {
    const start = new Date(params.range.start.getTime() + index * chunkSizeDays * dayMs);
    const end = new Date(
      Math.min(
        params.range.end.getTime(),
        start.getTime() + chunkSizeDays * dayMs - 1
      )
    );

    return {
      label:
        start.getMonth() === end.getMonth() && start.getDate() === end.getDate()
          ? start.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
          : `${start.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}-${end.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`,
      income: 0,
      expense: 0,
      start,
      end,
    };
  });

  for (const row of params.rows) {
    if (!isConfirmedStatus(row.status)) continue;
    if (!inRange(row.date, params.range)) continue;

    const dayOffset = Math.floor((row.date.getTime() - params.range.start.getTime()) / dayMs);
    const index = Math.max(0, Math.min(windowCount - 1, Math.floor(dayOffset / chunkSizeDays)));
    const amount = numberFrom(row.amount);

    if (isIncomeType(row.type)) {
      buckets[index].income += amount;
    } else if (isExpenseType(row.type)) {
      buckets[index].expense += amount;
    }
  }

  return buckets.map((bucket) => ({
    label: bucket.label,
    income: bucket.income,
    expense: bucket.expense,
  }));
}

function buildCategoryData(rows: TransactionRow[]) {
  const categoryTotals = new Map<string, number>();

  for (const row of rows) {
    if (!isConfirmedStatus(row.status)) continue;
    if (!isExpenseType(row.type)) continue;

    const category = row.category_name || 'Outros';
    categoryTotals.set(category, (categoryTotals.get(category) || 0) + numberFrom(row.amount));
  }

  return Array.from(categoryTotals.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name, value], index) => ({
      name,
      value,
      color: PALETTE[index % PALETTE.length],
    }));
}

function summarizeFlows(rows: TransactionRow[]) {
  let totalIncome = 0;
  let totalExpenses = 0;

  for (const row of rows) {
    if (!isConfirmedStatus(row.status)) continue;

    const amount = numberFrom(row.amount);
    if (isIncomeType(row.type)) totalIncome += amount;
    if (isExpenseType(row.type)) totalExpenses += amount;
  }

  return {
    totalIncome,
    totalExpenses,
    balance: totalIncome - totalExpenses,
  };
}

function buildExpenseDeepDive(currentRows: TransactionRow[], previousRows: TransactionRow[]) {
  const currentExpenses = currentRows.filter((row) => isConfirmedStatus(row.status) && isExpenseType(row.type));
  const previousExpenses = previousRows.filter((row) => isConfirmedStatus(row.status) && isExpenseType(row.type));

  const currentMonthTotal = currentExpenses.reduce((acc, row) => acc + numberFrom(row.amount), 0);
  const previousMonthTotal = previousExpenses.reduce((acc, row) => acc + numberFrom(row.amount), 0);

  const currentCategoryMap = new Map<string, number>();
  const previousCategoryMap = new Map<string, number>();
  const recurringMap = new Map<string, { name: string; count: number; total: number }>();

  let largestExpense: ReportsOverviewPayload['expenseDeepDive']['largestExpense'] = null;

  for (const row of currentExpenses) {
    const category = row.category_name || 'Outros';
    const amount = numberFrom(row.amount);

    currentCategoryMap.set(category, (currentCategoryMap.get(category) || 0) + amount);

    const recurring = recurringMap.get(category) || { name: category, count: 0, total: 0 };
    recurring.count += 1;
    recurring.total += amount;
    recurringMap.set(category, recurring);

    if (!largestExpense || amount > largestExpense.amount) {
      largestExpense = {
        id: row.id,
        amount,
        description: row.description || category,
        category,
        date: row.date.toISOString(),
      };
    }
  }

  for (const row of previousExpenses) {
    const category = row.category_name || 'Outros';
    previousCategoryMap.set(category, (previousCategoryMap.get(category) || 0) + numberFrom(row.amount));
  }

  const topCurrentCategory = Array.from(currentCategoryMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value }))[0] ?? null;

  const growingCategories = Array.from(currentCategoryMap.entries())
    .map(([name, currentValue]) => {
      const previousValue = previousCategoryMap.get(name) ?? 0;
      const diff = currentValue - previousValue;
      const variation = previousValue > 0 ? (diff / previousValue) * 100 : currentValue > 0 ? 100 : 0;
      return { name, currentValue, previousValue, diff, variation };
    })
    .filter((item) => item.currentValue > 0 && item.diff > 0)
    .sort((a, b) => b.diff - a.diff)
    .slice(0, 3);

  const recurringHeavyCategories = Array.from(recurringMap.values())
    .filter((item) => item.count >= 2)
    .sort((a, b) => b.total - a.total)
    .slice(0, 3);

  return {
    currentMonthTotal,
    previousMonthTotal,
    monthOverMonthVariation:
      previousMonthTotal > 0 ? ((currentMonthTotal - previousMonthTotal) / previousMonthTotal) * 100 : null,
    topCurrentCategory,
    growingCategories,
    recurringHeavyCategories,
    largestExpense,
  };
}

function buildForecast(params: {
  currentBalance: number;
  pendingRows: TransactionRow[];
  timeZone: string;
}) {
  const now = new Date();
  const nowParts = getDatePartsInTimeZone(now, params.timeZone);
  const todayStart = zonedDateTimeToUtc({
    timeZone: params.timeZone,
    year: nowParts.year,
    month: nowParts.month,
    day: nowParts.day,
    hour: 0,
    minute: 0,
    second: 0,
    millisecond: 0,
  });

  const byDate = new Map<string, { inflow: number; outflow: number }>();
  for (const row of params.pendingRows) {
    if (!isPendingStatus(row.status)) continue;
    const effectiveDate = row.due_date || row.date;
    const key = toDateKeyInTimeZone(effectiveDate, params.timeZone);
    const bucket = byDate.get(key) || { inflow: 0, outflow: 0 };
    const amount = numberFrom(row.amount);
    if (isIncomeType(row.type)) bucket.inflow += amount;
    if (isExpenseType(row.type)) bucket.outflow += amount;
    byDate.set(key, bucket);
  }

  let rollingBalance = params.currentBalance;
  const points = Array.from({ length: 30 }, (_, index) => {
    const cursor = new Date(todayStart.getTime() + index * 86_400_000);
    const key = toDateKeyInTimeZone(cursor, params.timeZone);
    const bucket = byDate.get(key) || { inflow: 0, outflow: 0 };

    const openingBalance = rollingBalance;
    const closingBalance = openingBalance + bucket.inflow - bucket.outflow;
    rollingBalance = closingBalance;

    return {
      day: index + 1,
      openingBalance,
      closingBalance,
    };
  });

  const projectedNegativeInDays = points.find((point) => point.closingBalance < 0)?.day ?? null;
  const first = points[0];
  const last = points[points.length - 1];
  const dailyNetFlow = points.length > 0 ? (last.closingBalance - first.openingBalance) / points.length : 0;

  return {
    projections: [7, 15, 30].map((days) => ({
      days,
      projectedBalance: points[Math.max(0, Math.min(days - 1, points.length - 1))]?.closingBalance ?? params.currentBalance,
    })),
    dailyNetFlow,
    trend: dailyNetFlow > 5 ? ('positive' as const) : dailyNetFlow < -5 ? ('negative' as const) : ('stable' as const),
    projectedNegativeInDays,
    source: 'read-model' as const,
  };
}

export async function buildReportsOverview(
  workspaceId: string,
  selection?: Partial<DateRangeSelection>
): Promise<ReportsOverviewPayload> {
  const now = new Date();
  const range = resolveDateRange({
    period: selection?.period,
    startDate: selection?.startDate,
    endDate: selection?.endDate,
    timeZone: selection?.timeZone,
    now,
  });
  const comparisonRange = getComparisonRange(range);

  const [wallets, transactionRowsRaw, goals] = await Promise.all([
    prisma.wallet.findMany({
      where: { workspace_id: workspaceId },
      select: { balance: true },
    }),
    prisma.transaction.findMany({
      where: {
        workspace_id: workspaceId,
        date: {
          gte: comparisonRange.start,
          lte: range.end,
        },
      },
      orderBy: [{ date: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        amount: true,
        type: true,
        description: true,
        date: true,
        due_date: true,
        status: true,
        category: {
          select: {
            name: true,
          },
        },
      },
    }),
    prisma.goal.findMany({
      where: { workspace_id: workspaceId },
      select: {
        id: true,
        name: true,
        target_amount: true,
        current_amount: true,
        deadline: true,
      },
    }) as Promise<GoalRow[]>,
  ]);

  const transactionRows: TransactionRow[] = transactionRowsRaw.map((row) => ({
    id: row.id,
    amount: row.amount,
    type: row.type,
    description: row.description,
    date: row.date,
    due_date: row.due_date,
    status: row.status,
    category_name: row.category?.name || null,
  }));

  const currentRows = transactionRows.filter((row) => inRange(row.date, range));
  const previousRows = transactionRows.filter((row) => inRange(row.date, comparisonRange));

  const currentBalance = wallets.reduce((acc, wallet) => acc + numberFrom(wallet.balance), 0);
  const summary = summarizeFlows(currentRows);
  const revenueExpense12Months = buildWindowSeries({
    range,
    rows: currentRows,
    windows: 12,
  });
  const savingsRate6Months = buildWindowSeries({
    range,
    rows: currentRows,
    windows: 6,
  }).map((item) => ({
    ...item,
    savingsRate: item.income > 0 ? ((item.income - item.expense) / item.income) * 100 : 0,
  }));
  const categoryData = buildCategoryData(currentRows);
  const expenseDeepDive = buildExpenseDeepDive(currentRows, previousRows);

  const pendingRows = transactionRows.filter((row) => isPendingStatus(row.status));
  const balanceForecast = buildForecast({
    currentBalance,
    pendingRows,
    timeZone: range.timeZone,
  });

  const premiumSmartAlerts: ReportsOverviewPayload['premiumSmartAlerts'] = [];
  if (balanceForecast.projectedNegativeInDays !== null && balanceForecast.projectedNegativeInDays <= 30) {
    premiumSmartAlerts.push({
      id: 'premium-balance-risk',
      title: 'Alerta inteligente: risco de saldo',
      message: `No ritmo atual, seu saldo pode ficar negativo em cerca de ${balanceForecast.projectedNegativeInDays} dias.`,
      tone: 'error',
      targetTab: 'reports',
    });
  }

  if (
    expenseDeepDive.previousMonthTotal > 0 &&
    expenseDeepDive.currentMonthTotal > expenseDeepDive.previousMonthTotal * 1.18
  ) {
    const variation = Math.round(
      ((expenseDeepDive.currentMonthTotal - expenseDeepDive.previousMonthTotal) /
        expenseDeepDive.previousMonthTotal) *
        100
    );
    premiumSmartAlerts.push({
      id: 'premium-expense-spike',
      title: 'Alerta inteligente: gastos acima do periodo anterior',
      message: `As saidas subiram ${variation}% em comparacao com o periodo anterior equivalente.`,
      tone: 'warning',
      targetTab: 'reports',
    });
  }

  const riskyGoal = goals
    .filter((goal) => goal.deadline && numberFrom(goal.current_amount) < numberFrom(goal.target_amount))
    .map((goal) => {
      const daysUntilDeadline = Math.ceil((goal.deadline!.getTime() - now.getTime()) / 86_400_000);
      const remaining = Math.max(0, numberFrom(goal.target_amount) - numberFrom(goal.current_amount));
      return { goal, daysUntilDeadline, remaining };
    })
    .filter((item) => item.daysUntilDeadline >= 0 && item.daysUntilDeadline <= 30)
    .sort((a, b) => a.daysUntilDeadline - b.daysUntilDeadline)[0];

  if (riskyGoal) {
    premiumSmartAlerts.push({
      id: `premium-goal-risk-${riskyGoal.goal.id}`,
      title: 'Alerta inteligente: meta em risco',
      message: `A meta ${riskyGoal.goal.name} vence em ${riskyGoal.daysUntilDeadline} dias e ainda faltam R$ ${riskyGoal.remaining.toFixed(2).replace('.', ',')}.`,
      tone: 'warning',
      targetTab: 'goals',
    });
  }

  if (premiumSmartAlerts.length === 0) {
    premiumSmartAlerts.push({
      id: 'premium-smart-alerts-ok',
      title: 'Alertas inteligentes monitorando seu caixa',
      message: 'Nenhum sinal critico foi detectado agora. Seu fluxo esta estavel e dentro do esperado.',
      tone: 'success',
      targetTab: 'reports',
    });
  }

  return {
    generatedAt: now.toISOString(),
    summary,
    revenueExpense12Months,
    savingsRate6Months,
    categoryData,
    expenseDeepDive,
    balanceForecast,
    premiumSmartAlerts,
  };
}
