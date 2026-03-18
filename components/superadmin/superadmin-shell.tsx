'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowUpRight, ChevronLeft, ChevronRight, Loader2, LogOut, Menu, ShieldAlert, X } from 'lucide-react';

import { fetchSuperadminJson } from '@/components/superadmin/fetch-superadmin-json';
import { SuperadminNavIcon } from '@/components/superadmin/superadmin-nav-icon';
import { cn } from '@/lib/utils';
import type { SuperadminBootstrapResponse } from '@/lib/superadmin/types';

function isNavigationItemActive(pathname: string, href: string) {
  if (href === '/superadmin') return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

const SidebarItem = ({
  iconName,
  label,
  active = false,
  href,
  collapsed = false,
}: {
  iconName: string;
  label: string;
  active?: boolean;
  href: string;
  collapsed?: boolean;
}) => (
  <Link
    href={href}
    title={collapsed ? label : undefined}
    className={cn(
      'sidebar-item-premium group flex w-full items-center gap-3 px-3 py-2.5 text-left',
      collapsed && 'justify-center px-2',
      active && 'sidebar-item-premium-active font-medium'
    )}
  >
    <SuperadminNavIcon name={iconName} className={cn('h-5 w-5 transition-colors', active ? 'text-[var(--primary)]' : 'text-[var(--text-muted)] group-hover:text-[var(--text-primary)]')} />
    {!collapsed && <span className="text-sm">{label}</span>}
  </Link>
);

export function SuperadminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [bootstrap, setBootstrap] = React.useState<SuperadminBootstrapResponse | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);
  const brandLogo = '/brand/cote-finance-ai-logo.svg';
  const sidebarCollapsedLogo = '/brand/cote-favicon.svg';

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
      <div className="theme-app-shell min-h-screen text-[var(--text-primary)]">
        <div className="flex min-h-screen items-center justify-center">
          <div className="card-premium flex items-center gap-3 rounded-2xl px-5 py-4 text-[var(--text-secondary)]">
            <Loader2 className="h-5 w-5 animate-spin text-[var(--primary)]" />
            Carregando painel Super Admin...
          </div>
        </div>
      </div>
    );
  }

  if (error || !bootstrap) {
    return (
      <div className="theme-app-shell min-h-screen text-[var(--text-primary)]">
        <div className="flex min-h-screen items-center justify-center px-6">
          <div className="card-premium w-full max-w-2xl rounded-[2rem] border border-[var(--border-strong)] p-8 text-center">
            <ShieldAlert className="mx-auto h-10 w-10 text-[var(--danger)]" />
            <h1 className="page-title-premium mt-4 text-2xl">Acesso negado</h1>
            <p className="text-secondary-premium mt-3">{error || 'Você não tem permissão para acessar a área administrativa da plataforma.'}</p>
            <Link href="/app" className="button-secondary mt-6 px-4 py-2 text-sm font-semibold">
              Voltar ao app
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const currentItem = bootstrap.navigation.find((item) => isNavigationItemActive(pathname, item.href));

  return (
    <div className="theme-app-shell min-h-screen text-[var(--text-primary)] lg:flex">
      {isSidebarOpen ? <button type="button" onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 z-[90] bg-[var(--overlay-strong)] backdrop-blur-sm lg:hidden" /> : null}

      <aside
        className={cn(
          'sidebar-premium fixed inset-y-0 left-0 z-[100] flex h-full max-w-[88vw] flex-shrink-0 flex-col backdrop-blur-xl transition-all duration-300 lg:sticky lg:top-0 lg:max-w-none lg:translate-x-0',
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full',
          isSidebarCollapsed ? 'w-[18rem] lg:w-24' : 'w-[18rem] lg:w-64'
        )}
      >
        <div className={cn('flex items-center justify-between gap-3', isSidebarCollapsed ? 'p-4' : 'p-6')}>
          <Image src={isSidebarCollapsed ? sidebarCollapsedLogo : brandLogo} alt="Cote Finance AI - By Cote Juros" width={isSidebarCollapsed ? 48 : 420} height={isSidebarCollapsed ? 48 : 112} className={cn('h-auto transition-all duration-300', isSidebarCollapsed ? 'w-11' : 'w-full max-w-[280px]')} />
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setIsSidebarCollapsed((current) => !current)} className="button-secondary hidden h-10 w-10 p-0 lg:inline-flex" title={isSidebarCollapsed ? 'Expandir menu' : 'Recolher menu'}>
              {isSidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </button>
            <button onClick={() => setIsSidebarOpen(false)} className="text-[var(--text-muted)] transition hover:text-[var(--text-primary)] lg:hidden">
              <X size={20} />
            </button>
          </div>
        </div>

        <nav className={cn('custom-scrollbar flex-1 space-y-1 overflow-y-auto py-4', isSidebarCollapsed ? 'px-2' : 'px-4')}>
          {bootstrap.navigation.map((item) => (
            <SidebarItem key={item.href} iconName={item.icon} label={item.label} href={item.href} active={isNavigationItemActive(pathname, item.href)} collapsed={isSidebarCollapsed} />
          ))}
        </nav>

        <div className="p-4">
          {isSidebarCollapsed ? (
            <div className="space-y-3">
              <div className="card-premium rounded-2xl px-2 py-3 text-center">
                <p className="label-premium text-[var(--primary)]">Super Admin</p>
              </div>
              <Link href="/app" className="button-primary flex h-12 w-full px-0" title="Voltar ao produto">
                <ArrowUpRight size={18} />
              </Link>
              <Link href="/app" className="button-secondary flex h-12 w-full px-0" title="Sair">
                <LogOut size={18} />
              </Link>
            </div>
          ) : (
            <>
              <div className="card-premium rounded-2xl p-4">
                <p className="label-premium text-[var(--primary)]">Área administrativa</p>
                <p className="text-secondary-premium mb-4 mt-3 text-sm">Gerencie usuários, workspaces, billing, IA e governança sem sair do mesmo produto.</p>
                <Link href="/app" className="button-primary w-full py-2.5 text-xs font-semibold">
                  Voltar ao produto <ArrowUpRight size={14} />
                </Link>
              </div>
              <p className="mt-4 text-center text-xs text-[var(--text-muted)]">{currentItem?.label || 'Super Admin'}</p>
            </>
          )}
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="header-premium sticky top-0 z-30 px-3 py-3 sm:px-4 lg:px-8">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <button onClick={() => setIsSidebarOpen(true)} className="button-secondary p-2 lg:hidden">
                <Menu size={20} />
              </button>
              <div>
                <h2 className="max-w-[44vw] truncate text-lg font-semibold tracking-[var(--tracking-tight)] text-[var(--text-primary)] sm:max-w-[18rem] lg:max-w-none lg:text-xl">{currentItem?.label || 'Super Admin'}</h2>
                <p className="hidden text-xs text-[var(--text-muted)] md:block">{currentItem?.description}</p>
              </div>
            </div>
            <div className="flex flex-shrink-0 items-center gap-2 lg:gap-4">
              <Link href="/app" className="button-primary hidden px-3 py-2 text-xs font-semibold md:inline-flex">
                <ArrowUpRight size={14} /> Voltar ao produto
              </Link>
            </div>
          </div>
        </header>

        <div className="custom-scrollbar flex-1 overflow-y-auto px-3 py-4 sm:px-4 lg:px-8 lg:py-6">{children}</div>
      </main>
    </div>
  );
}
