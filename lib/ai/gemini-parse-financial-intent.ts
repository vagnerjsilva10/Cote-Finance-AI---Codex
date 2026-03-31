import 'server-only';

import { Type } from '@google/genai';
import { getGeminiClient } from '@/lib/gemini';
import { ParsedFinancialIntentSchema, type ParsedFinancialIntent } from '@/lib/ai/schemas/financial-intent.schema';

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    intent: {
      type: Type.STRING,
      enum: [
        'create_expense',
        'create_income',
        'create_goal',
        'contribute_goal',
        'create_investment',
        'create_debt',
        'pay_debt',
        'query_summary',
        'set_reply_mode',
        'unknown',
      ],
    },
    confidence: { type: Type.NUMBER },
    needsConfirmation: { type: Type.BOOLEAN },
    replyModeRequested: {
      type: Type.STRING,
      enum: ['text', 'audio', 'both', 'unchanged'],
    },
    transaction: {
      type: Type.OBJECT,
      nullable: true,
      properties: {
        amount: { type: Type.NUMBER, nullable: true },
        currency: { type: Type.STRING, nullable: true },
        description: { type: Type.STRING, nullable: true },
        merchant: { type: Type.STRING, nullable: true },
        categoryHint: { type: Type.STRING, nullable: true },
        walletHint: { type: Type.STRING, nullable: true },
        date: { type: Type.STRING, nullable: true },
        notes: { type: Type.STRING, nullable: true },
      },
    },
    goal: {
      type: Type.OBJECT,
      nullable: true,
      properties: {
        name: { type: Type.STRING, nullable: true },
        targetAmount: { type: Type.NUMBER, nullable: true },
        contributionAmount: { type: Type.NUMBER, nullable: true },
        deadlineHint: { type: Type.STRING, nullable: true },
      },
    },
    investment: {
      type: Type.OBJECT,
      nullable: true,
      properties: {
        name: { type: Type.STRING, nullable: true },
        amount: { type: Type.NUMBER, nullable: true },
        typeHint: { type: Type.STRING, nullable: true },
        institutionHint: { type: Type.STRING, nullable: true },
        expectedReturnAnnual: { type: Type.NUMBER, nullable: true },
      },
    },
    debt: {
      type: Type.OBJECT,
      nullable: true,
      properties: {
        creditor: { type: Type.STRING, nullable: true },
        amount: { type: Type.NUMBER, nullable: true },
        dueDateHint: { type: Type.STRING, nullable: true },
        dueDay: { type: Type.NUMBER, nullable: true },
        categoryHint: { type: Type.STRING, nullable: true },
      },
    },
    query: {
      type: Type.OBJECT,
      nullable: true,
      properties: {
        metric: {
          type: Type.STRING,
          enum: [
            'category_spend_month',
            'goal_remaining',
            'investment_total',
            'monthly_summary',
            'debt_total',
            'unknown',
          ],
        },
        categoryHint: { type: Type.STRING, nullable: true },
        goalHint: { type: Type.STRING, nullable: true },
        periodHint: { type: Type.STRING, nullable: true },
      },
    },
  },
  required: ['intent'],
} as const;

export async function parseFinancialIntentWithGemini(params: {
  userText: string;
  todayIsoDate: string;
}): Promise<ParsedFinancialIntent> {
  const ai = getGeminiClient();
  const prompt = [
    'Você é um parser de intenção financeira para WhatsApp.',
    'Retorne APENAS JSON válido.',
    `Data de referência: ${params.todayIsoDate}.`,
    'Classifique a mensagem em uma intent e extraia entidades objetivas.',
    'Use "unknown" quando não houver intenção confiável.',
    'Respeite o schema e não invente valores ausentes.',
    '',
    'Mensagem:',
    params.userText,
  ].join('\n');

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
      temperature: 0.1,
    },
  });

  const payload = JSON.parse(response.text || '{}');
  return ParsedFinancialIntentSchema.parse(payload);
}

