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
};

export function LegalPage({ eyebrow, title, description, lastUpdated, sections }: LegalPageProps) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_10%_10%,rgba(16,185,129,.18),transparent_32%),radial-gradient(circle_at_90%_8%,rgba(59,130,246,.16),transparent_28%),linear-gradient(180deg,#020617_0%,#020617_52%,#0b1120_100%)]" />

      <header className="border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/brand/cote-finance-ai-logo.svg"
              alt="Cote Finance AI - By Cote Juros"
              width={420}
              height={112}
              priority
              className="h-12 w-auto"
            />
          </Link>

          <div className="flex items-center gap-3 text-sm">
            <Link href="/" className="text-slate-300 transition-colors hover:text-white">
              Landing
            </Link>
            <Link
              href="/app"
              className="rounded-xl border border-slate-700 px-4 py-2 font-semibold text-slate-200 transition-colors hover:border-slate-500"
            >
              Entrar no app
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 pb-20 pt-10 sm:px-6 sm:pb-24 sm:pt-14">
        <section className="rounded-[2rem] border border-white/10 bg-slate-900/55 p-6 shadow-[0_28px_90px_-46px_rgba(16,185,129,.34)] sm:p-8 md:p-10">
          <span className="inline-flex items-center rounded-full border border-emerald-300/25 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200">
            {eyebrow}
          </span>
          <h1 className="mt-5 text-4xl font-bold text-white sm:text-5xl">{title}</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300 sm:text-lg">{description}</p>
          <p className="mt-4 text-sm text-slate-500">{'\u00daltima atualiza\u00e7\u00e3o:'} {lastUpdated}</p>
        </section>

        <section className="mt-8 space-y-6">
          {sections.map((section) => (
            <article
              key={section.title}
              className="rounded-[1.75rem] border border-white/10 bg-slate-900/45 p-6 sm:p-8"
            >
              <h2 className="text-2xl font-semibold text-white">{section.title}</h2>
              <div className="mt-4 space-y-4 text-sm leading-7 text-slate-300 sm:text-base">
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
                {section.bullets ? (
                  <ul className="space-y-2 pl-5 text-slate-200">
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
    </div>
  );
}
