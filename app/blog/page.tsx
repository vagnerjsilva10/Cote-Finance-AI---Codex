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
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_28px_90px_-54px_rgba(15,23,42,.18)] sm:p-8">
        <div className="max-w-4xl space-y-5">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
            <BookOpen size={14} /> Blog Cote Finance AI
          </span>
          <div className="space-y-4">
            <h1 className="max-w-3xl text-4xl font-black leading-tight tracking-tight text-slate-950 sm:text-5xl">
              Controle melhor seu dinheiro com conhecimento prático
            </h1>
            <p className="max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
              Aprenda a organizar suas finanças, entender seus gastos e tomar decisões financeiras mais inteligentes.
            </p>
            <p className="max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
              O blog do Cote Finance AI reúne guias práticos, educação financeira e estratégias reais para ajudar você a
              ter mais clareza sobre seu dinheiro.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-emerald-600"
            >
              Começar grátis <ArrowRight size={16} />
            </Link>
            <Link
              href="/app"
              className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-400 hover:text-slate-950"
            >
              Ver o produto
            </Link>
          </div>
          <p className="text-sm font-medium text-slate-500">Leva menos de 1 minuto para começar.</p>
        </div>
      </section>

      <section className="mt-8 rounded-[1.25rem] border border-slate-200 bg-[#f7f8f3] px-5 py-4 text-sm font-semibold text-slate-700 shadow-sm">
        +12.000 pessoas já usam o Cote Finance AI para organizar suas finanças.
      </section>

      <section className="mt-10 grid gap-4 lg:grid-cols-3">
        <article className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black tracking-tight text-slate-950">Organize suas finanças com mais clareza</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Guias simples que mostram como controlar gastos, planejar seu dinheiro e melhorar sua vida financeira.
          </p>
        </article>

        <article className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black tracking-tight text-slate-950">Entenda para onde seu dinheiro está indo</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Aprenda a identificar hábitos financeiros, reduzir desperdícios e tomar decisões melhores com seu dinheiro.
          </p>
        </article>

        <article className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black tracking-tight text-slate-950">Transforme conhecimento em ação</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Use o que você aprende no blog junto com o Cote Finance AI para acompanhar gastos, definir metas e melhorar
            sua saúde financeira.
          </p>
        </article>
      </section>

      <section className="mt-14">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">Artigos em destaque</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Comece pelos artigos mais importantes</h2>
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
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Todos os artigos</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Todos os artigos</h2>
          </div>
          <p className="max-w-2xl text-sm leading-7 text-slate-500">
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
