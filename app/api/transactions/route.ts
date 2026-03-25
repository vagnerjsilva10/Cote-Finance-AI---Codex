import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import {
  asPrismaServiceUnavailableError,
  classifyPrismaRuntimeError,
  DATABASE_SCHEMA_MISMATCH_MESSAGE,
  getDatabaseRuntimeInfo,
  prisma,
} from '@/lib/prisma';
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
import { triggerWorkspaceFinancialSync } from '@/lib/server/financial-sync';

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
  DATABASE_SCHEMA_MISMATCH_MESSAGE;

const FRIENDLY_TRANSACTION_SAVE_ERROR =
  'Não foi possível salvar a transação agora. Tente novamente em instantes.';
const FRIENDLY_TRANSACTION_UPDATE_ERROR =
  'Não foi possível atualizar a transação agora. Tente novamente em instantes.';
const FRIENDLY_TRANSACTION_DELETE_ERROR =
  'Não foi possível excluir a transação agora. Tente novamente em instantes.';

const hasOwn = <K extends string>(obj: object, key: K) =>
  Object.prototype.hasOwnProperty.call(obj, key);

const nowMs = () => performance.now();

const elapsedMs = (startedAt: number) => Number((performance.now() - startedAt).toFixed(1));

async function measureStep<T>(
  metrics: Record<string, number>,
  label: string,
  action: () => Promise<T>
) {
  const startedAt = nowMs();
  try {
    return await action();
  } finally {
    metrics[label] = elapsedMs(startedAt);
  }
}

function apiErrorResponse(
  status: number,
  code: string,
  message: string,
  extra?: Record<string, unknown>
) {
  return NextResponse.json(
    {
      code,
      message,
      error: message,
      ...extra,
    },
    { status }
  );
}

function logTransactionRequest(
  level: 'info' | 'warn' | 'error',
  event: string,
  payload: Record<string, unknown>
) {
  console[level](`[transactions] ${event}`, {
    ...payload,
    database: getDatabaseRuntimeInfo(),
  });
}

const isSchemaMismatchError = (error: unknown) => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === 'P2021' || error.code === 'P2022';
  }
  if (error instanceof Prisma.PrismaClientValidationError) {
    return error.message.includes('Unknown argument');
  }
  return false;
};

const LEGACY_OPTIONAL_WRITE_COLUMNS = new Set([
  'destination_wallet_id',
  'payment_method',
  'receipt_url',
  'origin_type',
  'origin_id',
]);

function getMissingColumnFromKnownRequestError(error: Prisma.PrismaClientKnownRequestError) {
  const candidates = [
    error.meta?.column,
    error.meta?.field_name,
    error.meta?.target,
    error.meta?.message,
  ]
    .filter((value): value is string => typeof value === 'string' && value.length > 0)
    .map((value) => value.toLowerCase());

  for (const candidate of candidates) {
    for (const column of LEGACY_OPTIONAL_WRITE_COLUMNS) {
      if (candidate.includes(column)) {
        return column;
      }
    }
  }

  return null;
}

function shouldUseCompatibilityCreateFallback(error: unknown) {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    return false;
  }
  if (error.code !== 'P2022') {
    return false;
  }
  const missingColumn = getMissingColumnFromKnownRequestError(error);
  return missingColumn ? LEGACY_OPTIONAL_WRITE_COLUMNS.has(missingColumn) : false;
}

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
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
  if (normalizedFlowType === 'receita' || normalizedFlowType === 'entrada' || normalizedFlowType === 'pix in') {
    return 'INCOME';
  }
  if (normalizedFlowType === 'despesa' || normalizedFlowType === 'pix out') {
    return 'EXPENSE';
  }
  if (normalizedFlowType === 'transferencia') {
    return 'TRANSFER';
  }

  return null;
};

const normalizePaymentMethod = (rawMethod: string | undefined, transactionType: TransactionType) => {
  const normalizedMethod = String(rawMethod || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_');

  if (normalizedMethod === 'CARTAO' || normalizedMethod === 'CREDIT_CARD') {
    return 'CARD' as TransactionPaymentMethod;
  }
  if (normalizedMethod === 'TRANSFERENCIA_BANCARIA' || normalizedMethod === 'TRANSFERENCIA') {
    return 'BANK_TRANSFER' as TransactionPaymentMethod;
  }
  if (normalizedMethod === 'DINHEIRO') {
    return 'CASH' as TransactionPaymentMethod;
  }
  if (normalizedMethod === 'DEBITO') {
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
  const wallet = await prisma.wallet.upsert({
    where: {
      workspace_id_name: {
        workspace_id: workspaceId,
        name: normalizedWalletName,
      },
    },
    update: {},
    create: {
      workspace_id: workspaceId,
      name: normalizedWalletName,
      type: 'CASH',
      balance: 0,
    },
    select: {
      id: true,
    },
  });

  return wallet.id;
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

async function findTransactionByIdWithRelations(id: string, workspaceId: string) {
  try {
    return await prisma.transaction.findFirst({
      where: {
        id,
        workspace_id: workspaceId,
      },
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

    return prisma.transaction.findFirst({
      where: {
        id,
        workspace_id: workspaceId,
      },
      include: {
        category: true,
        wallet: true,
      },
    });
  }
}

async function findTransactionForMutation(id: string, workspaceId: string) {
  try {
    return await prisma.transaction.findFirst({
      where: {
        id,
        workspace_id: workspaceId,
      },
      select: {
        id: true,
        wallet_id: true,
        destination_wallet_id: true,
        amount: true,
        type: true,
        status: true,
        payment_method: true,
        category_id: true,
        description: true,
      },
    });
  } catch (error) {
    if (!isSchemaMismatchError(error)) {
      throw error;
    }

    const legacyTransaction = await prisma.transaction.findFirst({
      where: {
        id,
        workspace_id: workspaceId,
      },
      select: {
        id: true,
        wallet_id: true,
        amount: true,
        type: true,
        status: true,
        category_id: true,
        description: true,
      },
    });

    if (!legacyTransaction) {
      return null;
    }

    return {
      ...legacyTransaction,
      destination_wallet_id: null,
      payment_method: 'OTHER',
    };
  }
}

async function findTransactionForDelete(id: string, workspaceId: string) {
  try {
    return await prisma.transaction.findFirst({
      where: {
        id,
        workspace_id: workspaceId,
      },
      select: {
        id: true,
        wallet_id: true,
        destination_wallet_id: true,
        amount: true,
        type: true,
        status: true,
      },
    });
  } catch (error) {
    if (!isSchemaMismatchError(error)) {
      throw error;
    }

    const legacyTransaction = await prisma.transaction.findFirst({
      where: {
        id,
        workspace_id: workspaceId,
      },
      select: {
        id: true,
        wallet_id: true,
        amount: true,
        type: true,
        status: true,
      },
    });

    if (!legacyTransaction) {
      return null;
    }

    return {
      ...legacyTransaction,
      destination_wallet_id: null,
    };
  }
}

async function runCreateTransactionWriteBatch(params: {
  workspaceId: string;
  walletId: string;
  destinationWalletId: string | null;
  categoryId: string;
  type: TransactionType;
  paymentMethod: TransactionPaymentMethod;
  receiptUrl: string | null;
  amount: number;
  date: Date;
  dueDate: Date | null;
  description: string;
  status: TransactionStatus;
  originType: string;
  originId: string | null;
  ledgerEffects: Array<{ walletId: string; delta: number }>;
}) {
  try {
    return await prisma.$transaction([
      prisma.transaction.create({
        data: {
          workspace_id: params.workspaceId,
          wallet_id: params.walletId,
          destination_wallet_id: params.destinationWalletId,
          category_id: params.categoryId,
          type: params.type,
          payment_method: params.paymentMethod,
          receipt_url: params.receiptUrl,
          amount: params.amount,
          date: params.date,
          due_date: params.dueDate,
          description: params.description,
          status: params.status,
          origin_type: params.originType,
          origin_id: params.originId,
        },
        select: {
          id: true,
        },
      }),
      ...params.ledgerEffects.map((effect) =>
        prisma.wallet.update({
          where: { id: effect.walletId },
          data: {
            balance: {
              increment: effect.delta,
            },
          },
        })
      ),
    ]);
  } catch (error) {
    if (!shouldUseCompatibilityCreateFallback(error)) {
      throw error;
    }
    if (params.type === 'TRANSFER') {
      throw error;
    }

    return prisma.$transaction([
      prisma.transaction.create({
        data: {
          workspace_id: params.workspaceId,
          wallet_id: params.walletId,
          category_id: params.categoryId,
          type: params.type,
          amount: params.amount,
          date: params.date,
          due_date: params.dueDate,
          description: params.description,
          status: params.status,
        },
        select: {
          id: true,
        },
      }),
      ...params.ledgerEffects.map((effect) =>
        prisma.wallet.update({
          where: { id: effect.walletId },
          data: {
            balance: {
              increment: effect.delta,
            },
          },
        })
      ),
    ]);
  }
}

async function runUpdateTransactionWriteBatch(params: {
  transactionId: string;
  walletId: string;
  destinationWalletId: string | null;
  categoryId?: string;
  type: TransactionType;
  paymentMethod: TransactionPaymentMethod;
  receiptUrlInBody: boolean;
  nextReceiptUrl?: string | null;
  nextAmount: number;
  nextDate?: Date | null;
  nextDueDate?: Date | null;
  nextDescription: string;
  mergedEffects: Array<{ walletId: string; delta: number }>;
}) {
  const baseWalletOps = params.mergedEffects.map((effect) =>
    prisma.wallet.update({
      where: { id: effect.walletId },
      data: {
        balance: {
          increment: effect.delta,
        },
      },
    })
  );

  try {
    return await prisma.$transaction([
      ...baseWalletOps,
      prisma.transaction.update({
        where: { id: params.transactionId },
        data: {
          wallet_id: params.walletId,
          destination_wallet_id: params.type === 'TRANSFER' ? params.destinationWalletId : null,
          category_id: params.categoryId,
          type: params.type,
          payment_method: params.paymentMethod,
          receipt_url: params.receiptUrlInBody ? params.nextReceiptUrl : undefined,
          amount: params.nextAmount,
          date: params.nextDate ?? undefined,
          due_date: params.nextDueDate,
          description: params.nextDescription || undefined,
        },
        select: {
          id: true,
        },
      }),
    ]);
  } catch (error) {
    if (!isSchemaMismatchError(error)) {
      throw error;
    }
    if (params.type === 'TRANSFER') {
      throw error;
    }

    return prisma.$transaction([
      ...baseWalletOps,
      prisma.transaction.update({
        where: { id: params.transactionId },
        data: {
          wallet_id: params.walletId,
          category_id: params.categoryId,
          type: params.type,
          amount: params.nextAmount,
          date: params.nextDate ?? undefined,
          due_date: params.nextDueDate,
          description: params.nextDescription || undefined,
        },
        select: {
          id: true,
        },
      }),
    ]);
  }
}

function buildWriteFailureResponse(params: {
  error: unknown;
  routeLabel: 'create' | 'update' | 'delete';
  routeStartedAt: number;
  metrics: Record<string, number>;
  workspaceId?: string;
  userId?: string;
}) {
  const classified = classifyPrismaRuntimeError(params.error);
  const friendlyMessage =
    params.routeLabel === 'create'
      ? FRIENDLY_TRANSACTION_SAVE_ERROR
      : params.routeLabel === 'update'
        ? FRIENDLY_TRANSACTION_UPDATE_ERROR
        : FRIENDLY_TRANSACTION_DELETE_ERROR;

  if (classified && classified.kind !== 'UNKNOWN') {
    logTransactionRequest('error', `${params.routeLabel}.failed`, {
      workspaceId: params.workspaceId,
      userId: params.userId,
      totalMs: elapsedMs(params.routeStartedAt),
      metrics: params.metrics,
      errorKind: classified.kind,
      detail: classified.detail,
    });

    return apiErrorResponse(503, classified.kind, friendlyMessage, {
      retryable: true,
    });
  }

  return null;
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
  const routeStartedAt = nowMs();
  const metrics: Record<string, number> = {};
  let context!: Awaited<ReturnType<typeof resolveWorkspaceContext>>;

  try {
    context = await measureStep(metrics, 'resolve_workspace_ms', () => resolveWorkspaceContext(req));
    if (!context) {
      throw new Error('Workspace context could not be resolved');
    }
    const plan = await measureStep(metrics, 'resolve_plan_ms', () =>
      getWorkspacePlan(context.workspaceId, context.userId)
    );
    const planLimits = await measureStep(metrics, 'resolve_plan_limits_ms', () =>
      getRuntimePlanLimits(plan)
    );

    const body = (await req.json().catch(() => null)) as CreateTransactionBody | null;
    if (!body) {
      return apiErrorResponse(400, 'INVALID_REQUEST_BODY', 'Invalid request body');
    }

    const type = normalizeTransactionType(body.type, body.flowType);
    if (!type) {
      return apiErrorResponse(400, 'INVALID_TRANSACTION_TYPE', 'Invalid transaction type');
    }

    const amount = parseAmount(body.amount);
    if (!amount || amount <= 0) {
      return apiErrorResponse(400, 'INVALID_AMOUNT', 'Invalid amount');
    }

    const date = parseDate(body.date);
    if (!date) {
      return apiErrorResponse(400, 'INVALID_DATE', 'Invalid date');
    }
    const dueDateInBody = Object.prototype.hasOwnProperty.call(body, 'dueDate');
    const dueDate = dueDateInBody
      ? body.dueDate === null || body.dueDate === ''
        ? null
        : parseDate(body.dueDate)
      : null;
    if (dueDateInBody && body.dueDate !== null && body.dueDate !== '' && !dueDate) {
      return apiErrorResponse(400, 'INVALID_DUE_DATE', 'Invalid due date');
    }
    const status = normalizeTransactionStatus(body.status, 'CONFIRMED');
    if (!VALID_STATUSES.has(status)) {
      return apiErrorResponse(400, 'INVALID_TRANSACTION_STATUS', 'Invalid transaction status');
    }
    const originType = normalizeOriginType(body.originType);
    const originId = typeof body.originId === 'string' ? body.originId.trim() : null;
    if (originType !== 'MANUAL' && !originId) {
      return apiErrorResponse(
        400,
        'INVALID_ORIGIN_ID',
        'originId is required when originType is not MANUAL'
      );
    }
    const effectiveOriginId = originType === 'MANUAL' ? null : originId;

    const description = (body.description || '').trim();
    if (!description) {
      return apiErrorResponse(400, 'DESCRIPTION_REQUIRED', 'Description is required');
    }
    const receiptUrl = normalizeReceiptUrl(body.receiptUrl);

    const transactionLimit = planLimits.transactionsPerMonth;

    if (typeof transactionLimit === 'number') {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);

      const [currentMonthCount, transactionOffset] = await Promise.all([
        measureStep(metrics, 'count_transactions_ms', () =>
          prisma.transaction.count({
            where: {
              workspace_id: context.workspaceId,
              date: {
                gte: monthStart,
                lt: nextMonthStart,
              },
            },
          })
        ),
        measureStep(metrics, 'resolve_usage_offset_ms', () =>
          getTransactionUsageEffectiveOffset(context.workspaceId)
        ),
      ]);
      const effectiveCurrentMonthCount = Math.max(0, currentMonthCount + transactionOffset);

      if (effectiveCurrentMonthCount >= transactionLimit) {
        return apiErrorResponse(
          403,
          'PLAN_LIMIT_REACHED',
          `Transaction limit reached for ${plan}. Upgrade to continue.`,
          {
            limit: transactionLimit,
            plan,
          }
        );
      }
    }

    const destinationWalletName = (body.destinationWallet || '').trim();
    if (type === 'TRANSFER' && !destinationWalletName) {
      return apiErrorResponse(
        400,
        'DESTINATION_WALLET_REQUIRED',
        'Conta destino e obrigatoria para transferencia.'
      );
    }
    const normalizedCategoryName = (body.category || '').trim() || 'Outros';
    const [walletId, categoryId, destinationWalletId] = await Promise.all([
      measureStep(metrics, 'resolve_wallet_ms', () =>
        getOrCreateWalletId(context.workspaceId, body.wallet)
      ),
      measureStep(metrics, 'resolve_category_ms', () =>
        getOrCreateCategoryId(normalizedCategoryName)
      ),
      type === 'TRANSFER'
        ? measureStep(metrics, 'resolve_destination_wallet_ms', () =>
            getOrCreateWalletId(context.workspaceId, destinationWalletName)
          )
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

    const [createdTransaction] = await measureStep(metrics, 'write_batch_tx_ms', () =>
      runCreateTransactionWriteBatch({
        workspaceId: context.workspaceId,
        walletId,
        destinationWalletId,
        categoryId,
        type,
        paymentMethod,
        receiptUrl,
        amount,
        date,
        dueDate,
        description,
        status,
        originType,
        originId: effectiveOriginId,
        ledgerEffects,
      })
    );

    const transaction = await measureStep(metrics, 'fetch_created_transaction_ms', async () => {
      const found = await findTransactionByIdWithRelations(createdTransaction.id, context.workspaceId);
      if (!found) {
        throw new Error('Created transaction could not be reloaded');
      }
      return found;
    });

    void logWorkspaceEventSafe({
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

    void upsertCategorySuggestionSafe({
      workspaceId: context.workspaceId,
      categoryId,
      categoryName: normalizedCategoryName,
      description,
    });
    void triggerWorkspaceFinancialSync({ workspaceId: context.workspaceId });

    logTransactionRequest('info', 'create.completed', {
      workspaceId: context.workspaceId,
      userId: context.userId,
      transactionId: transaction.id,
      totalMs: elapsedMs(routeStartedAt),
      metrics,
      type,
      status,
      paymentMethod,
    });

    return NextResponse.json(transaction);
  } catch (error: any) {
    if (error instanceof HttpError) {
      return apiErrorResponse(error.status, 'WORKSPACE_ERROR', error.message);
    }
    const writeFailureResponse = buildWriteFailureResponse({
      error,
      routeLabel: 'create',
      routeStartedAt,
      metrics,
      workspaceId: context?.workspaceId,
      userId: context?.userId,
    });
    if (writeFailureResponse) {
      return writeFailureResponse;
    }
    if (error instanceof Error && error.message.includes('Destination wallet')) {
      return NextResponse.json({ error: 'Conta destino e obrigatoria para transferencia.' }, { status: 400 });
    }
    if (error instanceof Error && error.message.includes('Source and destination wallets')) {
      return NextResponse.json(
        { error: 'Conta origem e conta destino devem ser diferentes.' },
        { status: 400 }
      );
    }
    if (isSchemaMismatchError(error)) {
      return apiErrorResponse(503, 'SCHEMA_MISMATCH', SCHEMA_SYNC_REQUIRED_ERROR);
    }
    const prismaError = asPrismaServiceUnavailableError(error);
    if (prismaError) {
      logTransactionRequest('error', 'create.db_unavailable', {
        workspaceId: context?.workspaceId,
        userId: context?.userId,
        totalMs: elapsedMs(routeStartedAt),
        metrics,
        detail: prismaError.detail || prismaError.message,
      });
      return apiErrorResponse(503, 'DB_UNAVAILABLE', FRIENDLY_TRANSACTION_SAVE_ERROR, {
        retryable: true,
      });
    }
    logTransactionRequest('error', 'create.failed', {
      workspaceId: context?.workspaceId,
      userId: context?.userId,
      totalMs: elapsedMs(routeStartedAt),
      metrics,
      detail: error instanceof Error ? error.message : String(error || 'Unknown error'),
    });
    return apiErrorResponse(500, 'TRANSACTION_CREATE_FAILED', FRIENDLY_TRANSACTION_SAVE_ERROR);
  }
}

export async function PATCH(req: Request) {
  const routeStartedAt = nowMs();
  const metrics: Record<string, number> = {};
  let context!: Awaited<ReturnType<typeof resolveWorkspaceContext>>;

  try {
    context = await measureStep(metrics, 'resolve_workspace_ms', () => resolveWorkspaceContext(req));
    if (!context) {
      throw new Error('Workspace context could not be resolved');
    }
    const body = (await req.json().catch(() => null)) as UpdateTransactionBody | null;
    if (!body?.id) {
      return apiErrorResponse(400, 'TRANSACTION_ID_REQUIRED', 'Transaction id is required');
    }

    const existingTransaction = await measureStep(metrics, 'load_existing_transaction_ms', () =>
      findTransactionForMutation(body.id as string, context.workspaceId)
    );

    if (!existingTransaction) {
      return apiErrorResponse(404, 'TRANSACTION_NOT_FOUND', 'Transaction not found');
    }

    const nextType =
      normalizeTransactionType(body.type, body.flowType) || (existingTransaction.type as TransactionType);
    if (!VALID_TYPES.has(nextType)) {
      return apiErrorResponse(400, 'INVALID_TRANSACTION_TYPE', 'Invalid transaction type');
    }

    const parsedAmount = parseAmount(body.amount);
    const nextAmount = parsedAmount && parsedAmount > 0 ? parsedAmount : Number(existingTransaction.amount);
    if (!nextAmount || nextAmount <= 0) {
      return apiErrorResponse(400, 'INVALID_AMOUNT', 'Invalid amount');
    }

    const nextDate = body.date ? parseDate(body.date) : null;
    if (body.date && !nextDate) {
      return apiErrorResponse(400, 'INVALID_DATE', 'Invalid date');
    }
    const dueDateInBody = Object.prototype.hasOwnProperty.call(body, 'dueDate');
    const nextDueDate = dueDateInBody
      ? body.dueDate === null || body.dueDate === ''
        ? null
        : parseDate(body.dueDate)
      : undefined;
    if (dueDateInBody && body.dueDate !== null && body.dueDate !== '' && !nextDueDate) {
      return apiErrorResponse(400, 'INVALID_DUE_DATE', 'Invalid due date');
    }

    const walletId = body.wallet
      ? await measureStep(metrics, 'resolve_wallet_ms', () =>
          getOrCreateWalletId(context.workspaceId, body.wallet)
        )
      : existingTransaction.wallet_id;

    const destinationWalletInBody = Object.prototype.hasOwnProperty.call(body, 'destinationWallet');
    let nextDestinationWalletId: string | null = null;
    if (nextType === 'TRANSFER') {
      if (destinationWalletInBody) {
        const destinationWalletName = (body.destinationWallet || '').trim();
        if (!destinationWalletName) {
          return apiErrorResponse(
            400,
            'DESTINATION_WALLET_REQUIRED',
            'Conta destino e obrigatoria para transferencia.'
          );
        }
        nextDestinationWalletId = await measureStep(metrics, 'resolve_destination_wallet_ms', () =>
          getOrCreateWalletId(context.workspaceId, destinationWalletName)
        );
      } else {
        nextDestinationWalletId = existingTransaction.destination_wallet_id;
      }
    }

    const categoryId = body.category
      ? await measureStep(metrics, 'resolve_category_ms', () => getOrCreateCategoryId(body.category))
      : undefined;
    const nextDescription = (body.description || '').trim();
    const receiptUrlInBody = hasOwn(body, 'receiptUrl');
    const nextReceiptUrl = receiptUrlInBody ? normalizeReceiptUrl(body.receiptUrl) : undefined;
    const paymentMethod = body.paymentMethod
      ? normalizePaymentMethod(body.paymentMethod, nextType)
      : (existingTransaction.payment_method as TransactionPaymentMethod);

    const existingStatus = normalizeTransactionStatus(existingTransaction.status, 'CONFIRMED');
    const previousEffects =
      existingStatus === 'CONFIRMED'
        ? buildLedgerEffects({
            type: existingTransaction.type as TransactionType,
            amount: Number(existingTransaction.amount),
            walletId: existingTransaction.wallet_id,
            destinationWalletId: existingTransaction.destination_wallet_id,
          })
        : [];
    const nextEffects =
      existingStatus === 'CONFIRMED'
        ? buildLedgerEffects({
            type: nextType,
            amount: nextAmount,
            walletId,
            destinationWalletId: nextDestinationWalletId,
          })
        : [];
    const mergedEffects = mergeLedgerEffects(previousEffects, nextEffects);

    await measureStep(metrics, 'write_batch_tx_ms', () =>
      runUpdateTransactionWriteBatch({
        transactionId: existingTransaction.id,
        walletId,
        destinationWalletId: nextDestinationWalletId,
        categoryId,
        type: nextType,
        paymentMethod,
        receiptUrlInBody,
        nextReceiptUrl,
        nextAmount,
        nextDate,
        nextDueDate,
        nextDescription,
        mergedEffects,
      })
    );

    const transaction = await measureStep(metrics, 'fetch_updated_transaction_ms', async () => {
      const found = await findTransactionByIdWithRelations(existingTransaction.id, context.workspaceId);
      if (!found) {
        throw new Error('Updated transaction could not be reloaded');
      }
      return found;
    });

    void logWorkspaceEventSafe({
      workspaceId: context.workspaceId,
      userId: context.userId,
      type: 'transaction.updated',
      payload: {
        transactionId: transaction.id,
      },
    });

    const effectiveCategoryId = categoryId ?? existingTransaction.category_id;
    const effectiveDescription = nextDescription || existingTransaction.description;
    const effectiveCategoryName = (body.category || '').trim();
    if (effectiveCategoryId && effectiveDescription && effectiveCategoryName) {
      void upsertCategorySuggestionSafe({
        workspaceId: context.workspaceId,
        categoryId: effectiveCategoryId,
        categoryName: effectiveCategoryName,
        description: effectiveDescription,
      });
    }
    void triggerWorkspaceFinancialSync({ workspaceId: context.workspaceId });

    logTransactionRequest('info', 'update.completed', {
      workspaceId: context.workspaceId,
      userId: context.userId,
      transactionId: transaction.id,
      totalMs: elapsedMs(routeStartedAt),
      metrics,
    });

    return NextResponse.json(transaction);
  } catch (error: any) {
    if (error instanceof HttpError) {
      return apiErrorResponse(error.status, 'WORKSPACE_ERROR', error.message);
    }
    if (error instanceof Error && error.message.includes('Destination wallet')) {
      return NextResponse.json({ error: 'Conta destino e obrigatoria para transferencia.' }, { status: 400 });
    }
    if (error instanceof Error && error.message.includes('Source and destination wallets')) {
      return NextResponse.json(
        { error: 'Conta origem e conta destino devem ser diferentes.' },
        { status: 400 }
      );
    }
    if (isSchemaMismatchError(error)) {
      return apiErrorResponse(503, 'SCHEMA_MISMATCH', SCHEMA_SYNC_REQUIRED_ERROR);
    }
    const prismaError = asPrismaServiceUnavailableError(error);
    if (prismaError) {
      logTransactionRequest('error', 'update.db_unavailable', {
        workspaceId: context?.workspaceId,
        userId: context?.userId,
        totalMs: elapsedMs(routeStartedAt),
        metrics,
        detail: prismaError.detail || prismaError.message,
      });
      return apiErrorResponse(503, 'DB_UNAVAILABLE', FRIENDLY_TRANSACTION_UPDATE_ERROR, {
        retryable: true,
      });
    }
    logTransactionRequest('error', 'update.failed', {
      workspaceId: context?.workspaceId,
      userId: context?.userId,
      totalMs: elapsedMs(routeStartedAt),
      metrics,
      detail: error instanceof Error ? error.message : String(error || 'Unknown error'),
    });
    return apiErrorResponse(500, 'TRANSACTION_UPDATE_FAILED', FRIENDLY_TRANSACTION_UPDATE_ERROR);
  }
}

export async function DELETE(req: Request) {
  const routeStartedAt = nowMs();
  const metrics: Record<string, number> = {};
  let context!: Awaited<ReturnType<typeof resolveWorkspaceContext>>;

  try {
    context = await measureStep(metrics, 'resolve_workspace_ms', () => resolveWorkspaceContext(req));
    if (!context) {
      throw new Error('Workspace context could not be resolved');
    }
    const body = (await req.json().catch(() => null)) as DeleteTransactionBody | null;
    if (!body?.id) {
      return apiErrorResponse(400, 'TRANSACTION_ID_REQUIRED', 'Transaction id is required');
    }

    const existingTransaction = await measureStep(metrics, 'load_existing_transaction_ms', () =>
      findTransactionForDelete(body.id as string, context.workspaceId)
    );

    if (!existingTransaction) {
      return apiErrorResponse(404, 'TRANSACTION_NOT_FOUND', 'Transaction not found');
    }

    const previousEffects =
      normalizeTransactionStatus(existingTransaction.status, 'CONFIRMED') === 'CONFIRMED'
        ? buildLedgerEffects({
            type: existingTransaction.type as TransactionType,
            amount: Number(existingTransaction.amount),
            walletId: existingTransaction.wallet_id,
            destinationWalletId: existingTransaction.destination_wallet_id,
          }).map((effect) => ({
            walletId: effect.walletId,
            delta: -effect.delta,
          }))
        : [];

    await measureStep(metrics, 'write_batch_tx_ms', () =>
      prisma.$transaction([
        ...previousEffects.map((effect) =>
          prisma.wallet.update({
            where: { id: effect.walletId },
            data: {
              balance: {
                increment: effect.delta,
              },
            },
          })
        ),
        prisma.transaction.delete({
          where: { id: existingTransaction.id },
        }),
      ])
    );

    void logWorkspaceEventSafe({
      workspaceId: context.workspaceId,
      userId: context.userId,
      type: 'transaction.deleted',
      payload: {
        transactionId: existingTransaction.id,
      },
    });
    void triggerWorkspaceFinancialSync({ workspaceId: context.workspaceId });

    logTransactionRequest('info', 'delete.completed', {
      workspaceId: context.workspaceId,
      userId: context.userId,
      transactionId: existingTransaction.id,
      totalMs: elapsedMs(routeStartedAt),
      metrics,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error instanceof HttpError) {
      return apiErrorResponse(error.status, 'WORKSPACE_ERROR', error.message);
    }
    const writeFailureResponse = buildWriteFailureResponse({
      error,
      routeLabel: 'delete',
      routeStartedAt,
      metrics,
      workspaceId: context?.workspaceId,
      userId: context?.userId,
    });
    if (writeFailureResponse) {
      return writeFailureResponse;
    }
    if (isSchemaMismatchError(error)) {
      return apiErrorResponse(503, 'SCHEMA_MISMATCH', SCHEMA_SYNC_REQUIRED_ERROR);
    }
    const prismaError = asPrismaServiceUnavailableError(error);
    if (prismaError) {
      logTransactionRequest('error', 'delete.db_unavailable', {
        workspaceId: context?.workspaceId,
        userId: context?.userId,
        totalMs: elapsedMs(routeStartedAt),
        metrics,
        detail: prismaError.detail || prismaError.message,
      });
      return apiErrorResponse(503, 'DB_UNAVAILABLE', FRIENDLY_TRANSACTION_DELETE_ERROR, {
        retryable: true,
      });
    }
    logTransactionRequest('error', 'delete.failed', {
      workspaceId: context?.workspaceId,
      userId: context?.userId,
      totalMs: elapsedMs(routeStartedAt),
      metrics,
      detail: error instanceof Error ? error.message : String(error || 'Unknown error'),
    });
    return apiErrorResponse(500, 'TRANSACTION_DELETE_FAILED', FRIENDLY_TRANSACTION_DELETE_ERROR);
  }
}




