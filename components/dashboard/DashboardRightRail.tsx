import { ChevronRight } from 'lucide-react';
import type {
  DashboardOverviewForecast,
  DashboardOverviewSummary,
} from '@/lib/dashboard/overview';
import {
  DASHBOARD_CARD_PANEL_CLASSNAME,
  DASHBOARD_CARD_SHELL_CLASSNAME,
  DashboardSkeletonLine,
} from '@/components/dashboard/dashboard-primitives';
import { formatCurrency } from '@/components/dashboard/dashboard-utils';
import { cn } from '@/lib/utils';

type DashboardRightRailProps = {
  summary: DashboardOverviewSummary | null;
  forecast: DashboardOverviewForecast | null;
  loading: boolean;
};

export function DashboardRightRail({ summary, forecast, loading }: DashboardRightRailProps) {
  const goalTarget = 15000;
  const goalCurrent = Math.max(0, summary?.currentBalance ?? 0);
  const goalProgress = Math.max(0, Math.min(100, Math.round((goalCurrent / goalTarget) * 100)));

  const currentAccount = summary?.currentBalance ?? 0;
  const investments = forecast ? Math.max(0, forecast.monthPlannedIncome - forecast.monthPlannedExpense) : 0;

  return (
    <div className="space-y-4">
      <article className={cn(DASHBOARD_CARD_SHELL_CLASSNAME, 'space-y-3 !p-4 sm:!p-5')}>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-[var(--text-primary)]">Metas</h3>
          <ChevronRight size={16} className="text-[var(--text-muted)]" />
        </div>
        {loading ? (
          <div className="space-y-2">
            <DashboardSkeletonLine className="h-4 w-40" />
            <DashboardSkeletonLine className="h-4 w-32" />
            <DashboardSkeletonLine className="h-3 w-full" />
          </div>
        ) : (
          <div className={cn(DASHBOARD_CARD_PANEL_CLASSNAME, 'space-y-2.5 p-3')}>
            <p className="text-sm font-semibold text-[var(--text-primary)]">Economizar para Viagem</p>
            <p className="text-sm text-[var(--text-secondary)]">
              {formatCurrency(goalCurrent)} / {formatCurrency(goalTarget)}
            </p>
            <div className="h-2 overflow-hidden rounded-full bg-[rgba(148,163,184,0.18)]">
              <div className="h-full rounded-full bg-[linear-gradient(90deg,#4c8dff,#6eb5ff)]" style={{ width: `${goalProgress}%` }} />
            </div>
            <div className="flex items-center justify-between">
              <button type="button" className="text-sm font-semibold text-[var(--primary)] hover:text-[var(--primary-hover)]">
                Ver todas metas
              </button>
              <span className="rounded-md bg-[rgba(76,141,255,0.2)] px-2 py-1 text-sm font-semibold text-[var(--text-primary)]">{goalProgress}%</span>
            </div>
          </div>
        )}
      </article>

      <article className={cn(DASHBOARD_CARD_SHELL_CLASSNAME, 'space-y-3 !p-4 sm:!p-5')}>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-[var(--text-primary)]">Carteira</h3>
          <ChevronRight size={16} className="text-[var(--text-muted)]" />
        </div>
        {loading ? (
          <div className="space-y-2">
            <DashboardSkeletonLine className="h-10 w-full rounded-xl" />
            <DashboardSkeletonLine className="h-10 w-full rounded-xl" />
          </div>
        ) : (
          <div className="space-y-2">
            <div className={cn(DASHBOARD_CARD_PANEL_CLASSNAME, 'flex items-center justify-between p-3')}>
              <span className="text-sm font-semibold text-[var(--text-primary)]">Conta Corrente</span>
              <span className="text-2xl font-bold text-[var(--text-primary)]">{formatCurrency(currentAccount)}</span>
            </div>
            <div className={cn(DASHBOARD_CARD_PANEL_CLASSNAME, 'flex items-center justify-between p-3')}>
              <span className="text-sm font-semibold text-[var(--text-primary)]">Investimentos</span>
              <span className="text-2xl font-bold text-[var(--text-primary)]">{formatCurrency(investments)}</span>
            </div>
            <div className="flex justify-end">
              <button type="button" className="text-sm font-semibold text-[var(--primary)] hover:text-[var(--primary-hover)]">
                Ver detalhes
              </button>
            </div>
          </div>
        )}
      </article>
    </div>
  );
}
