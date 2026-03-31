import 'server-only';

import { getGeminiClient } from '@/lib/gemini';

function sanitizeTranscription(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

export async function transcribeAudioWithGemini(params: {
  audioBuffer: Buffer;
  mimeType: string;
}) {
  const ai = getGeminiClient();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: [
              'Transcreva este áudio em português do Brasil.',
              'Retorne somente o texto transcrito, sem introduções ou metadados.',
              'Se estiver ilegível, retorne uma frase curta explicando que não foi possível entender.',
            ].join(' '),
          },
          {
            inlineData: {
              mimeType: params.mimeType,
              data: params.audioBuffer.toString('base64'),
            },
          },
        ],
      },
    ],
  });

  const text = sanitizeTranscription(response.text || '');
  if (!text) {
    throw new Error('Falha ao transcrever áudio: resposta vazia.');
  }

  return text;
}

