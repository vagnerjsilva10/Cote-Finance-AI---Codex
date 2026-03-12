'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import * as React from 'react';
import { Loader2, ShieldAlert } from 'lucide-react';

import { fetchSuperadminJson } from '@/components/superadmin/fetch-superadmin-json';
import { SuperadminNavIcon } from '@/components/superadmin/superadmin-nav-icon';
import { formatPlatformRole } from '@/components/superadmin/superadmin-utils';
import type { SuperadminBootstrapResponse } from '@/lib/superadmin/types';

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
        <div className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-6">
          <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 px-5 py-4 text-slate-200">
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
        <div className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-6">
          <div className="w-full rounded-3xl border border-rose-500/20 bg-slate-900/80 p-8 text-center">
            <ShieldAlert className="mx-auto mb-4 h-10 w-10 text-rose-400" />
            <h1 className="text-2xl font-semibold text-white">Acesso negado</h1>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              {error || 'Você não tem permissão para acessar a área administrativa da plataforma.'}
            </p>
            <Link
              href="/app"
              className="mt-6 inline-flex rounded-full border border-slate-700 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:text-white"
            >
              Voltar para o app
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <aside className="hidden w-80 shrink-0 border-r border-slate-900/80 bg-slate-950/95 lg:flex lg:flex-col">
          <div className="border-b border-slate-900/80 px-6 py-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-300">Cote Finance AI</p>
                <h1 className="mt-2 text-2xl font-semibold text-white">Super Admin</h1>
                <p className="mt-2 text-sm leading-6 text-slate-400">Operação da plataforma, usuários, workspaces e crescimento.</p>
              </div>
            </div>
          </div>

          <div className="border-b border-slate-900/80 px-6 py-5">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Sessão ativa</p>
              <p className="mt-3 text-sm font-semibold text-white">{bootstrap.access.email}</p>
              <p className="mt-1 text-sm text-slate-400">{formatPlatformRole(bootstrap.access.role)}</p>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto px-4 py-5">
            <div className="space-y-2">
              {bootstrap.navigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`block rounded-2xl border px-4 py-3 transition ${
                      isActive
                        ? 'border-emerald-500/40 bg-emerald-500/10 text-white'
                        : 'border-slate-900 bg-slate-900/60 text-slate-300 hover:border-slate-700 hover:text-white'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 rounded-xl p-2 ${isActive ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-800 text-slate-400'}`}>
                        <SuperadminNavIcon name={item.icon} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{item.label}</span>
                          {!item.implemented && (
                            <span className="rounded-full border border-slate-700 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-slate-400">
                              Em breve
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm leading-6 text-slate-400">{item.description}</p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </nav>
        </aside>

        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <header className="border-b border-slate-900/80 bg-slate-950/90 px-5 py-4 backdrop-blur md:px-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Painel administrativo</p>
                <h2 className="mt-2 text-xl font-semibold text-white">
                  {bootstrap.navigation.find((item) => item.href === pathname)?.label || 'Super Admin'}
                </h2>
              </div>
              <Link
                href="/app"
                className="rounded-full border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:text-white"
              >
                Voltar ao produto
              </Link>
            </div>
          </header>

          <main className="min-w-0 flex-1 px-5 py-6 md:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
