import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { asPrismaServiceUnavailableError, prisma } from '@/lib/prisma';
import { mapRecurringDebtStatusToLegacyDebtStatus } from '@/lib/domain/financial-domain';
import {
  computeNextRecurringDebtDueDate,
  getRecurringDebtDefaultDueDay,
} from '@/lib/debts';
import {
  findWorkspaceRecurringDebts,
  normalizeRecurringDebtStatus,
} from '@/lib/server/debts';
import {
  HttpError,
  logWorkspaceEventSafe,
  resolveWorkspaceContext,
} from '@/lib/server/multi-tenant';
import { syncWorkspaceFinancialCalendarSourcesSafe } from '@/lib/server/financial-calendar';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type RecurringDebtBody = {
  id?: string;
  legacyDebtId?: string;
  source?: 'recurring_debt' | 'legacy_debt';
  creditor?: string;
  amount?: number | string;
  category?: string;
  frequency?: string;
  interval?: number | string;
  startDate?: string;
  endDate?: string | null;
  dueDay?: number | string | null;
  status?: string;
  notes?: string | null;
};

const isMissingTableError = (error: unknown) => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === 'P2021';
  }
  return false;
};

const buildMissingTableResponse = () =>
  NextResponse.json(
    {
      error:
        'Tabela de recorrências de dívida indisponível. Execute `npx prisma db push` para aplicar o schema atual.',
    },
    { status: 503 }
  );

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
  if (typeof value !== 'string' || !value.trim()) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
};

const normalizeFrequency = (value: string | undefined) => {
  const normalized = String(value || 'MONTHLY').trim().toUpperCase();
  if (normalized === 'WEEKLY' || normalized === 'MONTHLY' || normalized === 'QUARTERLY' || normalized === 'YEARLY') {
    return normalized;
  }
  return 'MONTHLY';
};

export async function GET(req: Request) {
  try {
    const context = await resolveWorkspaceContext(req);
    const recurringDebts = await findWorkspaceRecurringDebts(context.workspaceId);
    return NextResponse.json(recurringDebts);
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
    console.error('Recurring debts GET Error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to fetch recurring debts' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const context = await resolveWorkspaceContext(req);
    const body = (await req.json().catch(() => null)) as RecurringDebtBody | null;
    if (!body) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const creditor = (body.creditor || '').trim();
    const amount = parseAmount(body.amount);
    const category = (body.category || '').trim();
    const frequency = normalizeFrequency(body.frequency);
    const interval = Math.max(1, parseInteger(body.interval) ?? 1);
    const startDate = parseDate(body.startDate) ?? new Date();
    const endDate = body.endDate ? parseDate(body.endDate) : null;
    const dueDay = parseInteger(body.dueDay) ?? parseInteger(getRecurringDebtDefaultDueDay(category));
    const status = normalizeRecurringDebtStatus(undefined);
    const notes = typeof body.notes === 'string' ? body.notes.trim() || null : null;

    if (!creditor) {
      return NextResponse.json({ error: 'Creditor is required' }, { status: 400 });
    }
    if (amount === null || amount <= 0) {
      return NextResponse.json({ error: 'Invalid recurring amount' }, { status: 400 });
    }
    if (!category) {
      return NextResponse.json({ error: 'Category is required' }, { status: 400 });
    }

    const recurringDebt = await prisma.recurringDebt.create({
      data: {
        workspace_id: context.workspaceId,
        creditor,
        amount,
        category,
        frequency,
        interval,
        start_date: startDate,
        end_date: endDate === null ? (null as unknown as Date) : endDate,
        due_day: frequency === 'MONTHLY' ? dueDay : null,
        next_due_date: computeNextRecurringDebtDueDate({
          frequency,
          interval,
          startDate,
          dueDay: frequency === 'MONTHLY' ? dueDay : undefined,
        }),
        status,
        notes,
      },
    });

    await logWorkspaceEventSafe({
      workspaceId: context.workspaceId,
      userId: context.userId,
      type: 'recurring_debt.created',
      payload: { recurringDebtId: recurringDebt.id },
    });
    await syncWorkspaceFinancialCalendarSourcesSafe(context.workspaceId);

    return NextResponse.json(recurringDebt, { status: 201 });
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
    console.error('Recurring debts POST Error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to create recurring debt' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const context = await resolveWorkspaceContext(req);
    const body = (await req.json().catch(() => null)) as RecurringDebtBody | null;
    if (!body?.id) {
      return NextResponse.json({ error: 'Recurring debt id is required' }, { status: 400 });
    }

    if (body.source === 'legacy_debt') {
      const legacyDebtId = body.legacyDebtId || body.id.replace(/^legacy:/, '');
      const existingLegacyDebt = await prisma.debt.findFirst({
        where: { id: legacyDebtId, workspace_id: context.workspaceId },
        select: { id: true },
      });
      if (!existingLegacyDebt) {
        return NextResponse.json({ error: 'Legacy recurring debt not found' }, { status: 404 });
      }

      const creditor = body.creditor?.trim();
      const amount = parseAmount(body.amount);
      const category = body.category?.trim();
      const dueDay = parseInteger(body.dueDay);
      const status = body.status ? mapRecurringDebtStatusToLegacyDebtStatus(body.status) : undefined;

      const updated = await prisma.debt.update({
        where: { id: existingLegacyDebt.id },
        data: {
          creditor: creditor || undefined,
          original_amount: amount !== null && amount > 0 ? amount : undefined,
          remaining_amount: amount !== null && amount >= 0 ? amount : undefined,
          category: category || undefined,
          due_day: dueDay !== null && dueDay >= 1 && dueDay <= 31 ? dueDay : undefined,
          status,
        },
      });

      await logWorkspaceEventSafe({
        workspaceId: context.workspaceId,
        userId: context.userId,
        type: 'recurring_debt.updated.legacy',
        payload: { recurringDebtId: existingLegacyDebt.id },
      });
      await syncWorkspaceFinancialCalendarSourcesSafe(context.workspaceId);

      return NextResponse.json({ ...updated, source: 'legacy_debt', legacy_debt_id: updated.id });
    }

    const existing = await prisma.recurringDebt.findFirst({
      where: { id: body.id, workspace_id: context.workspaceId },
      select: { id: true, start_date: true, next_due_date: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Recurring debt not found' }, { status: 404 });
    }

    const frequency = body.frequency ? normalizeFrequency(body.frequency) : undefined;
    const interval = body.interval !== undefined ? Math.max(1, parseInteger(body.interval) ?? 1) : undefined;
    const startDate = body.startDate ? parseDate(body.startDate) ?? undefined : undefined;
    const endDate = body.endDate === null ? null : body.endDate ? parseDate(body.endDate) ?? undefined : undefined;
    const dueDay = body.dueDay !== undefined ? parseInteger(body.dueDay) : undefined;
    const nextDueDate =
      frequency || interval !== undefined || startDate || dueDay !== undefined
        ? computeNextRecurringDebtDueDate({
            frequency: frequency || 'MONTHLY',
            interval: interval ?? 1,
            startDate: startDate ?? existing.start_date,
            dueDay: dueDay ?? undefined,
            currentDueDate: existing.next_due_date,
          })
        : undefined;

    const updateData: Prisma.RecurringDebtUpdateInput = {
      creditor: body.creditor?.trim() || undefined,
      amount: (() => {
        const amount = parseAmount(body.amount);
        return amount !== null && amount > 0 ? amount : undefined;
      })(),
      category: body.category?.trim() || undefined,
      frequency,
      interval,
      start_date: startDate,
      due_day: dueDay,
      next_due_date: nextDueDate,
      status: body.status ? normalizeRecurringDebtStatus(body.status) : undefined,
      notes: typeof body.notes === 'string' ? body.notes.trim() || null : undefined,
    };

    if (endDate === null) {
      updateData.end_date = null as unknown as Date;
    } else if (endDate) {
      updateData.end_date = endDate;
    }

    const recurringDebt = await prisma.recurringDebt.update({
      where: { id: existing.id },
      data: updateData,
    });

    await logWorkspaceEventSafe({
      workspaceId: context.workspaceId,
      userId: context.userId,
      type: 'recurring_debt.updated',
      payload: { recurringDebtId: recurringDebt.id },
    });
    await syncWorkspaceFinancialCalendarSourcesSafe(context.workspaceId);

    return NextResponse.json(recurringDebt);
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
    console.error('Recurring debts PATCH Error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to update recurring debt' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const context = await resolveWorkspaceContext(req);
    const body = (await req.json().catch(() => null)) as RecurringDebtBody | null;
    if (!body?.id) {
      return NextResponse.json({ error: 'Recurring debt id is required' }, { status: 400 });
    }

    if (body.source === 'legacy_debt') {
      const legacyDebtId = body.legacyDebtId || body.id.replace(/^legacy:/, '');
      const existingLegacyDebt = await prisma.debt.findFirst({
        where: { id: legacyDebtId, workspace_id: context.workspaceId },
        select: { id: true },
      });
      if (!existingLegacyDebt) {
        return NextResponse.json({ error: 'Legacy recurring debt not found' }, { status: 404 });
      }

      await prisma.debt.delete({ where: { id: existingLegacyDebt.id } });
      await logWorkspaceEventSafe({
        workspaceId: context.workspaceId,
        userId: context.userId,
        type: 'recurring_debt.deleted.legacy',
        payload: { recurringDebtId: existingLegacyDebt.id },
      });
      await syncWorkspaceFinancialCalendarSourcesSafe(context.workspaceId);
      return NextResponse.json({ success: true });
    }

    const existing = await prisma.recurringDebt.findFirst({
      where: { id: body.id, workspace_id: context.workspaceId },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Recurring debt not found' }, { status: 404 });
    }

    await prisma.recurringDebt.delete({ where: { id: existing.id } });
    await logWorkspaceEventSafe({
      workspaceId: context.workspaceId,
      userId: context.userId,
      type: 'recurring_debt.deleted',
      payload: { recurringDebtId: existing.id },
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
    console.error('Recurring debts DELETE Error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to delete recurring debt' }, { status: 500 });
  }
}

