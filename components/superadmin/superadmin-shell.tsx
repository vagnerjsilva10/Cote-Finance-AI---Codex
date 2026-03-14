'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import * as React from 'react';
import { ArrowUpRight, ChevronRight, Loader2, ShieldAlert, Sparkles } from 'lucide-react';

import { fetchSuperadminJson } from '@/components/superadmin/fetch-superadmin-json';
import { SuperadminNavIcon } from '@/components/superadmin/superadmin-nav-icon';
import { formatPlatformRole } from '@/components/superadmin/superadmin-utils';
import { cn } from '@/lib/utils';
import type { SuperadminBootstrapResponse } from '@/lib/superadmin/types';

function isNavigationItemActive(pathname: string, href: string) {
  if (href === '/superadmin') return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function splitNavigation(items: SuperadminBootstrapResponse['navigation']) {
  return {
    overview: items.filter((item) => ['/superadmin', '/superadmin/users', '/superadmin/workspaces', '/superadmin/subscriptions', '/superadmin/plans'].includes(item.href)),
    intelligence: items.filter((item) => ['/superadmin/ai', '/superadmin/whatsapp', '/superadmin/reports', '/superadmin/content'].includes(item.href)),
    system: items.filter((item) => ['/superadmin/feature-flags', '/superadmin/global-settings', '/superadmin/audit-logs'].includes(item.href)),
  };
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
        if (isMounted) setError(fetchError instanceof Error ? fetchError.message : 'Falha ao carregar o Super Admin.');
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
      <div className="min-h-screen bg-[#050b15] text-white">
        <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,.10),transparent_24%),radial-gradient(circle_at_top_right,rgba(56,189,248,.08),transparent_18%),linear-gradient(180deg,#030712_0%,#08101d_58%,#0a111d_100%)]" />
        <div className="relative mx-auto flex min-h-screen max-w-7xl items-center justify-center px-6">
          <div className="flex items-center gap-3 rounded-[1.9rem] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(10,17,30,.88),rgba(10,17,30,.72))] px-6 py-5 text-slate-200 shadow-[0_36px_120px_-70px_rgba(2,6,23,.95)] backdrop-blur-xl">
            <Loader2 className="h-5 w-5 animate-spin text-emerald-400" />
            Carregando painel Super Admin...
          </div>
        </div>
      </div>
    );
  }

  if (error || !bootstrap) {
    return (
      <div className="min-h-screen bg-[#050b15] text-white">
        <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top,rgba(244,63,94,.10),transparent_28%),linear-gradient(180deg,#030712_0%,#08101d_58%,#0a111d_100%)]" />
        <div className="relative mx-auto flex min-h-screen max-w-3xl items-center justify-center px-6">
          <div className="w-full rounded-[2.2rem] border border-rose-500/18 bg-[linear-gradient(180deg,rgba(10,17,30,.9),rgba(10,17,30,.78))] p-9 text-center shadow-[0_36px_120px_-70px_rgba(2,6,23,.98)] backdrop-blur-xl">
            <ShieldAlert className="mx-auto mb-4 h-10 w-10 text-rose-400" />
            <h1 className="text-2xl font-semibold tracking-[-0.03em] text-white">Acesso negado</h1>
            <p className="mt-3 text-sm leading-7 text-slate-300">{error || 'Você não tem permissão para acessar a área administrativa da plataforma.'}</p>
            <Link href="/app" className="mt-7 inline-flex rounded-full border border-white/[0.1] bg-white/[0.03] px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-white/[0.18] hover:bg-white/[0.05] hover:text-white">Voltar ao app</Link>
          </div>
        </div>
      </div>
    );
  }

  const currentItem = bootstrap.navigation.find((item) => isNavigationItemActive(pathname, item.href));
  const navigation = splitNavigation(bootstrap.navigation);
  const implementedCount = bootstrap.navigation.filter((item) => item.implemented).length;

  return (
    <div className="min-h-screen bg-[#050b15] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,.10),transparent_22%),radial-gradient(circle_at_top_right,rgba(56,189,248,.08),transparent_18%),linear-gradient(180deg,#030712_0%,#07101d_55%,#09111d_100%)]" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-[1760px]">
        <aside className="hidden w-[318px] shrink-0 border-r border-white/[0.05] bg-[linear-gradient(180deg,rgba(4,9,19,.94),rgba(6,12,24,.88))] px-4 py-5 backdrop-blur-xl xl:flex xl:flex-col">
          <div className="rounded-[2rem] border border-white/[0.07] bg-[linear-gradient(180deg,rgba(10,17,30,.86),rgba(10,17,30,.7))] px-5 py-5 shadow-[0_32px_90px_-60px_rgba(2,6,23,.95)]">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-400/10 bg-emerald-500/[0.08] text-emerald-100 shadow-[0_18px_40px_-24px_rgba(16,185,129,.55)]">
                <Sparkles className="h-4.5 w-4.5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Cote Finance AI</p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.26em] text-slate-500">Super Admin</p>
              </div>
            </div>
            <div className="mt-6 space-y-3">
              <div className="inline-flex rounded-full border border-emerald-400/14 bg-emerald-400/[0.07] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-emerald-200/90">Área executiva</div>
              <p className="text-[1.5rem] font-semibold leading-tight tracking-[-0.04em] text-white">Gestão, billing e operação em uma leitura mais nobre</p>
            </div>
          </div>

          <div className="mt-5 rounded-[1.7rem] border border-white/[0.07] bg-white/[0.025] px-4 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-slate-500">Sessão atual</p>
            <p className="mt-3 truncate text-sm font-semibold text-white">{bootstrap.access.email || 'Sem e-mail'}</p>
            <p className="mt-1 text-sm text-slate-400">{formatPlatformRole(bootstrap.access.platformRole)}</p>
          </div>

          <nav className="mt-6 flex-1 overflow-y-auto pr-1">
            <NavigationGroup title="Overview" items={navigation.overview} pathname={pathname} />
            <NavigationGroup title="Intelligence" items={navigation.intelligence} pathname={pathname} className="mt-6" />
            <NavigationGroup title="System" items={navigation.system} pathname={pathname} className="mt-6" />
          </nav>

          <div className="mt-6 rounded-[1.7rem] border border-white/[0.07] bg-[linear-gradient(180deg,rgba(255,255,255,.03),rgba(255,255,255,.015))] px-4 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-slate-500">Cobertura</p>
            <p className="mt-3 text-sm font-semibold text-white">{implementedCount} módulos operacionais</p>
            <Link href="/app" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-200 transition hover:text-white">Voltar ao produto<ArrowUpRight className="h-4 w-4" /></Link>
          </div>
        </aside>

        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-white/[0.05] bg-[#07101de0] px-5 py-4 backdrop-blur-xl md:px-8 xl:px-10">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <div className="inline-flex rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.26em] text-slate-300">Super Admin</div>
                    <div className="inline-flex rounded-full border border-emerald-400/14 bg-emerald-400/[0.07] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.26em] text-emerald-200/90">{formatPlatformRole(bootstrap.access.platformRole)}</div>
                  </div>
                  <h2 className="mt-4 text-[2.05rem] font-semibold tracking-[-0.05em] text-white md:text-[2.35rem]">{currentItem?.label || 'Super Admin'}</h2>
                  <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-400">{currentItem?.description}</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Link href="/app" className="inline-flex items-center rounded-full border border-white/[0.1] bg-white/[0.03] px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-white/[0.18] hover:bg-white/[0.05] hover:text-white">Voltar ao produto</Link>
                </div>
              </div>

              <div className="-mx-1 flex gap-2 overflow-x-auto px-1 xl:hidden">
                {bootstrap.navigation.map((item) => {
                  const isActive = isNavigationItemActive(pathname, item.href);
                  return (
                    <Link key={item.href} href={item.href} className={cn('shrink-0 rounded-full border px-3 py-2 text-xs font-semibold transition', isActive ? 'border-emerald-400/18 bg-emerald-400/[0.08] text-emerald-100' : 'border-white/[0.08] bg-white/[0.03] text-slate-300')}>
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          </header>

          <main className="min-w-0 flex-1 px-5 py-6 md:px-8 md:py-8 xl:px-10 xl:py-10">
            <div className="mx-auto w-full max-w-[1320px]">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}

function NavigationGroup({ title, items, pathname, className }: { title: string; items: SuperadminBootstrapResponse['navigation']; pathname: string; className?: string; }) {
  if (!items.length) return null;
  return (
    <div className={cn(className)}>
      <p className="mb-3 px-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-500">{title}</p>
      <div className="space-y-1.5">
        {items.map((item) => {
          const isActive = isNavigationItemActive(pathname, item.href);
          return (
            <Link key={item.href} href={item.href} className={cn('group block rounded-[1.45rem] border px-3.5 py-3 transition duration-200', isActive ? 'border-emerald-400/16 bg-[linear-gradient(180deg,rgba(16,185,129,.12),rgba(16,185,129,.05))] shadow-[0_22px_50px_-34px_rgba(16,185,129,.35)]' : 'border-transparent bg-transparent hover:border-white/[0.06] hover:bg-white/[0.03]')}>
              <div className="flex items-start gap-3">
                <div className={cn('mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border transition', isActive ? 'border-emerald-400/10 bg-emerald-400/[0.08] text-emerald-100' : 'border-white/[0.07] bg-white/[0.025] text-slate-400')}>
                  <SuperadminNavIcon name={item.icon} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={cn('text-sm font-semibold tracking-[-0.01em]', isActive ? 'text-white' : 'text-slate-200')}>{item.label}</span>
                    <span className={cn('rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.2em]', item.implemented ? 'border-emerald-400/12 bg-emerald-400/[0.07] text-emerald-200/90' : 'border-white/[0.08] bg-white/[0.03] text-slate-500')}>
                      {item.implemented ? 'Ativo' : 'Em breve'}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[12px] leading-5 text-slate-500">{item.description}</p>
                </div>
                {isActive ? <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-emerald-200" /> : null}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
