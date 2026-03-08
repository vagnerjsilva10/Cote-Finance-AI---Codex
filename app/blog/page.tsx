import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, BookOpen, Sparkles, TrendingUp } from 'lucide-react';
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
      <section className="grid gap-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_28px_90px_-54px_rgba(15,23,42,.18)] sm:p-8 lg:grid-cols-[1.25fr_.95fr] lg:items-end">
        <div className="space-y-6">
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
              O blog do Cote Finance AI reúne guias práticos, educação financeira e estratégias reais para você ter
              mais clareza sobre seu dinheiro.
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
          <div className="rounded-[1.25rem] border border-slate-200 bg-[#f7f8f3] px-4 py-3 text-sm font-semibold text-slate-700">
            +12.000 pessoas já usam o Cote Finance AI para organizar suas finanças
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
          <div className="rounded-[1.5rem] border border-slate-200 bg-[#f7f8f3] p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
              <Sparkles size={16} /> Conteúdo feito para melhorar sua vida financeira
            </div>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Aqui você encontra artigos que ajudam a entender seu dinheiro de forma simples e prática.
            </p>
          </div>
          <div className="rounded-[1.5rem] border border-slate-200 bg-[#f7f8f3] p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-cyan-700">
              <TrendingUp size={16} /> Aprenda. Aplique. Tenha mais controle financeiro.
            </div>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Cada artigo foi criado para ajudar você a organizar suas finanças, economizar mais e tomar decisões financeiras melhores.
            </p>
          </div>
          <div className="rounded-[1.5rem] border border-slate-200 bg-[#f7f8f3] p-5">
            <div className="text-sm font-semibold text-slate-900">Conteúdo com aplicação real</div>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Os conteúdos combinam educação financeira com o uso prático do Cote Finance AI para transformar informação em resultados reais.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-10 rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="max-w-4xl space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">Sobre o blog</p>
          <h2 className="text-3xl font-black tracking-tight text-slate-950">
            Conteúdo feito para melhorar sua vida financeira
          </h2>
          <p className="text-base leading-8 text-slate-600">
            Aqui você encontra artigos que ajudam a entender seu dinheiro de forma simples e prática.
          </p>
          <p className="text-base leading-8 text-slate-600">
            Desde controle de gastos até planejamento financeiro, o objetivo do blog é transformar conhecimento em ação.
          </p>
        </div>
      </section>

      <section className="mt-14">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">Destaques</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Comece pelos artigos mais importantes</h2>
          </div>
          <p className="max-w-2xl text-sm leading-7 text-slate-500">
            Selecionamos alguns dos conteúdos mais úteis para quem quer organizar as finanças, entender os próprios gastos e melhorar a saúde financeira.
          </p>
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
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Biblioteca completa</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Biblioteca completa de educação financeira</h2>
          </div>
          <p className="max-w-2xl text-sm leading-7 text-slate-500">
            Explore todos os artigos do blog e descubra estratégias para organizar sua vida financeira, economizar dinheiro e tomar decisões melhores no dia a dia.
          </p>
          <p className="max-w-2xl text-sm leading-7 text-slate-500">
            Cada artigo inclui exemplos práticos, orientações claras e formas de aplicar o conhecimento com o Cote Finance AI.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {articles.map((article) => (
            <BlogCard key={article.slug} article={article} />
          ))}
        </div>
      </section>

      <section className="mt-14 rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">Crescimento do blog</p>
        <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">
          Se quiser, também posso te mostrar 3 melhorias que fazem um blog SaaS gerar 3x mais cadastros (e quase ninguém implementa)
        </h2>
        <p className="mt-3 text-base leading-8 text-slate-600">
          São ajustes de SEO, distribuição e conversão que quase ninguém implementa direito, mesmo com um bom conteúdo publicado.
        </p>
      </section>
    </BlogShell>
  );
}
