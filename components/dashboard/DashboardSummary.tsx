import type { ReactNode } from 'react';
import { ArrowDownRight, ArrowUpRight, Gauge, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import type {
  DashboardOverviewForecast as DashboardOverviewForecastData,
  DashboardOverviewSummary as DashboardOverviewSummaryData,
  DashboardOverviewUpcomingEvent,
} from '@/lib/dashboard/overview';
import { DASHBOARD_CARD_SHELL_CLASSNAME, DashboardSkeletonLine } from '@/components/dashboard/dashboard-primitives';
import { formatCurrency, formatDateShort, formatSignedCurrency } from '@/components/dashboard/dashboard-utils';
import { cn } from '@/lib/utils';

type DashboardSummaryProps = {
  summary: DashboardOverviewSummaryData | null;
  forecast: DashboardOverviewForecastData | null;
  upcomingEvents: DashboardOverviewUpcomingEvent[];
  loading: boolean;
};

type SummaryMetricCardProps = {
  label: string;
  value: string;
  sublineA: ReactNode;
  sublineB: ReactNode;
  icon: ReactNode;
  loading: boolean;
  valueClassName?: string;
};

const findNextEventByFlow = (events: DashboardOverviewUpcomingEvent[], flow: DashboardOverviewUpcomingEvent['flow']) => {
  return [...events]
    .filter((event) => event.flow === flow)
    .sort((left, right) => new Date(left.date).getTime() - new Date(right.date).getTime())[0];
};

function SummaryMetricCard({
  label,
  value,
  sublineA,
  sublineB,
  icon,
  loading,
  valueClassName,
}: SummaryMetricCardProps) {
  return (
    <article className={cn(DASHBOARD_CARD_SHELL_CLASSNAME, 'min-h-[126px] space-y-2.5 !p-3.5 sm:!p-4')}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">{label}</p>
        <span className="inline-flex size-7 items-center justify-center rounded-full border border-white/10 bg-[rgba(8,15,27,0.5)] text-[var(--text-secondary)]">
          {icon}
        </span>
      </div>

      {loading ? (
        <div className="space-y-2">
          <DashboardSkeletonLine className="h-7 w-32 rounded-xl" />
          <DashboardSkeletonLine className="h-3 w-20" />
          <DashboardSkeletonLine className="h-3 w-28" />
        </div>
      ) : (
        <div className="space-y-1.5">
          <p className={cn('text-[30px] font-black leading-[0.96] tracking-[-0.02em] text-[var(--text-primary)]', valueClassName)}>{value}</p>
          <div className="space-y-0.5 text-[11px]">
            <p className="font-semibold text-[var(--text-secondary)]">{sublineA}</p>
            <p className="text-[var(--text-muted)]">{sublineB}</p>
          </div>
        </div>
      )}
    </article>
  );
}

export function DashboardSummary({ summary, forecast, upcomingEvents, loading }: DashboardSummaryProps) {
  const confirmedMonthResult = summary ? summary.inflow - summary.outflow : 0;
  const nextInflowEvent = findNextEventByFlow(upcomingEvents, 'in');
  const nextOutflowEvent = findNextEventByFlow(upcomingEvents, 'out');

  const plannedIncome = forecast?.monthPlannedIncome ?? summary?.upcomingInflow ?? 0;
  const plannedExpense = forecast?.monthPlannedExpense ?? summary?.upcomingOutflow ?? 0;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-12 lg:gap-4">
      <div className="lg:col-span-3">
        <SummaryMetricCard
          label="Saldo atual"
          icon={<Wallet size={14} />}
          value={summary ? formatCurrency(summary.currentBalance) : '--'}
          valueClassName={summary && summary.currentBalance < 0 ? 'text-[var(--danger)]' : undefined}
          loading={loading}
          sublineA={
            <span className={cn('inline-flex items-center gap-1', summary && summary.currentBalance < 0 ? 'text-[var(--danger)]' : 'text-[var(--positive)]')}>
              {summary && summary.currentBalance < 0 ? <ArrowDownRight size={12} /> : <ArrowUpRight size={12} />}
              {summary && summary.currentBalance < 0 ? 'Atenção ao caixa' : 'Em dia'}
            </span>
          }
          sublineB={summary ? `${formatSignedCurrency(confirmedMonthResult)} no mês` : '--'}
        />
      </div>

      <div className="lg:col-span-3">
        <SummaryMetricCard
          label="Saldo estimado em 30 dias"
          icon={<Gauge size={14} />}
          value={summary && summary.projectedBalance30d !== null ? formatCurrency(summary.projectedBalance30d) : '--'}
          valueClassName={summary && summary.projectedBalance30d !== null && summary.projectedBalance30d < 0 ? 'text-[var(--danger)]' : undefined}
          loading={loading}
          sublineA={
            <span>
              Entradas: <span className="font-semibold text-[var(--positive)]">{formatCurrency(plannedIncome)}</span>
            </span>
          }
          sublineB={
            <span>
              Saídas: <span className="font-semibold text-[var(--danger)]">{formatCurrency(plannedExpense)}</span>
            </span>
          }
        />
      </div>

      <div className="lg:col-span-3">
        <SummaryMetricCard
          label="Próximas entradas"
          icon={<TrendingUp size={14} />}
          value={summary ? formatCurrency(summary.upcomingInflow) : '--'}
          loading={loading}
          sublineA={
            <span>
              <span className="font-semibold text-[var(--positive)]">{summary?.upcomingInflowCount ?? 0}</span> evento(s)
            </span>
          }
          sublineB={nextInflowEvent ? `Próxima data: ${formatDateShort(nextInflowEvent.date)}` : 'Próxima data: --'}
        />
      </div>

      <div className="lg:col-span-3">
        <SummaryMetricCard
          label="Próximas saídas"
          icon={<TrendingDown size={14} />}
          value={summary ? formatCurrency(summary.upcomingOutflow) : '--'}
          loading={loading}
          sublineA={
            <span>
              <span className="font-semibold text-[var(--danger)]">{summary?.upcomingOutflowCount ?? 0}</span> compromisso(s)
            </span>
          }
          sublineB={nextOutflowEvent ? `Próxima data: ${formatDateShort(nextOutflowEvent.date)}` : 'Próxima data: --'}
        />
      </div>
    </div>
  );
}

