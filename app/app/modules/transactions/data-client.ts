import { fetchDashboardResource } from '@/app/app/modules/dashboard/data-client';
import type { AuthHeadersResolver } from '@/app/app/modules/shared/resource-client';

export async function fetchTransactionsContext(params: {
  getAuthHeaders: AuthHeadersResolver;
  workspaceIdOverride?: string | null;
  lite?: boolean;
}) {
  const search = new URLSearchParams();
  search.set('scope', 'transactions');
  if (params.lite) {
    search.set('lite', '1');
  }

  return fetchDashboardResource({
    getAuthHeaders: params.getAuthHeaders,
    scope: 'transactions',
    workspaceIdOverride: params.workspaceIdOverride,
    query: search.toString(),
  });
}
