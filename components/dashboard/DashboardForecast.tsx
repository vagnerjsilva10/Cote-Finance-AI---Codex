import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { DashboardOverviewAlert, DashboardOverviewForecast as DashboardOverviewForecastData } from '@/lib/dashboard/overview';
import {
  DASHBOARD_CARD_PANEL_CLASSNAME,
  DASHBOARD_CARD_SHELL_CLASSNAME,
  DashboardSkeletonLine,
} from '@/components/dashboard/dashboard-primitives';
import { formatCurrency, formatDateShort } from '@/components/dashboard/dashboard-utils';
import { cn } from '@/lib/utils';

type DashboardDecisionPanelProps = {
  forecast: DashboardOverviewForecastData | null;
  alerts: DashboardOverviewAlert[];
  loading: boolean;
};

type DashboardMonthSummaryCardProps = {
  forecast: DashboardOverviewForecastData | null;
  loading: boolean;
};

type DashboardBalanceEvolutionCardProps = {
  forecast: DashboardOverviewForecastData | null;
  loading: boolean;
};

const ALERT_TONE_TAG: Record<DashboardOverviewAlert['tone'], string> = {
  danger: 'Alerta',
  warning: 'Atenção',
  info: 'Observação',
  success: 'Estável',
};

function getAlertToneClassName(tone: DashboardOverviewAlert['tone']) {
  if (tone === 'danger') {
    return 'border-[color:color-mix(in_srgb,var(--danger)_42%,transparent)] bg-[color:color-mix(in_srgb,var(--danger)_10%,transparent)]';
  }
  if (tone === 'warning') {
    return 'border-[color:color-mix(in_srgb,var(--warning)_42%,transparent)] bg-[color:color-mix(in_srgb,var(--warning)_10%,transparent)]';
  }
  if (tone === 'success') {
    return 'border-[color:color-mix(in_srgb,var(--success)_40%,transparent)] bg-[color:color-mix(in_srgb,var(--success)_10%,transparent)]';
  }
  return 'border-[color:color-mix(in_srgb,var(--primary)_40%,transparent)] bg-[color:color-mix(in_srgb,var(--primary)_10%,transparent)]';
}

export function DashboardDecisionPanel({ forecast, alerts, loading }: DashboardDecisionPanelProps) {
  const hasAlerts = alerts.length > 0;
  const visibleAlerts = alerts.slice(0, 2);

  return (
    <section className={cn(DASHBOARD_CARD_SHELL_CLASSNAME, 'min-h-[186px] space-y-2.5 !p-3.5 sm:!p-4')}>
      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-0.5">
          <h3 className="text-base font-bold tracking-tight text-[var(--text-primary)]">Resumo para decisão</h3>
          <p className="text-xs text-[var(--text-secondary)]">
            {loading
              ? 'Consolidando sinais da sua conta...'
              : forecast
                ? `Atualizado em ${formatDateShort(forecast.updatedAt)}`
                : 'Sem dados suficientes para consolidar alertas no momento.'}
          </p>
        </div>
        <span className="inline-flex w-fit items-center rounded-full border border-[var(--border-soft)] bg-[var(--bg-tertiary)] px-2 py-0.5 text-xs font-bold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
          {loading ? 'Analisando' : hasAlerts ? `${alerts.length} alerta(s)` : 'Sem alertas'}
        </span>
      </div>

      <div className="space-y-2">
        {loading ? (
          <>
            <DashboardSkeletonLine className="h-[56px] w-full rounded-xl" />
            <DashboardSkeletonLine className="h-[56px] w-full rounded-xl" />
          </>
        ) : hasAlerts ? (
          visibleAlerts.map((alert) => (
            <article key={alert.id} className={cn(DASHBOARD_CARD_PANEL_CLASSNAME, 'space-y-1.5 p-2.5', getAlertToneClassName(alert.tone))}>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">{ALERT_TONE_TAG[alert.tone]}</p>
              <p className="text-sm font-semibold leading-tight text-[var(--text-primary)]">{alert.title}</p>
              <p className="text-xs leading-snug text-[var(--text-secondary)]">{alert.message}</p>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  className="rounded-md border border-[var(--border-soft)] bg-[var(--bg-tertiary)] px-2 py-1 text-xs font-semibold text-[var(--text-primary)] transition-all duration-200 hover:border-[var(--border-default)]"
                >
                  Ver sa�das futuras
                </button>
                <button
                  type="button"
                  className="rounded-md border border-[var(--border-soft)] bg-[var(--bg-tertiary)] px-2 py-1 text-xs font-semibold text-[var(--text-primary)] transition-all duration-200 hover:border-[var(--border-default)]"
                >
                  Ajustar orçamento
                </button>
              </div>
            </article>
          ))
        ) : (
          <div className={cn(DASHBOARD_CARD_PANEL_CLASSNAME, 'p-2.5')}>
            <p className="text-sm font-semibold text-[var(--text-primary)]">Fluxo financeiro sob controle</p>
            <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
              Nenhum alerta crítico no momento. Continue acompanhando para antecipar variações de caixa.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

export function DashboardMonthSummaryCard({ forecast, loading }: DashboardMonthSummaryCardProps) {
  const confirmedNet = forecast ? forecast.monthConfirmedIncome - forecast.monthConfirmedExpense : null;
  const plannedNet = forecast ? forecast.monthPlannedIncome - forecast.monthPlannedExpense : null;

  const trendLabel = plannedNet === null ? 'Neutra' : plannedNet > 0 ? 'Positiva' : plannedNet < 0 ? 'Negativa' : 'Neutra';

  const trendClassName =
    trendLabel === 'Positiva'
      ? 'text-[var(--success)]'
      : trendLabel === 'Negativa'
        ? 'text-[var(--danger)]'
        : 'text-[var(--text-secondary)]';

  return (
    <section className={cn(DASHBOARD_CARD_SHELL_CLASSNAME, 'min-h-[186px] space-y-2.5 !p-3.5 sm:!p-4')}>
      <div className="space-y-0.5">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Resumo do mês</p>
        {loading ? (
          <DashboardSkeletonLine className="h-8 w-32 rounded-xl" />
        ) : (
          <p
            className={cn(
              'text-2xl font-black leading-tight tracking-[-0.01em]',
              plannedNet !== null && plannedNet < 0 ? 'text-[var(--danger)]' : 'text-[var(--success)]'
            )}
          >
            {plannedNet === null ? '--' : formatCurrency(plannedNet)}
          </p>
        )}
      </div>

      {loading ? (
        <div className="space-y-1.5">
          <DashboardSkeletonLine className="h-3.5 w-full" />
          <DashboardSkeletonLine className="h-3.5 w-full" />
          <DashboardSkeletonLine className="h-3.5 w-full" />
          <DashboardSkeletonLine className="h-3.5 w-full" />
        </div>
      ) : (
        <>
          <div className={cn(DASHBOARD_CARD_PANEL_CLASSNAME, 'space-y-1.5 p-2.5 text-xs')}>
            <p className="text-[var(--text-secondary)]">
              Confirmado:{' '}
              <span className={cn('font-semibold', confirmedNet !== null && confirmedNet < 0 ? 'text-[var(--danger)]' : 'text-[var(--text-primary)]')}>
                {confirmedNet === null ? '--' : formatCurrency(confirmedNet)}
              </span>
            </p>
            <p className="text-[var(--text-secondary)]">
              Previsto:{' '}
              <span className={cn('font-semibold', plannedNet !== null && plannedNet < 0 ? 'text-[var(--danger)]' : 'text-[var(--text-primary)]')}>
                {plannedNet === null ? '--' : formatCurrency(plannedNet)}
              </span>
            </p>
            <p className="text-[var(--text-secondary)]">
              Tendência: <span className={cn('font-semibold', trendClassName)}>{trendLabel}</span>
            </p>
          </div>

          <div className={cn(DASHBOARD_CARD_PANEL_CLASSNAME, 'space-y-1.5 p-2.5')}>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--text-muted)]">Fluxo do mês</p>
            <p className="text-xs text-[var(--text-secondary)]">
              Entradas: <span className="font-semibold text-[var(--success)]">{forecast ? formatCurrency(forecast.monthPlannedIncome) : '--'}</span>
            </p>
            <p className="text-xs text-[var(--text-secondary)]">
              Saídas: <span className="font-semibold text-[var(--danger)]">{forecast ? formatCurrency(forecast.monthPlannedExpense) : '--'}</span>
            </p>
          </div>
        </>
      )}
    </section>
  );
}

export function DashboardBalanceEvolutionCard({ forecast, loading }: DashboardBalanceEvolutionCardProps) {
  const projectionCurveRows =
    forecast?.daily.map((row) => ({
      dateKey: new Date(row.date).toISOString().slice(0, 10),
      dateLabel: formatDateShort(row.date),
      closingBalance: row.closingBalance,
    })) ?? [];

  const todayDateKey = forecast ? new Date(forecast.asOfDate).toISOString().slice(0, 10) : null;
  const todayPoint = projectionCurveRows.find((row) => row.dateKey === todayDateKey);

  return (
    <section className={cn(DASHBOARD_CARD_SHELL_CLASSNAME, 'min-h-[286px] space-y-3.5 !p-4 sm:!p-5')}>
      <div className="flex flex-col gap-1">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Evolução do saldo (30 dias)</p>
        <p className="text-sm text-[var(--text-secondary)]">Leitura diária do fechamento projetado com referência de hoje.</p>
      </div>

      {loading ? (
        <div className="space-y-2.5">
          <DashboardSkeletonLine className="h-4 w-40" />
          <DashboardSkeletonLine className="h-[220px] w-full rounded-xl sm:h-[240px]" />
        </div>
      ) : projectionCurveRows.length > 0 ? (
        <div className="h-[220px] w-full sm:h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={projectionCurveRows} margin={{ top: 8, right: 14, left: 0, bottom: 2 }}>
              <CartesianGrid strokeDasharray="3 7" stroke="color-mix(in srgb, var(--neutral) 24%, transparent)" vertical={false} />
              <XAxis dataKey="dateLabel" stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} />
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
                formatter={(value) => [formatCurrency(Number(value || 0)), 'Saldo projetado']}
              />
              <ReferenceLine y={0} stroke="var(--danger)" strokeDasharray="4 4" />
              {todayPoint ? (
                <ReferenceLine
                  x={todayPoint.dateLabel}
                  stroke="var(--accent)"
                  strokeDasharray="4 4"
                  label={{
                    value: 'Hoje',
                    position: 'insideTopRight',
                    fill: 'var(--text-muted)',
                    fontSize: 10,
                  }}
                />
              ) : null}
              <Line
                type="monotone"
                dataKey="closingBalance"
                stroke="var(--chart-balance)"
                strokeWidth={2.6}
                dot={false}
                activeDot={{ r: 4, fill: 'var(--chart-balance)', stroke: 'var(--bg-card)', strokeWidth: 1 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="text-sm text-[var(--text-secondary)]">
          Ainda não há dados suficientes para projeção. Adicione movimentações para visualizar previsões.
        </p>
      )}
    </section>
  );
}


