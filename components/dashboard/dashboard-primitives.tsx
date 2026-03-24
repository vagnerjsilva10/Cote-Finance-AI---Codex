import * as React from 'react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';

type DashboardStatCardProps = {
  label: string;
  value: string;
  trend: string;
  trendValue: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  trendType?: 'up' | 'down';
  loading?: boolean;
};

export function DashboardSkeletonLine(props: { className?: string }) {
  return <div className={cn('animate-pulse rounded-full bg-white/8', props.className)} />;
}

export function DashboardStatCard({
  label,
  value,
  trend,
  trendValue,
  icon: Icon,
  trendType = 'up',
  loading = false,
}: DashboardStatCardProps) {
  return (
    <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 sm:p-8 shadow-[var(--shadow-soft)]">
      <div className="mb-6 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">{label}</span>
        <div className="rounded-full border border-[color:color-mix(in_srgb,var(--primary)_35%,transparent)] bg-[var(--primary-soft)] p-2.5 text-[var(--primary)] shadow-[0_8px_20px_rgba(2,6,23,.2)]">
          <Icon size={17} />
        </div>
      </div>
      <div className="flex flex-col gap-3.5">
        {loading ? (
          <>
            <DashboardSkeletonLine className="h-11 w-40 rounded-xl" />
            <DashboardSkeletonLine className="h-4 w-48" />
          </>
        ) : (
          <>
            <p className="text-[clamp(1.95rem,6.2vw,2.25rem)] font-bold leading-none tracking-[-0.03em] text-[var(--text-primary)]">
              {value}
            </p>
            <div
              className={cn(
                'flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[13px] font-semibold',
                trendType === 'up' ? 'status-positive-premium' : 'status-negative-premium'
              )}
            >
              {trendType === 'up' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              <span>{trendValue}</span>
              <span className="ml-1 text-[12px] font-normal leading-5 text-[var(--text-secondary)]/90">{trend}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}


