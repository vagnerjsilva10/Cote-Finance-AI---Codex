import { NextResponse } from 'next/server';
import { asPrismaServiceUnavailableError } from '@/lib/prisma';
import { buildDashboardOverview } from '@/lib/server/dashboard-overview';
import { HttpError, resolveWorkspaceContext } from '@/lib/server/multi-tenant';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const context = await resolveWorkspaceContext(req);
    const overview = await buildDashboardOverview(context.workspaceId);
    return NextResponse.json(overview);
  } catch (error: any) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    const prismaError = asPrismaServiceUnavailableError(error);
    if (prismaError) {
      return NextResponse.json({ error: prismaError.message }, { status: 503 });
    }

    console.error('Dashboard Overview API Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to load dashboard overview' },
      { status: 500 }
    );
  }
}
