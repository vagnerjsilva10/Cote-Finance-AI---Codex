import 'server-only';

import { syncWorkspaceFinancialCalendarSourcesSafe } from '@/lib/server/financial-calendar';

type FinancialSyncMode = 'off' | 'async' | 'blocking';

type WorkspaceSyncState = {
  running: boolean;
  pending: boolean;
  timer: NodeJS.Timeout | null;
};

const DEFAULT_DEBOUNCE_MS = 700;

const workspaceSyncState = new Map<string, WorkspaceSyncState>();

function resolveSyncMode(): FinancialSyncMode {
  const raw = String(process.env.FINANCIAL_SYNC_MODE || 'async')
    .trim()
    .toLowerCase();

  if (raw === 'off') return 'off';
  if (raw === 'blocking') return 'blocking';
  return 'async';
}

function resolveDebounceMs() {
  const parsed = Number(process.env.FINANCIAL_SYNC_DEBOUNCE_MS || DEFAULT_DEBOUNCE_MS);
  if (!Number.isFinite(parsed)) return DEFAULT_DEBOUNCE_MS;
  return Math.max(0, Math.floor(parsed));
}

function getWorkspaceState(workspaceId: string): WorkspaceSyncState {
  const existing = workspaceSyncState.get(workspaceId);
  if (existing) return existing;

  const created: WorkspaceSyncState = {
    running: false,
    pending: false,
    timer: null,
  };
  workspaceSyncState.set(workspaceId, created);
  return created;
}

async function runWorkspaceSync(workspaceId: string) {
  const state = getWorkspaceState(workspaceId);

  if (state.running) {
    state.pending = true;
    return;
  }

  state.running = true;
  try {
    await syncWorkspaceFinancialCalendarSourcesSafe(workspaceId);
  } finally {
    state.running = false;

    if (state.pending) {
      state.pending = false;
      scheduleWorkspaceSync(workspaceId);
      return;
    }

    if (!state.timer) {
      workspaceSyncState.delete(workspaceId);
    }
  }
}

function scheduleWorkspaceSync(workspaceId: string) {
  const state = getWorkspaceState(workspaceId);

  if (state.running) {
    state.pending = true;
    return;
  }

  if (state.timer) {
    return;
  }

  const debounceMs = resolveDebounceMs();
  state.timer = setTimeout(() => {
    state.timer = null;
    void runWorkspaceSync(workspaceId);
  }, debounceMs);
}

export async function triggerWorkspaceFinancialSync(params: {
  workspaceId: string;
  forceBlocking?: boolean;
}) {
  const mode = params.forceBlocking ? 'blocking' : resolveSyncMode();

  if (mode === 'off') {
    return {
      mode,
      scheduled: false,
    };
  }

  if (mode === 'blocking') {
    await syncWorkspaceFinancialCalendarSourcesSafe(params.workspaceId);
    return {
      mode,
      scheduled: false,
    };
  }

  scheduleWorkspaceSync(params.workspaceId);
  return {
    mode,
    scheduled: true,
  };
}

