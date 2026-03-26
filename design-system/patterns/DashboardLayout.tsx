import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type DashboardLayoutProps = {
  summary: ReactNode;
  main: ReactNode;
  rail?: ReactNode;
  className?: string;
};

export function DashboardLayout({ summary, main, rail, className }: DashboardLayoutProps) {
  return (
    <div className={cn('space-y-6', className)}>
      <div>{summary}</div>
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-start">
        <div className={cn('space-y-4', rail ? 'lg:col-span-8' : 'lg:col-span-12')}>{main}</div>
        {rail ? <aside className="space-y-4 lg:col-span-4">{rail}</aside> : null}
      </section>
    </div>
  );
}