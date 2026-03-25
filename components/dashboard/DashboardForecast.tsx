import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type {
  DashboardOverviewAlert,
  DashboardOverviewForecast as DashboardOverviewForecastData,
} from '@/lib/dashboard/overview';
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
    return 'border-[color:color-mix(in_srgb,var(--danger)_42%,transparent)] bg-[color:color-mix(in_srgb,var(--danger)_12%,transparent)]';
  }
  if (tone === 'warning') {
    return 'border-[color:color-mix(in_srgb,var(--warning)_42%,transparent)] bg-[color:color-mix(in_srgb,var(--warning)_12%,transparent)]';
  }
  if (tone === 'success') {
    return 'border-[color:color-mix(in_srgb,var(--positive)_40%,transparent)] bg-[color:color-mix(in_srgb,var(--positive)_12%,transparent)]';
  }
  return 'border-[color:color-mix(in_srgb,var(--primary)_40%,transparent)] bg-[color:color-mix(in_srgb,var(--primary)_12%,transparent)]';
}

export function DashboardDecisionPanel({ forecast, alerts, loading }: DashboardDecisionPanelProps) {
  const hasAlerts = alerts.length > 0;

  return (
    <section className={cn(DASHBOARD_CARD_SHELL_CLASSNAME, 'space-y-2 !p-3 sm:!p-4')}>
      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-0.5">
          <h3 className="text-base font-bold tracking-tight text-[var(--text-primary)]">Resumo para decisão</h3>
          <p className="text-[11px] text-[var(--text-secondary)]">
            {loading
              ? 'Carregando visão consolidada da conta...'
              : forecast
                ? `Atualizado em ${formatDateShort(forecast.updatedAt)}`
                : 'Sem dados suficientes para consolidar alertas no momento.'}
          </p>
        </div>
        <span className="inline-flex w-fit items-center rounded-full border border-white/10 bg-[rgba(8,15,27,0.55)] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
          {loading ? 'Analisando' : hasAlerts ? `${alerts.length} alerta(s) relevante(s)` : 'Sem alertas relevantes'}
        </span>
      </div>

      <div className="space-y-1.5">
        {loading ? (
          <>
            <DashboardSkeletonLine className="h-[54px] w-full rounded-xl" />
            <DashboardSkeletonLine className="h-[54px] w-full rounded-xl" />
          </>
        ) : hasAlerts ? (
          alerts.map((alert) => (
            <article
              key={alert.id}
              className={cn(
                DASHBOARD_CARD_PANEL_CLASSNAME,
                'space-y-1.5 p-2.5',
                getAlertToneClassName(alert.tone)
              )}
            >
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">{ALERT_TONE_TAG[alert.tone]}</p>
              <p className="text-sm font-semibold leading-tight text-[var(--text-primary)]">{alert.title}</p>
              <p className="text-[11px] leading-relaxed text-[var(--text-secondary)]">{alert.message}</p>
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                <button
                  type="button"
                  className="rounded-md border border-white/10 bg-[rgba(8,15,27,0.58)] px-2 py-1 text-[10px] font-semibold text-[var(--text-primary)] transition-all duration-200 hover:-translate-y-[1px] hover:border-white/20"
                >
                  Ver despesas futuras
                </button>
                <button
                  type="button"
                  className="rounded-md border border-white/10 bg-[rgba(8,15,27,0.58)] px-2 py-1 text-[10px] font-semibold text-[var(--text-primary)] transition-all duration-200 hover:-translate-y-[1px] hover:border-white/20"
                >
                  Ajustar orçamento
                </button>
              </div>
            </article>
          ))
        ) : (
          <div className={cn(DASHBOARD_CARD_PANEL_CLASSNAME, 'p-2.5')}>
            <p className="text-sm font-semibold text-[var(--text-primary)]">Fluxo financeiro sob controle</p>
            <p className="mt-0.5 text-[11px] text-[var(--text-secondary)]">
              Nenhum alerta crítico no momento. Continue acompanhando para antecipar variações do caixa.
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

  const trendLabel =
    plannedNet === null ? 'Neutra' : plannedNet > 0 ? 'Positiva' : plannedNet < 0 ? 'Negativa' : 'Neutra';

  const trendClassName =
    trendLabel === 'Positiva'
      ? 'text-[var(--positive)]'
      : trendLabel === 'Negativa'
        ? 'text-[var(--danger)]'
        : 'text-[var(--text-secondary)]';

  return (
    <section className={cn(DASHBOARD_CARD_SHELL_CLASSNAME, 'min-h-[110px] space-y-3')}>
      <div className="space-y-0.5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">Resumo do mês</p>
        {loading ? (
          <DashboardSkeletonLine className="h-9 w-32 rounded-xl" />
        ) : (
          <p
            className={cn(
              'text-3xl font-black leading-none tracking-[-0.02em]',
              plannedNet !== null && plannedNet < 0 ? 'text-[var(--danger)]' : 'text-[var(--positive)]'
            )}
          >
            {plannedNet === null ? '--' : formatCurrency(plannedNet)}
          </p>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          <DashboardSkeletonLine className="h-3.5 w-36" />
          <DashboardSkeletonLine className="h-3.5 w-36" />
          <DashboardSkeletonLine className="h-3.5 w-28" />
          <DashboardSkeletonLine className="h-3.5 w-full" />
          <DashboardSkeletonLine className="h-3.5 w-full" />
          <DashboardSkeletonLine className="h-3.5 w-full" />
        </div>
      ) : (
        <>
          <div className="space-y-1 text-xs text-[var(--text-secondary)]">
            <p>
              Confirmado:{' '}
              <span className={cn('font-semibold', confirmedNet !== null && confirmedNet < 0 ? 'text-[var(--danger)]' : 'text-[var(--text-primary)]')}>
                {confirmedNet === null ? '--' : formatCurrency(confirmedNet)}
              </span>
            </p>
            <p>
              Previsto:{' '}
              <span className={cn('font-semibold', plannedNet !== null && plannedNet < 0 ? 'text-[var(--danger)]' : 'text-[var(--text-primary)]')}>
                {plannedNet === null ? '--' : formatCurrency(plannedNet)}
              </span>
            </p>
            <p>
              Tendência: <span className={cn('font-semibold', trendClassName)}>{trendLabel}</span>
            </p>
          </div>

          <div className="h-px w-full bg-white/10" />

          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">Fluxo do mês</p>
            <p className="text-xs text-[var(--text-secondary)]">
              Entradas:{' '}
              <span className="font-semibold text-[var(--positive)]">
                {forecast ? formatCurrency(forecast.monthPlannedIncome) : '--'}
              </span>
            </p>
            <p className="text-xs text-[var(--text-secondary)]">
              Saídas:{' '}
              <span className="font-semibold text-[var(--danger)]">
                {forecast ? formatCurrency(forecast.monthPlannedExpense) : '--'}
              </span>
            </p>
            <p className="text-xs text-[var(--text-secondary)]">
              Resultado:{' '}
              <span className={cn('font-semibold', plannedNet !== null && plannedNet < 0 ? 'text-[var(--danger)]' : 'text-[var(--positive)]')}>
                {plannedNet === null ? '--' : formatCurrency(plannedNet)}
              </span>
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
    <section className={cn(DASHBOARD_CARD_SHELL_CLASSNAME, 'min-h-[260px] space-y-4')}>
      <div className="flex flex-col gap-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">Evolução do saldo (30 dias)</p>
        <p className="text-sm text-[var(--text-secondary)]">Leitura diária do fechamento projetado com referência de hoje.</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          <DashboardSkeletonLine className="h-4 w-40" />
          <DashboardSkeletonLine className="h-[220px] w-full rounded-xl sm:h-[260px]" />
        </div>
      ) : projectionCurveRows.length > 0 ? (
        <div className="h-[220px] w-full sm:h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={projectionCurveRows} margin={{ top: 12, right: 16, left: 2, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 7" stroke="rgba(148,163,184,0.22)" vertical={false} />
              <XAxis dataKey="dateLabel" stroke="rgba(148,163,184,0.76)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis
                stroke="rgba(148,163,184,0.76)"
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
                formatter={(value) => [formatCurrency(Number(value || 0)), 'Saldo projetado']}
              />
              <ReferenceLine y={0} stroke="rgba(248,113,113,0.45)" strokeDasharray="4 4" />
              {todayPoint ? (
                <ReferenceLine
                  x={todayPoint.dateLabel}
                  stroke="rgba(96,165,250,0.55)"
                  strokeDasharray="4 4"
                  label={{
                    value: 'Hoje',
                    position: 'insideTopRight',
                    fill: 'rgba(148,163,184,0.92)',
                    fontSize: 10,
                  }}
                />
              ) : null}
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
      ) : (
        <p className="text-sm text-[var(--text-secondary)]">
          Ainda não há dados suficientes para projeção. Adicione movimentações para visualizar previsões.
        </p>
      )}
    </section>
  );
}