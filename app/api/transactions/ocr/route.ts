import { NextResponse } from 'next/server';
import { Type } from '@google/genai';
import { getGeminiClient, GEMINI_KEY_MISSING_ERROR } from '@/lib/gemini';
import { HttpError, resolveWorkspaceContext } from '@/lib/server/multi-tenant';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type OcrPayload = {
  amount?: number | null;
  date?: string | null;
  description?: string | null;
  recipient?: string | null;
  confidence?: number | null;
};

const SUPPORTED_TYPES = new Set(['image/jpeg', 'image/png', 'application/pdf']);

const parseAmount = (raw: string | null | undefined) => {
  if (!raw) return null;
  const normalized = raw.replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const extractFallbackData = (content: string): OcrPayload => {
  const normalized = content.replace(/\s+/g, ' ');
  const amountMatch = normalized.match(/(?:r\$\s*)?(\d{1,3}(?:\.\d{3})*(?:,\d{2})|\d+(?:[.,]\d{2})?)/i);
  const dateMatch = normalized.match(/\b(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})\b/);

  const words = normalized
    .split(' ')
    .filter((word) => word.length > 2)
    .slice(0, 10)
    .join(' ');

  return {
    amount: parseAmount(amountMatch?.[1]),
    date: dateMatch?.[1] || null,
    description: words || null,
    recipient: null,
    confidence: amountMatch || dateMatch ? 0.45 : 0.2,
  };
};

export async function POST(req: Request) {
  try {
    await resolveWorkspaceContext(req);

    const formData = await req.formData();
    const file = (formData.get('file') ?? formData.get('receipt')) as File | null;
    if (!file) {
      return NextResponse.json({ error: 'Arquivo não enviado.' }, { status: 400 });
    }

    if (!SUPPORTED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: 'Tipo de arquivo inválido. Use JPG, PNG ou PDF.' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fallback = extractFallbackData(buffer.toString('utf-8'));
    const base64 = buffer.toString('base64');

    let aiPayload: OcrPayload | null = null;
    try {
      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: 'Extraia os dados financeiros do comprovante e retorne JSON com amount, date, description, recipient e confidence (0-1).',
              },
              {
                inlineData: {
                  mimeType: file.type,
                  data: base64,
                },
              },
            ],
          },
        ],
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              amount: { type: Type.NUMBER },
              date: { type: Type.STRING },
              description: { type: Type.STRING },
              recipient: { type: Type.STRING },
              confidence: { type: Type.NUMBER },
            },
          },
        },
      });

      aiPayload = JSON.parse(response.text || '{}') as OcrPayload;
    } catch (error) {
      if (!(error instanceof Error && error.message === GEMINI_KEY_MISSING_ERROR)) {
        console.error('OCR AI parse failed, using fallback:', error);
      }
    }

    const payload = aiPayload || fallback;
    return NextResponse.json({
      detected: {
        amount: typeof payload.amount === 'number' ? payload.amount : fallback.amount,
        date: payload.date || fallback.date,
        description: payload.description || fallback.description || file.name,
        recipient: payload.recipient || null,
        confidence:
          typeof payload.confidence === 'number'
            ? payload.confidence
            : typeof fallback.confidence === 'number'
              ? fallback.confidence
              : 0.3,
      },
      receiptUrl: `uploaded://${file.name}`,
    });
  } catch (error: any) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error('OCR Route Error:', error);
    return NextResponse.json({ error: 'Falha ao analisar comprovante.' }, { status: 500 });
  }
}
