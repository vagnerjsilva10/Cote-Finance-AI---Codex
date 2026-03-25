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

type PeriodOption = '7D' | '30D' | '90D' | '12M';

const PERIOD_OPTIONS: PeriodOption[] = ['7D', '30D', '90D', '12M'];

function getWindowSize(period: PeriodOption) {
  if (period === '7D') return 7;
  if (period === '30D') return 30;
  if (period === '90D') return 90;
  return 365;
}

export function DashboardMainTrend({ forecast, loading }: DashboardMainTrendProps) {
  const [period, setPeriod] = React.useState<PeriodOption>('30D');

  const rows =
    forecast?.daily.map((row) => ({
      dateLabel: formatDateShort(row.date),
      closingBalance: row.closingBalance,
    })) ?? [];

  const windowSize = getWindowSize(period);
  const visibleRows = rows.length > windowSize ? rows.slice(-windowSize) : rows;

  const projected30d = forecast?.projectedBalance30d ?? null;
  const trendLabel = projected30d === null ? 'Neutra' : projected30d > 0 ? 'Positiva' : projected30d < 0 ? 'Atenção' : 'Neutra';

  return (
    <section className="grid grid-cols-1 items-start gap-4 lg:grid-cols-12">
      <div className="lg:col-span-8">
        <article className={cn(DASHBOARD_CARD_SHELL_CLASSNAME, 'space-y-3 !p-4 sm:!p-5')}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <h3 className="text-base font-semibold tracking-tight text-[var(--text-primary)]">Evolução do saldo</h3>
              <p className="text-xs text-[var(--text-secondary)]">Visão consolidada para leitura rápida de tendência.</p>
            </div>
            <div className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-[rgba(8,15,27,0.45)] p-1">
              {PERIOD_OPTIONS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setPeriod(item)}
                  className={cn(
                    'rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors',
                    period === item
                      ? 'bg-[rgba(76,141,255,0.24)] text-[var(--text-primary)]'
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
              <DashboardSkeletonLine className="h-4 w-44" />
              <DashboardSkeletonLine className="h-[260px] w-full rounded-xl" />
            </div>
          ) : visibleRows.length > 0 ? (
            <div className={cn(DASHBOARD_CARD_PANEL_CLASSNAME, 'p-2.5 sm:p-3')}>
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={visibleRows} margin={{ top: 6, right: 12, left: 0, bottom: 2 }}>
                    <CartesianGrid strokeDasharray="3 8" stroke="rgba(148,163,184,0.16)" vertical={false} />
                    <XAxis dataKey="dateLabel" stroke="rgba(148,163,184,0.72)" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis
                      stroke="rgba(148,163,184,0.72)"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => formatCurrency(Number(value || 0))}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(10,20,35,0.95)',
                        border: '1px solid rgba(148,163,184,0.2)',
                        borderRadius: '12px',
                        boxShadow: '0 14px 28px rgba(0, 0, 0, 0.35)',
                      }}
                      labelStyle={{ color: 'var(--text-secondary)' }}
                      formatter={(value) => [formatCurrency(Number(value || 0)), 'Saldo']}
                    />
                    <Line
                      type="monotone"
                      dataKey="closingBalance"
                      stroke="var(--primary)"
                      strokeWidth={2.6}
                      dot={false}
                      activeDot={{ r: 4, fill: 'var(--primary)', stroke: 'var(--bg-surface)', strokeWidth: 1 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div className={cn(DASHBOARD_CARD_PANEL_CLASSNAME, 'p-3')}>
              <p className="text-xs text-[var(--text-secondary)]">Ainda não há dados suficientes para exibir tendência de saldo.</p>
            </div>
          )}
        </article>
      </div>

      <div className="lg:col-span-4">
        <article className={cn(DASHBOARD_CARD_SHELL_CLASSNAME, 'space-y-3 !p-4 sm:!p-5')}>
          <div className="space-y-0.5">
            <h3 className="text-base font-semibold tracking-tight text-[var(--text-primary)]">Resumo financeiro</h3>
            <p className="text-xs text-[var(--text-secondary)]">Compacto e direto para decisão.</p>
          </div>
          {loading ? (
            <div className="space-y-2">
              <DashboardSkeletonLine className="h-4 w-40" />
              <DashboardSkeletonLine className="h-4 w-36" />
              <DashboardSkeletonLine className="h-4 w-28" />
            </div>
          ) : (
            <div className={cn(DASHBOARD_CARD_PANEL_CLASSNAME, 'space-y-2 p-3')}>
              <p className="text-xs text-[var(--text-secondary)]">
                Tendência: <span className="font-semibold text-[var(--text-primary)]">{trendLabel}</span>
              </p>
              <p className="text-xs text-[var(--text-secondary)]">
                Saldo em 30 dias:{' '}
                <span className={cn('font-semibold', projected30d !== null && projected30d < 0 ? 'text-[var(--danger)]' : 'text-[var(--positive)]')}>
                  {projected30d === null ? '--' : formatCurrency(projected30d)}
                </span>
              </p>
              <button type="button" className="rounded-md border border-white/10 px-2.5 py-1 text-xs font-semibold text-[var(--text-primary)] hover:border-white/20">
                Ver metas
              </button>
            </div>
          )}
        </article>
      </div>
    </section>
  );
}
