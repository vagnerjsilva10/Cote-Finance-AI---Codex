import { fetchResourceJson, type AuthHeadersResolver } from '@/app/app/modules/shared/resource-client';

export async function fetchInvestmentsContext(params: {
  getAuthHeaders: AuthHeadersResolver;
  workspaceIdOverride?: string | null;
}) {
  return fetchResourceJson<any[]>({
    path: '/api/investments',
    getAuthHeaders: params.getAuthHeaders,
    workspaceIdOverride: params.workspaceIdOverride,
  });
}
