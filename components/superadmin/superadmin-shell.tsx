'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import * as React from 'react';
import { ArrowUpRight, Loader2, ShieldAlert, Sparkles } from 'lucide-react';

import { fetchSuperadminJson } from '@/components/superadmin/fetch-superadmin-json';
import { SuperadminNavIcon } from '@/components/superadmin/superadmin-nav-icon';
import { formatPlatformRole } from '@/components/superadmin/superadmin-utils';
import { cn } from '@/lib/utils';
import type { SuperadminBootstrapResponse } from '@/lib/superadmin/types';

function isNavigationItemActive(pathname: string, href: string) {
  if (href === '/superadmin') return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SuperadminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [bootstrap, setBootstrap] = React.useState<SuperadminBootstrapResponse | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    let isMounted = true;

    const run = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await fetchSuperadminJson<SuperadminBootstrapResponse>('/api/superadmin/bootstrap');
        if (isMounted) setBootstrap(data);
      } catch (fetchError) {
        if (isMounted) {
          setError(fetchError instanceof Error ? fetchError.message : 'Falha ao carregar o Super Admin.');
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    void run();
    return () => {
      isMounted = false;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white">
        <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,.10),transparent_26%),radial-gradient(circle_at_top_right,rgba(59,130,246,.10),transparent_24%),linear-gradient(180deg,#020617_0%,#020617_44%,#0b1120_100%)]" />
        <div className="relative mx-auto flex min-h-screen max-w-7xl items-center justify-center px-6">
          <div className="flex items-center gap-3 rounded-3xl border border-white/10 bg-slate-900/75 px-6 py-5 text-slate-200 shadow-[0_30px_100px_-60px_rgba(15,23,42,.95)] backdrop-blur-xl">
            <Loader2 className="h-5 w-5 animate-spin text-emerald-400" />
            Carregando painel Super Admin...
          </div>
        </div>
      </div>
    );
  }

  if (error || !bootstrap) {
    return (
      <div className="min-h-screen bg-slate-950 text-white">
        <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top,rgba(244,63,94,.10),transparent_28%),linear-gradient(180deg,#020617_0%,#020617_44%,#0b1120_100%)]" />
        <div className="relative mx-auto flex min-h-screen max-w-3xl items-center justify-center px-6">
          <div className="w-full rounded-[2rem] border border-rose-500/20 bg-slate-900/80 p-8 text-center shadow-[0_30px_100px_-60px_rgba(15,23,42,.95)] backdrop-blur-xl">
            <ShieldAlert className="mx-auto mb-4 h-10 w-10 text-rose-400" />
            <h1 className="text-2xl font-semibold text-white">Acesso negado</h1>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              {error || 'Você não tem permissão para acessar a área administrativa da plataforma.'}
            </p>
            <Link
              href="/app"
              className="mt-6 inline-flex rounded-full border border-white/10 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-white/20 hover:text-white"
            >
              Voltar para o app
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const currentItem = bootstrap.navigation.find((item) => isNavigationItemActive(pathname, item.href));
  const implementedCount = bootstrap.navigation.filter((item) => item.implemented).length;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,.10),transparent_26%),radial-gradient(circle_at_top_right,rgba(59,130,246,.10),transparent_24%),linear-gradient(180deg,#020617_0%,#020617_44%,#0b1120_100%)]" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-[1680px]">
        <aside className="hidden w-[320px] shrink-0 border-r border-white/10 bg-slate-950/70 p-5 backdrop-blur-xl lg:flex lg:flex-col">
          <div className="rounded-[1.8rem] border border-white/10 bg-slate-900/78 p-5 shadow-[0_24px_90px_-60px_rgba(15,23,42,.95)]">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-200">
              <Sparkles className="h-3.5 w-3.5" />
              Cote Finance AI
            </div>
            <h1 className="mt-4 text-2xl font-semibold tracking-tight text-white">Super Admin</h1>
            <p className="mt-3 text-sm leading-7 text-slate-400">
              Operação, crescimento, billing e governança da plataforma em um painel mais claro e amigável.
            </p>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Sessão ativa</p>
              <p className="mt-3 text-sm font-semibold text-white">{bootstrap.access.email}</p>
              <p className="mt-1 text-sm text-slate-400">{formatPlatformRole(bootstrap.access.platformRole)}</p>
            </div>
            <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Cobertura atual</p>
              <p className="mt-3 text-2xl font-semibold text-white">{implementedCount}</p>
              <p className="mt-1 text-sm text-slate-400">módulos já operacionais no painel</p>
            </div>
          </div>

          <nav className="mt-5 flex-1 overflow-y-auto pr-1">
            <div className="space-y-2">
              {bootstrap.navigation.map((item) => {
                const isActive = isNavigationItemActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'block rounded-[1.5rem] border p-4 transition',
                      isActive
                        ? 'border-emerald-400/25 bg-emerald-500/10 text-white shadow-[0_18px_50px_-35px_rgba(16,185,129,.55)]'
                        : 'border-white/10 bg-slate-900/60 text-slate-300 hover:border-white/20 hover:bg-slate-900/90 hover:text-white'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          'mt-0.5 rounded-2xl p-2.5',
                          isActive ? 'bg-emerald-500/15 text-emerald-200' : 'bg-slate-800/90 text-slate-400'
                        )}
                      >
                        <SuperadminNavIcon name={item.icon} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold">{item.label}</span>
                          <span
                            className={cn(
                              'rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em]',
                              item.implemented
                                ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-200'
                                : 'border-white/10 bg-white/5 text-slate-400'
                            )}
                          >
                            {item.implemented ? 'Ativo' : 'Em breve'}
                          </span>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-slate-400">{item.description}</p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </nav>

          <div className="mt-5 rounded-[1.5rem] border border-white/10 bg-slate-900/68 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Navegação rápida</p>
            <Link
              href="/app"
              className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-slate-200 transition hover:text-white"
            >
              Voltar ao produto
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </aside>

        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/72 px-5 py-4 backdrop-blur-xl md:px-8">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Painel administrativo</p>
                  <h2 className="mt-2 text-xl font-semibold tracking-tight text-white md:text-2xl">
                    {currentItem?.label || 'Super Admin'}
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">{currentItem?.description}</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <div className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                    {formatPlatformRole(bootstrap.access.platformRole)}
                  </div>
                  <Link
                    href="/app"
                    className="inline-flex rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-white/20 hover:text-white"
                  >
                    Voltar ao produto
                  </Link>
                </div>
              </div>

              <div className="-mx-1 flex gap-2 overflow-x-auto px-1 lg:hidden">
                {bootstrap.navigation.map((item) => {
                  const isActive = isNavigationItemActive(pathname, item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'shrink-0 rounded-full border px-3 py-2 text-xs font-semibold transition',
                        isActive
                          ? 'border-emerald-400/25 bg-emerald-500/10 text-emerald-100'
                          : 'border-white/10 bg-white/5 text-slate-300'
                      )}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          </header>

          <main className="min-w-0 flex-1 px-5 py-6 md:px-8">
            <div className="mx-auto w-full max-w-[1240px]">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
