import { fetchResourceJson, type AuthHeadersResolver } from '@/app/app/modules/shared/resource-client';

export async function fetchGoalsContext(params: {
  getAuthHeaders: AuthHeadersResolver;
  workspaceIdOverride?: string | null;
}) {
  return fetchResourceJson<any[]>({
    path: '/api/goals',
    getAuthHeaders: params.getAuthHeaders,
    workspaceIdOverride: params.workspaceIdOverride,
  });
}
