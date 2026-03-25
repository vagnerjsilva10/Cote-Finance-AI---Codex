import { ArrowDownRight, ArrowUpRight, Gauge, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import type {
  DashboardOverviewForecast as DashboardOverviewForecastData,
  DashboardOverviewSummary as DashboardOverviewSummaryData,
  DashboardOverviewUpcomingEvent,
} from '@/lib/dashboard/overview';
import {
  DASHBOARD_CARD_SHELL_CLASSNAME,
  DashboardSkeletonLine,
} from '@/components/dashboard/dashboard-primitives';
import {
  formatCurrency,
  formatDateShort,
  formatSignedCurrency,
} from '@/components/dashboard/dashboard-utils';
import { cn } from '@/lib/utils';

type DashboardSummaryProps = {
  summary: DashboardOverviewSummaryData | null;
  forecast: DashboardOverviewForecastData | null;
  upcomingEvents: DashboardOverviewUpcomingEvent[];
  loading: boolean;
};

const findNextEventByFlow = (
  events: DashboardOverviewUpcomingEvent[],
  flow: DashboardOverviewUpcomingEvent['flow']
) => {
  return [...events]
    .filter((event) => event.flow === flow)
    .sort((left, right) => new Date(left.date).getTime() - new Date(right.date).getTime())[0];
};

export function DashboardSummary({ summary, forecast, upcomingEvents, loading }: DashboardSummaryProps) {
  const confirmedMonthResult = summary ? summary.inflow - summary.outflow : 0;
  const nextInflowEvent = findNextEventByFlow(upcomingEvents, 'in');
  const nextOutflowEvent = findNextEventByFlow(upcomingEvents, 'out');

  const plannedIncome = forecast?.monthPlannedIncome ?? summary?.upcomingInflow ?? 0;
  const plannedExpense = forecast?.monthPlannedExpense ?? summary?.upcomingOutflow ?? 0;

  const cardClassName = cn(DASHBOARD_CARD_SHELL_CLASSNAME, 'min-h-[112px] space-y-2.5');

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-12">
      <div className={cn(cardClassName, 'lg:col-span-3')}>
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">{'Saldo atual'}</p>
          <span className="inline-flex size-9 items-center justify-center rounded-full border border-[color:color-mix(in_srgb,var(--primary)_30%,transparent)] bg-[color:color-mix(in_srgb,var(--primary)_16%,transparent)] text-[var(--primary)]">
            <Wallet size={17} />
          </span>
        </div>

        {loading ? (
          <div className="space-y-2.5">
            <DashboardSkeletonLine className="h-10 w-40 rounded-xl" />
            <DashboardSkeletonLine className="h-4 w-28" />
            <DashboardSkeletonLine className="h-4 w-36" />
          </div>
        ) : (
          <>
            <p className="text-2xl font-black leading-none tracking-[-0.02em] text-[var(--text-primary)] sm:text-3xl">
              {summary ? formatCurrency(summary.currentBalance) : '--'}
            </p>
            <div className="space-y-1.5 text-xs">
              <p className={cn('inline-flex items-center gap-1.5 font-semibold', summary && summary.currentBalance < 0 ? 'text-[var(--danger)]' : 'text-[var(--positive)]')}>
                {summary && summary.currentBalance < 0 ? <ArrowDownRight size={13} /> : <ArrowUpRight size={13} />}
                <span>{summary && summary.currentBalance < 0 ? 'Aten\u00e7\u00e3o ao caixa' : 'Em dia'}</span>
              </p>
              <p className="text-[var(--text-secondary)]">{'Dispon\u00edvel hoje'}</p>
              <p className={cn('font-semibold', confirmedMonthResult < 0 ? 'text-[var(--danger)]' : 'text-[var(--positive)]')}>
                {summary ? `${formatSignedCurrency(confirmedMonthResult)} no m\u00eas` : '--'}
              </p>
            </div>
          </>
        )}
      </div>

      <div className={cn(cardClassName, 'lg:col-span-3')}>
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">{'Saldo estimado em 30 dias'}</p>
          <span className="inline-flex size-9 items-center justify-center rounded-full border border-[color:color-mix(in_srgb,var(--primary)_30%,transparent)] bg-[color:color-mix(in_srgb,var(--primary)_16%,transparent)] text-[var(--primary)]">
            <Gauge size={17} />
          </span>
        </div>

        {loading ? (
          <div className="space-y-2.5">
            <DashboardSkeletonLine className="h-10 w-44 rounded-xl" />
            <DashboardSkeletonLine className="h-4 w-36" />
            <DashboardSkeletonLine className="h-4 w-36" />
          </div>
        ) : (
          <>
            <p
              className={cn(
                'text-2xl font-black leading-none tracking-[-0.02em] sm:text-3xl',
                forecast && forecast.projectedBalance30d !== null && forecast.projectedBalance30d < 0
                  ? 'text-[var(--danger)]'
                  : 'text-[var(--text-primary)]'
              )}
            >
              {summary && summary.projectedBalance30d !== null ? formatCurrency(summary.projectedBalance30d) : '--'}
            </p>
            <div className="space-y-1.5 text-xs text-[var(--text-secondary)]">
              <p>
                {'Entradas previstas:'} <span className="font-semibold text-[var(--positive)]">{formatCurrency(plannedIncome)}</span>
              </p>
              <p>
                {'Sa\u00eddas previstas:'} <span className="font-semibold text-[var(--danger)]">{formatCurrency(plannedExpense)}</span>
              </p>
            </div>
          </>
        )}
      </div>

      <div className={cn(cardClassName, 'lg:col-span-3')}>
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">{'Pr\u00f3ximas entradas'}</p>
          <span className="inline-flex size-9 items-center justify-center rounded-full border border-[color:color-mix(in_srgb,var(--positive)_30%,transparent)] bg-[color:color-mix(in_srgb,var(--positive)_16%,transparent)] text-[var(--positive)]">
            <TrendingUp size={17} />
          </span>
        </div>

        {loading ? (
          <div className="space-y-2.5">
            <DashboardSkeletonLine className="h-10 w-40 rounded-xl" />
            <DashboardSkeletonLine className="h-4 w-32" />
            <DashboardSkeletonLine className="h-4 w-36" />
          </div>
        ) : (
          <>
            <p className="text-2xl font-black leading-none tracking-[-0.02em] text-[var(--text-primary)] sm:text-3xl">
              {summary ? formatCurrency(summary.upcomingInflow) : '--'}
            </p>
            <div className="space-y-1.5 text-xs text-[var(--text-secondary)]">
              <p>
                <span className="font-semibold text-[var(--positive)]">{summary?.upcomingInflowCount ?? 0}</span> evento(s)
              </p>
              <p>
                {'Pr\u00f3xima data:'}{' '}
                <span className="font-semibold text-[var(--text-primary)]">
                  {nextInflowEvent ? formatDateShort(nextInflowEvent.date) : '--'}
                </span>
              </p>
            </div>
          </>
        )}
      </div>

      <div className={cn(cardClassName, 'lg:col-span-3')}>
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">{'Pr\u00f3ximas sa\u00eddas'}</p>
          <span className="inline-flex size-9 items-center justify-center rounded-full border border-[color:color-mix(in_srgb,var(--danger)_30%,transparent)] bg-[color:color-mix(in_srgb,var(--danger)_16%,transparent)] text-[var(--danger)]">
            <TrendingDown size={17} />
          </span>
        </div>

        {loading ? (
          <div className="space-y-2.5">
            <DashboardSkeletonLine className="h-10 w-40 rounded-xl" />
            <DashboardSkeletonLine className="h-4 w-32" />
            <DashboardSkeletonLine className="h-4 w-36" />
          </div>
        ) : (
          <>
            <p className="text-2xl font-black leading-none tracking-[-0.02em] text-[var(--text-primary)] sm:text-3xl">
              {summary ? formatCurrency(summary.upcomingOutflow) : '--'}
            </p>
            <div className="space-y-1.5 text-xs text-[var(--text-secondary)]">
              <p>
                <span className="font-semibold text-[var(--danger)]">{summary?.upcomingOutflowCount ?? 0}</span> compromisso(s)
              </p>
              <p>
                {'Pr\u00f3xima data:'}{' '}
                <span className="font-semibold text-[var(--text-primary)]">
                  {nextOutflowEvent ? formatDateShort(nextOutflowEvent.date) : '--'}
                </span>
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}