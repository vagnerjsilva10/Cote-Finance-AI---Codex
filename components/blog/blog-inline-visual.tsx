import { Sparkles } from 'lucide-react';
import type { BlogArticleVisual } from '@/lib/blog/types';

export function BlogInlineVisual({ visual }: { visual: BlogArticleVisual }) {
  return (
    <section className="overflow-hidden rounded-[2rem] border border-emerald-100 bg-[linear-gradient(180deg,#ffffff_0%,#f0fdf4_100%)] p-6 shadow-[0_24px_80px_-50px_rgba(16,185,129,0.32)] sm:p-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl space-y-4">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
            <Sparkles size={14} /> {visual.eyebrow}
          </span>
          <div className="space-y-3">
            <h2 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">{visual.title}</h2>
            <p className="text-base leading-8 text-slate-600 sm:text-lg">{visual.description}</p>
          </div>
        </div>

        <div className="grid w-full gap-4 sm:grid-cols-3 lg:max-w-2xl">
          {visual.items.map((item) => (
            <div key={item.label} className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{item.label}</p>
              <p className="mt-3 text-2xl font-black text-slate-950">{item.value}</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">{item.caption}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
