import 'server-only';

import { Modality } from '@google/genai';
import { getGeminiClient } from '@/lib/gemini';
import { getRuntimeAudioEnv } from '@/lib/config/env';

export type GeminiTtsResult = {
  audioBuffer: Buffer;
  mimeType: string;
  filename: string;
  model: string;
};

export type GeminiTtsErrorCode =
  | 'MISSING_GEMINI_API_KEY'
  | 'MISSING_GEMINI_TTS_MODEL'
  | 'GEMINI_TTS_MODEL_ERROR'
  | 'GEMINI_TTS_EMPTY_AUDIO';

export class GeminiTtsError extends Error {
  readonly code: GeminiTtsErrorCode;
  readonly model: string | null;
  readonly providerMessage: string | null;

  constructor(params: {
    code: GeminiTtsErrorCode;
    message: string;
    model?: string | null;
    providerMessage?: string | null;
  }) {
    super(params.message);
    this.name = 'GeminiTtsError';
    this.code = params.code;
    this.model = params.model ?? null;
    this.providerMessage = params.providerMessage ?? null;
  }
}

const MAX_TTS_CHARACTERS = 900;

function normalizeMimeType(value: string) {
  return value.split(';')[0]?.trim().toLowerCase() || '';
}

function pickAudioFilename(mimeType: string) {
  const normalized = normalizeMimeType(mimeType);
  if (normalized.includes('ogg')) return 'assistant-reply.ogg';
  if (normalized.includes('mpeg') || normalized.includes('mp3')) return 'assistant-reply.mp3';
  if (normalized.includes('aac')) return 'assistant-reply.aac';
  if (normalized.includes('wav')) return 'assistant-reply.wav';
  return 'assistant-reply.ogg';
}

function normalizeTextForTts(value: string) {
  const noEmoji = value.replace(
    /[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu,
    ''
  );
  const withReadableCurrency = noEmoji
    .replace(/\bR\$\s?(\d+[.,]?\d*)/g, ' $1 reais ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!withReadableCurrency) return '';
  if (withReadableCurrency.length <= MAX_TTS_CHARACTERS) return withReadableCurrency;
  return `${withReadableCurrency.slice(0, MAX_TTS_CHARACTERS).trim()}...`;
}

function extractAudioPayload(response: unknown) {
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
      const inlineData =
        (part as Record<string, unknown>).inlineData ||
        (part as Record<string, unknown>).inline_data;
      if (!inlineData || typeof inlineData !== 'object') continue;

      const data = String(
        (inlineData as Record<string, unknown>).data ||
          (inlineData as Record<string, unknown>).audio ||
          ''
      ).trim();
      if (!data) continue;

      const mimeType = String(
        (inlineData as Record<string, unknown>).mimeType ||
          (inlineData as Record<string, unknown>).mime_type ||
          'audio/ogg'
      ).trim() || 'audio/ogg';
      const audioBuffer = Buffer.from(data, 'base64');
      if (!audioBuffer.length) continue;

      return {
        audioBuffer,
        mimeType: normalizeMimeType(mimeType) || 'audio/ogg',
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
  };
}

export async function synthesizeSpeechWithGemini(text: string): Promise<GeminiTtsResult> {
  const env = getRuntimeAudioEnv();
  if (!env.geminiApiKey) {
    throw new GeminiTtsError({
      code: 'MISSING_GEMINI_API_KEY',
      message: 'GEMINI_API_KEY ausente no servidor.',
      model: null,
    });
  }
  if (!env.geminiTtsModel) {
    throw new GeminiTtsError({
      code: 'MISSING_GEMINI_TTS_MODEL',
      message: 'GEMINI_TTS_MODEL ausente no servidor.',
      model: null,
    });
  }

  const normalizedText = normalizeTextForTts(text);
  if (!normalizedText) {
    throw new GeminiTtsError({
      code: 'GEMINI_TTS_EMPTY_AUDIO',
      message: 'Texto vazio apos normalizacao para TTS.',
      model: env.geminiTtsModel,
    });
  }

  const ai = getGeminiClient();
  const configuredVoice = env.geminiTtsVoice;

  let response: unknown;
  try {
    response = await ai.models.generateContent({
      model: env.geminiTtsModel,
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
                normalizedText,
              ].join('\n'),
            },
          ],
        },
      ],
      config: {
        responseModalities: [Modality.AUDIO],
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
  } catch (error) {
    throw new GeminiTtsError({
      code: 'GEMINI_TTS_MODEL_ERROR',
      message: 'Falha ao chamar Gemini TTS.',
      model: env.geminiTtsModel,
      providerMessage: error instanceof Error ? error.message : String(error || 'unknown_error'),
    });
  }

  const payload = extractAudioPayload(response);
  if (!payload || !payload.audioBuffer.length) {
    throw new GeminiTtsError({
      code: 'GEMINI_TTS_EMPTY_AUDIO',
      message: 'Gemini TTS retornou audio vazio.',
      model: env.geminiTtsModel,
    });
  }

  return {
    audioBuffer: payload.audioBuffer,
    mimeType: payload.mimeType || 'audio/ogg',
    filename: pickAudioFilename(payload.mimeType),
    model: env.geminiTtsModel,
  };
}
