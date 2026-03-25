import type { DashboardOverviewPayload } from '@/lib/dashboard/overview';
import { DashboardChart } from '@/components/dashboard/DashboardChart';
import { DashboardEvents } from '@/components/dashboard/DashboardEvents';
import {
  DashboardBalanceEvolutionCard,
  DashboardDecisionPanel,
  DashboardMonthSummaryCard,
} from '@/components/dashboard/DashboardForecast';
import { DashboardInsights } from '@/components/dashboard/DashboardInsights';
import { DashboardRecentTransactions } from '@/components/dashboard/DashboardRecentTransactions';
import { DashboardSummary } from '@/components/dashboard/DashboardSummary';

type DashboardContainerProps = {
  overview: DashboardOverviewPayload | null;
  loading: boolean;
  currentPlan: 'FREE' | 'PRO' | 'PREMIUM';
  onAddTransaction: () => void;
  onUpgrade: () => void;
};

export function DashboardContainer({ overview, loading, currentPlan, onAddTransaction, onUpgrade }: DashboardContainerProps) {
  const monthLabel = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  return (
    <div className="animate-in space-y-6 fade-in duration-500">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="page-title-premium text-[var(--text-primary)]">Visão Geral</h3>
          <p className="text-sm capitalize text-[var(--text-secondary)]">Resumo de {monthLabel}</p>
        </div>
        <button
          onClick={onAddTransaction}
          className="app-button-primary rounded-xl px-4 py-2 text-sm font-semibold shadow-[0_8px_22px_rgba(76,141,255,0.26)] transition-all duration-200 hover:-translate-y-[2px] hover:shadow-[0_12px_30px_rgba(76,141,255,0.34)]"
        >
          + Nova Transação
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-12">
          <DashboardSummary
            summary={overview?.summary ?? null}
            forecast={overview?.forecast ?? null}
            upcomingEvents={overview?.upcomingEvents ?? []}
            loading={loading}
          />
        </div>

        <div className="lg:col-span-8">
          <DashboardDecisionPanel forecast={overview?.forecast ?? null} alerts={overview?.alerts ?? []} loading={loading} />
        </div>

        <div className="lg:col-span-4">
          <DashboardMonthSummaryCard forecast={overview?.forecast ?? null} loading={loading} />
        </div>

        <div className="lg:col-span-12">
          <DashboardBalanceEvolutionCard forecast={overview?.forecast ?? null} loading={loading} />
        </div>

        <div className="lg:col-span-12">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-start">
            <div className="lg:col-span-8">
              <DashboardChart monthlySeries={overview?.monthlySeries ?? []} loading={loading} />
            </div>
            <div className="lg:col-span-4">
              <DashboardInsights
                insights={overview?.insights ?? null}
                currentPlan={currentPlan}
                loading={loading}
                onUpgrade={onUpgrade}
              />
            </div>
          </div>
        </div>

        <div className="lg:col-span-12">
          <DashboardEvents upcomingEvents={overview?.upcomingEvents ?? []} loading={loading} />
        </div>

        <div className="lg:col-span-12">
          <DashboardRecentTransactions transactions={overview?.recentTransactions ?? []} loading={loading} />
        </div>
      </div>
    </div>
  );
}

