import test from 'node:test';
import assert from 'node:assert/strict';
import { trimConversationMemoryMessages } from '@/lib/ai/conversation-memory-helpers';

type MemoryMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  metadata: null;
};

function buildMessage(index: number): MemoryMessage {
  return {
    id: `m-${index}`,
    role: index % 2 === 0 ? 'user' : 'assistant',
    content: `msg-${index}`,
    createdAt: new Date(2026, 0, 1, 0, index).toISOString(),
    metadata: null,
  };
}

test('memoria curta mantem no maximo 10 turnos (20 mensagens)', () => {
  const messages = Array.from({ length: 27 }, (_, index) => buildMessage(index));
  const trimmed = trimConversationMemoryMessages(messages);

  assert.equal(trimmed.length, 20);
  assert.equal(trimmed[0]?.id, 'm-7');
  assert.equal(trimmed[19]?.id, 'm-26');
});
