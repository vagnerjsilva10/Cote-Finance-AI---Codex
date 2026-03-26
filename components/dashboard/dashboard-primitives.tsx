import { cn } from '@/lib/utils';

export const DASHBOARD_CARD_SHELL_CLASSNAME =
  'rounded-2xl border border-[var(--dashboard-card-shell-border)] bg-[var(--dashboard-card-shell-bg)] shadow-[var(--dashboard-card-shell-shadow)] backdrop-blur-xl transition-all duration-200 hover:border-[var(--dashboard-card-shell-border-hover)]';

export const DASHBOARD_CARD_PANEL_CLASSNAME =
  'rounded-xl border border-[var(--dashboard-card-panel-border)] bg-[var(--dashboard-card-panel-bg)]';

export function DashboardSkeletonLine(props: { className?: string }) {
  return <div className={cn('animate-pulse rounded-full bg-[var(--dashboard-skeleton-bg)]', props.className)} />;
}
