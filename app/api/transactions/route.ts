import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { asPrismaServiceUnavailableError, prisma } from '@/lib/prisma';
import {
  TRANSACTION_PAYMENT_METHODS,
  TRANSACTION_STATUSES,
  TRANSACTION_TYPES,
  normalizeTransactionStatus,
  type TransactionPaymentMethod,
  type TransactionStatus,
  type TransactionType,
} from '@/lib/domain/financial-domain';
import {
  HttpError,
  getWorkspacePlan,
  logWorkspaceEventSafe,
  resolveWorkspaceContext,
} from '@/lib/server/multi-tenant';
import { getRuntimePlanLimits, getTransactionUsageEffectiveOffset } from '@/lib/server/superadmin-governance';
import { syncWorkspaceFinancialCalendarSourcesSafe } from '@/lib/server/financial-calendar';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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
  dueDate?: string | null;
  status?: string;
  originType?: string;
  originId?: string | null;
};

type UpdateTransactionBody = CreateTransactionBody & {
  id?: string;
};

type DeleteTransactionBody = {
  id?: string;
};

const VALID_TYPES = new Set<TransactionType>(TRANSACTION_TYPES);
const VALID_PAYMENT_METHODS = new Set<TransactionPaymentMethod>(TRANSACTION_PAYMENT_METHODS);
const VALID_STATUSES = new Set<TransactionStatus>(TRANSACTION_STATUSES);
const VALID_ORIGIN_TYPES = new Set(['MANUAL', 'RECURRENCE', 'INSTALLMENT', 'DEBT', 'GOAL', 'SYSTEM']);

const SCHEMA_SYNC_REQUIRED_ERROR =
  'Banco de dados desatualizado para transações. Rode a migration/db push para adicionar destination_wallet_id, payment_method e receipt_url.';

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
  if (normalizedFlowType === 'transferencia' || normalizedFlowType === 'transferência') {
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
    return 'CARD' as TransactionPaymentMethod;
  }
  if (
    normalizedMethod === 'TRANSFERENCIA_BANCARIA' ||
    normalizedMethod === 'TRANSFERÊNCIA_BANCÁRIA' ||
    normalizedMethod === 'TRANSFERENCIA'
  ) {
    return 'BANK_TRANSFER' as TransactionPaymentMethod;
  }
  if (normalizedMethod === 'DINHEIRO') {
    return 'CASH' as TransactionPaymentMethod;
  }
  if (normalizedMethod === 'DEBITO' || normalizedMethod === 'DÉBITO') {
    return 'DEBIT' as TransactionPaymentMethod;
  }
  if (VALID_PAYMENT_METHODS.has(normalizedMethod as TransactionPaymentMethod)) {
    return normalizedMethod as TransactionPaymentMethod;
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

const normalizeOriginType = (rawOriginType: unknown) => {
  const normalized = String(rawOriginType || 'MANUAL').trim().toUpperCase();
  return VALID_ORIGIN_TYPES.has(normalized) ? normalized : 'MANUAL';
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

async function findTransactionsWithCompatibility(params: {
  workspaceId: string;
  limit: number;
  cursor?: string | null;
}) {
  const query = {
    where: { workspace_id: params.workspaceId },
    orderBy: [{ date: 'desc' as const }, { id: 'desc' as const }],
    take: params.limit + 1,
    ...(params.cursor
      ? {
          cursor: { id: params.cursor },
          skip: 1,
        }
      : {}),
  };

  try {
    const rows = await prisma.transaction.findMany({
      ...query,
      include: {
        category: true,
        wallet: true,
        destination_wallet: true,
      },
    });
    const hasMore = rows.length > params.limit;
    const items = hasMore ? rows.slice(0, params.limit) : rows;
    const nextCursor = hasMore ? items[items.length - 1]?.id || null : null;
    return { items, hasMore, nextCursor };
  } catch (error) {
    if (!isSchemaMismatchError(error)) {
      throw error;
    }

    const rows = await prisma.transaction.findMany({
      ...query,
      include: {
        category: true,
        wallet: true,
      },
    });
    const hasMore = rows.length > params.limit;
    const items = hasMore ? rows.slice(0, params.limit) : rows;
    const nextCursor = hasMore ? items[items.length - 1]?.id || null : null;
    return { items, hasMore, nextCursor };
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
    const url = new URL(req.url);
    const requestedLimit = Number(url.searchParams.get('limit') || '50');
    const limit = Number.isFinite(requestedLimit)
      ? Math.max(1, Math.min(200, Math.floor(requestedLimit)))
      : 50;
    const cursor = url.searchParams.get('cursor');
    const paginatedMode = url.searchParams.get('paginated') === '1' || Boolean(cursor) || url.searchParams.has('limit');

    const result = await findTransactionsWithCompatibility({
      workspaceId: context.workspaceId,
      limit: paginatedMode ? limit : 200,
      cursor: paginatedMode ? cursor : null,
    });

    if (!paginatedMode) {
      return NextResponse.json(result.items);
    }

    return NextResponse.json({
      items: result.items,
      hasMore: result.hasMore,
      nextCursor: result.nextCursor,
    });
  } catch (error: any) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (isSchemaMismatchError(error)) {
      return NextResponse.json({ error: SCHEMA_SYNC_REQUIRED_ERROR }, { status: 503 });
    }
    const prismaError = asPrismaServiceUnavailableError(error);
    if (prismaError) {
      return NextResponse.json({ error: prismaError.message }, { status: 503 });
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
    const planLimits = await getRuntimePlanLimits(plan);

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
    const dueDateInBody = Object.prototype.hasOwnProperty.call(body, 'dueDate');
    const dueDate = dueDateInBody
      ? body.dueDate === null || body.dueDate === ''
        ? null
        : parseDate(body.dueDate)
      : null;
    if (dueDateInBody && body.dueDate !== null && body.dueDate !== '' && !dueDate) {
      return NextResponse.json({ error: 'Invalid due date' }, { status: 400 });
    }
    const status = normalizeTransactionStatus(body.status, 'CONFIRMED');
    if (!VALID_STATUSES.has(status)) {
      return NextResponse.json({ error: 'Invalid transaction status' }, { status: 400 });
    }
    const originType = normalizeOriginType(body.originType);
    const originId = typeof body.originId === 'string' ? body.originId.trim() : null;
    if (originType !== 'MANUAL' && !originId) {
      return NextResponse.json(
        { error: 'originId is required when originType is not MANUAL' },
        { status: 400 }
      );
    }
    const effectiveOriginId = originType === 'MANUAL' ? null : originId;

    const description = (body.description || '').trim();
    if (!description) {
      return NextResponse.json({ error: 'Description is required' }, { status: 400 });
    }
    const receiptUrl = normalizeReceiptUrl(body.receiptUrl);

    const transactionLimit = planLimits.transactionsPerMonth;

    if (typeof transactionLimit === 'number') {
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
      const transactionOffset = await getTransactionUsageEffectiveOffset(context.workspaceId);
      const effectiveCurrentMonthCount = Math.max(0, currentMonthCount + transactionOffset);

      if (effectiveCurrentMonthCount >= transactionLimit) {
        return NextResponse.json(
          {
            error: `Transaction limit reached for ${plan}. Upgrade to continue.`,
            code: 'PLAN_LIMIT_REACHED',
            limit: transactionLimit,
            plan,
          },
          { status: 403 }
        );
      }
    }

    const destinationWalletName = (body.destinationWallet || '').trim();
    if (type === 'TRANSFER' && !destinationWalletName) {
      return NextResponse.json({ error: 'Conta destino é obrigatória para transferência.' }, { status: 400 });
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

    const ledgerEffects =
      status === 'CONFIRMED'
        ? buildLedgerEffects({
            type,
            amount,
            walletId,
            destinationWalletId,
          })
        : [];

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
          due_date: dueDate,
          description,
          status,
          origin_type: originType,
          origin_id: effectiveOriginId,
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
        status,
        originType,
      },
    });

    await upsertCategorySuggestionSafe({
      workspaceId: context.workspaceId,
      categoryId,
      categoryName: normalizedCategoryName,
      description,
    });
    await syncWorkspaceFinancialCalendarSourcesSafe(context.workspaceId);

    return NextResponse.json(transaction);
  } catch (error: any) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof Error && error.message.includes('Destination wallet')) {
      return NextResponse.json({ error: 'Conta destino é obrigatória para transferência.' }, { status: 400 });
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
    const prismaError = asPrismaServiceUnavailableError(error);
    if (prismaError) {
      return NextResponse.json({ error: prismaError.message }, { status: 503 });
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
    const dueDateInBody = Object.prototype.hasOwnProperty.call(body, 'dueDate');
    const nextDueDate = dueDateInBody
      ? body.dueDate === null || body.dueDate === ''
        ? null
        : parseDate(body.dueDate)
      : undefined;
    if (dueDateInBody && body.dueDate !== null && body.dueDate !== '' && !nextDueDate) {
      return NextResponse.json({ error: 'Invalid due date' }, { status: 400 });
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
            { error: 'Conta destino é obrigatória para transferência.' },
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
      : (existingTransaction.payment_method as TransactionPaymentMethod);

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
          due_date: nextDueDate,
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
    await syncWorkspaceFinancialCalendarSourcesSafe(context.workspaceId);

    return NextResponse.json(transaction);
  } catch (error: any) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof Error && error.message.includes('Destination wallet')) {
      return NextResponse.json({ error: 'Conta destino é obrigatória para transferência.' }, { status: 400 });
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
    const prismaError = asPrismaServiceUnavailableError(error);
    if (prismaError) {
      return NextResponse.json({ error: prismaError.message }, { status: 503 });
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
    await syncWorkspaceFinancialCalendarSourcesSafe(context.workspaceId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (isSchemaMismatchError(error)) {
      return NextResponse.json({ error: SCHEMA_SYNC_REQUIRED_ERROR }, { status: 503 });
    }
    const prismaError = asPrismaServiceUnavailableError(error);
    if (prismaError) {
      return NextResponse.json({ error: prismaError.message }, { status: 503 });
    }
    console.error('Transactions DELETE Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to delete transaction' },
      { status: 500 }
    );
  }
}



