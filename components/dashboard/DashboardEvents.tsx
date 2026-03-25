import type { DashboardOverviewUpcomingEvent } from '@/lib/dashboard/overview';
import {
  DASHBOARD_CARD_PANEL_CLASSNAME,
  DASHBOARD_CARD_SHELL_CLASSNAME,
  DashboardSkeletonLine,
} from '@/components/dashboard/dashboard-primitives';
import {
  formatCurrency,
  formatDateShort,
  getUpcomingFlowLabel,
  mapUpcomingStatusLabel,
} from '@/components/dashboard/dashboard-utils';
import { cn } from '@/lib/utils';

type DashboardEventsProps = {
  upcomingEvents: DashboardOverviewUpcomingEvent[];
  loading: boolean;
};

function normalizeEventTypeLabel(type: string) {
  const normalized = String(type || '').trim();
  if (!normalized) return 'Movimenta\u00e7\u00e3o';
  return normalized.replace(/_/g, ' ').toLowerCase();
}

export function DashboardEvents({ upcomingEvents, loading }: DashboardEventsProps) {
  return (
    <section className={cn(DASHBOARD_CARD_SHELL_CLASSNAME, 'min-h-[180px] space-y-4')}>
      <div className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">{'Pr\u00f3ximas movimenta\u00e7\u00f5es'}</p>
        <p className="text-sm text-[var(--text-secondary)]">{'Entradas e sa\u00eddas previstas para antecipar decis\u00f5es no curto prazo.'}</p>
      </div>

      <div className="space-y-3">
        {loading ? (
          <>
            <DashboardSkeletonLine className="h-[72px] w-full rounded-xl" />
            <DashboardSkeletonLine className="h-[72px] w-full rounded-xl" />
            <DashboardSkeletonLine className="h-[72px] w-full rounded-xl" />
          </>
        ) : upcomingEvents.length > 0 ? (
          upcomingEvents.map((event) => (
            <article
              key={`dashboard-upcoming-${event.id}`}
              className={cn(
                DASHBOARD_CARD_PANEL_CLASSNAME,
                'flex items-center justify-between gap-4 p-4 transition-all duration-200 hover:-translate-y-[2px] hover:shadow-[0_12px_26px_rgba(0,0,0,0.28)]'
              )}
            >
              <div className="min-w-0 space-y-1">
                <p className="inline-flex w-fit items-center rounded-full border border-white/10 bg-[rgba(8,15,27,0.55)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">
                  {normalizeEventTypeLabel(event.type)}
                </p>
                <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{event.title}</p>
                <p className="text-xs text-[var(--text-secondary)]">
                  {formatDateShort(event.date)} • {mapUpcomingStatusLabel(event.status)}
                </p>
              </div>

              <div className="text-right">
                <p
                  className={cn(
                    'text-base font-black',
                    event.flow === 'in'
                      ? 'text-[var(--positive)]'
                      : event.flow === 'out'
                        ? 'text-[var(--danger)]'
                        : 'text-[var(--text-primary)]'
                  )}
                >
                  {event.amount === null ? '--' : formatCurrency(event.amount)}
                </p>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  {getUpcomingFlowLabel(event.flow)}
                </p>
              </div>
            </article>
          ))
        ) : (
          <p className="text-sm text-[var(--text-secondary)]">
            {'Adicione movimenta\u00e7\u00f5es futuras para visualizar entradas e sa\u00eddas previstas.'}
          </p>
        )}
      </div>
    </section>
  );
}