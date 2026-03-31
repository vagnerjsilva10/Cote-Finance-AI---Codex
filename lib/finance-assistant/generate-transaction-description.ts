import {
  areEquivalentCategoryKeys,
  normalizeCategoryKey,
  normalizeCategoryToken,
  resolveCanonicalCategoryHint,
} from '@/lib/finance-assistant/category-normalizer';

export const PREFERRED_DESCRIPTION_MAX_LENGTH = 32;
export const ABSOLUTE_DESCRIPTION_MAX_LENGTH = 48;

function clampByWordBoundary(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;
  const trimmed = value.slice(0, maxLength).trim();
  const lastSpace = trimmed.lastIndexOf(' ');
  if (lastSpace >= 8) return trimmed.slice(0, lastSpace).trim();
  return trimmed;
}

function sanitizeDescription(value: string) {
  const normalized = String(value || '')
    .replace(/["'`]+/g, '')
    .replace(/\s+/g, ' ')
    .replace(/[.!?]+$/g, '')
    .trim();

  if (!normalized) return '';
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function isLiteralCopy(candidate: string, rawUtterance: string | null | undefined) {
  const left = normalizeCategoryToken(candidate);
  const right = normalizeCategoryToken(rawUtterance || '');
  if (!left || !right) return false;
  if (left === right) return true;
  return left.length > 16 && (right.includes(left) || left.includes(right));
}

function matchesAny(key: string, values: string[]) {
  return values.some((value) => areEquivalentCategoryKeys(key, value));
}

function extractClientName(source: string) {
  const match = normalizeCategoryToken(source).match(/cliente\s+([a-z0-9]{2,})/);
  if (!match) return null;
  const token = match[1] || '';
  return token ? token.charAt(0).toUpperCase() + token.slice(1) : null;
}

export function generateTransactionDescription(params: {
  intent: 'create_expense' | 'create_income';
  categoryName: string;
  categoryHint?: string | null;
  merchant?: string | null;
  modelShortDescription?: string | null;
  rawUtterance?: string | null;
}) {
  const canonicalHint = resolveCanonicalCategoryHint({
    hint: [params.categoryHint, params.merchant, params.categoryName].filter(Boolean).join(' '),
    flowType: params.intent === 'create_income' ? 'income' : 'expense',
  });
  const key = normalizeCategoryKey(canonicalHint || params.categoryName || params.categoryHint || '');
  const merchantToken = normalizeCategoryToken(params.merchant || params.categoryHint || '');
  const categoryLabel = String(params.categoryName || '').trim() || (params.intent === 'create_income' ? 'Recebimento' : 'Outros');

  let candidate = '';
  if (params.modelShortDescription) {
    candidate = sanitizeDescription(params.modelShortDescription);
  }

  if (!candidate || isLiteralCopy(candidate, params.rawUtterance)) {
    if (params.intent === 'create_expense') {
      if (matchesAny(key, ['Mercado'])) candidate = 'Compra no mercado';
      else if (matchesAny(key, ['Delivery']) && merchantToken.includes('ifood')) candidate = 'Compra no iFood';
      else if (matchesAny(key, ['Delivery'])) candidate = 'Pedido de delivery';
      else if (matchesAny(key, ['Combustivel'])) candidate = 'Abastecimento';
      else if (matchesAny(key, ['Farmacia'])) candidate = 'Compra na farmacia';
      else if (matchesAny(key, ['Assinaturas'])) candidate = 'Assinatura digital';
      else if (matchesAny(key, ['Moradia'])) candidate = 'Pagamento de moradia';
      else if (matchesAny(key, ['Internet'])) candidate = 'Conta de internet';
      else if (matchesAny(key, ['Energia'])) candidate = 'Conta de energia';
      else if (matchesAny(key, ['Transporte'])) candidate = 'Despesa com transporte';
      else candidate = `Despesa em ${categoryLabel}`;
    } else {
      if (matchesAny(key, ['Pix'])) candidate = 'Recebimento no Pix';
      else if (matchesAny(key, ['Comissao'])) candidate = 'Recebimento de comissao';
      else if (matchesAny(key, ['Salario'])) candidate = 'Recebimento de salario';
      else if (matchesAny(key, ['Cliente'])) {
        const clientName = extractClientName(params.rawUtterance || params.categoryHint || '');
        candidate = clientName ? `Recebimento do cliente ${clientName}` : 'Recebimento de cliente';
      } else candidate = `Recebimento em ${categoryLabel}`;
    }
  }

  const sanitized = sanitizeDescription(candidate);
  const absolute = clampByWordBoundary(sanitized, ABSOLUTE_DESCRIPTION_MAX_LENGTH);

  if (absolute.length <= PREFERRED_DESCRIPTION_MAX_LENGTH) {
    return absolute;
  }

  return clampByWordBoundary(absolute, ABSOLUTE_DESCRIPTION_MAX_LENGTH);
}

