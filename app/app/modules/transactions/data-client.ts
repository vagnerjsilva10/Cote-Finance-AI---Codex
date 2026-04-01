import { fetchWorkspaceShellResource } from '@/app/app/modules/workspace-shell/data-client';
import type { AuthHeadersResolver } from '@/app/app/modules/shared/resource-client';
import type { DateRangeSelection } from '@/lib/date/period-resolver';

export async function fetchTransactionsContext(params: {
  getAuthHeaders: AuthHeadersResolver;
  workspaceIdOverride?: string | null;
  lite?: boolean;
  periodSelection?: DateRangeSelection | null;
}) {
  return fetchWorkspaceShellResource({
    getAuthHeaders: params.getAuthHeaders,
    workspaceIdOverride: params.workspaceIdOverride,
    scope: 'transactions',
    periodSelection: params.periodSelection ?? null,
  });
}
