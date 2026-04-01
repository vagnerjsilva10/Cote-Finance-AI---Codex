import type {
  DashboardOverviewPayload,
  DashboardOverviewPeriod,
  DashboardOverviewRecentTransaction,
} from '@/lib/dashboard/overview';
import type { DashboardPeriodSelection } from '@/lib/dashboard/date-range';
import { DashboardAssistantMini } from '@/components/dashboard/DashboardAssistantMini';
import { DashboardMainTrend } from '@/components/dashboard/DashboardMainTrend';
import { PeriodFilter } from '@/components/dashboard/PeriodFilter';
import { DashboardRecentTransactions } from '@/components/dashboard/DashboardRecentTransactions';
import { DashboardRightRail } from '@/components/dashboard/DashboardRightRail';
import { DashboardSummary } from '@/components/dashboard/DashboardSummary';

type DashboardContainerProps = {
  overview: DashboardOverviewPayload | null;
  period: DashboardOverviewPeriod | null;
  loading: boolean;
  currentPlan: 'FREE' | 'PRO' | 'PREMIUM';
  goals?: Array<{ id: string | number; name: string; target: number; current: number }>;
  wallets?: Array<{ id: string; name: string; balance: number }>;
  investments?: Array<{ id: string | number; label: string; value: number }>;
  onAddTransaction: () => void;
  onPeriodChange: (selection: DashboardPeriodSelection) => void;
  onUpgrade?: () => void;
  onOpenSummaryTarget?: (target: 'balance' | 'income' | 'expense' | 'net') => void;
  onOpenGoals?: () => void;
  onOpenPortfolio?: () => void;
  onOpenCreateGoal?: () => void;
  onOpenCreateWallet?: () => void;
  onOpenTransactions?: () => void;
  onOpenTransactionDetail?: (transaction: DashboardOverviewRecentTransaction) => void;
  onOpenAssistant?: () => void;
  onSendAssistantPrompt?: (prompt: string) => void;
};

function buildAssistantContext(overview: DashboardOverviewPayload | null) {
  const summary = overview?.summary;
  const hasTransactions = (overview?.recentTransactions?.length ?? 0) > 0;

  if (!hasTransactions) {
    return {
      headline: 'Pergunte sobre organização financeira e próximos passos para começar.',
      primary: 'Como organizar minhas finanças?',
      secondary: 'Criar um plano mensal',
    };
  }

  if ((summary?.outflow ?? 0) > (summary?.inflow ?? 0)) {
    return {
      headline: 'Receba análises e sugestões com base na sua movimentação mais recente.',
      primary: 'Onde posso economizar?',
      secondary: 'Analisar meus gastos',
    };
  }

  return {
    headline: 'Pergunte sobre gastos, economia e comportamento financeiro.',
    primary: 'Analisar meus gastos',
    secondary: 'Como melhorar meu saldo?',
  };
}

export function DashboardContainer({
  overview,
  period,
  loading,
  goals = [],
  wallets = [],
  investments = [],
  onAddTransaction,
  onPeriodChange,
  onOpenSummaryTarget,
  onOpenGoals,
  onOpenPortfolio,
  onOpenCreateGoal,
  onOpenCreateWallet,
  onOpenTransactions,
  onOpenTransactionDetail,
  onOpenAssistant,
  onSendAssistantPrompt,
}: DashboardContainerProps) {
  const selectedPeriod = period ?? overview?.period ?? null;
  const periodLabel = selectedPeriod?.label || 'Este mês';
  const assistantContext = buildAssistantContext(overview);

  return (
    <div className="animate-in space-y-5 fade-in duration-500 lg:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="page-title-premium text-[var(--text-primary)]">Dashboard</h3>
          <p className="text-sm text-[var(--text-secondary)]">Análise de {periodLabel}</p>
        </div>
        <button
          onClick={onAddTransaction}
          className="app-button-primary rounded-xl px-4 py-2 text-sm font-semibold"
        >
          + Nova transação
        </button>
      </div>

      <PeriodFilter
        value={{
          period: selectedPeriod?.preset || 'this_month',
          startDate: selectedPeriod?.preset === 'custom' ? selectedPeriod.startDate : null,
          endDate: selectedPeriod?.preset === 'custom' ? selectedPeriod.endDate : null,
          label: selectedPeriod?.label,
        }}
        loading={loading}
        onChange={onPeriodChange}
      />

      <DashboardSummary
        summary={overview?.summary ?? null}
        loading={loading}
        onOpenSummaryTarget={onOpenSummaryTarget ?? (() => undefined)}
      />

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-start">
        <div className="space-y-4 lg:col-span-8">
          <DashboardMainTrend
            forecast={overview?.forecast ?? null}
            period={selectedPeriod}
            loading={loading}
          />
          <DashboardRecentTransactions
            transactions={overview?.recentTransactions ?? []}
            periodLabel={periodLabel}
            loading={loading}
            onViewAll={onOpenTransactions ?? (() => undefined)}
            onOpenTransaction={onOpenTransactionDetail ?? (() => undefined)}
          />
        </div>

        <div className="space-y-4 lg:col-span-4">
          <DashboardRightRail
            goals={goals}
            wallets={wallets}
            investments={investments}
            loading={loading}
            onOpenGoals={onOpenGoals ?? (() => undefined)}
            onOpenPortfolio={onOpenPortfolio ?? (() => undefined)}
            onOpenCreateGoal={onOpenCreateGoal ?? (() => undefined)}
            onOpenCreateWallet={onOpenCreateWallet ?? (() => undefined)}
          />
          <DashboardAssistantMini
            headline={assistantContext.headline}
            primarySuggestion={assistantContext.primary}
            secondarySuggestion={assistantContext.secondary}
            onOpenAssistant={onOpenAssistant ?? (() => undefined)}
            onSendPrompt={onSendAssistantPrompt ?? (() => undefined)}
          />
        </div>
      </section>
    </div>
  );
}
