import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { asPrismaServiceUnavailableError, prisma } from '@/lib/prisma';
import { isRecurringDebtCategory, mapConventionalStatusToLegacyDebtStatus } from '@/lib/debts';
import {
  HttpError,
  logWorkspaceEventSafe,
  resolveWorkspaceContext,
} from '@/lib/server/multi-tenant';
import { syncWorkspaceFinancialCalendarSourcesSafe } from '@/lib/server/financial-calendar';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type DebtBody = {
  id?: string;
  creditor?: string;
  originalAmount?: number | string;
  remainingAmount?: number | string;
  interestRateMonthly?: number | string;
  dueDay?: number | string;
  dueDate?: string | null;
  category?: string;
  status?: string;
};

const parseAmount = (value: unknown) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const parsed = Number(value.replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const parseInteger = (value: unknown) => {
  if (typeof value === 'number') return Number.isInteger(value) ? value : null;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isInteger(parsed) ? parsed : null;
  }
  return null;
};

const parseDate = (value: unknown) => {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === 'string') {
    const token = value.trim();
    if (!token) return null;
    const normalized = token.length <= 10 ? `${token.slice(0, 10)}T00:00:00` : token;
    const parsed = new Date(normalized);
    if (Number.isNaN(parsed.getTime())) return null;
    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  }
  return null;
};

const normalizeDebtStatus = (value: string | undefined) => mapConventionalStatusToLegacyDebtStatus(value);

const isMissingTableError = (error: unknown) => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === 'P2021';
  }
  return false;
};

const buildMissingTableResponse = () =>
  NextResponse.json(
    {
      error: 'Tabela de dívidas indisponível. Execute `npx prisma db push` para aplicar o schema atual.',
    },
    { status: 503 }
  );

export async function GET(req: Request) {
  try {
    const context = await resolveWorkspaceContext(req);
    const debts = await prisma.debt.findMany({
      where: { workspace_id: context.workspaceId },
      orderBy: { created_at: 'desc' },
    });
    return NextResponse.json(debts.filter((debt) => !isRecurringDebtCategory(String(debt.category || ''))));
  } catch (error: any) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (isMissingTableError(error)) {
      return NextResponse.json([]);
    }
    const prismaError = asPrismaServiceUnavailableError(error);
    if (prismaError) {
      return NextResponse.json({ error: prismaError.message }, { status: 503 });
    }
    console.error('Debts GET Error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to fetch debts' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const context = await resolveWorkspaceContext(req);
    const body = (await req.json().catch(() => null)) as DebtBody | null;
    if (!body) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const creditor = (body.creditor || '').trim();
    const originalAmount = parseAmount(body.originalAmount);
    const remainingAmountInput = parseAmount(body.remainingAmount);
    const interestRateMonthlyInput = parseAmount(body.interestRateMonthly);
    const interestRateMonthly = interestRateMonthlyInput === null ? 0 : interestRateMonthlyInput;
    const dueDay = parseInteger(body.dueDay);
    const dueDate = parseDate(body.dueDate);
    const category = (body.category || '').trim() || 'Outros';
    if (isRecurringDebtCategory(category)) {
      return NextResponse.json({ error: 'Use a área de recorrências para contas mensais e demais dívidas recorrentes.' }, { status: 400 });
    }
    if (!creditor) {
      return NextResponse.json({ error: 'Creditor is required' }, { status: 400 });
    }
    if (!originalAmount || originalAmount <= 0) {
      return NextResponse.json({ error: 'Invalid original amount' }, { status: 400 });
    }
    if (interestRateMonthly < 0) {
      return NextResponse.json({ error: 'Invalid monthly interest rate' }, { status: 400 });
    }
    if (!dueDate && (!dueDay || dueDay < 1 || dueDay > 31)) {
      return NextResponse.json({ error: 'Invalid due date' }, { status: 400 });
    }
    const resolvedOriginalAmount = originalAmount;
    const remainingAmount =
      remainingAmountInput !== null ? remainingAmountInput : resolvedOriginalAmount;
    if (remainingAmount < 0 || remainingAmount > resolvedOriginalAmount) {
      return NextResponse.json({ error: 'Invalid remaining amount' }, { status: 400 });
    }
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const dueDateStart = dueDate
      ? new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate())
      : null;
    const status =
      remainingAmount <= 0
        ? normalizeDebtStatus('Quitada')
        : dueDateStart && dueDateStart.getTime() < todayStart.getTime()
          ? normalizeDebtStatus('Atrasada')
          : normalizeDebtStatus('Em aberto');

    const debt = await prisma.debt.create({
      data: {
        workspace_id: context.workspaceId,
        creditor,
        original_amount: resolvedOriginalAmount,
        remaining_amount: remainingAmount,
        interest_rate_monthly: interestRateMonthly,
        due_day: dueDate ? dueDate.getDate() : (dueDay as number),
        due_date: dueDate,
        category,
        status,
      },
    });

    await logWorkspaceEventSafe({
      workspaceId: context.workspaceId,
      userId: context.userId,
      type: 'debt.created',
      payload: {
        debtId: debt.id,
      },
    });
    await syncWorkspaceFinancialCalendarSourcesSafe(context.workspaceId);

    return NextResponse.json(debt, { status: 201 });
  } catch (error: any) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (isMissingTableError(error)) {
      return buildMissingTableResponse();
    }
    const prismaError = asPrismaServiceUnavailableError(error);
    if (prismaError) {
      return NextResponse.json({ error: prismaError.message }, { status: 503 });
    }
    console.error('Debts POST Error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to create debt' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const context = await resolveWorkspaceContext(req);
    const body = (await req.json().catch(() => null)) as DebtBody | null;
    if (!body?.id) {
      return NextResponse.json({ error: 'Debt id is required' }, { status: 400 });
    }

    const existing = await prisma.debt.findFirst({
      where: {
        id: body.id,
        workspace_id: context.workspaceId,
      },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Debt not found' }, { status: 404 });
    }

    const creditor = body.creditor?.trim();
    const originalAmount = parseAmount(body.originalAmount);
    const remainingAmount = parseAmount(body.remainingAmount);
    const interestRateMonthly = parseAmount(body.interestRateMonthly);
    const dueDay = parseInteger(body.dueDay);
    const dueDate = Object.prototype.hasOwnProperty.call(body, 'dueDate') ? parseDate(body.dueDate) : undefined;
    const category = body.category?.trim();
    if (category && isRecurringDebtCategory(category)) {
      return NextResponse.json({ error: 'Use a área de recorrências para contas mensais e demais dívidas recorrentes.' }, { status: 400 });
    }
    const status = body.status ? normalizeDebtStatus(body.status) : undefined;

    if (
      Object.prototype.hasOwnProperty.call(body, 'dueDate') &&
      body.dueDate !== null &&
      body.dueDate !== '' &&
      dueDate === null
    ) {
      return NextResponse.json({ error: 'Invalid due date' }, { status: 400 });
    }

    const debt = await prisma.debt.update({
      where: { id: existing.id },
      data: {
        creditor: creditor || undefined,
        original_amount: originalAmount !== null && originalAmount > 0 ? originalAmount : undefined,
        remaining_amount: remainingAmount !== null && remainingAmount >= 0 ? remainingAmount : undefined,
        interest_rate_monthly:
          interestRateMonthly !== null && interestRateMonthly >= 0 ? interestRateMonthly : undefined,
        due_day:
          dueDate instanceof Date
            ? dueDate.getDate()
            : dueDay !== null && dueDay >= 1 && dueDay <= 31
              ? dueDay
              : undefined,
        due_date: dueDate === undefined ? undefined : dueDate,
        category: category || undefined,
        status,
      },
    });

    await logWorkspaceEventSafe({
      workspaceId: context.workspaceId,
      userId: context.userId,
      type: 'debt.updated',
      payload: {
        debtId: debt.id,
      },
    });
    await syncWorkspaceFinancialCalendarSourcesSafe(context.workspaceId);

    return NextResponse.json(debt);
  } catch (error: any) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (isMissingTableError(error)) {
      return buildMissingTableResponse();
    }
    const prismaError = asPrismaServiceUnavailableError(error);
    if (prismaError) {
      return NextResponse.json({ error: prismaError.message }, { status: 503 });
    }
    console.error('Debts PATCH Error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to update debt' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const context = await resolveWorkspaceContext(req);
    const body = (await req.json().catch(() => null)) as DebtBody | null;
    if (!body?.id) {
      return NextResponse.json({ error: 'Debt id is required' }, { status: 400 });
    }

    const existing = await prisma.debt.findFirst({
      where: {
        id: body.id,
        workspace_id: context.workspaceId,
      },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Debt not found' }, { status: 404 });
    }

    await prisma.debt.delete({
      where: { id: existing.id },
    });

    await logWorkspaceEventSafe({
      workspaceId: context.workspaceId,
      userId: context.userId,
      type: 'debt.deleted',
      payload: {
        debtId: existing.id,
      },
    });
    await syncWorkspaceFinancialCalendarSourcesSafe(context.workspaceId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (isMissingTableError(error)) {
      return buildMissingTableResponse();
    }
    const prismaError = asPrismaServiceUnavailableError(error);
    if (prismaError) {
      return NextResponse.json({ error: prismaError.message }, { status: 503 });
    }
    console.error('Debts DELETE Error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to delete debt' }, { status: 500 });
  }
}



