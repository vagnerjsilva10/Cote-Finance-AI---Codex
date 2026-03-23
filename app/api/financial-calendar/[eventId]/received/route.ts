import { NextResponse } from 'next/server';
import { parseOccurrenceActionDto } from '@/lib/server/financial-calendar-dto';
import { buildFinancialCalendarErrorResponse } from '@/lib/server/financial-calendar-http';
import { markFinancialCalendarEventStatus, syncWorkspaceFinancialCalendarSourcesSafe } from '@/lib/server/financial-calendar';
import {
  logWorkspaceEventSafe,
  resolveWorkspaceContext,
} from '@/lib/server/multi-tenant';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: Request, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const context = await resolveWorkspaceContext(req);
    const { eventId } = await params;
    const rawBody = await req.json().catch(() => null);
    const body = parseOccurrenceActionDto(rawBody);

    const result = await markFinancialCalendarEventStatus({
      workspaceId: context.workspaceId,
      userId: context.userId,
      eventId,
      occurrenceDate: body.occurrenceDate,
      status: 'RECEIVED',
    });

    await logWorkspaceEventSafe({
      workspaceId: context.workspaceId,
      userId: context.userId,
      type: 'financial_calendar.event.marked_received',
      payload: {
        financialEventId: result.eventId,
        occurrenceDate: result.occurrenceDate,
      },
    });
    await syncWorkspaceFinancialCalendarSourcesSafe(context.workspaceId);

    return NextResponse.json(result);
  } catch (error) {
    return buildFinancialCalendarErrorResponse(error, 'Financial calendar event received Error:');
  }
}
