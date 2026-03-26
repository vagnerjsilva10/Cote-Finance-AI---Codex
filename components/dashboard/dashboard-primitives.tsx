import { cn } from '@/lib/utils';

export const DASHBOARD_CARD_SHELL_CLASSNAME =
  'ds-card-base card-neutral border-[var(--border-default)] bg-[var(--bg-card)] shadow-[var(--shadow-soft)] transition-all duration-200 hover:border-[var(--border-soft)]';

export const DASHBOARD_CARD_PANEL_CLASSNAME =
  'rounded-[var(--radius-sm)] border border-[var(--border-soft)] bg-[color:color-mix(in_srgb,var(--bg-tertiary)_62%,var(--bg-card))]';

export function DashboardSkeletonLine(props: { className?: string }) {
  return <div className={cn('animate-pulse rounded-full bg-[color:color-mix(in_srgb,var(--neutral)_18%,transparent)]', props.className)} />;
}