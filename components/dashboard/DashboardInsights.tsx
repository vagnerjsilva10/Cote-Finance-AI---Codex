import type { DashboardOverviewInsights as DashboardOverviewInsightsData } from '@/lib/dashboard/overview';
import {
  DASHBOARD_CARD_PANEL_CLASSNAME,
  DASHBOARD_CARD_SHELL_CLASSNAME,
  DashboardSkeletonLine,
} from '@/components/dashboard/dashboard-primitives';
import { extractInsightMetric, getInsightActionHint } from '@/components/dashboard/dashboard-utils';
import { cn } from '@/lib/utils';

type DashboardInsightsProps = {
  insights: DashboardOverviewInsightsData | null;
  currentPlan: 'FREE' | 'PRO' | 'PREMIUM';
  loading: boolean;
  onUpgrade: () => void;
};

function getInsightToneClassName(tone: 'warning' | 'primary') {
  if (tone === 'warning') {
    return 'border-[color:color-mix(in_srgb,var(--warning)_36%,transparent)] bg-[color:color-mix(in_srgb,var(--warning)_12%,transparent)]';
  }

  return 'border-[color:color-mix(in_srgb,var(--primary)_36%,transparent)] bg-[color:color-mix(in_srgb,var(--primary)_12%,transparent)]';
}

export function DashboardInsights({ insights, currentPlan, loading, onUpgrade }: DashboardInsightsProps) {
  const primaryCards = insights?.primary ?? [];
  const automatedInsights = insights?.automated ?? [];

  return (
    <section className={cn(DASHBOARD_CARD_SHELL_CLASSNAME, 'min-h-[240px] space-y-2.5 !p-3.5 sm:!p-4')}>
      <div className="space-y-0.5">
        <h3 className="text-base font-bold tracking-tight text-[var(--text-primary)]">Insights do mês</h3>
        <p className="text-xs text-[var(--text-secondary)]">
          Leituras acionáveis para priorizar ajustes com maior impacto financeiro.
        </p>
      </div>

      <div className="space-y-2">
        {loading ? (
          <>
            <DashboardSkeletonLine className="h-[88px] w-full rounded-xl" />
            <DashboardSkeletonLine className="h-[88px] w-full rounded-xl" />
          </>
        ) : (
          <>
            {primaryCards.map((card) => (
              <article
                key={card.id}
                className={cn(
                  DASHBOARD_CARD_PANEL_CLASSNAME,
                  'space-y-1 p-2 transition-all duration-200 hover:-translate-y-[1px] hover:shadow-[0_10px_20px_rgba(0,0,0,0.24)]',
                  getInsightToneClassName(card.tone)
                )}
              >
                <p className="inline-flex w-fit items-center rounded-full border border-white/10 bg-[rgba(8,15,27,0.55)] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                  {card.badge}
                </p>
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">{card.title}</p>
                <p className="text-base font-black leading-none tracking-[-0.01em] text-[var(--text-primary)]">{card.metric}</p>
                <p className="text-[11px] leading-snug text-[var(--text-secondary)]">{card.description}</p>
                <p className="text-[10px] font-semibold text-[var(--primary)]">{card.action}</p>
              </article>
            ))}

            {currentPlan === 'FREE' ? (
              <div className={cn(DASHBOARD_CARD_PANEL_CLASSNAME, 'space-y-1.5 p-2')}>
                <p className="inline-flex w-fit items-center rounded-full border border-white/10 bg-[rgba(8,15,27,0.55)] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                  Oportunidade
                </p>
                <p className="text-sm font-semibold text-[var(--text-primary)]">Desbloqueie insights automáticos</p>
                <p className="text-[11px] leading-snug text-[var(--text-secondary)]">
                  Receba leituras inteligentes com base no seu histórico para antecipar desvios e oportunidades de ajuste.
                </p>
                <button
                  type="button"
                  onClick={onUpgrade}
                  className="app-button-primary rounded-lg px-2.5 py-1 text-[11px] font-semibold"
                >
                  Liberar insights automáticos
                </button>
              </div>
            ) : (
              automatedInsights.map((insight, index) => (
                <article
                  key={`${index}-${insight.slice(0, 24)}`}
                  className={cn(
                    DASHBOARD_CARD_PANEL_CLASSNAME,
                    'space-y-1 p-2 transition-all duration-200 hover:-translate-y-[1px] hover:shadow-[0_10px_20px_rgba(0,0,0,0.24)]'
                  )}
                >
                  <p className="inline-flex w-fit items-center rounded-full border border-white/10 bg-[rgba(8,15,27,0.55)] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                    Tendência
                  </p>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">Leitura principal</p>
                  <p className="text-base font-black leading-none tracking-[-0.01em] text-[var(--text-primary)]">
                    {extractInsightMetric(insight) ?? 'Sem métrica numérica'}
                  </p>
                  <p className="text-[11px] leading-snug text-[var(--text-secondary)]">{insight}</p>
                  <p className="text-[10px] font-semibold text-[var(--primary)]">{getInsightActionHint(insight)}</p>
                </article>
              ))
            )}

            {!primaryCards.length && currentPlan !== 'FREE' && !automatedInsights.length ? (
              <div className={cn(DASHBOARD_CARD_PANEL_CLASSNAME, 'p-2')}>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  Ainda não há insights suficientes para este período. Continue registrando movimentações para enriquecer a análise.
                </p>
              </div>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}

