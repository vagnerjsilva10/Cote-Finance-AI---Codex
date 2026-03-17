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
          <div className="max-w-4xl space-y-5">
            <span className="inline-flex items-center gap-2 rounded-full border border-[rgba(76,141,255,0.16)] bg-[rgba(76,141,255,0.08)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--primary-active)]">
              <BookOpen size={14} /> Blog Cote Finance AI
            </span>
            <div className="space-y-4">
              <h1 className="max-w-3xl text-4xl font-black leading-tight tracking-tight text-[var(--text-primary)] sm:text-5xl">
                Controle melhor seu dinheiro com conhecimento prático
              </h1>
              <p className="max-w-2xl text-base leading-8 text-[var(--text-secondary)] sm:text-lg">
                Aprenda a organizar suas finanças, entender seus gastos e tomar decisões financeiras mais inteligentes.
              </p>
              <p className="max-w-2xl text-base leading-8 text-[var(--text-secondary)] sm:text-lg">
                O blog do Cote Finance AI reúne guias práticos, educação financeira e estratégias reais para ajudar você a
                ter mais clareza sobre seu dinheiro.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 button-light-primary px-5 py-3 text-sm font-semibold"
              >
                Começar grátis <ArrowRight size={16} />
              </Link>
              <Link
                href="/app"
                className="button-light-secondary px-5 py-3 text-sm font-semibold"
              >
                Ver o produto
              </Link>
            </div>
            <p className="text-sm font-medium public-light-subtle">Leva menos de 1 minuto para começar.</p>
          </div>

          <aside className="public-light-card bg-[rgba(255,255,255,0.72)] p-5">
            <div className="public-light-card p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--primary-active)]">No blog você encontra</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-[rgba(15,23,42,0.06)] bg-[rgba(76,141,255,0.05)] px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] public-light-subtle">Guias</p>
                  <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">Controle de gastos</p>
                </div>
                <div className="rounded-2xl border border-[rgba(15,23,42,0.06)] bg-[rgba(76,141,255,0.05)] px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] public-light-subtle">Educação</p>
                  <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">Planejamento financeiro</p>
                </div>
                <div className="rounded-2xl border border-[rgba(15,23,42,0.06)] bg-[rgba(76,141,255,0.05)] px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] public-light-subtle">Prática</p>
                  <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">Exemplos do dia a dia</p>
                </div>
                <div className="rounded-2xl border border-[rgba(15,23,42,0.06)] bg-[rgba(76,141,255,0.05)] px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] public-light-subtle">Ação</p>
                  <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">Passos para aplicar hoje</p>
                </div>
              </div>
            </div>

            <div className="mt-4 public-light-card px-5 py-4">
              <p className="text-sm font-semibold text-[var(--text-primary)]">Leitura pensada para ser útil</p>
              <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                Menos teoria vazia e mais orientação prática para ajudar você a entender o que fazer com o seu dinheiro.
              </p>
            </div>
          </aside>
        </div>
      </section>

      <section className="mt-8 public-light-card px-5 py-4 text-sm font-semibold text-[var(--text-secondary)]">
        +12.000 pessoas já usam o Cote Finance AI para organizar suas finanças.
      </section>

      <section className="mt-10 grid gap-4 lg:grid-cols-3">
        <article className="public-light-card p-5">
          <h2 className="text-lg font-black tracking-tight text-[var(--text-primary)]">Organize suas finanças com mais clareza</h2>
          <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
            Guias simples que mostram como controlar gastos, planejar seu dinheiro e melhorar sua vida financeira.
          </p>
        </article>

        <article className="public-light-card p-5">
          <h2 className="text-lg font-black tracking-tight text-[var(--text-primary)]">Entenda para onde seu dinheiro está indo</h2>
          <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
            Aprenda a identificar hábitos financeiros, reduzir desperdícios e tomar decisões melhores com seu dinheiro.
          </p>
        </article>

        <article className="public-light-card p-5">
          <h2 className="text-lg font-black tracking-tight text-[var(--text-primary)]">Transforme conhecimento em ação</h2>
          <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
            Use o que você aprende no blog junto com o Cote Finance AI para acompanhar gastos, definir metas e melhorar
            sua saúde financeira.
          </p>
        </article>
      </section>

      <section className="mt-14">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--primary-active)]">Artigos em destaque</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-[var(--text-primary)]">Comece pelos artigos mais importantes</h2>
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
            <p className="text-sm font-semibold uppercase tracking-[0.18em] public-light-subtle">Todos os artigos</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-[var(--text-primary)]">Todos os artigos</h2>
          </div>
          <p className="max-w-2xl text-sm leading-7 public-light-subtle">
            Explore todos os artigos do blog para organizar sua vida financeira, entender melhor seus gastos e tomar
            decisões melhores no dia a dia.
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
