import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { DashboardOverviewMonthlySeriesPoint } from '@/lib/dashboard/overview';
import { DashboardSkeletonLine } from '@/components/dashboard/dashboard-primitives';
import { formatCurrency } from '@/components/dashboard/dashboard-utils';

type DashboardChartProps = {
  monthlySeries: DashboardOverviewMonthlySeriesPoint[];
  loading: boolean;
};

export function DashboardChart({ monthlySeries, loading }: DashboardChartProps) {
  return (
    <div className="app-surface-card rounded-2xl p-5 sm:p-6 lg:col-span-2">
      <div className="mb-6">
        <h3 className="card-title-premium text-[var(--text-primary)]">Receitas vs Despesas</h3>
        <p className="text-sm text-[var(--text-secondary)]">Últimos 6 meses</p>
      </div>

      {loading ? (
        <div className="space-y-4">
          <DashboardSkeletonLine className="h-5 w-36" />
          <DashboardSkeletonLine className="h-[280px] w-full rounded-2xl sm:h-[320px]" />
        </div>
      ) : (
        <div className="h-[280px] w-full sm:h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlySeries}>
              <CartesianGrid strokeDasharray="2 6" stroke="var(--border-default)" vertical={false} />
              <XAxis dataKey="label" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => formatCurrency(Number(value || 0))} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-default)',
                  borderRadius: '12px',
                  boxShadow: 'var(--shadow-soft)',
                }}
                formatter={(value, name) => [formatCurrency(Number(value || 0)), name === 'income' ? 'Receitas' : 'Despesas']}
              />
              <Line type="monotone" dataKey="income" name="income" stroke="var(--positive)" strokeWidth={2.5} dot={false} activeDot={{ r: 4, fill: 'var(--positive)', stroke: 'var(--bg-surface)', strokeWidth: 1 }} />
              <Line type="monotone" dataKey="expense" name="expense" stroke="var(--danger)" strokeWidth={2.5} dot={false} activeDot={{ r: 4, fill: 'var(--danger)', stroke: 'var(--bg-surface)', strokeWidth: 1 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
