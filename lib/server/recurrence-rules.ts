import 'server-only';

import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import {
  TRANSACTION_PAYMENT_METHODS,
  type TransactionPaymentMethod,
  type TransactionType,
} from '@/lib/domain/financial-domain';

export type RecurrenceRuleKind = 'INCOME' | 'EXPENSE';
export type RecurrenceRuleFrequency = 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
export type RecurrenceRuleStatus = 'ACTIVE' | 'PAUSED' | 'ENDED';

export type UpsertRecurrenceRuleInput = {
  workspaceId: string;
  ruleId?: string;
  kind: string;
  title: string;
  description?: string | null;
  amount: number;
  walletId: string;
  categoryId?: string | null;
  paymentMethod?: string | null;
  frequency: string;
  interval?: number | null;
  startDate: Date;
  endDate?: Date | null;
  anchorDay?: number | null;
  timezone?: string | null;
  status?: string | null;
};

type RecurrenceRuleRecord = {
  id: string;
  workspace_id: string;
  wallet_id: string;
  category_id: string | null;
  kind: string;
  title: string;
  description: string | null;
  amount: Prisma.Decimal;
  payment_method: string;
  frequency: string;
  interval: number;
  start_date: Date;
  end_date: Date | null;
  anchor_day: number | null;
  timezone: string | null;
  status: string;
};

const DEFAULT_PROJECTION_HORIZON_DAYS = 120;
const MAX_PROJECTION_HORIZON_DAYS = 366;
const RECURRENCE_ORIGIN_TYPE = 'RECURRENCE';

function isRecurrenceSchemaMismatchError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === 'P2021' || error.code === 'P2022';
  }
  if (error instanceof Prisma.PrismaClientValidationError) {
    return error.message.includes('Unknown argument');
  }
  return false;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function endOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function addDays(date: Date, count: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + count);
}

function clampDay(year: number, month: number, day: number) {
  const lastDay = new Date(year, month + 1, 0).getDate();
  return Math.max(1, Math.min(day, lastDay));
}

function addMonthsWithAnchor(date: Date, count: number, anchorDay: number) {
  const next = new Date(date.getFullYear(), date.getMonth() + count, 1);
  return new Date(next.getFullYear(), next.getMonth(), clampDay(next.getFullYear(), next.getMonth(), anchorDay));
}

function addYearsWithAnchor(date: Date, count: number, anchorDay: number) {
  const next = new Date(date.getFullYear() + count, date.getMonth(), 1);
  return new Date(next.getFullYear(), next.getMonth(), clampDay(next.getFullYear(), next.getMonth(), anchorDay));
}

function toDateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function normalizeKind(value: string | null | undefined): RecurrenceRuleKind | null {
  const normalized = String(value || '')
    .trim()
    .toUpperCase();
  if (normalized === 'INCOME' || normalized === 'EXPENSE') return normalized;
  return null;
}

function normalizeFrequency(value: string | null | undefined): RecurrenceRuleFrequency {
  const normalized = String(value || 'MONTHLY')
    .trim()
    .toUpperCase();
  if (normalized === 'WEEKLY' || normalized === 'MONTHLY' || normalized === 'QUARTERLY' || normalized === 'YEARLY') {
    return normalized;
  }
  return 'MONTHLY';
}

function normalizeStatus(value: string | null | undefined): RecurrenceRuleStatus {
  const normalized = String(value || 'ACTIVE')
    .trim()
    .toUpperCase();
  if (normalized === 'PAUSED') return 'PAUSED';
  if (normalized === 'ENDED') return 'ENDED';
  return 'ACTIVE';
}

function normalizePaymentMethod(value: string | null | undefined): TransactionPaymentMethod {
  const normalized = String(value || 'OTHER')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_');

  if (normalized === 'CARTAO' || normalized === 'CARTÃO' || normalized === 'CREDIT_CARD') return 'CARD';
  if (normalized === 'DINHEIRO') return 'CASH';
  if (normalized === 'DEBITO' || normalized === 'DÉBITO') return 'DEBIT';
  if (normalized === 'TRANSFERENCIA_BANCARIA' || normalized === 'TRANSFERÊNCIA_BANCÁRIA') return 'BANK_TRANSFER';
  if (TRANSACTION_PAYMENT_METHODS.includes(normalized as TransactionPaymentMethod)) {
    return normalized as TransactionPaymentMethod;
  }
  return 'OTHER';
}

function normalizeInterval(value: number | null | undefined) {
  return Math.max(1, Number.isInteger(value) ? Number(value) : 1);
}

function normalizeAnchorDay(value: number | null | undefined, fallbackDate: Date) {
  const day = Number.isInteger(value) ? Number(value) : fallbackDate.getDate();
  return Math.max(1, Math.min(31, day));
}

function recurrenceOriginId(ruleId: string, occurrenceDate: Date) {
  return `${ruleId}:${toDateKey(occurrenceDate)}`;
}

function recurrenceOriginPrefix(ruleId: string) {
  return `${ruleId}:`;
}

function advanceOccurrence(params: {
  cursor: Date;
  frequency: RecurrenceRuleFrequency;
  interval: number;
  anchorDay: number;
}) {
  if (params.frequency === 'WEEKLY') {
    return addDays(params.cursor, params.interval * 7);
  }
  if (params.frequency === 'QUARTERLY') {
    return addMonthsWithAnchor(params.cursor, params.interval * 3, params.anchorDay);
  }
  if (params.frequency === 'YEARLY') {
    return addYearsWithAnchor(params.cursor, params.interval, params.anchorDay);
  }
  return addMonthsWithAnchor(params.cursor, params.interval, params.anchorDay);
}

function buildProjectedOccurrences(params: {
  startDate: Date;
  endDate: Date | null;
  frequency: RecurrenceRuleFrequency;
  interval: number;
  anchorDay: number;
  windowStart: Date;
  windowEnd: Date;
}) {
  const ruleStart = startOfDay(params.startDate);
  const hardEnd = params.endDate ? endOfDay(params.endDate) : null;
  if (hardEnd && hardEnd < params.windowStart) return [];

  let cursor = ruleStart;
  const occurrences: Date[] = [];
  let guard = 0;

  while (cursor < params.windowStart && guard < 2000) {
    guard += 1;
    cursor = advanceOccurrence({
      cursor,
      frequency: params.frequency,
      interval: params.interval,
      anchorDay: params.anchorDay,
    });
    if (hardEnd && cursor > hardEnd) return occurrences;
  }

  while (cursor <= params.windowEnd && guard < 4000) {
    guard += 1;
    if (!hardEnd || cursor <= hardEnd) {
      occurrences.push(cursor);
    } else {
      break;
    }

    cursor = advanceOccurrence({
      cursor,
      frequency: params.frequency,
      interval: params.interval,
      anchorDay: params.anchorDay,
    });
  }

  return occurrences;
}

function sanitizeProjectionHorizon(horizonDays?: number) {
  const fallback = DEFAULT_PROJECTION_HORIZON_DAYS;
  const parsed = Number(horizonDays);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(MAX_PROJECTION_HORIZON_DAYS, Math.max(7, Math.floor(parsed)));
}

async function getRecurrenceRuleOrThrow(workspaceId: string, ruleId: string) {
  const rule = await prisma.recurrenceRule.findFirst({
    where: {
      id: ruleId,
      workspace_id: workspaceId,
    },
  });

  if (!rule) {
    throw new Error('Regra de recorrência não encontrada.');
  }

  return rule as RecurrenceRuleRecord;
}

export async function upsertRecurrenceRule(input: UpsertRecurrenceRuleInput) {
  const kind = normalizeKind(input.kind);
  if (!kind) {
    throw new Error('Tipo de recorrência inválido. Use INCOME ou EXPENSE.');
  }

  const title = String(input.title || '').trim();
  if (!title) {
    throw new Error('Título da recorrência é obrigatório.');
  }

  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new Error('Valor da recorrência deve ser maior que zero.');
  }

  const startDate = startOfDay(input.startDate);
  const endDate = input.endDate ? endOfDay(input.endDate) : null;
  if (endDate && endDate < startDate) {
    throw new Error('Data final da recorrência não pode ser anterior à data inicial.');
  }

  const frequency = normalizeFrequency(input.frequency);
  const interval = normalizeInterval(input.interval);
  const anchorDay = normalizeAnchorDay(input.anchorDay, startDate);
  const status = normalizeStatus(input.status);

  const payload = {
    workspace_id: input.workspaceId,
    wallet_id: input.walletId,
    category_id: input.categoryId || null,
    kind,
    title,
    description: typeof input.description === 'string' ? input.description.trim() || null : null,
    amount: input.amount,
    payment_method: normalizePaymentMethod(input.paymentMethod),
    frequency,
    interval,
    start_date: startDate,
    end_date: endDate,
    anchor_day: frequency === 'MONTHLY' || frequency === 'QUARTERLY' || frequency === 'YEARLY' ? anchorDay : null,
    timezone: typeof input.timezone === 'string' ? input.timezone.trim() || null : null,
    status,
  };

  if (!input.ruleId) {
    return prisma.recurrenceRule.create({ data: payload });
  }

  const existing = await prisma.recurrenceRule.findFirst({
    where: {
      id: input.ruleId,
      workspace_id: input.workspaceId,
    },
    select: { id: true },
  });

  if (!existing) {
    return prisma.recurrenceRule.create({
      data: {
        id: input.ruleId,
        ...payload,
      },
    });
  }

  return prisma.recurrenceRule.update({
    where: { id: existing.id },
    data: payload,
  });
}

export async function projectRecurringRuleTransactions(params: {
  workspaceId: string;
  ruleId: string;
  horizonDays?: number;
  now?: Date;
}) {
  const rule = await getRecurrenceRuleOrThrow(params.workspaceId, params.ruleId);
  const horizonDays = sanitizeProjectionHorizon(params.horizonDays);
  const now = startOfDay(params.now ?? new Date());
  const windowStart = now;
  const windowEnd = endOfDay(addDays(now, horizonDays));

  const existing = await prisma.transaction.findMany({
    where: {
      workspace_id: params.workspaceId,
      origin_type: RECURRENCE_ORIGIN_TYPE,
      origin_id: {
        startsWith: recurrenceOriginPrefix(rule.id),
      },
    },
    select: {
      id: true,
      origin_id: true,
      status: true,
      due_date: true,
      date: true,
      created_at: true,
    },
    orderBy: [{ created_at: 'asc' }],
  });

  if (normalizeStatus(rule.status) !== 'ACTIVE') {
    const cancellableIds = existing
      .filter((tx) => String(tx.status || '').toUpperCase() === 'PENDING')
      .map((tx) => tx.id);

    if (cancellableIds.length > 0) {
      await prisma.transaction.updateMany({
        where: {
          id: { in: cancellableIds },
        },
        data: {
          status: 'CANCELLED',
        },
      });
    }

    await prisma.recurrenceRule.update({
      where: { id: rule.id },
      data: { last_projected_at: new Date() },
    });

    return {
      ruleId: rule.id,
      created: 0,
      updated: 0,
      canceled: cancellableIds.length,
      projectedWindowStart: windowStart.toISOString(),
      projectedWindowEnd: windowEnd.toISOString(),
    };
  }

  const frequency = normalizeFrequency(rule.frequency);
  const interval = normalizeInterval(rule.interval);
  const anchorDay = normalizeAnchorDay(rule.anchor_day, rule.start_date);
  const occurrences = buildProjectedOccurrences({
    startDate: rule.start_date,
    endDate: rule.end_date,
    frequency,
    interval,
    anchorDay,
    windowStart,
    windowEnd,
  });

  const expectedOriginIds = new Set(occurrences.map((occurrence) => recurrenceOriginId(rule.id, occurrence)));

  const existingByOriginId = new Map<string, typeof existing[number]>();
  const duplicatePendingIds: string[] = [];

  for (const tx of existing) {
    const originId = String(tx.origin_id || '');
    if (!originId) continue;
    if (!existingByOriginId.has(originId)) {
      existingByOriginId.set(originId, tx);
      continue;
    }
    if (String(tx.status || '').toUpperCase() === 'PENDING') {
      duplicatePendingIds.push(tx.id);
    }
  }

  const createPayloads: Array<Prisma.TransactionCreateManyInput> = [];
  const updatePayloads: Array<{ id: string; dueDate: Date }> = [];
  const stalePendingIds: string[] = [];
  const ruleType: TransactionType = rule.kind === 'INCOME' ? 'INCOME' : 'EXPENSE';

  for (const occurrence of occurrences) {
    const originId = recurrenceOriginId(rule.id, occurrence);
    const existingTx = existingByOriginId.get(originId);
    if (!existingTx) {
      createPayloads.push({
        workspace_id: rule.workspace_id,
        wallet_id: rule.wallet_id,
        destination_wallet_id: null,
        category_id: rule.category_id || null,
        type: ruleType,
        payment_method: normalizePaymentMethod(rule.payment_method),
        amount: Number(rule.amount),
        date: occurrence,
        due_date: occurrence,
        status: 'PENDING',
        origin_type: RECURRENCE_ORIGIN_TYPE,
        origin_id: originId,
        description: rule.title,
        receipt_url: null,
      });
      continue;
    }

    const txStatus = String(existingTx.status || '').toUpperCase();
    if (txStatus === 'PENDING') {
      updatePayloads.push({
        id: existingTx.id,
        dueDate: occurrence,
      });
    }
  }

  for (const tx of existingByOriginId.values()) {
    const txStatus = String(tx.status || '').toUpperCase();
    if (txStatus !== 'PENDING') continue;
    const originId = String(tx.origin_id || '');
    const dueDate = startOfDay(tx.due_date || tx.date);
    if (!expectedOriginIds.has(originId) && dueDate >= windowStart) {
      stalePendingIds.push(tx.id);
    }
  }

  const idsToCancel = [...new Set([...duplicatePendingIds, ...stalePendingIds])];

  await prisma.$transaction(async (tx) => {
    if (createPayloads.length > 0) {
      await tx.transaction.createMany({
        data: createPayloads,
      });
    }

    for (const update of updatePayloads) {
      await tx.transaction.update({
        where: { id: update.id },
        data: {
          wallet_id: rule.wallet_id,
          category_id: rule.category_id || null,
          type: ruleType,
          payment_method: normalizePaymentMethod(rule.payment_method),
          amount: Number(rule.amount),
          date: update.dueDate,
          due_date: update.dueDate,
          description: rule.title,
        },
      });
    }

    if (idsToCancel.length > 0) {
      await tx.transaction.updateMany({
        where: { id: { in: idsToCancel } },
        data: {
          status: 'CANCELLED',
        },
      });
    }

    await tx.recurrenceRule.update({
      where: { id: rule.id },
      data: {
        last_projected_at: new Date(),
      },
    });
  });

  return {
    ruleId: rule.id,
    created: createPayloads.length,
    updated: updatePayloads.length,
    canceled: idsToCancel.length,
    projectedWindowStart: windowStart.toISOString(),
    projectedWindowEnd: windowEnd.toISOString(),
  };
}

export async function cancelFutureRecurringRuleTransactions(params: {
  workspaceId: string;
  ruleId: string;
}) {
  const prefix = recurrenceOriginPrefix(params.ruleId);
  const result = await prisma.transaction.updateMany({
    where: {
      workspace_id: params.workspaceId,
      origin_type: RECURRENCE_ORIGIN_TYPE,
      origin_id: { startsWith: prefix },
      status: 'PENDING',
    },
    data: {
      status: 'CANCELLED',
    },
  });

  return {
    ruleId: params.ruleId,
    canceled: result.count,
  };
}

export async function syncWorkspaceRecurringRulesProjection(params: {
  workspaceId: string;
  horizonDays?: number;
  now?: Date;
}) {
  const rules = await prisma.recurrenceRule.findMany({
    where: { workspace_id: params.workspaceId },
    select: { id: true },
  });

  let created = 0;
  let updated = 0;
  let canceled = 0;

  for (const rule of rules) {
    const result = await projectRecurringRuleTransactions({
      workspaceId: params.workspaceId,
      ruleId: rule.id,
      horizonDays: params.horizonDays,
      now: params.now,
    });
    created += result.created;
    updated += result.updated;
    canceled += result.canceled;
  }

  return {
    workspaceId: params.workspaceId,
    rules: rules.length,
    created,
    updated,
    canceled,
  };
}

export async function syncWorkspaceRecurringRulesProjectionSafe(params: {
  workspaceId: string;
  horizonDays?: number;
  now?: Date;
}) {
  try {
    return await syncWorkspaceRecurringRulesProjection(params);
  } catch (error) {
    if (isRecurrenceSchemaMismatchError(error)) {
      return null;
    }
    console.error('Recurring rules projection warning:', error);
    return null;
  }
}

export function isRecurringRulesSchemaMismatchError(error: unknown) {
  return isRecurrenceSchemaMismatchError(error);
}

export function getRecurringRulesSchemaErrorMessage() {
  return 'A estrutura do banco de dados não está alinhada com a versão atual das regras de recorrência.';
}
