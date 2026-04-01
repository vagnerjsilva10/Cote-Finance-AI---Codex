import {
  applyDashboardPeriodSelectionToSearchParams,
  getComparisonDateRange,
  getDatePartsInTimeZone,
  getRangeLabel,
  listDashboardBucketKeys,
  normalizeDateRange as normalizeDashboardDateRange,
  parseDashboardPeriodSelectionFromSearchParams,
  resolveDashboardDateRange,
  toDateKeyInTimeZone,
  zonedDateTimeToUtc,
  type DashboardChartGranularity,
} from '../dashboard/date-range';

export const DEFAULT_TIMEZONE = 'America/Sao_Paulo';

export const PERIOD_QUERY_PARAM = 'period';
export const START_QUERY_PARAM = 'start';
export const END_QUERY_PARAM = 'end';
export const TIMEZONE_QUERY_PARAM = 'tz';

export const PERIOD_PRESETS = [
  'today',
  'last_7_days',
  'last_30_days',
  'this_month',
  'last_month',
  'last_90_days',
  'this_year',
  'custom',
] as const;

export type PeriodPreset = (typeof PERIOD_PRESETS)[number];
export type DateRangeGranularity = DashboardChartGranularity;

export type DateRangeSelection = {
  period: PeriodPreset;
  startDate: string | null;
  endDate: string | null;
  timeZone?: string | null;
};

export type ResolvedDateRange = {
  period: PeriodPreset;
  start: Date;
  end: Date;
  startDate: string;
  endDate: string;
  totalDays: number;
  timeZone: string;
  label: string;
  granularity: DateRangeGranularity;
  isCustom: boolean;
};

export type ComparisonDateRange = {
  start: Date;
  end: Date;
  startDate: string;
  endDate: string;
  totalDays: number;
  timeZone: string;
  label: string;
};

const PERIOD_SET = new Set<string>(PERIOD_PRESETS);

function mapPeriodToDashboard(period: PeriodPreset | string | null | undefined) {
  const normalized = String(period || 'this_month').trim().toLowerCase();
  if (normalized === 'this_year') return 'year_to_date';
  if (normalized === 'year_to_date') return 'year_to_date';
  if (PERIOD_SET.has(normalized)) return normalized as PeriodPreset;
  return 'this_month';
}

function mapPeriodFromDashboard(period: string | null | undefined): PeriodPreset {
  if (period === 'year_to_date') return 'this_year';
  if (PERIOD_SET.has(String(period || ''))) {
    return String(period) as PeriodPreset;
  }
  return 'this_month';
}

function normalizePreset(period: string | null | undefined): PeriodPreset {
  const normalized = String(period || 'this_month').trim().toLowerCase();
  if (normalized === 'year_to_date') return 'this_year';
  if (PERIOD_SET.has(normalized)) return normalized as PeriodPreset;
  return 'this_month';
}

export function normalizeDateRange(
  startDate: string | null | undefined,
  endDate: string | null | undefined,
  timeZone?: string | null
) {
  return normalizeDashboardDateRange({
    startDate,
    endDate,
    timeZone,
  });
}

export function getPeriodLabel(period: PeriodPreset) {
  if (period === 'today') return 'Hoje';
  if (period === 'last_7_days') return 'Últimos 7 dias';
  if (period === 'last_30_days') return 'Últimos 30 dias';
  if (period === 'this_month') return 'Este mês';
  if (period === 'last_month') return 'Mês passado';
  if (period === 'last_90_days') return 'Últimos 90 dias';
  if (period === 'this_year') return 'Ano atual';
  return 'Personalizado';
}

export function resolveDateRange(input: {
  period?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  start?: string | null;
  end?: string | null;
  timeZone?: string | null;
  now?: Date;
}): ResolvedDateRange {
  const dashboardRange = resolveDashboardDateRange({
    period: mapPeriodToDashboard(input.period),
    startDate: input.startDate ?? input.start ?? null,
    endDate: input.endDate ?? input.end ?? null,
    timeZone: input.timeZone ?? DEFAULT_TIMEZONE,
    now: input.now,
  });

  return {
    period: mapPeriodFromDashboard(dashboardRange.period),
    start: dashboardRange.start,
    end: dashboardRange.end,
    startDate: dashboardRange.startDate,
    endDate: dashboardRange.endDate,
    totalDays: dashboardRange.totalDays,
    timeZone: dashboardRange.timeZone,
    label: dashboardRange.label,
    granularity: dashboardRange.granularity,
    isCustom: dashboardRange.isCustom,
  };
}

export function getComparisonRange(range: ResolvedDateRange): ComparisonDateRange {
  const dashboardComparison = getComparisonDateRange({
    period: mapPeriodToDashboard(range.period),
    start: range.start,
    end: range.end,
    startDate: range.startDate,
    endDate: range.endDate,
    totalDays: range.totalDays,
    timeZone: range.timeZone,
    label: getRangeLabel({
      period: mapPeriodToDashboard(range.period),
      startDate: range.startDate,
      endDate: range.endDate,
    }),
    granularity: range.granularity,
    isCustom: range.period === 'custom',
  });

  return {
    start: dashboardComparison.start,
    end: dashboardComparison.end,
    startDate: dashboardComparison.startDate,
    endDate: dashboardComparison.endDate,
    totalDays: dashboardComparison.totalDays,
    timeZone: dashboardComparison.timeZone,
    label: dashboardComparison.label,
  };
}

export function listRangeBucketKeys(range: ResolvedDateRange) {
  return listDashboardBucketKeys({
    period: mapPeriodToDashboard(range.period),
    start: range.start,
    end: range.end,
    startDate: range.startDate,
    endDate: range.endDate,
    totalDays: range.totalDays,
    timeZone: range.timeZone,
    label: range.label,
    granularity: range.granularity,
    isCustom: range.period === 'custom',
  });
}

export function parsePeriodSelectionFromSearchParams(searchParams: URLSearchParams): DateRangeSelection {
  const dashboardSelection = parseDashboardPeriodSelectionFromSearchParams(searchParams);
  const customStart = searchParams.get(START_QUERY_PARAM) ?? searchParams.get('startDate');
  const customEnd = searchParams.get(END_QUERY_PARAM) ?? searchParams.get('endDate');
  const hasExplicitCustomRange = Boolean(customStart && customEnd);
  const period = hasExplicitCustomRange
    ? 'custom'
    : mapPeriodFromDashboard(dashboardSelection.period);

  return {
    period,
    startDate: period === 'custom' ? customStart : null,
    endDate: period === 'custom' ? customEnd : null,
    timeZone: dashboardSelection.timeZone,
  };
}

export function applyPeriodSelectionToSearchParams(
  searchParams: URLSearchParams,
  selection: DateRangeSelection
) {
  const normalizedPeriod = normalizePreset(selection.period);
  applyDashboardPeriodSelectionToSearchParams(searchParams, {
    period: mapPeriodToDashboard(normalizedPeriod),
    startDate: selection.startDate,
    endDate: selection.endDate,
    timeZone: selection.timeZone ?? DEFAULT_TIMEZONE,
  });

  searchParams.delete('startDate');
  searchParams.delete('endDate');
}

export function isPeriodPreset(value: unknown): value is PeriodPreset {
  return PERIOD_SET.has(String(value || '').trim().toLowerCase());
}

export { getDatePartsInTimeZone, toDateKeyInTimeZone, zonedDateTimeToUtc };
