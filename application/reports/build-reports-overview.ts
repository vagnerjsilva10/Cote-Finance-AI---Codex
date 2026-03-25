import 'server-only';

import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import type { ReportsOverviewPayload } from '@/domain/reports/report-overview';

type DecimalLike = Prisma.Decimal | number | string | null;

const numberFrom = (value: DecimalLike) => Number(value || 0);
const PALETTE = ['var(--primary)', 'var(--text-secondary)', 'var(--positive)', 'var(--danger)', 'var(--text-muted)'];

type MonthlyRow = {
  month: Date;
  income: DecimalLike;
  expense: DecimalLike;
};

type CategoryRow = {
  name: string;
  total: DecimalLike;
};

type TransactionRow = {
  id: string;
  amount: DecimalLike;
  type: string;
  description: string;
  date: Date;
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

export async function buildReportsOverview(workspaceId: string): Promise<ReportsOverviewPayload> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const series12Start = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  const series6Start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const next30DaysEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 30, 23, 59, 59, 999);

  const [wallets, series12Rows, series6Rows, categoryRows, allTransactions, goals, forecastRows] =
    await Promise.all([
      prisma.wallet.findMany({
        where: { workspace_id: workspaceId },
        select: { balance: true },
      }),
      prisma.$queryRaw<MonthlyRow[]>(Prisma.sql`
        SELECT
          DATE_TRUNC('month', "date") AS month,
          COALESCE(SUM(CASE WHEN UPPER(COALESCE("status", 'CONFIRMED')) = 'CONFIRMED' AND UPPER("type") IN ('INCOME', 'PIX_IN') THEN "amount" ELSE 0 END), 0) AS income,
          COALESCE(SUM(CASE WHEN UPPER(COALESCE("status", 'CONFIRMED')) = 'CONFIRMED' AND UPPER("type") IN ('EXPENSE', 'PIX_OUT') THEN "amount" ELSE 0 END), 0) AS expense
        FROM "Transaction"
        WHERE "workspace_id" = ${workspaceId}
          AND "date" >= ${series12Start}
          AND "date" < ${nextMonthStart}
        GROUP BY 1
        ORDER BY 1 ASC
      `),
      prisma.$queryRaw<MonthlyRow[]>(Prisma.sql`
        SELECT
          DATE_TRUNC('month', "date") AS month,
          COALESCE(SUM(CASE WHEN UPPER(COALESCE("status", 'CONFIRMED')) = 'CONFIRMED' AND UPPER("type") IN ('INCOME', 'PIX_IN') THEN "amount" ELSE 0 END), 0) AS income,
          COALESCE(SUM(CASE WHEN UPPER(COALESCE("status", 'CONFIRMED')) = 'CONFIRMED' AND UPPER("type") IN ('EXPENSE', 'PIX_OUT') THEN "amount" ELSE 0 END), 0) AS expense
        FROM "Transaction"
        WHERE "workspace_id" = ${workspaceId}
          AND "date" >= ${series6Start}
          AND "date" < ${nextMonthStart}
        GROUP BY 1
        ORDER BY 1 ASC
      `),
      prisma.$queryRaw<CategoryRow[]>(Prisma.sql`
        SELECT
          COALESCE("Category"."name", 'Outros') AS name,
          COALESCE(SUM("Transaction"."amount"), 0) AS total
        FROM "Transaction"
        LEFT JOIN "Category" ON "Category"."id" = "Transaction"."category_id"
        WHERE "Transaction"."workspace_id" = ${workspaceId}
          AND UPPER(COALESCE("Transaction"."status", 'CONFIRMED')) = 'CONFIRMED'
          AND UPPER("Transaction"."type") IN ('EXPENSE', 'PIX_OUT')
        GROUP BY 1
        ORDER BY total DESC
      `),
      prisma.$queryRaw<TransactionRow[]>(Prisma.sql`
        SELECT
          "Transaction"."id",
          "Transaction"."amount",
          "Transaction"."type",
          "Transaction"."description",
          "Transaction"."date",
          "Category"."name" AS category_name,
          "Transaction"."status"
        FROM "Transaction"
        LEFT JOIN "Category" ON "Category"."id" = "Transaction"."category_id"
        WHERE "Transaction"."workspace_id" = ${workspaceId}
          AND UPPER(COALESCE("Transaction"."status", 'CONFIRMED')) = 'CONFIRMED'
          AND "Transaction"."date" >= ${series12Start}
        ORDER BY "Transaction"."date" DESC
      `),
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
      prisma.$queryRaw<Array<{ effective_date: Date; type: string; amount: DecimalLike }>>(Prisma.sql`
        SELECT
          COALESCE("due_date", "date") AS effective_date,
          "type",
          "amount"
        FROM "Transaction"
        WHERE "workspace_id" = ${workspaceId}
          AND UPPER(COALESCE("status", 'CONFIRMED')) = 'PENDING'
          AND COALESCE("due_date", "date") >= ${todayStart}
          AND COALESCE("due_date", "date") <= ${next30DaysEnd}
        ORDER BY effective_date ASC, "created_at" ASC
      `),
    ]);

  const currentBalance = wallets.reduce((acc, wallet) => acc + numberFrom(wallet.balance), 0);
  const totalIncome = allTransactions
    .filter((row) => ['INCOME', 'PIX_IN'].includes(String(row.type).toUpperCase()))
    .reduce((acc, row) => acc + numberFrom(row.amount), 0);
  const totalExpenses = allTransactions
    .filter((row) => ['EXPENSE', 'PIX_OUT'].includes(String(row.type).toUpperCase()))
    .reduce((acc, row) => acc + numberFrom(row.amount), 0);

  const monthTransactions = allTransactions.filter((row) => row.date >= monthStart && row.date < nextMonthStart);
  const previousMonthTransactions = allTransactions.filter(
    (row) => row.date >= previousMonthStart && row.date < monthStart
  );
  const currentMonthExpenses = monthTransactions
    .filter((row) => ['EXPENSE', 'PIX_OUT'].includes(String(row.type).toUpperCase()))
    .reduce((acc, row) => acc + numberFrom(row.amount), 0);
  const previousMonthExpenses = previousMonthTransactions
    .filter((row) => ['EXPENSE', 'PIX_OUT'].includes(String(row.type).toUpperCase()))
    .reduce((acc, row) => acc + numberFrom(row.amount), 0);

  const buildMonthSeries = (rows: MonthlyRow[], length: number) => {
    const months = Array.from({ length }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (length - 1 - index), 1);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      return {
        key,
        label: date
          .toLocaleDateString('pt-BR', { month: 'short' })
          .replace('.', '')
          .replace(/^./, (char) => char.toUpperCase()),
        income: 0,
        expense: 0,
      };
    });
    const monthMap = new Map(months.map((item) => [item.key, item]));
    for (const row of rows) {
      const monthKey = `${row.month.getFullYear()}-${row.month.getMonth()}`;
      const bucket = monthMap.get(monthKey);
      if (!bucket) continue;
      bucket.income = numberFrom(row.income);
      bucket.expense = numberFrom(row.expense);
    }
    return months.map(({ label, income, expense }) => ({ label, income, expense }));
  };

  const categoryData = categoryRows.map((row, index) => ({
    name: row.name,
    value: numberFrom(row.total),
    color: PALETTE[index % PALETTE.length],
  }));

  const currentCategoryMap = new Map<string, number>();
  const previousCategoryMap = new Map<string, number>();
  const recurringMap = new Map<string, { name: string; count: number; total: number }>();
  let largestExpense: ReportsOverviewPayload['expenseDeepDive']['largestExpense'] = null;

  for (const row of monthTransactions) {
    const type = String(row.type).toUpperCase();
    if (!['EXPENSE', 'PIX_OUT'].includes(type)) continue;
    const amount = numberFrom(row.amount);
    const category = row.category_name || 'Outros';
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

  for (const row of previousMonthTransactions) {
    const type = String(row.type).toUpperCase();
    if (!['EXPENSE', 'PIX_OUT'].includes(type)) continue;
    const amount = numberFrom(row.amount);
    const category = row.category_name || 'Outros';
    previousCategoryMap.set(category, (previousCategoryMap.get(category) || 0) + amount);
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

  let rollingBalance = currentBalance;
  const dailyBuckets = new Map<string, { inflow: number; outflow: number }>();
  for (const row of forecastRows) {
    const key = row.effective_date.toISOString().slice(0, 10);
    const bucket = dailyBuckets.get(key) || { inflow: 0, outflow: 0 };
    const amount = numberFrom(row.amount);
    if (String(row.type).toUpperCase() === 'INCOME' || String(row.type).toUpperCase() === 'PIX_IN') {
      bucket.inflow += amount;
    } else {
      bucket.outflow += amount;
    }
    dailyBuckets.set(key, bucket);
  }

  const forecastDaily = Array.from({ length: 30 }, (_, index) => {
    const date = new Date(todayStart.getFullYear(), todayStart.getMonth(), todayStart.getDate() + index);
    const key = date.toISOString().slice(0, 10);
    const bucket = dailyBuckets.get(key) || { inflow: 0, outflow: 0 };
    const openingBalance = rollingBalance;
    const closingBalance = openingBalance + bucket.inflow - bucket.outflow;
    rollingBalance = closingBalance;
    return {
      date: key,
      openingBalance,
      inflow: bucket.inflow,
      outflow: bucket.outflow,
      closingBalance,
    };
  });

  const lastPoint = forecastDaily[forecastDaily.length - 1] ?? null;
  const dailyNetFlow =
    forecastDaily.length > 0
      ? (forecastDaily[forecastDaily.length - 1].closingBalance - forecastDaily[0].openingBalance) / forecastDaily.length
      : 0;
  const projectedNegativeDate =
    forecastDaily.find((point) => point.closingBalance < 0)?.date ?? null;
  const projectedNegativeInDays =
    projectedNegativeDate
      ? Math.max(
          0,
          Math.ceil((new Date(projectedNegativeDate).getTime() - todayStart.getTime()) / 86_400_000)
        )
      : null;

  const premiumSmartAlerts: ReportsOverviewPayload['premiumSmartAlerts'] = [];
  if (projectedNegativeInDays !== null && projectedNegativeInDays <= 30) {
    premiumSmartAlerts.push({
      id: 'premium-balance-risk',
      title: 'Alerta inteligente: risco de saldo',
      message: `No ritmo atual, seu saldo pode ficar negativo em cerca de ${projectedNegativeInDays} dias.`,
      tone: 'error',
      targetTab: 'reports',
    });
  }
  if (previousMonthExpenses > 0 && currentMonthExpenses > previousMonthExpenses * 1.18) {
    const variation = Math.round(((currentMonthExpenses - previousMonthExpenses) / previousMonthExpenses) * 100);
    premiumSmartAlerts.push({
      id: 'premium-expense-spike',
      title: 'Alerta inteligente: gasto acima do padrão',
      message: `Suas despesas subiram ${variation}% em relação ao mês anterior. Vale revisar onde o caixa acelerou.`,
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
      message: 'Nenhum sinal crítico foi detectado agora. Seu fluxo está estável e dentro do esperado.',
      tone: 'success',
      targetTab: 'reports',
    });
  }

  return {
    generatedAt: now.toISOString(),
    summary: {
      totalIncome,
      totalExpenses,
      balance: totalIncome - totalExpenses,
    },
    revenueExpense12Months: buildMonthSeries(series12Rows, 12),
    savingsRate6Months: buildMonthSeries(series6Rows, 6).map((item) => ({
      ...item,
      savingsRate: item.income > 0 ? ((item.income - item.expense) / item.income) * 100 : 0,
    })),
    categoryData,
    expenseDeepDive: {
      currentMonthTotal: currentMonthExpenses,
      previousMonthTotal: previousMonthExpenses,
      monthOverMonthVariation:
        previousMonthExpenses > 0 ? ((currentMonthExpenses - previousMonthExpenses) / previousMonthExpenses) * 100 : null,
      topCurrentCategory,
      growingCategories,
      recurringHeavyCategories,
      largestExpense,
    },
    balanceForecast: {
      projections: [7, 15, 30].map((days) => ({
        days,
        projectedBalance:
          forecastDaily[Math.max(0, Math.min(days - 1, forecastDaily.length - 1))]?.closingBalance ??
          lastPoint?.closingBalance ??
          currentBalance,
      })),
      dailyNetFlow,
      trend: dailyNetFlow > 5 ? 'positive' : dailyNetFlow < -5 ? 'negative' : 'stable',
      projectedNegativeInDays,
      source: 'read-model',
    },
    premiumSmartAlerts,
  };
}
