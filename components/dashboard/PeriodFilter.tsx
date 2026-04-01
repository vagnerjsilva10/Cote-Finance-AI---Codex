'use client';

import * as React from 'react';
import type { DashboardPeriodPreset, DashboardPeriodSelection } from '@/lib/dashboard/date-range';
import { DateRangePicker } from '@/components/dashboard/DateRangePicker';
import { cn } from '@/lib/utils';

type DashboardPeriodFilterValue = {
  period: DashboardPeriodPreset;
  startDate: string | null;
  endDate: string | null;
  label?: string | null;
};

type DashboardPeriodFilterProps = {
  value: DashboardPeriodFilterValue;
  loading?: boolean;
  onChange: (selection: DashboardPeriodSelection) => void;
};

const PERIOD_OPTIONS: Array<{ key: DashboardPeriodPreset; label: string }> = [
  { key: 'today', label: 'Hoje' },
  { key: 'last_7_days', label: '7 dias' },
  { key: 'last_30_days', label: '30 dias' },
  { key: 'this_month', label: 'Este mes' },
  { key: 'last_month', label: 'Mes passado' },
  { key: 'last_90_days', label: '90 dias' },
  { key: 'year_to_date', label: 'Ano atual' },
  { key: 'custom', label: 'Personalizado' },
];

function getBrowserTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo';
  } catch {
    return 'America/Sao_Paulo';
  }
}

export function PeriodFilter({ value, loading = false, onChange }: DashboardPeriodFilterProps) {
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
              {option.label}
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
        {value.label ? `Periodo atual: ${value.label}` : 'Selecione um periodo para analisar suas movimentacoes.'}
      </p>
    </section>
  );
}
