import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Clock3, Sparkles } from 'lucide-react';
import { BlogArticleCta } from '@/components/blog/blog-article-cta';
import { BlogCard } from '@/components/blog/blog-card';
import { BlogCover } from '@/components/blog/blog-cover';
import { BlogShell } from '@/components/blog/blog-shell';
import { getAllBlogArticles, getBlogArticleBySlug, getRelatedBlogArticles } from '@/lib/blog/articles';
import { absoluteUrl } from '@/lib/blog/seo';

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
      title: 'Artigo nao encontrado | Cote Finance AI',
      description: 'O artigo solicitado nao foi encontrado.',
    };
  }

  const canonical = absoluteUrl(`/blog/${article.slug}`);

  return {
    title: article.seoTitle,
    description: article.seoDescription,
    alternates: {
      canonical,
    },
    openGraph: {
      title: article.seoTitle,
      description: article.seoDescription,
      url: canonical,
      type: 'article',
      publishedTime: article.publishedAt,
      authors: [article.author],
      section: article.category,
      tags: article.keywords,
      images: [
        {
          url: absoluteUrl('/brand/cote-finance-ai-logo.png'),
          width: 2400,
          height: 640,
          alt: article.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: article.seoTitle,
      description: article.seoDescription,
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
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.seoDescription,
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
    keywords: article.keywords.join(', '),
    articleSection: article.category,
  };

  return (
    <BlogShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />

      <div className="mb-8">
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-300 transition-colors hover:text-white"
        >
          <ArrowLeft size={16} />
          Voltar para o blog
        </Link>
      </div>

      <article className="space-y-10">
        <header className="grid gap-8 lg:grid-cols-[1.1fr_.9fr] lg:items-center">
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              <span className="rounded-full border border-emerald-300/20 bg-emerald-500/10 px-3 py-1 text-emerald-200">
                {article.category}
              </span>
              <span>{article.publishedLabel}</span>
              <span className="h-1 w-1 rounded-full bg-slate-600" />
              <span className="inline-flex items-center gap-1">
                <Clock3 size={12} />
                {article.readingTimeLabel}
              </span>
            </div>
            <div className="space-y-4">
              <h1 className="max-w-4xl text-4xl font-bold leading-tight text-white sm:text-5xl">{article.title}</h1>
              <p className="max-w-3xl text-lg leading-8 text-slate-300">{article.description}</p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-900/55 px-4 py-2 text-sm text-slate-300">
              <Sparkles size={15} className="text-emerald-300" />
              Publicado por {article.author}
            </div>
          </div>

          <BlogCover
            title={article.title}
            category={article.category}
            accent={article.accent}
            className="min-h-[320px] p-8"
          />
        </header>

        <div className="grid gap-10 lg:grid-cols-[1fr_280px]">
          <div className="space-y-8">
            {article.sections.map((section, index) => (
              <section key={section.title} className="rounded-[1.75rem] border border-white/10 bg-slate-900/45 p-6 sm:p-8">
                <h2 className="text-2xl font-semibold text-white">
                  {index + 1}. {section.title}
                </h2>
                <div className="mt-5 space-y-4 text-base leading-8 text-slate-300">
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
                {section.bullets?.length ? (
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold text-slate-100">Pontos principais</h3>
                    <ul className="mt-4 space-y-3">
                      {section.bullets.map((bullet) => (
                        <li
                          key={bullet}
                          className="rounded-2xl border border-white/10 bg-slate-950/45 px-4 py-3 text-sm leading-7 text-slate-200"
                        >
                          {bullet}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </section>
            ))}

            <BlogArticleCta />
          </div>

          <aside className="space-y-6">
            <div className="rounded-[1.75rem] border border-white/10 bg-slate-900/45 p-6">
              <h2 className="text-lg font-semibold text-white">Como o Cote Finance AI pode ajudar</h2>
              <p className="mt-4 text-sm leading-7 text-slate-300">
                O produto conecta controle de gastos, insights com IA, metas financeiras e gestao de dividas em um fluxo unico e pratico.
              </p>
              <div className="mt-5 flex flex-col gap-3">
                <Link
                  href="/app?auth=signup"
                  className="rounded-xl bg-white px-4 py-3 text-center text-sm font-bold text-slate-900 transition-colors hover:bg-slate-100"
                >
                  Comecar gratis
                </Link>
                <Link
                  href="/app"
                  className="rounded-xl border border-white/15 px-4 py-3 text-center text-sm font-semibold text-white transition-colors hover:border-white/30"
                >
                  Ver o produto
                </Link>
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-white/10 bg-slate-900/45 p-6">
              <h2 className="text-lg font-semibold text-white">Palavras-chave deste artigo</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {article.keywords.map((keyword) => (
                  <span
                    key={keyword}
                    className="rounded-full border border-emerald-300/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-100"
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
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">Continue lendo</p>
          <h2 className="mt-2 text-3xl font-bold text-white">Artigos relacionados</h2>
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
