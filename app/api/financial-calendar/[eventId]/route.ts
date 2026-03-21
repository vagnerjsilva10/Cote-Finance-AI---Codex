import { NextResponse } from 'next/server';
import {
  parseUpdateFinancialEventDto,
} from '@/lib/server/financial-calendar-dto';
import { buildFinancialCalendarErrorResponse } from '@/lib/server/financial-calendar-http';
import {
  deleteManualFinancialEvent,
  updateManualFinancialEvent,
} from '@/lib/server/financial-calendar';
import {
  logWorkspaceEventSafe,
  resolveWorkspaceContext,
} from '@/lib/server/multi-tenant';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function PATCH(req: Request, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const context = await resolveWorkspaceContext(req);
    const { eventId } = await params;
    const rawBody = await req.json().catch(() => null);
    const body = parseUpdateFinancialEventDto(rawBody);

    const updated = await updateManualFinancialEvent({
      workspaceId: context.workspaceId,
      userId: context.userId,
      eventId,
      ...body,
    });

    await logWorkspaceEventSafe({
      workspaceId: context.workspaceId,
      userId: context.userId,
      type: 'financial_calendar.event.updated',
      payload: {
        financialEventId: updated.id,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    return buildFinancialCalendarErrorResponse(error, 'Financial calendar event PATCH Error:');
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const context = await resolveWorkspaceContext(req);
    const { eventId } = await params;

    const result = await deleteManualFinancialEvent({
      workspaceId: context.workspaceId,
      userId: context.userId,
      eventId,
    });

    await logWorkspaceEventSafe({
      workspaceId: context.workspaceId,
      userId: context.userId,
      type: 'financial_calendar.event.deleted',
      payload: {
        financialEventId: eventId,
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    return buildFinancialCalendarErrorResponse(error, 'Financial calendar event DELETE Error:');
  }
}
