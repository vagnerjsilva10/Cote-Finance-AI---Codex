import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { PrimaryButton } from '@/design-system/components/Button';

type EmptyStateProps = {
  title: string;
  description: string;
  ctaLabel?: string;
  onCtaClick?: () => void;
  icon?: ReactNode;
  className?: string;
};

export function EmptyState({ title, description, ctaLabel, onCtaClick, icon, className }: EmptyStateProps) {
  return (
    <section className={cn('empty-state-premium p-8 text-center', className)}>
      {icon ? <div className="mx-auto mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--border-default)] bg-[var(--neutral-bg)] text-[var(--text-secondary)]">{icon}</div> : null}
      <h3 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h3>
      <p className="mx-auto mt-2 max-w-lg text-sm text-[var(--text-secondary)]">{description}</p>
      {ctaLabel && onCtaClick ? (
        <PrimaryButton className="mt-5" onClick={onCtaClick}>
          {ctaLabel}
        </PrimaryButton>
      ) : null}
    </section>
  );
}