import { fetchResourceJson, type AuthHeadersResolver } from '@/app/app/modules/shared/resource-client';

export type DashboardScope = 'full' | 'transactions';

export async function fetchDashboardResource(params: {
  getAuthHeaders: AuthHeadersResolver;
  scope?: DashboardScope;
  workspaceIdOverride?: string | null;
}) {
  const scope = params.scope === 'transactions' ? 'transactions' : 'full';
  const path = `/api/dashboard${scope === 'transactions' ? '?scope=transactions' : ''}`;
  return fetchResourceJson<any>({
    path,
    getAuthHeaders: params.getAuthHeaders,
    workspaceIdOverride: params.workspaceIdOverride,
  });
}
