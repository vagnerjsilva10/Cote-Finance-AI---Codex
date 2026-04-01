import { NextResponse } from 'next/server';
import { asPrismaServiceUnavailableError } from '@/lib/prisma';
import { HttpError, resolveWorkspaceContext } from '@/lib/server/multi-tenant';
import { buildWorkspaceShell } from '@/application/workspace/build-workspace-shell';
import { parsePeriodSelectionFromSearchParams } from '@/lib/date/period-resolver';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const context = await resolveWorkspaceContext(req);
    const url = new URL(req.url);
    const scope = url.searchParams.get('scope') === 'transactions' ? 'transactions' : 'full';
    const periodSelection = parsePeriodSelectionFromSearchParams(url.searchParams);
    const hasPeriodFilter =
      url.searchParams.has('period') ||
      url.searchParams.has('start') ||
      url.searchParams.has('end') ||
      url.searchParams.has('startDate') ||
      url.searchParams.has('endDate');
    const payload = await buildWorkspaceShell(context, {
      scope,
      periodSelection: hasPeriodFilter ? periodSelection : null,
    });
    return NextResponse.json(payload);
  } catch (error: any) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const prismaError = asPrismaServiceUnavailableError(error);
    if (prismaError) {
      return NextResponse.json({ error: prismaError.message }, { status: 503 });
    }
    console.error('Workspace shell API Error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to load workspace shell' }, { status: 500 });
  }
}
