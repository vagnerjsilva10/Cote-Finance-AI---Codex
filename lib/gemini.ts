import 'server-only';
import { GoogleGenAI } from '@google/genai';

let geminiClient: GoogleGenAI | null = null;

export const GEMINI_KEY_MISSING_ERROR =
  'Gemini nao configurado. Defina GEMINI_API_KEY no servidor.';

export function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(GEMINI_KEY_MISSING_ERROR);
  }

  if (!geminiClient) {
    geminiClient = new GoogleGenAI({ apiKey });
  }

  return geminiClient;
}
