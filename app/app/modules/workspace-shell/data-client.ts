import { fetchResourceJson, type AuthHeadersResolver } from '@/app/app/modules/shared/resource-client';
import type { WorkspaceShellPayload } from '@/lib/workspace/shell';
import {
  applyPeriodSelectionToSearchParams,
  type DateRangeSelection,
} from '@/lib/date/period-resolver';

export async function fetchWorkspaceShellResource(params: {
  getAuthHeaders: AuthHeadersResolver;
  workspaceIdOverride?: string | null;
  scope?: 'full' | 'transactions';
  periodSelection?: DateRangeSelection | null;
}) {
  const query = new URLSearchParams();
  if (params.scope === 'transactions') {
    query.set('scope', 'transactions');
  }
  if (params.periodSelection) {
    applyPeriodSelectionToSearchParams(query, params.periodSelection);
  }

  return fetchResourceJson<WorkspaceShellPayload>({
    path: `/api/workspace-shell${query.toString() ? `?${query.toString()}` : ''}`,
    getAuthHeaders: params.getAuthHeaders,
    workspaceIdOverride: params.workspaceIdOverride,
    timeoutMs: 12000,
  });
}
