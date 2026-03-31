import 'server-only';

import { getGeminiClient } from '@/lib/gemini';

type SynthesizedAssistantAudio = {
  audioBuffer: Buffer;
  mimeType: string;
  filename?: string;
};

const DEFAULT_TTS_MODEL = 'gemini-2.5-flash-preview-tts';
const TTS_FALLBACK_MODELS = [
  'gemini-2.5-pro-preview-tts',
  'gemini-2.5-flash-native-audio-preview-12-2025',
];
const MAX_TTS_CHARACTERS = 900;

function normalizeMimeType(value: string) {
  return value.split(';')[0]?.trim().toLowerCase() || '';
}

function isSupportedOutgoingAudioMime(mimeType: string) {
  const normalized = normalizeMimeType(mimeType);
  return (
    normalized === 'audio/ogg' ||
    normalized === 'audio/aac' ||
    normalized === 'audio/mpeg' ||
    normalized === 'audio/mp4' ||
    normalized === 'audio/amr'
  );
}

function normalizeForSpeech(text: string) {
  const compact = text.replace(/\s+/g, ' ').trim();
  if (!compact) return '';
  return compact.length > MAX_TTS_CHARACTERS ? `${compact.slice(0, MAX_TTS_CHARACTERS)}...` : compact;
}

function pickAudioFilename(mimeType: string) {
  const normalized = normalizeMimeType(mimeType);
  if (normalized.includes('ogg')) return 'assistant-reply.ogg';
  if (normalized.includes('mpeg') || normalized.includes('mp3')) return 'assistant-reply.mp3';
  if (normalized.includes('aac')) return 'assistant-reply.aac';
  if (normalized.includes('wav')) return 'assistant-reply.wav';
  return 'assistant-reply.ogg';
}

function extractInlineAudioFromResponse(response: unknown): SynthesizedAssistantAudio | null {
  if (!response || typeof response !== 'object') return null;

  const responseRecord = response as Record<string, unknown>;
  const candidates = Array.isArray(responseRecord.candidates) ? responseRecord.candidates : [];
  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== 'object') continue;
    const content = (candidate as Record<string, unknown>).content;
    if (!content || typeof content !== 'object') continue;
    const parts = Array.isArray((content as Record<string, unknown>).parts)
      ? ((content as Record<string, unknown>).parts as unknown[])
      : [];

    for (const part of parts) {
      if (!part || typeof part !== 'object') continue;
      const inlineData = (part as Record<string, unknown>).inlineData;
      if (!inlineData || typeof inlineData !== 'object') continue;
      const data = String((inlineData as Record<string, unknown>).data || '').trim();
      if (!data) continue;

      const mimeType = String((inlineData as Record<string, unknown>).mimeType || 'audio/ogg').trim() || 'audio/ogg';
      const audioBuffer = Buffer.from(data, 'base64');
      if (!audioBuffer.length) continue;
      if (!isSupportedOutgoingAudioMime(mimeType)) continue;

      return {
        audioBuffer,
        mimeType,
        filename: pickAudioFilename(mimeType),
      };
    }
  }

  const rawData = typeof responseRecord.data === 'string' ? responseRecord.data.trim() : '';
  if (!rawData) return null;
  const audioBuffer = Buffer.from(rawData, 'base64');
  if (!audioBuffer.length) return null;
  return {
    audioBuffer,
    mimeType: 'audio/ogg',
    filename: 'assistant-reply.ogg',
  };
}

async function trySynthesizeWithModel(params: {
  model: string;
  text: string;
}): Promise<SynthesizedAssistantAudio | null> {
  const ai = getGeminiClient();
  const configuredVoice = String(process.env.GEMINI_TTS_VOICE || '').trim();
  const response = await ai.models.generateContent({
    model: params.model,
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: [
              'Converta o texto a seguir em audio natural em portugues do Brasil.',
              'Prefira audio compativel com WhatsApp (OGG Opus ou MP3).',
              'Retorne somente o audio sintetizado.',
              '',
              params.text,
            ].join('\n'),
          },
        ],
      },
    ],
    config: {
      responseModalities: ['audio'],
      speechConfig: {
        languageCode: 'pt-BR',
        ...(configuredVoice
          ? {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: configuredVoice,
                },
              },
            }
          : {}),
      },
      temperature: 0.3,
    },
  });

  return extractInlineAudioFromResponse(response);
}

export async function synthesizeAssistantAudio(text: string) {
  const normalizedText = normalizeForSpeech(text);
  if (!normalizedText) {
    return null;
  }

  const configuredModel = String(process.env.GEMINI_TTS_MODEL || '').trim();
  const modelQueue = [
    configuredModel || DEFAULT_TTS_MODEL,
    ...TTS_FALLBACK_MODELS.filter((candidate) => candidate !== configuredModel),
  ];

  for (const model of modelQueue) {
    try {
      const audio = await trySynthesizeWithModel({
        model,
        text: normalizedText,
      });
      if (audio) {
        return audio;
      }
      console.warn('WHATSAPP_TTS_EMPTY_AUDIO', { model });
    } catch (error) {
      console.warn('WHATSAPP_TTS_MODEL_ERROR', {
        model,
        error: error instanceof Error ? error.message : String(error || 'unknown_error'),
      });
      continue;
    }
  }

  // Keep text response as the guaranteed channel if TTS fails.
  return null;
}
