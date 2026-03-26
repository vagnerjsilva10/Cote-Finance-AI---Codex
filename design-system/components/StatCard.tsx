import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Card } from '@/design-system/components/Card';

type StatCardProps = {
  label: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  semantic?: 'accent' | 'success' | 'danger' | 'warning' | 'info' | 'goal' | 'neutral';
  valueClassName?: string;
  className?: string;
};

export function StatCard({
  label,
  value,
  subtitle,
  icon,
  semantic = 'neutral',
  valueClassName,
  className,
}: StatCardProps) {
  return (
    <Card tone={semantic} className={cn('stat-card-premium', className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="label-premium">{label}</p>
        {icon ? <span className={cn('ds-stat-icon', `ds-stat-icon-${semantic}`)}>{icon}</span> : null}
      </div>
      <p className={cn('value-financial-premium mt-3', valueClassName)}>{value}</p>
      {subtitle ? <p className="mt-2 text-sm text-[var(--text-secondary)]">{subtitle}</p> : null}
    </Card>
  );
}