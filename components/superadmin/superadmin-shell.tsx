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
    overview: items.filter((item) =>
      ['/superadmin', '/superadmin/users', '/superadmin/workspaces', '/superadmin/subscriptions', '/superadmin/plans'].includes(item.href)
    ),
    intelligence: items.filter((item) =>
      ['/superadmin/ai', '/superadmin/whatsapp', '/superadmin/reports', '/superadmin/content'].includes(item.href)
    ),
    system: items.filter((item) =>
      ['/superadmin/feature-flags', '/superadmin/global-settings', '/superadmin/audit-logs'].includes(item.href)
    ),
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
      <div className="min-h-screen bg-[#060c18] text-white">
        <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,.10),transparent_24%),radial-gradient(circle_at_top_right,rgba(14,165,233,.09),transparent_22%),linear-gradient(180deg,#020617_0%,#07101e_58%,#08111f_100%)]" />
        <div className="relative mx-auto flex min-h-screen max-w-7xl items-center justify-center px-6">
          <div className="flex items-center gap-3 rounded-[1.8rem] border border-white/10 bg-slate-900/78 px-6 py-5 text-slate-200 shadow-[0_30px_110px_-60px_rgba(2,6,23,.98)] backdrop-blur-xl">
            <Loader2 className="h-5 w-5 animate-spin text-emerald-400" />
            Carregando painel Super Admin...
          </div>
        </div>
      </div>
    );
  }

  if (error || !bootstrap) {
    return (
      <div className="min-h-screen bg-[#060c18] text-white">
        <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top,rgba(244,63,94,.10),transparent_28%),linear-gradient(180deg,#020617_0%,#07101e_58%,#08111f_100%)]" />
        <div className="relative mx-auto flex min-h-screen max-w-3xl items-center justify-center px-6">
          <div className="w-full rounded-[2rem] border border-rose-500/20 bg-slate-900/84 p-8 text-center shadow-[0_30px_110px_-60px_rgba(2,6,23,.98)] backdrop-blur-xl">
            <ShieldAlert className="mx-auto mb-4 h-10 w-10 text-rose-400" />
            <h1 className="text-2xl font-semibold tracking-[-0.02em] text-white">Acesso negado</h1>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              {error || 'Você não tem permissão para acessar a área administrativa da plataforma.'}
            </p>
            <Link
              href="/app"
              className="mt-6 inline-flex rounded-full border border-white/10 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-white/20 hover:text-white"
            >
              Voltar ao app
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const currentItem = bootstrap.navigation.find((item) => isNavigationItemActive(pathname, item.href));
  const implementedCount = bootstrap.navigation.filter((item) => item.implemented).length;
  const navigation = splitNavigation(bootstrap.navigation);

  return (
    <div className="min-h-screen bg-[#060c18] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,.11),transparent_24%),radial-gradient(circle_at_top_right,rgba(14,165,233,.08),transparent_18%),linear-gradient(180deg,#020617_0%,#07101d_55%,#09111f_100%)]" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-[1760px]">
        <aside className="hidden w-[338px] shrink-0 border-r border-white/6 bg-[linear-gradient(180deg,rgba(2,6,23,.92),rgba(3,10,24,.86))] px-5 py-6 backdrop-blur-xl xl:flex xl:flex-col">
          <div className="rounded-[2rem] border border-white/8 bg-[linear-gradient(180deg,rgba(15,23,42,.78),rgba(15,23,42,.52))] p-6 shadow-[0_26px_80px_-52px_rgba(2,6,23,.95)]">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(180deg,rgba(16,185,129,.28),rgba(5,150,105,.2))] text-emerald-100 shadow-[0_18px_36px_-22px_rgba(16,185,129,.7)]">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Cote Finance AI</p>
                <p className="mt-1 text-[11px] uppercase tracking-[0.22em] text-slate-500">Painel administrativo</p>
              </div>
            </div>
            <div className="mt-6">
              <div className="inline-flex rounded-full border border-emerald-400/18 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-200">
                Super Admin
              </div>
              <h1 className="mt-4 text-[1.9rem] font-semibold tracking-[-0.03em] text-white">Operação da plataforma</h1>
              <p className="mt-3 text-sm leading-7 text-slate-400">
                Crescimento, billing, IA, canais e governança em uma estrutura mais clara, escaneável e premium.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3">
            <ContextCard
              label="Sessão ativa"
              title={bootstrap.access.email || 'Sem e-mail'}
              description={`${formatPlatformRole(bootstrap.access.platformRole)} • ${
                bootstrap.access.roleSource === 'override'
                  ? 'override manual'
                  : bootstrap.access.roleSource === 'env'
                    ? 'controlado por env'
                    : 'papel padrão'
              }`}
            />
            <ContextCard
              label="Cobertura atual"
              title={`${implementedCount} módulos`}
              description="Já operacionais e prontos para gestão diária"
            />
          </div>

          <nav className="mt-6 flex-1 overflow-y-auto pr-1">
            <NavigationGroup title="Overview" items={navigation.overview} pathname={pathname} />
            <NavigationGroup title="Intelligence" items={navigation.intelligence} pathname={pathname} className="mt-7" />
            <NavigationGroup title="System" items={navigation.system} pathname={pathname} className="mt-7" />
          </nav>

          <div className="mt-6 rounded-[1.6rem] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,.03),rgba(255,255,255,.02))] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Acesso rápido</p>
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
          <header className="sticky top-0 z-20 border-b border-white/6 bg-[#07101dcc] px-5 py-4 backdrop-blur-xl md:px-8">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300">
                      Super Admin
                    </div>
                    <div className="inline-flex rounded-full border border-emerald-400/18 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-200">
                      {formatPlatformRole(bootstrap.access.platformRole)}
                    </div>
                  </div>
                  <h2 className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-white md:text-[2rem]">
                    {currentItem?.label || 'Super Admin'}
                  </h2>
                  <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-400">{currentItem?.description}</p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Link
                    href="/app"
                    className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-white/18 hover:bg-white/[0.05] hover:text-white"
                  >
                    Voltar ao produto
                  </Link>
                </div>
              </div>

              <div className="-mx-1 flex gap-2 overflow-x-auto px-1 xl:hidden">
                {bootstrap.navigation.map((item) => {
                  const isActive = isNavigationItemActive(pathname, item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'shrink-0 rounded-full border px-3 py-2 text-xs font-semibold transition',
                        isActive
                          ? 'border-emerald-400/22 bg-emerald-500/10 text-emerald-100'
                          : 'border-white/10 bg-white/[0.03] text-slate-300'
                      )}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          </header>

          <main className="min-w-0 flex-1 px-5 py-6 md:px-8 md:py-8">
            <div className="mx-auto w-full max-w-[1320px]">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}

function NavigationGroup({
  title,
  items,
  pathname,
  className,
}: {
  title: string;
  items: SuperadminBootstrapResponse['navigation'];
  pathname: string;
  className?: string;
}) {
  if (!items.length) return null;

  return (
    <div className={cn(className)}>
      <p className="mb-3 px-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">{title}</p>
      <div className="space-y-2.5">
        {items.map((item) => {
          const isActive = isNavigationItemActive(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group block rounded-[1.5rem] border px-4 py-4 transition duration-200',
                isActive
                  ? 'border-emerald-400/18 bg-[linear-gradient(180deg,rgba(16,185,129,.12),rgba(16,185,129,.06))] shadow-[0_18px_50px_-34px_rgba(16,185,129,.55)]'
                  : 'border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,.03),rgba(255,255,255,.018))] hover:border-white/12 hover:bg-[linear-gradient(180deg,rgba(255,255,255,.05),rgba(255,255,255,.02))]'
              )}
            >
              <div className="flex items-start gap-3.5">
                <div
                  className={cn(
                    'mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border transition',
                    isActive
                      ? 'border-emerald-400/12 bg-emerald-500/10 text-emerald-200'
                      : 'border-white/8 bg-slate-900/90 text-slate-400 group-hover:text-slate-200'
                  )}
                >
                  <SuperadminNavIcon name={item.icon} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={cn('text-sm font-semibold', isActive ? 'text-white' : 'text-slate-200')}>
                      {item.label}
                    </span>
                    <span
                      className={cn(
                        'rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]',
                        item.implemented
                          ? 'border-emerald-400/16 bg-emerald-500/10 text-emerald-200'
                          : 'border-white/10 bg-white/[0.04] text-slate-400'
                      )}
                    >
                      {item.implemented ? 'Ativo' : 'Em breve'}
                    </span>
                  </div>
                  <p className="mt-2 text-[13px] leading-6 text-slate-400">{item.description}</p>
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

function ContextCard({
  label,
  title,
  description,
}: {
  label: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[1.45rem] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,.035),rgba(255,255,255,.015))] px-4 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</p>
      <p className="mt-3 text-sm font-semibold text-white">{title}</p>
      <p className="mt-1 text-sm text-slate-400">{description}</p>
    </div>
  );
}
