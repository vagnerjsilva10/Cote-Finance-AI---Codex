import { CalendarClock } from 'lucide-react';
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
  if (!normalized) return 'Movimentação';
  return normalized.replace(/_/g, ' ').toLowerCase();
}

export function DashboardEvents({ upcomingEvents, loading }: DashboardEventsProps) {
  return (
    <section className={cn(DASHBOARD_CARD_SHELL_CLASSNAME, 'min-h-[140px] space-y-3 !p-4 sm:!p-5')}>
      <div className="space-y-0.5">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Próximas movimentações</p>
        <p className="text-sm text-[var(--text-secondary)]">Entradas e saídas previstas para antecipar decisões no curto prazo.</p>
      </div>

      <div className="space-y-2.5">
        {loading ? (
          <>
            <DashboardSkeletonLine className="h-[64px] w-full rounded-xl" />
            <DashboardSkeletonLine className="h-[64px] w-full rounded-xl" />
          </>
        ) : upcomingEvents.length > 0 ? (
          upcomingEvents.slice(0, 3).map((event) => (
            <article
              key={`dashboard-upcoming-${event.id}`}
              className={cn(
                DASHBOARD_CARD_PANEL_CLASSNAME,
                'flex items-center justify-between gap-3 p-3 transition-all duration-200 hover:border-[var(--border-default)]'
              )}
            >
              <div className="min-w-0 space-y-1">
                <p className="inline-flex w-fit items-center rounded-full border border-[var(--border-soft)] bg-[var(--bg-tertiary)] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em] text-[var(--text-muted)]">
                  {normalizeEventTypeLabel(event.type)}
                </p>
                <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{event.title}</p>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  {formatDateShort(event.date)}  {mapUpcomingStatusLabel(event.status)}
                </p>
              </div>

              <div className="text-right">
                <p
                  className={cn(
                    'text-sm font-black',
                    event.flow === 'in'
                      ? 'text-[var(--success)]'
                      : event.flow === 'out'
                        ? 'text-[var(--danger)]'
                        : 'text-[var(--text-primary)]'
                  )}
                >
                  {event.amount === null ? '--' : formatCurrency(event.amount)}
                </p>
                <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">{getUpcomingFlowLabel(event.flow)}</p>
              </div>
            </article>
          ))
        ) : (
          <div className={cn(DASHBOARD_CARD_PANEL_CLASSNAME, 'flex items-center gap-3 p-3')}>
            <span className="inline-flex size-8 items-center justify-center rounded-full border border-[var(--border-soft)] bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">
              <CalendarClock size={15} />
            </span>
            <div className="space-y-0.5">
              <p className="text-sm font-semibold text-[var(--text-primary)]">Nenhuma movimentação futura</p>
              <p className="text-[11px] text-[var(--text-secondary)]">Adicione movimentações futuras para ver entradas e saídas previstas.</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
