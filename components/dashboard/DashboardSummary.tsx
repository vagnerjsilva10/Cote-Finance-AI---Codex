import { Gauge, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import type { DashboardOverviewSummary as DashboardOverviewSummaryData } from '@/lib/dashboard/overview';
import { DashboardStatCard } from '@/components/dashboard/dashboard-primitives';
import { formatCurrency } from '@/components/dashboard/dashboard-utils';

type DashboardSummaryProps = {
  summary: DashboardOverviewSummaryData | null;
  loading: boolean;
};

export function DashboardSummary({ summary, loading }: DashboardSummaryProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-4">
      <DashboardStatCard
        label="Saldo atual"
        value={summary ? formatCurrency(summary.currentBalance) : '--'}
        trend="disponível hoje"
        trendValue={summary && summary.currentBalance >= 0 ? 'Em dia' : 'Atenção'}
        icon={Wallet}
        trendType={summary && summary.currentBalance < 0 ? 'down' : 'up'}
        loading={loading}
      />
      <DashboardStatCard
        label="Saldo previsto (30 dias)"
        value={summary && summary.projectedBalance30d !== null ? formatCurrency(summary.projectedBalance30d) : '--'}
        trend={summary ? 'comparado ao saldo atual' : 'calculando projeção de caixa'}
        trendValue={
          summary && summary.projectedBalance30d !== null
            ? `${summary.projectedBalance30d - summary.currentBalance >= 0 ? '+' : '-'}${formatCurrency(Math.abs(summary.projectedBalance30d - summary.currentBalance))}`
            : 'Sem projeção'
        }
        icon={Gauge}
        trendType={summary && summary.projectedBalance30d !== null && summary.projectedBalance30d < summary.currentBalance ? 'down' : 'up'}
        loading={loading}
      />
      <DashboardStatCard
        label="Próximas entradas"
        value={summary ? formatCurrency(summary.upcomingInflow) : '--'}
        trend="eventos previstos"
        trendValue={summary ? String(summary.upcomingInflowCount) : '0'}
        icon={TrendingUp}
        loading={loading}
      />
      <DashboardStatCard
        label="Próximas saídas"
        value={summary ? formatCurrency(summary.upcomingOutflow) : '--'}
        trend="compromissos previstos"
        trendValue={summary ? String(summary.upcomingOutflowCount) : '0'}
        icon={TrendingDown}
        trendType="down"
        loading={loading}
      />
    </div>
  );
}
