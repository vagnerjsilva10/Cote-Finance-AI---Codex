export type BlogAccent = 'emerald' | 'cyan' | 'amber' | 'blue';
export type BlogCategory = 'Ferramenta' | 'Educação Financeira';

export type BlogSection = {
  title: string;
  paragraphs: string[];
  bullets?: string[];
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
  sections: BlogSection[];
  visual?: BlogArticleVisual;
};

export type BlogArticleSummary = BlogArticle & {
  readingTimeMinutes: number;
  readingTimeLabel: string;
  publishedLabel: string;
};

export type ArticleSeed = Omit<BlogArticle, 'sections'> & {
  intro: string[];
  explanation: string[];
  example: string[];
  focusBullets: string[];
  tips: string[];
  conclusion: string[];
};

const BLOG_TEXT_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bEducacao Financeira\b/g, 'Educação Financeira'],
  [/\beducacao financeira\b/g, 'educação financeira'],
  [/\binteligencia artificial\b/g, 'inteligência artificial'],
  [/\bInteligencia artificial\b/g, 'Inteligência artificial'],
  [/\bfinancas\b/g, 'finanças'],
  [/\bFinancas\b/g, 'Finanças'],
  [/\beducacao\b/g, 'educação'],
  [/\bEducacao\b/g, 'Educação'],
  [/\bintroducao\b/g, 'introdução'],
  [/\bIntroducao\b/g, 'Introdução'],
  [/\bexplicacao\b/g, 'explicação'],
  [/\bExplicacao\b/g, 'Explicação'],
  [/\bconclusao\b/g, 'conclusão'],
  [/\bConclusao\b/g, 'Conclusão'],
  [/\bpraticas\b/g, 'práticas'],
  [/\bPraticas\b/g, 'Práticas'],
  [/\bconteudo\b/g, 'conteúdo'],
  [/\bConteudo\b/g, 'Conteúdo'],
  [/\bconversao\b/g, 'conversão'],
  [/\bConversao\b/g, 'Conversão'],
  [/\baplicacao\b/g, 'aplicação'],
  [/\bAplicacao\b/g, 'Aplicação'],
  [/\bacoes\b/g, 'ações'],
  [/\bAcoes\b/g, 'Ações'],
  [/\bacao\b/g, 'ação'],
  [/\bAcao\b/g, 'Ação'],
  [/\bdecisoes\b/g, 'decisões'],
  [/\bDecisoes\b/g, 'Decisões'],
  [/\banalises\b/g, 'análises'],
  [/\bAnalises\b/g, 'Análises'],
  [/\banalise\b/g, 'análise'],
  [/\bAnalise\b/g, 'Análise'],
  [/\bgestao\b/g, 'gestão'],
  [/\bGestao\b/g, 'Gestão'],
  [/\bdividas\b/g, 'dívidas'],
  [/\bDividas\b/g, 'Dívidas'],
  [/\blancamentos\b/g, 'lançamentos'],
  [/\bLancamentos\b/g, 'Lançamentos'],
  [/\brelatorios\b/g, 'relatórios'],
  [/\bRelatorios\b/g, 'Relatórios'],
  [/\bgraficos\b/g, 'gráficos'],
  [/\bGraficos\b/g, 'Gráficos'],
  [/\bprevisoes\b/g, 'previsões'],
  [/\bPrevisoes\b/g, 'Previsões'],
  [/\bprevisao\b/g, 'previsão'],
  [/\bPrevisao\b/g, 'Previsão'],
  [/\bpadroes\b/g, 'padrões'],
  [/\bPadroes\b/g, 'Padrões'],
  [/\bautomaticos\b/g, 'automáticos'],
  [/\bAutomaticos\b/g, 'Automáticos'],
  [/\bautomatica\b/g, 'automática'],
  [/\bAutomatica\b/g, 'Automática'],
  [/\bautomatico\b/g, 'automático'],
  [/\bAutomatico\b/g, 'Automático'],
  [/\bhistorico\b/g, 'histórico'],
  [/\bHistorico\b/g, 'Histórico'],
  [/\bmetodo\b/g, 'método'],
  [/\bMetodo\b/g, 'Método'],
  [/\bconfiguracao\b/g, 'configuração'],
  [/\bConfiguracao\b/g, 'Configuração'],
  [/\bcobranca\b/g, 'cobrança'],
  [/\bCobranca\b/g, 'Cobrança'],
  [/\bcobrancas\b/g, 'cobranças'],
  [/\bCobrancas\b/g, 'Cobranças'],
  [/\bperiodo\b/g, 'período'],
  [/\bPeriodo\b/g, 'Período'],
  [/\bproximo\b/g, 'próximo'],
  [/\bProximo\b/g, 'Próximo'],
  [/\brapido\b/g, 'rápido'],
  [/\bRapido\b/g, 'Rápido'],
  [/\bpossivel\b/g, 'possível'],
  [/\bPossivel\b/g, 'Possível'],
  [/\bmes\b/g, 'mês'],
  [/\bMes\b/g, 'Mês'],
  [/\bevolucao\b/g, 'evolução'],
  [/\bEvolucao\b/g, 'Evolução'],
  [/\bunico\b/g, 'único'],
  [/\bUnico\b/g, 'Único'],
  [/\bpratico\b/g, 'prático'],
  [/\bPratico\b/g, 'Prático'],
  [/\bcontinua\b/g, 'contínua'],
  [/\bContinua\b/g, 'Contínua'],
  [/\butil\b/g, 'útil'],
  [/\bUtil\b/g, 'Útil'],
  [/\bvoce\b/g, 'você'],
  [/\bVoce\b/g, 'Você'],
  [/\bnao\b/g, 'não'],
  [/\bNao\b/g, 'Não'],
  [/\bgratis\b/g, 'grátis'],
  [/\bGratis\b/g, 'Grátis'],
  [/\bComecar\b/g, 'Começar'],
  [/\bcartao\b/g, 'cartão'],
  [/\bCartao\b/g, 'Cartão'],
  [/\btransacoes\b/g, 'transações'],
  [/\bTransacoes\b/g, 'Transações'],
  [/\brelacao\b/g, 'relação'],
  [/\bRelacao\b/g, 'Relação'],
  [/\borcamento\b/g, 'orçamento'],
  [/\bOrcamento\b/g, 'Orçamento'],
  [/\bvariacao\b/g, 'variação'],
  [/\bVariacao\b/g, 'Variação'],
  [/\bcomparacao\b/g, 'comparação'],
  [/\bComparacao\b/g, 'Comparação'],
  [/\boperacao\b/g, 'operação'],
  [/\bOperacao\b/g, 'Operação'],
  [/\binformacao\b/g, 'informação'],
  [/\bInformacao\b/g, 'Informação'],
  [/\binformacoes\b/g, 'informações'],
  [/\bInformacoes\b/g, 'Informações'],
  [/\bmemoria\b/g, 'memória'],
  [/\bMemoria\b/g, 'Memória'],
  [/\bdiaria\b/g, 'diária'],
  [/\bDiaria\b/g, 'Diária'],
  [/\bnecessario\b/g, 'necessário'],
  [/\bNecessario\b/g, 'Necessário'],
  [/\bja\b/g, 'já'],
  [/\bJa\b/g, 'Já'],
  [/\bsera\b/g, 'será'],
  [/\bSera\b/g, 'Será'],
  [/\bporcao\b/g, 'porção'],
  [/\bPorcao\b/g, 'Porção'],
  [/\bvisao\b/g, 'visão'],
  [/\bVisao\b/g, 'Visão'],
  [/\bgestao financeira pessoal\b/g, 'gestão financeira pessoal'],
  [/\bsaude financeira\b/g, 'saúde financeira'],
  [/\bSaude financeira\b/g, 'Saúde financeira'],
  [/\bjuros\b/g, 'juros'],
];

const formatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
});

export const createSections = (seed: ArticleSeed): BlogSection[] => [
  {
    title: 'Introdução',
    paragraphs: seed.intro,
  },
  {
    title: 'Explicação',
    paragraphs: seed.explanation,
    bullets: seed.focusBullets,
  },
  {
    title: 'Exemplos',
    paragraphs: seed.example,
  },
  {
    title: 'Dicas práticas',
    paragraphs: ['Algumas ações simples ajudam a transformar esse tema em rotina real.'],
    bullets: seed.tips,
  },
  {
    title: 'Conclusão',
    paragraphs: seed.conclusion,
  },
];

export const localizeBlogText = (value: string) =>
  BLOG_TEXT_REPLACEMENTS.reduce((accumulator, [pattern, replacement]) => accumulator.replace(pattern, replacement), value);

export const estimateReadingTime = (article: BlogArticle) => {
  const text = [
    article.title,
    article.description,
    ...article.sections.flatMap((section) => [section.title, ...section.paragraphs, ...(section.bullets || [])]),
    article.visual?.title || '',
    article.visual?.description || '',
    ...(article.visual?.items.flatMap((item) => [item.label, item.value, item.caption]) || []),
  ].join(' ');

  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(3, Math.ceil(words / 190));
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
