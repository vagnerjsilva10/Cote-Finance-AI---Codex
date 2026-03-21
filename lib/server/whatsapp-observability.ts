import 'server-only';

export type WhatsAppOperationalEvent =
  | 'WHATSAPP_CONNECT_START'
  | 'WHATSAPP_CONNECT_META_ACCEPTED'
  | 'WHATSAPP_CONNECT_WEBHOOK_DELIVERED'
  | 'WHATSAPP_CONNECT_WEBHOOK_FAILED'
  | 'WHATSAPP_TEST_START'
  | 'WHATSAPP_TEST_META_ACCEPTED'
  | 'WHATSAPP_TEST_WEBHOOK_DELIVERED'
  | 'WHATSAPP_TEST_WEBHOOK_FAILED';

type WhatsAppOperationalPayload = {
  workspaceId: string;
  destination: string | null;
  templateName: string | null;
  messageId: string | null;
  statusFinal: string | null;
  failureReason: string | null;
  deliveryMode?: 'template' | 'text' | null;
};

export function logWhatsAppOperationalEvent(
  event: WhatsAppOperationalEvent,
  payload: WhatsAppOperationalPayload
) {
  const logger = /FAILED/.test(event) ? console.error : console.info;
  logger(event, payload);
}
