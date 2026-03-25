import { NextResponse } from 'next/server';
import {
  asPrismaServiceUnavailableError,
  classifyPrismaRuntimeError,
  getDatabaseRuntimeInfo,
} from '@/lib/prisma';
import { buildDashboardOverview } from '@/lib/server/dashboard-overview';
import { HttpError, resolveWorkspaceContext } from '@/lib/server/multi-tenant';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: Request) {
  const startedAt = Date.now();
  let workspaceId: string | null = null;

  try {
    const context = await resolveWorkspaceContext(req);
    workspaceId = context.workspaceId;
    const overview = await buildDashboardOverview(context.workspaceId);
    console.info('[dashboard-overview] completed', {
      workspaceId: context.workspaceId,
      totalMs: Date.now() - startedAt,
      database: getDatabaseRuntimeInfo(),
    });
    return NextResponse.json(overview);
  } catch (error: any) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    const prismaError = asPrismaServiceUnavailableError(error);
    if (prismaError) {
      const classified = classifyPrismaRuntimeError(error);
      console.error('[dashboard-overview] failed', {
        workspaceId,
        totalMs: Date.now() - startedAt,
        errorKind: classified?.kind || 'DB_UNAVAILABLE',
        detail: prismaError.detail || prismaError.message,
        database: getDatabaseRuntimeInfo(),
      });
      return NextResponse.json(
        {
          code: classified?.kind || 'DB_UNAVAILABLE',
          message: 'Nao foi possivel carregar a dashboard agora. Tente novamente em instantes.',
          error: 'Nao foi possivel carregar a dashboard agora. Tente novamente em instantes.',
        },
        { status: 503 }
      );
    }

    console.error('[dashboard-overview] failed', {
      workspaceId,
      totalMs: Date.now() - startedAt,
      detail: error instanceof Error ? error.message : String(error || 'Unknown error'),
      database: getDatabaseRuntimeInfo(),
    });
    return NextResponse.json(
      {
        code: 'DASHBOARD_OVERVIEW_FAILED',
        message: 'Nao foi possivel carregar a dashboard agora. Tente novamente em instantes.',
        error: 'Nao foi possivel carregar a dashboard agora. Tente novamente em instantes.',
      },
      { status: 500 }
    );
  }
}
