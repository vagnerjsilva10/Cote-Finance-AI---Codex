import type { ParsedFinancialIntent } from '@/lib/ai/schemas/financial-intent.schema';

export type LegacyPassthroughDecision = {
  shouldPassthrough: boolean;
  reason:
    | 'non_text_message'
    | 'known_intent'
    | 'blank_text'
    | 'financial_signal_detected'
    | 'non_financial_unknown';
  normalizedText: string;
  isLikelyFinancial: boolean;
};

const FINANCIAL_SIGNAL_KEYWORDS = [
  'gastei',
  'paguei',
  'recebi',
  'ganhei',
  'mercado',
  'ifood',
  'aluguel',
  'fatura',
  'divida',
  'investi',
  'aporte',
  'meta',
  'saldo',
  'resumo',
  'lancamento',
  'categoria',
  'pix',
];

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function hasAmountLikeToken(text: string) {
  return /(?:r\$\s*)?\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?|(?:r\$\s*)?\d+(?:[.,]\d{1,2})?/.test(
    text
  );
}

function hasFinancialSignal(text: string) {
  if (hasAmountLikeToken(text)) return true;
  return FINANCIAL_SIGNAL_KEYWORDS.some((keyword) => text.includes(keyword));
}

export function decideLegacyPassthrough(params: {
  messageKind: 'text' | 'audio';
  rawText: string;
  previewIntent: ParsedFinancialIntent;
}): LegacyPassthroughDecision {
  const normalizedText = normalizeText(params.rawText);

  if (params.messageKind !== 'text') {
    return {
      shouldPassthrough: false,
      reason: 'non_text_message',
      normalizedText,
      isLikelyFinancial: true,
    };
  }

  if (params.previewIntent.intent !== 'unknown') {
    return {
      shouldPassthrough: false,
      reason: 'known_intent',
      normalizedText,
      isLikelyFinancial: true,
    };
  }

  if (!normalizedText) {
    return {
      shouldPassthrough: true,
      reason: 'blank_text',
      normalizedText,
      isLikelyFinancial: false,
    };
  }

  if (hasFinancialSignal(normalizedText)) {
    return {
      shouldPassthrough: false,
      reason: 'financial_signal_detected',
      normalizedText,
      isLikelyFinancial: true,
    };
  }

  return {
    shouldPassthrough: true,
    reason: 'non_financial_unknown',
    normalizedText,
    isLikelyFinancial: false,
  };
}
