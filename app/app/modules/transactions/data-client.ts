import { fetchWorkspaceShellResource } from '@/app/app/modules/workspace-shell/data-client';
import type { AuthHeadersResolver } from '@/app/app/modules/shared/resource-client';

export async function fetchTransactionsContext(params: {
  getAuthHeaders: AuthHeadersResolver;
  workspaceIdOverride?: string | null;
  lite?: boolean;
}) {
  return fetchWorkspaceShellResource({
    getAuthHeaders: params.getAuthHeaders,
    workspaceIdOverride: params.workspaceIdOverride,
    scope: 'transactions',
  });
}
