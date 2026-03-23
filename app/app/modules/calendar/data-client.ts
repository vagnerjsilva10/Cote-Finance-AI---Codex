import { fetchResourceJson, type AuthHeadersResolver } from '@/app/app/modules/shared/resource-client';

export async function fetchCalendarSnapshotContext(params: {
  getAuthHeaders: AuthHeadersResolver;
  view?: 'day' | 'week' | 'month';
  date?: string | null;
  workspaceIdOverride?: string | null;
}) {
  const view = params.view || 'month';
  const query = new URLSearchParams();
  query.set('view', view);
  if (params.date) query.set('date', params.date);

  return fetchResourceJson<any>({
    path: `/api/financial-calendar?${query.toString()}`,
    getAuthHeaders: params.getAuthHeaders,
    workspaceIdOverride: params.workspaceIdOverride,
  });
}
