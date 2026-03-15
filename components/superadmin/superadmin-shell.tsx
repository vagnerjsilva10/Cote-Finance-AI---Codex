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

type LucideIconProps = { size?: number; className?: string };

const SidebarItem = ({ iconName, label, active = false, href, collapsed = false }: { iconName: string; label: string; active?: boolean; href: string; collapsed?: boolean; }) => (
  <Link
    href={href}
    title={collapsed ? label : undefined}
    className={cn(
      'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-all duration-200 group',
      collapsed && 'justify-center px-2',
      active ? 'bg-emerald-500/10 text-emerald-500 font-medium' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
    )}
  >
    <SuperadminNavIcon name={iconName} className={cn('h-5 w-5', active ? 'text-emerald-500' : 'text-slate-500 group-hover:text-slate-300')} />
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
    return <div className="min-h-screen bg-slate-950 text-white"><div className="flex min-h-screen items-center justify-center"><div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/80 px-5 py-4 text-slate-200"><Loader2 className="h-5 w-5 animate-spin text-emerald-400" />Carregando painel Super Admin...</div></div></div>;
  }

  if (error || !bootstrap) {
    return <div className="min-h-screen bg-slate-950 text-white"><div className="flex min-h-screen items-center justify-center px-6"><div className="w-full max-w-2xl rounded-3xl border border-rose-500/20 bg-slate-900/80 p-8 text-center"><ShieldAlert className="mx-auto h-10 w-10 text-rose-400" /><h1 className="mt-4 text-2xl font-bold text-white">Acesso negado</h1><p className="mt-3 text-sm leading-7 text-slate-300">{error || 'Você não tem permissão para acessar a área administrativa da plataforma.'}</p><Link href="/app" className="mt-6 inline-flex rounded-xl border border-slate-800 bg-slate-900 px-4 py-2 text-sm font-bold text-slate-200 transition-all hover:border-emerald-500 hover:text-white">Voltar ao app</Link></div></div></div>;
  }

  const currentItem = bootstrap.navigation.find((item) => isNavigationItemActive(pathname, item.href));

  return (
    <div className="min-h-screen bg-slate-950 text-white lg:flex">
      {isSidebarOpen ? <button type="button" onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 z-[90] bg-slate-950/80 backdrop-blur-sm lg:hidden" /> : null}

      <aside className={cn('fixed inset-y-0 left-0 z-[100] flex h-full max-w-[88vw] flex-shrink-0 flex-col border-r border-slate-900 bg-slate-950/96 backdrop-blur-xl transition-all duration-300 lg:sticky lg:top-0 lg:max-w-none lg:translate-x-0', isSidebarOpen ? 'translate-x-0' : '-translate-x-full', isSidebarCollapsed ? 'w-[18rem] lg:w-24' : 'w-[18rem] lg:w-64')}>
        <div className={cn('flex items-center justify-between gap-3', isSidebarCollapsed ? 'p-4' : 'p-6')}>
          <Image src={isSidebarCollapsed ? sidebarCollapsedLogo : brandLogo} alt="Cote Finance AI - By Cote Juros" width={isSidebarCollapsed ? 48 : 420} height={isSidebarCollapsed ? 48 : 112} className={cn('h-auto transition-all duration-300', isSidebarCollapsed ? 'w-11' : 'w-full max-w-[280px]')} />
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setIsSidebarCollapsed((current) => !current)} className="hidden h-10 w-10 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-slate-300 transition hover:border-slate-700 hover:text-white lg:inline-flex" title={isSidebarCollapsed ? 'Expandir menu' : 'Recolher menu'}>
              {isSidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </button>
            <button onClick={() => setIsSidebarOpen(false)} className="text-slate-500 hover:text-white lg:hidden"><X size={20} /></button>
          </div>
        </div>

        <nav className={cn('custom-scrollbar flex-1 overflow-y-auto py-4 space-y-1', isSidebarCollapsed ? 'px-2' : 'px-4')}>
          {bootstrap.navigation.map((item) => (
            <SidebarItem key={item.href} iconName={item.icon} label={item.label} href={item.href} active={isNavigationItemActive(pathname, item.href)} collapsed={isSidebarCollapsed} />
          ))}
        </nav>

        <div className="p-4">
          {isSidebarCollapsed ? (
            <div className="space-y-3">
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-2 py-3 text-center"><p className="text-[10px] font-black uppercase tracking-widest text-emerald-500">SUPER ADMIN</p></div>
              <Link href="/app" className="flex h-12 w-full items-center justify-center rounded-xl bg-emerald-500 text-white transition-all duration-200 hover:bg-emerald-600" title="Voltar ao produto"><ArrowUpRight size={18} /></Link>
              <Link href="/app" className="flex h-12 w-full items-center justify-center rounded-xl bg-slate-800 text-white transition-all duration-200 hover:bg-slate-700" title="Sair"><LogOut size={18} /></Link>
            </div>
          ) : (
            <>
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-emerald-500">Área administrativa</p>
                <p className="mb-4 text-xs leading-relaxed text-slate-400">Gerencie usuários, workspaces, billing, IA e governança sem sair do mesmo produto.</p>
                <Link href="/app" className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-2.5 text-xs font-bold text-white transition-all hover:bg-emerald-600">Voltar ao produto <ArrowUpRight size={14} /></Link>
              </div>
              <p className="mt-4 text-center text-xs text-slate-500">{currentItem?.label || 'Super Admin'}</p>
            </>
          )}
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="sticky top-0 z-30 border-b border-slate-900 bg-slate-950/80 px-3 py-3 backdrop-blur-xl sm:px-4 lg:px-8">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <button onClick={() => setIsSidebarOpen(true)} className="rounded-xl border border-slate-800 bg-slate-900 p-2 text-slate-400 hover:text-white lg:hidden"><Menu size={20} /></button>
              <div>
                <h2 className="max-w-[44vw] truncate text-base font-bold text-white sm:max-w-[18rem] lg:max-w-none lg:text-xl">{currentItem?.label || 'Super Admin'}</h2>
                <p className="hidden text-xs text-slate-500 md:block">{currentItem?.description}</p>
              </div>
            </div>
            <div className="flex flex-shrink-0 items-center gap-2 lg:gap-4">
              <Link href="/app" className="hidden md:inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-3 py-2 text-xs font-bold text-white transition-all hover:bg-emerald-600"><ArrowUpRight size={14} /> Voltar ao produto</Link>
            </div>
          </div>
        </header>

        <div className="custom-scrollbar flex-1 overflow-y-auto px-3 py-4 sm:px-4 lg:px-8 lg:py-6">{children}</div>
      </main>
    </div>
  );
}



