import { NextResponse } from 'next/server';
import {
  parseCalendarListQuery,
  parseCreateFinancialEventDto,
} from '@/lib/server/financial-calendar-dto';
import { buildFinancialCalendarErrorResponse } from '@/lib/server/financial-calendar-http';
import {
  createManualFinancialEvent,
  getFinancialCalendarSnapshot,
  markFinancialCalendarEventStatus,
} from '@/lib/server/financial-calendar';
import { triggerWorkspaceFinancialSync } from '@/lib/server/financial-sync';
import { logWorkspaceEventSafe, resolveWorkspaceContext } from '@/lib/server/multi-tenant';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type CreateFinancialEventBody = {
  title?: string;
  description?: string | null;
  type?: string;
  amount?: number | string | null;
  category?: string | null;
  date?: string;
  endDate?: string | null;
  recurrence?: string | null;
  recurrenceInterval?: number | string | null;
  isRecurring?: boolean | null;
  status?: string | null;
  reminderEnabled?: boolean | null;
  reminderDaysBefore?: number | string | null;
  colorToken?: string | null;
};

type UpdateFinancialEventStatusBody = {
  eventId?: string;
  occurrenceDate?: string | null;
  status?: string;
};

export async function GET(req: Request) {
  try {
    const context = await resolveWorkspaceContext(req);
    const { view, date: focusDate } = parseCalendarListQuery(req, 'month');

    const snapshot = await getFinancialCalendarSnapshot({
      workspaceId: context.workspaceId,
      view,
      focusDate,
    });

    return NextResponse.json(snapshot);
  } catch (error: any) {
    return buildFinancialCalendarErrorResponse(error, 'Financial calendar GET Error:');
  }
}

export async function POST(req: Request) {
  try {
    const context = await resolveWorkspaceContext(req);
    const rawBody = (await req.json().catch(() => null)) as CreateFinancialEventBody | null;
    const body = parseCreateFinancialEventDto(rawBody);

    const created = await createManualFinancialEvent({
      workspaceId: context.workspaceId,
      userId: context.userId,
      title: body.title,
      description: body.description,
      type: body.type,
      amount: body.amount,
      category: body.category,
      date: body.date,
      endDate: body.endDate,
      recurrence: body.recurrence,
      recurrenceInterval: body.recurrenceInterval,
      isRecurring: body.isRecurring,
      status: body.status,
      reminderEnabled: body.reminderEnabled,
      reminderDaysBefore: body.reminderDaysBefore,
      colorToken: body.colorToken,
    });

    await logWorkspaceEventSafe({
      workspaceId: context.workspaceId,
      userId: context.userId,
      type: 'financial_calendar.event.created',
      payload: {
        financialEventId: created.id,
        eventType: created.type,
        sourceType: created.source_type,
      },
    });
    await triggerWorkspaceFinancialSync({ workspaceId: context.workspaceId });

    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    return buildFinancialCalendarErrorResponse(error, 'Financial calendar POST Error:');
  }
}

export async function PATCH(req: Request) {
  try {
    const context = await resolveWorkspaceContext(req);
    const body = (await req.json().catch(() => null)) as UpdateFinancialEventStatusBody | null;
    if (!body?.eventId || !body?.status) {
      return NextResponse.json({ error: 'eventId e status sao obrigatorios.' }, { status: 400 });
    }

    const result = await markFinancialCalendarEventStatus({
      workspaceId: context.workspaceId,
      userId: context.userId,
      eventId: body.eventId,
      occurrenceDate: body.occurrenceDate,
      status: body.status,
    });

    await logWorkspaceEventSafe({
      workspaceId: context.workspaceId,
      userId: context.userId,
      type: 'financial_calendar.event.status_updated',
      payload: {
        financialEventId: result.eventId,
        occurrenceDate: result.occurrenceDate,
        status: result.status,
      },
    });
    await triggerWorkspaceFinancialSync({ workspaceId: context.workspaceId });

    return NextResponse.json(result);
  } catch (error: any) {
    return buildFinancialCalendarErrorResponse(error, 'Financial calendar PATCH Error:');
  }
}
