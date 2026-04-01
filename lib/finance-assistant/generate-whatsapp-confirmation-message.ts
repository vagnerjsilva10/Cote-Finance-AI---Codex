function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function pickVariant(seed: string, options: string[]) {
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
  const seed = params.seed || `${params.intent}:${params.categoryName}:${params.amount}`;
  const amountLabel = formatCurrency(params.amount);
  const categoryLabel = params.categoryName.trim();

  if (params.wasCategoryAutoCreated) {
    const createdOptions = [
      `✅ Pronto! Criei a categoria "${categoryLabel}" e registrei ${amountLabel}.`,
      `✅ Perfeito! Criei "${categoryLabel}" e registrei ${amountLabel}.`,
    ];
    return pickVariant(seed, createdOptions);
  }

  if (params.intent === 'create_income') {
    if (/^pix$/i.test(categoryLabel)) {
      return pickVariant(seed, [
        `💰 Tudo certo! Registrei ${amountLabel} como recebimento no Pix.`,
        `💰 Feito! Lancei ${amountLabel} como recebimento no Pix.`,
      ]);
    }
    return pickVariant(seed, [
      `💰 Tudo certo! Registrei ${amountLabel} como recebimento em ${categoryLabel}.`,
      `💰 Feito! Lancei ${amountLabel} como recebimento em ${categoryLabel}.`,
    ]);
  }

  return pickVariant(seed, [
    `✅ Pronto! Registrei ${amountLabel} em ${categoryLabel}.`,
    `💸 Feito! Lancei ${amountLabel} como saída em ${categoryLabel}.`,
  ]);
}
