import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import type {
  DashboardOverviewAlert,
  DashboardOverviewForecastPoint,
  DashboardOverviewInsightCard,
  DashboardOverviewMonthlySeriesPoint,
  DashboardOverviewPayload,
  DashboardOverviewRecentTransaction,
  DashboardOverviewUpcomingEvent,
} from '@/lib/dashboard/overview';
import { buildFinancialInsights } from '@/lib/server/financial-insights';

type DecimalLike = Prisma.Decimal | number | string | null;

type MonthlySeriesRow = {
  month: Date;
  income: DecimalLike;
  expense: DecimalLike;
};

type TotalsRow = {
  month_confirmed_income: DecimalLike;
  month_confirmed_expense: DecimalLike;
  month_planned_income: DecimalLike;
  month_planned_expense: DecimalLike;
};

type CategoryExpenseRow = {
  category_name: string | null;
  total: DecimalLike;
};

type PendingForecastRow = {
  effective_date: Date;
  type: string;
  amount: DecimalLike;
};

type UpcomingEventRow = {
  id: string;
  description: string;
  effective_date: Date;
  status: string;
  type: string;
  amount: DecimalLike;
  origin_type: string | null;
  category_name: string | null;
};

type InsightTransactionRow = {
  type: string;
  amount: DecimalLike;
  date: Date;
  category_name: string | null;
};

const CANCELLED_STATUSES = ['CANCELLED', 'CANCELED'];
const PROJECTION_DAYS = 30;
const UPCOMING_DAYS = 14;
const MONTHLY_SERIES_MONTHS = 6;
const RECENT_TRANSACTIONS_LIMIT = 8;
const UPCOMING_EVENTS_LIMIT = 6;

const numberFrom = (value: DecimalLike) => Number(value || 0);

const startOfDay = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate());

const addDays = (value: Date, days: number) =>
  new Date(value.getFullYear(), value.getMonth(), value.getDate() + days, value.getHours(), value.getMinutes(), value.getSeconds(), value.getMilliseconds());

const monthLabelFormatter = new Intl.DateTimeFormat('pt-BR', { month: 'short' });
const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const normalizeTransactionType = (rawType: string) => {
  const normalized = String(rawType || '').trim().toUpperCase();
  if (normalized === 'PIX_IN') return 'INCOME';
  if (normalized === 'PIX_OUT') return 'EXPENSE';
  return normalized;
};

const mapFlow = (rawType: string): DashboardOverviewUpcomingEvent['flow'] => {
  const normalized = normalizeTransactionType(rawType);
  if (normalized === 'INCOME') return 'in';
  if (normalized === 'EXPENSE') return 'out';
  return 'neutral';
};

const mapClientTransactionType = (
  rawType: string
): DashboardOverviewRecentTransaction['type'] => {
  const normalized = normalizeTransactionType(rawType);
  if (normalized === 'INCOME') return 'income';
  if (normalized === 'EXPENSE') return 'expense';
  return 'transfer';
};

export async function buildDashboardOverview(workspaceId: string): Promise<DashboardOverviewPayload> {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const next30DaysEnd = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + PROJECTION_DAYS,
    23,
    59,
    59,
    999
  );
  const next14DaysEnd = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + UPCOMING_DAYS,
    23,
    59,
    59,
    999
  );
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const seriesStart = new Date(now.getFullYear(), now.getMonth() - (MONTHLY_SERIES_MONTHS - 1), 1);

  const [
    wallets,
    recentTransactions,
    monthlySeriesRows,
    totalsRow,
    pendingForecastRows,
    upcomingEventRows,
    topExpenseRow,
    insightTransactions,
  ] = await Promise.all([
    prisma.wallet.findMany({
      where: { workspace_id: workspaceId },
      select: { balance: true },
    }),
    prisma.transaction.findMany({
      where: {
        workspace_id: workspaceId,
        status: {
          notIn: CANCELLED_STATUSES,
        },
      },
      orderBy: [{ date: 'desc' }, { created_at: 'desc' }],
      take: RECENT_TRANSACTIONS_LIMIT,
      select: {
        id: true,
        description: true,
        date: true,
        amount: true,
        type: true,
        category: {
          select: {
            name: true,
          },
        },
      },
    }),
    prisma.$queryRaw<MonthlySeriesRow[]>(Prisma.sql`
      SELECT
        DATE_TRUNC('month', "date") AS month,
        COALESCE(
          SUM(
            CASE
              WHEN UPPER(COALESCE("status", 'CONFIRMED')) = 'CONFIRMED'
                AND UPPER("type") IN ('INCOME', 'PIX_IN')
              THEN "amount"
              ELSE 0
            END
          ),
          0
        ) AS income,
        COALESCE(
          SUM(
            CASE
              WHEN UPPER(COALESCE("status", 'CONFIRMED')) = 'CONFIRMED'
                AND UPPER("type") IN ('EXPENSE', 'PIX_OUT')
              THEN "amount"
              ELSE 0
            END
          ),
          0
        ) AS expense
      FROM "Transaction"
      WHERE "workspace_id" = CAST(${workspaceId} AS uuid)
        AND "date" >= ${seriesStart}
        AND "date" < ${nextMonthStart}
      GROUP BY 1
      ORDER BY 1 ASC
    `),
    prisma.$queryRaw<TotalsRow[]>(Prisma.sql`
      SELECT
        COALESCE(
          SUM(
            CASE
              WHEN UPPER(COALESCE("status", 'CONFIRMED')) = 'CONFIRMED'
                AND UPPER("type") IN ('INCOME', 'PIX_IN')
                AND "date" >= ${monthStart}
                AND "date" < ${nextMonthStart}
              THEN "amount"
              ELSE 0
            END
          ),
          0
        ) AS month_confirmed_income,
        COALESCE(
          SUM(
            CASE
              WHEN UPPER(COALESCE("status", 'CONFIRMED')) = 'CONFIRMED'
                AND UPPER("type") IN ('EXPENSE', 'PIX_OUT')
                AND "date" >= ${monthStart}
                AND "date" < ${nextMonthStart}
              THEN "amount"
              ELSE 0
            END
          ),
          0
        ) AS month_confirmed_expense,
        COALESCE(
          SUM(
            CASE
              WHEN UPPER(COALESCE("status", 'CONFIRMED')) = 'PENDING'
                AND UPPER("type") IN ('INCOME', 'PIX_IN')
                AND COALESCE("due_date", "date") >= ${monthStart}
                AND COALESCE("due_date", "date") < ${nextMonthStart}
              THEN "amount"
              ELSE 0
            END
          ),
          0
        ) AS month_planned_income,
        COALESCE(
          SUM(
            CASE
              WHEN UPPER(COALESCE("status", 'CONFIRMED')) = 'PENDING'
                AND UPPER("type") IN ('EXPENSE', 'PIX_OUT')
                AND COALESCE("due_date", "date") >= ${monthStart}
                AND COALESCE("due_date", "date") < ${nextMonthStart}
              THEN "amount"
              ELSE 0
            END
          ),
          0
        ) AS month_planned_expense
      FROM "Transaction"
      WHERE "workspace_id" = CAST(${workspaceId} AS uuid)
    `),
    prisma.$queryRaw<PendingForecastRow[]>(Prisma.sql`
      SELECT
        COALESCE("due_date", "date") AS effective_date,
        "type",
        "amount"
      FROM "Transaction"
      WHERE "workspace_id" = CAST(${workspaceId} AS uuid)
        AND UPPER(COALESCE("status", 'CONFIRMED')) = 'PENDING'
        AND COALESCE("due_date", "date") >= ${todayStart}
        AND COALESCE("due_date", "date") <= ${next30DaysEnd}
      ORDER BY effective_date ASC, "created_at" ASC
    `),
    prisma.$queryRaw<UpcomingEventRow[]>(Prisma.sql`
      SELECT
        "Transaction"."id",
        "Transaction"."description",
        COALESCE("Transaction"."due_date", "Transaction"."date") AS effective_date,
        UPPER(COALESCE("Transaction"."status", 'CONFIRMED')) AS status,
        "Transaction"."type",
        "Transaction"."amount",
        "Transaction"."origin_type",
        "Category"."name" AS category_name
      FROM "Transaction"
      LEFT JOIN "Category" ON "Category"."id" = "Transaction"."category_id"
      WHERE "Transaction"."workspace_id" = CAST(${workspaceId} AS uuid)
        AND UPPER(COALESCE("Transaction"."status", 'CONFIRMED')) = 'PENDING'
        AND COALESCE("Transaction"."due_date", "Transaction"."date") >= ${todayStart}
        AND COALESCE("Transaction"."due_date", "Transaction"."date") <= ${next14DaysEnd}
      ORDER BY effective_date ASC, "Transaction"."created_at" ASC
      LIMIT ${UPCOMING_EVENTS_LIMIT}
    `),
    prisma.$queryRaw<CategoryExpenseRow[]>(Prisma.sql`
      SELECT
        COALESCE("Category"."name", 'Sem categoria') AS category_name,
        COALESCE(SUM("Transaction"."amount"), 0) AS total
      FROM "Transaction"
      LEFT JOIN "Category" ON "Category"."id" = "Transaction"."category_id"
      WHERE "Transaction"."workspace_id" = CAST(${workspaceId} AS uuid)
        AND UPPER(COALESCE("Transaction"."status", 'CONFIRMED')) = 'CONFIRMED'
        AND UPPER("Transaction"."type") IN ('EXPENSE', 'PIX_OUT')
        AND "Transaction"."date" >= ${monthStart}
        AND "Transaction"."date" < ${nextMonthStart}
      GROUP BY 1
      ORDER BY total DESC
      LIMIT 1
    `),
    prisma.$queryRaw<InsightTransactionRow[]>(Prisma.sql`
      SELECT
        "Transaction"."type",
        "Transaction"."amount",
        "Transaction"."date",
        "Category"."name" AS category_name
      FROM "Transaction"
      LEFT JOIN "Category" ON "Category"."id" = "Transaction"."category_id"
      WHERE "Transaction"."workspace_id" = CAST(${workspaceId} AS uuid)
        AND UPPER(COALESCE("Transaction"."status", 'CONFIRMED')) = 'CONFIRMED'
        AND "Transaction"."date" >= ${previousMonthStart}
      ORDER BY "Transaction"."date" DESC
    `),
  ]);

  const currentBalance = wallets.reduce((acc, wallet) => acc + numberFrom(wallet.balance), 0);
  const totals = totalsRow[0] ?? {
    month_confirmed_income: 0,
    month_confirmed_expense: 0,
    month_planned_income: 0,
    month_planned_expense: 0,
  };

  const monthConfirmedIncome = numberFrom(totals.month_confirmed_income);
  const monthConfirmedExpense = numberFrom(totals.month_confirmed_expense);
  const monthPlannedIncome = numberFrom(totals.month_planned_income);
  const monthPlannedExpense = numberFrom(totals.month_planned_expense);

  const monthlySeriesSeed = Array.from({ length: MONTHLY_SERIES_MONTHS }, (_, index) => {
    const month = new Date(seriesStart.getFullYear(), seriesStart.getMonth() + index, 1);
    const label = monthLabelFormatter.format(month).replace('.', '');
    return {
      month,
      label: `${label.charAt(0).toUpperCase()}${label.slice(1)}`,
      income: 0,
      expense: 0,
      net: 0,
    };
  });

  const monthlySeriesMap = new Map(
    monthlySeriesSeed.map((item) => [item.month.toISOString().slice(0, 10), item])
  );

  for (const row of monthlySeriesRows) {
    const key = new Date(row.month).toISOString().slice(0, 10);
    const bucket = monthlySeriesMap.get(key);
    if (!bucket) continue;
    bucket.income = numberFrom(row.income);
    bucket.expense = numberFrom(row.expense);
    bucket.net = bucket.income - bucket.expense;
  }

  const forecastByDate = new Map<string, { inflow: number; outflow: number }>();
  let plannedNet30d = 0;

  for (const row of pendingForecastRows) {
    const normalizedType = normalizeTransactionType(row.type);
    const amount = numberFrom(row.amount);
    const key = startOfDay(new Date(row.effective_date)).toISOString().slice(0, 10);
    const bucket = forecastByDate.get(key) ?? { inflow: 0, outflow: 0 };

    if (normalizedType === 'INCOME') {
      bucket.inflow += amount;
      plannedNet30d += amount;
    } else if (normalizedType === 'EXPENSE') {
      bucket.outflow += amount;
      plannedNet30d -= amount;
    }

    forecastByDate.set(key, bucket);
  }

  const forecastDaily: DashboardOverviewForecastPoint[] = [];
  let runningBalance = currentBalance;
  let projectedNegativeDate: string | null = null;
  let nextCriticalDate: string | null = null;

  for (let dayOffset = 0; dayOffset < PROJECTION_DAYS; dayOffset += 1) {
    const currentDate = addDays(todayStart, dayOffset);
    const key = currentDate.toISOString().slice(0, 10);
    const bucket = forecastByDate.get(key) ?? { inflow: 0, outflow: 0 };
    const openingBalance = runningBalance;
    const closingBalance = openingBalance + bucket.inflow - bucket.outflow;

    forecastDaily.push({
      date: key,
      openingBalance,
      inflow: bucket.inflow,
      outflow: bucket.outflow,
      closingBalance,
    });

    if (projectedNegativeDate === null && closingBalance < 0) {
      projectedNegativeDate = key;
    }
    if (nextCriticalDate === null && closingBalance <= currentBalance * 0.15) {
      nextCriticalDate = key;
    }

    runningBalance = closingBalance;
  }

  const projectedBalance30d =
    forecastDaily.length > 0 ? forecastDaily[forecastDaily.length - 1].closingBalance : currentBalance;

  const upcomingEvents: DashboardOverviewUpcomingEvent[] = upcomingEventRows.map((row) => ({
    id: row.id,
    title: row.description,
    date: new Date(row.effective_date).toISOString(),
    status: String(row.status || 'PENDING').toUpperCase(),
    flow: mapFlow(row.type),
    type: String(row.type || '').toUpperCase(),
    amount: numberFrom(row.amount),
    sourceType: row.origin_type ? String(row.origin_type) : null,
    category: row.category_name ?? null,
  }));

  const upcomingInflow = upcomingEvents.reduce((acc, event) => acc + (event.flow === 'in' ? Number(event.amount || 0) : 0), 0);
  const upcomingOutflow = upcomingEvents.reduce((acc, event) => acc + (event.flow === 'out' ? Number(event.amount || 0) : 0), 0);
  const upcomingInflowCount = upcomingEvents.filter((event) => event.flow === 'in').length;
  const upcomingOutflowCount = upcomingEvents.filter((event) => event.flow === 'out').length;

  const insightRows = insightTransactions.map((row) => ({
    type: row.type,
    amount: numberFrom(row.amount),
    date: row.date,
    category: row.category_name ? { name: row.category_name } : null,
  }));
  const automatedInsights = buildFinancialInsights(insightRows, currentBalance).map((item) => item.trim()).filter(Boolean);
  const topExpense = topExpenseRow[0];
  const topExpenseLabel = topExpense?.category_name || 'Sem despesas registradas no mês atual.';
  const topExpenseAmount = numberFrom(topExpense?.total || 0);
  const expenseTransactionCount = insightRows.filter((row) => {
    const normalizedType = normalizeTransactionType(row.type);
    return normalizedType === 'EXPENSE' && row.date >= monthStart && row.date < nextMonthStart;
  }).length;

  const insightCards: DashboardOverviewInsightCard[] = [
    {
      id: 'top-expense',
      badge: 'Alerta',
      title: 'Maior gasto do mês',
      metric: currencyFormatter.format(topExpenseAmount),
      description: topExpense ? `${topExpenseLabel} concentra a maior saída confirmada do mês.` : topExpenseLabel,
      action: 'Ação sugerida: revise essa categoria e defina limite para os próximos 7 dias.',
      tone: 'warning',
    },
    {
      id: 'expense-volume',
      badge: 'Tendência',
      title: 'Despesas no mês',
      metric: currencyFormatter.format(monthConfirmedExpense),
      description: `Você gastou ${currencyFormatter.format(monthConfirmedExpense)} em ${expenseTransactionCount} transações no período atual.`,
      action: 'Ação sugerida: acompanhe o relatório de categorias para conter desvios.',
      tone: 'primary',
    },
  ];

  const alerts: DashboardOverviewAlert[] = [];

  if (projectedNegativeDate) {
    alerts.push({
      id: 'negative-balance-forecast',
      tone: 'danger',
      title: 'Risco de saldo negativo',
      message: `A projeção indica saldo abaixo de zero em ${new Date(projectedNegativeDate).toLocaleDateString('pt-BR')}.`,
    });
  }

  if (monthPlannedIncome - monthPlannedExpense < 0) {
    alerts.push({
      id: 'negative-planned-month',
      tone: 'warning',
      title: 'Fluxo planejado do mês negativo',
      message: `As movimentações pendentes do mês somam ${currencyFormatter.format(monthPlannedIncome - monthPlannedExpense)}.`,
    });
  }

  if (upcomingOutflow > currentBalance && upcomingOutflow > 0) {
    alerts.push({
      id: 'upcoming-outflow-pressure',
      tone: 'warning',
      title: 'Saídas previstas pressionam o caixa',
      message: `Os próximos compromissos previstos totalizam ${currencyFormatter.format(upcomingOutflow)} nos próximos 14 dias.`,
    });
  }

  if (alerts.length === 0) {
    alerts.push({
      id: 'stable-cashflow',
      tone: 'success',
      title: 'Fluxo financeiro estável',
      message: 'Sem alertas críticos no momento. A visão geral segue consistente para o período atual.',
    });
  }

  return {
    workspaceId,
    generatedAt: now.toISOString(),
    summary: {
      currentBalance,
      projectedBalance30d,
      inflow: monthConfirmedIncome,
      outflow: monthConfirmedExpense,
      upcomingInflow,
      upcomingOutflow,
      upcomingInflowCount,
      upcomingOutflowCount,
    },
    forecast: {
      asOfDate: todayEnd.toISOString(),
      updatedAt: now.toISOString(),
      currentBalance,
      projectedBalance30d,
      projectedNegativeDate,
      nextCriticalDate,
      monthConfirmedIncome,
      monthConfirmedExpense,
      monthPlannedIncome,
      monthPlannedExpense,
      daily: forecastDaily,
    },
    monthlySeries: monthlySeriesSeed.map((item): DashboardOverviewMonthlySeriesPoint => ({
      month: item.month.toISOString(),
      label: item.label,
      income: item.income,
      expense: item.expense,
      net: item.net,
    })),
    alerts: alerts.slice(0, 4),
    insights: {
      primary: insightCards,
      automated: automatedInsights.slice(0, 3),
    },
    upcomingEvents,
    recentTransactions: recentTransactions.map(
      (transaction): DashboardOverviewRecentTransaction => ({
        id: transaction.id,
        category: transaction.category?.name ?? null,
        description: transaction.description,
        date: transaction.date.toISOString(),
        amount: numberFrom(transaction.amount),
        type: mapClientTransactionType(transaction.type),
      })
    ),
  };
}
