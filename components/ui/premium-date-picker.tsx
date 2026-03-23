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
  return new Intl.DateTimeFormat('pt-BR').format(parsed);
}

export function PremiumDatePicker({
  id,
  value,
  onChange,
  placeholder = 'Selecione a data',
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
      return;
    }

    input.click();
  }, [disabled]);

  return (
    <div className={cn('relative', className)}>
      <button
        type="button"
        onClick={handleOpenPicker}
        disabled={disabled}
        className={cn(
          'app-field flex h-[42px] w-full items-center justify-between gap-3 rounded-xl px-4 text-left text-sm transition',
          disabled && 'cursor-not-allowed opacity-70'
        )}
        aria-label={hasValue ? `Selecionar data, atual ${formatDisplayDate(value)}` : 'Selecionar data'}
      >
        <span className={cn('truncate font-medium', hasValue ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]')}>
          {hasValue ? formatDisplayDate(value) : placeholder}
        </span>
        <CalendarDays size={16} className="shrink-0 text-[var(--text-secondary)]" />
      </button>

      <input
        ref={inputRef}
        id={id}
        type="date"
        value={value}
        min={min}
        disabled={disabled}
        data-testid={dataTestId}
        onChange={(event) => onChange(event.target.value)}
        className="pointer-events-none absolute inset-0 h-full w-full opacity-0 [color-scheme:dark]"
        tabIndex={-1}
        aria-hidden="true"
      />
    </div>
  );
}