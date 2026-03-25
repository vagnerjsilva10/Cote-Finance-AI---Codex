import { cn } from '@/lib/utils';

export const DASHBOARD_CARD_SHELL_CLASSNAME =
  'rounded-2xl border border-[color:rgba(148,163,184,0.16)] bg-[linear-gradient(165deg,rgba(19,33,54,0.88)_0%,rgba(10,20,36,0.92)_100%)] shadow-[0_12px_30px_rgba(3,8,18,0.36)] backdrop-blur-xl transition-all duration-200 hover:border-[color:rgba(148,163,184,0.24)]';

export const DASHBOARD_CARD_PANEL_CLASSNAME =
  'rounded-xl border border-[color:rgba(148,163,184,0.14)] bg-[rgba(7,14,25,0.52)]';

export function DashboardSkeletonLine(props: { className?: string }) {
  return <div className={cn('animate-pulse rounded-full bg-white/8', props.className)} />;
}
