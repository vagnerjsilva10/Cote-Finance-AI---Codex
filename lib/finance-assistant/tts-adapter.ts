import 'server-only';

import { synthesizeSpeechWithGemini } from '@/lib/ai/gemini-tts';

export async function synthesizeAssistantAudio(text: string) {
  return synthesizeSpeechWithGemini(text);
}

