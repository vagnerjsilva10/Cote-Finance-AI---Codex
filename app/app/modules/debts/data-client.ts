import { fetchResourceJson, type AuthHeadersResolver } from '@/app/app/modules/shared/resource-client';
import {
  applyPeriodSelectionToSearchParams,
  type DateRangeSelection,
} from '@/lib/date/period-resolver';

export async function fetchDebtsContext(params: {
  getAuthHeaders: AuthHeadersResolver;
  workspaceIdOverride?: string | null;
  periodSelection?: DateRangeSelection | null;
  dateField?: 'due_date' | 'payment_date' | 'created_at';
}) {
  const query = new URLSearchParams();
  if (params.periodSelection) {
    applyPeriodSelectionToSearchParams(query, params.periodSelection);
  }
  if (params.dateField) {
    query.set('dateField', params.dateField);
  }
  return fetchResourceJson<any[]>({
    path: `/api/debts${query.toString() ? `?${query.toString()}` : ''}`,
    getAuthHeaders: params.getAuthHeaders,
    workspaceIdOverride: params.workspaceIdOverride,
  });
}

export async function fetchRecurringDebtsContext(params: {
  getAuthHeaders: AuthHeadersResolver;
  workspaceIdOverride?: string | null;
  periodSelection?: DateRangeSelection | null;
  dateField?: 'next_due_date' | 'start_date' | 'created_at';
}) {
  const query = new URLSearchParams();
  if (params.periodSelection) {
    applyPeriodSelectionToSearchParams(query, params.periodSelection);
  }
  if (params.dateField) {
    query.set('dateField', params.dateField);
  }
  return fetchResourceJson<any[]>({
    path: `/api/recurring-debts${query.toString() ? `?${query.toString()}` : ''}`,
    getAuthHeaders: params.getAuthHeaders,
    workspaceIdOverride: params.workspaceIdOverride,
  });
}
