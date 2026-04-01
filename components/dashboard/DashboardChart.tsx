import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { DashboardOverviewMonthlySeriesPoint } from '@/lib/dashboard/overview';
import {
  DASHBOARD_CARD_PANEL_CLASSNAME,
  DASHBOARD_CARD_SHELL_CLASSNAME,
  DashboardSkeletonLine,
} from '@/components/dashboard/dashboard-primitives';
import { formatCurrency } from '@/components/dashboard/dashboard-utils';
import { cn } from '@/lib/utils';

type DashboardChartProps = {
  monthlySeries: DashboardOverviewMonthlySeriesPoint[];
  loading: boolean;
};

export function DashboardChart({ monthlySeries, loading }: DashboardChartProps) {
  return (
    <section className={cn(DASHBOARD_CARD_SHELL_CLASSNAME, 'min-h-[350px] space-y-3 !p-4 sm:!p-5')}>
      <div className="space-y-1">
        <h3 className="text-base font-semibold tracking-tight text-[var(--text-primary)]">Entradas vs Saidas</h3>
        <p className="text-xs text-[var(--text-secondary)]">Comparativo dos últimos 6 meses para leitura rápida de ritmo financeiro.</p>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
        <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border-soft)] bg-[var(--bg-tertiary)] px-2 py-0.5">
          <span className="size-1.5 rounded-full bg-[var(--chart-income)]" /> Entradas
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border-soft)] bg-[var(--bg-tertiary)] px-2 py-0.5">
          <span className="size-1.5 rounded-full bg-[var(--chart-expense)]" /> Saídas
        </span>
      </div>

      {loading ? (
        <div className="space-y-2.5">
          <DashboardSkeletonLine className="h-3.5 w-28" />
          <DashboardSkeletonLine className="h-[220px] w-full rounded-xl sm:h-[240px]" />
        </div>
      ) : monthlySeries.length > 0 ? (
        <div className={cn(DASHBOARD_CARD_PANEL_CLASSNAME, 'p-2.5 sm:p-3')}>
          <div className="h-[220px] w-full sm:h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlySeries} margin={{ top: 6, right: 12, left: -6, bottom: -2 }}>
                <CartesianGrid strokeDasharray="2 10" stroke="color-mix(in srgb, var(--neutral) 24%, transparent)" vertical={false} />
                <XAxis dataKey="label" stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis
                  stroke="var(--text-muted)"
                  fontSize={10}
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
                  formatter={(value, name) => [formatCurrency(Number(value || 0)), name === 'income' ? 'Entradas' : 'Saídas']}
                />
                <Line
                  type="monotone"
                  dataKey="income"
                  name="income"
                  stroke="var(--chart-income)"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 3.5, fill: 'var(--chart-income)', stroke: 'var(--bg-card)', strokeWidth: 1 }}
                />
                <Line
                  type="monotone"
                  dataKey="expense"
                  name="expense"
                  stroke="var(--chart-expense)"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 3.5, fill: 'var(--chart-expense)', stroke: 'var(--bg-card)', strokeWidth: 1 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className={cn(DASHBOARD_CARD_PANEL_CLASSNAME, 'p-3')}>
          <p className="text-xs text-[var(--text-secondary)]">
            Ainda não há dados suficientes para este comparativo. Adicione movimentações para visualizar o ritmo de entradas e saídas.
          </p>
        </div>
      )}
    </section>
  );
}
