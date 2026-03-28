import * as React from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { DashboardOverviewForecast as DashboardOverviewForecastData } from '@/lib/dashboard/overview';
import {
  DASHBOARD_CARD_PANEL_CLASSNAME,
  DASHBOARD_CARD_SHELL_CLASSNAME,
  DashboardSkeletonLine,
} from '@/components/dashboard/dashboard-primitives';
import { formatCurrency, formatDateShort } from '@/components/dashboard/dashboard-utils';
import { cn } from '@/lib/utils';

type DashboardMainTrendProps = {
  forecast: DashboardOverviewForecastData | null;
  loading: boolean;
};

type PeriodOption = '30D' | '90D' | '1A';

type TrendRow = {
  date: string;
  timestamp: number;
  balance: number;
  income: number;
  expense: number;
};

const PERIOD_OPTIONS: PeriodOption[] = ['30D', '90D', '1A'];
const DAY_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function getWindowSize(period: PeriodOption) {
  if (period === '30D') return 30;
  if (period === '90D') return 90;
  return 365;
}

function parseChartDate(value: string) {
  if (DAY_ONLY_REGEX.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, (month || 1) - 1, day || 1);
  }
  return new Date(value);
}

function formatXAxisTick(value: string, period: PeriodOption) {
  const parsed = parseChartDate(value);
  if (Number.isNaN(parsed.getTime())) return '--';
  if (period === '1A') {
    return parsed.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
  }
  return parsed.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function formatRangeDate(value: string, period: PeriodOption) {
  const parsed = parseChartDate(value);
  if (Number.isNaN(parsed.getTime())) return '--';
  if (period === '1A') {
    return parsed.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  }
  return parsed.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' });
}

function resolveXAxisInterval(period: PeriodOption, points: number) {
  if (points <= 1) return 0;
  if (period === '30D') return Math.max(0, Math.floor(points / 6) - 1);
  if (period === '90D') return Math.max(0, Math.floor(points / 7) - 1);
  return Math.max(0, Math.floor(points / 12) - 1);
}

export function DashboardMainTrend({ forecast, loading }: DashboardMainTrendProps) {
  const [period, setPeriod] = React.useState<PeriodOption>('30D');

  const rows = React.useMemo<TrendRow[]>(
    () =>
      (forecast?.daily ?? [])
        .map((row) => {
          const parsedDate = parseChartDate(row.date);
          return {
            date: row.date,
            timestamp: parsedDate.getTime(),
            balance: row.closingBalance,
            income: row.inflow,
            expense: row.outflow,
          };
        })
        .filter((row) => Number.isFinite(row.timestamp))
        .sort((left, right) => left.timestamp - right.timestamp),
    [forecast?.daily]
  );

  const windowSize = getWindowSize(period);
  const visibleRows = rows.length > windowSize ? rows.slice(-windowSize) : rows;
  const xAxisInterval = resolveXAxisInterval(period, visibleRows.length);
  const rangeLabel =
    visibleRows.length > 0
      ? `${formatRangeDate(visibleRows[0].date, period)} - ${formatRangeDate(
          visibleRows[visibleRows.length - 1].date,
          period
        )}`
      : null;

  return (
    <article className={cn(DASHBOARD_CARD_SHELL_CLASSNAME, 'space-y-3 !p-4 sm:!p-5')}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">Visão Geral</h3>
          {!loading && rangeLabel ? (
            <p className="mt-1 text-xs text-[var(--text-secondary)]">{rangeLabel}</p>
          ) : null}
        </div>
        <div className="inline-flex items-center gap-1 rounded-xl border border-[var(--border-default)] bg-[var(--bg-tertiary)] p-1">
          {PERIOD_OPTIONS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setPeriod(item)}
              className={cn(
                'rounded-lg px-3 py-1 text-sm font-semibold transition-colors',
                period === item
                  ? 'bg-[var(--accent-soft)] text-[var(--text-primary)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              )}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2.5">
          <DashboardSkeletonLine className="h-[320px] w-full rounded-xl" />
        </div>
      ) : visibleRows.length > 0 ? (
        <div className={cn(DASHBOARD_CARD_PANEL_CLASSNAME, 'p-2.5 sm:p-3')}>
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={visibleRows} margin={{ top: 8, right: 14, left: 0, bottom: 6 }}>
                <CartesianGrid
                  strokeDasharray="2 10"
                  stroke="color-mix(in srgb, var(--neutral) 24%, transparent)"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  stroke="var(--text-muted)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  interval={xAxisInterval}
                  tickFormatter={(value) => formatXAxisTick(String(value), period)}
                />
                <YAxis
                  stroke="var(--text-muted)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => formatCurrency(Number(value || 0))}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'color-mix(in srgb, var(--bg-primary) 95%, transparent)',
                    border: '1px solid var(--border-default)',
                    borderRadius: '14px',
                    boxShadow: 'var(--shadow-card)',
                  }}
                  labelStyle={{ color: 'var(--text-secondary)' }}
                  labelFormatter={(value) => formatDateShort(String(value))}
                  formatter={(value, name) => {
                    if (name === 'income') return [formatCurrency(Number(value || 0)), 'Receita'];
                    if (name === 'expense') return [formatCurrency(Number(value || 0)), 'Despesa'];
                    return [formatCurrency(Number(value || 0)), 'Saldo'];
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="balance"
                  name="balance"
                  stroke="var(--chart-balance)"
                  strokeWidth={2.8}
                  dot={false}
                  activeDot={{ r: 4, fill: 'var(--chart-balance)', stroke: 'var(--bg-card)', strokeWidth: 1 }}
                />
                <Line
                  type="monotone"
                  dataKey="income"
                  name="income"
                  stroke="var(--chart-income)"
                  strokeWidth={1.6}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="expense"
                  name="expense"
                  stroke="var(--chart-expense)"
                  strokeWidth={1.6}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex items-center gap-6 px-2 text-sm text-[var(--text-secondary)]">
            <span className="inline-flex items-center gap-2">
              <span className="size-2 rounded-full bg-[var(--chart-income)]" /> Receitas
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="size-2 rounded-full bg-[var(--chart-expense)]" /> Despesas
            </span>
          </div>
        </div>
      ) : (
        <div className={cn(DASHBOARD_CARD_PANEL_CLASSNAME, 'p-3')}>
          <p className="text-sm text-[var(--text-secondary)]">
            Ainda não há dados suficientes para exibir tendência de saldo.
          </p>
        </div>
      )}
    </article>
  );
}

