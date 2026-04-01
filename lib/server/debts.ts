import 'server-only';

import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { mapLegacyDebtStatusToRecurringDebtStatus } from '@/lib/domain/financial-domain';
import type { ResolvedDateRange } from '@/lib/date/period-resolver';
import {
  computeNextRecurringDebtDueDate,
  isRecurringDebtCategory,
  normalizeRecurringDebtStatus as normalizeRecurringDebtStatusCompatibility,
  type RecurringDebtStatus,
} from '@/lib/debts';

export type ConventionalDebtRecord = {
  id: string;
  creditor: string;
  original_amount: unknown;
  remaining_amount: unknown;
  interest_rate_monthly: unknown;
  due_day: number;
  due_date: Date | null;
  category: string;
  status: string;
  source: 'debt';
};

export type RecurringDebtRecord = {
  id: string;
  creditor: string;
  amount: unknown;
  category: string;
  frequency: string;
  interval: number;
  start_date: Date;
  end_date: Date | null;
  due_day: number | null;
  next_due_date: Date;
  status: string;
  notes: string | null;
  source: 'recurring_debt' | 'legacy_debt';
  legacy_debt_id?: string | null;
};

type ConventionalDebtDateField = 'due_date' | 'payment_date' | 'created_at';
type RecurringDebtDateField = 'next_due_date' | 'start_date' | 'created_at';

type ConventionalDebtQueryOptions = {
  range?: ResolvedDateRange | null;
  dateField?: ConventionalDebtDateField;
};

type RecurringDebtQueryOptions = {
  range?: ResolvedDateRange | null;
  dateField?: RecurringDebtDateField;
};

function isMissingRecurringDebtTableError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === 'P2021' || error.code === 'P2022';
  }

  const message = error instanceof Error ? error.message : String(error || '');
  return /RecurringDebt|relation .*RecurringDebt.* does not exist|table .*RecurringDebt.* doesn't exist/i.test(message);
}

export async function findWorkspaceConventionalDebts(
  workspaceId: string,
  options?: ConventionalDebtQueryOptions
) {
  const dateField = options?.dateField || 'due_date';
  const range = options?.range || null;
  const where: Prisma.DebtWhereInput = { workspace_id: workspaceId };

  if (range && dateField === 'created_at') {
    where.created_at = {
      gte: range.start,
      lte: range.end,
    };
  }

  if (range && dateField === 'due_date') {
    where.OR = [
      {
        due_date: {
          gte: range.start,
          lte: range.end,
        },
      },
      {
        due_date: null,
        created_at: {
          gte: range.start,
          lte: range.end,
        },
      },
    ];
  }

  if (range && dateField === 'payment_date') {
    const paymentTransactions = await prisma.transaction.findMany({
      where: {
        workspace_id: workspaceId,
        origin_type: 'DEBT',
        origin_id: {
          startsWith: 'debt-payment:',
        },
        date: {
          gte: range.start,
          lte: range.end,
        },
      },
      select: {
        origin_id: true,
      },
    });

    const debtIds = paymentTransactions
      .map((transaction) => /^debt-payment:([^:]+):/.exec(String(transaction.origin_id || ''))?.[1] || null)
      .filter((value): value is string => Boolean(value));

    if (debtIds.length === 0) {
      return [];
    }
    where.id = {
      in: debtIds,
    };
  }

  const debts = await prisma.debt.findMany({
    where,
    orderBy: { created_at: 'desc' },
    select: {
      id: true,
      creditor: true,
      original_amount: true,
      remaining_amount: true,
      interest_rate_monthly: true,
      due_day: true,
      due_date: true,
      category: true,
      status: true,
      created_at: true,
    },
  });

  return debts
    .filter((debt) => !isRecurringDebtCategory(String(debt.category || '')))
    .map((debt) => ({
      ...debt,
      source: 'debt' as const,
    }));
}

export async function findWorkspaceRecurringDebts(
  workspaceId: string,
  options?: RecurringDebtQueryOptions
) {
  const dateField = options?.dateField || 'next_due_date';
  const range = options?.range || null;
  let recurringDebts: Array<{
    id: string;
    creditor: string;
    amount: unknown;
    category: string;
    frequency: string;
    interval: number;
    start_date: Date;
    end_date: Date | null;
    due_day: number | null;
    next_due_date: Date;
    status: string;
    notes: string | null;
    created_at: Date;
  }> = [];

  try {
    const where: Prisma.RecurringDebtWhereInput = { workspace_id: workspaceId };
    if (range && dateField === 'next_due_date') {
      where.next_due_date = {
        gte: range.start,
        lte: range.end,
      };
    }
    if (range && dateField === 'start_date') {
      where.start_date = {
        gte: range.start,
        lte: range.end,
      };
    }
    if (range && dateField === 'created_at') {
      where.created_at = {
        gte: range.start,
        lte: range.end,
      };
    }

    recurringDebts = await prisma.recurringDebt.findMany({
      where,
      orderBy: [{ status: 'asc' }, { next_due_date: 'asc' }],
      select: {
        id: true,
        creditor: true,
        amount: true,
        category: true,
        frequency: true,
        interval: true,
        start_date: true,
        end_date: true,
        due_day: true,
        next_due_date: true,
        status: true,
        notes: true,
        created_at: true,
      },
    });
  } catch (error) {
    if (!isMissingRecurringDebtTableError(error)) {
      throw error;
    }
  }

  const legacyRecurringDebts = await prisma.debt.findMany({
    where: { workspace_id: workspaceId },
    orderBy: { created_at: 'desc' },
    select: {
      id: true,
      creditor: true,
      original_amount: true,
      remaining_amount: true,
      due_day: true,
      category: true,
      status: true,
      due_date: true,
      created_at: true,
    },
  });

  const legacyItems = legacyRecurringDebts
    .filter((debt) => isRecurringDebtCategory(String(debt.category || '')))
    .map((debt) => ({
      id: `legacy:${debt.id}`,
      creditor: debt.creditor,
      amount: debt.remaining_amount,
      category: debt.category,
      frequency: 'MONTHLY',
      interval: 1,
      start_date: new Date(),
      end_date: null,
      due_day: debt.due_day,
      next_due_date: computeNextRecurringDebtDueDate({
        frequency: 'MONTHLY',
        interval: 1,
        startDate: new Date(),
        dueDay: debt.due_day,
      }),
      status: mapLegacyDebtStatusToRecurringDebtStatus(debt.status),
      notes: 'Registro legado de conta recorrente mantido para compatibilidade.',
      source: 'legacy_debt' as const,
      legacy_debt_id: debt.id,
      created_at: debt.created_at,
      due_date: debt.due_date,
    }));

  const normalizedLegacyItems = range
    ? legacyItems.filter((item) => {
        if (dateField === 'created_at') {
          return item.created_at >= range.start && item.created_at <= range.end;
        }
        if (dateField === 'start_date') {
          return item.start_date >= range.start && item.start_date <= range.end;
        }
        return item.next_due_date >= range.start && item.next_due_date <= range.end;
      })
    : legacyItems;

  return [
    ...recurringDebts.map((item) => ({
      ...item,
      source: 'recurring_debt' as const,
      legacy_debt_id: null,
    })),
    ...normalizedLegacyItems.map((item) => ({
      id: item.id,
      creditor: item.creditor,
      amount: item.amount,
      category: item.category,
      frequency: item.frequency,
      interval: item.interval,
      start_date: item.start_date,
      end_date: item.end_date,
      due_day: item.due_day,
      next_due_date: item.next_due_date,
      status: item.status,
      notes: item.notes,
      source: item.source,
      legacy_debt_id: item.legacy_debt_id,
    })),
  ] as RecurringDebtRecord[];
}

export function normalizeRecurringDebtStatus(value: string | undefined): RecurringDebtStatus {
  return normalizeRecurringDebtStatusCompatibility(value);
}
