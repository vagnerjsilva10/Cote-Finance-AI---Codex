import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { asPrismaServiceUnavailableError, prisma } from '@/lib/prisma';
import { triggerWorkspaceFinancialSync } from '@/lib/server/financial-sync';
import {
  cancelFutureRecurringRuleTransactions,
  getRecurringRulesSchemaErrorMessage,
  isRecurringRulesSchemaMismatchError,
  projectRecurringRuleTransactions,
  upsertRecurrenceRule,
} from '@/lib/server/recurrence-rules';
import {
  HttpError,
  logWorkspaceEventSafe,
  resolveWorkspaceContext,
} from '@/lib/server/multi-tenant';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type RecurrenceRuleBody = {
  id?: string;
  kind?: string;
  title?: string;
  description?: string | null;
  amount?: number | string;
  walletId?: string;
  wallet?: string;
  categoryId?: string | null;
  category?: string | null;
  paymentMethod?: string | null;
  frequency?: string;
  interval?: number | string | null;
  startDate?: string;
  endDate?: string | null;
  anchorDay?: number | string | null;
  timezone?: string | null;
  status?: string | null;
  projectionHorizonDays?: number | string | null;
};

function parseAmount(value: unknown) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const parsed = Number(value.replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function parseInteger(value: unknown) {
  if (typeof value === 'number') return Number.isInteger(value) ? value : null;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isInteger(parsed) ? parsed : null;
  }
  return null;
}

function parseDate(value: unknown, required = false) {
  if (value === null || value === undefined || value === '') {
    if (required) return null;
    return null;
  }
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === 'string') {
    const token = value.trim();
    if (!token) return null;
    const normalized = token.length <= 10 ? `${token.slice(0, 10)}T00:00:00` : token;
    const parsed = new Date(normalized);
    if (Number.isNaN(parsed.getTime())) return null;
    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  }
  return null;
}

function hasDateToken(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0;
}

async function resolveWalletId(params: {
  workspaceId: string;
  walletId?: string | null;
  walletName?: string | null;
}) {
  if (params.walletId) {
    const existing = await prisma.wallet.findFirst({
      where: {
        id: params.walletId,
        workspace_id: params.workspaceId,
      },
      select: { id: true },
    });
    if (!existing) {
      throw new Error('Carteira da recorrência não encontrada.');
    }
    return existing.id;
  }

  const normalizedWalletName = String(params.walletName || '').trim() || 'Carteira Principal';
  const existingByName = await prisma.wallet.findFirst({
    where: {
      workspace_id: params.workspaceId,
      name: normalizedWalletName,
    },
    select: { id: true },
  });
  if (existingByName) return existingByName.id;

  const created = await prisma.wallet.create({
    data: {
      workspace_id: params.workspaceId,
      name: normalizedWalletName,
      type: 'CASH',
      balance: 0,
    },
    select: { id: true },
  });
  return created.id;
}

async function resolveCategoryId(params: {
  categoryId?: string | null;
  categoryName?: string | null;
}) {
  if (params.categoryId) {
    const existing = await prisma.category.findUnique({
      where: { id: params.categoryId },
      select: { id: true },
    });
    if (!existing) {
      throw new Error('Categoria da recorrência não encontrada.');
    }
    return existing.id;
  }

  const name = String(params.categoryName || '').trim();
  if (!name) return null;

  const existingByName = await prisma.category.findFirst({
    where: { name },
    select: { id: true },
  });
  if (existingByName) return existingByName.id;

  const created = await prisma.category.create({
    data: { name },
    select: { id: true },
  });
  return created.id;
}

function parseProjectionHorizonDays(value: unknown) {
  const parsed = parseInteger(value);
  if (parsed === null) return undefined;
  return parsed;
}

function isMissingRecurrenceTableError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === 'P2021';
  }
  return false;
}

export async function GET(req: Request) {
  try {
    const context = await resolveWorkspaceContext(req);
    const rules = await prisma.recurrenceRule.findMany({
      where: {
        workspace_id: context.workspaceId,
      },
      orderBy: [{ status: 'asc' }, { created_at: 'desc' }],
      include: {
        wallet: {
          select: { id: true, name: true, type: true },
        },
        category: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json(rules);
  } catch (error: any) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (isMissingRecurrenceTableError(error) || isRecurringRulesSchemaMismatchError(error)) {
      return NextResponse.json([]);
    }
    const prismaError = asPrismaServiceUnavailableError(error);
    if (prismaError) {
      return NextResponse.json({ error: prismaError.message }, { status: 503 });
    }
    console.error('Recurrence rules GET Error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to fetch recurrence rules' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const context = await resolveWorkspaceContext(req);
    const body = (await req.json().catch(() => null)) as RecurrenceRuleBody | null;
    if (!body) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const amount = parseAmount(body.amount);
    const startDate = parseDate(body.startDate, true);
    const endDate = parseDate(body.endDate);
    const interval = parseInteger(body.interval) ?? 1;
    const anchorDay = parseInteger(body.anchorDay);
    const walletId = await resolveWalletId({
      workspaceId: context.workspaceId,
      walletId: body.walletId,
      walletName: body.wallet,
    });
    const categoryId = await resolveCategoryId({
      categoryId: body.categoryId,
      categoryName: body.category,
    });
    const horizonDays = parseProjectionHorizonDays(body.projectionHorizonDays);

    if (!startDate) {
      return NextResponse.json({ error: 'Data de início da recorrência inválida.' }, { status: 400 });
    }
    if (hasDateToken(body.endDate) && !endDate) {
      return NextResponse.json({ error: 'Data final da recorrência inválida.' }, { status: 400 });
    }
    if (amount === null || amount <= 0) {
      return NextResponse.json({ error: 'Valor da recorrência inválido.' }, { status: 400 });
    }

    const rule = await upsertRecurrenceRule({
      workspaceId: context.workspaceId,
      kind: String(body.kind || ''),
      title: String(body.title || ''),
      description: body.description,
      amount,
      walletId,
      categoryId,
      paymentMethod: body.paymentMethod,
      frequency: String(body.frequency || 'MONTHLY'),
      interval,
      startDate,
      endDate,
      anchorDay,
      timezone: body.timezone,
      status: body.status,
    });

    const projection = await projectRecurringRuleTransactions({
      workspaceId: context.workspaceId,
      ruleId: rule.id,
      horizonDays,
    });

    await logWorkspaceEventSafe({
      workspaceId: context.workspaceId,
      userId: context.userId,
      type: 'recurrence_rule.created',
      payload: {
        recurrenceRuleId: rule.id,
        kind: rule.kind,
      },
    });
    await triggerWorkspaceFinancialSync({ workspaceId: context.workspaceId });

    return NextResponse.json({ ...rule, projection }, { status: 201 });
  } catch (error: any) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (isRecurringRulesSchemaMismatchError(error)) {
      return NextResponse.json({ error: getRecurringRulesSchemaErrorMessage() }, { status: 503 });
    }
    const prismaError = asPrismaServiceUnavailableError(error);
    if (prismaError) {
      return NextResponse.json({ error: prismaError.message }, { status: 503 });
    }
    console.error('Recurrence rules POST Error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to create recurrence rule' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const context = await resolveWorkspaceContext(req);
    const body = (await req.json().catch(() => null)) as RecurrenceRuleBody | null;
    if (!body?.id) {
      return NextResponse.json({ error: 'Recurrence rule id is required' }, { status: 400 });
    }

    const existing = await prisma.recurrenceRule.findFirst({
      where: {
        id: body.id,
        workspace_id: context.workspaceId,
      },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Recurrence rule not found' }, { status: 404 });
    }

    const amount = body.amount !== undefined ? parseAmount(body.amount) : Number(existing.amount);
    const startDate = body.startDate !== undefined ? parseDate(body.startDate, true) : existing.start_date;
    const endDate =
      body.endDate !== undefined
        ? body.endDate === null
          ? null
          : parseDate(body.endDate)
        : existing.end_date;
    const interval = body.interval !== undefined ? (parseInteger(body.interval) ?? 1) : existing.interval;
    const anchorDay = body.anchorDay !== undefined ? parseInteger(body.anchorDay) : existing.anchor_day;
    const walletId =
      body.walletId !== undefined || body.wallet !== undefined
        ? await resolveWalletId({
            workspaceId: context.workspaceId,
            walletId: body.walletId,
            walletName: body.wallet,
          })
        : existing.wallet_id;
    const categoryId =
      body.categoryId !== undefined || body.category !== undefined
        ? await resolveCategoryId({
            categoryId: body.categoryId,
            categoryName: body.category,
          })
        : existing.category_id;
    const horizonDays = parseProjectionHorizonDays(body.projectionHorizonDays);

    if (!startDate) {
      return NextResponse.json({ error: 'Data de início da recorrência inválida.' }, { status: 400 });
    }
    if (body.endDate !== undefined && body.endDate !== null && hasDateToken(body.endDate) && !endDate) {
      return NextResponse.json({ error: 'Data final da recorrência inválida.' }, { status: 400 });
    }
    if (amount === null || amount <= 0) {
      return NextResponse.json({ error: 'Valor da recorrência inválido.' }, { status: 400 });
    }

    const updated = await upsertRecurrenceRule({
      workspaceId: context.workspaceId,
      ruleId: existing.id,
      kind: body.kind ?? existing.kind,
      title: body.title ?? existing.title,
      description: body.description ?? existing.description,
      amount,
      walletId,
      categoryId,
      paymentMethod: body.paymentMethod ?? existing.payment_method,
      frequency: body.frequency ?? existing.frequency,
      interval,
      startDate,
      endDate,
      anchorDay,
      timezone: body.timezone ?? existing.timezone,
      status: body.status ?? existing.status,
    });

    const projection = await projectRecurringRuleTransactions({
      workspaceId: context.workspaceId,
      ruleId: updated.id,
      horizonDays,
    });

    await logWorkspaceEventSafe({
      workspaceId: context.workspaceId,
      userId: context.userId,
      type: 'recurrence_rule.updated',
      payload: {
        recurrenceRuleId: updated.id,
      },
    });
    await triggerWorkspaceFinancialSync({ workspaceId: context.workspaceId });

    return NextResponse.json({ ...updated, projection });
  } catch (error: any) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (isRecurringRulesSchemaMismatchError(error)) {
      return NextResponse.json({ error: getRecurringRulesSchemaErrorMessage() }, { status: 503 });
    }
    const prismaError = asPrismaServiceUnavailableError(error);
    if (prismaError) {
      return NextResponse.json({ error: prismaError.message }, { status: 503 });
    }
    console.error('Recurrence rules PATCH Error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to update recurrence rule' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const context = await resolveWorkspaceContext(req);
    const body = (await req.json().catch(() => null)) as RecurrenceRuleBody | null;
    if (!body?.id) {
      return NextResponse.json({ error: 'Recurrence rule id is required' }, { status: 400 });
    }

    const existing = await prisma.recurrenceRule.findFirst({
      where: {
        id: body.id,
        workspace_id: context.workspaceId,
      },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Recurrence rule not found' }, { status: 404 });
    }

    const canceled = await cancelFutureRecurringRuleTransactions({
      workspaceId: context.workspaceId,
      ruleId: existing.id,
    });

    await prisma.recurrenceRule.delete({
      where: { id: existing.id },
    });

    await logWorkspaceEventSafe({
      workspaceId: context.workspaceId,
      userId: context.userId,
      type: 'recurrence_rule.deleted',
      payload: {
        recurrenceRuleId: existing.id,
        canceledTransactions: canceled.canceled,
      },
    });
    await triggerWorkspaceFinancialSync({ workspaceId: context.workspaceId });

    return NextResponse.json({
      success: true,
      recurrenceRuleId: existing.id,
      canceledTransactions: canceled.canceled,
    });
  } catch (error: any) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (isRecurringRulesSchemaMismatchError(error)) {
      return NextResponse.json({ error: getRecurringRulesSchemaErrorMessage() }, { status: 503 });
    }
    const prismaError = asPrismaServiceUnavailableError(error);
    if (prismaError) {
      return NextResponse.json({ error: prismaError.message }, { status: 503 });
    }
    console.error('Recurrence rules DELETE Error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to delete recurrence rule' }, { status: 500 });
  }
}
