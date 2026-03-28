import { Prisma } from '@prisma/client';
import {
  asPrismaServiceUnavailableError,
  getDatabaseRuntimeInfo,
  prisma,
} from '@/lib/prisma';
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

type MonthConfirmedTotalsRow = {
  month_confirmed_income: DecimalLike;
  month_confirmed_expense: DecimalLike;
};

type PendingForecastRow = {
  effective_date: Date;
  type: string;
  amount: DecimalLike;
};

type HistoricalConfirmedFlowRow = {
  effective_date: Date;
  type: string;
  amount: DecimalLike;
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

type DashboardReadModelRow = {
  as_of_date: Date;
  current_balance: DecimalLike;
  projected_balance_30d: DecimalLike;
  projected_negative_date: Date | null;
  month_confirmed_income: DecimalLike;
  month_confirmed_expense: DecimalLike;
  month_planned_income: DecimalLike;
  month_planned_expense: DecimalLike;
  next_critical_date: Date | null;
  updated_at: Date;
};

type DailyProjectionRow = {
  date: Date;
  opening_balance: DecimalLike;
  inflow_confirmed: DecimalLike;
  outflow_confirmed: DecimalLike;
  inflow_planned: DecimalLike;
  outflow_planned: DecimalLike;
  closing_balance: DecimalLike;
};

type CalendarUpcomingRow = {
  id: string;
  title: string;
  date: Date;
  status: string;
  flow: string;
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

const CANCELLED_STATUSES = ['CANCELLED', 'CANCELED'];
const PROJECTION_DAYS = 30;
const TREND_CHART_DAYS = 365;
const UPCOMING_DAYS = 14;
const MONTHLY_SERIES_MONTHS = 6;
const RECENT_TRANSACTIONS_LIMIT = 8;
const UPCOMING_EVENTS_LIMIT = 6;

const monthLabelFormatter = new Intl.DateTimeFormat('pt-BR', { month: 'short' });
const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const numberFrom = (value: DecimalLike) => Number(value || 0);

const startOfDay = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate());

const addDays = (value: Date, days: number) =>
  new Date(value.getFullYear(), value.getMonth(), value.getDate() + days);

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

function mapCalendarFlow(rawFlow: string): DashboardOverviewUpcomingEvent['flow'] {
  const normalized = String(rawFlow || '').trim().toLowerCase();
  if (normalized === 'in') return 'in';
  if (normalized === 'out') return 'out';
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

function defaultMonthlySeries(seriesStart: Date) {
  return Array.from({ length: MONTHLY_SERIES_MONTHS }, (_, index) => {
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
}

function buildMonthlySeries(
  rows: MonthlySeriesRow[],
  seriesStart: Date
): DashboardOverviewMonthlySeriesPoint[] {
  const seed = defaultMonthlySeries(seriesStart);
  const monthlySeriesMap = new Map(
    seed.map((item) => [item.month.toISOString().slice(0, 10), item])
  );

  for (const row of rows) {
    const key = new Date(row.month).toISOString().slice(0, 10);
    const bucket = monthlySeriesMap.get(key);
    if (!bucket) continue;
    bucket.income = numberFrom(row.income);
    bucket.expense = numberFrom(row.expense);
    bucket.net = bucket.income - bucket.expense;
  }

  return seed.map((item) => ({
    month: item.month.toISOString(),
    label: item.label,
    income: item.income,
    expense: item.expense,
    net: item.net,
  }));
}

function buildForecastFromPendingRows(params: {
  currentBalance: number;
  todayStart: Date;
  pendingRows: PendingForecastRow[];
  days?: number;
}) {
  const days = Math.max(1, Math.floor(params.days || PROJECTION_DAYS));
  const forecastByDate = new Map<string, { inflow: number; outflow: number }>();

  for (const row of params.pendingRows) {
    const normalizedType = normalizeTransactionType(row.type);
    const amount = numberFrom(row.amount);
    const key = startOfDay(new Date(row.effective_date)).toISOString().slice(0, 10);
    const bucket = forecastByDate.get(key) ?? { inflow: 0, outflow: 0 };

    if (normalizedType === 'INCOME') {
      bucket.inflow += amount;
    } else if (normalizedType === 'EXPENSE') {
      bucket.outflow += amount;
    }

    forecastByDate.set(key, bucket);
  }

  const daily: DashboardOverviewForecastPoint[] = [];
  let runningBalance = params.currentBalance;
  let projectedNegativeDate: string | null = null;
  let nextCriticalDate: string | null = null;

  for (let dayOffset = 0; dayOffset < days; dayOffset += 1) {
    const currentDate = addDays(params.todayStart, dayOffset);
    const key = currentDate.toISOString().slice(0, 10);
    const bucket = forecastByDate.get(key) ?? { inflow: 0, outflow: 0 };
    const openingBalance = runningBalance;
    const closingBalance = openingBalance + bucket.inflow - bucket.outflow;

    daily.push({
      date: key,
      openingBalance,
      inflow: bucket.inflow,
      outflow: bucket.outflow,
      closingBalance,
    });

    if (projectedNegativeDate === null && closingBalance < 0) {
      projectedNegativeDate = key;
    }
    if (nextCriticalDate === null && closingBalance <= params.currentBalance * 0.15) {
      nextCriticalDate = key;
    }

    runningBalance = closingBalance;
  }

  const projectionIndex = Math.min(PROJECTION_DAYS, daily.length) - 1;
  return {
    daily,
    projectedBalance30d:
      projectionIndex >= 0 ? daily[projectionIndex].closingBalance : params.currentBalance,
    projectedNegativeDate,
    nextCriticalDate,
  };
}

function buildDailyForecastFromReadModelRows(rows: DailyProjectionRow[], days: number) {
  const normalizedDays = Math.max(1, Math.floor(days));
  return rows.slice(0, normalizedDays).map((row) => ({
    date: row.date.toISOString().slice(0, 10),
    openingBalance: numberFrom(row.opening_balance),
    inflow: numberFrom(row.inflow_confirmed) + numberFrom(row.inflow_planned),
    outflow: numberFrom(row.outflow_confirmed) + numberFrom(row.outflow_planned),
    closingBalance: numberFrom(row.closing_balance),
  }));
}

function buildForecastFromReadModelRows(rows: DailyProjectionRow[]) {
  const daily = buildDailyForecastFromReadModelRows(rows, PROJECTION_DAYS);

  return {
    daily,
    projectedBalance30d: daily.at(-1)?.closingBalance ?? null,
  };
}

function extendForecastSeriesToDays(params: {
  daily: DashboardOverviewForecastPoint[];
  startDate: Date;
  targetDays: number;
  baseBalance: number;
}) {
  const targetDays = Math.max(1, Math.floor(params.targetDays));
  if (params.daily.length >= targetDays) {
    return params.daily.slice(0, targetDays);
  }

  const seed = [...params.daily];
  if (seed.length === 0) {
    let runningBalance = params.baseBalance;
    for (let dayOffset = 0; dayOffset < targetDays; dayOffset += 1) {
      const currentDate = addDays(params.startDate, dayOffset);
      const key = currentDate.toISOString().slice(0, 10);
      seed.push({
        date: key,
        openingBalance: runningBalance,
        inflow: 0,
        outflow: 0,
        closingBalance: runningBalance,
      });
    }
    return seed;
  }

  let runningBalance = seed.at(-1)?.closingBalance ?? params.baseBalance;
  for (let dayOffset = seed.length; dayOffset < targetDays; dayOffset += 1) {
    const currentDate = addDays(params.startDate, dayOffset);
    const key = currentDate.toISOString().slice(0, 10);
    seed.push({
      date: key,
      openingBalance: runningBalance,
      inflow: 0,
      outflow: 0,
      closingBalance: runningBalance,
    });
  }

  return seed;
}

function buildHistoricalForecastFromConfirmedRows(params: {
  currentBalance: number;
  historyStart: Date;
  rows: HistoricalConfirmedFlowRow[];
}) {
  const flowByDate = new Map<string, { inflow: number; outflow: number }>();

  for (const row of params.rows) {
    const normalizedType = normalizeTransactionType(row.type);
    const amount = numberFrom(row.amount);
    const key = startOfDay(new Date(row.effective_date)).toISOString().slice(0, 10);
    const bucket = flowByDate.get(key) ?? { inflow: 0, outflow: 0 };

    if (normalizedType === 'INCOME') {
      bucket.inflow += amount;
    } else if (normalizedType === 'EXPENSE') {
      bucket.outflow += amount;
    }

    flowByDate.set(key, bucket);
  }

  let totalNet = 0;
  for (let dayOffset = 0; dayOffset < TREND_CHART_DAYS; dayOffset += 1) {
    const day = addDays(params.historyStart, dayOffset);
    const key = day.toISOString().slice(0, 10);
    const bucket = flowByDate.get(key) ?? { inflow: 0, outflow: 0 };
    totalNet += bucket.inflow - bucket.outflow;
  }

  let runningBalance = params.currentBalance - totalNet;
  const daily: DashboardOverviewForecastPoint[] = [];

  for (let dayOffset = 0; dayOffset < TREND_CHART_DAYS; dayOffset += 1) {
    const day = addDays(params.historyStart, dayOffset);
    const key = day.toISOString().slice(0, 10);
    const bucket = flowByDate.get(key) ?? { inflow: 0, outflow: 0 };
    const openingBalance = runningBalance;
    const closingBalance = openingBalance + bucket.inflow - bucket.outflow;

    daily.push({
      date: key,
      openingBalance,
      inflow: bucket.inflow,
      outflow: bucket.outflow,
      closingBalance,
    });

    runningBalance = closingBalance;
  }

  return daily;
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

function isMissingTableError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === 'P2021' || error.code === 'P2022';
  }
  if (error instanceof Prisma.PrismaClientValidationError) {
    return error.message.includes('Unknown argument');
  }
  return false;
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

export async function buildDashboardOverview(workspaceId: string): Promise<DashboardOverviewPayload> {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const historyStart = addDays(todayStart, -(TREND_CHART_DAYS - 1));
  const nextTrendDaysEnd = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + (TREND_CHART_DAYS - 1),
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

  const readModel = await safeSection<DashboardReadModelRow | null>(
    workspaceId,
    'dashboard_read_model',
    null,
    async () => {
      try {
        return await prisma.dashboardReadModel.findUnique({
          where: { workspace_id: workspaceId },
          select: {
            as_of_date: true,
            current_balance: true,
            projected_balance_30d: true,
            projected_negative_date: true,
            month_confirmed_income: true,
            month_confirmed_expense: true,
            month_planned_income: true,
            month_planned_expense: true,
            next_critical_date: true,
            updated_at: true,
          },
        });
      } catch (error) {
        if (isMissingTableError(error)) {
          return null;
        }
        throw error;
      }
    }
  );

  let currentBalance = 0;
  let monthConfirmedIncome = 0;
  let monthConfirmedExpense = 0;
  let monthPlannedIncome = 0;
  let monthPlannedExpense = 0;
  let projectedBalance30d: number | null = null;
  let projectedNegativeDate: string | null = null;
  let nextCriticalDate: string | null = null;
  let forecastDaily: DashboardOverviewForecastPoint[] = [];
  let upcomingEvents: DashboardOverviewUpcomingEvent[] = [];

  if (readModel) {
    currentBalance = numberFrom(readModel.current_balance);
    monthConfirmedIncome = numberFrom(readModel.month_confirmed_income);
    monthConfirmedExpense = numberFrom(readModel.month_confirmed_expense);
    monthPlannedIncome = numberFrom(readModel.month_planned_income);
    monthPlannedExpense = numberFrom(readModel.month_planned_expense);
    projectedBalance30d = numberFrom(readModel.projected_balance_30d);
    projectedNegativeDate = readModel.projected_negative_date
      ? readModel.projected_negative_date.toISOString().slice(0, 10)
      : null;
    nextCriticalDate = readModel.next_critical_date
      ? readModel.next_critical_date.toISOString().slice(0, 10)
      : null;

    const projectionRows = await safeSection<DailyProjectionRow[]>(
      workspaceId,
      'daily_cash_projection',
      [],
      async () => {
        try {
          return await prisma.dailyCashProjection.findMany({
            where: {
              workspace_id: workspaceId,
              date: {
                gte: todayStart,
                lte: nextTrendDaysEnd,
              },
            },
            orderBy: { date: 'asc' },
            select: {
              date: true,
              opening_balance: true,
              inflow_confirmed: true,
              outflow_confirmed: true,
              inflow_planned: true,
              outflow_planned: true,
              closing_balance: true,
            },
          });
        } catch (error) {
          if (isMissingTableError(error)) {
            return [];
          }
          throw error;
        }
      }
    );

    if (projectionRows.length > 0) {
      const projection = buildForecastFromReadModelRows(projectionRows);
      forecastDaily = buildDailyForecastFromReadModelRows(projectionRows, TREND_CHART_DAYS);
      projectedBalance30d = projection.projectedBalance30d;
    }

    forecastDaily = extendForecastSeriesToDays({
      daily: forecastDaily,
      startDate: todayStart,
      targetDays: TREND_CHART_DAYS,
      baseBalance: currentBalance,
    });

    const upcomingRows = await safeSection<CalendarUpcomingRow[]>(
      workspaceId,
      'calendar_upcoming_events',
      [],
      async () => {
        try {
          return await prisma.calendarEventReadModel.findMany({
            where: {
              workspace_id: workspaceId,
              date: {
                gte: todayStart,
                lte: next14DaysEnd,
              },
              status: {
                in: ['PENDING', 'OVERDUE'],
              },
            },
            orderBy: [{ date: 'asc' }, { created_at: 'asc' }],
            take: UPCOMING_EVENTS_LIMIT,
            select: {
              id: true,
              title: true,
              date: true,
              status: true,
              flow: true,
              type: true,
              amount: true,
              source_type: true,
              category: true,
            },
          });
        } catch (error) {
          if (isMissingTableError(error)) {
            return [];
          }
          throw error;
        }
      }
    );

    upcomingEvents = upcomingRows.map((row) => ({
      id: row.id,
      title: row.title,
      date: row.date.toISOString(),
      status: String(row.status || 'PENDING').toUpperCase(),
      flow: mapCalendarFlow(row.flow),
      type: String(row.type || '').toUpperCase(),
      amount: numberFrom(row.amount),
      sourceType: row.source_type ? String(row.source_type) : null,
      category: row.category ?? null,
    }));
  } else {
    const wallets = await safeSection<Array<{ balance: DecimalLike }>>(
      workspaceId,
      'wallet_balances',
      [],
      () =>
        prisma.wallet.findMany({
          where: { workspace_id: workspaceId },
          select: { balance: true },
        })
    );
    currentBalance = wallets.reduce((acc, wallet) => acc + numberFrom(wallet.balance), 0);

    const totals = await safeSection<TotalsRow[]>(
      workspaceId,
      'fallback_totals',
      [],
      () =>
        prisma.$queryRaw<TotalsRow[]>(Prisma.sql`
          SELECT
            COALESCE(SUM(CASE WHEN "status" = 'CONFIRMED' AND "type" IN ('INCOME', 'PIX_IN') AND "date" >= ${monthStart} AND "date" < ${nextMonthStart} THEN "amount" ELSE 0 END), 0) AS month_confirmed_income,
            COALESCE(SUM(CASE WHEN "status" = 'CONFIRMED' AND "type" IN ('EXPENSE', 'PIX_OUT') AND "date" >= ${monthStart} AND "date" < ${nextMonthStart} THEN "amount" ELSE 0 END), 0) AS month_confirmed_expense,
            COALESCE(SUM(CASE WHEN "status" = 'PENDING' AND "type" IN ('INCOME', 'PIX_IN') AND COALESCE("due_date", "date") >= ${monthStart} AND COALESCE("due_date", "date") < ${nextMonthStart} THEN "amount" ELSE 0 END), 0) AS month_planned_income,
            COALESCE(SUM(CASE WHEN "status" = 'PENDING' AND "type" IN ('EXPENSE', 'PIX_OUT') AND COALESCE("due_date", "date") >= ${monthStart} AND COALESCE("due_date", "date") < ${nextMonthStart} THEN "amount" ELSE 0 END), 0) AS month_planned_expense
          FROM "Transaction"
          WHERE "workspace_id" = ${workspaceId}
        `)
    );

    const totalRow = totals[0];
    monthConfirmedIncome = numberFrom(totalRow?.month_confirmed_income || 0);
    monthConfirmedExpense = numberFrom(totalRow?.month_confirmed_expense || 0);
    monthPlannedIncome = numberFrom(totalRow?.month_planned_income || 0);
    monthPlannedExpense = numberFrom(totalRow?.month_planned_expense || 0);

    const pendingForecastRows = await safeSection<PendingForecastRow[]>(
      workspaceId,
      'fallback_pending_projection',
      [],
      () =>
        prisma.$queryRaw<PendingForecastRow[]>(Prisma.sql`
          SELECT
            COALESCE("due_date", "date") AS effective_date,
            "type",
            "amount"
          FROM "Transaction"
          WHERE "workspace_id" = ${workspaceId}
            AND "status" = 'PENDING'
            AND COALESCE("due_date", "date") >= ${todayStart}
            AND COALESCE("due_date", "date") <= ${nextTrendDaysEnd}
          ORDER BY effective_date ASC, "created_at" ASC
        `)
    );

    const fallbackForecast = buildForecastFromPendingRows({
      currentBalance,
      todayStart,
      pendingRows: pendingForecastRows,
      days: PROJECTION_DAYS,
    });
    forecastDaily = buildForecastFromPendingRows({
      currentBalance,
      todayStart,
      pendingRows: pendingForecastRows,
      days: TREND_CHART_DAYS,
    }).daily;
    projectedBalance30d = fallbackForecast.projectedBalance30d;
    projectedNegativeDate = fallbackForecast.projectedNegativeDate;
    nextCriticalDate = fallbackForecast.nextCriticalDate;

    const fallbackUpcomingEvents = await safeSection<CalendarUpcomingRow[]>(
      workspaceId,
      'fallback_upcoming_events',
      [],
      () =>
        prisma.$queryRaw<CalendarUpcomingRow[]>(Prisma.sql`
          SELECT
            "Transaction"."id",
            "Transaction"."description" AS title,
            COALESCE("Transaction"."due_date", "Transaction"."date") AS date,
            "Transaction"."status",
            CASE
              WHEN "Transaction"."type" IN ('INCOME', 'PIX_IN') THEN 'in'
              WHEN "Transaction"."type" IN ('EXPENSE', 'PIX_OUT') THEN 'out'
              ELSE 'neutral'
            END AS flow,
            "Transaction"."type",
            "Transaction"."amount",
            "Transaction"."origin_type" AS source_type,
            "Category"."name" AS category
          FROM "Transaction"
          LEFT JOIN "Category" ON "Category"."id" = "Transaction"."category_id"
          WHERE "Transaction"."workspace_id" = ${workspaceId}
            AND "Transaction"."status" = 'PENDING'
            AND COALESCE("Transaction"."due_date", "Transaction"."date") >= ${todayStart}
            AND COALESCE("Transaction"."due_date", "Transaction"."date") <= ${next14DaysEnd}
          ORDER BY date ASC, "Transaction"."created_at" ASC
          LIMIT ${UPCOMING_EVENTS_LIMIT}
        `)
    );

    upcomingEvents = fallbackUpcomingEvents.map((row) => ({
      id: row.id,
      title: row.title,
      date: row.date.toISOString(),
      status: String(row.status || 'PENDING').toUpperCase(),
      flow: mapCalendarFlow(row.flow),
      type: String(row.type || '').toUpperCase(),
      amount: numberFrom(row.amount),
      sourceType: row.source_type ? String(row.source_type) : null,
      category: row.category ?? null,
    }));
  }

  // Keep monthly confirmed totals consistent with recorded transactions even when the
  // financial read-model has not been refreshed yet.
  const monthConfirmedTotals = await safeSection<MonthConfirmedTotalsRow[]>(
    workspaceId,
    'month_confirmed_totals',
    [],
    () =>
      prisma.$queryRaw<MonthConfirmedTotalsRow[]>(Prisma.sql`
        SELECT
          COALESCE(SUM(CASE WHEN COALESCE("status", 'CONFIRMED') = 'CONFIRMED' AND "type" IN ('INCOME', 'PIX_IN') THEN "amount" ELSE 0 END), 0) AS month_confirmed_income,
          COALESCE(SUM(CASE WHEN COALESCE("status", 'CONFIRMED') = 'CONFIRMED' AND "type" IN ('EXPENSE', 'PIX_OUT') THEN "amount" ELSE 0 END), 0) AS month_confirmed_expense
        FROM "Transaction"
        WHERE "workspace_id" = ${workspaceId}
          AND "date" >= ${monthStart}
          AND "date" < ${nextMonthStart}
      `)
  );
  const monthConfirmedTotalRow = monthConfirmedTotals[0];
  if (monthConfirmedTotalRow) {
    monthConfirmedIncome = numberFrom(monthConfirmedTotalRow.month_confirmed_income);
    monthConfirmedExpense = numberFrom(monthConfirmedTotalRow.month_confirmed_expense);
  }

  const historicalConfirmedFlowRows = await safeSection<HistoricalConfirmedFlowRow[]>(
    workspaceId,
    'historical_confirmed_flows',
    [],
    () =>
      prisma.$queryRaw<HistoricalConfirmedFlowRow[]>(Prisma.sql`
        SELECT
          DATE_TRUNC('day', "date") AS effective_date,
          "type",
          COALESCE(SUM("amount"), 0) AS amount
        FROM "Transaction"
        WHERE "workspace_id" = ${workspaceId}
          AND COALESCE("status", 'CONFIRMED') = 'CONFIRMED'
          AND "type" IN ('INCOME', 'PIX_IN', 'EXPENSE', 'PIX_OUT')
          AND "date" >= ${historyStart}
          AND "date" <= ${todayEnd}
        GROUP BY 1, 2
        ORDER BY 1 ASC
      `)
  );

  const hasProjectedMovement = forecastDaily.some(
    (point) =>
      point.inflow > 0 ||
      point.outflow > 0 ||
      Math.abs(point.closingBalance - point.openingBalance) > 0.0001
  );
  if (!hasProjectedMovement && historicalConfirmedFlowRows.length > 0) {
    forecastDaily = buildHistoricalForecastFromConfirmedRows({
      currentBalance,
      historyStart,
      rows: historicalConfirmedFlowRows,
    });
  }

  const recentTransactionsRows = await safeSection<RecentTransactionRow[]>(
    workspaceId,
    'recent_transactions',
    [],
    () =>
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
      })
  );

  const monthlySeriesRows = await safeSection<MonthlySeriesRow[]>(
    workspaceId,
    'monthly_series',
    [],
    () =>
      prisma.$queryRaw<MonthlySeriesRow[]>(Prisma.sql`
        SELECT
          DATE_TRUNC('month', "date") AS month,
          COALESCE(SUM(CASE WHEN "status" = 'CONFIRMED' AND "type" IN ('INCOME', 'PIX_IN') THEN "amount" ELSE 0 END), 0) AS income,
          COALESCE(SUM(CASE WHEN "status" = 'CONFIRMED' AND "type" IN ('EXPENSE', 'PIX_OUT') THEN "amount" ELSE 0 END), 0) AS expense
        FROM "Transaction"
        WHERE "workspace_id" = ${workspaceId}
          AND "date" >= ${seriesStart}
          AND "date" < ${nextMonthStart}
        GROUP BY 1
        ORDER BY 1 ASC
      `)
  );

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
          AND "Transaction"."status" = 'CONFIRMED'
          AND "Transaction"."date" >= ${previousMonthStart}
        ORDER BY "Transaction"."date" DESC
      `)
  );

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
          AND "Transaction"."status" = 'CONFIRMED'
          AND "Transaction"."type" IN ('EXPENSE', 'PIX_OUT')
          AND "Transaction"."date" >= ${monthStart}
          AND "Transaction"."date" < ${nextMonthStart}
        GROUP BY 1
        ORDER BY total DESC
        LIMIT 1
      `)
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

  const insightRows = insightTransactions.map((row) => ({
    type: row.type,
    amount: numberFrom(row.amount),
    date: row.date,
    category: row.category_name ? { name: row.category_name } : null,
  }));
  const automatedInsights = buildFinancialInsights(insightRows, currentBalance)
    .map((item) => item.trim())
    .filter(Boolean);

  const topExpense = topExpenseRows[0];
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
      description: topExpense
        ? `${topExpenseLabel} concentra a maior saída confirmada do mês.`
        : topExpenseLabel,
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
    monthlySeries: buildMonthlySeries(monthlySeriesRows, seriesStart),
    alerts: alerts.slice(0, 4),
    insights: {
      primary: insightCards,
      automated: automatedInsights.slice(0, 3),
    },
    upcomingEvents,
    recentTransactions,
  };
}
