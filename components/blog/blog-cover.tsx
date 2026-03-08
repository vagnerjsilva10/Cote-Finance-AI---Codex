import { cn } from '@/lib/utils';
import { localizeBlogText } from '@/lib/blog/types';

export type BlogAccent = 'emerald' | 'cyan' | 'amber' | 'blue';

const accentClasses: Record<BlogAccent, { glow: string; badge: string; lines: string }> = {
  emerald: {
    glow:
      'bg-[radial-gradient(circle_at_18%_20%,rgba(16,185,129,.18),transparent_34%),linear-gradient(180deg,#ffffff_0%,#f0fdf4_100%)]',
    badge: 'border-emerald-200 bg-white text-emerald-700',
    lines: 'from-emerald-500/90 to-teal-400/80',
  },
  cyan: {
    glow:
      'bg-[radial-gradient(circle_at_18%_20%,rgba(34,211,238,.18),transparent_34%),linear-gradient(180deg,#ffffff_0%,#ecfeff_100%)]',
    badge: 'border-cyan-200 bg-white text-cyan-700',
    lines: 'from-cyan-500/90 to-sky-400/80',
  },
  amber: {
    glow:
      'bg-[radial-gradient(circle_at_18%_20%,rgba(251,191,36,.16),transparent_34%),linear-gradient(180deg,#ffffff_0%,#fffbeb_100%)]',
    badge: 'border-amber-200 bg-white text-amber-700',
    lines: 'from-amber-500/90 to-orange-400/80',
  },
  blue: {
    glow:
      'bg-[radial-gradient(circle_at_18%_20%,rgba(96,165,250,.18),transparent_34%),linear-gradient(180deg,#ffffff_0%,#eff6ff_100%)]',
    badge: 'border-blue-200 bg-white text-blue-700',
    lines: 'from-blue-500/90 to-indigo-400/80',
  },
};

type BlogCoverProps = {
  title: string;
  category: string;
  accent: BlogAccent;
  className?: string;
};

export function BlogCover({ title, category, accent, className }: BlogCoverProps) {
  const accentClass = accentClasses[accent];
  const localizedTitle = localizeBlogText(title);
  const localizedCategory = localizeBlogText(category);

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-[1.75rem] border border-slate-200 p-6 text-left',
        accentClass.glow,
        className
      )}
    >
      <div className="relative z-10 flex h-full min-h-[220px] flex-col justify-between">
        <div
          className={cn(
            'inline-flex w-fit items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em]',
            accentClass.badge
          )}
        >
          {localizedCategory}
        </div>

        <div className="space-y-4">
          <div className="grid gap-2">
            {[78, 56, 90].map((width, index) => (
              <div key={`${accent}-${index}`} className="h-2 rounded-full bg-slate-200 p-[1px]">
                <div
                  className={cn('h-full rounded-full bg-gradient-to-r', accentClass.lines)}
                  style={{ width: `${width}%` }}
                />
              </div>
            ))}
          </div>
          <h3 className="max-w-[18ch] text-2xl font-black leading-tight text-slate-950">{localizedTitle}</h3>
        </div>
      </div>
    </div>
  );
}
