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
    <section className={cn(DASHBOARD_CARD_SHELL_CLASSNAME, 'min-h-[240px] space-y-4')}>
      <div className="space-y-1">
        <h3 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">{'Receitas vs Despesas'}</h3>
        <p className="text-sm text-[var(--text-secondary)]">
          {'Comparativo dos \u00faltimos 6 meses para leitura r\u00e1pida de ritmo financeiro.'}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-[rgba(8,15,27,0.45)] px-2.5 py-1">
          <span className="size-2 rounded-full bg-[var(--positive)]" /> {'Entradas'}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-[rgba(8,15,27,0.45)] px-2.5 py-1">
          <span className="size-2 rounded-full bg-[var(--danger)]" /> {'Sa\u00eddas'}
        </span>
      </div>

      {loading ? (
        <div className="space-y-3">
          <DashboardSkeletonLine className="h-4 w-32" />
          <DashboardSkeletonLine className="h-[220px] w-full rounded-xl sm:h-[240px]" />
        </div>
      ) : monthlySeries.length > 0 ? (
        <div className={cn(DASHBOARD_CARD_PANEL_CLASSNAME, 'p-3 sm:p-4')}>
          <div className="h-[220px] w-full sm:h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlySeries} margin={{ top: 8, right: 14, left: 2, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 8" stroke="rgba(148,163,184,0.20)" vertical={false} />
                <XAxis dataKey="label" stroke="rgba(148,163,184,0.8)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis
                  stroke="rgba(148,163,184,0.8)"
                  fontSize={11}
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
                  formatter={(value, name) => [formatCurrency(Number(value || 0)), name === 'income' ? 'Entradas' : 'Sa\u00eddas']}
                />
                <Line
                  type="monotone"
                  dataKey="income"
                  name="income"
                  stroke="var(--positive)"
                  strokeWidth={2.6}
                  dot={false}
                  activeDot={{ r: 4, fill: 'var(--positive)', stroke: 'var(--bg-surface)', strokeWidth: 1 }}
                />
                <Line
                  type="monotone"
                  dataKey="expense"
                  name="expense"
                  stroke="var(--danger)"
                  strokeWidth={2.6}
                  dot={false}
                  activeDot={{ r: 4, fill: 'var(--danger)', stroke: 'var(--bg-surface)', strokeWidth: 1 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className={cn(DASHBOARD_CARD_PANEL_CLASSNAME, 'p-4')}>
          <p className="text-sm text-[var(--text-secondary)]">
            {'Ainda n\u00e3o h\u00e1 dados suficientes para este comparativo. Adicione movimenta\u00e7\u00f5es para visualizar o ritmo de entradas e sa\u00eddas.'}
          </p>
        </div>
      )}
    </section>
  );
}