import 'server-only';

import {
  getWorkspaceWhatsAppConfig,
  saveWorkspaceWhatsAppConfig,
} from '@/lib/server/whatsapp-config';
import { resolveReplyMode, type PersistedReplyMode } from '@/lib/finance-assistant/reply-mode-resolver';

export { resolveReplyMode, type PersistedReplyMode };

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
