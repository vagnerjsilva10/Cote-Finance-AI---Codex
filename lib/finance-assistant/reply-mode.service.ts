import 'server-only';

import {
  getWorkspaceWhatsAppConfig,
  saveWorkspaceWhatsAppConfig,
} from '@/lib/server/whatsapp-config';
import { type AssistantReplyMode } from '@/lib/ai/schemas/financial-intent.schema';

export type PersistedReplyMode = 'text' | 'audio' | 'both';

export async function getWorkspaceReplyMode(workspaceId: string): Promise<PersistedReplyMode> {
  const config = await getWorkspaceWhatsAppConfig(workspaceId);
  return config.assistantReplyMode;
}

export async function setWorkspaceReplyMode(params: {
  workspaceId: string;
  userId?: string | null;
  mode: PersistedReplyMode;
}) {
  await saveWorkspaceWhatsAppConfig({
    workspaceId: params.workspaceId,
    userId: params.userId ?? null,
    assistantReplyMode: params.mode,
  });
}

export function resolveReplyMode(params: {
  persistedMode: PersistedReplyMode;
  requestedMode: AssistantReplyMode;
}): PersistedReplyMode {
  if (params.requestedMode === 'unchanged') {
    return params.persistedMode;
  }
  return params.requestedMode;
}

