import Link from 'next/link';
import { BlogHeader } from './blog-header';

type BlogShellProps = {
  children: React.ReactNode;
  activeItem?: 'blog' | 'help';
};

export function BlogShell({ children, activeItem = 'blog' }: BlogShellProps) {
  return (
    <div className="theme-blog-shell min-h-screen bg-[#f7f8f3] text-slate-900">
      <div className="theme-blog-backdrop pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(16,185,129,.10),transparent_30%),linear-gradient(180deg,#fbfcf8_0%,#f7f8f3_100%)]" />
      <BlogHeader activeItem={activeItem} />
      <main className="mx-auto w-full max-w-6xl px-4 pb-20 pt-10 sm:px-6 sm:pb-24 sm:pt-14">{children}</main>
      <footer className="theme-blog-footer border-t border-slate-200/80 bg-white/80 py-8 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-4 text-center text-sm text-slate-500 sm:flex-row sm:px-6 sm:text-left">
          <p>© 2026 Cote Finance AI. Blog e plataforma financeira integrados.</p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/blog" className="hover:text-slate-900">
              Blog
            </Link>
            <Link href="/central-de-ajuda" className="hover:text-slate-900">
              Ajuda
            </Link>
            <Link href="/termos-de-uso" className="hover:text-slate-900">
              Termos
            </Link>
            <Link href="/politica-de-privacidade" className="hover:text-slate-900">
              Privacidade
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
