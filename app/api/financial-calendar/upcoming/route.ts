import { NextResponse } from 'next/server';
import { parseUpcomingQuery } from '@/lib/server/financial-calendar-dto';
import { buildFinancialCalendarErrorResponse } from '@/lib/server/financial-calendar-http';
import { getFinancialCalendarUpcomingDueEvents } from '@/lib/server/financial-calendar';
import { resolveWorkspaceContext } from '@/lib/server/multi-tenant';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const context = await resolveWorkspaceContext(req);
    const { fromDate, days } = parseUpcomingQuery(req);

    const result = await getFinancialCalendarUpcomingDueEvents({
      workspaceId: context.workspaceId,
      fromDate,
      days,
    });

    return NextResponse.json(result);
  } catch (error) {
    return buildFinancialCalendarErrorResponse(error, 'Financial calendar upcoming GET Error:');
  }
}
