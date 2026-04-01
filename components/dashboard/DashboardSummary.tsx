import type { DashboardOverviewSummary as DashboardOverviewSummaryData } from '@/lib/dashboard/overview';
import {
  DASHBOARD_CARD_SHELL_CLASSNAME,
  DashboardSkeletonLine,
} from '@/components/dashboard/dashboard-primitives';
import { formatCurrency } from '@/components/dashboard/dashboard-utils';
import { cn } from '@/lib/utils';

type SummaryCardTarget = 'balance' | 'income' | 'expense' | 'net';

type DashboardSummaryProps = {
  summary: DashboardOverviewSummaryData | null;
  loading: boolean;
  onOpenSummaryTarget: (target: SummaryCardTarget) => void;
};

type CardTone = 'accent' | 'success' | 'danger';

type CardProps = {
  label: string;
  value: string;
  hint?: string | null;
  tone: CardTone;
  loading: boolean;
  onClick: () => void;
};

function formatDeltaPercent(deltaPercent: number | null | undefined) {
  if (typeof deltaPercent !== 'number' || !Number.isFinite(deltaPercent)) return null;
  const sign = deltaPercent > 0 ? '+' : '';
  return `${sign}${deltaPercent.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
}

const valueClassByTone: Record<CardTone, string> = {
  accent: 'text-[var(--accent)]',
  success: 'text-[var(--success)]',
  danger: 'text-[var(--danger)]',
};

function SummaryCard({ label, value, hint, tone, loading, onClick }: CardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        DASHBOARD_CARD_SHELL_CLASSNAME,
        'card-neutral min-h-[116px] w-full space-y-2 !p-4 text-left hover:-translate-y-[1px]'
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold text-[var(--text-primary)]">{label}</p>
        {hint ? (
          <p className={cn('text-xs font-bold', valueClassByTone[tone])}>{hint}</p>
        ) : (
          <span className="inline-flex rounded-full border border-[var(--border-soft)] bg-[var(--bg-tertiary)] px-2 py-0.5 text-[10px] font-semibold text-[var(--text-secondary)]">
            Sem comparação
          </span>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          <DashboardSkeletonLine className="h-8 w-32 rounded-xl" />
        </div>
      ) : (
        <p className={cn('text-3xl font-black leading-tight tracking-[-0.03em]', valueClassByTone[tone])}>
          {value}
        </p>
      )}
    </button>
  );
}

export function DashboardSummary({ summary, loading, onOpenSummaryTarget }: DashboardSummaryProps) {
  const inflowTrend = formatDeltaPercent(summary?.comparison?.inflowDeltaPercent);
  const outflowTrend = formatDeltaPercent(summary?.comparison?.outflowDeltaPercent);
  const netTrend = formatDeltaPercent(summary?.comparison?.periodNetDeltaPercent);

  const periodNetTone: CardTone =
    typeof summary?.periodNet === 'number' && summary.periodNet < 0 ? 'danger' : 'accent';

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-12 lg:gap-4">
        <div className="lg:col-span-3">
          <SummaryCard
            label="Entradas"
            value={summary ? formatCurrency(summary.inflow) : '--'}
            hint={inflowTrend}
            tone="success"
            loading={loading}
            onClick={() => onOpenSummaryTarget('income')}
          />
        </div>
        <div className="lg:col-span-3">
          <SummaryCard
            label="Saídas"
            value={summary ? formatCurrency(summary.outflow) : '--'}
            hint={outflowTrend}
            tone="danger"
            loading={loading}
            onClick={() => onOpenSummaryTarget('expense')}
          />
        </div>
        <div className="lg:col-span-3">
          <SummaryCard
            label="Resultado do período"
            value={summary ? formatCurrency(summary.periodNet) : '--'}
            hint={netTrend}
            tone={periodNetTone}
            loading={loading}
            onClick={() => onOpenSummaryTarget('net')}
          />
        </div>
        <div className="lg:col-span-3">
          <SummaryCard
            label="Saldo atual"
            value={summary ? formatCurrency(summary.currentBalance) : '--'}
            hint="Tempo real"
            tone="accent"
            loading={loading}
            onClick={() => onOpenSummaryTarget('balance')}
          />
        </div>
      </div>

      {!loading && summary?.comparison?.label ? (
        <p className="text-xs text-[var(--text-muted)]">{summary.comparison.label}</p>
      ) : null}
    </div>
  );
}

