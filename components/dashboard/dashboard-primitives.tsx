import { cn } from '@/lib/utils';

export const DASHBOARD_CARD_SHELL_CLASSNAME =
  'rounded-xl border border-white/5 bg-gradient-to-b from-[#0f1c2e] to-[#0b1625] p-6 shadow-[0_8px_30px_rgba(0,0,0,0.25)] transition-all duration-200 hover:-translate-y-[2px] hover:shadow-[0_14px_38px_rgba(0,0,0,0.35)]';

export const DASHBOARD_CARD_PANEL_CLASSNAME =
  'rounded-xl border border-white/[0.06] bg-[rgba(7,14,25,0.55)]';

export function DashboardSkeletonLine(props: { className?: string }) {
  return <div className={cn('animate-pulse rounded-full bg-white/8', props.className)} />;
}