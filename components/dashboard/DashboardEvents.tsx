import type { DashboardOverviewUpcomingEvent } from '@/lib/dashboard/overview';
import { DashboardSkeletonLine } from '@/components/dashboard/dashboard-primitives';
import { formatCurrency, formatDateShort, getUpcomingFlowLabel, mapUpcomingStatusLabel } from '@/components/dashboard/dashboard-utils';
import { cn } from '@/lib/utils';

type DashboardEventsProps = {
  upcomingEvents: DashboardOverviewUpcomingEvent[];
  loading: boolean;
};

export function DashboardEvents({ upcomingEvents, loading }: DashboardEventsProps) {
  return (
    <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-app)] px-4 py-3">
      <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Próximas movimentações</p>
      <div className="mt-3 space-y-2">
        {loading ? (
          <>
            <DashboardSkeletonLine className="h-16 w-full rounded-2xl" />
            <DashboardSkeletonLine className="h-16 w-full rounded-2xl" />
            <DashboardSkeletonLine className="h-16 w-full rounded-2xl" />
          </>
        ) : upcomingEvents.length > 0 ? (
          upcomingEvents.map((event) => (
            <div
              key={`dashboard-upcoming-${event.id}`}
              className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{event.title}</p>
                <p className="text-xs text-[var(--text-secondary)]">
                  {formatDateShort(event.date)} • {mapUpcomingStatusLabel(event.status)}
                </p>
              </div>
              <div className="text-right">
                <p className={cn('text-sm font-black', event.flow === 'in' ? 'text-[var(--positive)]' : event.flow === 'out' ? 'text-[var(--danger)]' : 'text-[var(--text-primary)]')}>
                  {event.amount === null ? '--' : formatCurrency(event.amount)}
                </p>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">{getUpcomingFlowLabel(event.flow)}</p>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-[var(--text-secondary)]">Adicione movimentações para visualizar previsões de entradas e saídas.</p>
        )}
      </div>
    </div>
  );
}
