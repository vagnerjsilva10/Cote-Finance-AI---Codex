import { ChevronRight } from 'lucide-react';
import {
  DASHBOARD_CARD_PANEL_CLASSNAME,
  DASHBOARD_CARD_SHELL_CLASSNAME,
  DashboardSkeletonLine,
} from '@/components/dashboard/dashboard-primitives';
import { formatCurrency } from '@/components/dashboard/dashboard-utils';
import { cn } from '@/lib/utils';

type GoalLite = {
  id: string | number;
  name: string;
  target: number;
  current: number;
};

type WalletLite = {
  id: string;
  name: string;
  balance: number;
};

type InvestmentLite = {
  id: string | number;
  label: string;
  value: number;
};

type DashboardRightRailProps = {
  goals: GoalLite[];
  wallets: WalletLite[];
  investments: InvestmentLite[];
  loading: boolean;
  onOpenGoals: () => void;
  onOpenPortfolio: () => void;
  onOpenCreateGoal: () => void;
  onOpenCreateWallet: () => void;
};

export function DashboardRightRail({
  goals,
  wallets,
  investments,
  loading,
  onOpenGoals,
  onOpenPortfolio,
  onOpenCreateGoal,
  onOpenCreateWallet,
}: DashboardRightRailProps) {
  const topGoals = [...goals]
    .sort((a, b) => {
      const aProgress = a.target > 0 ? a.current / a.target : 0;
      const bProgress = b.target > 0 ? b.current / b.target : 0;
      return bProgress - aProgress;
    })
    .slice(0, 2);

  const topWallets = [...wallets].sort((a, b) => b.balance - a.balance).slice(0, 2);
  const topInvestments = [...investments].sort((a, b) => b.value - a.value).slice(0, 2);

  const hasGoals = topGoals.length > 0;
  const hasPortfolioData = topWallets.length > 0 || topInvestments.length > 0;

  return (
    <div className="space-y-4">
      <article
        className={cn(
          DASHBOARD_CARD_SHELL_CLASSNAME,
          'space-y-3 border-l-4 border-l-[color:rgba(168,85,247,0.72)] bg-[linear-gradient(120deg,rgba(168,85,247,0.12),rgba(12,18,30,0.08)_24%)] !p-4 sm:!p-5'
        )}
      >
        <div className="flex items-center justify-between">
          <h3 className="inline-flex items-center gap-2 text-base font-semibold text-[var(--text-primary)]">
            <span className="h-2 w-2 rounded-full bg-[#a855f7]" /> Metas
          </h3>
          <button type="button" onClick={onOpenGoals} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
            <ChevronRight size={16} />
          </button>
        </div>

        {loading ? (
          <div className="space-y-2">
            <DashboardSkeletonLine className="h-4 w-40" />
            <DashboardSkeletonLine className="h-4 w-32" />
            <DashboardSkeletonLine className="h-3 w-full" />
          </div>
        ) : hasGoals ? (
          <div className="space-y-2">
            {topGoals.map((goal) => {
              const progress = goal.target > 0 ? Math.max(0, Math.min(100, Math.round((goal.current / goal.target) * 100))) : 0;
              return (
                <div key={goal.id} className={cn(DASHBOARD_CARD_PANEL_CLASSNAME, 'space-y-2.5 p-3')}>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{goal.name}</p>
                  <p className="text-sm text-[var(--text-secondary)]">
                    {formatCurrency(goal.current)} / {formatCurrency(goal.target)}
                  </p>
                  <div className="h-2 overflow-hidden rounded-full bg-[rgba(148,163,184,0.18)]">
                    <div className="h-full rounded-full bg-[linear-gradient(90deg,#a855f7,#c084fc)]" style={{ width: `${progress}%` }} />
                  </div>
                  <div className="flex justify-end">
                    <span className="rounded-md bg-[rgba(168,85,247,0.2)] px-2 py-1 text-xs font-semibold text-[var(--text-primary)]">{progress}%</span>
                  </div>
                </div>
              );
            })}
            <button type="button" onClick={onOpenGoals} className="text-sm font-semibold text-[var(--primary)] hover:text-[var(--primary-hover)]">
              Ver todas metas
            </button>
          </div>
        ) : (
          <div className={cn(DASHBOARD_CARD_PANEL_CLASSNAME, 'space-y-2.5 p-3')}>
            <p className="text-sm font-semibold text-[var(--text-primary)]">Você ainda não criou metas</p>
            <p className="text-xs text-[var(--text-secondary)]">Defina um objetivo para acompanhar sua evolução financeira.</p>
            <button type="button" onClick={onOpenCreateGoal} className="text-xs font-semibold text-[var(--primary)] hover:text-[var(--primary-hover)]">
              Criar meta
            </button>
          </div>
        )}
      </article>

      <article
        className={cn(
          DASHBOARD_CARD_SHELL_CLASSNAME,
          'space-y-3 border-l-4 border-l-[color:rgba(34,211,238,0.72)] bg-[linear-gradient(120deg,rgba(34,211,238,0.12),rgba(12,18,30,0.08)_24%)] !p-4 sm:!p-5'
        )}
      >
        <div className="flex items-center justify-between">
          <h3 className="inline-flex items-center gap-2 text-base font-semibold text-[var(--text-primary)]">
            <span className="h-2 w-2 rounded-full bg-[#22d3ee]" /> Carteira
          </h3>
          <button type="button" onClick={onOpenPortfolio} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
            <ChevronRight size={16} />
          </button>
        </div>

        {loading ? (
          <div className="space-y-2">
            <DashboardSkeletonLine className="h-10 w-full rounded-xl" />
            <DashboardSkeletonLine className="h-10 w-full rounded-xl" />
          </div>
        ) : hasPortfolioData ? (
          <div className="space-y-2">
            {topWallets.map((wallet) => (
              <div key={`wallet-${wallet.id}`} className={cn(DASHBOARD_CARD_PANEL_CLASSNAME, 'flex items-center justify-between p-3')}>
                <span className="text-sm font-semibold text-[var(--text-primary)]">{wallet.name}</span>
                <span className="text-xl font-bold text-[var(--text-primary)]">{formatCurrency(wallet.balance)}</span>
              </div>
            ))}

            {topWallets.length === 0 && topInvestments.map((investment) => (
              <div key={`investment-${investment.id}`} className={cn(DASHBOARD_CARD_PANEL_CLASSNAME, 'flex items-center justify-between p-3')}>
                <span className="text-sm font-semibold text-[var(--text-primary)]">{investment.label}</span>
                <span className="text-xl font-bold text-[var(--text-primary)]">{formatCurrency(investment.value)}</span>
              </div>
            ))}

            <div className="flex justify-end">
              <button type="button" onClick={onOpenPortfolio} className="text-sm font-semibold text-[var(--primary)] hover:text-[var(--primary-hover)]">
                Ver detalhes
              </button>
            </div>
          </div>
        ) : (
          <div className={cn(DASHBOARD_CARD_PANEL_CLASSNAME, 'space-y-2.5 p-3')}>
            <p className="text-sm font-semibold text-[var(--text-primary)]">Adicione uma conta ou investimento</p>
            <p className="text-xs text-[var(--text-secondary)]">Configure sua carteira para acompanhar saldos e patrimônio.</p>
            <button type="button" onClick={onOpenCreateWallet} className="text-xs font-semibold text-[var(--primary)] hover:text-[var(--primary-hover)]">
              Adicionar conta
            </button>
          </div>
        )}
      </article>
    </div>
  );
}
