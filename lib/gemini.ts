import 'server-only';
import { GoogleGenAI } from '@google/genai';

let geminiClient: GoogleGenAI | null = null;

export const GEMINI_KEY_MISSING_ERROR =
  'Gemini API key is missing. Defina GEMINI_API_KEY ou NEXT_PUBLIC_GEMINI_API_KEY.';

export function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(GEMINI_KEY_MISSING_ERROR);
  }

  if (!geminiClient) {
    geminiClient = new GoogleGenAI({ apiKey });
  }

  return geminiClient;
}
