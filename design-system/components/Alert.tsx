import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type AlertTone = 'info' | 'warning' | 'danger' | 'success';

type AlertProps = {
  tone?: AlertTone;
  title?: string;
  children: ReactNode;
  className?: string;
};

export function Alert({ tone = 'info', title, children, className }: AlertProps) {
  return (
    <div role="alert" className={cn('ds-alert', `ds-alert-${tone}`, className)}>
      {title ? <p className="text-sm font-semibold text-[var(--text-primary)]">{title}</p> : null}
      <div className="text-sm text-[var(--text-secondary)]">{children}</div>
    </div>
  );
}