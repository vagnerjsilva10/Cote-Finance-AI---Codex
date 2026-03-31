function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function pickPrefix(seed: string) {
  const options = ['Pronto.', 'Feito.', 'Tudo certo.', 'Perfeito.'];
  const code = [...seed].reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return options[code % options.length] || options[0];
}

export function generateWhatsAppConfirmationMessage(params: {
  intent: 'create_expense' | 'create_income';
  amount: number;
  categoryName: string;
  wasCategoryAutoCreated?: boolean;
  seed?: string;
}) {
  const prefix = pickPrefix(params.seed || `${params.intent}:${params.categoryName}:${params.amount}`);
  const amountLabel = formatCurrency(params.amount);
  const categoryLabel = params.categoryName.trim();

  if (params.wasCategoryAutoCreated) {
    return `${prefix} Criei a categoria "${categoryLabel}" e registrei ${amountLabel}.`;
  }

  if (params.intent === 'create_income') {
    if (/^pix$/i.test(categoryLabel)) {
      return `${prefix} Lancei ${amountLabel} como recebimento no Pix.`;
    }
    return `${prefix} Lancei ${amountLabel} como recebimento em ${categoryLabel}.`;
  }

  return `${prefix} Registrei ${amountLabel} em ${categoryLabel}.`;
}

