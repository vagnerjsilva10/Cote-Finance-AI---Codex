import type { DashboardOverviewPayload } from '@/lib/dashboard/overview';
import { DashboardChart } from '@/components/dashboard/DashboardChart';
import { DashboardEvents } from '@/components/dashboard/DashboardEvents';
import { DashboardForecast } from '@/components/dashboard/DashboardForecast';
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
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="page-title-premium text-[var(--text-primary)]">Visão Geral</h3>
          <p className="text-sm capitalize text-[var(--text-secondary)]">Resumo de {monthLabel}</p>
        </div>
        <button
          onClick={onAddTransaction}
          className="app-button-primary rounded-xl px-4 py-2 text-sm font-semibold shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-soft)]"
        >
          + Nova Transação
        </button>
      </div>

      <DashboardSummary summary={overview?.summary ?? null} loading={loading} />
      <DashboardForecast forecast={overview?.forecast ?? null} alerts={overview?.alerts ?? []} loading={loading} />

      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
        <DashboardChart monthlySeries={overview?.monthlySeries ?? []} loading={loading} />
        <DashboardInsights insights={overview?.insights ?? null} currentPlan={currentPlan} loading={loading} onUpgrade={onUpgrade} />
      </div>

      <DashboardEvents upcomingEvents={overview?.upcomingEvents ?? []} loading={loading} />

      <DashboardRecentTransactions transactions={overview?.recentTransactions ?? []} loading={loading} />
    </div>
  );
}

