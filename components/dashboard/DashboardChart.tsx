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
        <h3 className="text-base font-semibold tracking-tight text-[var(--text-primary)]">Receitas vs Despesas</h3>
        <p className="text-xs text-[var(--text-secondary)]">Comparativo dos últimos 6 meses para leitura rápida de ritmo financeiro.</p>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
        <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-[rgba(8,15,27,0.48)] px-2 py-0.5">
          <span className="size-1.5 rounded-full bg-[var(--positive)]" /> Entradas
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-[rgba(8,15,27,0.48)] px-2 py-0.5">
          <span className="size-1.5 rounded-full bg-[var(--danger)]" /> Saídas
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
                <CartesianGrid strokeDasharray="3 8" stroke="rgba(148,163,184,0.20)" vertical={false} />
                <XAxis dataKey="label" stroke="rgba(148,163,184,0.8)" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis
                  stroke="rgba(148,163,184,0.8)"
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
                  formatter={(value, name) => [formatCurrency(Number(value || 0)), name === 'income' ? 'Entradas' : 'Saídas']}
                />
                <Line
                  type="monotone"
                  dataKey="income"
                  name="income"
                  stroke="var(--positive)"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 3.5, fill: 'var(--positive)', stroke: 'var(--bg-surface)', strokeWidth: 1 }}
                />
                <Line
                  type="monotone"
                  dataKey="expense"
                  name="expense"
                  stroke="var(--danger)"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 3.5, fill: 'var(--danger)', stroke: 'var(--bg-surface)', strokeWidth: 1 }}
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

