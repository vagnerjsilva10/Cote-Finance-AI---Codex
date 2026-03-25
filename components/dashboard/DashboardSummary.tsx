import { Wallet } from 'lucide-react';
import type { DashboardOverviewSummary as DashboardOverviewSummaryData } from '@/lib/dashboard/overview';
import { DASHBOARD_CARD_SHELL_CLASSNAME, DashboardSkeletonLine } from '@/components/dashboard/dashboard-primitives';
import { formatCurrency } from '@/components/dashboard/dashboard-utils';
import { cn } from '@/lib/utils';

type DashboardSummaryProps = {
  summary: DashboardOverviewSummaryData | null;
  loading: boolean;
};

type CardProps = {
  label: string;
  value: string;
  tone?: 'neutral' | 'positive' | 'negative';
  loading: boolean;
};

function SummaryCard({ label, value, tone = 'neutral', loading }: CardProps) {
  return (
    <article className={cn(DASHBOARD_CARD_SHELL_CLASSNAME, 'min-h-[120px] space-y-2 !p-4')}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">{label}</p>
        <span className="inline-flex size-7 items-center justify-center rounded-full border border-white/10 bg-[rgba(8,15,27,0.5)] text-[var(--text-secondary)]">
          <Wallet size={14} />
        </span>
      </div>

      {loading ? (
        <div className="space-y-2">
          <DashboardSkeletonLine className="h-8 w-32 rounded-xl" />
          <DashboardSkeletonLine className="h-3 w-28" />
        </div>
      ) : (
        <p
          className={cn(
            'text-2xl font-black leading-tight tracking-[-0.01em]',
            tone === 'positive' ? 'text-[var(--positive)]' : tone === 'negative' ? 'text-[var(--danger)]' : 'text-[var(--text-primary)]'
          )}
        >
          {value}
        </p>
      )}
    </article>
  );
}

export function DashboardSummary({ summary, loading }: DashboardSummaryProps) {
  const inflow = summary ? summary.inflow : 0;
  const outflow = summary ? summary.outflow : 0;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-12 lg:gap-4">
      <div className="lg:col-span-4">
        <SummaryCard label="Saldo atual" value={summary ? formatCurrency(summary.currentBalance) : '--'} tone="neutral" loading={loading} />
      </div>
      <div className="lg:col-span-4">
        <SummaryCard label="Entradas do mês" value={summary ? formatCurrency(inflow) : '--'} tone="positive" loading={loading} />
      </div>
      <div className="lg:col-span-4">
        <SummaryCard label="Saídas do mês" value={summary ? formatCurrency(outflow) : '--'} tone="negative" loading={loading} />
      </div>
    </div>
  );
}

