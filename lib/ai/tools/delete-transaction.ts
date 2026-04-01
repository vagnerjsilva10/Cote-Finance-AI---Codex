import 'server-only';

import { prisma } from '@/lib/prisma';

export type DeleteTransactionToolInput = {
  workspaceId: string;
  transactionId?: string | null;
};

export type DeleteTransactionToolResult = {
  transactionId: string;
  walletId: string;
  walletBalance: number;
  amount: number;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
};

function ensureWorkspaceId(value: string) {
  const workspaceId = String(value || '').trim();
  if (!workspaceId) {
    throw new Error('deleteTransaction requires a valid workspaceId.');
  }
  return workspaceId;
}

function normalizeTransactionId(value: string | null | undefined) {
  return String(value || '').trim();
}

export async function deleteTransactionTool(
  input: DeleteTransactionToolInput
): Promise<DeleteTransactionToolResult | null> {
  const workspaceId = ensureWorkspaceId(input.workspaceId);
  const transactionId = normalizeTransactionId(input.transactionId);

  const transaction =
    (transactionId
      ? await prisma.transaction.findFirst({
          where: {
            id: transactionId,
            workspace_id: workspaceId,
          },
          select: {
            id: true,
            amount: true,
            type: true,
            wallet_id: true,
          },
        })
      : null) ||
    (await prisma.transaction.findFirst({
      where: {
        workspace_id: workspaceId,
      },
      orderBy: {
        date: 'desc',
      },
      select: {
        id: true,
        amount: true,
        type: true,
        wallet_id: true,
      },
    }));

  if (!transaction) return null;

  const amount = Number(transaction.amount || 0);
  const type = String(transaction.type || 'EXPENSE').toUpperCase() as DeleteTransactionToolResult['type'];
  const walletDelta = type === 'INCOME' ? -amount : amount;

  return prisma.$transaction(async (tx) => {
    await tx.transaction.delete({
      where: {
        id: transaction.id,
        workspace_id: workspaceId,
      },
    });

    const wallet = await tx.wallet.update({
      where: {
        id: transaction.wallet_id,
        workspace_id: workspaceId,
      },
      data: {
        balance: {
          increment: walletDelta,
        },
      },
      select: {
        id: true,
        balance: true,
      },
    });

    return {
      transactionId: transaction.id,
      walletId: wallet.id,
      walletBalance: Number(wallet.balance || 0),
      amount,
      type,
    } satisfies DeleteTransactionToolResult;
  });
}

