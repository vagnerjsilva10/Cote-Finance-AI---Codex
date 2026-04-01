import test from 'node:test';
import assert from 'node:assert/strict';
import { trySendWhatsAppAudioReply } from '@/lib/finance-assistant/audio-reply.service';

test('envia audio quando modo = audio', async () => {
  const calls: string[] = [];

  const result = await trySendWhatsAppAudioReply({
    workspaceId: 'w1',
    messageId: 'm1',
    intent: 'create_expense',
    mode: 'audio',
    to: '5511999999999',
    textForSpeech: '✅ Pronto! Registrei R$ 60,00 em Mercado.',
    deps: {
      synthesizeAudio: async () => {
        calls.push('synthesize');
        return {
          audioBuffer: Buffer.from('abc'),
          mimeType: 'audio/ogg',
          filename: 'reply.ogg',
        };
      },
      sendAudioMessage: async () => {
        calls.push('send');
      },
      logEvent: async () => {
        calls.push('log');
      },
    },
  });

  assert.equal(result.sent, true);
  assert.ok(calls.includes('synthesize'));
  assert.ok(calls.includes('send'));
});

test('envia audio quando modo = both', async () => {
  let sendCount = 0;

  const result = await trySendWhatsAppAudioReply({
    workspaceId: 'w1',
    messageId: 'm2',
    intent: 'create_income',
    mode: 'both',
    to: '5511999999999',
    textForSpeech: '💰 Tudo certo! Registrei R$ 800,00 como recebimento no Pix.',
    deps: {
      synthesizeAudio: async () => ({
        audioBuffer: Buffer.from('abc'),
        mimeType: 'audio/ogg',
      }),
      sendAudioMessage: async () => {
        sendCount += 1;
      },
      logEvent: async () => undefined,
    },
  });

  assert.equal(result.sent, true);
  assert.equal(sendCount, 1);
});

test('mantem fallback quando TTS falha', async () => {
  let sendCount = 0;

  const result = await trySendWhatsAppAudioReply({
    workspaceId: 'w1',
    messageId: 'm3',
    intent: 'create_expense',
    mode: 'audio',
    to: '5511999999999',
    textForSpeech: '✅ Pronto! Registrei R$ 60,00 em Mercado.',
    deps: {
      synthesizeAudio: async () => null,
      sendAudioMessage: async () => {
        sendCount += 1;
      },
      logEvent: async () => undefined,
    },
  });

  assert.equal(result.sent, false);
  assert.equal(result.reason, 'tts_unavailable_or_failed');
  assert.equal(sendCount, 0);
});
