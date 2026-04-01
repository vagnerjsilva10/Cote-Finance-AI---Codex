import 'server-only';

import { logWorkspaceEventSafe } from '@/lib/server/multi-tenant';

export type WhatsAppAssistantAuditEvent =
  | 'WHATSAPP_MSG_RECEIVED'
  | 'WHATSAPP_USER_RESOLVED'
  | 'WHATSAPP_FEATURE_ACCESS_CHECK_START'
  | 'WHATSAPP_FEATURE_ACCESS_GRANTED'
  | 'WHATSAPP_FEATURE_ACCESS_DENIED'
  | 'WHATSAPP_AUDIO_DOWNLOAD_START'
  | 'WHATSAPP_AUDIO_DOWNLOAD_SUCCESS'
  | 'GEMINI_TRANSCRIPTION_START'
  | 'GEMINI_TRANSCRIPTION_SUCCESS'
  | 'GEMINI_INTENT_PARSE_START'
  | 'GEMINI_INTENT_PARSE_SUCCESS'
  | 'INTENT_PARSE_SUCCESS'
  | 'CATEGORY_RESOLUTION_START'
  | 'CATEGORY_MATCH_FOUND'
  | 'CATEGORY_AUTO_CREATED'
  | 'DESCRIPTION_GENERATED'
  | 'ACTION_EXECUTION_START'
  | 'ACTION_EXECUTION_SUCCESS'
  | 'ACTION_EXECUTION_ERROR'
  | 'WHATSAPP_RESPONSE_GENERATED'
  | 'WHATSAPP_REPLY_TEXT_SENT'
  | 'WHATSAPP_AUDIO_REPLY_START'
  | 'WHATSAPP_AUDIO_REPLY_SUCCESS'
  | 'WHATSAPP_AUDIO_REPLY_ERROR'
  | 'WHATSAPP_REPLY_AUDIO_SENT'
  | 'WHATSAPP_REPLY_AUDIO_SKIPPED'
  | 'WHATSAPP_IDEMPOTENT_SKIP';

const EVENT_PREFIX = 'whatsapp.assistant.';

function toWorkspaceEventType(event: WhatsAppAssistantAuditEvent) {
  return `${EVENT_PREFIX}${event.toLowerCase()}`;
}

export async function logWhatsAppAssistantEvent(params: {
  workspaceId: string;
  userId?: string | null;
  event: WhatsAppAssistantAuditEvent;
  payload?: Record<string, unknown>;
}) {
  const logPayload = {
    workspaceId: params.workspaceId,
    userId: params.userId ?? null,
    event: params.event,
    ...(params.payload || {}),
  };

  console.info(params.event, logPayload);

  await logWorkspaceEventSafe({
    workspaceId: params.workspaceId,
    userId: params.userId ?? null,
    type: toWorkspaceEventType(params.event),
    payload: logPayload,
  });
}
