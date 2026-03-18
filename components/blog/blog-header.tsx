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
    <header className="header-premium sticky top-0 z-40 border-b border-[var(--border-default)] backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link href="/" className="flex items-center gap-4">
          <Image
            src="/brand/cote-finance-ai-logo.svg"
            alt="Cote Finance AI - By Cote Juros"
            width={720}
            height={192}
            priority
            className="hidden h-[4.75rem] w-auto sm:block lg:h-24"
          />
          <Image
            src="/brand/cote-favicon.svg"
            alt="Cote Finance AI"
            width={72}
            height={72}
            priority
            className="h-16 w-16 sm:hidden"
          />
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-[var(--text-secondary)] md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={
                item.active
                  ? 'font-semibold text-[var(--text-primary)] transition-colors hover:text-[var(--text-primary)]'
                  : 'transition-colors hover:text-[var(--text-primary)]'
              }
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link href="/app" className="button-secondary px-4 py-2 text-sm font-semibold">
            Entrar
          </Link>
          <Link href="/signup" className="button-primary px-4 py-2 text-sm font-bold">
            Começar grátis
          </Link>
        </div>
      </div>

      <div className="border-t border-[var(--border-default)] md:hidden">
        <nav className="mx-auto flex w-full max-w-6xl gap-2 overflow-x-auto px-4 py-3 sm:px-6">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={item.active ? 'badge-premium whitespace-nowrap px-4 py-2 text-sm font-semibold' : 'button-secondary whitespace-nowrap px-4 py-2 text-sm font-medium'}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
