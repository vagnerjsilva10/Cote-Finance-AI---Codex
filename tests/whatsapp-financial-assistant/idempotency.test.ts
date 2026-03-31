import test from 'node:test';
import assert from 'node:assert/strict';
import { buildWhatsAppMessageIdempotencyKey } from '@/lib/finance-assistant/idempotency';

test('builds deterministic idempotency key from message id', () => {
  const keyA = buildWhatsAppMessageIdempotencyKey('wamid.HBgMNTUxMTk5OTk5OTk5FQIAERgSM0YxNzg0');
  const keyB = buildWhatsAppMessageIdempotencyKey('  wamid.HBgMNTUxMTk5OTk5OTk5FQIAERgSM0YxNzg0  ');

  assert.equal(keyA, keyB.trim());
  assert.ok(keyA.startsWith('whatsapp.assistant.processed-message.'));
});
