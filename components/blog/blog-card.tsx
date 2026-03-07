import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { BlogArticleSummary } from '@/lib/blog/types';
import { BlogCover } from './blog-cover';

type BlogCardProps = {
  article: BlogArticleSummary;
};

export function BlogCard({ article }: BlogCardProps) {
  return (
    <article className="group overflow-hidden rounded-[1.9rem] border border-white/10 bg-slate-900/55 transition-transform hover:-translate-y-1">
      <Link href={`/blog/${article.slug}`} className="block">
        <BlogCover title={article.title} category={article.category} accent={article.accent} className="rounded-b-none border-x-0 border-t-0" />
        <div className="space-y-4 p-6">
          <div className="flex flex-wrap items-center gap-3 text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
            <span>{article.publishedLabel}</span>
            <span className="h-1 w-1 rounded-full bg-slate-600" />
            <span>{article.readingTimeLabel}</span>
          </div>
          <h2 className="text-2xl font-semibold leading-tight text-white transition-colors group-hover:text-emerald-200">
            {article.title}
          </h2>
          <p className="text-sm leading-7 text-slate-300">{article.description}</p>
          <div className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-300">
            Ler artigo <ArrowRight size={15} />
          </div>
        </div>
      </Link>
    </article>
  );
}
