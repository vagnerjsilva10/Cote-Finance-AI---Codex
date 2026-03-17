import 'server-only';

import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import {
  computeNextRecurringDebtDueDate,
  isRecurringDebtCategory,
  mapLegacyDebtStatusToConventionalStatus,
  type RecurringDebtStatus,
} from '@/lib/debts';

export type ConventionalDebtRecord = {
  id: string;
  creditor: string;
  original_amount: unknown;
  remaining_amount: unknown;
  interest_rate_monthly: unknown;
  due_day: number;
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
function isMissingRecurringDebtTableError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === 'P2021' || error.code === 'P2022';
  }

  const message = error instanceof Error ? error.message : String(error || '');
  return /RecurringDebt|relation .*RecurringDebt.* does not exist|table .*RecurringDebt.* doesn't exist/i.test(message);
}

export async function findWorkspaceConventionalDebts(workspaceId: string) {
  const debts = await prisma.debt.findMany({
    where: { workspace_id: workspaceId },
    orderBy: { created_at: 'desc' },
    select: {
      id: true,
      creditor: true,
      original_amount: true,
      remaining_amount: true,
      interest_rate_monthly: true,
      due_day: true,
      category: true,
      status: true,
    },
  });

  return debts
    .filter((debt) => !isRecurringDebtCategory(String(debt.category || '')))
    .map((debt) => ({
      ...debt,
      source: 'debt' as const,
    }));
}

export async function findWorkspaceRecurringDebts(workspaceId: string) {
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
  }> = [];

  try {
    recurringDebts = await prisma.recurringDebt.findMany({
      where: { workspace_id: workspaceId },
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
      status: mapLegacyDebtStatusToConventionalStatus(debt.status) === 'PAID' ? 'ENDED' : 'ACTIVE',
      notes: 'Registro legado de conta recorrente mantido para compatibilidade.',
      source: 'legacy_debt' as const,
      legacy_debt_id: debt.id,
    }));

  return [
    ...recurringDebts.map((item) => ({
      ...item,
      source: 'recurring_debt' as const,
      legacy_debt_id: null,
    })),
    ...legacyItems,
  ] as RecurringDebtRecord[];
}

export function normalizeRecurringDebtStatus(value: string | undefined): RecurringDebtStatus {
  const normalized = String(value || '').trim().toUpperCase();
  if (normalized === 'PAUSED') return 'PAUSED';
  if (normalized === 'ENDED') return 'ENDED';
  return 'ACTIVE';
}
