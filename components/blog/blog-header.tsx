'use client';

import Image from 'next/image';
import Link from 'next/link';

type BlogHeaderProps = {
  activeItem?: 'blog' | 'help';
};

export function BlogHeader({ activeItem = 'blog' }: BlogHeaderProps) {
  const navItems = [
    { href: '/', label: 'Início', active: false },
    { href: '/blog', label: 'Blog', active: activeItem === 'blog' },
    { href: '/central-de-ajuda', label: 'Ajuda', active: activeItem === 'help' },
    { href: '/termos-de-uso', label: 'Termos', active: false },
    { href: '/politica-de-privacidade', label: 'Privacidade', active: false },
  ];

  return (
    <header className="theme-blog-header sticky top-0 z-40 border-b border-slate-200/80 bg-[#f7f8f3]/92 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link href="/" className="flex items-center gap-4">
          <Image
            src="/brand/cote-finance-ai-logo-black.svg"
            alt="Cote Finance AI - By Cote Juros"
            width={720}
            height={192}
            priority
            className="hidden h-[4.75rem] w-auto sm:block lg:h-24"
          />
          <Image
            src="/brand/cote-favicon-black.svg"
            alt="Cote Finance AI"
            width={72}
            height={72}
            priority
            className="h-16 w-16 sm:hidden"
          />
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-slate-600 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={
                item.active
                  ? 'font-semibold text-slate-950 transition-colors hover:text-emerald-700'
                  : 'transition-colors hover:text-slate-950'
              }
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/app"
            className="theme-blog-action rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-400 hover:text-slate-950"
          >
            Entrar
          </Link>
          <Link
            href="/signup"
            className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-emerald-600"
          >
            Começar grátis
          </Link>
        </div>
      </div>

      <div className="border-t border-slate-200/80 md:hidden">
        <nav className="mx-auto flex w-full max-w-6xl gap-2 overflow-x-auto px-4 py-3 sm:px-6">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={
                item.active
                  ? 'whitespace-nowrap rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700'
                  : 'whitespace-nowrap rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700'
              }
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
