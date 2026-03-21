export const FINANCIAL_EVENT_TYPES = [
  'FIXED_BILL',
  'EXPECTED_INCOME',
  'CARD_BILL',
  'INSTALLMENT',
  'SUBSCRIPTION',
  'GOAL_DEADLINE',
  'FINANCIAL_REMINDER',
  'MANUAL_ALERT',
] as const;

export const FINANCIAL_EVENT_RECURRENCES = ['NONE', 'DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'] as const;

export const FINANCIAL_EVENT_STATUSES = ['PENDING', 'PAID', 'RECEIVED', 'OVERDUE', 'CANCELED'] as const;

export const FINANCIAL_EVENT_SOURCE_TYPES = [
  'MANUAL',
  'EXPENSE',
  'INCOME',
  'GOAL',
  'SUBSCRIPTION',
  'INSTALLMENT',
  'CARD_BILL',
  'SYSTEM',
] as const;

export const FINANCIAL_CALENDAR_VIEWS = ['day', 'week', 'month'] as const;

export type FinancialEventType = (typeof FINANCIAL_EVENT_TYPES)[number];
export type FinancialEventRecurrence = (typeof FINANCIAL_EVENT_RECURRENCES)[number];
export type FinancialEventStatus = (typeof FINANCIAL_EVENT_STATUSES)[number];
export type FinancialEventSourceType = (typeof FINANCIAL_EVENT_SOURCE_TYPES)[number];
export type FinancialCalendarView = (typeof FINANCIAL_CALENDAR_VIEWS)[number];
export type FinancialEventFlow = 'in' | 'out' | 'neutral';
export type FinancialPressureLevel = 'low' | 'medium' | 'high';
export type FinancialCalendarAlertSeverity = 'info' | 'warning' | 'critical';
export type FinancialCalendarAlertKind =
  | 'upcoming_due'
  | 'overdue'
  | 'outflow_cluster'
  | 'tight_balance'
  | 'heavy_day';

export type FinancialCalendarOccurrence = {
  id: string;
  eventId: string;
  occurrenceKey: string;
  seriesDate: string;
  sourceType: FinancialEventSourceType;
  sourceId: string | null;
  title: string;
  description: string | null;
  type: FinancialEventType;
  amount: number | null;
  category: string | null;
  date: string;
  endDate: string | null;
  recurrence: FinancialEventRecurrence;
  recurrenceInterval: number;
  isRecurring: boolean;
  status: FinancialEventStatus;
  flow: FinancialEventFlow;
  reminderEnabled: boolean;
  reminderDaysBefore: number;
  colorToken: string | null;
  isManual: boolean;
  isOverdue: boolean;
  isDerived: boolean;
  createdAt: string;
  updatedAt: string;
};

export type FinancialCalendarDayGroup = {
  date: string;
  events: FinancialCalendarOccurrence[];
  inflow: number;
  outflow: number;
  net: number;
  pendingCount: number;
  overdueCount: number;
  pressureScore: number;
  pressureLevel: FinancialPressureLevel;
  projectedBalance: number | null;
  reasons: string[];
};

export type FinancialCalendarSummary = {
  totalExpectedInflow: number;
  totalExpectedOutflow: number;
  projectedBalance: number;
  overdueCount: number;
  nextDue: FinancialCalendarOccurrence[];
};

export type FinancialCalendarPeriod = {
  view: FinancialCalendarView;
  focusDate: string;
  startDate: string;
  endDate: string;
};

export type FinancialCalendarAlert = {
  id: string;
  kind: FinancialCalendarAlertKind;
  severity: FinancialCalendarAlertSeverity;
  title: string;
  message: string;
  dayKey: string | null;
  startDate: string | null;
  endDate: string | null;
  eventIds: string[];
};

export type FinancialCalendarSnapshot = {
  period: FinancialCalendarPeriod;
  summary: FinancialCalendarSummary;
  events: FinancialCalendarOccurrence[];
  groupedByDay: FinancialCalendarDayGroup[];
  criticalDays: FinancialCalendarDayGroup[];
  overdueEvents: FinancialCalendarOccurrence[];
  alerts: FinancialCalendarAlert[];
  openingBalance: number;
};
