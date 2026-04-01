import { NextResponse } from 'next/server';
import {
  asPrismaServiceUnavailableError,
  classifyPrismaRuntimeError,
  getDatabaseRuntimeInfo,
} from '@/lib/prisma';
import { buildDashboardOverview } from '@/lib/server/dashboard-overview';
import { parseDashboardPeriodSelectionFromSearchParams } from '@/lib/dashboard/date-range';
import { HttpError, resolveWorkspaceContext } from '@/lib/server/multi-tenant';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
const OVERVIEW_TIMEOUT_MS = 10_000;

class DashboardOverviewTimeoutError extends Error {
  constructor() {
    super('Dashboard overview timed out');
    this.name = 'DashboardOverviewTimeoutError';
  }
}

async function withOverviewTimeout<T>(operation: Promise<T>) {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      operation,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => reject(new DashboardOverviewTimeoutError()), OVERVIEW_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

export async function GET(req: Request) {
  const startedAt = Date.now();
  let workspaceId: string | null = null;

  try {
    const context = await resolveWorkspaceContext(req);
    workspaceId = context.workspaceId;
    const requestUrl = new URL(req.url);
    const periodSelection = parseDashboardPeriodSelectionFromSearchParams(
      requestUrl.searchParams
    );
    const overview = await withOverviewTimeout(
      buildDashboardOverview(context.workspaceId, periodSelection)
    );
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
    if (error instanceof DashboardOverviewTimeoutError) {
      console.error('[dashboard-overview] failed', {
        workspaceId,
        totalMs: Date.now() - startedAt,
        errorKind: 'DASHBOARD_TIMEOUT',
        detail: error.message,
        database: getDatabaseRuntimeInfo(),
      });
      return NextResponse.json(
        {
          code: 'DASHBOARD_TIMEOUT',
          message: 'Não foi possível carregar a dashboard no tempo esperado. Tente novamente.',
          error: 'Não foi possível carregar a dashboard no tempo esperado. Tente novamente.',
        },
        { status: 503 }
      );
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
          message: 'Não foi possível carregar a dashboard agora. Tente novamente em instantes.',
          error: 'Não foi possível carregar a dashboard agora. Tente novamente em instantes.',
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
        message: 'Não foi possível carregar a dashboard agora. Tente novamente em instantes.',
        error: 'Não foi possível carregar a dashboard agora. Tente novamente em instantes.',
      },
      { status: 500 }
    );
  }
}
