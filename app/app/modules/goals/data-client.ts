import { fetchResourceJson, type AuthHeadersResolver } from '@/app/app/modules/shared/resource-client';
import {
  applyPeriodSelectionToSearchParams,
  type DateRangeSelection,
} from '@/lib/date/period-resolver';

export async function fetchGoalsContext(params: {
  getAuthHeaders: AuthHeadersResolver;
  workspaceIdOverride?: string | null;
  periodSelection?: DateRangeSelection | null;
  dateField?: 'created_at' | 'deadline';
}) {
  const query = new URLSearchParams();
  if (params.periodSelection) {
    applyPeriodSelectionToSearchParams(query, params.periodSelection);
  }
  if (params.dateField) {
    query.set('dateField', params.dateField);
  }
  return fetchResourceJson<any[]>({
    path: `/api/goals${query.toString() ? `?${query.toString()}` : ''}`,
    getAuthHeaders: params.getAuthHeaders,
    workspaceIdOverride: params.workspaceIdOverride,
  });
}
