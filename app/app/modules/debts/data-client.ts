import { fetchResourceJson, type AuthHeadersResolver } from '@/app/app/modules/shared/resource-client';

export async function fetchDebtsContext(params: {
  getAuthHeaders: AuthHeadersResolver;
  workspaceIdOverride?: string | null;
}) {
  return fetchResourceJson<any[]>({
    path: '/api/debts',
    getAuthHeaders: params.getAuthHeaders,
    workspaceIdOverride: params.workspaceIdOverride,
  });
}

export async function fetchRecurringDebtsContext(params: {
  getAuthHeaders: AuthHeadersResolver;
  workspaceIdOverride?: string | null;
}) {
  return fetchResourceJson<any[]>({
    path: '/api/recurring-debts',
    getAuthHeaders: params.getAuthHeaders,
    workspaceIdOverride: params.workspaceIdOverride,
  });
}
