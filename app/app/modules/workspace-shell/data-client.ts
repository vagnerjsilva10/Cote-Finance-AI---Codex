import { fetchResourceJson, type AuthHeadersResolver } from '@/app/app/modules/shared/resource-client';
import type { WorkspaceShellPayload } from '@/lib/workspace/shell';

export async function fetchWorkspaceShellResource(params: {
  getAuthHeaders: AuthHeadersResolver;
  workspaceIdOverride?: string | null;
  scope?: 'full' | 'transactions';
}) {
  const query = new URLSearchParams();
  if (params.scope === 'transactions') {
    query.set('scope', 'transactions');
  }

  return fetchResourceJson<WorkspaceShellPayload>({
    path: `/api/workspace-shell${query.toString() ? `?${query.toString()}` : ''}`,
    getAuthHeaders: params.getAuthHeaders,
    workspaceIdOverride: params.workspaceIdOverride,
    timeoutMs: 12000,
  });
}
