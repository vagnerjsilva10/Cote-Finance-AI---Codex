export const DASHBOARD_DEFAULT_TIMEZONE = 'America/Sao_Paulo';

export const DASHBOARD_PERIOD_QUERY_PARAM = 'period';
export const DASHBOARD_START_QUERY_PARAM = 'start';
export const DASHBOARD_END_QUERY_PARAM = 'end';
export const DASHBOARD_TIMEZONE_QUERY_PARAM = 'tz';

export const DASHBOARD_PERIOD_PRESETS = [
  'today',
  'last_7_days',
  'last_30_days',
  'this_month',
  'last_month',
  'last_90_days',
  'year_to_date',
  'custom',
] as const;

export type DashboardPeriodPreset = (typeof DASHBOARD_PERIOD_PRESETS)[number];

export type DashboardChartGranularity = 'hour' | 'day' | 'week';

export type DashboardPeriodSelection = {
  period: DashboardPeriodPreset;
  startDate: string | null;
  endDate: string | null;
  timeZone?: string | null;
};

export type DashboardResolvedDateRange = {
  period: DashboardPeriodPreset;
  start: Date;
  end: Date;
  startDate: string;
  endDate: string;
  totalDays: number;
  timeZone: string;
  label: string;
  granularity: DashboardChartGranularity;
  isCustom: boolean;
};

export type DashboardComparisonDateRange = {
  start: Date;
  end: Date;
  startDate: string;
  endDate: string;
  totalDays: number;
  timeZone: string;
  label: string;
};

const DATE_INPUT_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;

const PERIOD_SET = new Set<string>(DASHBOARD_PERIOD_PRESETS);

type DateRangeBounds = {
  start: Date;
  end: Date;
  startDate: string;
  endDate: string;
  totalDays: number;
};

function isValidTimeZone(value: string | null | undefined): value is string {
  if (!value || typeof value !== 'string') return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function normalizeTimeZone(timeZone: string | null | undefined) {
  return isValidTimeZone(timeZone) ? timeZone : DASHBOARD_DEFAULT_TIMEZONE;
}

function parsePeriodPreset(period: string | null | undefined): DashboardPeriodPreset {
  const normalized = String(period || 'this_month').trim().toLowerCase();
  if (PERIOD_SET.has(normalized)) {
    return normalized as DashboardPeriodPreset;
  }
  return 'this_month';
}

function parseDateParts(value: string) {
  const match = DATE_INPUT_REGEX.exec(String(value || '').trim());
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const utc = new Date(Date.UTC(year, month - 1, day));

  if (
    utc.getUTCFullYear() !== year ||
    utc.getUTCMonth() + 1 !== month ||
    utc.getUTCDate() !== day
  ) {
    return null;
  }

  return { year, month, day };
}

function pad2(value: number) {
  return String(value).padStart(2, '0');
}

function toDateKey(parts: { year: number; month: number; day: number }) {
  return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}`;
}

function parseDateKey(dateKey: string) {
  const parts = parseDateParts(dateKey);
  if (!parts) {
    throw new Error(`Invalid date key: ${dateKey}`);
  }
  return parts;
}

function dayDiffFromDateKeys(startDate: string, endDate: string) {
  const start = parseDateKey(startDate);
  const end = parseDateKey(endDate);
  const startMs = Date.UTC(start.year, start.month - 1, start.day);
  const endMs = Date.UTC(end.year, end.month - 1, end.day);
  return Math.floor((endMs - startMs) / 86_400_000);
}

function shiftDateKey(dateKey: string, dayOffset: number) {
  const { year, month, day } = parseDateKey(dateKey);
  const shifted = new Date(Date.UTC(year, month - 1, day + dayOffset));
  return toDateKey({
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  });
}

function toMonthStartDateKey(dateKey: string, monthOffset: number) {
  const { year, month } = parseDateKey(dateKey);
  const shifted = new Date(Date.UTC(year, month - 1 + monthOffset, 1));
  return toDateKey({
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: 1,
  });
}

function toMonthEndDateKey(monthStartDateKey: string) {
  const { year, month } = parseDateKey(monthStartDateKey);
  const shifted = new Date(Date.UTC(year, month, 0));
  return toDateKey({
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  });
}

function toYearStartDateKey(dateKey: string) {
  const { year } = parseDateKey(dateKey);
  return `${year}-01-01`;
}

function minDateKey(left: string, right: string) {
  return left <= right ? left : right;
}

export function getDatePartsInTimeZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const map = new Map(parts.map((part) => [part.type, part.value]));
  return {
    year: Number(map.get('year') || 0),
    month: Number(map.get('month') || 0),
    day: Number(map.get('day') || 0),
    hour: Number(map.get('hour') || 0),
    minute: Number(map.get('minute') || 0),
    second: Number(map.get('second') || 0),
  };
}

function getTimeZoneOffsetMs(date: Date, timeZone: string) {
  const zoned = getDatePartsInTimeZone(date, timeZone);
  const asUtc = Date.UTC(
    zoned.year,
    zoned.month - 1,
    zoned.day,
    zoned.hour,
    zoned.minute,
    zoned.second
  );
  return asUtc - date.getTime();
}

export function zonedDateTimeToUtc(input: {
  timeZone: string;
  year: number;
  month: number;
  day: number;
  hour?: number;
  minute?: number;
  second?: number;
  millisecond?: number;
}) {
  const guess = new Date(
    Date.UTC(
      input.year,
      input.month - 1,
      input.day,
      input.hour ?? 0,
      input.minute ?? 0,
      input.second ?? 0,
      input.millisecond ?? 0
    )
  );
  const offset = getTimeZoneOffsetMs(guess, input.timeZone);
  return new Date(guess.getTime() - offset);
}

function startOfDayInTimeZone(reference: Date, timeZone: string) {
  const zoned = getDatePartsInTimeZone(reference, timeZone);
  return zonedDateTimeToUtc({
    timeZone,
    year: zoned.year,
    month: zoned.month,
    day: zoned.day,
    hour: 0,
    minute: 0,
    second: 0,
    millisecond: 0,
  });
}

function endOfDayInTimeZone(reference: Date, timeZone: string) {
  const zoned = getDatePartsInTimeZone(reference, timeZone);
  const nextDayStart = zonedDateTimeToUtc({
    timeZone,
    year: zoned.year,
    month: zoned.month,
    day: zoned.day + 1,
    hour: 0,
    minute: 0,
    second: 0,
    millisecond: 0,
  });
  return new Date(nextDayStart.getTime() - 1);
}

function shiftDayStartInTimeZone(reference: Date, dayOffset: number, timeZone: string) {
  const zoned = getDatePartsInTimeZone(reference, timeZone);
  const shifted = new Date(Date.UTC(zoned.year, zoned.month - 1, zoned.day + dayOffset));
  return zonedDateTimeToUtc({
    timeZone,
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: 0,
    minute: 0,
    second: 0,
    millisecond: 0,
  });
}

function startOfMonthInTimeZone(reference: Date, timeZone: string, monthOffset = 0) {
  const zoned = getDatePartsInTimeZone(reference, timeZone);
  const shifted = new Date(Date.UTC(zoned.year, zoned.month - 1 + monthOffset, 1));
  return zonedDateTimeToUtc({
    timeZone,
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: 1,
    hour: 0,
    minute: 0,
    second: 0,
    millisecond: 0,
  });
}

function endOfMonthInTimeZone(reference: Date, timeZone: string, monthOffset = 0) {
  const monthStart = startOfMonthInTimeZone(reference, timeZone, monthOffset);
  const nextMonthStart = startOfMonthInTimeZone(reference, timeZone, monthOffset + 1);
  if (nextMonthStart.getTime() <= monthStart.getTime()) return endOfDayInTimeZone(reference, timeZone);
  return new Date(nextMonthStart.getTime() - 1);
}

function startOfYearInTimeZone(reference: Date, timeZone: string) {
  const zoned = getDatePartsInTimeZone(reference, timeZone);
  return zonedDateTimeToUtc({
    timeZone,
    year: zoned.year,
    month: 1,
    day: 1,
    hour: 0,
    minute: 0,
    second: 0,
    millisecond: 0,
  });
}

export function toDateKeyInTimeZone(date: Date, timeZone: string) {
  const zoned = getDatePartsInTimeZone(date, timeZone);
  return toDateKey({
    year: zoned.year,
    month: zoned.month,
    day: zoned.day,
  });
}

export function normalizeDateRange(input: {
  startDate: string | null | undefined;
  endDate: string | null | undefined;
  timeZone?: string | null;
}): DateRangeBounds | null {
  const startParts = input.startDate ? parseDateParts(input.startDate) : null;
  const endParts = input.endDate ? parseDateParts(input.endDate) : null;
  if (!startParts || !endParts) return null;

  const timeZone = normalizeTimeZone(input.timeZone);
  const rawStartDate = toDateKey(startParts);
  const rawEndDate = toDateKey(endParts);
  const startDate = rawStartDate <= rawEndDate ? rawStartDate : rawEndDate;
  const endDate = rawStartDate <= rawEndDate ? rawEndDate : rawStartDate;

  const start = zonedDateTimeToUtc({
    timeZone,
    year: parseDateKey(startDate).year,
    month: parseDateKey(startDate).month,
    day: parseDateKey(startDate).day,
    hour: 0,
    minute: 0,
    second: 0,
    millisecond: 0,
  });
  const end = zonedDateTimeToUtc({
    timeZone,
    year: parseDateKey(endDate).year,
    month: parseDateKey(endDate).month,
    day: parseDateKey(endDate).day + 1,
    hour: 0,
    minute: 0,
    second: 0,
    millisecond: 0,
  });

  return {
    start,
    end: new Date(end.getTime() - 1),
    startDate,
    endDate,
    totalDays: dayDiffFromDateKeys(startDate, endDate) + 1,
  };
}

function formatDateKey(dateKey: string) {
  const { year, month, day } = parseDateKey(dateKey);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.toLocaleDateString('pt-BR');
}

export function getRangeLabel(range: {
  period: DashboardPeriodPreset;
  startDate: string;
  endDate: string;
}) {
  if (range.period === 'today') return 'Hoje';
  if (range.period === 'last_7_days') return 'Últimos 7 dias';
  if (range.period === 'last_30_days') return 'Últimos 30 dias';
  if (range.period === 'this_month') return 'Este mês';
  if (range.period === 'last_month') return 'Mês passado';
  if (range.period === 'last_90_days') return 'Últimos 90 dias';
  if (range.period === 'year_to_date') return 'Ano atual';
  return `${formatDateKey(range.startDate)} - ${formatDateKey(range.endDate)}`;
}

function resolveGranularity(range: DateRangeBounds, period: DashboardPeriodPreset): DashboardChartGranularity {
  if (period === 'today' && range.totalDays <= 1) return 'hour';
  if (range.totalDays > 120) return 'week';
  return 'day';
}

export function resolveDashboardDateRange(input: {
  period?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  timeZone?: string | null;
  now?: Date;
}): DashboardResolvedDateRange {
  const now = input.now ?? new Date();
  const timeZone = normalizeTimeZone(input.timeZone);
  const requestedPeriod = parsePeriodPreset(input.period);

  const todayStart = startOfDayInTimeZone(now, timeZone);
  const todayEnd = endOfDayInTimeZone(now, timeZone);

  let period: DashboardPeriodPreset = requestedPeriod;
  let bounds: DateRangeBounds | null = null;

  if (requestedPeriod === 'custom') {
    bounds = normalizeDateRange({
      startDate: input.startDate,
      endDate: input.endDate,
      timeZone,
    });
    if (!bounds) {
      period = 'this_month';
    }
  }

  if (!bounds) {
    if (period === 'today') {
      const startDate = toDateKeyInTimeZone(todayStart, timeZone);
      const endDate = startDate;
      bounds = {
        start: todayStart,
        end: todayEnd,
        startDate,
        endDate,
        totalDays: 1,
      };
    } else if (period === 'last_7_days') {
      const start = shiftDayStartInTimeZone(now, -6, timeZone);
      const startDate = toDateKeyInTimeZone(start, timeZone);
      const endDate = toDateKeyInTimeZone(todayEnd, timeZone);
      bounds = {
        start,
        end: todayEnd,
        startDate,
        endDate,
        totalDays: dayDiffFromDateKeys(startDate, endDate) + 1,
      };
    } else if (period === 'last_30_days') {
      const start = shiftDayStartInTimeZone(now, -29, timeZone);
      const startDate = toDateKeyInTimeZone(start, timeZone);
      const endDate = toDateKeyInTimeZone(todayEnd, timeZone);
      bounds = {
        start,
        end: todayEnd,
        startDate,
        endDate,
        totalDays: dayDiffFromDateKeys(startDate, endDate) + 1,
      };
    } else if (period === 'last_90_days') {
      const start = shiftDayStartInTimeZone(now, -89, timeZone);
      const startDate = toDateKeyInTimeZone(start, timeZone);
      const endDate = toDateKeyInTimeZone(todayEnd, timeZone);
      bounds = {
        start,
        end: todayEnd,
        startDate,
        endDate,
        totalDays: dayDiffFromDateKeys(startDate, endDate) + 1,
      };
    } else if (period === 'last_month') {
      const start = startOfMonthInTimeZone(now, timeZone, -1);
      const end = endOfMonthInTimeZone(now, timeZone, -1);
      const startDate = toDateKeyInTimeZone(start, timeZone);
      const endDate = toDateKeyInTimeZone(end, timeZone);
      bounds = {
        start,
        end,
        startDate,
        endDate,
        totalDays: dayDiffFromDateKeys(startDate, endDate) + 1,
      };
    } else if (period === 'year_to_date') {
      const start = startOfYearInTimeZone(now, timeZone);
      const startDate = toDateKeyInTimeZone(start, timeZone);
      const endDate = toDateKeyInTimeZone(todayEnd, timeZone);
      bounds = {
        start,
        end: todayEnd,
        startDate,
        endDate,
        totalDays: dayDiffFromDateKeys(startDate, endDate) + 1,
      };
    } else {
      period = 'this_month';
      const start = startOfMonthInTimeZone(now, timeZone, 0);
      const startDate = toDateKeyInTimeZone(start, timeZone);
      const endDate = toDateKeyInTimeZone(todayEnd, timeZone);
      bounds = {
        start,
        end: todayEnd,
        startDate,
        endDate,
        totalDays: dayDiffFromDateKeys(startDate, endDate) + 1,
      };
    }
  }

  return {
    period,
    start: bounds.start,
    end: bounds.end,
    startDate: bounds.startDate,
    endDate: bounds.endDate,
    totalDays: Math.max(1, bounds.totalDays),
    timeZone,
    label: getRangeLabel({
      period,
      startDate: bounds.startDate,
      endDate: bounds.endDate,
    }),
    granularity: resolveGranularity(bounds, period),
    isCustom: period === 'custom',
  };
}

function buildComparisonRange(params: {
  startDate: string;
  endDate: string;
  label: string;
  timeZone: string;
}): DashboardComparisonDateRange {
  const bounds = normalizeDateRange({
    startDate: params.startDate,
    endDate: params.endDate,
    timeZone: params.timeZone,
  });
  if (!bounds) {
    throw new Error('Invalid comparison date range');
  }

  return {
    ...bounds,
    timeZone: params.timeZone,
    label: params.label,
  };
}

export function getComparisonDateRange(range: DashboardResolvedDateRange): DashboardComparisonDateRange {
  const sameLengthPreviousEnd = shiftDateKey(range.startDate, -1);
  const sameLengthPreviousStart = shiftDateKey(sameLengthPreviousEnd, -(range.totalDays - 1));

  if (range.period === 'today') {
    const yesterday = shiftDateKey(range.startDate, -1);
    return buildComparisonRange({
      startDate: yesterday,
      endDate: yesterday,
      label: 'Comparado com ontem',
      timeZone: range.timeZone,
    });
  }

  if (range.period === 'this_month') {
    const previousMonthStart = toMonthStartDateKey(range.startDate, -1);
    const previousMonthEnd = toMonthEndDateKey(previousMonthStart);
    const alignedEnd = minDateKey(
      shiftDateKey(previousMonthStart, range.totalDays - 1),
      previousMonthEnd
    );
    return buildComparisonRange({
      startDate: previousMonthStart,
      endDate: alignedEnd,
      label: 'Comparado ao mesmo ritmo do mês anterior',
      timeZone: range.timeZone,
    });
  }

  if (range.period === 'last_month') {
    const previousMonthStart = toMonthStartDateKey(range.startDate, -1);
    return buildComparisonRange({
      startDate: previousMonthStart,
      endDate: toMonthEndDateKey(previousMonthStart),
      label: 'Comparado ao mês anterior',
      timeZone: range.timeZone,
    });
  }

  if (range.period === 'year_to_date') {
    const currentYearStart = toYearStartDateKey(range.startDate);
    const previousYearStart = toMonthStartDateKey(currentYearStart, -12);
    return buildComparisonRange({
      startDate: previousYearStart,
      endDate: shiftDateKey(previousYearStart, range.totalDays - 1),
      label: 'Comparado ao mesmo período do ano anterior',
      timeZone: range.timeZone,
    });
  }

  return buildComparisonRange({
    startDate: sameLengthPreviousStart,
    endDate: sameLengthPreviousEnd,
    label: 'Comparado ao período anterior equivalente',
    timeZone: range.timeZone,
  });
}

function toWeekStartDateKey(dateKey: string) {
  const { year, month, day } = parseDateKey(dateKey);
  const date = new Date(Date.UTC(year, month - 1, day));
  const dayOfWeek = date.getUTCDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  date.setUTCDate(date.getUTCDate() + diff);
  return toDateKey({
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  });
}

export function listDashboardBucketKeys(range: DashboardResolvedDateRange) {
  if (range.granularity === 'hour') {
    return Array.from({ length: 24 }, (_, index) => {
      return `${range.startDate}T${pad2(index)}:00:00`;
    });
  }

  if (range.granularity === 'week') {
    const keys: string[] = [];
    let cursor = toWeekStartDateKey(range.startDate);

    while (cursor <= range.endDate) {
      keys.push(cursor);
      cursor = shiftDateKey(cursor, 7);
    }

    return keys;
  }

  const keys: string[] = [];
  let cursor = range.startDate;
  while (cursor <= range.endDate) {
    keys.push(cursor);
    cursor = shiftDateKey(cursor, 1);
  }
  return keys;
}

export function parseDashboardPeriodSelectionFromSearchParams(
  searchParams: URLSearchParams
): DashboardPeriodSelection {
  const period = parsePeriodPreset(searchParams.get(DASHBOARD_PERIOD_QUERY_PARAM));
  const startDate = searchParams.get(DASHBOARD_START_QUERY_PARAM);
  const endDate = searchParams.get(DASHBOARD_END_QUERY_PARAM);
  const timeZone = searchParams.get(DASHBOARD_TIMEZONE_QUERY_PARAM);

  return {
    period,
    startDate: period === 'custom' ? (parseDateParts(String(startDate || '')) ? String(startDate) : null) : null,
    endDate: period === 'custom' ? (parseDateParts(String(endDate || '')) ? String(endDate) : null) : null,
    timeZone: normalizeTimeZone(timeZone),
  };
}

export function applyDashboardPeriodSelectionToSearchParams(
  searchParams: URLSearchParams,
  selection: DashboardPeriodSelection
) {
  const period = parsePeriodPreset(selection.period);
  searchParams.set(DASHBOARD_PERIOD_QUERY_PARAM, period);

  if (period === 'custom' && selection.startDate && selection.endDate) {
    searchParams.set(DASHBOARD_START_QUERY_PARAM, selection.startDate);
    searchParams.set(DASHBOARD_END_QUERY_PARAM, selection.endDate);
  } else {
    searchParams.delete(DASHBOARD_START_QUERY_PARAM);
    searchParams.delete(DASHBOARD_END_QUERY_PARAM);
  }

  const timeZone = normalizeTimeZone(selection.timeZone || null);
  if (timeZone) {
    searchParams.set(DASHBOARD_TIMEZONE_QUERY_PARAM, timeZone);
  } else {
    searchParams.delete(DASHBOARD_TIMEZONE_QUERY_PARAM);
  }
}
