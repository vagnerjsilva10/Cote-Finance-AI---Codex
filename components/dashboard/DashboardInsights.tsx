import type { DashboardOverviewForecast, DashboardOverviewInsights as DashboardOverviewInsightsData } from '@/lib/dashboard/overview';
import {
  DASHBOARD_CARD_PANEL_CLASSNAME,
  DASHBOARD_CARD_SHELL_CLASSNAME,
  DashboardSkeletonLine,
} from '@/components/dashboard/dashboard-primitives';
import { extractInsightMetric, formatCurrency, getInsightActionHint } from '@/components/dashboard/dashboard-utils';
import { cn } from '@/lib/utils';

type DashboardInsightsProps = {
  insights: DashboardOverviewInsightsData | null;
  forecast: DashboardOverviewForecast | null;
  currentPlan: 'FREE' | 'PRO' | 'PREMIUM';
  loading: boolean;
  onUpgrade: () => void;
};

function getInsightToneClassName(tone: 'warning' | 'primary') {
  if (tone === 'warning') {
    return 'border-[color:color-mix(in_srgb,var(--warning)_32%,transparent)] bg-[color:color-mix(in_srgb,var(--warning)_10%,transparent)]';
  }

  return 'border-[color:color-mix(in_srgb,var(--primary)_32%,transparent)] bg-[color:color-mix(in_srgb,var(--primary)_10%,transparent)]';
}

function getInsightBadgeLabel(rawBadge: string) {
  const badge = String(rawBadge || '').toLowerCase();
  if (badge.includes('alert')) return 'ALERTA';
  if (badge.includes('tend')) return 'TENDÊNCIA';
  return 'OPORTUNIDADE';
}

export function DashboardInsights({ insights, forecast, currentPlan, loading, onUpgrade }: DashboardInsightsProps) {
  const primaryCards = insights?.primary ?? [];
  const automatedInsights = insights?.automated ?? [];

  const compactInsights = [
    ...primaryCards.map((card) => ({
      id: card.id,
      tone: card.tone,
      badge: getInsightBadgeLabel(card.badge),
      title: card.title,
      metric: card.metric,
      description: card.description,
      action: card.action,
    })),
    ...automatedInsights.slice(0, 1).map((insight, index) => ({
      id: `automated-${index}`,
      tone: 'primary' as const,
      badge: 'TENDÊNCIA',
      title: 'Leitura principal',
      metric: extractInsightMetric(insight) ?? 'Sem métrica',
      description: insight,
      action: getInsightActionHint(insight),
    })),
  ].slice(0, 3);

  const projected30d = forecast?.projectedBalance30d ?? null;
  const monthNet =
    forecast && forecast.monthPlannedIncome !== null && forecast.monthPlannedExpense !== null
      ? forecast.monthPlannedIncome - forecast.monthPlannedExpense
      : null;

  return (
    <section className={cn(DASHBOARD_CARD_SHELL_CLASSNAME, 'min-h-[350px] space-y-3 !p-3.5 sm:!p-4')}>
      <div className="space-y-1">
        <h3 className="text-base font-bold tracking-tight text-[var(--text-primary)]">Insights do mês</h3>
        <p className="text-xs text-[var(--text-secondary)]">Leituras acionáveis para priorizar ajustes com maior impacto financeiro.</p>
      </div>

      <div className="space-y-2.5">
        {loading ? (
          <>
            <DashboardSkeletonLine className="h-[86px] w-full rounded-xl" />
            <DashboardSkeletonLine className="h-[86px] w-full rounded-xl" />
            <DashboardSkeletonLine className="h-[86px] w-full rounded-xl" />
          </>
        ) : (
          compactInsights.map((card) => (
            <article key={card.id} className={cn(DASHBOARD_CARD_PANEL_CLASSNAME, 'space-y-1.5 p-2.5', getInsightToneClassName(card.tone))}>
              <p className="inline-flex w-fit items-center rounded-full border border-white/10 bg-[rgba(8,15,27,0.55)] px-2 py-0.5 text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                {card.badge}
              </p>
              <p className="text-base font-black leading-none tracking-[-0.01em] text-[var(--text-primary)]">{card.metric}</p>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">{card.title}</p>
              <p className="text-xs leading-snug text-[var(--text-secondary)]">{card.description}</p>
              <p className="text-xs font-semibold text-[var(--primary)]">{card.action}</p>
            </article>
          ))
        )}

        {currentPlan === 'FREE' ? (
          <div className={cn(DASHBOARD_CARD_PANEL_CLASSNAME, 'space-y-1.5 p-2.5 border-[color:color-mix(in_srgb,var(--primary)_38%,transparent)]')}>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--text-muted)]">Oportunidade Pro</p>
            <p className="text-sm font-semibold text-[var(--text-primary)]">Desbloqueie insights automáticos</p>
            <button type="button" onClick={onUpgrade} className="app-button-primary rounded-lg px-2.5 py-1 text-xs font-semibold">
              Atualizar para Pro
            </button>
          </div>
        ) : (
          <div className={cn(DASHBOARD_CARD_PANEL_CLASSNAME, 'space-y-1.5 p-2.5')}>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--text-muted)]">IA ativa</p>
            <p className="text-xs text-[var(--text-secondary)]">Leituras automáticas habilitadas para antecipar desvios do mês.</p>
          </div>
        )}

        <div className={cn(DASHBOARD_CARD_PANEL_CLASSNAME, 'space-y-1.5 p-2.5')}>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--text-muted)]">Mini resumo</p>
          <p className="text-xs text-[var(--text-secondary)]">
            30 dias: <span className={cn('font-semibold', projected30d !== null && projected30d < 0 ? 'text-[var(--danger)]' : 'text-[var(--positive)]')}>{projected30d === null ? '--' : formatCurrency(projected30d)}</span>
          </p>
          <p className="text-xs text-[var(--text-secondary)]">
            Resultado do mês: <span className={cn('font-semibold', monthNet !== null && monthNet < 0 ? 'text-[var(--danger)]' : 'text-[var(--positive)]')}>{monthNet === null ? '--' : formatCurrency(monthNet)}</span>
          </p>
        </div>
      </div>
    </section>
  );
}


