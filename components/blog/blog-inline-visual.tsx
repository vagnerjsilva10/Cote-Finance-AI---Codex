import { Sparkles } from 'lucide-react';
import type { BlogArticleVisual } from '@/lib/blog/types';

export function BlogInlineVisual({ visual }: { visual: BlogArticleVisual }) {
  return (
    <section className="card-premium overflow-hidden rounded-[2rem] bg-[linear-gradient(180deg,var(--bg-surface)_0%,var(--bg-surface-elevated)_100%)] p-6 shadow-[var(--shadow-card)] sm:p-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl space-y-4">
          <span className="badge-premium inline-flex items-center gap-2 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]">
            <Sparkles size={14} /> {visual.eyebrow}
          </span>
          <div className="space-y-3">
            <h2 className="text-3xl font-black tracking-tight text-[var(--text-primary)] sm:text-4xl">{visual.title}</h2>
            <p className="text-base leading-8 text-[var(--text-secondary)] sm:text-lg">{visual.description}</p>
          </div>
        </div>

        <div className="grid w-full gap-4 sm:grid-cols-3 lg:max-w-2xl">
          {visual.items.map((item) => (
            <div key={item.label} className="card-premium rounded-[1.5rem] bg-[var(--bg-surface)] p-5 shadow-[var(--shadow-soft)]">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">{item.label}</p>
              <p className="mt-3 text-2xl font-black text-[var(--text-primary)]">{item.value}</p>
              <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">{item.caption}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
