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
    <div className="theme-public-light min-h-screen bg-[#f7f8f3] text-slate-900">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(16,185,129,.10),transparent_30%),linear-gradient(180deg,#fbfcf8_0%,#f7f8f3_100%)]" />

      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-[#f7f8f3]/92 backdrop-blur-xl">
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
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-400 hover:text-slate-950"
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

      <main className="mx-auto w-full max-w-6xl px-4 pb-20 pt-10 sm:px-6 sm:pb-24 sm:pt-14">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_28px_90px_-54px_rgba(15,23,42,.18)] sm:p-8 md:p-10">
          <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
            {eyebrow}
          </span>
          <h1 className="mt-5 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">{title}</h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600 sm:text-lg">{description}</p>
          <p className="mt-4 text-sm text-slate-500">Última atualização: {lastUpdated}</p>
        </section>

        <section className="mt-8 space-y-6">
          {sections.map((section) => (
            <article
              key={section.title}
              className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
            >
              <h2 className="text-2xl font-black tracking-tight text-slate-950">{section.title}</h2>
              <div className="mt-4 space-y-4 text-sm leading-7 text-slate-600 sm:text-base">
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
                {section.bullets ? (
                  <ul className="space-y-2 pl-5 text-slate-700">
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

      <footer className="border-t border-slate-200/80 bg-white/80 py-8 backdrop-blur">
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
