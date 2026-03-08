import Image from 'next/image';
import Link from 'next/link';

export function BlogHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/brand/cote-finance-ai-logo.svg"
            alt="Cote Finance AI - By Cote Juros"
            width={460}
            height={122}
            priority
            className="h-12 w-auto"
          />
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-slate-300 md:flex">
          <Link href="/" className="transition-colors hover:text-white">
            Landing
          </Link>
          <Link href="/blog" className="transition-colors hover:text-white">
            Blog
          </Link>
          <Link href="/termos-de-uso" className="transition-colors hover:text-white">
            Termos
          </Link>
          <Link href="/politica-de-privacidade" className="transition-colors hover:text-white">
            Privacidade
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/app"
            className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition-colors hover:border-slate-500"
          >
            Entrar
          </Link>
          <Link
            href="/app?auth=signup"
            className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-emerald-600"
          >
            Começar grátis
          </Link>
        </div>
      </div>
    </header>
  );
}
