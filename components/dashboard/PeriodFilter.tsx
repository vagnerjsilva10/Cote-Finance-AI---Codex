'use client';

import * as React from 'react';
import { PeriodFilter as FinancePeriodFilter } from '@/components/finance/PeriodFilter';
import type { DateRangeSelection, PeriodPreset } from '@/lib/date/period-resolver';

type DashboardPeriodFilterValue = {
  period: PeriodPreset;
  startDate: string | null;
  endDate: string | null;
  label?: string | null;
};

type DashboardPeriodFilterProps = {
  value: DashboardPeriodFilterValue;
  loading?: boolean;
  onChange: (selection: DateRangeSelection) => void;
};

export function PeriodFilter({ value, loading = false, onChange }: DashboardPeriodFilterProps) {
  return <FinancePeriodFilter value={value} loading={loading} onChange={onChange} />;
}
