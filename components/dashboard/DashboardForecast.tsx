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
  warning: 'Aten\u00e7\u00e3o',
  info: 'Observa\u00e7\u00e3o',
  success: 'Est\u00e1vel',
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
    <section className={cn(DASHBOARD_CARD_SHELL_CLASSNAME, 'min-h-[96px] space-y-2.5 !p-4 sm:!p-5')}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-0.5">
          <h3 className="text-lg font-bold tracking-tight text-[var(--text-primary)]">{'Resumo para decis\u00e3o'}</h3>
          <p className="text-xs text-[var(--text-secondary)]">
            {loading
              ? 'Carregando vis\u00e3o consolidada da conta...'
              : forecast
                ? `Atualizado em ${formatDateShort(forecast.updatedAt)}`
                : 'Sem dados suficientes para consolidar alertas no momento.'}
          </p>
        </div>
        <span className="inline-flex w-fit items-center rounded-full border border-white/10 bg-[rgba(8,15,27,0.55)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">
          {loading ? 'Analisando' : hasAlerts ? `${alerts.length} alerta(s) relevante(s)` : 'Sem alertas relevantes'}
        </span>
      </div>

      <div className="space-y-2">
        {loading ? (
          <>
            <DashboardSkeletonLine className="h-[56px] w-full rounded-xl" />
            <DashboardSkeletonLine className="h-[56px] w-full rounded-xl" />
          </>
        ) : hasAlerts ? (
          alerts.map((alert) => (
            <article
              key={alert.id}
              className={cn(
                DASHBOARD_CARD_PANEL_CLASSNAME,
                'min-h-[84px] space-y-1.5 p-3',
                getAlertToneClassName(alert.tone)
              )}
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">{ALERT_TONE_TAG[alert.tone]}</p>
              <p className="text-sm font-semibold leading-tight text-[var(--text-primary)]">{alert.title}</p>
              <p className="text-xs leading-relaxed text-[var(--text-secondary)]">{alert.message}</p>
            </article>
          ))
        ) : (
          <div className={cn(DASHBOARD_CARD_PANEL_CLASSNAME, 'p-3')}>
            <p className="text-sm font-semibold text-[var(--text-primary)]">Fluxo financeiro sob controle</p>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              {'Nenhum alerta cr\u00edtico no momento. Continue acompanhando para antecipar varia\u00e7\u00f5es do caixa.'}
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
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">{'Resumo do m\u00eas'}</p>
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
              {'Tend\u00eancia:'} <span className={cn('font-semibold', trendClassName)}>{trendLabel}</span>
            </p>
          </div>

          <div className="h-px w-full bg-white/10" />

          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">{'Fluxo do m\u00eas'}</p>
            <p className="text-xs text-[var(--text-secondary)]">
              Entradas:{' '}
              <span className="font-semibold text-[var(--positive)]">
                {forecast ? formatCurrency(forecast.monthPlannedIncome) : '--'}
              </span>
            </p>
            <p className="text-xs text-[var(--text-secondary)]">
              {'Sa\u00eddas:'}{' '}
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
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">{'Evolu\u00e7\u00e3o do saldo (30 dias)'}</p>
        <p className="text-sm text-[var(--text-secondary)]">{'Leitura di\u00e1ria do fechamento projetado com refer\u00eancia de hoje.'}</p>
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
          {'Ainda n\u00e3o h\u00e1 dados suficientes para proje\u00e7\u00e3o. Adicione movimenta\u00e7\u00f5es para visualizar previs\u00f5es.'}
        </p>
      )}
    </section>
  );
}