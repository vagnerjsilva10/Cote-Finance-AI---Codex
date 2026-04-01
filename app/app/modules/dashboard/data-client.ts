import {
  fetchResourceJson,
  ResourceClientError,
  type AuthHeadersResolver,
} from '@/app/app/modules/shared/resource-client';
import {
  applyDashboardPeriodSelectionToSearchParams,
  type DashboardPeriodSelection,
} from '@/lib/dashboard/date-range';
import type { DashboardOverviewPayload } from '@/lib/dashboard/overview';

export type DashboardScope = 'full' | 'transactions';

export type DashboardCalendarReadPayload = {
  upcoming: any;
  summary: any;
};

export async function fetchDashboardResource(params: {
  getAuthHeaders: AuthHeadersResolver;
  scope?: DashboardScope;
  workspaceIdOverride?: string | null;
  query?: string;
}) {
  const scope = params.scope === 'transactions' ? 'transactions' : 'full';
  const query = new URLSearchParams(params.query || '');
  if (!query.has('scope') && scope === 'transactions') {
    query.set('scope', 'transactions');
  }
  const queryString = query.toString();
  const path = `/api/dashboard${queryString ? `?${queryString}` : ''}`;
  return fetchResourceJson<any>({
    path,
    getAuthHeaders: params.getAuthHeaders,
    workspaceIdOverride: params.workspaceIdOverride,
  });
}

export async function fetchDashboardOverviewResource(params: {
  getAuthHeaders: AuthHeadersResolver;
  workspaceIdOverride?: string | null;
  periodSelection?: DashboardPeriodSelection | null;
}) {
  const query = new URLSearchParams();
  if (params.periodSelection) {
    applyDashboardPeriodSelectionToSearchParams(query, params.periodSelection);
  }
  const queryString = query.toString();
  const path = `/api/dashboard/overview${queryString ? `?${queryString}` : ''}`;

  const request = () =>
    fetchResourceJson<DashboardOverviewPayload>({
      path,
      getAuthHeaders: params.getAuthHeaders,
      workspaceIdOverride: params.workspaceIdOverride,
      timeoutMs: 14000,
    });

  try {
    return await request();
  } catch (error) {
    if (error instanceof ResourceClientError && (error.status === 408 || error.status === 503)) {
      return request();
    }
    throw error;
  }
}

export async function fetchDashboardCalendarReadPayload(params: {
  getAuthHeaders: AuthHeadersResolver;
  workspaceIdOverride?: string | null;
  upcomingDays?: number;
  focusDate?: string | null;
}) {
  const upcomingDays = Math.max(1, Math.min(30, Number(params.upcomingDays || 14)));
  const upcomingQuery = new URLSearchParams();
  upcomingQuery.set('days', String(upcomingDays));

  const summaryQuery = new URLSearchParams();
  if (params.focusDate) {
    summaryQuery.set('date', params.focusDate);
  }

  const [upcoming, summary] = await Promise.all([
    fetchResourceJson<any>({
      path: `/api/financial-calendar/upcoming?${upcomingQuery.toString()}`,
      getAuthHeaders: params.getAuthHeaders,
      workspaceIdOverride: params.workspaceIdOverride,
    }),
    fetchResourceJson<any>({
      path: `/api/financial-calendar/summary${summaryQuery.toString() ? `?${summaryQuery.toString()}` : ''}`,
      getAuthHeaders: params.getAuthHeaders,
      workspaceIdOverride: params.workspaceIdOverride,
    }),
  ]);

  return {
    upcoming,
    summary,
  } satisfies DashboardCalendarReadPayload;
}
