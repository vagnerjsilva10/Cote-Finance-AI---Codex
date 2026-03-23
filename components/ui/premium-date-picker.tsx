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
  'data-testid'?: string;
};

const WEEKDAY_LABELS = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];

function parseInputDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || '').trim());
  if (!match) return null;
  const parsed = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toInputDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
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

function buildCalendarDays(cursor: Date) {
  const firstDay = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const lastDay = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const days = [];

  for (let index = startOffset; index > 0; index -= 1) {
    const date = new Date(firstDay);
    date.setDate(firstDay.getDate() - index);
    days.push({ key: `prev-${toInputDate(date)}`, date, currentMonth: false });
  }

  for (let day = 1; day <= lastDay.getDate(); day += 1) {
    const date = new Date(cursor.getFullYear(), cursor.getMonth(), day);
    days.push({ key: `curr-${toInputDate(date)}`, date, currentMonth: true });
  }

  let trailing = 1;
  while (days.length % 7 !== 0) {
    const date = new Date(lastDay);
    date.setDate(lastDay.getDate() + trailing);
    trailing += 1;
    days.push({ key: `next-${toInputDate(date)}`, date, currentMonth: false });
  }

  return days;
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
  const selectedDate = React.useMemo(() => parseInputDate(value), [value]);
  const minDate = React.useMemo(() => parseInputDate(min || ''), [min]);
  const [isOpen, setIsOpen] = React.useState(false);
  const [monthCursor, setMonthCursor] = React.useState<Date>(() => selectedDate ?? new Date());
  const rootRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (selectedDate) {
      setMonthCursor(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
    }
  }, [selectedDate]);

  React.useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const days = React.useMemo(() => buildCalendarDays(monthCursor), [monthCursor]);

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        id={id}
        type="button"
        data-testid={dataTestId}
        onClick={() => !disabled && setIsOpen((current) => !current)}
        disabled={disabled}
        className={cn(
          'app-field flex w-full items-center justify-between rounded-xl px-4 py-2.5 text-left text-sm transition',
          disabled && 'cursor-not-allowed opacity-70',
          value ? 'app-field-filled text-[var(--text-primary)]' : 'text-[var(--text-muted)]'
        )}
      >
        <span>{value ? formatDisplayDate(value) : placeholder}</span>
        <CalendarDays size={16} className="text-[var(--text-secondary)]" />
      </button>

      {isOpen ? (
        <div className="absolute left-0 top-[calc(100%+0.55rem)] z-[140] w-full min-w-[18rem] rounded-2xl border border-[var(--border-default)] bg-[linear-gradient(180deg,rgba(255,255,255,0.03)_0%,rgba(255,255,255,0)_100%),var(--bg-surface)] p-3 shadow-[0_26px_70px_-35px_rgba(2,6,23,0.92)] backdrop-blur-xl">
          <div className="mb-3 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setMonthCursor((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border-default)] bg-[rgba(255,255,255,0.03)] text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
            >
              <ChevronLeft size={16} />
            </button>
            <p className="text-sm font-semibold capitalize text-[var(--text-primary)]">
              {new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(monthCursor)}
            </p>
            <button
              type="button"
              onClick={() => setMonthCursor((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border-default)] bg-[rgba(255,255,255,0.03)] text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] font-black uppercase tracking-[0.16em] text-[var(--text-muted)]">
            {WEEKDAY_LABELS.map((label, index) => (
              <span key={`${label}-${index}`}>{label}</span>
            ))}
          </div>

          <div className="mt-2 grid grid-cols-7 gap-1.5">
            {days.map((day) => {
              const isoValue = toInputDate(day.date);
              const isSelected = value === isoValue;
              const isDisabled = Boolean(minDate && day.date.getTime() < minDate.getTime());

              return (
                <button
                  key={day.key}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => {
                    onChange(isoValue);
                    setIsOpen(false);
                  }}
                  className={cn(
                    'inline-flex h-10 items-center justify-center rounded-xl text-sm font-semibold transition',
                    day.currentMonth ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]',
                    !isSelected && !isDisabled && 'bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(79,140,255,0.08)] hover:text-[var(--text-primary)]',
                    isSelected && 'bg-[rgba(79,140,255,0.16)] text-[var(--text-primary)] ring-1 ring-[rgba(79,140,255,0.34)]',
                    isDisabled && 'cursor-not-allowed opacity-35'
                  )}
                >
                  {day.date.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
