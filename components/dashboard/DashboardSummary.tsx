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

type CardProps = {
  label: string;
  value: string;
  trend?: string | null;
  tone?: 'neutral' | 'positive' | 'negative';
  loading: boolean;
  onClick: () => void;
};

function formatDeltaPercent(current: number, previous: number) {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) return null;
  const delta = ((current - previous) / Math.abs(previous)) * 100;
  const sign = delta > 0 ? '+' : '';
  return `${sign}${delta.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
}

function SummaryCard({ label, value, trend, tone = 'neutral', loading, onClick }: CardProps) {
  const accentClass =
    tone === 'positive'
      ? 'border-l-[color:rgba(34,197,94,0.75)] bg-[linear-gradient(120deg,rgba(34,197,94,0.12),rgba(12,18,30,0.08)_28%)]'
      : tone === 'negative'
        ? 'border-l-[color:rgba(248,113,113,0.78)] bg-[linear-gradient(120deg,rgba(248,113,113,0.12),rgba(12,18,30,0.08)_28%)]'
        : 'border-l-[color:rgba(76,141,255,0.85)] bg-[linear-gradient(120deg,rgba(76,141,255,0.14),rgba(12,18,30,0.08)_28%)]';

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        DASHBOARD_CARD_SHELL_CLASSNAME,
        'min-h-[118px] w-full space-y-2 border-l-4 !p-4 text-left hover:-translate-y-[1px]',
        accentClass
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p
          className={cn(
            'inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold',
            tone === 'positive'
              ? 'bg-[rgba(34,197,94,0.16)] text-[var(--positive)]'
              : tone === 'negative'
                ? 'bg-[rgba(248,113,113,0.16)] text-[var(--danger)]'
                : 'bg-[rgba(76,141,255,0.18)] text-[var(--primary)]'
          )}
        >
          {label}
        </p>
        {trend ? (
          <p className={cn('text-sm font-bold', tone === 'positive' ? 'text-[var(--positive)]' : tone === 'negative' ? 'text-[var(--danger)]' : 'text-[var(--text-secondary)]')}>
            {trend}
          </p>
        ) : (
          <span
            className={cn(
              'inline-flex size-7 items-center justify-center rounded-full border border-white/10 bg-[rgba(8,15,27,0.5)]',
              tone === 'positive'
                ? 'text-[var(--positive)]'
                : tone === 'negative'
                  ? 'text-[var(--danger)]'
                  : 'text-[var(--primary)]'
            )}
          >
            <Wallet size={14} />
          </span>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          <DashboardSkeletonLine className="h-8 w-32 rounded-xl" />
        </div>
      ) : (
        <p
          className={cn(
            'text-3xl font-black leading-tight tracking-[-0.02em]',
            tone === 'positive' ? 'text-[var(--positive)]' : tone === 'negative' ? 'text-[var(--danger)]' : 'text-[var(--text-primary)]'
          )}
        >
          {value}
        </p>
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
          label="Receita"
          value={summary ? formatCurrency(inflow) : '--'}
          trend={incomeTrend}
          tone="positive"
          loading={loading}
          onClick={() => onOpenSummaryTarget('income')}
        />
      </div>
      <div className="lg:col-span-4">
        <SummaryCard
          label="Despesa"
          value={summary ? formatCurrency(outflow) : '--'}
          trend={expenseTrend}
          tone="negative"
          loading={loading}
          onClick={() => onOpenSummaryTarget('expense')}
        />
      </div>
      <div className="lg:col-span-4">
        <SummaryCard
          label="Saldo Atual"
          value={summary ? formatCurrency(summary.currentBalance) : '--'}
          tone="neutral"
          loading={loading}
          onClick={() => onOpenSummaryTarget('balance')}
        />
      </div>
    </div>
  );
}
