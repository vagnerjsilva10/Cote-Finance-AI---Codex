'use client';

import * as React from 'react';
import type { DateRangeSelection, PeriodPreset } from '@/lib/date/period-resolver';
import { DateRangePicker } from '@/components/finance/DateRangePicker';
import { cn } from '@/lib/utils';

type PeriodFilterValue = {
  period: PeriodPreset;
  startDate: string | null;
  endDate: string | null;
  label?: string | null;
};

type PeriodFilterProps = {
  value: PeriodFilterValue;
  loading?: boolean;
  onChange: (selection: DateRangeSelection) => void;
  compactLabels?: boolean;
};

const PERIOD_OPTIONS: Array<{ key: PeriodPreset; label: string; compact: string }> = [
  { key: 'today', label: 'Hoje', compact: 'Hoje' },
  { key: 'last_7_days', label: '7 dias', compact: '7D' },
  { key: 'last_30_days', label: '30 dias', compact: '30D' },
  { key: 'this_month', label: 'Este mês', compact: 'Este mês' },
  { key: 'last_month', label: 'Mês passado', compact: 'Mês passado' },
  { key: 'last_90_days', label: '90 dias', compact: '90D' },
  { key: 'this_year', label: 'Ano atual', compact: 'Ano' },
  { key: 'custom', label: 'Personalizado', compact: 'Custom' },
];

function getBrowserTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo';
  } catch {
    return 'America/Sao_Paulo';
  }
}

export function PeriodFilter({
  value,
  loading = false,
  onChange,
  compactLabels = false,
}: PeriodFilterProps) {
  const [isCustomOpen, setIsCustomOpen] = React.useState(value.period === 'custom');

  React.useEffect(() => {
    if (value.period === 'custom') {
      setIsCustomOpen(true);
    }
  }, [value.period]);

  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {PERIOD_OPTIONS.map((option) => {
          const isActive = value.period === option.key;

          return (
            <button
              key={option.key}
              type="button"
              disabled={loading}
              onClick={() => {
                if (option.key === 'custom') {
                  setIsCustomOpen((current) => !current || value.period !== 'custom');
                  return;
                }

                setIsCustomOpen(false);
                onChange({
                  period: option.key,
                  startDate: null,
                  endDate: null,
                  timeZone: getBrowserTimeZone(),
                });
              }}
              className={cn(
                'rounded-full border px-3 py-1.5 text-xs font-semibold transition-all',
                'disabled:cursor-not-allowed disabled:opacity-60',
                isActive
                  ? 'border-[color:var(--accent)] bg-[color:var(--accent-soft)] text-[var(--text-primary)]'
                  : 'border-[var(--border-default)] bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              )}
            >
              {compactLabels ? option.compact : option.label}
            </button>
          );
        })}
      </div>

      {isCustomOpen ? (
        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-tertiary)] p-3">
          <DateRangePicker
            startDate={value.startDate}
            endDate={value.endDate}
            disabled={loading}
            onApply={({ startDate, endDate }) => {
              onChange({
                period: 'custom',
                startDate,
                endDate,
                timeZone: getBrowserTimeZone(),
              });
            }}
          />
        </div>
      ) : null}

      <p className="text-xs text-[var(--text-muted)]">
        {value.label ? `Período atual: ${value.label}` : 'Selecione um período para analisar suas movimentações.'}
      </p>
    </section>
  );
}
