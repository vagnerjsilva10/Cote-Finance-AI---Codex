import 'server-only';

import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { computeConventionalDebtNextDueDate, computeNextRecurringDebtDueDate, mapConventionalStatusToLegacyDebtStatus } from '@/lib/debts';
import { buildFinancialCalendarAlerts } from '@/lib/financial-calendar/alerts';
import { expandRecurringOccurrences } from '@/lib/financial-calendar/recurrence';
import type {
  FinancialCalendarSnapshot,
  FinancialCalendarView,
  FinancialEventRecurrence,
  FinancialEventStatus,
  FinancialEventType,
} from '@/lib/financial-calendar/types';
import {
  detectPressureDays,
  generatePeriodSummary,
  groupEventsByDay,
  mapFinancialEventFlow,
  parseCalendarDate,
  resolvePeriodBounds,
  startOfDay,
  toDateKey,
} from '@/lib/financial-calendar/utils';
import { findWorkspaceConventionalDebts, findWorkspaceRecurringDebts } from '@/lib/server/debts';

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
type TransactionKind = 'INCOME' | 'EXPENSE' | 'TRANSFER';

const SCHEMA_SYNC_REQUIRED_ERROR =
  'Banco de dados desatualizado para o Calendario Financeiro Inteligente. Aplique o schema atual antes de usar esta feature.';

function isMissingTableError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === 'P2021' || error.code === 'P2022';
  }

  const message = error instanceof Error ? error.message : String(error || '');
  return /FinancialEvent|FinancialEventOccurrence|does not exist|Unknown arg/i.test(message);
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
    throw new Error(`${label} invalida.`);
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`${label} invalida.`);
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
  throw new Error('Tipo de evento financeiro invalido.');
}

function normalizeRecurrence(value: string | null | undefined): FinancialEventRecurrence {
  const normalized = String(value || 'NONE').trim().toUpperCase();
  if (normalized === 'DAILY' || normalized === 'WEEKLY' || normalized === 'MONTHLY' || normalized === 'YEARLY') {
    return normalized;
  }
  return 'NONE';
}

function normalizeStatus(value: string | null | undefined): FinancialEventStatus {
  const normalized = String(value || 'PENDING').trim().toUpperCase();
  if (normalized === 'PAID' || normalized === 'RECEIVED' || normalized === 'OVERDUE' || normalized === 'CANCELED') {
    return normalized;
  }
  return 'PENDING';
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
  const normalized = String(status || '').trim().toUpperCase();
  if (normalized === 'PAID' || normalized === 'QUITADA') return 'PAID';
  if (normalized === 'OVERDUE' || normalized === 'ATRASADA') return 'OVERDUE';
  if (normalized === 'CANCELED' || normalized === 'CANCELLED') return 'CANCELED';
  return 'PENDING';
}

function buildSourceId(
  kind: 'goal' | 'transaction' | 'recurring-debt' | 'legacy-recurring-debt' | 'debt',
  id: string
) {
  return `${kind}:${id}`;
}

function parseSourceId(sourceId: string | null) {
  const raw = String(sourceId || '');
  if (!raw.includes(':')) return { kind: 'unknown', id: raw };
  const [kind, ...rest] = raw.split(':');
  return { kind, id: rest.join(':') };
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
    throw new Error('Evento financeiro nao encontrado.');
  }

  return event;
}

function buildLedgerEffects(params: {
  type: TransactionKind;
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
      status: debt.status === 'ACTIVE' ? 'PENDING' : 'CANCELED',
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
    const status =
      transaction.status === 'CONFIRMED'
        ? transaction.type === 'INCOME'
          ? ('RECEIVED' as const)
          : ('PAID' as const)
        : transaction.status === 'CANCELLED'
          ? ('CANCELED' as const)
          : ('PENDING' as const);

    drafts.push({
      sourceType,
      sourceId: buildSourceId('transaction', transaction.id),
      title: transaction.description,
      description: 'Evento sincronizado de transacao com vencimento ou previsao.',
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

export async function syncWorkspaceFinancialCalendarSources(workspaceId: string) {
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
      source_type: { in: ['GOAL', 'EXPENSE', 'INCOME', 'SUBSCRIPTION', 'CARD_BILL', 'INSTALLMENT'] },
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

  return {
    syncedCount: drafts.length,
    canceledCount: staleIds.length,
  };
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
    throw new Error('Valor do evento financeiro nao pode ser negativo.');
  }

  if (endDate && startOfDay(endDate) < startOfDay(eventDate)) {
    throw new Error('Data final nao pode ser anterior a data inicial.');
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
    throw new Error('Data final nao pode ser anterior a data inicial.');
  }

  const parsedAmount = input.amount !== undefined ? parseAmount(input.amount) : undefined;
  if (parsedAmount !== undefined && parsedAmount !== null && parsedAmount < 0) {
    throw new Error('Valor do evento financeiro nao pode ser negativo.');
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
    throw new Error('Eventos sincronizados nao podem ser excluidos por esta rota.');
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
}) {
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
  const summary = generatePeriodSummary(expandedEvents, openingBalance);
  const pressure = detectPressureDays(groupedByDay, openingBalance);
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
  await syncWorkspaceFinancialCalendarSources(params.workspaceId);

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

  await syncWorkspaceFinancialCalendarSources(params.workspaceId);

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
    throw new Error('Evento financeiro nao encontrado.');
  }

  const eventType = normalizeType(event.type);
  const nextStatus = normalizeSettlementStatus(eventType, input.status);
  const targetOccurrenceDate = parseOptionalDate(input.occurrenceDate) || event.date;

  if (
    eventType === 'GOAL_DEADLINE' ||
    eventType === 'FINANCIAL_REMINDER' ||
    eventType === 'MANUAL_ALERT'
  ) {
    throw new Error('Esse tipo de evento nao aceita marcacao de pago ou recebido.');
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
      throw new Error('Transacao de origem nao encontrada.');
    }

    if (nextStatus === 'PAID' || nextStatus === 'RECEIVED') {
      if (transaction.status !== 'CONFIRMED') {
        const effects = buildLedgerEffects({
          type: transaction.type as TransactionKind,
          amount: Number(transaction.amount),
          walletId: transaction.wallet_id,
          destinationWalletId: transaction.destination_wallet_id,
        });

        await prisma.$transaction(async (tx) => {
          await applyLedgerEffects(tx as TransactionClient, effects);
          await tx.transaction.update({
            where: { id: transaction.id },
            data: { status: 'CONFIRMED' },
          });
        });
      }

      await prisma.financialEvent.update({
        where: { id: event.id },
        data: { status: nextStatus },
      });
    } else if (nextStatus === 'CANCELED') {
      if (transaction.status === 'CONFIRMED') {
        throw new Error('Nao e seguro cancelar uma transacao ja confirmada por esta rota.');
      }

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
      throw new Error('Despesa de origem nao encontrada.');
    }

    const persistedStatus = nextStatus === 'RECEIVED' ? 'PAID' : nextStatus;

    await prisma.$transaction([
      prisma.debt.update({
        where: { id: debt.id },
        data: {
          status: mapConventionalStatusToLegacyDebtStatus(
            persistedStatus === 'PAID'
              ? 'PAID'
              : persistedStatus === 'OVERDUE'
                ? 'OVERDUE'
                : 'OPEN'
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

  throw new Error('Origem do evento ainda nao suporta atualizacao de status por esta rota.');
}

export function isFinancialCalendarSchemaMismatchError(error: unknown) {
  return isMissingTableError(error);
}

export function getFinancialCalendarSchemaErrorMessage() {
  return SCHEMA_SYNC_REQUIRED_ERROR;
}








