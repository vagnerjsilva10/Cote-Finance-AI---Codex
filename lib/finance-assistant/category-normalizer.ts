export type CategoryFlowType = 'expense' | 'income';

export type CategoryAliasItem = {
  aliases: string[];
  canonical: string;
  type: CategoryFlowType | 'both';
};

export const MAX_CATEGORY_NAME_LENGTH = 20;

export const CATEGORY_ALIAS_TABLE: CategoryAliasItem[] = [
  { type: 'expense', canonical: 'Delivery', aliases: ['ifood', 'i food', 'delivery', 'restaurante', 'lanche'] },
  { type: 'expense', canonical: 'Transporte', aliases: ['uber', '99', 'taxi', 'corrida'] },
  { type: 'expense', canonical: 'Combustivel', aliases: ['gasolina', 'etanol', 'posto', 'abastecimento', 'shell', 'ipiranga'] },
  { type: 'expense', canonical: 'Mercado', aliases: ['mercado', 'supermercado', 'atacadao', 'feira'] },
  { type: 'expense', canonical: 'Farmacia', aliases: ['farmacia', 'remedio', 'drogaria', 'medicamento'] },
  { type: 'expense', canonical: 'Moradia', aliases: ['aluguel', 'condominio', 'moradia'] },
  { type: 'expense', canonical: 'Energia', aliases: ['energia', 'luz', 'eletrica'] },
  { type: 'expense', canonical: 'Internet', aliases: ['internet', 'banda larga', 'wi fi', 'wifi'] },
  { type: 'expense', canonical: 'Assinaturas', aliases: ['netflix', 'spotify', 'assinatura', 'streaming'] },
  { type: 'income', canonical: 'Pix', aliases: ['pix', 'transferencia pix'] },
  { type: 'income', canonical: 'Salario', aliases: ['salario', 'holerite', 'pagamento mensal'] },
  { type: 'income', canonical: 'Comissao', aliases: ['comissao', 'bonus', 'bonificacao'] },
  { type: 'income', canonical: 'Cliente', aliases: ['cliente', 'freela', 'freelance', 'projeto'] },
  { type: 'both', canonical: 'Investimento', aliases: ['investimento', 'cdb', 'tesouro', 'fii', 'acoes', 'acao'] },
];

const EQUIVALENT_KEYS: Record<string, string[]> = {
  delivery: ['delivery', 'alimentacao', 'restaurante'],
  combustivel: ['combustivel', 'transporte'],
  mercado: ['mercado', 'supermercado'],
  pix: ['pix', 'recebimento'],
  cliente: ['cliente', 'recebimento'],
  assinaturas: ['assinatura', 'assinaturas'],
};

const STOPWORDS = new Set([
  'a',
  'as',
  'ao',
  'aos',
  'com',
  'da',
  'das',
  'de',
  'do',
  'dos',
  'e',
  'em',
  'na',
  'nas',
  'no',
  'nos',
  'o',
  'os',
  'para',
  'por',
  'pra',
  'pro',
  'um',
  'uma',
  'uns',
  'umas',
  'reais',
  'real',
  'rs',
  'r',
  'coach',
  'finance',
  'cote',
  'registrar',
  'registra',
  'registre',
  'lancar',
  'lance',
  'isso',
  'mim',
  'favor',
  'agora',
  'hoje',
]);

const VERB_TOKENS = new Set([
  'ganhei',
  'gastei',
  'paguei',
  'comprei',
  'recebi',
  'entrou',
  'adicionei',
  'adiciona',
  'lancei',
  'registrar',
  'registrado',
  'registra',
  'registrei',
]);

function stripAccents(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function singularizeToken(token: string) {
  if (token.endsWith('oes') && token.length > 4) return `${token.slice(0, -3)}ao`;
  if (token.endsWith('aes') && token.length > 4) return `${token.slice(0, -3)}ao`;
  if (token.endsWith('is') && token.length > 4) return `${token.slice(0, -2)}l`;
  if (token.endsWith('s') && token.length > 4 && !token.endsWith('ss')) return token.slice(0, -1);
  return token;
}

function toTitleCase(value: string) {
  return value
    .split(' ')
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ');
}

function clampByWordBoundary(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;
  const trimmed = value.slice(0, maxLength).trim();
  const lastSpace = trimmed.lastIndexOf(' ');
  if (lastSpace >= 5) return trimmed.slice(0, lastSpace).trim();
  return trimmed;
}

export function normalizeCategoryToken(value: string) {
  return stripAccents(String(value || ''))
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeCategoryKey(value: string) {
  return normalizeCategoryToken(value)
    .split(' ')
    .filter(Boolean)
    .map((token) => singularizeToken(token))
    .join(' ');
}

export function areEquivalentCategoryKeys(a: string, b: string) {
  const left = normalizeCategoryKey(a);
  const right = normalizeCategoryKey(b);
  if (!left || !right) return false;
  if (left === right) return true;

  for (const values of Object.values(EQUIVALENT_KEYS)) {
    const normalizedSet = new Set(values.map((item) => normalizeCategoryKey(item)));
    if (normalizedSet.has(left) && normalizedSet.has(right)) return true;
  }

  return false;
}

export function toCategoryDisplayName(value: string) {
  const normalized = normalizeCategoryToken(value);
  if (!normalized) return '';
  return toTitleCase(normalized);
}

function extractRelevantTokens(hint: string) {
  return normalizeCategoryToken(hint)
    .split(' ')
    .filter(Boolean)
    .filter((token) => !STOPWORDS.has(token))
    .filter((token) => !VERB_TOKENS.has(token))
    .filter((token) => !/^\d+$/.test(token));
}

export function resolveCanonicalCategoryHint(params: {
  hint: string;
  flowType: CategoryFlowType;
}) {
  const normalizedHint = normalizeCategoryToken(params.hint);
  if (!normalizedHint) return null;

  for (const item of CATEGORY_ALIAS_TABLE) {
    if (item.type !== 'both' && item.type !== params.flowType) continue;
    for (const alias of item.aliases) {
      const normalizedAlias = normalizeCategoryToken(alias);
      if (!normalizedAlias) continue;
      if (normalizedHint === normalizedAlias || normalizedHint.includes(normalizedAlias)) {
        return item.canonical;
      }
    }
  }

  return null;
}

export function buildShortCategoryName(params: {
  hint: string;
  flowType: CategoryFlowType;
}) {
  const aliasCanonical = resolveCanonicalCategoryHint({
    hint: params.hint,
    flowType: params.flowType,
  });

  const fallback = params.flowType === 'income' ? 'Recebimento' : 'Outros';
  const candidateBase = aliasCanonical || extractRelevantTokens(params.hint).slice(0, 2).join(' ') || fallback;
  const displayName = toCategoryDisplayName(candidateBase) || fallback;
  return clampByWordBoundary(displayName, MAX_CATEGORY_NAME_LENGTH);
}

