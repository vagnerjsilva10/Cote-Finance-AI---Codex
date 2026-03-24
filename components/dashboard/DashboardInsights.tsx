import type { DashboardOverviewInsights as DashboardOverviewInsightsData } from '@/lib/dashboard/overview';
import { DashboardSkeletonLine } from '@/components/dashboard/dashboard-primitives';
import { extractInsightMetric, getInsightActionHint } from '@/components/dashboard/dashboard-utils';
import { cn } from '@/lib/utils';

type DashboardInsightsProps = {
  insights: DashboardOverviewInsightsData | null;
  currentPlan: 'FREE' | 'PRO' | 'PREMIUM';
  loading: boolean;
  onUpgrade: () => void;
};

export function DashboardInsights({ insights, currentPlan, loading, onUpgrade }: DashboardInsightsProps) {
  const primaryCards = insights?.primary ?? [];
  const automatedInsights = insights?.automated ?? [];

  return (
    <div className="app-surface-card rounded-2xl p-5 sm:p-6">
      <h3 className="card-title-premium mb-6 text-[var(--text-primary)]">Insights do mês</h3>
      <div className="space-y-4">
        {loading ? (
          <>
            <DashboardSkeletonLine className="h-40 w-full rounded-3xl" />
            <DashboardSkeletonLine className="h-40 w-full rounded-3xl" />
          </>
        ) : (
          <>
            {primaryCards.map((card) => (
              <div
                key={card.id}
                className={cn(
                  'rounded-2xl border p-5',
                  card.tone === 'warning'
                    ? 'border-[color:color-mix(in_srgb,var(--warning)_26%,transparent)] bg-[var(--warning-soft)]'
                    : 'border-[color:color-mix(in_srgb,var(--primary)_35%,transparent)] bg-[color:var(--primary-soft)]'
                )}
              >
                <div
                  className={cn(
                    'mb-3 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-widest',
                    card.tone === 'warning'
                      ? 'border-[color:color-mix(in_srgb,var(--warning)_26%,transparent)] bg-[var(--warning-soft)] text-[var(--warning)]'
                      : 'border-[color:color-mix(in_srgb,var(--primary)_35%,transparent)] bg-[color:var(--primary-soft)] text-[var(--primary)]'
                  )}
                >
                  {card.badge}
                </div>
                <p className="label-premium text-[var(--text-muted)]">{card.title}</p>
                <p className="mt-2 text-xl font-black text-[var(--text-primary)]">{card.metric}</p>
                <p className="mt-2 text-sm text-[var(--text-primary)]">{card.description}</p>
                <p className={cn('mt-3 text-xs font-semibold', card.tone === 'warning' ? 'text-[var(--warning)]' : 'text-[var(--primary)]')}>
                  {card.action}
                </p>
              </div>
            ))}

            {currentPlan === 'FREE' ? (
              <div className="app-surface-subtle rounded-[var(--radius-md)] p-5">
                <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)]">Disponível no Pro</p>
                <p className="text-sm leading-relaxed text-[var(--text-primary)]">
                  Receba insights financeiros automáticos com base no seu histórico para identificar padrões, desperdícios e oportunidades de ajuste.
                </p>
                <button
                  type="button"
                  onClick={onUpgrade}
                  className="app-button-primary mt-4 rounded-xl px-4 py-2 text-sm font-semibold shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-soft)]"
                >
                  Liberar insights automáticos
                </button>
              </div>
            ) : (
              automatedInsights.map((insight, index) => (
                <div
                  key={`${index}-${insight.slice(0, 24)}`}
                  className="rounded-2xl border border-[color:color-mix(in_srgb,var(--primary)_35%,transparent)] bg-[color:var(--primary-soft)] p-5"
                >
                  <p className="mb-2 inline-flex items-center gap-2 rounded-full border border-[color:color-mix(in_srgb,var(--primary)_35%,transparent)] bg-[color:var(--primary-soft)] px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-[var(--primary)]">
                    Insight IA
                  </p>
                  <p className="text-sm font-semibold text-[var(--text-muted)]">Leitura principal</p>
                  <p className="mt-2 text-lg font-black text-[var(--text-primary)]">{extractInsightMetric(insight) ?? 'Sem métrica numérica'}</p>
                  <p className="mt-2 text-sm text-[var(--text-primary)]">{insight}</p>
                  <p className="mt-3 text-xs font-semibold text-[var(--primary)]">{getInsightActionHint(insight)}</p>
                </div>
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
}
