import Image from 'next/image';
import Link from 'next/link';
import { Header } from '@/components/ui/premium-primitives';

type LegalSection = {
  title: string;
  paragraphs: string[];
  bullets?: string[];
};

type LegalPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  lastUpdated: string;
  sections: LegalSection[];
  currentPage: 'termos' | 'privacidade' | 'cookies';
};

export function LegalPage({ eyebrow, title, description, lastUpdated, sections, currentPage }: LegalPageProps) {
  const navItems = [
    { href: '/', label: 'Início', active: false },
    { href: '/blog', label: 'Blog', active: false },
    { href: '/central-de-ajuda', label: 'Ajuda', active: false },
    { href: '/termos-de-uso', label: 'Termos', active: currentPage === 'termos' },
    { href: '/politica-de-privacidade', label: 'Privacidade', active: currentPage === 'privacidade' },
    { href: '/cookies', label: 'Cookies', active: currentPage === 'cookies' },
  ];

  return (
    <div className="theme-public-light public-light-shell">
      <div className="public-light-backdrop pointer-events-none fixed inset-0 -z-10" />

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
              className="hidden h-16 w-auto sm:block lg:h-[5.5rem]"
            />
            <Image
              src="/brand/cote-favicon-black.svg"
              alt="Cote Finance AI"
              width={64}
              height={64}
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

      <main className="mx-auto w-full max-w-6xl px-4 pb-20 pt-10 sm:px-6 sm:pb-24 sm:pt-14">
        <section className="public-light-panel p-6 sm:p-8 md:p-10">
          <span className="public-light-badge px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]">{eyebrow}</span>
          <h1 className="mt-5 text-4xl font-black tracking-tight text-[var(--text-primary)] sm:text-5xl">{title}</h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-[var(--text-secondary)] sm:text-lg">{description}</p>
          <p className="mt-4 text-sm public-light-subtle">Última atualização: {lastUpdated}</p>
        </section>

        <section className="mt-8 space-y-6">
          {sections.map((section) => (
            <article key={section.title} className="public-light-card p-6 sm:p-8">
              <h2 className="text-2xl font-black tracking-tight text-[var(--text-primary)]">{section.title}</h2>
              <div className="mt-4 space-y-4 text-sm leading-7 text-[var(--text-secondary)] sm:text-base">
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
                {section.bullets ? (
                  <ul className="space-y-2 pl-5 text-[var(--text-secondary)]">
                    {section.bullets.map((bullet) => (
                      <li key={bullet} className="list-disc">
                        {bullet}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </article>
          ))}
        </section>
      </main>

      <footer className="border-t border-[var(--border-default)] bg-[var(--bg-surface)] py-8 backdrop-blur">
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
            <Link href="/cookies" className="hover:text-[var(--text-primary)]">
              Cookies
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
