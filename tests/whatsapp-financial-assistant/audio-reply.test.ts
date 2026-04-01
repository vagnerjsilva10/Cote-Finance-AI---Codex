import test from 'node:test';
import assert from 'node:assert/strict';

import { GeminiTtsError } from '@/lib/ai/gemini-tts';
import type { RuntimeAudioEnv } from '@/lib/config/env';
import { trySendWhatsAppAudioReply } from '@/lib/finance-assistant/audio-reply.service';

function makeEnv(overrides?: Partial<RuntimeAudioEnv>): RuntimeAudioEnv {
  return {
    geminiApiKey: 'test-gemini-key',
    geminiTtsModel: 'gemini-2.5-flash-preview-tts',
    whatsappAccessToken: 'wa-token',
    whatsappPhoneNumberId: 'wa-phone-id',
    whatsappBusinessAccountId: 'wa-business-id',
    whatsappVerifyToken: 'wa-verify-token',
    whatsappAppSecret: 'wa-app-secret',
    ...(overrides || {}),
  };
}

test('A) sem GEMINI_TTS_MODEL faz fallback textual e loga erro de modelo', async () => {
  const events: string[] = [];
  let synthCalls = 0;

  const result = await trySendWhatsAppAudioReply({
    workspaceId: 'w1',
    messageId: 'm-a',
    intent: 'create_expense',
    mode: 'both',
    to: '5511999999999',
    textForSpeech: '✅ Pronto! Registrei R$ 60,00 em Mercado.',
    deps: {
      readEnv: () => makeEnv({ geminiTtsModel: '' }),
      synthesizeAudio: async () => {
        synthCalls += 1;
        return {
          audioBuffer: Buffer.from('abc'),
          mimeType: 'audio/ogg',
          filename: 'reply.ogg',
          model: 'should-not-run',
        };
      },
      sendAudioMessage: async () => undefined,
      logEvent: async ({ event }) => {
        events.push(event);
      },
    },
  });

  assert.equal(result.sent, false);
  assert.equal(result.reason, 'tts_env_missing');
  assert.equal(synthCalls, 0);
  assert.ok(events.includes('WHATSAPP_TTS_MODEL_ERROR'));
  assert.ok(events.includes('WHATSAPP_AUDIO_REPLY_ERROR'));
});

test('B) com GEMINI_TTS_MODEL valido e modo both envia audio com sucesso', async () => {
  const events: string[] = [];
  let sendCalls = 0;

  const result = await trySendWhatsAppAudioReply({
    workspaceId: 'w1',
    messageId: 'm-b',
    intent: 'create_income',
    mode: 'both',
    to: '5511999999999',
    textForSpeech: '💰 Tudo certo! Registrei R$ 800,00 como recebimento no Pix.',
    deps: {
      readEnv: () => makeEnv(),
      synthesizeAudio: async () => ({
        audioBuffer: Buffer.from('abc'),
        mimeType: 'audio/ogg',
        filename: 'reply.ogg',
        model: 'gemini-2.5-flash-preview-tts',
      }),
      sendAudioMessage: async () => {
        sendCalls += 1;
      },
      logEvent: async ({ event }) => {
        events.push(event);
      },
    },
  });

  assert.equal(result.sent, true);
  assert.equal(sendCalls, 1);
  assert.ok(events.includes('WHATSAPP_AUDIO_REPLY_START'));
  assert.ok(events.includes('WHATSAPP_REPLY_AUDIO_SENT'));
  assert.ok(events.includes('WHATSAPP_AUDIO_REPLY_SUCCESS'));
});

test('C) provider retorna audio vazio e loga WHATSAPP_TTS_EMPTY_AUDIO', async () => {
  const events: string[] = [];
  let sendCalls = 0;

  const result = await trySendWhatsAppAudioReply({
    workspaceId: 'w1',
    messageId: 'm-c',
    intent: 'create_expense',
    mode: 'audio',
    to: '5511999999999',
    textForSpeech: '✅ Pronto! Registrei R$ 60,00 em Mercado.',
    deps: {
      readEnv: () => makeEnv(),
      synthesizeAudio: async () => ({
        audioBuffer: Buffer.alloc(0),
        mimeType: 'audio/ogg',
        model: 'gemini-2.5-flash-preview-tts',
      }),
      sendAudioMessage: async () => {
        sendCalls += 1;
      },
      logEvent: async ({ event }) => {
        events.push(event);
      },
    },
  });

  assert.equal(result.sent, false);
  assert.equal(result.reason, 'tts_empty_audio');
  assert.equal(sendCalls, 0);
  assert.ok(events.includes('WHATSAPP_TTS_EMPTY_AUDIO'));
});

test('D) erro do provider TTS loga WHATSAPP_TTS_MODEL_ERROR e fallback textual', async () => {
  const events: string[] = [];

  const result = await trySendWhatsAppAudioReply({
    workspaceId: 'w1',
    messageId: 'm-d',
    intent: 'create_income',
    mode: 'audio',
    to: '5511999999999',
    textForSpeech: '💰 Tudo certo! Registrei R$ 800,00 como recebimento no Pix.',
    deps: {
      readEnv: () => makeEnv(),
      synthesizeAudio: async () => {
        throw new GeminiTtsError({
          code: 'GEMINI_TTS_MODEL_ERROR',
          message: 'model not found',
          model: 'gemini-invalid-model',
          providerMessage: '404 model not found',
        });
      },
      sendAudioMessage: async () => undefined,
      logEvent: async ({ event }) => {
        events.push(event);
      },
    },
  });

  assert.equal(result.sent, false);
  assert.equal(result.reason, 'tts_generation_failed');
  assert.ok(events.includes('WHATSAPP_TTS_MODEL_ERROR'));
  assert.ok(events.includes('WHATSAPP_AUDIO_REPLY_ERROR'));
});

test('E) erro no envio de midia WhatsApp loga WHATSAPP_AUDIO_REPLY_ERROR', async () => {
  const events: string[] = [];

  const result = await trySendWhatsAppAudioReply({
    workspaceId: 'w1',
    messageId: 'm-e',
    intent: 'create_expense',
    mode: 'both',
    to: '5511999999999',
    textForSpeech: '✅ Pronto! Registrei R$ 60,00 em Mercado.',
    deps: {
      readEnv: () => makeEnv(),
      synthesizeAudio: async () => ({
        audioBuffer: Buffer.from('abc'),
        mimeType: 'audio/ogg',
        filename: 'reply.ogg',
        model: 'gemini-2.5-flash-preview-tts',
      }),
      sendAudioMessage: async () => {
        throw new Error('whatsapp media upload failed');
      },
      logEvent: async ({ event }) => {
        events.push(event);
      },
    },
  });

  assert.equal(result.sent, false);
  assert.equal(result.reason, 'audio_send_failed');
  assert.ok(events.includes('WHATSAPP_AUDIO_REPLY_ERROR'));
});

test('F) modo text nao tenta TTS', async () => {
  let synthCalls = 0;

  const result = await trySendWhatsAppAudioReply({
    workspaceId: 'w1',
    messageId: 'm-f',
    intent: 'create_expense',
    mode: 'text',
    to: '5511999999999',
    textForSpeech: '✅ Pronto! Registrei R$ 60,00 em Mercado.',
    deps: {
      readEnv: () => makeEnv(),
      synthesizeAudio: async () => {
        synthCalls += 1;
        return {
          audioBuffer: Buffer.from('abc'),
          mimeType: 'audio/ogg',
        };
      },
      sendAudioMessage: async () => undefined,
      logEvent: async () => undefined,
    },
  });

  assert.equal(result.attempted, false);
  assert.equal(result.reason, 'mode_disabled');
  assert.equal(synthCalls, 0);
});

test('G) modo audio tenta TTS e preserva fallback textual quando falha', async () => {
  const events: string[] = [];

  const result = await trySendWhatsAppAudioReply({
    workspaceId: 'w1',
    messageId: 'm-g',
    intent: 'create_expense',
    mode: 'audio',
    to: '5511999999999',
    textForSpeech: '✅ Pronto! Registrei R$ 60,00 em Mercado.',
    deps: {
      readEnv: () => makeEnv(),
      synthesizeAudio: async () => {
        throw new Error('provider timeout');
      },
      sendAudioMessage: async () => undefined,
      logEvent: async ({ event }) => {
        events.push(event);
      },
    },
  });

  assert.equal(result.sent, false);
  assert.equal(result.reason, 'tts_generation_failed');
  assert.ok(events.includes('WHATSAPP_AUDIO_REPLY_START'));
  assert.ok(events.includes('WHATSAPP_AUDIO_REPLY_ERROR'));
});
