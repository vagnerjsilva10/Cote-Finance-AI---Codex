import { cn } from '@/lib/utils';
import { localizeBlogText } from '@/lib/blog/types';

export type BlogAccent = 'emerald' | 'cyan' | 'amber' | 'blue';

const accentClasses: Record<BlogAccent, { glow: string; badge: string; lines: string }> = {
  emerald: {
    glow: 'bg-[radial-gradient(circle_at_18%_20%,rgba(59,130,246,.16),transparent_34%),linear-gradient(180deg,var(--bg-surface)_0%,var(--bg-surface-elevated)_100%)]',
    badge: 'badge-premium',
    lines: 'from-[var(--primary)] to-[var(--primary-hover)]',
  },
  cyan: {
    glow: 'bg-[radial-gradient(circle_at_18%_20%,rgba(59,130,246,.18),transparent_34%),linear-gradient(180deg,var(--bg-surface)_0%,var(--bg-surface-elevated)_100%)]',
    badge: 'badge-premium',
    lines: 'from-[var(--primary)] to-[var(--primary-hover)]',
  },
  amber: {
    glow: 'bg-[radial-gradient(circle_at_18%_20%,rgba(59,130,246,.14),transparent_34%),linear-gradient(180deg,var(--bg-surface)_0%,var(--bg-surface-elevated)_100%)]',
    badge: 'badge-premium',
    lines: 'from-[var(--primary)] to-[var(--primary-hover)]',
  },
  blue: {
    glow: 'bg-[radial-gradient(circle_at_18%_20%,rgba(59,130,246,.2),transparent_34%),linear-gradient(180deg,var(--bg-surface)_0%,var(--bg-surface-elevated)_100%)]',
    badge: 'badge-premium',
    lines: 'from-[var(--primary)] to-[var(--primary-hover)]',
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
    <div className={cn('card-premium relative overflow-hidden rounded-[1.75rem] p-6 text-left', accentClass.glow, className)}>
      <div className="relative z-10 flex h-full min-h-[220px] flex-col justify-between">
        <div className={cn('inline-flex w-fit items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em]', accentClass.badge)}>
          {localizedCategory}
        </div>

        <div className="space-y-4">
          <div className="grid gap-2">
            {[78, 56, 90].map((width, index) => (
              <div key={`${accent}-${index}`} className="h-2 rounded-full bg-[color:var(--primary-soft)] p-[1px]">
                <div className={cn('h-full rounded-full bg-gradient-to-r', accentClass.lines)} style={{ width: `${width}%` }} />
              </div>
            ))}
          </div>
          <h3 className="max-w-[18ch] text-2xl font-black leading-tight text-[var(--text-primary)]">{localizedTitle}</h3>
        </div>
      </div>
    </div>
  );
}
