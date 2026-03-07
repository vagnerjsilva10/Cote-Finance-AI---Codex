import Link from 'next/link';
import { BlogHeader } from './blog-header';

type BlogShellProps = {
  children: React.ReactNode;
};

export function BlogShell({ children }: BlogShellProps) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_10%_10%,rgba(16,185,129,.18),transparent_32%),radial-gradient(circle_at_90%_8%,rgba(59,130,246,.16),transparent_28%),linear-gradient(180deg,#020617_0%,#020617_52%,#0b1120_100%)]" />
      <BlogHeader />
      <main className="mx-auto w-full max-w-6xl px-4 pb-20 pt-10 sm:px-6 sm:pb-24 sm:pt-14">{children}</main>
      <footer className="border-t border-white/10 py-8">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-4 text-center text-sm text-slate-400 sm:flex-row sm:px-6 sm:text-left">
          <p>(c) 2026 Cote Finance AI. Blog e plataforma financeira integrados.</p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/blog" className="hover:text-white">
              Blog
            </Link>
            <Link href="/termos-de-uso" className="hover:text-white">
              Termos
            </Link>
            <Link href="/politica-de-privacidade" className="hover:text-white">
              Privacidade
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
