import * as React from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type {
  DashboardOverviewForecast as DashboardOverviewForecastData,
  DashboardOverviewPeriod,
} from '@/lib/dashboard/overview';
import {
  DASHBOARD_CARD_PANEL_CLASSNAME,
  DASHBOARD_CARD_SHELL_CLASSNAME,
  DashboardSkeletonLine,
} from '@/components/dashboard/dashboard-primitives';
import { formatCurrency } from '@/components/dashboard/dashboard-utils';
import { cn } from '@/lib/utils';

type DashboardMainTrendProps = {
  forecast: DashboardOverviewForecastData | null;
  period: DashboardOverviewPeriod | null;
  loading: boolean;
};

type TrendRow = {
  date: string;
  timestamp: number;
  balance: number;
  income: number;
  expense: number;
};

const DAY_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const HOUR_KEY_REGEX = /^(\d{4}-\d{2}-\d{2})T(\d{2}):\d{2}:\d{2}$/;

function parseChartDate(value: string) {
  if (DAY_ONLY_REGEX.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, (month || 1) - 1, day || 1);
  }

  const hourMatch = HOUR_KEY_REGEX.exec(value);
  if (hourMatch) {
    const datePart = hourMatch[1].split('-').map(Number);
    const hour = Number(hourMatch[2] || 0);
    return new Date(
      datePart[0] || 0,
      (datePart[1] || 1) - 1,
      datePart[2] || 1,
      hour,
      0,
      0,
      0
    );
  }

  return new Date(value);
}

function formatXAxisTick(value: string, period: DashboardOverviewPeriod | null) {
  const parsed = parseChartDate(value);
  if (Number.isNaN(parsed.getTime())) return '--';

  if (period?.granularity === 'hour') {
    return parsed.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  if (period?.granularity === 'week') {
    return parsed.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
    });
  }

  return parsed.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  });
}

function formatRangeDate(value: string, period: DashboardOverviewPeriod | null) {
  const parsed = parseChartDate(value);
  if (Number.isNaN(parsed.getTime())) return '--';

  if (period?.granularity === 'hour') {
    return parsed.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: '2-digit',
    });
  }

  return parsed.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: '2-digit',
  });
}

function resolveXAxisInterval(period: DashboardOverviewPeriod | null, points: number) {
  if (points <= 1) return 0;
  if (period?.granularity === 'hour') return Math.max(0, Math.floor(points / 8) - 1);
  if (period?.granularity === 'week') return Math.max(0, Math.floor(points / 10) - 1);
  return Math.max(0, Math.floor(points / 7) - 1);
}

function formatTooltipLabel(value: string, period: DashboardOverviewPeriod | null) {
  const parsed = parseChartDate(value);
  if (Number.isNaN(parsed.getTime())) return '--';

  if (period?.granularity === 'hour') {
    return parsed.toLocaleString('pt-BR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return parsed.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: '2-digit',
  });
}

export function DashboardMainTrend({ forecast, period, loading }: DashboardMainTrendProps) {
  const rows = React.useMemo<TrendRow[]>(
    () => {
      const dailyPoints = Array.isArray(forecast?.daily) ? forecast.daily : [];
      return dailyPoints
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
        .sort((left, right) => left.timestamp - right.timestamp);
    },
    [forecast]
  );

  const xAxisInterval = resolveXAxisInterval(period, rows.length);
  const rangeLabel =
    rows.length > 0
      ? `${formatRangeDate(rows[0].date, period)} - ${formatRangeDate(
          rows[rows.length - 1].date,
          period
        )}`
      : null;

  return (
    <article className={cn(DASHBOARD_CARD_SHELL_CLASSNAME, 'space-y-3 !p-4 sm:!p-5')}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">Visao Geral</h3>
          {!loading && rangeLabel ? (
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              {period?.label ? `${period.label} - ` : ''}
              {rangeLabel}
            </p>
          ) : null}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2.5">
          <DashboardSkeletonLine className="h-[320px] w-full rounded-xl" />
        </div>
      ) : rows.length > 0 ? (
        <div className={cn(DASHBOARD_CARD_PANEL_CLASSNAME, 'p-2.5 sm:p-3')}>
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rows} margin={{ top: 8, right: 14, left: 0, bottom: 6 }}>
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
                  labelFormatter={(value) => formatTooltipLabel(String(value), period)}
                  formatter={(value, name) => {
                    if (name === 'income') return [formatCurrency(Number(value || 0)), 'Entradas'];
                    if (name === 'expense') return [formatCurrency(Number(value || 0)), 'Saidas'];
                    return [formatCurrency(Number(value || 0)), 'Saldo acumulado'];
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="balance"
                  name="balance"
                  stroke="var(--chart-balance)"
                  strokeWidth={2.8}
                  dot={false}
                  activeDot={{
                    r: 4,
                    fill: 'var(--chart-balance)',
                    stroke: 'var(--bg-card)',
                    strokeWidth: 1,
                  }}
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
              <span className="size-2 rounded-full bg-[var(--chart-income)]" /> Entradas
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="size-2 rounded-full bg-[var(--chart-expense)]" /> Saidas
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="size-2 rounded-full bg-[var(--chart-balance)]" /> Saldo acumulado
            </span>
          </div>
        </div>
      ) : (
        <div className={cn(DASHBOARD_CARD_PANEL_CLASSNAME, 'p-3')}>
          <p className="text-sm text-[var(--text-secondary)]">
            Ainda nao ha dados suficientes para exibir tendencia de saldo neste periodo.
          </p>
        </div>
      )}
    </article>
  );
}
