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
    'Artigos sobre controle financeiro, educacao financeira e inteligencia artificial aplicada a uma rotina de dinheiro mais clara.',
  alternates: {
    canonical: absoluteUrl('/blog'),
  },
  openGraph: {
    title: 'Blog | Cote Finance AI',
    description:
      'Aprenda a organizar financas, controlar gastos e usar IA para tomar decisoes financeiras melhores.',
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
      'Artigos sobre controle financeiro, educacao financeira e inteligencia artificial aplicada as suas financas.',
    images: [absoluteUrl('/brand/cote-finance-ai-logo.png')],
  },
};

export default function BlogIndexPage() {
  return (
    <BlogShell>
      <section className="grid gap-6 rounded-[2rem] border border-white/10 bg-slate-900/55 p-6 shadow-[0_30px_90px_-46px_rgba(16,185,129,.32)] sm:p-8 lg:grid-cols-[1.3fr_.9fr] lg:items-end">
        <div className="space-y-6">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200">
            <BookOpen size={14} /> Blog Cote Finance AI
          </span>
          <div className="space-y-4">
            <h1 className="max-w-3xl text-4xl font-bold leading-tight text-white sm:text-5xl">
              Conteudo pratico para organizar financas, entender gastos e usar IA a seu favor
            </h1>
            <p className="max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
              Este blog combina educacao financeira com aplicacao real do Cote Finance AI para transformar
              conhecimento em rotina, clareza e melhores decisoes.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/app?auth=signup"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-900 transition-colors hover:bg-slate-100"
            >
              Comecar gratis <ArrowRight size={16} />
            </Link>
            <Link
              href="/app"
              className="rounded-xl border border-white/15 px-5 py-3 text-sm font-semibold text-white transition-colors hover:border-white/30"
            >
              Ver o produto
            </Link>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
          <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/50 p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-200">
              <Sparkles size={16} />
              SEO e conversao
            </div>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              Artigos desenhados para atrair buscas relevantes e levar o leitor para uma experiencia real no SaaS.
            </p>
          </div>
          <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/50 p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-cyan-200">
              <TrendingUp size={16} />
              20 artigos iniciais
            </div>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              Conteudo focado em organizar financas, controlar gastos, economizar melhor e usar o app com mais valor.
            </p>
          </div>
          <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/50 p-5">
            <div className="text-sm font-semibold text-slate-100">Categorias</div>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              Ferramenta e Educacao Financeira em um acervo unico e integrado ao produto.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-14">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-200">Destaques</p>
            <h2 className="mt-2 text-3xl font-bold text-white">Os artigos mais fortes para comecar</h2>
          </div>
          <p className="max-w-2xl text-sm leading-7 text-slate-400">
            Conteudo editorial com foco em descoberta organica, educacao pratica e conversao natural para o
            Cote Finance AI.
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
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">Biblioteca completa</p>
            <h2 className="mt-2 text-3xl font-bold text-white">Todos os artigos do blog</h2>
          </div>
          <p className="max-w-2xl text-sm leading-7 text-slate-400">
            Cada pagina foi estruturada com metadados, schema Article, OpenGraph e chamada para experimentar o SaaS.
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
