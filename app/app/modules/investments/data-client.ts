import { fetchResourceJson, type AuthHeadersResolver } from '@/app/app/modules/shared/resource-client';
import {
  applyPeriodSelectionToSearchParams,
  type DateRangeSelection,
} from '@/lib/date/period-resolver';

export async function fetchInvestmentsContext(params: {
  getAuthHeaders: AuthHeadersResolver;
  workspaceIdOverride?: string | null;
  periodSelection?: DateRangeSelection | null;
}) {
  const query = new URLSearchParams();
  if (params.periodSelection) {
    applyPeriodSelectionToSearchParams(query, params.periodSelection);
  }
  return fetchResourceJson<any[]>({
    path: `/api/investments${query.toString() ? `?${query.toString()}` : ''}`,
    getAuthHeaders: params.getAuthHeaders,
    workspaceIdOverride: params.workspaceIdOverride,
  });
}
