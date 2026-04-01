'use client';

import * as React from 'react';
import { PremiumDatePicker } from '@/components/ui/premium-date-picker';
import { cn } from '@/lib/utils';

type DateRangePickerProps = {
  startDate: string | null;
  endDate: string | null;
  disabled?: boolean;
  onApply: (value: { startDate: string; endDate: string }) => void;
};

function isValidDateInput(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || '').trim());
}

export function DateRangePicker({
  startDate,
  endDate,
  disabled = false,
  onApply,
}: DateRangePickerProps) {
  const [draftStartDate, setDraftStartDate] = React.useState(startDate || '');
  const [draftEndDate, setDraftEndDate] = React.useState(endDate || '');

  React.useEffect(() => {
    setDraftStartDate(startDate || '');
  }, [startDate]);

  React.useEffect(() => {
    setDraftEndDate(endDate || '');
  }, [endDate]);

  const hasBothDates =
    isValidDateInput(draftStartDate) && isValidDateInput(draftEndDate);
  const hasRangeOrderError =
    hasBothDates && new Date(draftStartDate).getTime() > new Date(draftEndDate).getTime();

  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        <PremiumDatePicker
          value={draftStartDate}
          onChange={setDraftStartDate}
          disabled={disabled}
          placeholder="Data inicial"
          invalid={hasRangeOrderError}
        />
        <PremiumDatePicker
          value={draftEndDate}
          onChange={setDraftEndDate}
          disabled={disabled}
          placeholder="Data final"
          min={draftStartDate || undefined}
          invalid={hasRangeOrderError}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={disabled || !hasBothDates || hasRangeOrderError}
          onClick={() =>
            onApply({
              startDate: draftStartDate,
              endDate: draftEndDate,
            })
          }
          className={cn(
            'app-button-primary rounded-lg px-3 py-1.5 text-xs font-semibold',
            'disabled:cursor-not-allowed disabled:opacity-60'
          )}
        >
          Aplicar intervalo
        </button>
        {hasRangeOrderError ? (
          <p className="text-xs text-[var(--danger)]">
            A data final precisa ser maior ou igual a data inicial.
          </p>
        ) : null}
      </div>
    </div>
  );
}
