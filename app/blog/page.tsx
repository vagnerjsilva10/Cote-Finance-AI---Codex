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
    'Artigos sobre controle financeiro, educação financeira e inteligência artificial aplicada a uma rotina de dinheiro mais clara.',
  alternates: {
    canonical: absoluteUrl('/blog'),
  },
  openGraph: {
    title: 'Blog | Cote Finance AI',
    description:
      'Aprenda a organizar finanças, controlar gastos e usar IA para tomar decisões financeiras melhores.',
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
      'Artigos sobre controle financeiro, educação financeira e inteligência artificial aplicada às suas finanças.',
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
              Conteúdo prático para organizar finanças, entender gastos e usar IA a seu favor
            </h1>
            <p className="max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
              Este blog combina educação financeira com aplicação real do Cote Finance AI para transformar conhecimento
              em rotina, clareza e melhores decisões.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/app?auth=signup"
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
        </div>

        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
          <div className="rounded-[1.5rem] border border-slate-200 bg-[#f7f8f3] p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
              <Sparkles size={16} /> SEO e conversão
            </div>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Artigos desenhados para atrair buscas relevantes e levar o leitor para uma experiência real no SaaS.
            </p>
          </div>
          <div className="rounded-[1.5rem] border border-slate-200 bg-[#f7f8f3] p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-cyan-700">
              <TrendingUp size={16} /> 20 artigos iniciais
            </div>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Conteúdo focado em organizar finanças, controlar gastos, economizar melhor e usar o app com mais valor.
            </p>
          </div>
          <div className="rounded-[1.5rem] border border-slate-200 bg-[#f7f8f3] p-5">
            <div className="text-sm font-semibold text-slate-900">Categorias</div>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Ferramenta e educação financeira em um acervo único e integrado ao produto.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-14">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">Destaques</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Os artigos mais fortes para começar</h2>
          </div>
          <p className="max-w-2xl text-sm leading-7 text-slate-500">
            Conteúdo editorial com foco em descoberta orgânica, educação prática e conversão natural para o Cote Finance AI.
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
            <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Todos os artigos do blog</h2>
          </div>
          <p className="max-w-2xl text-sm leading-7 text-slate-500">
            Cada página foi estruturada com metadados, schema Article, OpenGraph e chamada para experimentar o SaaS.
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
