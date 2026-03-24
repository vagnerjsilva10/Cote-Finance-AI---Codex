import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

type FormContainerProps = {
  title: string;
  subtitle?: string;
  onClose: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  actions: React.ReactNode;
  children: React.ReactNode;
  error?: string | null;
  isSubmitting?: boolean;
  className?: string;
  bodyClassName?: string;
  closeLabel?: string;
};

type FormGridProps = {
  children: React.ReactNode;
  className?: string;
  columns?: 1 | 2 | 3;
};

type FormFieldProps = {
  label: string;
  htmlFor?: string;
  required?: boolean;
  hint?: string;
  error?: string | null;
  className?: string;
  children: React.ReactNode;
};

type FormActionsProps = {
  children: React.ReactNode;
  className?: string;
};

export function FormContainer({
  title,
  subtitle,
  onClose,
  onSubmit,
  actions,
  children,
  error = null,
  isSubmitting = false,
  className,
  bodyClassName,
  closeLabel = 'Fechar formulario',
}: FormContainerProps) {
  return (
    <div className={cn('space-y-5', className)}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="page-title-premium text-[var(--text-primary)]">{title}</h3>
          {subtitle ? <p className="mt-1 text-sm leading-relaxed text-[var(--text-secondary)]">{subtitle}</p> : null}
        </div>
        <button
          type="button"
          aria-label={closeLabel}
          onClick={onClose}
          disabled={isSubmitting}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface-elevated)] text-[var(--text-muted)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <X size={18} />
        </button>
      </div>

      <form className={cn('space-y-4', bodyClassName)} onSubmit={onSubmit} noValidate>
        {children}
        {error ? (
          <div
            role="alert"
            className="rounded-xl border border-[color:color-mix(in_srgb,var(--danger)_55%,transparent)] bg-[color:var(--danger-soft)] px-3 py-2 text-xs text-[var(--danger)]"
          >
            {error}
          </div>
        ) : null}
        <FormActions>{actions}</FormActions>
      </form>
    </div>
  );
}

export function FormGrid({ children, className, columns = 2 }: FormGridProps) {
  const columnsClass =
    columns === 1 ? 'grid-cols-1' : columns === 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
  return <div className={cn('grid gap-3 sm:gap-4', columnsClass, className)}>{children}</div>;
}

export function FormField({ label, htmlFor, required = false, hint, error = null, className, children }: FormFieldProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <label className="label-premium text-[var(--text-muted)]" htmlFor={htmlFor}>
        {label}
        {required ? <span className="ml-1 text-[var(--danger)]">*</span> : null}
      </label>
      {children}
      {error ? (
        <p role="alert" className="text-xs text-[var(--danger)]">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-[var(--text-muted)]">{hint}</p>
      ) : null}
    </div>
  );
}

export function FormActions({ children, className }: FormActionsProps) {
  return <div className={cn('flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end', className)}>{children}</div>;
}
