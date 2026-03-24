import { fetchResourceJson, type AuthHeadersResolver } from '@/app/app/modules/shared/resource-client';
import type { ReportsOverviewPayload } from '@/domain/reports/report-overview';

export async function fetchReportsOverviewResource(params: {
  getAuthHeaders: AuthHeadersResolver;
  workspaceIdOverride?: string | null;
}) {
  return fetchResourceJson<ReportsOverviewPayload>({
    path: '/api/reports/overview',
    getAuthHeaders: params.getAuthHeaders,
    workspaceIdOverride: params.workspaceIdOverride,
  });
}
