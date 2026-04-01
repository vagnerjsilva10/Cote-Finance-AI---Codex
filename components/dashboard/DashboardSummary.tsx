import { Wallet } from 'lucide-react';
import type {
  DashboardOverviewMonthlySeriesPoint,
  DashboardOverviewSummary as DashboardOverviewSummaryData,
} from '@/lib/dashboard/overview';
import { DASHBOARD_CARD_SHELL_CLASSNAME, DashboardSkeletonLine } from '@/components/dashboard/dashboard-primitives';
import { formatCurrency } from '@/components/dashboard/dashboard-utils';
import { cn } from '@/lib/utils';

type SummaryCardTarget = 'balance' | 'income' | 'expense';

type DashboardSummaryProps = {
  summary: DashboardOverviewSummaryData | null;
  monthlySeries: DashboardOverviewMonthlySeriesPoint[];
  loading: boolean;
  onOpenSummaryTarget: (target: SummaryCardTarget) => void;
};

type CardTone = 'accent' | 'success' | 'danger';

type CardProps = {
  label: string;
  value: string;
  trend?: string | null;
  tone: CardTone;
  loading: boolean;
  onClick: () => void;
};

function formatDeltaPercent(current: number, previous: number) {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) return null;
  const delta = ((current - previous) / Math.abs(previous)) * 100;
  const sign = delta > 0 ? '+' : '';
  return `${sign}${delta.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
}

const valueClassByTone: Record<CardTone, string> = {
  accent: 'text-[var(--accent)]',
  success: 'text-[var(--success)]',
  danger: 'text-[var(--danger)]',
};

function SummaryCard({ label, value, trend, tone, loading, onClick }: CardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(DASHBOARD_CARD_SHELL_CLASSNAME, 'card-neutral min-h-[118px] w-full space-y-2 !p-4 text-left hover:-translate-y-[1px]')}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold text-[var(--text-primary)]">{label}</p>
        {trend ? (
          <p className={cn('text-sm font-bold', valueClassByTone[tone])}>{trend}</p>
        ) : (
          <span className="inline-flex size-7 items-center justify-center rounded-full border border-[var(--border-soft)] bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">
            <Wallet size={14} />
          </span>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          <DashboardSkeletonLine className="h-8 w-32 rounded-xl" />
        </div>
      ) : (
        <p className={cn('text-3xl font-black leading-tight tracking-[-0.03em]', valueClassByTone[tone])}>{value}</p>
      )}
    </button>
  );
}

export function DashboardSummary({ summary, monthlySeries, loading, onOpenSummaryTarget }: DashboardSummaryProps) {
  const inflow = summary ? summary.inflow : 0;
  const outflow = summary ? summary.outflow : 0;

  const last = monthlySeries.at(-1);
  const previous = monthlySeries.length > 1 ? monthlySeries[monthlySeries.length - 2] : null;

  const incomeTrend = last && previous ? formatDeltaPercent(last.income, previous.income) : null;
  const expenseTrend = last && previous ? formatDeltaPercent(last.expense, previous.expense) : null;

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-12 lg:gap-4">
      <div className="lg:col-span-4">
        <SummaryCard
          label="Entradas"
          value={summary ? formatCurrency(inflow) : '--'}
          trend={incomeTrend}
          tone="success"
          loading={loading}
          onClick={() => onOpenSummaryTarget('income')}
        />
      </div>
      <div className="lg:col-span-4">
        <SummaryCard
          label="Saidas"
          value={summary ? formatCurrency(outflow) : '--'}
          trend={expenseTrend}
          tone="danger"
          loading={loading}
          onClick={() => onOpenSummaryTarget('expense')}
        />
      </div>
      <div className="lg:col-span-4">
        <SummaryCard
          label="Saldo Atual"
          value={summary ? formatCurrency(summary.currentBalance) : '--'}
          tone="accent"
          loading={loading}
          onClick={() => onOpenSummaryTarget('balance')}
        />
      </div>
    </div>
  );
}
