import 'server-only';

import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { computeConventionalDebtNextDueDate } from '@/lib/debts';
import {
  cancelFutureRecurringRuleTransactions,
  projectRecurringRuleTransactions,
  upsertRecurrenceRule,
} from '@/lib/server/recurrence-rules';

const DEBT_PENDING_ORIGIN_PREFIX = 'debt:';
const DEBT_PENDING_ORIGIN_SUFFIX = ':pending';
const RECURRING_RULE_PREFIX = 'recurring-debt:';
const DEFAULT_RECURRING_HORIZON_DAYS = 180;

function isSchemaMismatchError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === 'P2021' || error.code === 'P2022';
  }
  if (error instanceof Prisma.PrismaClientValidationError) {
    return error.message.includes('Unknown argument');
  }
  return false;
}

async function getDefaultWalletId(workspaceId: string) {
  const existing = await prisma.wallet.findFirst({
    where: { workspace_id: workspaceId },
    orderBy: [{ id: 'asc' }],
    select: { id: true },
  });

  if (existing) return existing.id;

  const created = await prisma.wallet.create({
    data: {
      workspace_id: workspaceId,
      name: 'Carteira Principal',
      type: 'CASH',
      balance: 0,
    },
    select: { id: true },
  });

  return created.id;
}

async function getOrCreateCategoryIdByName(name: string) {
  const normalizedName = String(name || '').trim() || 'Outros';
  const existing = await prisma.category.findFirst({
    where: { name: normalizedName },
    select: { id: true },
  });
  if (existing) return existing.id;
  const created = await prisma.category.create({
    data: { name: normalizedName },
    select: { id: true },
  });
  return created.id;
}

function toPendingOriginId(debtId: string) {
  return `${DEBT_PENDING_ORIGIN_PREFIX}${debtId}${DEBT_PENDING_ORIGIN_SUFFIX}`;
}

export async function syncWorkspaceDebtLedgerSources(params: { workspaceId: string }) {
  const workspaceId = params.workspaceId;
  const [defaultWalletId, debtCategoryId, recurringDebtRows, debtRows, pendingDebtTransactions, recurrenceRules] =
    await Promise.all([
      getDefaultWalletId(workspaceId),
      getOrCreateCategoryIdByName('Pagamento de dívida'),
      prisma.recurringDebt.findMany({
        where: { workspace_id: workspaceId },
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
          status: true,
          notes: true,
        },
      }),
      prisma.debt.findMany({
        where: { workspace_id: workspaceId },
        select: {
          id: true,
          creditor: true,
          original_amount: true,
          remaining_amount: true,
          due_day: true,
          due_date: true,
          status: true,
          category: true,
        },
      }),
      prisma.transaction.findMany({
        where: {
          workspace_id: workspaceId,
          origin_type: 'DEBT',
          origin_id: { startsWith: DEBT_PENDING_ORIGIN_PREFIX },
        },
        select: {
          id: true,
          origin_id: true,
          status: true,
        },
      }),
      prisma.recurrenceRule.findMany({
        where: {
          workspace_id: workspaceId,
          id: { startsWith: RECURRING_RULE_PREFIX },
        },
        select: { id: true },
      }),
    ]);

  const pendingByOrigin = new Map(
    pendingDebtTransactions.map((transaction) => [String(transaction.origin_id || ''), transaction])
  );

  const activeDebtIds = new Set<string>();

  for (const debt of debtRows) {
    const dueDate = computeConventionalDebtNextDueDate({
      dueDay: debt.due_day,
      dueDate: debt.due_date,
    });
    const pendingOriginId = toPendingOriginId(debt.id);
    const pendingTx = pendingByOrigin.get(pendingOriginId);
    const remainingAmount = Math.max(0, Number(debt.remaining_amount || debt.original_amount || 0));
    const statusToken = String(debt.status || '').trim().toUpperCase();
    const shouldHavePending =
      remainingAmount > 0 && !['PAID', 'QUITADA', 'CANCELED', 'CANCELLED'].includes(statusToken);

    if (shouldHavePending) {
      activeDebtIds.add(debt.id);
      const description = `Pagamento de dívida: ${debt.creditor}`;
      if (pendingTx) {
        await prisma.transaction.update({
          where: { id: pendingTx.id },
          data: {
            wallet_id: defaultWalletId,
            category_id: debtCategoryId,
            type: 'EXPENSE',
            payment_method: 'OTHER',
            amount: remainingAmount,
            description,
            date: dueDate,
            due_date: dueDate,
            status: 'PENDING',
            origin_type: 'DEBT',
            origin_id: pendingOriginId,
          },
        });
      } else {
        await prisma.transaction.create({
          data: {
            workspace_id: workspaceId,
            wallet_id: defaultWalletId,
            category_id: debtCategoryId,
            type: 'EXPENSE',
            payment_method: 'OTHER',
            amount: remainingAmount,
            description,
            date: dueDate,
            due_date: dueDate,
            status: 'PENDING',
            origin_type: 'DEBT',
            origin_id: pendingOriginId,
            receipt_url: null,
            destination_wallet_id: null,
          },
        });
      }
      continue;
    }

    if (pendingTx && String(pendingTx.status || '').toUpperCase() === 'PENDING') {
      await prisma.transaction.update({
        where: { id: pendingTx.id },
        data: { status: 'CANCELLED' },
      });
    }
  }

  for (const pendingTx of pendingDebtTransactions) {
    const originId = String(pendingTx.origin_id || '');
    if (!originId.endsWith(DEBT_PENDING_ORIGIN_SUFFIX)) continue;
    const debtId = originId.slice(
      DEBT_PENDING_ORIGIN_PREFIX.length,
      originId.length - DEBT_PENDING_ORIGIN_SUFFIX.length
    );
    if (!debtId || activeDebtIds.has(debtId)) continue;
    if (String(pendingTx.status || '').toUpperCase() === 'PENDING') {
      await prisma.transaction.update({
        where: { id: pendingTx.id },
        data: { status: 'CANCELLED' },
      });
    }
  }

  const activeRecurringRuleIds = new Set<string>();

  for (const recurringDebt of recurringDebtRows) {
    const recurringCategoryId = await getOrCreateCategoryIdByName(
      String(recurringDebt.category || '').trim() || 'Conta recorrente'
    );
    const ruleId = `${RECURRING_RULE_PREFIX}${recurringDebt.id}`;
    const statusToken = String(recurringDebt.status || '').trim().toUpperCase();
    const ruleStatus = statusToken === 'ACTIVE' ? 'ACTIVE' : statusToken === 'PAUSED' ? 'PAUSED' : 'ENDED';

    const rule = await upsertRecurrenceRule({
      workspaceId,
      ruleId,
      kind: 'EXPENSE',
      title: recurringDebt.creditor,
      description: recurringDebt.notes || 'Conta recorrente sincronizada automaticamente.',
      amount: Number(recurringDebt.amount || 0),
      walletId: defaultWalletId,
      categoryId: recurringCategoryId,
      paymentMethod: 'OTHER',
      frequency: recurringDebt.frequency,
      interval: Number(recurringDebt.interval || 1),
      startDate: recurringDebt.start_date,
      endDate: recurringDebt.end_date,
      anchorDay: recurringDebt.due_day ?? undefined,
      status: ruleStatus,
    });

    activeRecurringRuleIds.add(rule.id);

    await projectRecurringRuleTransactions({
      workspaceId,
      ruleId: rule.id,
      horizonDays: DEFAULT_RECURRING_HORIZON_DAYS,
    });
  }

  const staleRecurringRules = recurrenceRules
    .map((rule) => rule.id)
    .filter((ruleId) => !activeRecurringRuleIds.has(ruleId));

  for (const staleRuleId of staleRecurringRules) {
    await cancelFutureRecurringRuleTransactions({
      workspaceId,
      ruleId: staleRuleId,
    });
    await prisma.recurrenceRule.deleteMany({
      where: {
        workspace_id: workspaceId,
        id: staleRuleId,
      },
    });
  }
}

export async function syncWorkspaceDebtLedgerSourcesSafe(params: { workspaceId: string }) {
  try {
    await syncWorkspaceDebtLedgerSources(params);
    return true;
  } catch (error) {
    if (isSchemaMismatchError(error)) {
      return false;
    }
    console.error('Debt ledger sync warning:', error);
    return false;
  }
}
