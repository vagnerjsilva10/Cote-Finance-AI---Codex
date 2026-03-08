import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import {
  HttpError,
  PLAN_LIMITS,
  getWorkspacePlan,
  logWorkspaceEventSafe,
  resolveWorkspaceContext,
} from '@/lib/server/multi-tenant';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type TransactionType = 'INCOME' | 'EXPENSE' | 'TRANSFER';
type PaymentMethod = 'PIX' | 'CARD' | 'CASH' | 'BANK_TRANSFER' | 'BOLETO' | 'DEBIT' | 'OTHER';

type CreateTransactionBody = {
  description?: string;
  amount?: number | string;
  date?: string;
  wallet?: string;
  destinationWallet?: string | null;
  category?: string;
  type?: string;
  flowType?: string;
  paymentMethod?: string;
  receiptUrl?: string | null;
};

type UpdateTransactionBody = CreateTransactionBody & {
  id?: string;
};

type DeleteTransactionBody = {
  id?: string;
};

const VALID_TYPES = new Set<TransactionType>(['INCOME', 'EXPENSE', 'TRANSFER']);
const VALID_PAYMENT_METHODS = new Set<PaymentMethod>([
  'PIX',
  'CARD',
  'CASH',
  'BANK_TRANSFER',
  'BOLETO',
  'DEBIT',
  'OTHER',
]);

const SCHEMA_SYNC_REQUIRED_ERROR =
  'Banco de dados desatualizado para transa??es. Rode a migration/db push para adicionar destination_wallet_id, payment_method e receipt_url.';

const hasOwn = <K extends string>(obj: object, key: K) =>
  Object.prototype.hasOwnProperty.call(obj, key);

const isSchemaMismatchError = (error: unknown) => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === 'P2021' || error.code === 'P2022';
  }
  const message = error instanceof Error ? error.message : String(error || '');
  return /destination_wallet_id|payment_method|receipt_url|does not exist|Unknown arg/i.test(message);
};

const normalizeTransactionType = (rawType?: string | null, rawFlowType?: string | null) => {
  const normalizedType = String(rawType || '')
    .trim()
    .toUpperCase();
  if (normalizedType === 'PIX_IN') return 'INCOME';
  if (normalizedType === 'PIX_OUT') return 'EXPENSE';
  if (VALID_TYPES.has(normalizedType as TransactionType)) {
    return normalizedType as TransactionType;
  }

  const normalizedFlowType = String(rawFlowType || '')
    .trim()
    .toLowerCase();
  if (normalizedFlowType === 'receita' || normalizedFlowType === 'entrada' || normalizedFlowType === 'pix in') {
    return 'INCOME';
  }
  if (normalizedFlowType === 'despesa' || normalizedFlowType === 'pix out') {
    return 'EXPENSE';
  }
  if (normalizedFlowType === 'transferencia' || normalizedFlowType === 'transfer?ncia') {
    return 'TRANSFER';
  }

  return null;
};

const normalizePaymentMethod = (rawMethod: string | undefined, transactionType: TransactionType) => {
  const normalizedMethod = String(rawMethod || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_');

  if (
    normalizedMethod === 'CARTAO' ||
    normalizedMethod === 'CARTÃO' ||
    normalizedMethod === 'CREDIT_CARD'
  ) {
    return 'CARD' as PaymentMethod;
  }
  if (
    normalizedMethod === 'TRANSFERENCIA_BANCARIA' ||
    normalizedMethod === 'TRANSFERÊNCIA_BANCÁRIA' ||
    normalizedMethod === 'TRANSFERENCIA'
  ) {
    return 'BANK_TRANSFER' as PaymentMethod;
  }
  if (normalizedMethod === 'DINHEIRO') {
    return 'CASH' as PaymentMethod;
  }
  if (normalizedMethod === 'DEBITO' || normalizedMethod === 'DÉBITO') {
    return 'DEBIT' as PaymentMethod;
  }
  if (VALID_PAYMENT_METHODS.has(normalizedMethod as PaymentMethod)) {
    return normalizedMethod as PaymentMethod;
  }

  if (transactionType === 'TRANSFER') return 'BANK_TRANSFER';
  return 'OTHER';
};

const parseAmount = (amount: unknown) => {
  if (typeof amount === 'number') {
    return Number.isFinite(amount) ? amount : null;
  }
  if (typeof amount === 'string') {
    const parsed = Number(amount.replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const parseDate = (rawDate: unknown) => {
  if (typeof rawDate !== 'string') return null;
  const parsed = new Date(rawDate);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
};

const normalizeReceiptUrl = (raw: unknown) => {
  if (typeof raw !== 'string') return null;
  const normalized = raw.trim();
  if (!normalized) return null;
  return normalized.slice(0, 2048);
};

const normalizeKeyword = (raw: string) =>
  raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);

async function upsertCategorySuggestionSafe(params: {
  workspaceId: string;
  categoryId: string;
  categoryName: string;
  description: string;
}) {
  const keyword = normalizeKeyword(params.description);
  if (!keyword) return;

  try {
    await prisma.categorySuggestion.upsert({
      where: {
        workspace_id_keyword: {
          workspace_id: params.workspaceId,
          keyword,
        },
      },
      update: {
        category_id: params.categoryId,
        category_name: params.categoryName,
        confidence: 1,
      },
      create: {
        workspace_id: params.workspaceId,
        keyword,
        category_id: params.categoryId,
        category_name: params.categoryName,
        confidence: 1,
      },
    });
  } catch (error) {
    if (!isSchemaMismatchError(error)) {
      console.error('Category suggestion upsert failed:', error);
    }
  }
}

async function findTransactionsWithCompatibility(workspaceId: string) {
  try {
    return await prisma.transaction.findMany({
      where: { workspace_id: workspaceId },
      orderBy: { date: 'desc' },
      take: 200,
      include: {
        category: true,
        wallet: true,
        destination_wallet: true,
      },
    });
  } catch (error) {
    if (!isSchemaMismatchError(error)) {
      throw error;
    }

    return await prisma.transaction.findMany({
      where: { workspace_id: workspaceId },
      orderBy: { date: 'desc' },
      take: 200,
      include: {
        category: true,
        wallet: true,
      },
    });
  }
}

async function getOrCreateWalletId(workspaceId: string, walletName?: string | null) {
  const normalizedWalletName = (walletName || '').trim() || 'Carteira Principal';
  const existingWallet = await prisma.wallet.findFirst({
    where: {
      workspace_id: workspaceId,
      name: normalizedWalletName,
    },
    select: {
      id: true,
    },
  });

  if (existingWallet) return existingWallet.id;

  const createdWallet = await prisma.wallet.create({
    data: {
      workspace_id: workspaceId,
      name: normalizedWalletName,
      type: 'CASH',
      balance: 0,
    },
    select: {
      id: true,
    },
  });

  return createdWallet.id;
}

async function getOrCreateCategoryId(categoryName?: string | null) {
  const normalizedCategoryName = (categoryName || '').trim() || 'Outros';
  const existingCategory = await prisma.category.findFirst({
    where: { name: normalizedCategoryName },
    select: { id: true },
  });

  if (existingCategory) return existingCategory.id;

  const createdCategory = await prisma.category.create({
    data: { name: normalizedCategoryName },
    select: { id: true },
  });

  return createdCategory.id;
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
  if (params.destinationWalletId === params.walletId) {
    throw new Error('Source and destination wallets must be different');
  }
  return [
    { walletId: params.walletId, delta: -params.amount },
    { walletId: params.destinationWalletId, delta: params.amount },
  ];
}

function mergeLedgerEffects(
  previousEffects: Array<{ walletId: string; delta: number }>,
  nextEffects: Array<{ walletId: string; delta: number }>
) {
  const balanceMap = new Map<string, number>();

  for (const effect of previousEffects) {
    balanceMap.set(effect.walletId, (balanceMap.get(effect.walletId) || 0) - effect.delta);
  }
  for (const effect of nextEffects) {
    balanceMap.set(effect.walletId, (balanceMap.get(effect.walletId) || 0) + effect.delta);
  }

  return [...balanceMap.entries()]
    .filter(([, delta]) => delta !== 0)
    .map(([walletId, delta]) => ({ walletId, delta }));
}

async function applyLedgerEffects(
  tx: Parameters<typeof prisma.$transaction>[0] extends (arg: infer T) => any ? T : never,
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

export async function GET(req: Request) {
  try {
    const context = await resolveWorkspaceContext(req);
    const transactions = await findTransactionsWithCompatibility(context.workspaceId);
    return NextResponse.json(transactions);
  } catch (error: any) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (isSchemaMismatchError(error)) {
      return NextResponse.json({ error: SCHEMA_SYNC_REQUIRED_ERROR }, { status: 503 });
    }
    console.error('Transactions GET Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const context = await resolveWorkspaceContext(req);
    const plan = await getWorkspacePlan(context.workspaceId, context.userId);
    const planLimits = PLAN_LIMITS[plan];

    const body = (await req.json().catch(() => null)) as CreateTransactionBody | null;
    if (!body) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const type = normalizeTransactionType(body.type, body.flowType);
    if (!type) {
      return NextResponse.json({ error: 'Invalid transaction type' }, { status: 400 });
    }

    const amount = parseAmount(body.amount);
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    const date = parseDate(body.date);
    if (!date) {
      return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
    }

    const description = (body.description || '').trim();
    if (!description) {
      return NextResponse.json({ error: 'Description is required' }, { status: 400 });
    }
    const receiptUrl = normalizeReceiptUrl(body.receiptUrl);

    if (Number.isFinite(planLimits.transactionsPerMonth)) {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);

      const currentMonthCount = await prisma.transaction.count({
        where: {
          workspace_id: context.workspaceId,
          date: {
            gte: monthStart,
            lt: nextMonthStart,
          },
        },
      });

      if (currentMonthCount >= planLimits.transactionsPerMonth) {
        return NextResponse.json(
          {
            error: `Transaction limit reached for ${plan}. Upgrade to continue.`,
            code: 'PLAN_LIMIT_REACHED',
            limit: planLimits.transactionsPerMonth,
            plan,
          },
          { status: 403 }
        );
      }
    }

    const destinationWalletName = (body.destinationWallet || '').trim();
    if (type === 'TRANSFER' && !destinationWalletName) {
      return NextResponse.json({ error: 'Conta destino ? obrigat?ria para transfer?ncia.' }, { status: 400 });
    }
    const normalizedCategoryName = (body.category || '').trim() || 'Outros';
    const [walletId, categoryId, destinationWalletId] = await Promise.all([
      getOrCreateWalletId(context.workspaceId, body.wallet),
      getOrCreateCategoryId(normalizedCategoryName),
      type === 'TRANSFER'
        ? getOrCreateWalletId(context.workspaceId, destinationWalletName)
        : Promise.resolve<string | null>(null),
    ]);
    const paymentMethod = normalizePaymentMethod(body.paymentMethod, type);

    const ledgerEffects = buildLedgerEffects({
      type,
      amount,
      walletId,
      destinationWalletId,
    });

    const transaction = await prisma.$transaction(async (tx) => {
      const createdTransaction = await tx.transaction.create({
        data: {
          workspace_id: context.workspaceId,
          wallet_id: walletId,
          destination_wallet_id: destinationWalletId,
          category_id: categoryId,
          type,
          payment_method: paymentMethod,
          receipt_url: receiptUrl,
          amount,
          date,
          description,
          status: 'CONFIRMED',
        },
        include: {
          category: true,
          wallet: true,
          destination_wallet: true,
        },
      });

      await applyLedgerEffects(tx, ledgerEffects);
      return createdTransaction;
    });

    await logWorkspaceEventSafe({
      workspaceId: context.workspaceId,
      userId: context.userId,
      type: 'transaction.created',
      payload: {
        transactionId: transaction.id,
        amount,
        type,
        paymentMethod,
      },
    });

    await upsertCategorySuggestionSafe({
      workspaceId: context.workspaceId,
      categoryId,
      categoryName: normalizedCategoryName,
      description,
    });

    return NextResponse.json(transaction);
  } catch (error: any) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof Error && error.message.includes('Destination wallet')) {
      return NextResponse.json({ error: 'Conta destino ? obrigat?ria para transfer?ncia.' }, { status: 400 });
    }
    if (error instanceof Error && error.message.includes('Source and destination wallets')) {
      return NextResponse.json(
        { error: 'Conta origem e conta destino devem ser diferentes.' },
        { status: 400 }
      );
    }
    if (isSchemaMismatchError(error)) {
      return NextResponse.json({ error: SCHEMA_SYNC_REQUIRED_ERROR }, { status: 503 });
    }
    console.error('Transactions POST Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to create transaction' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const context = await resolveWorkspaceContext(req);
    const body = (await req.json().catch(() => null)) as UpdateTransactionBody | null;
    if (!body?.id) {
      return NextResponse.json({ error: 'Transaction id is required' }, { status: 400 });
    }

    const existingTransaction = await prisma.transaction.findFirst({
      where: {
        id: body.id,
        workspace_id: context.workspaceId,
      },
      select: {
        id: true,
        wallet_id: true,
        destination_wallet_id: true,
        amount: true,
        type: true,
        payment_method: true,
        category_id: true,
        description: true,
      },
    });

    if (!existingTransaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    const nextType =
      normalizeTransactionType(body.type, body.flowType) || (existingTransaction.type as TransactionType);
    if (!VALID_TYPES.has(nextType)) {
      return NextResponse.json({ error: 'Invalid transaction type' }, { status: 400 });
    }

    const parsedAmount = parseAmount(body.amount);
    const nextAmount = parsedAmount && parsedAmount > 0 ? parsedAmount : Number(existingTransaction.amount);
    if (!nextAmount || nextAmount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    const nextDate = body.date ? parseDate(body.date) : null;
    if (body.date && !nextDate) {
      return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
    }

    const walletId = body.wallet
      ? await getOrCreateWalletId(context.workspaceId, body.wallet)
      : existingTransaction.wallet_id;

    const destinationWalletInBody = Object.prototype.hasOwnProperty.call(body, 'destinationWallet');
    let nextDestinationWalletId: string | null = null;
    if (nextType === 'TRANSFER') {
      if (destinationWalletInBody) {
        const destinationWalletName = (body.destinationWallet || '').trim();
        if (!destinationWalletName) {
          return NextResponse.json(
            { error: 'Conta destino ? obrigat?ria para transfer?ncia.' },
            { status: 400 }
          );
        }
        nextDestinationWalletId = await getOrCreateWalletId(
          context.workspaceId,
          destinationWalletName
        );
      } else {
        nextDestinationWalletId = existingTransaction.destination_wallet_id;
      }
    }

    const categoryId = body.category ? await getOrCreateCategoryId(body.category) : undefined;
    const nextDescription = (body.description || '').trim();
    const receiptUrlInBody = hasOwn(body, 'receiptUrl');
    const nextReceiptUrl = receiptUrlInBody ? normalizeReceiptUrl(body.receiptUrl) : undefined;
    const paymentMethod = body.paymentMethod
      ? normalizePaymentMethod(body.paymentMethod, nextType)
      : (existingTransaction.payment_method as PaymentMethod);

    const previousEffects = buildLedgerEffects({
      type: existingTransaction.type as TransactionType,
      amount: Number(existingTransaction.amount),
      walletId: existingTransaction.wallet_id,
      destinationWalletId: existingTransaction.destination_wallet_id,
    });
    const nextEffects = buildLedgerEffects({
      type: nextType,
      amount: nextAmount,
      walletId,
      destinationWalletId: nextDestinationWalletId,
    });
    const mergedEffects = mergeLedgerEffects(previousEffects, nextEffects);

    const transaction = await prisma.$transaction(async (tx) => {
      await applyLedgerEffects(tx, mergedEffects);

      return tx.transaction.update({
        where: { id: existingTransaction.id },
        data: {
          wallet_id: walletId,
          destination_wallet_id: nextType === 'TRANSFER' ? nextDestinationWalletId : null,
          category_id: categoryId,
          type: nextType,
          payment_method: paymentMethod,
          receipt_url: receiptUrlInBody ? nextReceiptUrl : undefined,
          amount: nextAmount,
          date: nextDate ?? undefined,
          description: nextDescription || undefined,
        },
        include: {
          category: true,
          wallet: true,
          destination_wallet: true,
        },
      });
    });

    await logWorkspaceEventSafe({
      workspaceId: context.workspaceId,
      userId: context.userId,
      type: 'transaction.updated',
      payload: {
        transactionId: transaction.id,
      },
    });

    const effectiveCategoryId = categoryId ?? existingTransaction.category_id;
    const effectiveDescription = nextDescription || existingTransaction.description;
    if (effectiveCategoryId && effectiveDescription) {
      let effectiveCategoryName = (body.category || '').trim();
      if (!effectiveCategoryName) {
        const categoryRecord = await prisma.category.findUnique({
          where: { id: effectiveCategoryId },
          select: { name: true },
        });
        effectiveCategoryName = categoryRecord?.name || '';
      }

      if (effectiveCategoryName) {
        await upsertCategorySuggestionSafe({
          workspaceId: context.workspaceId,
          categoryId: effectiveCategoryId,
          categoryName: effectiveCategoryName,
          description: effectiveDescription,
        });
      }
    }

    return NextResponse.json(transaction);
  } catch (error: any) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof Error && error.message.includes('Destination wallet')) {
      return NextResponse.json({ error: 'Conta destino ? obrigat?ria para transfer?ncia.' }, { status: 400 });
    }
    if (error instanceof Error && error.message.includes('Source and destination wallets')) {
      return NextResponse.json(
        { error: 'Conta origem e conta destino devem ser diferentes.' },
        { status: 400 }
      );
    }
    if (isSchemaMismatchError(error)) {
      return NextResponse.json({ error: SCHEMA_SYNC_REQUIRED_ERROR }, { status: 503 });
    }
    console.error('Transactions PATCH Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to update transaction' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const context = await resolveWorkspaceContext(req);
    const body = (await req.json().catch(() => null)) as DeleteTransactionBody | null;
    if (!body?.id) {
      return NextResponse.json({ error: 'Transaction id is required' }, { status: 400 });
    }

    const existingTransaction = await prisma.transaction.findFirst({
      where: {
        id: body.id,
        workspace_id: context.workspaceId,
      },
      select: {
        id: true,
        wallet_id: true,
        destination_wallet_id: true,
        amount: true,
        type: true,
      },
    });

    if (!existingTransaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    const previousEffects = buildLedgerEffects({
      type: existingTransaction.type as TransactionType,
      amount: Number(existingTransaction.amount),
      walletId: existingTransaction.wallet_id,
      destinationWalletId: existingTransaction.destination_wallet_id,
    }).map((effect) => ({
      walletId: effect.walletId,
      delta: -effect.delta,
    }));

    await prisma.$transaction(async (tx) => {
      await applyLedgerEffects(tx, previousEffects);
      await tx.transaction.delete({
        where: { id: existingTransaction.id },
      });
    });

    await logWorkspaceEventSafe({
      workspaceId: context.workspaceId,
      userId: context.userId,
      type: 'transaction.deleted',
      payload: {
        transactionId: existingTransaction.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (isSchemaMismatchError(error)) {
      return NextResponse.json({ error: SCHEMA_SYNC_REQUIRED_ERROR }, { status: 503 });
    }
    console.error('Transactions DELETE Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to delete transaction' },
      { status: 500 }
    );
  }
}
