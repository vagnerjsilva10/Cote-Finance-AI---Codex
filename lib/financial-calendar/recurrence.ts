import type {
  FinancialCalendarOccurrence,
  FinancialEventRecurrence,
  FinancialEventStatus,
  FinancialEventType,
} from '@/lib/financial-calendar/types';

type ExpandRecurringOccurrencesParams = {
  event: {
    id: string;
    user_id: string | null;
    title: string;
    description: string | null;
    type: string;
    amount: unknown;
    category: string | null;
    date: Date;
    end_date: Date | null;
    recurrence: string;
    recurrence_interval: number;
    is_recurring: boolean;
    status: string;
    source_type: string;
    source_id: string | null;
    reminder_enabled: boolean;
    reminder_days_before: number;
    color_token: string | null;
    created_at: Date;
    updated_at: Date;
  };
  rangeStart: Date;
  rangeEnd: Date;
  now: Date;
  overridesByDateKey?: Map<
    string,
    {
      title: string | null;
      description: string | null;
      amount: unknown;
      status: string | null;
      reminder_enabled: boolean | null;
      reminder_days_before: number | null;
      is_deleted: boolean;
      updated_at: Date;
    }
  >;
  flowResolver: (type: FinancialEventType) => 'in' | 'out' | 'neutral';
};

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function endOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function clampDay(year: number, month: number, day: number) {
  const lastDay = new Date(year, month + 1, 0).getDate();
  return Math.max(1, Math.min(day, lastDay));
}

function addDays(date: Date, count: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + count);
}

function addMonths(date: Date, count: number, anchorDay: number) {
  const next = new Date(date.getFullYear(), date.getMonth() + count, 1);
  return new Date(next.getFullYear(), next.getMonth(), clampDay(next.getFullYear(), next.getMonth(), anchorDay));
}

function addYears(date: Date, count: number, anchorDay: number) {
  const next = new Date(date.getFullYear() + count, date.getMonth(), 1);
  return new Date(next.getFullYear(), next.getMonth(), clampDay(next.getFullYear(), next.getMonth(), anchorDay));
}

function normalizeRecurrence(value: string): FinancialEventRecurrence {
  const normalized = String(value || 'NONE').trim().toUpperCase();
  if (normalized === 'DAILY' || normalized === 'WEEKLY' || normalized === 'MONTHLY' || normalized === 'YEARLY') {
    return normalized;
  }
  return 'NONE';
}

function normalizeStatus(value: string): FinancialEventStatus {
  const normalized = String(value || 'PENDING').trim().toUpperCase();
  if (normalized === 'PAID' || normalized === 'RECEIVED' || normalized === 'OVERDUE' || normalized === 'CANCELED') {
    return normalized;
  }
  return 'PENDING';
}

function normalizeType(value: string): FinancialEventType {
  const normalized = String(value || 'FINANCIAL_REMINDER').trim().toUpperCase();
  if (
    normalized === 'FIXED_BILL' ||
    normalized === 'EXPECTED_INCOME' ||
    normalized === 'CARD_BILL' ||
    normalized === 'INSTALLMENT' ||
    normalized === 'SUBSCRIPTION' ||
    normalized === 'GOAL_DEADLINE' ||
    normalized === 'FINANCIAL_REMINDER' ||
    normalized === 'MANUAL_ALERT'
  ) {
    return normalized;
  }
  return 'FINANCIAL_REMINDER';
}

function normalizeSourceType(value: string) {
  const normalized = String(value || 'MANUAL').trim().toUpperCase();
  if (
    normalized === 'EXPENSE' ||
    normalized === 'INCOME' ||
    normalized === 'GOAL' ||
    normalized === 'SUBSCRIPTION' ||
    normalized === 'INSTALLMENT' ||
    normalized === 'CARD_BILL' ||
    normalized === 'SYSTEM'
  ) {
    return normalized;
  }
  return 'MANUAL';
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function buildOccurrence(
  params: ExpandRecurringOccurrencesParams,
  occurrenceDate: Date
): FinancialCalendarOccurrence | null {
  const type = normalizeType(params.event.type);
  const dateKey = toDateKey(occurrenceDate);
  const override = params.overridesByDateKey?.get(dateKey);

  if (override?.is_deleted) {
    return null;
  }

  const baseStatus = normalizeStatus(override?.status || params.event.status);
  const flow = params.flowResolver(type);
  const isTerminal = baseStatus === 'PAID' || baseStatus === 'RECEIVED' || baseStatus === 'CANCELED';
  const resolvedStatus =
    !isTerminal && startOfDay(occurrenceDate) < startOfDay(params.now) ? 'OVERDUE' : baseStatus;

  return {
    id: `${params.event.id}:${dateKey}`,
    eventId: params.event.id,
    occurrenceKey: dateKey,
    seriesDate: params.event.date.toISOString(),
    sourceType: normalizeSourceType(params.event.source_type),
    sourceId: params.event.source_id,
    title: override?.title || params.event.title,
    description: override?.description || params.event.description,
    type,
    amount:
      override?.amount !== null && override?.amount !== undefined
        ? Number(override.amount)
        : params.event.amount === null || params.event.amount === undefined
          ? null
          : Number(params.event.amount),
    category: params.event.category,
    date: occurrenceDate.toISOString(),
    endDate: params.event.end_date ? params.event.end_date.toISOString() : null,
    recurrence: normalizeRecurrence(params.event.recurrence),
    recurrenceInterval: Math.max(1, Number(params.event.recurrence_interval || 1)),
    isRecurring: Boolean(params.event.is_recurring),
    status: resolvedStatus,
    flow,
    reminderEnabled: override?.reminder_enabled ?? params.event.reminder_enabled,
    reminderDaysBefore: override?.reminder_days_before ?? params.event.reminder_days_before,
    colorToken: params.event.color_token,
    isManual: params.event.source_type === 'MANUAL' && Boolean(params.event.user_id),
    isOverdue: resolvedStatus === 'OVERDUE',
    isDerived: !(params.event.source_type === 'MANUAL' && Boolean(params.event.user_id)),
    createdAt: params.event.created_at.toISOString(),
    updatedAt: (override?.updated_at || params.event.updated_at).toISOString(),
  };
}

export function expandRecurringOccurrences(params: ExpandRecurringOccurrencesParams) {
  const normalizedRangeStart = startOfDay(params.rangeStart);
  const normalizedRangeEnd = endOfDay(params.rangeEnd);
  const eventStart = startOfDay(params.event.date);
  const eventEnd = params.event.end_date ? endOfDay(params.event.end_date) : null;
  const recurrence = normalizeRecurrence(params.event.recurrence);
  const interval = Math.max(1, Number(params.event.recurrence_interval || 1));

  if (!params.event.is_recurring || recurrence === 'NONE') {
    if (eventStart < normalizedRangeStart || eventStart > normalizedRangeEnd) return [];
    const occurrence = buildOccurrence(params, eventStart);
    return occurrence ? [occurrence] : [];
  }

  const occurrences: FinancialCalendarOccurrence[] = [];
  const anchorDay = params.event.date.getDate();
  let cursor = eventStart;
  let guard = 0;

  while (cursor <= normalizedRangeEnd && guard < 500) {
    guard += 1;

    if (cursor >= normalizedRangeStart && (!eventEnd || cursor <= eventEnd)) {
      const occurrence = buildOccurrence(params, cursor);
      if (occurrence) occurrences.push(occurrence);
    }

    if (eventEnd && cursor >= eventEnd) {
      break;
    }

    if (recurrence === 'DAILY') {
      cursor = addDays(cursor, interval);
      continue;
    }

    if (recurrence === 'WEEKLY') {
      cursor = addDays(cursor, interval * 7);
      continue;
    }

    if (recurrence === 'MONTHLY') {
      cursor = addMonths(cursor, interval, anchorDay);
      continue;
    }

    cursor = addYears(cursor, interval, anchorDay);
  }

  return occurrences;
}



