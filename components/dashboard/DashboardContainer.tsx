import type { DashboardOverviewPayload } from '@/lib/dashboard/overview';
import { DashboardAssistantMini } from '@/components/dashboard/DashboardAssistantMini';
import { DashboardMainTrend } from '@/components/dashboard/DashboardMainTrend';
import { DashboardPrimaryInsight } from '@/components/dashboard/DashboardPrimaryInsight';
import { DashboardRecentTransactions } from '@/components/dashboard/DashboardRecentTransactions';
import { DashboardSummary } from '@/components/dashboard/DashboardSummary';

type DashboardContainerProps = {
  overview: DashboardOverviewPayload | null;
  loading: boolean;
  currentPlan: 'FREE' | 'PRO' | 'PREMIUM';
  onAddTransaction: () => void;
  onUpgrade: () => void;
};

export function DashboardContainer({ overview, loading, onAddTransaction }: DashboardContainerProps) {
  const monthLabel = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  return (
    <div className="animate-in space-y-5 fade-in duration-500 lg:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="page-title-premium text-[var(--text-primary)]">Visão geral</h3>
          <p className="text-sm capitalize text-[var(--text-secondary)]">Resumo de {monthLabel}</p>
        </div>
        <button
          onClick={onAddTransaction}
          className="app-button-primary rounded-xl px-4 py-2 text-sm font-semibold shadow-[0_8px_22px_rgba(76,141,255,0.26)] transition-all duration-200 hover:-translate-y-[1px] hover:shadow-[0_12px_30px_rgba(76,141,255,0.34)]"
        >
          + Nova transação
        </button>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:gap-6">
        <DashboardSummary summary={overview?.summary ?? null} loading={loading} />

        <DashboardMainTrend forecast={overview?.forecast ?? null} loading={loading} />

        <DashboardPrimaryInsight alerts={overview?.alerts ?? []} forecast={overview?.forecast ?? null} loading={loading} />

        <DashboardRecentTransactions transactions={overview?.recentTransactions ?? []} loading={loading} />

        <DashboardAssistantMini />
      </div>
    </div>
  );
}
