export type BlogAccent = 'emerald' | 'cyan' | 'amber' | 'blue';
export type BlogCategory = 'Ferramenta' | 'Educacao Financeira';

export type BlogSection = {
  title: string;
  paragraphs: string[];
  bullets?: string[];
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

const formatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
});

export const createSections = (seed: ArticleSeed): BlogSection[] => [
  {
    title: 'Introducao',
    paragraphs: seed.intro,
  },
  {
    title: 'Explicacao',
    paragraphs: seed.explanation,
    bullets: seed.focusBullets,
  },
  {
    title: 'Exemplos',
    paragraphs: seed.example,
  },
  {
    title: 'Dicas praticas',
    paragraphs: ['Algumas acoes simples ajudam a transformar esse tema em rotina real.'],
    bullets: seed.tips,
  },
  {
    title: 'Conclusao',
    paragraphs: seed.conclusion,
  },
];

export const estimateReadingTime = (article: BlogArticle) => {
  const text = [
    article.title,
    article.description,
    ...article.sections.flatMap((section) => [section.title, ...section.paragraphs, ...(section.bullets || [])]),
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
