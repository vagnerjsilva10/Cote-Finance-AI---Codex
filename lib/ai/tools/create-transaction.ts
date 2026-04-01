import 'server-only';

import { prisma } from '@/lib/prisma';
import { resolveCategoryForWorkspace } from '@/lib/finance-assistant/category-resolver.service';
import { generateTransactionDescription } from '@/lib/finance-assistant/generate-transaction-description';

type TransactionType = 'INCOME' | 'EXPENSE';
type PaymentMethod = 'PIX' | 'CARD' | 'CASH' | 'BANK_TRANSFER' | 'BOLETO' | 'DEBIT' | 'OTHER';

export type CreateTransactionToolInput = {
  workspaceId: string;
  type: TransactionType;
  amount: number;
  categoryHint?: string | null;
  description?: string | null;
  merchant?: string | null;
  date?: string | Date | null;
  paymentMethod?: PaymentMethod | null;
  originId?: string | null;
};

export type CreateTransactionToolResult = {
  transactionId: string;
  workspaceId: string;
  amount: number;
  type: TransactionType;
  categoryId: string;
  categoryName: string;
  description: string;
  paymentMethod: PaymentMethod;
  walletId: string;
  walletBalance: number;
};

function ensureWorkspaceId(value: string) {
  const workspaceId = String(value || '').trim();
  if (!workspaceId) {
    throw new Error('createTransaction requires a valid workspaceId.');
  }
  return workspaceId;
}

function ensurePositiveAmount(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error('createTransaction requires amount > 0.');
  }
  return Number(value);
}

function resolveTransactionDate(value: string | Date | null | undefined) {
  if (!value) return new Date();
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? new Date() : value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function resolvePaymentMethod(value: string | null | undefined): PaymentMethod {
  const normalized = String(value || '').trim().toUpperCase();
  if (
    normalized === 'PIX' ||
    normalized === 'CARD' ||
    normalized === 'CASH' ||
    normalized === 'BANK_TRANSFER' ||
    normalized === 'BOLETO' ||
    normalized === 'DEBIT'
  ) {
    return normalized;
  }
  return 'OTHER';
}

async function getOrCreatePrimaryWallet(workspaceId: string) {
  const existing = await prisma.wallet.findFirst({
    where: { workspace_id: workspaceId },
    orderBy: { id: 'asc' },
    select: {
      id: true,
      balance: true,
    },
  });

  if (existing) return existing;

  return prisma.wallet.create({
    data: {
      workspace_id: workspaceId,
      name: 'Carteira Principal',
      type: 'CASH',
      balance: 0,
    },
    select: {
      id: true,
      balance: true,
    },
  });
}

export async function createTransactionTool(input: CreateTransactionToolInput): Promise<CreateTransactionToolResult> {
  const workspaceId = ensureWorkspaceId(input.workspaceId);
  const amount = ensurePositiveAmount(input.amount);
  const type = input.type === 'INCOME' ? 'INCOME' : 'EXPENSE';
  const flowType = type === 'INCOME' ? 'income' : 'expense';
  const paymentMethod = resolvePaymentMethod(input.paymentMethod);

  const category = await resolveCategoryForWorkspace({
    workspaceId,
    flowType,
    categoryHint: input.categoryHint || input.merchant || input.description || 'Outros',
    rawUtterance: [input.description, input.merchant, input.categoryHint].filter(Boolean).join(' '),
  });

  const generatedDescription =
    String(input.description || '').trim() ||
    generateTransactionDescription({
      intent: type === 'INCOME' ? 'create_income' : 'create_expense',
      categoryName: category.categoryName,
      categoryHint: input.categoryHint || null,
      merchant: input.merchant || null,
      modelShortDescription: input.description || null,
      rawUtterance: input.description || input.categoryHint || input.merchant || '',
    });

  const wallet = await getOrCreatePrimaryWallet(workspaceId);
  const date = resolveTransactionDate(input.date);
  const originId = String(input.originId || '').trim();

  return prisma.$transaction(async (tx) => {
    const created = await tx.transaction.create({
      data: {
        workspace_id: workspaceId,
        wallet_id: wallet.id,
        category_id: category.categoryId,
        type,
        payment_method: paymentMethod,
        amount,
        date,
        description: generatedDescription,
        status: 'CONFIRMED',
        origin_type: 'SYSTEM',
        origin_id: originId || null,
      },
      select: {
        id: true,
      },
    });

    const balanceDelta = type === 'INCOME' ? amount : -amount;
    const updatedWallet = await tx.wallet.update({
      where: {
        id: wallet.id,
        workspace_id: workspaceId,
      },
      data: {
        balance: {
          increment: balanceDelta,
        },
      },
      select: {
        id: true,
        balance: true,
      },
    });

    return {
      transactionId: created.id,
      workspaceId,
      amount,
      type,
      categoryId: category.categoryId,
      categoryName: category.categoryName,
      description: generatedDescription,
      paymentMethod,
      walletId: updatedWallet.id,
      walletBalance: Number(updatedWallet.balance || 0),
    } satisfies CreateTransactionToolResult;
  });
}
