import { cn } from '@/lib/utils';

export type BlogAccent = 'emerald' | 'cyan' | 'amber' | 'blue';

const accentClasses: Record<BlogAccent, { glow: string; badge: string; lines: string }> = {
  emerald: {
    glow:
      'bg-[radial-gradient(circle_at_20%_20%,rgba(16,185,129,.28),transparent_32%),radial-gradient(circle_at_80%_70%,rgba(45,212,191,.18),transparent_30%),linear-gradient(180deg,#04111f_0%,#071827_100%)]',
    badge: 'border-emerald-300/30 bg-emerald-500/10 text-emerald-100',
    lines: 'from-emerald-400/90 to-teal-300/75',
  },
  cyan: {
    glow:
      'bg-[radial-gradient(circle_at_18%_20%,rgba(34,211,238,.28),transparent_32%),radial-gradient(circle_at_82%_76%,rgba(59,130,246,.2),transparent_34%),linear-gradient(180deg,#04111f_0%,#071827_100%)]',
    badge: 'border-cyan-300/30 bg-cyan-500/10 text-cyan-100',
    lines: 'from-cyan-400/90 to-sky-300/75',
  },
  amber: {
    glow:
      'bg-[radial-gradient(circle_at_18%_20%,rgba(251,191,36,.22),transparent_32%),radial-gradient(circle_at_82%_76%,rgba(249,115,22,.16),transparent_34%),linear-gradient(180deg,#04111f_0%,#071827_100%)]',
    badge: 'border-amber-300/30 bg-amber-500/10 text-amber-100',
    lines: 'from-amber-300/90 to-orange-300/75',
  },
  blue: {
    glow:
      'bg-[radial-gradient(circle_at_18%_20%,rgba(96,165,250,.25),transparent_32%),radial-gradient(circle_at_82%_76%,rgba(99,102,241,.18),transparent_34%),linear-gradient(180deg,#04111f_0%,#071827_100%)]',
    badge: 'border-blue-300/30 bg-blue-500/10 text-blue-100',
    lines: 'from-blue-300/90 to-indigo-300/75',
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

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-[1.75rem] border border-white/10 p-6 text-left shadow-[0_24px_90px_-50px_rgba(16,185,129,.42)]',
        accentClass.glow,
        className
      )}
    >
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,.04)_0%,rgba(2,6,23,.5)_100%)]" />
      <div className="relative z-10 flex h-full min-h-[220px] flex-col justify-between">
        <div className={cn('inline-flex w-fit items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em]', accentClass.badge)}>
          {category}
        </div>

        <div className="space-y-4">
          <div className="grid gap-2">
            {[72, 54, 88].map((width, index) => (
              <div key={`${accent}-${index}`} className="h-2 rounded-full bg-white/6 p-[1px]">
                <div
                  className={cn('h-full rounded-full bg-gradient-to-r', accentClass.lines)}
                  style={{ width: `${width}%` }}
                />
              </div>
            ))}
          </div>
          <h3 className="max-w-[18ch] text-2xl font-bold leading-tight text-white">{title}</h3>
        </div>
      </div>
    </div>
  );
}
