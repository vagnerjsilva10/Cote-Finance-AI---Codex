import { cn } from '@/lib/utils';

export const DASHBOARD_CARD_SHELL_CLASSNAME =
  'ds-card-base card-neutral border-[var(--border-default)] bg-[color:color-mix(in_srgb,var(--bg-card)_64%,var(--bg-deep))] shadow-[var(--shadow-soft)] transition-all duration-200 hover:border-[var(--border-soft)]';

export const DASHBOARD_CARD_PANEL_CLASSNAME =
  'rounded-[var(--radius-sm)] border border-[var(--border-soft)] bg-[color:color-mix(in_srgb,var(--bg-card)_56%,var(--bg-deep))]';

export function DashboardSkeletonLine(props: { className?: string }) {
  return <div className={cn('animate-pulse rounded-full bg-[color:color-mix(in_srgb,var(--neutral)_18%,transparent)]', props.className)} />;
}