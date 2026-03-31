export function normalizeCategoryToken(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeCategoryKey(value: string) {
  const normalized = normalizeCategoryToken(value);
  if (!normalized) return '';

  if (normalized.endsWith('s') && normalized.length > 4) {
    return normalized.slice(0, -1);
  }

  return normalized;
}

export function toCategoryDisplayName(value: string) {
  const normalized = normalizeCategoryToken(value);
  if (!normalized) return 'Outros';

  return normalized
    .split(' ')
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ');
}

export const CATEGORY_ALIAS_TABLE: ReadonlyArray<{
  canonical: string;
  type: 'expense' | 'income' | 'both';
  aliases: string[];
}> = [
  {
    canonical: 'Alimentação',
    type: 'expense',
    aliases: ['ifood', 'delivery', 'rappi', 'uber eats', 'restaurante', 'comida', 'mercado'],
  },
  {
    canonical: 'Transporte',
    type: 'expense',
    aliases: ['uber', '99', 'taxi', 'gasolina', 'combustivel', 'shell', 'ipiranga'],
  },
  {
    canonical: 'Saúde',
    type: 'expense',
    aliases: ['farmacia', 'drogaria', 'medico', 'consulta', 'remedio'],
  },
  {
    canonical: 'Moradia',
    type: 'expense',
    aliases: ['aluguel', 'condominio', 'energia', 'luz', 'agua', 'internet'],
  },
  {
    canonical: 'Assinaturas',
    type: 'expense',
    aliases: ['netflix', 'spotify', 'assinatura', 'streaming'],
  },
  {
    canonical: 'Salário',
    type: 'income',
    aliases: ['salario', 'pagamento', 'folha'],
  },
  {
    canonical: 'Comissão',
    type: 'income',
    aliases: ['comissao', 'bônus', 'bonus'],
  },
  {
    canonical: 'Freelance',
    type: 'income',
    aliases: ['freela', 'freelance', 'cliente'],
  },
];

