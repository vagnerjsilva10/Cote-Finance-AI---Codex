import 'server-only';

import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import {
  DERIVED_FINANCIAL_EVENT_SOURCE_TYPES,
  buildFinancialSourceRef,
  canTransitionTransactionStatus,
  mapCalendarStatusToConventionalDebtStatus,
  mapCalendarStatusToTransactionStatus,
  mapConventionalDebtStatusToCalendarStatus,
  mapConventionalDebtStatusToLegacyDebtStatus,
  mapTransactionStatusToCalendarStatus,
  normalizeFinancialEventStatus,
  normalizeRecurringDebtStatus as normalizeRecurringDebtStatusDomain,
  normalizeTransactionType,
  normalizeTransactionStatus,
  parseFinancialSourceRef,
  type TransactionType,
} from '@/lib/domain/financial-domain';
import { computeConventionalDebtNextDueDate, computeNextRecurringDebtDueDate } from '@/lib/debts';
import { buildFinancialCalendarAlerts } from '@/lib/financial-calendar/alerts';
import { expandRecurringOccurrences } from '@/lib/financial-calendar/recurrence';
import type {
  FinancialCalendarOccurrence,
  FinancialCalendarSnapshot,
  FinancialCalendarView,
  FinancialEventRecurrence,
  FinancialEventStatus,
  FinancialEventType,
} from '@/lib/financial-calendar/types';
import {
  detectPressureDays,
  endOfDay,
  generatePeriodSummary,
  groupEventsByDay,
  mapFinancialEventFlow,
  parseCalendarDate,
  resolvePeriodBounds,
  startOfDay,
  toDateKey,
} from '@/lib/financial-calendar/utils';
import { findWorkspaceConventionalDebts, findWorkspaceRecurringDebts } from '@/lib/server/debts';
import { syncWorkspaceRecurringRulesProjectionSafe } from '@/lib/server/recurrence-rules';

const READ_MODEL_PAST_DAYS = 15;
const READ_MODEL_FUTURE_DAYS = 120;
const DASHBOARD_PROJECTION_DAYS = 30;
const DASHBOARD_UPCOMING_DAYS = 14;

type CreateManualFinancialEventInput = {
  workspaceId: string;
  userId: string;
  title: string;
  description?: string | null;
  type: string;
  amount?: number | string | null;
  category?: string | null;
  date: string;
  endDate?: string | null;
  recurrence?: string | null;
  recurrenceInterval?: number | string | null;
  isRecurring?: boolean | null;
  status?: string | null;
  reminderEnabled?: boolean | null;
  reminderDaysBefore?: number | string | null;
  colorToken?: string | null;
};

type UpdateManualFinancialEventInput = {
  workspaceId: string;
  userId: string;
  eventId: string;
  title?: string;
  description?: string | null;
  type?: string;
  amount?: number | string | null;
  category?: string | null;
  date?: string;
  endDate?: string | null;
  recurrence?: string | null;
  recurrenceInterval?: number | string | null;
  isRecurring?: boolean | null;
  status?: string | null;
  reminderEnabled?: boolean | null;
  reminderDaysBefore?: number | string | null;
  colorToken?: string | null;
};

type MarkFinancialEventStatusInput = {
  workspaceId: string;
  userId: string;
  eventId: string;
  occurrenceDate?: string | null;
  status: string;
};

type CancelFinancialEventInput = {
  workspaceId: string;
  userId: string;
  eventId: string;
  occurrenceDate?: string | null;
};

type SyncDraft = {
  sourceType: string;
  sourceId: string;
  title: string;
  description: string | null;
  type: FinancialEventType;
  amount: number | null;
  category: string | null;
  date: Date;
  endDate: Date | null;
  recurrence: FinancialEventRecurrence;
  recurrenceInterval: number;
  isRecurring: boolean;
  status: FinancialEventStatus;
  reminderEnabled: boolean;
  reminderDaysBefore: number;
  colorToken: string | null;
};

type FinancialEventRecord = {
  id: string;
  user_id: string | null;
  workspace_id: string;
  title: string;
  description: string | null;
  type: string;
  amount: Prisma.Decimal | number | string | null;
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

type FinancialEventOccurrenceRecord = {
  financial_event_id: string;
  occurrence_date: Date;
  title: string | null;
  description: string | null;
  amount: Prisma.Decimal | number | string | null;
  status: string | null;
  reminder_enabled: boolean | null;
  reminder_days_before: number | null;
  is_deleted: boolean;
  updated_at: Date;
};

type TransactionClient = Parameters<typeof prisma.$transaction>[0] extends (arg: infer T) => any ? T : never;

const SCHEMA_SYNC_REQUIRED_ERROR =
  'Banco de dados desatualizado para o Calendario Financeiro Inteligente. Aplique o schema atual antes de usar esta feature.';

function isMissingTableError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === 'P2021' || error.code === 'P2022';
  }

  const message = error instanceof Error ? error.message : String(error || '');
  return /FinancialEvent|FinancialEventOccurrence|does not exist|Unknown arg/i.test(message);
}

function isReadModelTableError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === 'P2021' || error.code === 'P2022';
  }
  const message = error instanceof Error ? error.message : String(error || '');
  return /DailyCashProjection|CalendarEventReadModel|DashboardReadModel|does not exist|Unknown arg/i.test(message);
}

function addDays(date: Date, count: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + count);
}

function parseDateKey(value: string) {
  const [yearToken, monthToken, dayToken] = value.split('-');
  const year = Number(yearToken);
  const month = Number(monthToken) - 1;
  const day = Number(dayToken);
  return new Date(year, month, day);
}

function toDecimal(value: number) {
  return Number(value.toFixed(2));
}

function parseAmount(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const parsed = Number(value.replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function parseInteger(value: unknown, fallback = 0) {
  if (typeof value === 'number') return Number.isInteger(value) ? value : fallback;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isInteger(parsed) ? parsed : fallback;
  }
  return fallback;
}

function parseDateInput(value: string, label: string) {
  const trimmed = String(value || '').trim();
  const dayMatch = /^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/.exec(trimmed);
  if (dayMatch) {
    const year = Number(dayMatch[1]);
    const month = Number(dayMatch[2]) - 1;
    const day = Number(dayMatch[3]);
    const parsed = new Date(year, month, day);
    if (
      parsed.getFullYear() === year &&
      parsed.getMonth() === month &&
      parsed.getDate() === day
    ) {
      return parsed;
    }
    throw new Error(`${label} inválida.`);
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`${label} inválida.`);
  }
  return parsed;
}

function parseRequiredDate(value: string, label: string) {
  return parseDateInput(value, label);
}

function parseOptionalDate(value: string | null | undefined) {
  if (!value) return null;
  return parseDateInput(value, 'Data');
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
  throw new Error('Tipo de evento financeiro inválido.');
}

function normalizeRecurrence(value: string | null | undefined): FinancialEventRecurrence {
  const normalized = String(value || 'NONE').trim().toUpperCase();
  if (normalized === 'DAILY' || normalized === 'WEEKLY' || normalized === 'MONTHLY' || normalized === 'YEARLY') {
    return normalized;
  }
  return 'NONE';
}

function normalizeStatus(value: string | null | undefined): FinancialEventStatus {
  return normalizeFinancialEventStatus(value);
}

function normalizeColorToken(value: string | null | undefined) {
  const normalized = typeof value === 'string' ? value.trim() : '';
  return normalized ? normalized.slice(0, 80) : null;
}

function isSubscriptionLabel(value: string | null | undefined) {
  const normalized = String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  return normalized.includes('assinatura') || normalized.includes('subscription');
}

function mapRecurringDebtFrequencyToRecurrence(frequency: string, interval: number) {
  const normalized = String(frequency || 'MONTHLY').trim().toUpperCase();
  if (normalized === 'WEEKLY') {
    return { recurrence: 'WEEKLY' as const, recurrenceInterval: Math.max(1, interval) };
  }
  if (normalized === 'YEARLY') {
    return { recurrence: 'YEARLY' as const, recurrenceInterval: Math.max(1, interval) };
  }
  if (normalized === 'QUARTERLY') {
    return { recurrence: 'MONTHLY' as const, recurrenceInterval: Math.max(1, interval) * 3 };
  }
  return { recurrence: 'MONTHLY' as const, recurrenceInterval: Math.max(1, interval) };
}

function mapConventionalDebtStatusToFinancialStatus(status: string | null | undefined): FinancialEventStatus {
  return mapConventionalDebtStatusToCalendarStatus(status);
}

function buildSourceId(
  kind: 'goal' | 'transaction' | 'recurring-debt' | 'legacy-recurring-debt' | 'debt',
  id: string
) {
  return buildFinancialSourceRef(kind, id);
}

function parseSourceId(sourceId: string | null) {
  return parseFinancialSourceRef(sourceId);
}

function normalizeSettlementStatus(eventType: FinancialEventType, requestedStatus: string) {
  const normalized = normalizeStatus(requestedStatus);
  const flow = mapFinancialEventFlow(eventType);

  if (flow === 'in' && normalized === 'PAID') return 'RECEIVED';
  if (flow === 'out' && normalized === 'RECEIVED') return 'PAID';
  return normalized;
}

async function getWorkspaceFinancialEventOrThrow(workspaceId: string, eventId: string) {
  const event = await prisma.financialEvent.findFirst({
    where: {
      id: eventId,
      workspace_id: workspaceId,
    },
  });

  if (!event) {
    throw new Error('Evento financeiro não encontrado.');
  }

  return event;
}

function buildLedgerEffects(params: {
  type: TransactionType;
  amount: number;
  walletId: string;
  destinationWalletId?: string | null;
}) {
  if (params.type === 'INCOME') {
    return [{ walletId: params.walletId, delta: params.amount }];
  }
  if (params.type === 'EXPENSE') {
    return [{ walletId: params.walletId, delta: -params.amount }];
  }
  if (!params.destinationWalletId) {
    throw new Error('Destination wallet is required for transfers');
  }
  return [
    { walletId: params.walletId, delta: -params.amount },
    { walletId: params.destinationWalletId, delta: params.amount },
  ];
}

async function applyLedgerEffects(
  tx: TransactionClient,
  effects: Array<{ walletId: string; delta: number }>
) {
  for (const effect of effects) {
    await tx.wallet.update({
      where: { id: effect.walletId },
      data: {
        balance: {
          increment: effect.delta,
        },
      },
    });
  }
}

async function upsertSyncedFinancialEvent(workspaceId: string, draft: SyncDraft) {
  const existing = await prisma.financialEvent.findFirst({
    where: {
      workspace_id: workspaceId,
      source_type: draft.sourceType,
      source_id: draft.sourceId,
    },
    select: { id: true },
  });

  const payload = {
    user_id: null,
    workspace_id: workspaceId,
    title: draft.title,
    description: draft.description,
    type: draft.type,
    amount: draft.amount,
    category: draft.category,
    date: draft.date,
    end_date: draft.endDate,
    recurrence: draft.recurrence,
    recurrence_interval: draft.recurrenceInterval,
    is_recurring: draft.isRecurring,
    status: draft.status,
    source_type: draft.sourceType,
    source_id: draft.sourceId,
    reminder_enabled: draft.reminderEnabled,
    reminder_days_before: draft.reminderDaysBefore,
    color_token: draft.colorToken,
  };

  if (existing) {
    await prisma.financialEvent.update({
      where: { id: existing.id },
      data: payload,
    });
    return existing.id;
  }

  const created = await prisma.financialEvent.create({
    data: payload,
    select: { id: true },
  });

  return created.id;
}

async function upsertOccurrenceOverride(params: {
  financialEventId: string;
  occurrenceDate: Date;
  status: FinancialEventStatus;
}) {
  await prisma.financialEventOccurrence.upsert({
    where: {
      financial_event_id_occurrence_date: {
        financial_event_id: params.financialEventId,
        occurrence_date: params.occurrenceDate,
      },
    },
    update: {
      status: params.status,
      is_deleted: false,
    },
    create: {
      financial_event_id: params.financialEventId,
      occurrence_date: params.occurrenceDate,
      status: params.status,
      is_deleted: false,
    },
  });
}

async function buildSyncDrafts(workspaceId: string) {
  const [goals, conventionalDebts, recurringDebts, scheduledTransactions] = await Promise.all([
    prisma.goal.findMany({
      where: { workspace_id: workspaceId },
      select: {
        id: true,
        name: true,
        target_amount: true,
        current_amount: true,
        deadline: true,
      },
    }),
    findWorkspaceConventionalDebts(workspaceId),
    findWorkspaceRecurringDebts(workspaceId),
    prisma.transaction.findMany({
      where: {
        workspace_id: workspaceId,
        OR: [{ due_date: { not: null } }, { status: 'PENDING' }],
        type: { in: ['INCOME', 'EXPENSE'] },
      },
      select: {
        id: true,
        type: true,
        payment_method: true,
        amount: true,
        due_date: true,
        date: true,
        status: true,
        description: true,
        category: { select: { name: true } },
      },
      orderBy: { date: 'asc' },
    }),
  ]);

  const drafts: SyncDraft[] = [];

  for (const goal of goals) {
    if (!goal.deadline) continue;

    const remaining = Math.max(0, Number(goal.target_amount) - Number(goal.current_amount));
    const status =
      remaining <= 0
        ? ('RECEIVED' as const)
        : startOfDay(goal.deadline) < startOfDay(new Date())
          ? ('OVERDUE' as const)
          : ('PENDING' as const);

    drafts.push({
      sourceType: 'GOAL',
      sourceId: buildSourceId('goal', goal.id),
      title: goal.name,
      description: remaining > 0 ? 'Meta com prazo e valor pendente para conclusao.' : 'Meta concluida.',
      type: 'GOAL_DEADLINE',
      amount: remaining,
      category: 'Metas',
      date: goal.deadline,
      endDate: null,
      recurrence: 'NONE',
      recurrenceInterval: 1,
      isRecurring: false,
      status,
      reminderEnabled: true,
      reminderDaysBefore: 7,
      colorToken: 'calendar-goal',
    });
  }

  for (const debt of conventionalDebts) {
    const normalizedStatus = String(debt.status || '').trim().toUpperCase();
    const isInstallment = normalizedStatus === 'INSTALLMENT' || normalizedStatus === 'PARCELADA';
    const amount = Number(debt.remaining_amount || debt.original_amount || 0);

    drafts.push({
      sourceType: isInstallment ? 'INSTALLMENT' : 'EXPENSE',
      sourceId: buildSourceId('debt', debt.id),
      title: debt.creditor,
      description: isInstallment
        ? 'Parcela sincronizada automaticamente a partir da despesa de origem.'
        : 'Despesa convencional sincronizada automaticamente com a origem.',
      type: isInstallment ? 'INSTALLMENT' : 'FIXED_BILL',
      amount,
      category: debt.category || null,
      date: computeConventionalDebtNextDueDate({ dueDay: debt.due_day, dueDate: debt.due_date }),
      endDate: null,
      recurrence: 'NONE',
      recurrenceInterval: 1,
      isRecurring: false,
      status: mapConventionalDebtStatusToFinancialStatus(debt.status),
      reminderEnabled: true,
      reminderDaysBefore: 3,
      colorToken: isInstallment ? 'calendar-installment' : 'calendar-expense',
    });
  }

  for (const debt of recurringDebts) {
    const recurrence = mapRecurringDebtFrequencyToRecurrence(debt.frequency, debt.interval);
    const isSubscription = isSubscriptionLabel(debt.category) || isSubscriptionLabel(debt.creditor);
    drafts.push({
      sourceType: isSubscription ? 'SUBSCRIPTION' : 'EXPENSE',
      sourceId: buildSourceId(debt.source === 'legacy_debt' ? 'legacy-recurring-debt' : 'recurring-debt', debt.id),
      title: debt.creditor,
      description: debt.notes || 'Despesa recorrente sincronizada com a origem.',
      type: isSubscription ? 'SUBSCRIPTION' : 'FIXED_BILL',
      amount: Number(debt.amount || 0),
      category: debt.category,
      date: debt.source === 'recurring_debt' ? debt.start_date : debt.next_due_date,
      endDate: debt.end_date,
      recurrence: recurrence.recurrence,
      recurrenceInterval: recurrence.recurrenceInterval,
      isRecurring: true,
      status: normalizeRecurringDebtStatusDomain(debt.status) === 'ACTIVE' ? 'PENDING' : 'CANCELED',
      reminderEnabled: true,
      reminderDaysBefore: 3,
      colorToken: isSubscription ? 'calendar-subscription' : 'calendar-bill',
    });
  }

  for (const transaction of scheduledTransactions) {
    const sourceType = transaction.type === 'INCOME' ? 'INCOME' : transaction.payment_method === 'CARD' ? 'CARD_BILL' : 'EXPENSE';
    const eventType =
      transaction.type === 'INCOME'
        ? ('EXPECTED_INCOME' as const)
        : transaction.payment_method === 'CARD'
          ? ('CARD_BILL' as const)
          : ('FIXED_BILL' as const);
    const status = mapTransactionStatusToCalendarStatus({
      transactionStatus: transaction.status,
      transactionType: transaction.type,
    });

    drafts.push({
      sourceType,
      sourceId: buildSourceId('transaction', transaction.id),
      title: transaction.description,
      description: 'Evento sincronizado de transação com vencimento ou previsão.',
      type: eventType,
      amount: Number(transaction.amount || 0),
      category: transaction.category?.name || null,
      date: transaction.due_date || transaction.date,
      endDate: null,
      recurrence: 'NONE',
      recurrenceInterval: 1,
      isRecurring: false,
      status,
      reminderEnabled: true,
      reminderDaysBefore: 1,
      colorToken: transaction.type === 'INCOME' ? 'calendar-income' : 'calendar-expense',
    });
  }

  return drafts;
}

function applyFuturePressureBaseline(params: {
  groupedByDay: ReturnType<typeof groupEventsByDay>;
  openingBalance: number;
  now: Date;
}) {
  const todayKey = toDateKey(startOfDay(params.now));
  const futureDays = params.groupedByDay.filter((day) => day.date >= todayKey);

  if (futureDays.length === 0) {
    return {
      groupedDays: params.groupedByDay.map((day) => ({
        ...day,
        projectedBalance: null,
      })),
      criticalDays: [] as ReturnType<typeof detectPressureDays>['criticalDays'],
    };
  }

  const futurePressure = detectPressureDays(futureDays, params.openingBalance);
  const futureByDate = new Map(futurePressure.groupedDays.map((day) => [day.date, day]));

  return {
    groupedDays: params.groupedByDay.map((day) => {
      const enriched = futureByDate.get(day.date);
      if (enriched) return enriched;
      return {
        ...day,
        projectedBalance: null,
      };
    }),
    criticalDays: futurePressure.criticalDays,
  };
}

async function tryBuildSnapshotFromReadModels(params: {
  workspaceId: string;
  view: FinancialCalendarView;
  focusDate: Date;
  rangeStart: Date;
  rangeEnd: Date;
  now: Date;
}) {
  try {
    const [wallets, rows] = await Promise.all([
      prisma.wallet.findMany({
        where: { workspace_id: params.workspaceId },
        select: { balance: true },
      }),
      prisma.calendarEventReadModel.findMany({
        where: {
          workspace_id: params.workspaceId,
          date: {
            gte: params.rangeStart,
            lte: params.rangeEnd,
          },
        },
        orderBy: [{ date: 'asc' }],
      }),
    ]);

    if (rows.length === 0) {
      return null;
    }

    const events = rows
      .map((row) => ({
        id: row.occurrence_key,
        eventId: row.event_id,
        occurrenceKey: row.occurrence_key,
        seriesDate: row.series_date.toISOString(),
        sourceType: row.source_type as FinancialCalendarOccurrence['sourceType'],
        sourceId: row.source_id,
        title: row.title,
        description: row.description,
        type: row.type as FinancialCalendarOccurrence['type'],
        amount: row.amount === null ? null : Number(row.amount),
        category: row.category,
        date: row.date.toISOString(),
        endDate: row.end_date ? row.end_date.toISOString() : null,
        recurrence: row.recurrence as FinancialCalendarOccurrence['recurrence'],
        recurrenceInterval: row.recurrence_interval,
        isRecurring: row.is_recurring,
        status: row.status as FinancialCalendarOccurrence['status'],
        flow: row.flow as FinancialCalendarOccurrence['flow'],
        reminderEnabled: row.reminder_enabled,
        reminderDaysBefore: row.reminder_days_before,
        colorToken: row.color_token,
        isManual: row.is_manual,
        isOverdue: row.is_overdue,
        isDerived: row.is_derived,
        createdAt: row.created_at.toISOString(),
        updatedAt: row.updated_at.toISOString(),
      }))
      .sort((left, right) => {
        const dateDiff = parseCalendarDate(left.date).getTime() - parseCalendarDate(right.date).getTime();
        if (dateDiff !== 0) return dateDiff;
        return left.title.localeCompare(right.title);
      });

    const groupedByDay = groupEventsByDay(events);
    const openingBalance = wallets.reduce((acc, wallet) => acc + Number(wallet.balance || 0), 0);
    const futureEvents = events.filter((event) => parseCalendarDate(event.date) >= startOfDay(params.now));
    const summary = generatePeriodSummary(futureEvents, openingBalance);
    const pressure = applyFuturePressureBaseline({
      groupedByDay,
      openingBalance,
      now: params.now,
    });

    const projectionRows = await prisma.dailyCashProjection.findMany({
      where: {
        workspace_id: params.workspaceId,
        date: {
          gte: params.rangeStart,
          lte: params.rangeEnd,
        },
      },
      select: {
        date: true,
        closing_balance: true,
      },
    });
    const projectionMap = new Map(projectionRows.map((row) => [toDateKey(row.date), Number(row.closing_balance)]));
    const groupedWithProjection = pressure.groupedDays.map((day) => {
      const projected = projectionMap.get(day.date);
      if (projected === undefined) return day;
      return {
        ...day,
        projectedBalance: projected,
      };
    });

    const criticalDays = groupedWithProjection
      .filter((day) => day.pressureScore >= 40)
      .sort((left, right) => right.pressureScore - left.pressureScore || left.date.localeCompare(right.date))
      .slice(0, 6);

    const alerts = buildFinancialCalendarAlerts({
      events,
      groupedDays: groupedWithProjection,
      criticalDays,
      now: params.now,
    });

    return {
      period: {
        view: params.view,
        focusDate: params.focusDate.toISOString(),
        startDate: params.rangeStart.toISOString(),
        endDate: params.rangeEnd.toISOString(),
      },
      summary,
      events,
      groupedByDay: groupedWithProjection,
      criticalDays,
      overdueEvents: events.filter((event) => event.status === 'OVERDUE'),
      alerts,
      openingBalance,
    } satisfies FinancialCalendarSnapshot;
  } catch (error) {
    if (isReadModelTableError(error)) {
      return null;
    }
    throw error;
  }
}

function buildDailyProjectionRows(params: {
  workspaceId: string;
  events: FinancialCalendarOccurrence[];
  openingBalance: number;
  now: Date;
  rangeEnd: Date;
}) {
  const start = startOfDay(params.now);
  const end = startOfDay(params.rangeEnd);
  const flowByDate = new Map<
    string,
    {
      inflowConfirmed: number;
      outflowConfirmed: number;
      inflowPlanned: number;
      outflowPlanned: number;
    }
  >();

  for (const event of params.events) {
    if (event.status === 'CANCELED') continue;
    if (event.flow !== 'in' && event.flow !== 'out') continue;
    const amount = Number(event.amount || 0);
    if (!(amount > 0)) continue;
    const eventDate = startOfDay(parseCalendarDate(event.date));
    if (eventDate < start || eventDate > end) continue;
    const key = toDateKey(eventDate);
    const current = flowByDate.get(key) || {
      inflowConfirmed: 0,
      outflowConfirmed: 0,
      inflowPlanned: 0,
      outflowPlanned: 0,
    };

    const isConfirmed = event.status === 'PAID' || event.status === 'RECEIVED';
    const isPlanned = event.status === 'PENDING' || event.status === 'OVERDUE';

    if (event.flow === 'in') {
      if (isConfirmed) current.inflowConfirmed += amount;
      if (isPlanned) current.inflowPlanned += amount;
    } else {
      if (isConfirmed) current.outflowConfirmed += amount;
      if (isPlanned) current.outflowPlanned += amount;
    }

    flowByDate.set(key, current);
  }

  const rows: Array<{
    workspace_id: string;
    date: Date;
    opening_balance: number;
    inflow_confirmed: number;
    outflow_confirmed: number;
    inflow_planned: number;
    outflow_planned: number;
    closing_balance: number;
  }> = [];

  let opening = params.openingBalance;
  let cursor = start;
  while (cursor <= end) {
    const key = toDateKey(cursor);
    const flow = flowByDate.get(key) || {
      inflowConfirmed: 0,
      outflowConfirmed: 0,
      inflowPlanned: 0,
      outflowPlanned: 0,
    };

    const closing =
      opening +
      flow.inflowConfirmed -
      flow.outflowConfirmed +
      flow.inflowPlanned -
      flow.outflowPlanned;

    rows.push({
      workspace_id: params.workspaceId,
      date: new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate()),
      opening_balance: toDecimal(opening),
      inflow_confirmed: toDecimal(flow.inflowConfirmed),
      outflow_confirmed: toDecimal(flow.outflowConfirmed),
      inflow_planned: toDecimal(flow.inflowPlanned),
      outflow_planned: toDecimal(flow.outflowPlanned),
      closing_balance: toDecimal(closing),
    });

    opening = closing;
    cursor = addDays(cursor, 1);
  }

  return rows;
}

function buildDashboardReadModelPayload(params: {
  workspaceId: string;
  now: Date;
  openingBalance: number;
  events: FinancialCalendarOccurrence[];
  projections: Array<{
    date: Date;
    closing_balance: number;
  }>;
  criticalDays: Array<{ date: string }>;
}) {
  const today = startOfDay(params.now);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
  const horizon30Date = startOfDay(addDays(today, DASHBOARD_PROJECTION_DAYS));
  const upcomingEnd = endOfDay(addDays(today, DASHBOARD_UPCOMING_DAYS));

  let monthConfirmedIncome = 0;
  let monthConfirmedExpense = 0;
  let monthPlannedIncome = 0;
  let monthPlannedExpense = 0;
  let upcomingEventsCount = 0;

  for (const event of params.events) {
    if (event.status === 'CANCELED') continue;
    if (event.flow !== 'in' && event.flow !== 'out') continue;
    const amount = Number(event.amount || 0);
    if (!(amount > 0)) continue;
    const eventDate = parseCalendarDate(event.date);

    if (eventDate >= monthStart && eventDate <= monthEnd) {
      const isConfirmed = event.status === 'PAID' || event.status === 'RECEIVED';
      const isPlanned = event.status === 'PENDING' || event.status === 'OVERDUE';
      if (event.flow === 'in') {
        if (isConfirmed) monthConfirmedIncome += amount;
        if (isPlanned) monthPlannedIncome += amount;
      } else {
        if (isConfirmed) monthConfirmedExpense += amount;
        if (isPlanned) monthPlannedExpense += amount;
      }
    }

    if ((event.status === 'PENDING' || event.status === 'OVERDUE') && eventDate >= today && eventDate <= upcomingEnd) {
      upcomingEventsCount += 1;
    }
  }

  const sortedProjections = [...params.projections].sort((a, b) => a.date.getTime() - b.date.getTime());
  const projected30 =
    sortedProjections.find((item) => startOfDay(item.date).getTime() === horizon30Date.getTime())?.closing_balance ??
    sortedProjections[sortedProjections.length - 1]?.closing_balance ??
    params.openingBalance;
  const negativeDate = sortedProjections.find((item) => item.closing_balance < 0)?.date || null;
  const nextCriticalDate = params.criticalDays.length > 0 ? parseDateKey(params.criticalDays[0].date) : null;

  return {
    workspace_id: params.workspaceId,
    as_of_date: today,
    current_balance: toDecimal(params.openingBalance),
    projected_balance_30d: toDecimal(projected30),
    projected_negative_date: negativeDate,
    month_confirmed_income: toDecimal(monthConfirmedIncome),
    month_confirmed_expense: toDecimal(monthConfirmedExpense),
    month_planned_income: toDecimal(monthPlannedIncome),
    month_planned_expense: toDecimal(monthPlannedExpense),
    upcoming_events_count_14d: upcomingEventsCount,
    next_critical_date: nextCriticalDate,
  };
}

async function refreshWorkspaceFinancialReadModels(params: {
  workspaceId: string;
  now?: Date;
}) {
  const now = params.now ?? new Date();
  const rangeStart = startOfDay(addDays(now, -READ_MODEL_PAST_DAYS));
  const rangeEnd = endOfDay(addDays(now, READ_MODEL_FUTURE_DAYS));
  const snapshot = await getFinancialCalendarSnapshotForRange({
    workspaceId: params.workspaceId,
    view: 'month',
    focusDate: now,
    rangeStart,
    rangeEnd,
    now,
    preferReadModel: false,
  });

  const calendarRows = snapshot.events.map((event) => ({
    workspace_id: params.workspaceId,
    occurrence_key: event.occurrenceKey,
    event_id: event.eventId,
    series_date: parseCalendarDate(event.seriesDate),
    source_type: event.sourceType,
    source_id: event.sourceId,
    title: event.title,
    description: event.description,
    type: event.type,
    amount: event.amount === null ? null : toDecimal(Number(event.amount)),
    category: event.category,
    date: parseCalendarDate(event.date),
    end_date: event.endDate ? parseCalendarDate(event.endDate) : null,
    recurrence: event.recurrence,
    recurrence_interval: event.recurrenceInterval,
    is_recurring: event.isRecurring,
    status: event.status,
    flow: event.flow,
    reminder_enabled: event.reminderEnabled,
    reminder_days_before: event.reminderDaysBefore,
    color_token: event.colorToken,
    is_manual: event.isManual,
    is_overdue: event.isOverdue,
    is_derived: event.isDerived,
  }));

  const dailyProjectionRows = buildDailyProjectionRows({
    workspaceId: params.workspaceId,
    events: snapshot.events,
    openingBalance: snapshot.openingBalance,
    now,
    rangeEnd,
  });

  const dashboardPayload = buildDashboardReadModelPayload({
    workspaceId: params.workspaceId,
    now,
    openingBalance: snapshot.openingBalance,
    events: snapshot.events,
    projections: dailyProjectionRows.map((item) => ({
      date: item.date,
      closing_balance: item.closing_balance,
    })),
    criticalDays: snapshot.criticalDays,
  });

  await prisma.$transaction(async (tx) => {
    await tx.calendarEventReadModel.deleteMany({
      where: {
        workspace_id: params.workspaceId,
        date: {
          gte: rangeStart,
          lte: rangeEnd,
        },
      },
    });
    if (calendarRows.length > 0) {
      await tx.calendarEventReadModel.createMany({
        data: calendarRows,
      });
    }

    await tx.dailyCashProjection.deleteMany({
      where: {
        workspace_id: params.workspaceId,
        date: {
          gte: startOfDay(now),
          lte: rangeEnd,
        },
      },
    });
    if (dailyProjectionRows.length > 0) {
      await tx.dailyCashProjection.createMany({
        data: dailyProjectionRows,
      });
    }

    await tx.dashboardReadModel.upsert({
      where: {
        workspace_id: params.workspaceId,
      },
      update: dashboardPayload,
      create: dashboardPayload,
    });
  });

  return {
    workspaceId: params.workspaceId,
    calendarEvents: calendarRows.length,
    dailyProjections: dailyProjectionRows.length,
    updatedAt: now.toISOString(),
  };
}

async function refreshWorkspaceFinancialReadModelsSafe(params: {
  workspaceId: string;
  now?: Date;
}) {
  try {
    return await refreshWorkspaceFinancialReadModels(params);
  } catch (error) {
    if (isReadModelTableError(error)) {
      return null;
    }
    console.error('Financial read-model refresh warning:', error);
    return null;
  }
}

export async function syncWorkspaceFinancialCalendarSources(workspaceId: string) {
  await syncWorkspaceRecurringRulesProjectionSafe({ workspaceId });
  const drafts = await buildSyncDrafts(workspaceId);
  const activeKeys = new Set(drafts.map((draft) => `${draft.sourceType}:${draft.sourceId}`));

  for (const draft of drafts) {
    await upsertSyncedFinancialEvent(workspaceId, draft);
  }

  const existingSynced = await prisma.financialEvent.findMany({
    where: {
      workspace_id: workspaceId,
      user_id: null,
      source_id: { not: null },
      source_type: { in: [...DERIVED_FINANCIAL_EVENT_SOURCE_TYPES] },
    },
    select: { id: true, source_type: true, source_id: true },
  });

  const staleIds = existingSynced
    .filter((event) => !activeKeys.has(`${event.source_type}:${event.source_id}`))
    .map((event) => event.id);

  if (staleIds.length > 0) {
    await prisma.financialEvent.updateMany({
      where: { id: { in: staleIds } },
      data: { status: 'CANCELED' },
    });
  }

  const readModels = await refreshWorkspaceFinancialReadModelsSafe({
    workspaceId,
  });

  return {
    syncedCount: drafts.length,
    canceledCount: staleIds.length,
    readModelsRefreshed: Boolean(readModels),
  };
}

export async function syncWorkspaceFinancialCalendarSourcesSafe(workspaceId: string) {
  try {
    return await syncWorkspaceFinancialCalendarSources(workspaceId);
  } catch (error) {
    if (isMissingTableError(error)) {
      return null;
    }
    console.error('Financial calendar sync warning:', error);
    return null;
  }
}

export async function createManualFinancialEvent(input: CreateManualFinancialEventInput) {
  const title = String(input.title || '').trim();
  if (!title) {
    throw new Error('Titulo do evento financeiro e obrigatorio.');
  }

  const eventType = normalizeType(input.type);
  const amount = parseAmount(input.amount);
  const eventDate = parseRequiredDate(input.date, 'Data');
  const endDate = parseOptionalDate(input.endDate);
  const recurrence = normalizeRecurrence(input.recurrence);
  const recurrenceInterval = Math.max(1, parseInteger(input.recurrenceInterval, 1));
  const isRecurring = recurrence !== 'NONE' || Boolean(input.isRecurring);
  const status = normalizeSettlementStatus(eventType, input.status || 'PENDING');

  if (amount !== null && amount < 0) {
    throw new Error('Valor do evento financeiro não pode ser negativo.');
  }

  if (endDate && startOfDay(endDate) < startOfDay(eventDate)) {
    throw new Error('Data final não pode ser anterior à data inicial.');
  }

  return prisma.financialEvent.create({
    data: {
      user_id: input.userId,
      workspace_id: input.workspaceId,
      title,
      description: typeof input.description === 'string' ? input.description.trim() || null : null,
      type: eventType,
      amount,
      category: typeof input.category === 'string' ? input.category.trim() || null : null,
      date: eventDate,
      end_date: endDate,
      recurrence,
      recurrence_interval: recurrenceInterval,
      is_recurring: isRecurring,
      status,
      source_type: 'MANUAL',
      source_id: null,
      reminder_enabled: Boolean(input.reminderEnabled),
      reminder_days_before: Math.max(0, parseInteger(input.reminderDaysBefore, 0)),
      color_token: normalizeColorToken(input.colorToken),
    },
  });
}

export async function updateManualFinancialEvent(input: UpdateManualFinancialEventInput) {
  const existing = await getWorkspaceFinancialEventOrThrow(input.workspaceId, input.eventId);

  if (existing.source_type !== 'MANUAL') {
    throw new Error('Eventos sincronizados devem ser alterados na origem do dado.');
  }

  const nextTitle = input.title !== undefined ? String(input.title || '').trim() : undefined;
  if (input.title !== undefined && !nextTitle) {
    throw new Error('Titulo do evento financeiro e obrigatorio.');
  }

  const nextType = input.type !== undefined ? normalizeType(input.type) : normalizeType(existing.type);
  const nextDate = input.date !== undefined ? parseRequiredDate(input.date, 'Data') : existing.date;
  const nextEndDate = input.endDate !== undefined ? parseOptionalDate(input.endDate) : existing.end_date;

  if (nextEndDate && startOfDay(nextEndDate) < startOfDay(nextDate)) {
    throw new Error('Data final não pode ser anterior à data inicial.');
  }

  const parsedAmount = input.amount !== undefined ? parseAmount(input.amount) : undefined;
  if (parsedAmount !== undefined && parsedAmount !== null && parsedAmount < 0) {
    throw new Error('Valor do evento financeiro não pode ser negativo.');
  }

  const nextRecurrence =
    input.recurrence !== undefined ? normalizeRecurrence(input.recurrence) : normalizeRecurrence(existing.recurrence);
  const nextRecurrenceInterval =
    input.recurrenceInterval !== undefined
      ? Math.max(1, parseInteger(input.recurrenceInterval, 1))
      : existing.recurrence_interval;
  const nextIsRecurring =
    input.isRecurring !== undefined
      ? Boolean(input.isRecurring)
      : existing.is_recurring || nextRecurrence !== 'NONE';

  const nextStatus =
    input.status !== undefined
      ? normalizeSettlementStatus(nextType, input.status || 'PENDING')
      : normalizeSettlementStatus(nextType, existing.status);

  return prisma.financialEvent.update({
    where: { id: existing.id },
    data: {
      title: nextTitle !== undefined ? nextTitle : undefined,
      description: input.description !== undefined ? input.description?.trim() || null : undefined,
      type: input.type !== undefined ? nextType : undefined,
      amount: parsedAmount !== undefined ? parsedAmount : undefined,
      category: input.category !== undefined ? input.category?.trim() || null : undefined,
      date: input.date !== undefined ? nextDate : undefined,
      end_date: input.endDate !== undefined ? nextEndDate : undefined,
      recurrence: input.recurrence !== undefined ? nextRecurrence : undefined,
      recurrence_interval: input.recurrenceInterval !== undefined ? nextRecurrenceInterval : undefined,
      is_recurring:
        input.isRecurring !== undefined || input.recurrence !== undefined ? nextIsRecurring : undefined,
      status: input.status !== undefined ? nextStatus : undefined,
      reminder_enabled:
        input.reminderEnabled !== undefined ? Boolean(input.reminderEnabled) : undefined,
      reminder_days_before:
        input.reminderDaysBefore !== undefined
          ? Math.max(0, parseInteger(input.reminderDaysBefore, 0))
          : undefined,
      color_token: input.colorToken !== undefined ? normalizeColorToken(input.colorToken) : undefined,
    },
  });
}

export async function deleteManualFinancialEvent(params: {
  workspaceId: string;
  userId: string;
  eventId: string;
}) {
  const existing = await getWorkspaceFinancialEventOrThrow(params.workspaceId, params.eventId);

  if (existing.source_type !== 'MANUAL') {
    throw new Error('Eventos sincronizados não podem ser excluídos por esta rota.');
  }

  await prisma.financialEvent.delete({
    where: { id: existing.id },
  });

  return {
    success: true,
    deletedEventId: existing.id,
  };
}

export async function cancelFinancialEvent(input: CancelFinancialEventInput) {
  const event = await getWorkspaceFinancialEventOrThrow(input.workspaceId, input.eventId);
  const targetOccurrenceDate = parseOptionalDate(input.occurrenceDate) || event.date;

  if (event.source_type !== 'MANUAL') {
    throw new Error('Eventos sincronizados devem ser cancelados na origem do dado.');
  }

  if (event.is_recurring && input.occurrenceDate) {
    await prisma.financialEventOccurrence.upsert({
      where: {
        financial_event_id_occurrence_date: {
          financial_event_id: event.id,
          occurrence_date: targetOccurrenceDate,
        },
      },
      update: {
        status: 'CANCELED',
        is_deleted: false,
      },
      create: {
        financial_event_id: event.id,
        occurrence_date: targetOccurrenceDate,
        status: 'CANCELED',
        is_deleted: false,
      },
    });
  } else {
    await prisma.financialEvent.update({
      where: { id: event.id },
      data: { status: 'CANCELED' },
    });
  }

  return {
    success: true,
    eventId: event.id,
    occurrenceDate: targetOccurrenceDate.toISOString(),
    status: 'CANCELED',
  };
}

async function getFinancialCalendarSnapshotForRange(params: {
  workspaceId: string;
  view: FinancialCalendarView;
  focusDate: Date;
  rangeStart: Date;
  rangeEnd: Date;
  now: Date;
  preferReadModel?: boolean;
}) {
  if (params.preferReadModel !== false) {
    const snapshotFromReadModel = await tryBuildSnapshotFromReadModels(params);
    if (snapshotFromReadModel) {
      return snapshotFromReadModel;
    }
  }

  const [wallets, events] = await Promise.all([
    prisma.wallet.findMany({
      where: { workspace_id: params.workspaceId },
      select: { balance: true },
    }),
    prisma.financialEvent.findMany({
      where: {
        workspace_id: params.workspaceId,
        status: { not: 'CANCELED' },
        date: { lte: params.rangeEnd },
        OR: [{ end_date: null }, { end_date: { gte: params.rangeStart } }],
      },
      select: {
        id: true,
        user_id: true,
        workspace_id: true,
        title: true,
        description: true,
        type: true,
        amount: true,
        category: true,
        date: true,
        end_date: true,
        recurrence: true,
        recurrence_interval: true,
        is_recurring: true,
        status: true,
        source_type: true,
        source_id: true,
        reminder_enabled: true,
        reminder_days_before: true,
        color_token: true,
        created_at: true,
        updated_at: true,
      },
      orderBy: [{ date: 'asc' }, { created_at: 'asc' }],
    }),
  ]);

  const eventIds = events.map((event) => event.id);
  const overrides = eventIds.length
    ? await prisma.financialEventOccurrence.findMany({
        where: {
          financial_event_id: { in: eventIds },
          occurrence_date: {
            gte: params.rangeStart,
            lte: params.rangeEnd,
          },
        },
        select: {
          financial_event_id: true,
          occurrence_date: true,
          title: true,
          description: true,
          amount: true,
          status: true,
          reminder_enabled: true,
          reminder_days_before: true,
          is_deleted: true,
          updated_at: true,
        },
      })
    : [];

  const overridesByEventId = new Map<string, Map<string, FinancialEventOccurrenceRecord>>();
  for (const override of overrides) {
    const dateKey = toDateKey(override.occurrence_date);
    const current =
      overridesByEventId.get(override.financial_event_id) || new Map<string, FinancialEventOccurrenceRecord>();
    current.set(dateKey, override as FinancialEventOccurrenceRecord);
    overridesByEventId.set(override.financial_event_id, current);
  }

  const expandedEvents = events
    .flatMap((event) =>
      expandRecurringOccurrences({
        event: event as FinancialEventRecord,
        rangeStart: params.rangeStart,
        rangeEnd: params.rangeEnd,
        now: params.now,
        overridesByDateKey: overridesByEventId.get(event.id),
        flowResolver: mapFinancialEventFlow,
      })
    )
    .sort((left, right) => {
      const dateDiff = parseCalendarDate(left.date).getTime() - parseCalendarDate(right.date).getTime();
      if (dateDiff !== 0) return dateDiff;
      return left.title.localeCompare(right.title);
    });

  const groupedByDay = groupEventsByDay(expandedEvents);
  const openingBalance = wallets.reduce((acc, wallet) => acc + Number(wallet.balance || 0), 0);
  const futureEvents = expandedEvents.filter((event) => parseCalendarDate(event.date) >= startOfDay(params.now));
  const summary = generatePeriodSummary(futureEvents, openingBalance);
  const pressure = applyFuturePressureBaseline({
    groupedByDay,
    openingBalance,
    now: params.now,
  });
  const alerts = buildFinancialCalendarAlerts({
    events: expandedEvents,
    groupedDays: pressure.groupedDays,
    criticalDays: pressure.criticalDays,
    now: params.now,
  });

  return {
    period: {
      view: params.view,
      focusDate: params.focusDate.toISOString(),
      startDate: params.rangeStart.toISOString(),
      endDate: params.rangeEnd.toISOString(),
    },
    summary,
    events: expandedEvents,
    groupedByDay: pressure.groupedDays,
    criticalDays: pressure.criticalDays,
    overdueEvents: expandedEvents.filter((event) => event.status === 'OVERDUE'),
    alerts,
    openingBalance,
  } satisfies FinancialCalendarSnapshot;
}

export async function getFinancialCalendarSnapshot(params: {
  workspaceId: string;
  view: FinancialCalendarView;
  focusDate?: string | null;
  now?: Date;
}) {
  const now = params.now ?? new Date();

  const focusDate = parseCalendarDate(params.focusDate);
  const period = resolvePeriodBounds(params.view, focusDate);
  return getFinancialCalendarSnapshotForRange({
    workspaceId: params.workspaceId,
    view: period.view,
    focusDate: period.focusDate,
    rangeStart: period.startDate,
    rangeEnd: period.endDate,
    now,
  });
}

export async function getFinancialCalendarUpcomingDueEvents(params: {
  workspaceId: string;
  fromDate?: string | null;
  days?: number;
}) {
  const fromDate = parseOptionalDate(params.fromDate) || new Date();
  const days = Math.max(1, Math.min(90, Number(params.days || 14)));
  const rangeEnd = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate() + days, 23, 59, 59, 999);

  const snapshot = await getFinancialCalendarSnapshotForRange({
    workspaceId: params.workspaceId,
    view: 'month',
    focusDate: fromDate,
    rangeStart: startOfDay(fromDate),
    rangeEnd,
    now: new Date(),
  });

  const upcoming = snapshot.events
    .filter((event) => {
      const date = parseCalendarDate(event.date);
      return (
        (event.status === 'PENDING' || event.status === 'OVERDUE') &&
        date >= startOfDay(fromDate) &&
        date <= rangeEnd
      );
    })
    .sort((left, right) => parseCalendarDate(left.date).getTime() - parseCalendarDate(right.date).getTime())
    .slice(0, 20);

  return {
    fromDate: fromDate.toISOString(),
    endDate: rangeEnd.toISOString(),
    total: upcoming.length,
    items: upcoming,
  };
}

export async function getFinancialCalendarMonthlySummary(params: {
  workspaceId: string;
  focusDate?: string | null;
}) {
  const snapshot = await getFinancialCalendarSnapshot({
    workspaceId: params.workspaceId,
    view: 'month',
    focusDate: params.focusDate,
  });

  return {
    period: snapshot.period,
    openingBalance: snapshot.openingBalance,
    summary: snapshot.summary,
    criticalDays: snapshot.criticalDays,
    overdueEvents: snapshot.overdueEvents,
  };
}

export async function markFinancialCalendarEventStatus(input: MarkFinancialEventStatusInput) {
  const event = await prisma.financialEvent.findFirst({
    where: {
      id: input.eventId,
      workspace_id: input.workspaceId,
    },
    select: {
      id: true,
      title: true,
      type: true,
      date: true,
      is_recurring: true,
      status: true,
      source_type: true,
      source_id: true,
    },
  });

  if (!event) {
    throw new Error('Evento financeiro não encontrado.');
  }

  const eventType = normalizeType(event.type);
  const nextStatus = normalizeSettlementStatus(eventType, input.status);
  const targetOccurrenceDate = parseOptionalDate(input.occurrenceDate) || event.date;

  if (
    eventType === 'GOAL_DEADLINE' ||
    eventType === 'FINANCIAL_REMINDER' ||
    eventType === 'MANUAL_ALERT'
  ) {
    throw new Error('Esse tipo de evento não aceita marcação de pago ou recebido.');
  }

  if (event.source_type === 'MANUAL') {
    if (event.is_recurring && toDateKey(targetOccurrenceDate) !== toDateKey(event.date)) {
      await upsertOccurrenceOverride({
        financialEventId: event.id,
        occurrenceDate: targetOccurrenceDate,
        status: nextStatus,
      });
    } else if (event.is_recurring) {
      await upsertOccurrenceOverride({
        financialEventId: event.id,
        occurrenceDate: targetOccurrenceDate,
        status: nextStatus,
      });
    } else {
      await prisma.financialEvent.update({
        where: { id: event.id },
        data: { status: nextStatus },
      });
    }

    return {
      eventId: event.id,
      occurrenceDate: targetOccurrenceDate.toISOString(),
      status: nextStatus,
    };
  }

  const sourceRef = parseSourceId(event.source_id);

  if (sourceRef.kind === 'transaction') {
    const transaction = await prisma.transaction.findFirst({
      where: {
        id: sourceRef.id,
        workspace_id: input.workspaceId,
      },
      select: {
        id: true,
        status: true,
        type: true,
        amount: true,
        wallet_id: true,
        destination_wallet_id: true,
      },
    });

    if (!transaction) {
      throw new Error('Transação de origem não encontrada.');
    }

    const transactionType = normalizeTransactionType(transaction.type);
    if (!transactionType) {
      throw new Error('Tipo da transação de origem inválido.');
    }

    const currentTransactionStatus = normalizeTransactionStatus(transaction.status);
    const targetTransactionStatus = mapCalendarStatusToTransactionStatus(nextStatus);

    if (
      !canTransitionTransactionStatus({
        from: currentTransactionStatus,
        to: targetTransactionStatus,
      })
    ) {
      throw new Error('Transição de status da transação de origem não permitida nesta rota.');
    }

    if (targetTransactionStatus === 'CONFIRMED') {
      if (currentTransactionStatus !== 'CONFIRMED') {
        const effects = buildLedgerEffects({
          type: transactionType,
          amount: Number(transaction.amount),
          walletId: transaction.wallet_id,
          destinationWalletId: transaction.destination_wallet_id,
        });

        await prisma.$transaction(async (tx) => {
          await applyLedgerEffects(tx as TransactionClient, effects);
          await Promise.all([
            tx.transaction.update({
              where: { id: transaction.id },
              data: { status: 'CONFIRMED' },
            }),
            tx.financialEvent.update({
              where: { id: event.id },
              data: { status: nextStatus },
            }),
          ]);
        });
      } else {
        await prisma.financialEvent.update({
          where: { id: event.id },
          data: { status: nextStatus },
        });
      }
    } else if (targetTransactionStatus === 'CANCELLED') {
      await prisma.$transaction([
        prisma.transaction.update({
          where: { id: transaction.id },
          data: { status: 'CANCELLED' },
        }),
        prisma.financialEvent.update({
          where: { id: event.id },
          data: { status: 'CANCELED' },
        }),
      ]);
    } else {
      await prisma.$transaction([
        prisma.transaction.update({
          where: { id: transaction.id },
          data: { status: 'PENDING' },
        }),
        prisma.financialEvent.update({
          where: { id: event.id },
          data: { status: 'PENDING' },
        }),
      ]);
    }

    return {
      eventId: event.id,
      occurrenceDate: targetOccurrenceDate.toISOString(),
      status: nextStatus,
    };
  }

  if (sourceRef.kind === 'debt') {
    const debt = await prisma.debt.findFirst({
      where: {
        id: sourceRef.id,
        workspace_id: input.workspaceId,
      },
      select: {
        id: true,
      },
    });

    if (!debt) {
      throw new Error('Despesa de origem não encontrada.');
    }

    const persistedStatus = nextStatus === 'RECEIVED' ? 'PAID' : nextStatus;

    await prisma.$transaction([
      prisma.debt.update({
        where: { id: debt.id },
        data: {
          status: mapConventionalDebtStatusToLegacyDebtStatus(
            mapCalendarStatusToConventionalDebtStatus(persistedStatus)
          ),
        },
      }),
      prisma.financialEvent.update({
        where: { id: event.id },
        data: {
          status: persistedStatus,
        },
      }),
    ]);

    return {
      eventId: event.id,
      occurrenceDate: targetOccurrenceDate.toISOString(),
      status: persistedStatus,
    };
  }

  if (sourceRef.kind === 'recurring-debt' || sourceRef.kind === 'legacy-recurring-debt') {
    await upsertOccurrenceOverride({
      financialEventId: event.id,
      occurrenceDate: targetOccurrenceDate,
      status: nextStatus,
    });

    if (sourceRef.kind === 'recurring-debt' && (nextStatus === 'PAID' || nextStatus === 'RECEIVED')) {
      const recurringDebt = await prisma.recurringDebt.findFirst({
        where: { id: sourceRef.id, workspace_id: input.workspaceId },
        select: {
          id: true,
          frequency: true,
          interval: true,
          start_date: true,
          due_day: true,
          next_due_date: true,
        },
      });

      if (recurringDebt && startOfDay(recurringDebt.next_due_date).getTime() <= startOfDay(targetOccurrenceDate).getTime()) {
        await prisma.recurringDebt.update({
          where: { id: recurringDebt.id },
          data: {
            next_due_date: computeNextRecurringDebtDueDate({
              frequency: recurringDebt.frequency,
              interval: recurringDebt.interval,
              startDate: recurringDebt.start_date,
              dueDay: recurringDebt.due_day,
              currentDueDate: recurringDebt.next_due_date,
              now: new Date(targetOccurrenceDate.getFullYear(), targetOccurrenceDate.getMonth(), targetOccurrenceDate.getDate() + 1),
            }),
          },
        });
      }
    }

    return {
      eventId: event.id,
      occurrenceDate: targetOccurrenceDate.toISOString(),
      status: nextStatus,
    };
  }

  throw new Error('Origem do evento ainda não suporta atualização de status por esta rota.');
}

export function isFinancialCalendarSchemaMismatchError(error: unknown) {
  return isMissingTableError(error);
}

export function getFinancialCalendarSchemaErrorMessage() {
  return SCHEMA_SYNC_REQUIRED_ERROR;
}








