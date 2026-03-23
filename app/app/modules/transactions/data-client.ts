import { fetchDashboardResource } from '@/app/app/modules/dashboard/data-client';
import type { AuthHeadersResolver } from '@/app/app/modules/shared/resource-client';

export async function fetchTransactionsContext(params: {
  getAuthHeaders: AuthHeadersResolver;
  workspaceIdOverride?: string | null;
}) {
  return fetchDashboardResource({
    getAuthHeaders: params.getAuthHeaders,
    scope: 'transactions',
    workspaceIdOverride: params.workspaceIdOverride,
  });
}
