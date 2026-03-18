import Link from 'next/link';
import { BlogHeader } from './blog-header';

type BlogShellProps = {
  children: React.ReactNode;
  activeItem?: 'blog' | 'help';
};

export function BlogShell({ children, activeItem = 'blog' }: BlogShellProps) {
  return (
    <div className="theme-blog-shell theme-public-light public-light-shell">
      <div className="theme-blog-backdrop public-light-backdrop pointer-events-none fixed inset-0 -z-10" />
      <BlogHeader activeItem={activeItem} />
      <main className="mx-auto w-full max-w-6xl px-4 pb-20 pt-10 sm:px-6 sm:pb-24 sm:pt-14">{children}</main>
      <footer className="theme-blog-footer border-t border-[rgba(15,23,42,0.06)] bg-[var(--bg-surface)] py-8 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-4 text-center text-sm public-light-subtle sm:flex-row sm:px-6 sm:text-left">
          <p>© 2026 Cote Finance AI. Blog e plataforma financeira integrados.</p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/blog" className="hover:text-[var(--text-primary)]">
              Blog
            </Link>
            <Link href="/central-de-ajuda" className="hover:text-[var(--text-primary)]">
              Ajuda
            </Link>
            <Link href="/termos-de-uso" className="hover:text-[var(--text-primary)]">
              Termos
            </Link>
            <Link href="/politica-de-privacidade" className="hover:text-[var(--text-primary)]">
              Privacidade
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
