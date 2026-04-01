import { Prisma } from '@prisma/client';
import {
  asPrismaServiceUnavailableError,
  getDatabaseRuntimeInfo,
  prisma,
} from '@/lib/prisma';
import {
  getComparisonDateRange,
  getDatePartsInTimeZone,
  listDashboardBucketKeys,
  resolveDashboardDateRange,
  toDateKeyInTimeZone,
  zonedDateTimeToUtc,
} from '@/lib/dashboard/date-range';
import type {
  DashboardChartGranularity,
  DashboardPeriodSelection,
} from '@/lib/dashboard/date-range';
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

type TotalsRow = {
  inflow: DecimalLike;
  outflow: DecimalLike;
};

type TimeSeriesRow = {
  bucket_key: string;
  inflow: DecimalLike;
  outflow: DecimalLike;
};

type MonthlySeriesRow = {
  month_key: string;
  income: DecimalLike;
  expense: DecimalLike;
};

type TopExpenseRow = {
  category_name: string | null;
  total: DecimalLike;
};

type InsightTransactionRow = {
  type: string;
  amount: DecimalLike;
  date: Date;
  category_name: string | null;
};

type PendingProjectionRow = {
  effective_date: Date;
  type: string;
  amount: DecimalLike;
};

type UpcomingEventRow = {
  id: string;
  title: string;
  effective_date: Date;
  status: string;
  type: string;
  amount: DecimalLike;
  source_type: string | null;
  category: string | null;
};

type RecentTransactionRow = {
  id: string;
  description: string;
  date: Date;
  amount: DecimalLike;
  type: string;
  category: {
    name: string | null;
  } | null;
};

const DASHBOARD_TIMEZONE = 'America/Sao_Paulo';
const MONTHLY_SERIES_MONTHS = 6;
const RECENT_TRANSACTIONS_LIMIT = 8;
const UPCOMING_EVENTS_LIMIT = 6;
const PROJECTION_DAYS = 30;
const CANCELLED_STATUSES = ['CANCELLED', 'CANCELED'];

const monthLabelFormatter = new Intl.DateTimeFormat('pt-BR', { month: 'short' });
const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const DAY_KEY_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;

const numberFrom = (value: DecimalLike) => Number(value || 0);

function normalizeTransactionType(rawType: string) {
  const normalized = String(rawType || '').trim().toUpperCase();
  if (normalized === 'PIX_IN') return 'INCOME';
  if (normalized === 'PIX_OUT') return 'EXPENSE';
  return normalized;
}

function mapFlow(rawType: string): DashboardOverviewUpcomingEvent['flow'] {
  const normalized = normalizeTransactionType(rawType);
  if (normalized === 'INCOME') return 'in';
  if (normalized === 'EXPENSE') return 'out';
  return 'neutral';
}

function mapClientTransactionType(
  rawType: string
): DashboardOverviewRecentTransaction['type'] {
  const normalized = normalizeTransactionType(rawType);
  if (normalized === 'INCOME') return 'income';
  if (normalized === 'EXPENSE') return 'expense';
  return 'transfer';
}

function toDeltaPercent(current: number, previous: number) {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

function toDateKey(date: Date, timeZone: string) {
  return toDateKeyInTimeZone(date, timeZone);
}

function shiftDateKey(dateKey: string, dayOffset: number) {
  const match = DAY_KEY_REGEX.exec(dateKey);
  if (!match) return dateKey;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const shifted = new Date(Date.UTC(year, month - 1, day + dayOffset));
  const shiftedYear = shifted.getUTCFullYear();
  const shiftedMonth = String(shifted.getUTCMonth() + 1).padStart(2, '0');
  const shiftedDay = String(shifted.getUTCDate()).padStart(2, '0');
  return `${shiftedYear}-${shiftedMonth}-${shiftedDay}`;
}

function monthStartUtcFromDateKey(dateKey: string, timeZone: string, monthOffset = 0) {
  const match = DAY_KEY_REGEX.exec(dateKey);
  if (!match) {
    return zonedDateTimeToUtc({
      timeZone,
      year: 1970,
      month: 1,
      day: 1,
      hour: 0,
      minute: 0,
      second: 0,
      millisecond: 0,
    });
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const shifted = new Date(Date.UTC(year, month - 1 + monthOffset, 1));
  return zonedDateTimeToUtc({
    timeZone,
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: 1,
    hour: 0,
    minute: 0,
    second: 0,
    millisecond: 0,
  });
}

function mapMonthlySeriesRows(params: {
  rows: MonthlySeriesRow[];
  seriesStart: Date;
  timeZone: string;
}) {
  const seed = Array.from({ length: MONTHLY_SERIES_MONTHS }, (_, index) => {
    const month = monthStartUtcFromDateKey(toDateKey(params.seriesStart, params.timeZone), params.timeZone, index);
    const monthKey = toDateKey(month, params.timeZone).slice(0, 7);
    const label = monthLabelFormatter.format(month).replace('.', '');
    return {
      monthKey,
      month,
      label: `${label.charAt(0).toUpperCase()}${label.slice(1)}`,
      income: 0,
      expense: 0,
    };
  });

  const byMonth = new Map(seed.map((item) => [item.monthKey, item]));
  for (const row of params.rows) {
    const monthKey = String(row.month_key || '').slice(0, 7);
    const target = byMonth.get(monthKey);
    if (!target) continue;
    target.income = numberFrom(row.income);
    target.expense = numberFrom(row.expense);
  }

  return seed.map(
    (item): DashboardOverviewMonthlySeriesPoint => ({
      month: item.month.toISOString(),
      label: item.label,
      income: item.income,
      expense: item.expense,
      net: item.income - item.expense,
    })
  );
}

function formatBucketDateKeyForQuery(granularity: DashboardChartGranularity, timeZone: string) {
  if (granularity === 'hour') {
    return Prisma.sql`TO_CHAR(DATE_TRUNC('hour', timezone(${timeZone}, "date")), 'YYYY-MM-DD"T"HH24:00:00')`;
  }
  if (granularity === 'week') {
    return Prisma.sql`TO_CHAR(DATE_TRUNC('week', timezone(${timeZone}, "date")), 'YYYY-MM-DD')`;
  }
  return Prisma.sql`TO_CHAR(DATE_TRUNC('day', timezone(${timeZone}, "date")), 'YYYY-MM-DD')`;
}

function buildPeriodSeries(params: {
  range: ReturnType<typeof resolveDashboardDateRange>;
  aggregateRows: TimeSeriesRow[];
}) {
  const bucketKeys = listDashboardBucketKeys(params.range);
  const bucketMap = new Map(
    params.aggregateRows.map((row) => [
      String(row.bucket_key),
      {
        inflow: numberFrom(row.inflow),
        outflow: numberFrom(row.outflow),
      },
    ])
  );

  const points: DashboardOverviewForecastPoint[] = [];
  let runningNet = 0;

  for (const bucketKey of bucketKeys) {
    const bucket = bucketMap.get(bucketKey) || { inflow: 0, outflow: 0 };
    const openingBalance = runningNet;
    runningNet += bucket.inflow - bucket.outflow;

    points.push({
      date: bucketKey,
      openingBalance,
      inflow: bucket.inflow,
      outflow: bucket.outflow,
      closingBalance: runningNet,
    });
  }

  return points;
}

function buildProjectionFromPending(params: {
  currentBalance: number;
  rows: PendingProjectionRow[];
  now: Date;
  timeZone: string;
}) {
  const byDate = new Map<string, { inflow: number; outflow: number }>();

  for (const row of params.rows) {
    const key = toDateKey(row.effective_date, params.timeZone);
    const bucket = byDate.get(key) || { inflow: 0, outflow: 0 };
    const amount = numberFrom(row.amount);
    const normalizedType = normalizeTransactionType(row.type);
    if (normalizedType === 'INCOME') {
      bucket.inflow += amount;
    } else if (normalizedType === 'EXPENSE') {
      bucket.outflow += amount;
    }
    byDate.set(key, bucket);
  }

  const nowParts = getDatePartsInTimeZone(params.now, params.timeZone);
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
  const todayKey = toDateKey(todayStart, params.timeZone);

  let runningBalance = params.currentBalance;
  let projectedNegativeDate: string | null = null;
  let nextCriticalDate: string | null = null;

  for (let dayOffset = 0; dayOffset < PROJECTION_DAYS; dayOffset += 1) {
    const key = shiftDateKey(todayKey, dayOffset);
    const bucket = byDate.get(key) || { inflow: 0, outflow: 0 };
    runningBalance += bucket.inflow - bucket.outflow;

    if (!projectedNegativeDate && runningBalance < 0) {
      projectedNegativeDate = key;
    }
    if (!nextCriticalDate && runningBalance <= params.currentBalance * 0.15) {
      nextCriticalDate = key;
    }
  }

  return {
    projectedBalance30d: runningBalance,
    projectedNegativeDate,
    nextCriticalDate,
  };
}

function logOverviewSectionWarning(
  workspaceId: string,
  section: string,
  error: unknown
) {
  console.warn('[dashboard-overview] section.failed', {
    workspaceId,
    section,
    detail: error instanceof Error ? error.message : String(error || 'Unknown error'),
    database: getDatabaseRuntimeInfo(),
  });
}

async function safeSection<T>(
  workspaceId: string,
  section: string,
  fallback: T,
  action: () => Promise<T>
) {
  try {
    return await action();
  } catch (error) {
    if (asPrismaServiceUnavailableError(error)) {
      throw error;
    }
    logOverviewSectionWarning(workspaceId, section, error);
    return fallback;
  }
}

export async function buildDashboardOverview(
  workspaceId: string,
  selection?: Partial<DashboardPeriodSelection>
): Promise<DashboardOverviewPayload> {
  const now = new Date();
  const range = resolveDashboardDateRange({
    period: selection?.period,
    startDate: selection?.startDate,
    endDate: selection?.endDate,
    timeZone: selection?.timeZone || DASHBOARD_TIMEZONE,
    now,
  });
  const comparisonRange = getComparisonDateRange(range);

  const [walletBalances, periodTotalsRows, comparisonTotalsRows, pendingTotalsRows] = await Promise.all([
    safeSection<Array<{ balance: DecimalLike }>>(workspaceId, 'wallet_balances', [], () =>
      prisma.wallet.findMany({
        where: { workspace_id: workspaceId },
        select: { balance: true },
      })
    ),
    safeSection<TotalsRow[]>(workspaceId, 'period_totals', [], () =>
      prisma.$queryRaw<TotalsRow[]>(Prisma.sql`
        SELECT
          COALESCE(SUM(CASE WHEN "type" IN ('INCOME', 'PIX_IN') THEN "amount" ELSE 0 END), 0) AS inflow,
          COALESCE(SUM(CASE WHEN "type" IN ('EXPENSE', 'PIX_OUT') THEN "amount" ELSE 0 END), 0) AS outflow
        FROM "Transaction"
        WHERE "workspace_id" = ${workspaceId}
          AND COALESCE("status", 'CONFIRMED') = 'CONFIRMED'
          AND "date" >= ${range.start}
          AND "date" <= ${range.end}
      `)
    ),
    safeSection<TotalsRow[]>(workspaceId, 'comparison_totals', [], () =>
      prisma.$queryRaw<TotalsRow[]>(Prisma.sql`
        SELECT
          COALESCE(SUM(CASE WHEN "type" IN ('INCOME', 'PIX_IN') THEN "amount" ELSE 0 END), 0) AS inflow,
          COALESCE(SUM(CASE WHEN "type" IN ('EXPENSE', 'PIX_OUT') THEN "amount" ELSE 0 END), 0) AS outflow
        FROM "Transaction"
        WHERE "workspace_id" = ${workspaceId}
          AND COALESCE("status", 'CONFIRMED') = 'CONFIRMED'
          AND "date" >= ${comparisonRange.start}
          AND "date" <= ${comparisonRange.end}
      `)
    ),
    safeSection<TotalsRow[]>(workspaceId, 'period_pending_totals', [], () =>
      prisma.$queryRaw<TotalsRow[]>(Prisma.sql`
        SELECT
          COALESCE(SUM(CASE WHEN "type" IN ('INCOME', 'PIX_IN') THEN "amount" ELSE 0 END), 0) AS inflow,
          COALESCE(SUM(CASE WHEN "type" IN ('EXPENSE', 'PIX_OUT') THEN "amount" ELSE 0 END), 0) AS outflow
        FROM "Transaction"
        WHERE "workspace_id" = ${workspaceId}
          AND COALESCE("status", 'CONFIRMED') = 'PENDING'
          AND COALESCE("due_date", "date") >= ${range.start}
          AND COALESCE("due_date", "date") <= ${range.end}
      `)
    ),
  ]);

  const currentBalance = walletBalances.reduce((acc, wallet) => acc + numberFrom(wallet.balance), 0);
  const periodTotals = periodTotalsRows[0] || { inflow: 0, outflow: 0 };
  const comparisonTotals = comparisonTotalsRows[0] || { inflow: 0, outflow: 0 };
  const pendingTotals = pendingTotalsRows[0] || { inflow: 0, outflow: 0 };

  const inflow = numberFrom(periodTotals.inflow);
  const outflow = numberFrom(periodTotals.outflow);
  const periodNet = inflow - outflow;

  const comparisonInflow = numberFrom(comparisonTotals.inflow);
  const comparisonOutflow = numberFrom(comparisonTotals.outflow);
  const comparisonPeriodNet = comparisonInflow - comparisonOutflow;

  const seriesRows = await safeSection<TimeSeriesRow[]>(workspaceId, 'period_series', [], () => {
    const bucketExpr = formatBucketDateKeyForQuery(range.granularity, range.timeZone);
    return prisma.$queryRaw<TimeSeriesRow[]>(Prisma.sql`
      SELECT
        ${bucketExpr} AS bucket_key,
        COALESCE(SUM(CASE WHEN "type" IN ('INCOME', 'PIX_IN') THEN "amount" ELSE 0 END), 0) AS inflow,
        COALESCE(SUM(CASE WHEN "type" IN ('EXPENSE', 'PIX_OUT') THEN "amount" ELSE 0 END), 0) AS outflow
      FROM "Transaction"
      WHERE "workspace_id" = ${workspaceId}
        AND COALESCE("status", 'CONFIRMED') = 'CONFIRMED'
        AND "date" >= ${range.start}
        AND "date" <= ${range.end}
      GROUP BY 1
      ORDER BY 1 ASC
    `);
  });
  const forecastDaily = buildPeriodSeries({
    range,
    aggregateRows: seriesRows,
  });

  const nowParts = getDatePartsInTimeZone(now, range.timeZone);
  const todayStart = zonedDateTimeToUtc({
    timeZone: range.timeZone,
    year: nowParts.year,
    month: nowParts.month,
    day: nowParts.day,
    hour: 0,
    minute: 0,
    second: 0,
    millisecond: 0,
  });
  const nextThirtyDaysEnd = new Date(
    zonedDateTimeToUtc({
      timeZone: range.timeZone,
      year: nowParts.year,
      month: nowParts.month,
      day: nowParts.day + PROJECTION_DAYS + 1,
      hour: 0,
      minute: 0,
      second: 0,
      millisecond: 0,
    }).getTime() - 1
  );

  const projectionPendingRows = await safeSection<PendingProjectionRow[]>(
    workspaceId,
    'pending_projection_30d',
    [],
    () =>
      prisma.$queryRaw<PendingProjectionRow[]>(Prisma.sql`
        SELECT
          COALESCE("due_date", "date") AS effective_date,
          "type",
          "amount"
        FROM "Transaction"
        WHERE "workspace_id" = ${workspaceId}
          AND COALESCE("status", 'CONFIRMED') = 'PENDING'
          AND COALESCE("due_date", "date") >= ${todayStart}
          AND COALESCE("due_date", "date") <= ${nextThirtyDaysEnd}
        ORDER BY effective_date ASC, "created_at" ASC
      `)
  );
  const projection = buildProjectionFromPending({
    currentBalance,
    rows: projectionPendingRows,
    now,
    timeZone: range.timeZone,
  });

  const upcomingRows = await safeSection<UpcomingEventRow[]>(
    workspaceId,
    'upcoming_events',
    [],
    () =>
      prisma.$queryRaw<UpcomingEventRow[]>(Prisma.sql`
        SELECT
          "Transaction"."id",
          "Transaction"."description" AS title,
          COALESCE("Transaction"."due_date", "Transaction"."date") AS effective_date,
          COALESCE("Transaction"."status", 'PENDING') AS status,
          "Transaction"."type",
          "Transaction"."amount",
          "Transaction"."origin_type" AS source_type,
          "Category"."name" AS category
        FROM "Transaction"
        LEFT JOIN "Category" ON "Category"."id" = "Transaction"."category_id"
        WHERE "Transaction"."workspace_id" = ${workspaceId}
          AND COALESCE("Transaction"."status", 'CONFIRMED') = 'PENDING'
          AND COALESCE("Transaction"."due_date", "Transaction"."date") >= ${range.start}
          AND COALESCE("Transaction"."due_date", "Transaction"."date") <= ${range.end}
        ORDER BY effective_date ASC, "Transaction"."created_at" ASC
        LIMIT ${UPCOMING_EVENTS_LIMIT}
      `)
  );
  const upcomingEvents = upcomingRows.map(
    (row): DashboardOverviewUpcomingEvent => ({
      id: row.id,
      title: row.title,
      date: row.effective_date.toISOString(),
      status: String(row.status || 'PENDING').toUpperCase(),
      flow: mapFlow(row.type),
      type: String(row.type || '').toUpperCase(),
      amount: numberFrom(row.amount),
      sourceType: row.source_type ? String(row.source_type) : null,
      category: row.category ?? null,
    })
  );

  const upcomingInflow = upcomingEvents.reduce(
    (acc, event) => acc + (event.flow === 'in' ? Number(event.amount || 0) : 0),
    0
  );
  const upcomingOutflow = upcomingEvents.reduce(
    (acc, event) => acc + (event.flow === 'out' ? Number(event.amount || 0) : 0),
    0
  );
  const upcomingInflowCount = upcomingEvents.filter((event) => event.flow === 'in').length;
  const upcomingOutflowCount = upcomingEvents.filter((event) => event.flow === 'out').length;

  const recentTransactionsRows = await safeSection<RecentTransactionRow[]>(
    workspaceId,
    'recent_transactions',
    [],
    () =>
      prisma.transaction.findMany({
        where: {
          workspace_id: workspaceId,
          date: {
            gte: range.start,
            lte: range.end,
          },
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
      })
  );
  const recentTransactions = recentTransactionsRows.map(
    (transaction): DashboardOverviewRecentTransaction => ({
      id: transaction.id,
      category: transaction.category?.name ?? null,
      description: transaction.description,
      date: transaction.date.toISOString(),
      amount: numberFrom(transaction.amount),
      type: mapClientTransactionType(transaction.type),
    })
  );

  const seriesStartMonthStart = monthStartUtcFromDateKey(
    range.endDate,
    range.timeZone,
    -(MONTHLY_SERIES_MONTHS - 1)
  );
  const nextMonthStart = monthStartUtcFromDateKey(range.endDate, range.timeZone, 1);
  const monthlySeriesRows = await safeSection<MonthlySeriesRow[]>(
    workspaceId,
    'monthly_series',
    [],
    () =>
      prisma.$queryRaw<MonthlySeriesRow[]>(Prisma.sql`
        SELECT
          TO_CHAR(DATE_TRUNC('month', timezone(${range.timeZone}, "date")), 'YYYY-MM-01') AS month_key,
          COALESCE(SUM(CASE WHEN COALESCE("status", 'CONFIRMED') = 'CONFIRMED' AND "type" IN ('INCOME', 'PIX_IN') THEN "amount" ELSE 0 END), 0) AS income,
          COALESCE(SUM(CASE WHEN COALESCE("status", 'CONFIRMED') = 'CONFIRMED' AND "type" IN ('EXPENSE', 'PIX_OUT') THEN "amount" ELSE 0 END), 0) AS expense
        FROM "Transaction"
        WHERE "workspace_id" = ${workspaceId}
          AND "date" >= ${seriesStartMonthStart}
          AND "date" < ${nextMonthStart}
        GROUP BY 1
        ORDER BY 1 ASC
      `)
  );
  const monthlySeries = mapMonthlySeriesRows({
    rows: monthlySeriesRows,
    seriesStart: seriesStartMonthStart,
    timeZone: range.timeZone,
  });

  const insightTransactions = await safeSection<InsightTransactionRow[]>(
    workspaceId,
    'insight_transactions',
    [],
    () =>
      prisma.$queryRaw<InsightTransactionRow[]>(Prisma.sql`
        SELECT
          "Transaction"."type",
          "Transaction"."amount",
          "Transaction"."date",
          "Category"."name" AS category_name
        FROM "Transaction"
        LEFT JOIN "Category" ON "Category"."id" = "Transaction"."category_id"
        WHERE "Transaction"."workspace_id" = ${workspaceId}
          AND COALESCE("Transaction"."status", 'CONFIRMED') = 'CONFIRMED'
          AND "Transaction"."date" >= ${range.start}
          AND "Transaction"."date" <= ${range.end}
        ORDER BY "Transaction"."date" DESC
      `)
  );
  const insightRows = insightTransactions.map((row) => ({
    type: row.type,
    amount: numberFrom(row.amount),
    date: row.date,
    category: row.category_name ? { name: row.category_name } : null,
  }));
  const automatedInsights = buildFinancialInsights(insightRows, currentBalance)
    .map((item) => item.trim())
    .filter(Boolean);

  const topExpenseRows = await safeSection<TopExpenseRow[]>(
    workspaceId,
    'top_expense_category',
    [],
    () =>
      prisma.$queryRaw<TopExpenseRow[]>(Prisma.sql`
        SELECT
          COALESCE("Category"."name", 'Sem categoria') AS category_name,
          COALESCE(SUM("Transaction"."amount"), 0) AS total
        FROM "Transaction"
        LEFT JOIN "Category" ON "Category"."id" = "Transaction"."category_id"
        WHERE "Transaction"."workspace_id" = ${workspaceId}
          AND COALESCE("Transaction"."status", 'CONFIRMED') = 'CONFIRMED'
          AND "Transaction"."type" IN ('EXPENSE', 'PIX_OUT')
          AND "Transaction"."date" >= ${range.start}
          AND "Transaction"."date" <= ${range.end}
        GROUP BY 1
        ORDER BY total DESC
        LIMIT 1
      `)
  );

  const topExpense = topExpenseRows[0];
  const topExpenseAmount = numberFrom(topExpense?.total || 0);
  const expenseTransactionCount = insightRows.filter(
    (row) => normalizeTransactionType(row.type) === 'EXPENSE'
  ).length;

  const insightCards: DashboardOverviewInsightCard[] = [
    {
      id: 'top-expense',
      badge: 'Alerta',
      title: 'Maior gasto no periodo',
      metric: currencyFormatter.format(topExpenseAmount),
      description: topExpense
        ? `${topExpense.category_name} concentra a maior saida confirmada neste periodo.`
        : 'Sem saidas confirmadas no periodo.',
      action: 'Acao sugerida: revise essa categoria e ajuste um limite para o proximo ciclo.',
      tone: 'warning',
    },
    {
      id: 'expense-volume',
      badge: 'Tendencia',
      title: 'Saidas no periodo',
      metric: currencyFormatter.format(outflow),
      description: `Voce registrou ${expenseTransactionCount} saidas confirmadas no periodo analisado.`,
      action: 'Acao sugerida: acompanhe as categorias com maior peso para evitar desvios.',
      tone: 'primary',
    },
  ];

  const alerts: DashboardOverviewAlert[] = [];
  if (projection.projectedNegativeDate) {
    alerts.push({
      id: 'negative-balance-forecast',
      tone: 'danger',
      title: 'Risco de saldo negativo',
      message: `A projecao indica saldo abaixo de zero em ${new Date(
        projection.projectedNegativeDate
      ).toLocaleDateString('pt-BR')}.`,
    });
  }
  if (periodNet < 0) {
    alerts.push({
      id: 'period-net-negative',
      tone: 'warning',
      title: 'Resultado negativo no periodo',
      message: `As saidas superaram as entradas em ${currencyFormatter.format(Math.abs(periodNet))}.`,
    });
  }
  if (upcomingOutflow > currentBalance && upcomingOutflow > 0) {
    alerts.push({
      id: 'upcoming-outflow-pressure',
      tone: 'warning',
      title: 'Compromissos pendentes pressionam o caixa',
      message: `As saidas pendentes no periodo totalizam ${currencyFormatter.format(upcomingOutflow)}.`,
    });
  }
  if (alerts.length === 0) {
    alerts.push({
      id: 'stable-cashflow',
      tone: 'success',
      title: 'Fluxo financeiro estavel',
      message: 'Sem alertas criticos para o periodo selecionado.',
    });
  }

  return {
    workspaceId,
    generatedAt: now.toISOString(),
    period: {
      preset: range.period,
      label: range.label,
      startDate: range.startDate,
      endDate: range.endDate,
      timeZone: range.timeZone,
      granularity: range.granularity,
      comparisonLabel: comparisonRange.label,
    },
    summary: {
      currentBalance,
      projectedBalance30d: projection.projectedBalance30d,
      inflow,
      outflow,
      periodNet,
      upcomingInflow,
      upcomingOutflow,
      upcomingInflowCount,
      upcomingOutflowCount,
      comparison: {
        label: comparisonRange.label,
        inflow: comparisonInflow,
        outflow: comparisonOutflow,
        periodNet: comparisonPeriodNet,
        inflowDeltaPercent: toDeltaPercent(inflow, comparisonInflow),
        outflowDeltaPercent: toDeltaPercent(outflow, comparisonOutflow),
        periodNetDeltaPercent: toDeltaPercent(periodNet, comparisonPeriodNet),
      },
    },
    forecast: {
      asOfDate: range.end.toISOString(),
      updatedAt: now.toISOString(),
      granularity: range.granularity,
      currentBalance,
      projectedBalance30d: projection.projectedBalance30d,
      projectedNegativeDate: projection.projectedNegativeDate,
      nextCriticalDate: projection.nextCriticalDate,
      monthConfirmedIncome: inflow,
      monthConfirmedExpense: outflow,
      monthPlannedIncome: numberFrom(pendingTotals.inflow),
      monthPlannedExpense: numberFrom(pendingTotals.outflow),
      daily: forecastDaily,
    },
    monthlySeries,
    alerts: alerts.slice(0, 4),
    insights: {
      primary: insightCards,
      automated: automatedInsights.slice(0, 3),
    },
    upcomingEvents,
    recentTransactions,
  };
}

