'use client';

import * as React from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

type PremiumDatePickerProps = {
  id?: string;
  value: string;
  onChange: (nextValue: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  min?: string;
  invalid?: boolean;
  'data-testid'?: string;
};

type MonthCell = {
  key: string;
  date: Date;
  inCurrentMonth: boolean;
};

function parseInputDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || '').trim());
  if (!match) return null;
  const parsed = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function startOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function startOfMonth(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), 1);
}

function addMonths(value: Date, amount: number) {
  return new Date(value.getFullYear(), value.getMonth() + amount, 1);
}

function toDateKey(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isSameDate(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function buildMonthCells(month: Date): MonthCell[] {
  const monthStart = startOfMonth(month);
  const weekStartOffset = monthStart.getDay();
  const gridStart = new Date(
    monthStart.getFullYear(),
    monthStart.getMonth(),
    monthStart.getDate() - weekStartOffset
  );

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + index);
    return {
      key: toDateKey(day),
      date: day,
      inCurrentMonth: day.getMonth() === monthStart.getMonth(),
    };
  });
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
  invalid = false,
  'data-testid': dataTestId,
}: PremiumDatePickerProps) {
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const parsedValue = parseInputDate(value);
  const hasValue = Boolean(parsedValue);
  const minDate = min ? parseInputDate(min) : null;
  const normalizedMinDate = minDate ? startOfDay(minDate) : null;
  const today = startOfDay(new Date());

  const [isCalendarOpen, setIsCalendarOpen] = React.useState(false);
  const [visibleMonth, setVisibleMonth] = React.useState<Date>(() =>
    startOfMonth(parsedValue || today)
  );

  React.useEffect(() => {
    const selectedDate = parseInputDate(value);
    if (!selectedDate) return;
    setVisibleMonth(startOfMonth(selectedDate));
  }, [value]);

  React.useEffect(() => {
    if (!isCalendarOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!(event.target instanceof Node)) return;
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setIsCalendarOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsCalendarOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isCalendarOpen]);

  const handleToggleCalendar = React.useCallback(() => {
    if (disabled) return;
    setVisibleMonth(startOfMonth(parsedValue || today));
    setIsCalendarOpen((current) => !current);
  }, [disabled, parsedValue, today]);

  const handleSelectDate = React.useCallback(
    (nextDate: Date) => {
      if (disabled) return;
      const normalizedDate = startOfDay(nextDate);
      if (normalizedMinDate && normalizedDate.getTime() < normalizedMinDate.getTime()) {
        return;
      }

      const nextValue = toDateKey(normalizedDate);
      onChange(nextValue);
      setIsCalendarOpen(false);

      if (inputRef.current) {
        inputRef.current.value = nextValue;
      }
    },
    [disabled, normalizedMinDate, onChange]
  );

  const handleSelectToday = React.useCallback(() => {
    if (disabled) return;
    if (normalizedMinDate && today.getTime() < normalizedMinDate.getTime()) {
      return;
    }
    handleSelectDate(today);
  }, [disabled, handleSelectDate, normalizedMinDate, today]);

  const handleClearDate = React.useCallback(() => {
    if (disabled) return;
    onChange('');
    setIsCalendarOpen(false);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }, [disabled, onChange]);

  const monthLabel = React.useMemo(
    () =>
      new Intl.DateTimeFormat('pt-BR', {
        month: 'long',
        year: 'numeric',
      }).format(visibleMonth),
    [visibleMonth]
  );
  const monthCells = React.useMemo(() => buildMonthCells(visibleMonth), [visibleMonth]);
  const weekdayLabels = React.useMemo(
    () => ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'],
    []
  );

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={handleToggleCalendar}
        disabled={disabled}
        className={cn(
          'app-field flex h-11 w-full items-center justify-between gap-3 rounded-xl px-4 text-left text-sm transition',
          hasValue && 'app-field-filled',
          invalid && 'app-field-error',
          disabled && 'cursor-not-allowed opacity-70'
        )}
        aria-label={hasValue ? `Selecionar data, atual ${formatDisplayDate(value)}` : 'Selecionar data'}
        aria-expanded={isCalendarOpen}
      >
        <span className={cn('truncate font-medium', hasValue ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]')}>
          {hasValue ? formatDisplayDate(value) : placeholder}
        </span>
        <CalendarDays
          size={16}
          className={cn(
            'shrink-0 transition-colors',
            isCalendarOpen ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)]'
          )}
        />
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
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
      />

      {isCalendarOpen ? (
        <div className="absolute left-0 top-[calc(100%+0.6rem)] z-[80] w-[min(20rem,calc(100vw-2.2rem))] rounded-2xl border border-[color:color-mix(in_srgb,var(--accent)_20%,var(--border-default))] bg-[radial-gradient(circle_at_top,color-mix(in_srgb,var(--accent)_14%,transparent),transparent_52%),linear-gradient(180deg,color-mix(in_srgb,var(--bg-surface-elevated)_72%,transparent)_0%,color-mix(in_srgb,var(--bg-surface)_96%,transparent)_100%)] p-3 shadow-[0_22px_46px_-28px_color-mix(in_srgb,var(--bg-deep)_84%,transparent)] backdrop-blur-sm">
          <div className="mb-3 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setVisibleMonth((current) => addMonths(current, -1))}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-default)] bg-[color-mix(in_srgb,var(--bg-tertiary)_88%,transparent)] text-[var(--text-secondary)] transition hover:border-[color:color-mix(in_srgb,var(--accent)_34%,var(--border-default))] hover:text-[var(--text-primary)]"
              aria-label="Mês anterior"
            >
              <ChevronLeft size={14} />
            </button>

            <p className="text-sm font-semibold capitalize tracking-[0.01em] text-[var(--text-primary)]">
              {monthLabel}
            </p>

            <button
              type="button"
              onClick={() => setVisibleMonth((current) => addMonths(current, 1))}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-default)] bg-[color-mix(in_srgb,var(--bg-tertiary)_88%,transparent)] text-[var(--text-secondary)] transition hover:border-[color:color-mix(in_srgb,var(--accent)_34%,var(--border-default))] hover:text-[var(--text-primary)]"
              aria-label="Próximo mês"
            >
              <ChevronRight size={14} />
            </button>
          </div>

          <div className="mb-2 grid grid-cols-7 gap-1">
            {weekdayLabels.map((label) => (
              <span
                key={label}
                className="flex h-7 items-center justify-center text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--text-muted)]"
              >
                {label}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {monthCells.map((cell) => {
              const normalizedDay = startOfDay(cell.date);
              const blocked =
                disabled ||
                Boolean(
                  normalizedMinDate && normalizedDay.getTime() < normalizedMinDate.getTime()
                );
              const isSelected = Boolean(parsedValue && isSameDate(parsedValue, cell.date));
              const isToday = isSameDate(today, cell.date);

              return (
                <button
                  key={cell.key}
                  type="button"
                  disabled={blocked}
                  onClick={() => handleSelectDate(cell.date)}
                  className={cn(
                    'flex h-9 items-center justify-center rounded-lg border text-xs font-semibold transition',
                    'disabled:cursor-not-allowed disabled:opacity-45',
                    isSelected
                      ? 'border-[color:color-mix(in_srgb,var(--accent)_66%,transparent)] bg-[var(--accent)] text-white'
                      : 'border-transparent bg-[color-mix(in_srgb,var(--bg-tertiary)_72%,transparent)] text-[var(--text-secondary)] hover:border-[color:color-mix(in_srgb,var(--accent)_34%,var(--border-default))] hover:bg-[color-mix(in_srgb,var(--accent)_12%,var(--bg-tertiary))] hover:text-[var(--text-primary)]',
                    !cell.inCurrentMonth && !isSelected && 'opacity-55',
                    isToday &&
                      !isSelected &&
                      'border-[color:color-mix(in_srgb,var(--accent)_36%,transparent)] text-[var(--text-primary)]'
                  )}
                  aria-label={new Intl.DateTimeFormat('pt-BR', {
                    weekday: 'long',
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  }).format(cell.date)}
                >
                  {cell.date.getDate()}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-between gap-2 border-t border-[color:color-mix(in_srgb,var(--border-default)_76%,transparent)] pt-3">
            <button
              type="button"
              onClick={handleClearDate}
              disabled={disabled || !hasValue}
              className="rounded-lg border border-[var(--border-default)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--text-secondary)] transition hover:border-[color:color-mix(in_srgb,var(--accent)_30%,var(--border-default))] hover:text-[var(--text-primary)] disabled:opacity-45"
            >
              Limpar
            </button>
            <button
              type="button"
              onClick={handleSelectToday}
              disabled={disabled || Boolean(normalizedMinDate && today.getTime() < normalizedMinDate.getTime())}
              className="rounded-lg border border-[color:color-mix(in_srgb,var(--accent)_34%,var(--border-default))] bg-[color:color-mix(in_srgb,var(--accent-soft)_84%,var(--bg-tertiary))] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--text-primary)] transition hover:border-[color:color-mix(in_srgb,var(--accent)_48%,var(--border-default))] hover:bg-[color:color-mix(in_srgb,var(--accent-soft)_96%,var(--bg-tertiary))] disabled:opacity-45"
            >
              Hoje
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

