import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, BookOpen } from 'lucide-react';
import { BlogCard } from '@/components/blog/blog-card';
import { BlogShell } from '@/components/blog/blog-shell';
import { getAllBlogArticles, getFeaturedBlogArticles } from '@/lib/blog/articles';
import { absoluteUrl } from '@/lib/blog/seo';

const articles = getAllBlogArticles();
const featuredArticles = getFeaturedBlogArticles().slice(0, 3);

export const metadata: Metadata = {
  title: 'Blog | Cote Finance AI',
  description:
    'Aprenda a organizar suas finanças, entender seus gastos e tomar decisões financeiras mais inteligentes com o blog do Cote Finance AI.',
  alternates: {
    canonical: absoluteUrl('/blog'),
  },
  openGraph: {
    title: 'Blog | Cote Finance AI',
    description:
      'Aprenda a organizar suas finanças, entender seus gastos e tomar decisões financeiras mais inteligentes.',
    url: absoluteUrl('/blog'),
    siteName: 'Cote Finance AI',
    type: 'website',
    images: [
      {
        url: absoluteUrl('/brand/cote-finance-ai-logo.png'),
        width: 2400,
        height: 640,
        alt: 'Cote Finance AI',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Blog | Cote Finance AI',
    description:
      'Aprenda a organizar suas finanças, entender seus gastos e tomar decisões financeiras mais inteligentes.',
    images: [absoluteUrl('/brand/cote-finance-ai-logo.png')],
  },
};

export default function BlogIndexPage() {
  return (
    <BlogShell>
      <section className="public-light-panel p-6 sm:p-8">
        <div className="grid gap-8 lg:grid-cols-[1.15fr_.85fr] lg:items-end">
          <div className="space-y-5">
            <span className="public-light-badge inline-flex items-center gap-2 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]">
              <BookOpen size={14} /> Blog Cote Finance AI
            </span>
            <h1 className="max-w-3xl text-4xl font-black leading-tight tracking-tight text-[var(--text-primary)] sm:text-5xl">
              Leitura prática para decisões financeiras mais claras.
            </h1>
            <p className="max-w-3xl text-base leading-8 text-[var(--text-secondary)] sm:text-lg">
              Conteúdos diretos sobre rotina financeira, controle de gastos, metas e comportamento de consumo para aplicar no dia a dia.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/signup" className="button-light-primary inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold">
                Começar grátis <ArrowRight size={16} />
              </Link>
              <Link href="/app" className="button-light-secondary px-5 py-3 text-sm font-semibold">
                Ver produto
              </Link>
            </div>
          </div>

          <aside className="public-light-card p-6">
            <p className="label-premium">No blog você encontra</p>
            <div className="mt-4 grid gap-3">
              {[
                'Guias de controle de gastos',
                'Planejamento financeiro aplicável',
                'Estratégias de organização pessoal',
                'Conteúdo orientado a ação',
              ].map((item) => (
                <div key={item} className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-container)] px-4 py-3 text-sm text-[var(--text-secondary)]">
                  {item}
                </div>
              ))}
            </div>
          </aside>
        </div>
      </section>

      <section className="mt-10">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="label-premium">Destaques</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-[var(--text-primary)]">Artigos recomendados</h2>
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          {featuredArticles.map((article) => (
            <BlogCard key={article.slug} article={article} />
          ))}
        </div>
      </section>

      <section className="mt-14">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="label-premium">Biblioteca</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-[var(--text-primary)]">Todos os artigos</h2>
          </div>
          <p className="max-w-2xl text-sm leading-7 public-light-subtle">
            Explore conteúdos para criar consistência financeira com uma rotina simples, objetiva e sustentável.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {articles.map((article) => (
            <BlogCard key={article.slug} article={article} />
          ))}
        </div>
      </section>
    </BlogShell>
  );
}
