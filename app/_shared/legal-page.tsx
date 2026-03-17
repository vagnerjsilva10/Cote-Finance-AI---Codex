import Image from 'next/image';
import Link from 'next/link';

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
  currentPage: 'termos' | 'privacidade';
};

export function LegalPage({ eyebrow, title, description, lastUpdated, sections, currentPage }: LegalPageProps) {
  const navItems = [
    { href: '/', label: 'Início', active: false },
    { href: '/blog', label: 'Blog', active: false },
    { href: '/central-de-ajuda', label: 'Ajuda', active: false },
    { href: '/termos-de-uso', label: 'Termos', active: currentPage === 'termos' },
    { href: '/politica-de-privacidade', label: 'Privacidade', active: currentPage === 'privacidade' },
  ];

  return (
    <div className="theme-public-light public-light-shell">
      <div className="public-light-backdrop pointer-events-none fixed inset-0 -z-10" />

      <header className="public-light-header sticky top-0 z-40">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
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

          <nav className="hidden items-center gap-6 text-sm text-[var(--text-secondary)] md:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={
                  item.active
                    ? 'font-semibold text-[var(--text-primary)] transition-colors hover:text-[var(--primary-active)]'
                    : 'transition-colors hover:text-[var(--text-primary)]'
                }
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/app"
              className="button-light-secondary px-4 py-2 text-sm font-semibold"
            >
              Entrar
            </Link>
            <Link
              href="/signup"
              className="button-light-primary px-4 py-2 text-sm font-semibold"
            >
              Começar grátis
            </Link>
          </div>
        </div>

        <div className="border-t border-[rgba(15,23,42,0.08)] md:hidden">
          <nav className="mx-auto flex w-full max-w-6xl gap-2 overflow-x-auto px-4 py-3 sm:px-6">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={
                  item.active
                    ? 'whitespace-nowrap public-light-badge whitespace-nowrap px-4 py-2 text-sm font-semibold'
                    : 'whitespace-nowrap button-light-secondary whitespace-nowrap px-4 py-2 text-sm font-medium'
                }
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 pb-20 pt-10 sm:px-6 sm:pb-24 sm:pt-14">
        <section className="public-light-panel p-6 sm:p-8 md:p-10">
          <span className="inline-flex items-center rounded-full border border-[rgba(76,141,255,0.16)] bg-[rgba(76,141,255,0.08)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--primary-active)]">
            {eyebrow}
          </span>
          <h1 className="mt-5 text-4xl font-black tracking-tight text-[var(--text-primary)] sm:text-5xl">{title}</h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-[var(--text-secondary)] sm:text-lg">{description}</p>
          <p className="mt-4 text-sm public-light-subtle">Última atualização: {lastUpdated}</p>
        </section>

        <section className="mt-8 space-y-6">
          {sections.map((section) => (
            <article
              key={section.title}
              className="public-light-card p-6 sm:p-8"
            >
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

      <footer className="border-t border-[rgba(15,23,42,0.08)] bg-white/80 py-8 backdrop-blur">
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
