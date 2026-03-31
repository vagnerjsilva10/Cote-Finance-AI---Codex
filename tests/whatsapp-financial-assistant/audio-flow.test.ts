import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeIncomingWhatsAppMessages } from '@/lib/whatsapp/normalize-incoming-message';
import { isSupportedIncomingAudioMime } from '@/lib/whatsapp/audio-mime';

test('normalizes text and audio messages from webhook payload into same canonical envelope', () => {
  const payload = {
    entry: [
      {
        changes: [
          {
            value: {
              messages: [
                {
                  id: 'msg-text-1',
                  from: '5511999999999',
                  timestamp: '1710000000',
                  type: 'text',
                  text: { body: 'gastei 60 no ifood' },
                },
                {
                  id: 'msg-audio-1',
                  from: '5511888888888',
                  timestamp: '1710000001',
                  type: 'audio',
                  audio: { id: 'media-abc', mime_type: 'audio/ogg', sha256: 'hash' },
                },
              ],
            },
          },
        ],
      },
    ],
  };

  const messages = normalizeIncomingWhatsAppMessages(payload);
  assert.equal(messages.length, 2);
  assert.equal(messages[0]?.kind, 'text');
  assert.equal(messages[1]?.kind, 'audio');

  const audio = messages[1];
  if (audio?.kind !== 'audio') {
    throw new Error('Expected an audio message');
  }

  assert.equal(audio.audioId, 'media-abc');
  assert.equal(audio.mimeType, 'audio/ogg');
});

test('accepts only supported audio mime types', () => {
  assert.equal(isSupportedIncomingAudioMime('audio/ogg'), true);
  assert.equal(isSupportedIncomingAudioMime('audio/mpeg'), true);
  assert.equal(isSupportedIncomingAudioMime('audio/flac'), false);
});
