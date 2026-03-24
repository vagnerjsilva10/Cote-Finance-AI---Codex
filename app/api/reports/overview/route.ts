import { NextResponse } from 'next/server';
import { asPrismaServiceUnavailableError } from '@/lib/prisma';
import { HttpError, resolveWorkspaceContext } from '@/lib/server/multi-tenant';
import { buildReportsOverview } from '@/application/reports/build-reports-overview';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const context = await resolveWorkspaceContext(req);
    const payload = await buildReportsOverview(context.workspaceId);
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
