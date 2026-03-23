'use client';

import * as React from 'react';
import { CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';

type PremiumDatePickerProps = {
  id?: string;
  value: string;
  onChange: (nextValue: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  min?: string;
  'data-testid'?: string;
};

function parseInputDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || '').trim());
  if (!match) return null;
  const parsed = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDisplayDate(value: string) {
  const parsed = parseInputDate(value);
  if (!parsed) return '';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(parsed);
}

export function PremiumDatePicker({
  id,
  value,
  onChange,
  placeholder = 'Selecione uma data',
  className,
  disabled = false,
  min,
  'data-testid': dataTestId,
}: PremiumDatePickerProps) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const hasValue = Boolean(parseInputDate(value));

  const handleOpenPicker = React.useCallback(() => {
    if (disabled) return;
    const input = inputRef.current;
    if (!input) return;

    input.focus();
    const pickerInput = input as HTMLInputElement & { showPicker?: () => void };
    if (typeof pickerInput.showPicker === 'function') {
      pickerInput.showPicker();
    }
  }, [disabled]);

  return (
    <div className={cn('space-y-2', className)}>
      <div
        className={cn(
          'group app-field flex items-center gap-3 rounded-xl px-4 py-2.5 transition',
          disabled && 'cursor-not-allowed opacity-70',
          hasValue && 'app-field-filled'
        )}
      >
        <button
          type="button"
          onClick={handleOpenPicker}
          disabled={disabled}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--border-default)] bg-[rgba(255,255,255,0.03)] text-[var(--text-secondary)] transition group-hover:border-[var(--border-strong)] group-hover:text-[var(--text-primary)]"
          aria-label="Abrir calendário"
        >
          <CalendarDays size={16} />
        </button>

        <div className="min-w-0 flex-1">
          <input
            ref={inputRef}
            id={id}
            type="date"
            value={value}
            min={min}
            disabled={disabled}
            data-testid={dataTestId}
            onChange={(event) => onChange(event.target.value)}
            className="w-full bg-transparent text-sm font-medium text-[var(--text-primary)] outline-none [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-datetime-edit]:text-[var(--text-primary)] [&::-webkit-datetime-edit-fields-wrapper]:p-0 [&::-webkit-date-and-time-value]:text-left"
          />
          <p className={cn('mt-1 truncate text-xs', hasValue ? 'text-[var(--text-secondary)]' : 'text-[var(--text-muted)]')}>
            {hasValue ? formatDisplayDate(value) : placeholder}
          </p>
        </div>
      </div>
    </div>
  );
}