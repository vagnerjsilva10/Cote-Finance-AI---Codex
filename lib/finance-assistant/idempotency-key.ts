const WHATSAPP_MESSAGE_IDEMPOTENCY_PREFIX = 'whatsapp.assistant.processed-message.';

export function buildWhatsAppMessageIdempotencyKey(messageId: string) {
  return `${WHATSAPP_MESSAGE_IDEMPOTENCY_PREFIX}${messageId.trim()}`;
}

