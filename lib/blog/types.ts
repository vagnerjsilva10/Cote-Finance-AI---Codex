export type BlogAccent = 'emerald' | 'cyan' | 'amber' | 'blue';
export type BlogCategory = 'Ferramenta' | 'Educação Financeira';

export type BlogSection = {
  title: string;
  paragraphs: string[];
  bullets?: string[];
};

export type BlogFaq = {
  question: string;
  answer: string;
};

export type BlogArticleVisualItem = {
  label: string;
  value: string;
  caption: string;
};

export type BlogArticleVisual = {
  eyebrow: string;
  title: string;
  description: string;
  items: BlogArticleVisualItem[];
};

export type BlogArticle = {
  slug: string;
  title: string;
  description: string;
  seoTitle: string;
  seoDescription: string;
  category: BlogCategory;
  publishedAt: string;
  author: string;
  accent: BlogAccent;
  keywords: string[];
  featured?: boolean;
  relatedSlugs?: string[];
  sections: BlogSection[];
  faqs: BlogFaq[];
  visual?: BlogArticleVisual;
};

export type BlogArticleSummary = BlogArticle & {
  readingTimeMinutes: number;
  readingTimeLabel: string;
  publishedLabel: string;
};

export type ArticleSeed = Omit<BlogArticle, 'sections' | 'faqs'> & {
  intro: string[];
  explanation: string[];
  example: string[];
  focusBullets: string[];
  tips: string[];
  conclusion: string[];
  checklist?: string[];
  faqs?: BlogFaq[];
};

const formatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
});

export const localizeBlogText = (value: string) => value;

function getPrimaryKeyword(seed: ArticleSeed) {
  return seed.keywords[0] || seed.title.toLowerCase();
}

function getSecondaryKeyword(seed: ArticleSeed) {
  return seed.keywords[1] || seed.keywords[0] || 'controle financeiro';
}

function createProblemSection(seed: ArticleSeed): BlogSection {
  const primaryKeyword = getPrimaryKeyword(seed);
  const secondaryKeyword = getSecondaryKeyword(seed);

  const paragraphs =
    seed.category === 'Ferramenta'
      ? [
          `Se você procura ${primaryKeyword}, provavelmente já tentou resolver o tema na força de vontade. O problema é que, no dia a dia, o dinheiro se espalha em muitos lugares ao mesmo tempo: conta corrente, cartão, Pix, débito, compras pequenas e cobranças recorrentes. Sem uma visão consolidada, qualquer tentativa de organização vira uma mistura de memória, sensação e improviso.`,
          `É aqui que o leitor costuma travar. Ele até sabe que precisa olhar os números, mas não encontra um processo leve o bastante para manter. Quando controlar a rotina financeira depende de esforço excessivo, o resultado quase sempre é o mesmo: o acompanhamento começa bem e morre na segunda ou terceira semana.`,
          `Além disso, existe um problema silencioso: a falta de contexto. Você pode até saber quanto gastou no mês, mas ainda assim não entender o que realmente puxou o orçamento para baixo, quais categorias cresceram e onde está a oportunidade mais rápida de ajuste.`,
          `Por isso ${secondaryKeyword} não melhora só com registro. Melhora com leitura inteligente. O leitor precisa enxergar causas, padrões e prioridades com clareza suficiente para agir antes que o mês fuja do controle.`,
        ]
      : [
          `Quem busca ${primaryKeyword} normalmente não está procurando teoria bonita. Está tentando sair de uma dor concreta: falta de folga no fim do mês, ansiedade ao olhar a fatura, medo de não conseguir guardar dinheiro e sensação de estar sempre reagindo ao que aparece.`,
          `Esse cenário pesa porque o dinheiro deixa de ser ferramenta e vira fonte de tensão. A pessoa trabalha, paga contas, resolve urgências e ainda assim sente que não avança. O desgaste não acontece por falta de esforço. Acontece porque falta um método simples para transformar intenção em prática diária.`,
          `Muita gente tenta compensar isso com regras genéricas, cortes radicais ou promessas de mudança total. O problema é que mudanças pouco realistas quebram rápido. Sem clareza sobre a própria rotina, até boas decisões perdem força com o tempo.`,
          `É por isso que ${secondaryKeyword} precisa ser tratada como construção de base. Antes de pensar em resultado extraordinário, o leitor precisa enxergar o que está acontecendo hoje e criar um sistema que sustente decisões melhores amanhã.`,
        ];

  return {
    title: 'O problema real do leitor',
    paragraphs,
  };
}

function createExplanationSection(seed: ArticleSeed): BlogSection {
  const primaryKeyword = getPrimaryKeyword(seed);
  const secondaryKeyword = getSecondaryKeyword(seed);

  return {
    title: 'Explicação clara',
    paragraphs: [
      ...seed.explanation,
      `Na prática, ${primaryKeyword} melhora quando você para de olhar só para o resultado final e passa a observar o caminho que levou até ele. Isso inclui entender categorias, frequência de compra, recorrências, sazonalidade e o efeito acumulado das pequenas decisões.`,
      `Esse tipo de leitura cria profundidade. Em vez de perguntar apenas “quanto eu gastei?”, você começa a responder perguntas mais úteis: “o que cresceu?”, “o que está se repetindo?”, “o que pesa mais do que parece?” e “o que posso ajustar primeiro para ganhar fôlego mais rápido?”.`,
      `É essa transição que transforma ${secondaryKeyword} em algo realmente acionável. Quando o dado ganha contexto, a decisão deixa de ser emocional e fica muito mais coerente com a realidade do seu mês.`,
      `O objetivo aqui não é complicar sua vida com análise excessiva. É tornar visível aquilo que hoje passa despercebido. Quanto mais clara essa leitura, mais simples fica priorizar, economizar, negociar e planejar o próximo passo.`,
    ],
    bullets: seed.focusBullets,
  };
}

function createExamplesSection(seed: ArticleSeed): BlogSection {
  const primaryKeyword = getPrimaryKeyword(seed);

  return {
    title: 'Exemplos do dia a dia',
    paragraphs: [
      ...seed.example,
      `Também vale pensar nos gastos que parecem inofensivos quando vistos sozinhos. Um café, um app, uma corrida por aplicativo, um pedido de delivery ou uma compra de conveniência dificilmente assustam no instante da decisão. Mas, quando entram em sequência, acabam roubando espaço de metas que seriam muito mais valiosas no médio prazo.`,
      `Outro cenário comum aparece quando a pessoa acredita que o problema é renda, mas descobre que a principal dificuldade está em falta de visibilidade. Em muitos casos, ${primaryKeyword} não exige uma revolução imediata. Exige, antes, uma leitura honesta sobre comportamento, prioridades e vazamentos silenciosos.`,
      `Esses exemplos mostram algo importante: a mudança financeira costuma começar com percepção, não com sacrifício extremo. Quando o leitor entende o que está acontecendo, a chance de ajustar o hábito certo aumenta muito.`,
    ],
  };
}

function createPracticalTipsSection(seed: ArticleSeed): BlogSection {
  return {
    title: 'Dicas práticas',
    paragraphs: [
      'Na vida real, o que se sustenta é o que cabe na rotina. Por isso, o melhor plano não é o mais complexo. É o que você consegue executar mesmo em semanas corridas, sem depender de motivação extraordinária para continuar.',
      'As orientações abaixo funcionam como uma forma de reduzir atrito. Em vez de tentar controlar tudo ao mesmo tempo, você foca nos pontos com maior impacto e cria repetição. Esse tipo de consistência vale muito mais do que uma mudança radical que dura pouco.',
    ],
    bullets: seed.tips,
  };
}

function createChecklistSection(seed: ArticleSeed): BlogSection {
  const checklist =
    seed.checklist?.length
      ? seed.checklist
      : Array.from(
          new Set([
            `Defina um momento fixo da semana para revisar ${seed.title.toLowerCase()}.`,
            ...seed.focusBullets.slice(0, 2).map((item) => `Observe este ponto com atenção: ${item}.`),
            ...seed.tips.slice(0, 3),
            'Anote uma decisão prática para executar ainda nesta semana.',
          ])
        );

  return {
    title: 'Checklist para aplicar hoje',
    paragraphs: [
      'Se você quer transformar leitura em resultado, precisa sair deste artigo com um próximo passo claro. O checklist abaixo existe justamente para reduzir a distância entre entender o tema e aplicá-lo na prática.',
      'Não tente fazer tudo de uma vez. Escolha o que faz mais sentido para o seu momento, execute por alguns dias e use a revisão semanal para calibrar. Resultado financeiro consistente nasce de repetição inteligente, não de intensidade aleatória.',
    ],
    bullets: checklist,
  };
}

function createCoteHelpSection(seed: ArticleSeed): BlogSection {
  return {
    title: 'Como o Cote Finance AI pode ajudar',
    paragraphs: [
      `Se a sua meta é ${seed.title.toLowerCase()}, o Cote Finance AI foi pensado para reduzir a parte pesada do processo e aumentar a parte útil: clareza, contexto e ação prática.`,
      'Em vez de depender só de memória, planilhas dispersas ou revisão tardia no fim do mês, você centraliza lançamentos, acompanha a evolução do caixa e transforma comportamento financeiro em leitura acionável.',
      'O foco do produto não é só mostrar números. É ajudar você a controlar melhor o que entra e sai, identificar padrões cedo e agir com mais segurança antes que um problema cresça.',
    ],
    bullets: [
      'Controle de gastos com visão clara das categorias que mais pesam no mês',
      'Insights com IA para identificar padrões, excessos e oportunidades de melhoria',
      'Metas financeiras com progresso visível e acompanhamento contínuo',
      'Gestão de dívidas para priorizar pagamentos e organizar próximos passos',
    ],
  };
}

function createConclusionSection(seed: ArticleSeed): BlogSection {
  return {
    title: 'Conclusão',
    paragraphs: [
      ...seed.conclusion,
      'Se existe um ponto central neste tema, ele é simples: clareza reduz desperdício, melhora decisões e devolve previsibilidade para o seu dinheiro. Quando você deixa de operar no escuro, o esforço começa a gerar resultado real.',
      'A melhor próxima ação é escolher uma mudança simples, aplicar ainda hoje e usar um sistema que mantenha essa visibilidade viva na sua rotina. É isso que transforma boa intenção em progresso consistente.',
    ],
  };
}

export const createSections = (seed: ArticleSeed): BlogSection[] => [
  {
    title: 'Introdução',
    paragraphs: [
      ...seed.intro,
      `Se você já terminou um mês pensando “preciso colocar ordem na minha vida financeira”, este artigo foi escrito para esse momento. A proposta aqui é sair do discurso genérico e mostrar caminhos práticos para aplicar ${seed.title.toLowerCase()} com mais clareza e menos fricção.`,
      'Ao longo da leitura, você vai entender o cenário, ver exemplos do dia a dia, identificar erros comuns e sair com passos objetivos para colocar o tema em prática sem complicar ainda mais a sua rotina.',
    ],
  },
  createProblemSection(seed),
  createExplanationSection(seed),
  createExamplesSection(seed),
  createPracticalTipsSection(seed),
  createChecklistSection(seed),
  createCoteHelpSection(seed),
  createConclusionSection(seed),
];

export function createFaqs(seed: ArticleSeed): BlogFaq[] {
  if (seed.faqs?.length) {
    return seed.faqs;
  }

  return [
    {
      question: `Por onde começar para ${seed.title.toLowerCase()}?`,
      answer:
        'O melhor começo é reduzir complexidade. Primeiro, organize o básico: entradas, saídas, categorias principais e compromissos recorrentes. Depois, revise o que mais pesa e tome uma decisão prática por semana.',
    },
    {
      question: 'Quanto tempo leva para perceber resultado na prática?',
      answer:
        'Em muitos casos, a sensação de clareza aparece nas primeiras semanas. O ganho maior vem quando você transforma acompanhamento em rotina e usa os dados para corrigir comportamento antes do fechamento do mês.',
    },
    {
      question: 'Como o Cote Finance AI entra nesse processo?',
      answer:
        'O Cote Finance AI ajuda a centralizar lançamentos, mostrar padrões com IA, acompanhar metas e organizar dívidas. Na prática, ele reduz atrito operacional e melhora a leitura do que realmente está acontecendo com o seu dinheiro.',
    },
    {
      question: 'Isso funciona mesmo para quem não gosta de planilhas?',
      answer:
        'Sim. A lógica é justamente substituir processos pesados por uma rotina mais visual, simples e consistente. Quando o controle financeiro cabe na vida real, a chance de continuidade aumenta muito.',
    },
  ];
}

export const estimateReadingTime = (article: BlogArticle) => {
  const text = [
    article.title,
    article.description,
    ...article.sections.flatMap((section) => [section.title, ...section.paragraphs, ...(section.bullets || [])]),
    ...article.faqs.flatMap((faq) => [faq.question, faq.answer]),
    article.visual?.title || '',
    article.visual?.description || '',
    ...(article.visual?.items.flatMap((item) => [item.label, item.value, item.caption]) || []),
  ].join(' ');

  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(7, Math.ceil(words / 190));
};

export const enrichArticle = (article: BlogArticle): BlogArticleSummary => {
  const readingTimeMinutes = estimateReadingTime(article);
  return {
    ...article,
    readingTimeMinutes,
    readingTimeLabel: `${readingTimeMinutes} min de leitura`,
    publishedLabel: formatter.format(new Date(article.publishedAt)),
  };
};
