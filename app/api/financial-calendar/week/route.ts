import { NextResponse } from 'next/server';
import { parseCalendarListQuery } from '@/lib/server/financial-calendar-dto';
import { buildFinancialCalendarErrorResponse } from '@/lib/server/financial-calendar-http';
import { getFinancialCalendarSnapshot } from '@/lib/server/financial-calendar';
import { resolveWorkspaceContext } from '@/lib/server/multi-tenant';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const context = await resolveWorkspaceContext(req);
    const { date } = parseCalendarListQuery(req, 'week');

    const result = await getFinancialCalendarSnapshot({
      workspaceId: context.workspaceId,
      view: 'week',
      focusDate: date,
    });

    return NextResponse.json(result);
  } catch (error) {
    return buildFinancialCalendarErrorResponse(error, 'Financial calendar week GET Error:');
  }
}
