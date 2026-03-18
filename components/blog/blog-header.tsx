'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Header } from '@/components/ui/premium-primitives';

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
    <Header
      light
      logo={
        <Link href="/" className="flex items-center gap-4">
          <Image
            src="/brand/cote-finance-ai-logo-black.svg"
            alt="Cote Finance AI - By Cote Juros"
            width={720}
            height={192}
            priority
            className="hidden h-[4.5rem] w-auto sm:block lg:h-20"
          />
          <Image
            src="/brand/cote-favicon-black.svg"
            alt="Cote Finance AI"
            width={72}
            height={72}
            priority
            className="h-14 w-14 sm:hidden"
          />
        </Link>
      }
      navItems={navItems}
      actions={
        <>
          <Link href="/app" className="button-light-secondary px-4 py-2 text-sm font-semibold">
            Entrar
          </Link>
          <Link href="/signup" className="button-light-primary px-4 py-2 text-sm font-semibold">
            Começar grátis
          </Link>
        </>
      }
    />
  );
}
