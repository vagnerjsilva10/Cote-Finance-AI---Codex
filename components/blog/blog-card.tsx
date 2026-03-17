import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { localizeBlogText, type BlogArticleSummary } from '@/lib/blog/types';
import { BlogCover } from './blog-cover';

type BlogCardProps = {
  article: BlogArticleSummary;
};

export function BlogCard({ article }: BlogCardProps) {
  const localizedTitle = localizeBlogText(article.title);
  const localizedDescription = localizeBlogText(article.description);

  return (
    <article className="group public-light-card overflow-hidden rounded-[1.9rem] transition-all hover:-translate-y-1 hover:shadow-[0_26px_80px_-44px_rgba(76,141,255,.18)]">
      <Link href={`/blog/${article.slug}`} className="block">
        <BlogCover
          title={article.title}
          category={article.category}
          accent={article.accent}
          className="rounded-b-none border-x-0 border-t-0"
        />
        <div className="space-y-4 p-6">
          <div className="flex flex-wrap items-center gap-3 text-xs font-medium uppercase tracking-[0.16em] public-light-subtle">
            <span>{article.publishedLabel}</span>
            <span className="h-1 w-1 rounded-full bg-slate-300" />
            <span>{article.readingTimeLabel}</span>
            <span className="h-1 w-1 rounded-full bg-slate-300" />
            <span className="text-[var(--primary-active)]">{localizeBlogText(article.category)}</span>
          </div>
          <h2 className="text-2xl font-semibold leading-tight text-slate-950 transition-colors group-hover:text-[var(--primary-active)]">
            {localizedTitle}
          </h2>
          <p className="text-sm leading-7 text-[var(--text-secondary)]">{localizedDescription}</p>
          <div className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--primary-active)]">
            Ler artigo <ArrowRight size={15} />
          </div>
        </div>
      </Link>
    </article>
  );
}
