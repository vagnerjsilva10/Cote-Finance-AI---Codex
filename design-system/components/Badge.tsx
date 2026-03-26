import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type BadgeTone = 'success' | 'danger' | 'warning' | 'info' | 'goal' | 'neutral' | 'accent';

type BadgeProps = {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
};

const toneClassMap: Record<BadgeTone, string> = {
  success: 'badge-success',
  danger: 'badge-danger',
  warning: 'badge-warning',
  info: 'badge-info',
  goal: 'badge-goal',
  neutral: 'badge-neutral',
  accent: 'badge-accent',
};

export function Badge({ tone = 'neutral', children, className }: BadgeProps) {
  return <span className={cn('badge-premium', toneClassMap[tone], className)}>{children}</span>;
}