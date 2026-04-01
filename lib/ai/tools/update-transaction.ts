import 'server-only';

import { prisma } from '@/lib/prisma';
import { resolveCategoryForWorkspace } from '@/lib/finance-assistant/category-resolver.service';

type TransactionType = 'INCOME' | 'EXPENSE' | 'TRANSFER';

export type UpdateTransactionToolInput = {
  workspaceId: string;
  transactionId?: string | null;
  amount?: number | null;
  description?: string | null;
  categoryHint?: string | null;
  date?: string | Date | null;
};

export type UpdateTransactionToolResult = {
  transactionId: string;
  workspaceId: string;
  previousAmount: number;
  updatedAmount: number;
  type: TransactionType;
  description: string;
  categoryId: string | null;
  categoryName: string | null;
  walletId: string;
  walletBalance: number;
  wasLastTransactionFallback: boolean;
};

function ensureWorkspaceId(value: string) {
  const workspaceId = String(value || '').trim();
  if (!workspaceId) {
    throw new Error('updateTransaction requires a valid workspaceId.');
  }
  return workspaceId;
}

function resolveDate(value: string | Date | null | undefined) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function resolveAmount(value: number | null | undefined) {
  if (value === null || typeof value === 'undefined') return null;
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error('updateTransaction amount must be a positive number when informed.');
  }
  return Number(value);
}

export async function updateTransactionTool(input: UpdateTransactionToolInput): Promise<UpdateTransactionToolResult | null> {
  const workspaceId = ensureWorkspaceId(input.workspaceId);
  const amount = resolveAmount(input.amount);
  const parsedDate = resolveDate(input.date);
  const transactionId = String(input.transactionId || '').trim();
  const description = String(input.description || '').trim();
  const categoryHint = String(input.categoryHint || '').trim();

  const transaction =
    (transactionId
      ? await prisma.transaction.findFirst({
          where: {
            id: transactionId,
            workspace_id: workspaceId,
          },
          select: {
            id: true,
            workspace_id: true,
            wallet_id: true,
            amount: true,
            type: true,
            description: true,
            category_id: true,
            category: { select: { name: true } },
          },
        })
      : null) ||
    (await prisma.transaction.findFirst({
      where: {
        workspace_id: workspaceId,
      },
      orderBy: { date: 'desc' },
      select: {
        id: true,
        workspace_id: true,
        wallet_id: true,
        amount: true,
        type: true,
        description: true,
        category_id: true,
        category: { select: { name: true } },
      },
    }));

  if (!transaction) return null;
  const wasLastTransactionFallback = !transactionId;
  const previousAmount = Number(transaction.amount || 0);
  const updatedAmount = amount ?? previousAmount;

  const type = String(transaction.type || 'EXPENSE').toUpperCase() as TransactionType;
  const flowType = type === 'INCOME' ? 'income' : 'expense';
  const targetCategoryHint = categoryHint || null;

  const category =
    targetCategoryHint
      ? await resolveCategoryForWorkspace({
          workspaceId,
          flowType,
          categoryHint: targetCategoryHint,
          rawUtterance: [description, categoryHint].filter(Boolean).join(' '),
        })
      : null;

  return prisma.$transaction(async (tx) => {
    const updatedTransaction = await tx.transaction.update({
      where: {
        id: transaction.id,
        workspace_id: workspaceId,
      },
      data: {
        amount: updatedAmount,
        description: description || undefined,
        category_id: category?.categoryId || undefined,
        date: parsedDate || undefined,
      },
      select: {
        id: true,
        amount: true,
        description: true,
        type: true,
        wallet_id: true,
        category_id: true,
        category: { select: { name: true } },
      },
    });

    const delta = updatedAmount - previousAmount;
    if (delta !== 0) {
      const balanceIncrement = type === 'INCOME' ? delta : -delta;
      await tx.wallet.update({
        where: {
          id: transaction.wallet_id,
          workspace_id: workspaceId,
        },
        data: {
          balance: {
            increment: balanceIncrement,
          },
        },
      });
    }

    const wallet = await tx.wallet.findFirst({
      where: {
        id: transaction.wallet_id,
        workspace_id: workspaceId,
      },
      select: {
        id: true,
        balance: true,
      },
    });

    return {
      transactionId: updatedTransaction.id,
      workspaceId,
      previousAmount,
      updatedAmount: Number(updatedTransaction.amount || 0),
      type: String(updatedTransaction.type || type).toUpperCase() as TransactionType,
      description: updatedTransaction.description,
      categoryId: updatedTransaction.category_id || null,
      categoryName: updatedTransaction.category?.name || null,
      walletId: updatedTransaction.wallet_id,
      walletBalance: Number(wallet?.balance || 0),
      wasLastTransactionFallback,
    } satisfies UpdateTransactionToolResult;
  });
}
