import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { DashboardOverviewAlert, DashboardOverviewForecast as DashboardOverviewForecastData } from '@/lib/dashboard/overview';
import { DashboardSkeletonLine } from '@/components/dashboard/dashboard-primitives';
import { formatCurrency, formatDateShort } from '@/components/dashboard/dashboard-utils';
import { cn } from '@/lib/utils';

type DashboardForecastProps = {
  forecast: DashboardOverviewForecastData | null;
  alerts: DashboardOverviewAlert[];
  loading: boolean;
};

export function DashboardForecast({ forecast, alerts, loading }: DashboardForecastProps) {
  const monthConfirmedNet = forecast ? forecast.monthConfirmedIncome - forecast.monthConfirmedExpense : 0;
  const monthProjectedNet = forecast ? forecast.monthPlannedIncome - forecast.monthPlannedExpense : null;
  const projectionCurveRows = forecast?.daily.map((row) => ({
    dateLabel: formatDateShort(row.date),
    closingBalance: row.closingBalance,
  })) ?? [];

  return (
    <div className="app-surface-card rounded-2xl p-5 sm:p-6">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="card-title-premium text-[var(--text-primary)]">Resumo para decisão</h3>
          <p className="text-sm text-[var(--text-secondary)]">
            {loading
              ? 'Carregando visão consolidada da conta...'
              : forecast
                ? `Atualizado em ${formatDateShort(forecast.updatedAt)}`
                : 'Ainda não há dados suficientes para projeção. Adicione movimentações para visualizar previsões.'}
          </p>
        </div>
        <span className="inline-flex w-fit items-center rounded-full border border-[var(--border-default)] bg-[var(--bg-app)] px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">
          {loading ? 'Analisando' : alerts.length > 0 ? `${alerts.length} alerta(s) relevante(s)` : 'Sem alertas críticos'}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-app)] px-4 py-3 lg:col-span-2">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Alertas relevantes</p>
          <div className="mt-3 space-y-2">
            {loading ? (
              <>
                <DashboardSkeletonLine className="h-16 w-full rounded-2xl" />
                <DashboardSkeletonLine className="h-16 w-full rounded-2xl" />
              </>
            ) : alerts.length > 0 ? (
              alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={cn(
                    'rounded-lg border px-3 py-2',
                    alert.tone === 'danger'
                      ? 'border-[color:color-mix(in_srgb,var(--danger)_40%,transparent)] bg-[color:color-mix(in_srgb,var(--danger)_14%,transparent)]'
                      : alert.tone === 'warning'
                        ? 'border-[color:color-mix(in_srgb,var(--warning)_40%,transparent)] bg-[color:color-mix(in_srgb,var(--warning)_14%,transparent)]'
                        : alert.tone === 'success'
                          ? 'border-[color:color-mix(in_srgb,var(--positive)_40%,transparent)] bg-[color:color-mix(in_srgb,var(--positive)_14%,transparent)]'
                          : 'border-[color:color-mix(in_srgb,var(--primary)_40%,transparent)] bg-[color:color-mix(in_srgb,var(--primary)_14%,transparent)]'
                  )}
                >
                  <p className="text-sm font-bold text-[var(--text-primary)]">{alert.title}</p>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">{alert.message}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-[var(--text-secondary)]">Nenhum alerta crítico no momento. Seu fluxo financeiro está estável.</p>
            )}
          </div>
        </div>

        <div className="app-surface-subtle rounded-2xl p-4">
          <p className="label-premium text-[var(--text-muted)]">Resumo do mês</p>
          {loading ? (
            <div className="mt-4 space-y-3">
              <DashboardSkeletonLine className="h-10 w-32 rounded-xl" />
              <DashboardSkeletonLine className="h-4 w-28" />
              <DashboardSkeletonLine className="h-4 w-28" />
              <DashboardSkeletonLine className="h-4 w-full" />
            </div>
          ) : (
            <>
              <p className={cn('mt-2 text-2xl font-black', (monthProjectedNet || 0) >= 0 ? 'text-[var(--positive)]' : 'text-[var(--danger)]')}>
                {monthProjectedNet === null ? '--' : formatCurrency(monthProjectedNet)}
              </p>
              <p className="mt-2 text-xs font-semibold text-[var(--text-secondary)]">Confirmado: {formatCurrency(monthConfirmedNet)}</p>
              <p className="mt-1 text-xs font-semibold text-[var(--text-secondary)]">Previsto: {monthProjectedNet === null ? '--' : formatCurrency(monthProjectedNet)}</p>
              <p className="mt-3 text-xs text-[var(--text-secondary)]">
                {monthProjectedNet === null
                  ? 'Adicione movimentações para visualizar a tendência do mês.'
                  : monthProjectedNet >= 0
                    ? 'Tendência positiva para o fechamento do mês.'
                    : 'O mês tende a fechar negativo se nada mudar.'}
              </p>
            </>
          )}
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-app)] px-4 py-3">
        <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Evolução do saldo (30 dias)</p>
        {loading ? (
          <div className="mt-4 space-y-3">
            <DashboardSkeletonLine className="h-5 w-40" />
            <DashboardSkeletonLine className="h-[180px] w-full rounded-2xl" />
          </div>
        ) : projectionCurveRows.length > 0 ? (
          <div className="mt-3 h-[180px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={projectionCurveRows}>
                <CartesianGrid strokeDasharray="2 6" stroke="var(--border-default)" vertical={false} />
                <XAxis dataKey="dateLabel" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(value) => formatCurrency(Number(value || 0))} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-default)',
                    borderRadius: '12px',
                    boxShadow: 'var(--shadow-soft)',
                  }}
                  formatter={(value) => [formatCurrency(Number(value || 0)), 'Saldo previsto']}
                />
                <Line
                  type="monotone"
                  dataKey="closingBalance"
                  stroke="var(--primary)"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 4, fill: 'var(--primary)', stroke: 'var(--bg-surface)', strokeWidth: 1 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="mt-3 text-sm text-[var(--text-secondary)]">Ainda não há dados suficientes para projeção. Adicione movimentações para visualizar previsões.</p>
        )}
      </div>
    </div>
  );
}
