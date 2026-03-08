import Image from 'next/image';
import Link from 'next/link';

export function BlogHeader() {
  return (
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
            src="/brand/cote-favicon.svg"
            alt="Cote Finance AI"
            width={64}
            height={64}
            priority
            className="h-14 w-14 sm:hidden"
          />
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-slate-600 md:flex">
          <Link href="/" className="transition-colors hover:text-slate-950">
            Início
          </Link>
          <Link href="/blog" className="font-semibold text-slate-950 transition-colors hover:text-emerald-700">
            Blog
          </Link>
          <Link href="/central-de-ajuda" className="transition-colors hover:text-slate-950">
            Ajuda
          </Link>
          <Link href="/termos-de-uso" className="transition-colors hover:text-slate-950">
            Termos
          </Link>
          <Link href="/politica-de-privacidade" className="transition-colors hover:text-slate-950">
            Privacidade
          </Link>
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
    </header>
  );
}
