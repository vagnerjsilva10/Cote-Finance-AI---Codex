import { NextResponse } from 'next/server';
import { parseMonthlySummaryQuery } from '@/lib/server/financial-calendar-dto';
import { buildFinancialCalendarErrorResponse } from '@/lib/server/financial-calendar-http';
import { getFinancialCalendarMonthlySummary } from '@/lib/server/financial-calendar';
import { resolveWorkspaceContext } from '@/lib/server/multi-tenant';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const context = await resolveWorkspaceContext(req);
    const { date } = parseMonthlySummaryQuery(req);

    const result = await getFinancialCalendarMonthlySummary({
      workspaceId: context.workspaceId,
      focusDate: date,
    });

    return NextResponse.json(result);
  } catch (error) {
    return buildFinancialCalendarErrorResponse(error, 'Financial calendar summary GET Error:');
  }
}
