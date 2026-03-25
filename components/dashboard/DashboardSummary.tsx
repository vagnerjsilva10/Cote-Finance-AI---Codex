import { Wallet } from 'lucide-react';
import type {
  DashboardOverviewMonthlySeriesPoint,
  DashboardOverviewSummary as DashboardOverviewSummaryData,
} from '@/lib/dashboard/overview';
import { DASHBOARD_CARD_SHELL_CLASSNAME, DashboardSkeletonLine } from '@/components/dashboard/dashboard-primitives';
import { formatCurrency } from '@/components/dashboard/dashboard-utils';
import { cn } from '@/lib/utils';

type DashboardSummaryProps = {
  summary: DashboardOverviewSummaryData | null;
  monthlySeries: DashboardOverviewMonthlySeriesPoint[];
  loading: boolean;
};

type CardProps = {
  label: string;
  value: string;
  trend?: string | null;
  tone?: 'neutral' | 'positive' | 'negative';
  loading: boolean;
};

function formatDeltaPercent(current: number, previous: number) {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) return null;
  const delta = ((current - previous) / Math.abs(previous)) * 100;
  const sign = delta > 0 ? '+' : '';
  return `${sign}${delta.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
}

function SummaryCard({ label, value, trend, tone = 'neutral', loading }: CardProps) {
  return (
    <article className={cn(DASHBOARD_CARD_SHELL_CLASSNAME, 'min-h-[118px] space-y-2 !p-4')}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold text-[var(--text-primary)]">{label}</p>
        {trend ? (
          <p className={cn('text-lg font-bold', tone === 'positive' ? 'text-[var(--positive)]' : tone === 'negative' ? 'text-[var(--danger)]' : 'text-[var(--text-secondary)]')}>
            {trend}
          </p>
        ) : (
          <span className="inline-flex size-7 items-center justify-center rounded-full border border-white/10 bg-[rgba(8,15,27,0.5)] text-[var(--text-secondary)]">
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
            'text-4xl font-black leading-tight tracking-[-0.02em]',
            tone === 'positive' ? 'text-[var(--positive)]' : tone === 'negative' ? 'text-[var(--danger)]' : 'text-[var(--text-primary)]'
          )}
        >
          {value}
        </p>
      )}
    </article>
  );
}

export function DashboardSummary({ summary, monthlySeries, loading }: DashboardSummaryProps) {
  const inflow = summary ? summary.inflow : 0;
  const outflow = summary ? summary.outflow : 0;

  const last = monthlySeries.at(-1);
  const previous = monthlySeries.length > 1 ? monthlySeries[monthlySeries.length - 2] : null;

  const incomeTrend = last && previous ? formatDeltaPercent(last.income, previous.income) : null;
  const expenseTrend = last && previous ? formatDeltaPercent(last.expense, previous.expense) : null;

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-12 lg:gap-4">
      <div className="lg:col-span-4">
        <SummaryCard label="Receita" value={summary ? formatCurrency(inflow) : '--'} trend={incomeTrend} tone="positive" loading={loading} />
      </div>
      <div className="lg:col-span-4">
        <SummaryCard label="Despesa" value={summary ? formatCurrency(outflow) : '--'} trend={expenseTrend} tone="negative" loading={loading} />
      </div>
      <div className="lg:col-span-4">
        <SummaryCard label="Saldo Atual" value={summary ? formatCurrency(summary.currentBalance) : '--'} tone="neutral" loading={loading} />
      </div>
    </div>
  );
}
