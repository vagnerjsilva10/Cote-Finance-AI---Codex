import { fetchResourceJson, type AuthHeadersResolver } from '@/app/app/modules/shared/resource-client';
import type { ReportsOverviewPayload } from '@/domain/reports/report-overview';
import {
  applyPeriodSelectionToSearchParams,
  type DateRangeSelection,
} from '@/lib/date/period-resolver';

export async function fetchReportsOverviewResource(params: {
  getAuthHeaders: AuthHeadersResolver;
  workspaceIdOverride?: string | null;
  periodSelection?: DateRangeSelection | null;
}) {
  const query = new URLSearchParams();
  if (params.periodSelection) {
    applyPeriodSelectionToSearchParams(query, params.periodSelection);
  }

  return fetchResourceJson<ReportsOverviewPayload>({
    path: `/api/reports/overview${query.toString() ? `?${query.toString()}` : ''}`,
    getAuthHeaders: params.getAuthHeaders,
    workspaceIdOverride: params.workspaceIdOverride,
    timeoutMs: 12000,
  });
}
