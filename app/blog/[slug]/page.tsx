import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Clock3, Sparkles } from 'lucide-react';
import { BlogArticleCta } from '@/components/blog/blog-article-cta';
import { BlogCard } from '@/components/blog/blog-card';
import { BlogCover } from '@/components/blog/blog-cover';
import { BlogInlineVisual } from '@/components/blog/blog-inline-visual';
import { BlogShell } from '@/components/blog/blog-shell';
import { getAllBlogArticles, getBlogArticleBySlug, getRelatedBlogArticles } from '@/lib/blog/articles';
import { absoluteUrl } from '@/lib/blog/seo';
import { localizeBlogText } from '@/lib/blog/types';

type BlogArticlePageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateStaticParams() {
  return getAllBlogArticles().map((article) => ({
    slug: article.slug,
  }));
}

export async function generateMetadata({ params }: BlogArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = getBlogArticleBySlug(slug);

  if (!article) {
    return {
      title: 'Artigo não encontrado | Cote Finance AI',
      description: 'O artigo solicitado não foi encontrado.',
    };
  }

  const canonical = absoluteUrl(`/blog/${article.slug}`);
  const localizedSeoTitle = localizeBlogText(article.seoTitle);
  const localizedSeoDescription = localizeBlogText(article.seoDescription);
  const localizedKeywords = article.keywords.map((keyword) => localizeBlogText(keyword));

  return {
    title: localizedSeoTitle,
    description: localizedSeoDescription,
    alternates: {
      canonical,
    },
    openGraph: {
      title: localizedSeoTitle,
      description: localizedSeoDescription,
      url: canonical,
      type: 'article',
      publishedTime: article.publishedAt,
      authors: [article.author],
      section: localizeBlogText(article.category),
      tags: localizedKeywords,
      images: [
        {
          url: absoluteUrl('/brand/cote-finance-ai-logo.png'),
          width: 2400,
          height: 640,
          alt: localizeBlogText(article.title),
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: localizedSeoTitle,
      description: localizedSeoDescription,
      images: [absoluteUrl('/brand/cote-finance-ai-logo.png')],
    },
  };
}

export default async function BlogArticlePage({ params }: BlogArticlePageProps) {
  const { slug } = await params;
  const article = getBlogArticleBySlug(slug);

  if (!article) {
    notFound();
  }

  const relatedArticles = getRelatedBlogArticles(article.slug, article.category, 3);
  const localizedTitle = localizeBlogText(article.title);
  const localizedDescription = localizeBlogText(article.description);
  const localizedCategory = localizeBlogText(article.category);
  const localizedSections = article.sections.map((section) => ({
    ...section,
    title: localizeBlogText(section.title),
    paragraphs: section.paragraphs.map((paragraph) => localizeBlogText(paragraph)),
    bullets: section.bullets?.map((bullet) => localizeBlogText(bullet)),
    subSections: section.subSections?.map((subSection) => ({
      ...subSection,
      title: localizeBlogText(subSection.title),
      paragraphs: subSection.paragraphs.map((paragraph) => localizeBlogText(paragraph)),
      bullets: subSection.bullets?.map((bullet) => localizeBlogText(bullet)),
    })),
  }));
  const localizedKeywords = article.keywords.map((keyword) => localizeBlogText(keyword));
  const localizedFaqs = article.faqs.map((faq) => ({
    question: localizeBlogText(faq.question),
    answer: localizeBlogText(faq.answer),
  }));
  const localizedVisual = article.visual
    ? {
        ...article.visual,
        eyebrow: localizeBlogText(article.visual.eyebrow),
        title: localizeBlogText(article.visual.title),
        description: localizeBlogText(article.visual.description),
        items: article.visual.items.map((item) => ({
          label: localizeBlogText(item.label),
          value: localizeBlogText(item.value),
          caption: localizeBlogText(item.caption),
        })),
      }
    : null;

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: localizedTitle,
    description: localizeBlogText(article.seoDescription),
    datePublished: article.publishedAt,
    dateModified: article.publishedAt,
    mainEntityOfPage: absoluteUrl(`/blog/${article.slug}`),
    author: {
      '@type': 'Organization',
      name: article.author,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Cote Finance AI',
      logo: {
        '@type': 'ImageObject',
        url: absoluteUrl('/brand/cote-favicon.png'),
      },
    },
    image: [absoluteUrl('/brand/cote-finance-ai-logo.png')],
    keywords: localizedKeywords.join(', '),
    articleSection: localizedCategory,
  };
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: localizedFaqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };

  return (
    <BlogShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <div className="mb-8">
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
        >
          <ArrowLeft size={16} />
          Voltar para o blog
        </Link>
      </div>

      <article className="space-y-10">
        <header className="grid gap-8 lg:grid-cols-[1.1fr_.9fr] lg:items-center">
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.16em] public-light-subtle">
              <span className="rounded-full border border-[rgba(76,141,255,0.16)] bg-[rgba(76,141,255,0.08)] px-3 py-1 text-[var(--primary-active)]">
                {localizedCategory}
              </span>
              <span>{article.publishedLabel}</span>
              <span className="h-1 w-1 rounded-full bg-[rgba(15,23,42,0.14)]" />
              <span className="inline-flex items-center gap-1">
                <Clock3 size={12} />
                {article.readingTimeLabel}
              </span>
            </div>
            <div className="space-y-4">
              <h1 className="max-w-4xl text-4xl font-black leading-tight tracking-tight text-[var(--text-primary)] sm:text-5xl">
                {localizedTitle}
              </h1>
              <p className="max-w-3xl text-lg leading-8 text-[var(--text-secondary)]">{localizedDescription}</p>
            </div>
            <div className="public-light-badge px-4 py-2 text-sm">
              <Sparkles size={15} className="text-[var(--primary-active)]" />
              Publicado por {article.author}
            </div>
          </div>

          <BlogCover title={localizedTitle} category={localizedCategory} accent={article.accent} className="min-h-[320px] p-8" />
        </header>

        {localizedVisual ? <BlogInlineVisual visual={localizedVisual} /> : null}

        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="space-y-8">
            {localizedSections.map((section) => (
              <section key={section.title} className="public-light-card p-6 sm:p-8">
                <h2 className="text-2xl font-black tracking-tight text-[var(--text-primary)]">{section.title}</h2>
                <div className="mt-5 space-y-4 text-base leading-8 text-[var(--text-secondary)]">
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
                {section.subSections?.length ? (
                  <div className="mt-8 space-y-6">
                    {section.subSections.map((subSection) => (
                      <div key={subSection.title} className="space-y-4">
                        <h3 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">{subSection.title}</h3>
                        <div className="space-y-4 text-base leading-8 text-[var(--text-secondary)]">
                          {subSection.paragraphs.map((paragraph) => (
                            <p key={paragraph}>{paragraph}</p>
                          ))}
                        </div>
                        {subSection.bullets?.length ? (
                          <ul className="space-y-3">
                            {subSection.bullets.map((bullet) => (
                              <li
                                key={bullet}
                                className="rounded-2xl border border-[rgba(15,23,42,0.06)] bg-[rgba(76,141,255,0.05)] px-4 py-3 text-sm leading-7 text-[var(--text-secondary)]"
                              >
                                {bullet}
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : null}
                {section.bullets?.length ? (
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold text-[var(--text-primary)]">Pontos principais</h3>
                    <ul className="mt-4 space-y-3">
                      {section.bullets.map((bullet) => (
                        <li
                          key={bullet}
                          className="rounded-2xl border border-[rgba(15,23,42,0.06)] bg-[rgba(76,141,255,0.05)] px-4 py-3 text-sm leading-7 text-[var(--text-secondary)]"
                        >
                          {bullet}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </section>
            ))}

            <section className="public-light-card p-6 sm:p-8">
              <h2 className="text-2xl font-black tracking-tight text-[var(--text-primary)]">Posts relacionados</h2>
              <p className="mt-4 text-base leading-8 text-[var(--text-secondary)]">
                Continue a leitura com artigos do mesmo cluster de conteúdo. Essa sequência ajuda a aprofundar o tema,
                melhorar a compreensão do assunto e conectar a prática do dia a dia com outras áreas da sua vida financeira.
              </p>
              <div className="mt-6 grid gap-5 lg:grid-cols-3">
                {relatedArticles.slice(0, 3).map((relatedArticle) => (
                  <BlogCard key={relatedArticle.slug} article={relatedArticle} />
                ))}
              </div>
            </section>

            <section className="public-light-card p-6 sm:p-8">
              <h2 className="text-2xl font-black tracking-tight text-[var(--text-primary)]">Perguntas frequentes</h2>
              <p className="mt-4 text-base leading-8 text-[var(--text-secondary)]">
                Estas respostas resumem as dúvidas mais comuns de quem quer organizar melhor a vida financeira e aplicar o conteúdo do artigo com mais segurança.
              </p>
              <div className="mt-6 space-y-4">
                {localizedFaqs.map((faq) => (
                  <details key={faq.question} className="group public-light-card px-5 py-4">
                    <summary className="cursor-pointer list-none text-base font-semibold text-[var(--text-primary)] marker:hidden">
                      {faq.question}
                    </summary>
                    <div className="mt-3 space-y-3 text-sm leading-7 text-[var(--text-secondary)]">
                      {faq.answer
                        .split(/\n\n+/)
                        .filter(Boolean)
                        .map((paragraph) => (
                          <p key={paragraph}>{paragraph}</p>
                        ))}
                    </div>
                  </details>
                ))}
              </div>
            </section>

            <BlogArticleCta />
          </div>

          <aside className="space-y-6">
            <div className="public-light-card p-6">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Como o Cote Finance AI pode ajudar</h2>
              <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">
                O produto conecta controle de gastos, insights com IA, metas financeiras e gestão de dívidas em um fluxo
                único e prático.
              </p>
              <div className="mt-5 flex flex-col gap-3">
                <Link
                  href="/signup"
                  className="button-light-primary px-4 py-3 text-center text-sm font-bold"
                >
                  Começar grátis
                </Link>
                <Link
                  href="/app"
                  className="rounded-xl border border-slate-300 px-4 py-3 text-center text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:border-slate-400 hover:text-[var(--text-primary)]"
                >
                  Ver o produto
                </Link>
              </div>
            </div>

            <div className="public-light-card p-6">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Palavras-chave deste artigo</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {localizedKeywords.map((keyword) => (
                  <span
                    key={keyword}
                    className="rounded-full border border-[rgba(76,141,255,0.16)] bg-[rgba(76,141,255,0.08)] px-3 py-1 text-xs font-semibold text-[var(--primary-active)]"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </article>

      <section className="mt-16">
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] public-light-subtle">Continue lendo</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-[var(--text-primary)]">Artigos relacionados</h2>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          {relatedArticles.map((relatedArticle) => (
            <BlogCard key={relatedArticle.slug} article={relatedArticle} />
          ))}
        </div>
      </section>
    </BlogShell>
  );
}
