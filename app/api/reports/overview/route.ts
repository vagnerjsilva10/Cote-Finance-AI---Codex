import { NextResponse } from 'next/server';
import { asPrismaServiceUnavailableError } from '@/lib/prisma';
import { HttpError, resolveWorkspaceContext } from '@/lib/server/multi-tenant';
import { buildReportsOverview } from '@/application/reports/build-reports-overview';
import { parsePeriodSelectionFromSearchParams } from '@/lib/date/period-resolver';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const context = await resolveWorkspaceContext(req);
    const url = new URL(req.url);
    const periodSelection = parsePeriodSelectionFromSearchParams(url.searchParams);
    const payload = await buildReportsOverview(context.workspaceId, periodSelection);
    return NextResponse.json(payload);
  } catch (error: any) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const prismaError = asPrismaServiceUnavailableError(error);
    if (prismaError) {
      return NextResponse.json({ error: prismaError.message }, { status: 503 });
    }
    console.error('Reports overview API Error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to load reports overview' }, { status: 500 });
  }
}
