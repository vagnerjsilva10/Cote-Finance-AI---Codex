import type { DashboardOverviewAlert, DashboardOverviewForecast } from '@/lib/dashboard/overview';
import {
  DASHBOARD_CARD_PANEL_CLASSNAME,
  DASHBOARD_CARD_SHELL_CLASSNAME,
  DashboardSkeletonLine,
} from '@/components/dashboard/dashboard-primitives';
import { cn } from '@/lib/utils';

type DashboardPrimaryInsightProps = {
  alerts: DashboardOverviewAlert[];
  forecast: DashboardOverviewForecast | null;
  loading: boolean;
};

function getPrimaryInsightMessage(alerts: DashboardOverviewAlert[], forecast: DashboardOverviewForecast | null) {
  const prioritizedAlert = alerts.find((alert) => alert.tone === 'danger') ?? alerts.find((alert) => alert.tone === 'warning') ?? alerts[0];
  if (prioritizedAlert?.message) return prioritizedAlert.message;

  if (forecast?.projectedNegativeDate) {
    return `Atenção: seu saldo pode ficar negativo até ${new Date(forecast.projectedNegativeDate).toLocaleDateString('pt-BR')}.`;
  }

  if (forecast?.projectedBalance30d !== null && typeof forecast?.projectedBalance30d === 'number') {
    return forecast.projectedBalance30d < 0
      ? 'Atenção: sua tendência de 30 dias está negativa. Ajuste o ritmo de gastos agora.'
      : 'Tendência positiva: seu saldo projetado para os próximos 30 dias está saudável.';
  }

  return 'Sem alertas críticos no momento. Continue registrando para manter a previsão confiável.';
}

export function DashboardPrimaryInsight({ alerts, forecast, loading }: DashboardPrimaryInsightProps) {
  const message = getPrimaryInsightMessage(alerts, forecast);

  return (
    <section className={cn(DASHBOARD_CARD_SHELL_CLASSNAME, 'space-y-3 !p-4 sm:!p-5')}>
      <div className="space-y-0.5">
        <h3 className="text-base font-semibold tracking-tight text-[var(--text-primary)]">Insight principal</h3>
        <p className="text-xs text-[var(--text-secondary)]">Prioridade do momento para orientar sua próxima ação.</p>
      </div>

      {loading ? (
        <div className="space-y-2">
          <DashboardSkeletonLine className="h-4 w-full" />
          <DashboardSkeletonLine className="h-4 w-11/12" />
          <DashboardSkeletonLine className="h-8 w-52 rounded-lg" />
        </div>
      ) : (
        <div className={cn(DASHBOARD_CARD_PANEL_CLASSNAME, 'space-y-2.5 p-3')}>
          <p className="text-sm font-medium leading-relaxed text-[var(--text-primary)]">{message}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="rounded-md border border-[var(--border-soft)] bg-[var(--bg-tertiary)] px-2.5 py-1 text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--border-default)]">
              Ver detalhes
            </button>
            <button type="button" className="rounded-md border border-[var(--border-soft)] bg-[var(--bg-tertiary)] px-2.5 py-1 text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--border-default)]">
              Ajustar orçamento
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
