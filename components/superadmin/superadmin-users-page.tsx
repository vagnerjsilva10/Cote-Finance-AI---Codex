'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowUpRight, Loader2, Search, ShieldCheck, Sparkles, Users2 } from 'lucide-react';

import { fetchSuperadminJson, useDebouncedValue } from '@/components/superadmin/fetch-superadmin-json';
import {
  formatAdminDate,
  formatAdminDateTime,
  formatAdminNumber,
  formatPlanLabel,
  formatPlatformRole,
  formatSubscriptionStatus,
  getSubscriptionTone,
} from '@/components/superadmin/superadmin-utils';
import type { SuperadminUsersResponse } from '@/lib/superadmin/types';

export function SuperadminUsersPage() {
  const [query, setQuery] = React.useState('');
  const debouncedQuery = useDebouncedValue(query, 250);
  const [data, setData] = React.useState<SuperadminUsersResponse | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    let active = true;
    const run = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const search = debouncedQuery.trim();
        const next = await fetchSuperadminJson<SuperadminUsersResponse>(`/api/superadmin/users${search ? `?q=${encodeURIComponent(search)}` : ''}`);
        if (active) setData(next);
      } catch (fetchError) {
        if (active) setError(fetchError instanceof Error ? fetchError.message : 'Falha ao carregar usuários.');
      } finally {
        if (active) setIsLoading(false);
      }
    };
    void run();
    return () => {
      active = false;
    };
  }, [debouncedQuery]);

  const users = data?.users ?? [];
  const paidUsers = users.filter((user) => user.currentPlan === 'PRO' || user.currentPlan === 'PREMIUM').length;
  const superadmins = users.filter((user) => user.platformRole === 'superadmin').length;
  const activeRecently = users.filter((user) => Boolean(user.lastAccessAt)).length;

  return (
    <div className="space-y-6">
      <section className="rounded-[1.9rem] border border-slate-800 bg-slate-900/60 p-6">
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Usuários</p>
          <h1 className="text-3xl font-black tracking-tight text-white md:text-4xl">Usuários</h1>
          <p className="max-w-3xl text-sm leading-7 text-slate-300">Acompanhe a base de contas, plano atual, acesso administrativo e sinais de atividade usando a mesma hierarquia do app principal.</p>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Base total" value={formatAdminNumber(data?.total || 0)} trend="na plataforma" trendValue={formatAdminNumber(data?.total || 0)} icon={Users2} />
          <StatCard label="Pagantes" value={formatAdminNumber(paidUsers)} trend="em planos pagos" trendValue={formatAdminNumber(paidUsers)} icon={Sparkles} />
          <StatCard label="Super admins" value={formatAdminNumber(superadmins)} trend="com acesso elevado" trendValue={formatAdminNumber(superadmins)} icon={ShieldCheck} />
          <StatCard label="Com acesso recente" value={formatAdminNumber(activeRecently)} trend="com atividade" trendValue={formatAdminNumber(activeRecently)} icon={ArrowUpRightIcon} />
        </div>
      </section>

      {error ? <ErrorState message={error} /> : null}

      <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
        <div className="mb-5">
          <h2 className="text-xl font-black text-white">Busca operacional</h2>
          <p className="mt-2 text-sm leading-7 text-slate-400">Encontre usuários por nome, e-mail ou identificador e isole rapidamente quem precisa de suporte ou revisão de acesso.</p>
        </div>
        <label className="block max-w-2xl">
          <span className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Buscar usuário</span>
          <div className="relative mt-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nome, e-mail ou ID" className={fieldClassName} />
          </div>
        </label>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
        <div className="mb-5">
          <h2 className="text-xl font-black text-white">Base de usuários</h2>
          <p className="mt-2 text-sm leading-7 text-slate-400">{data ? `${formatAdminNumber(data.total)} usuário(s) encontrados.` : 'Carregando usuários.'}</p>
        </div>
        {isLoading ? <LoadingState label="Carregando usuários..." /> : !data ? <ErrorState message={error || 'Falha ao carregar usuários.'} /> : data.users.length === 0 ? <EmptyState text="Nenhum usuário encontrado para os filtros atuais." /> : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.2em] text-slate-500">
                <tr>
                  <th className="pb-4 pr-6 font-semibold">Usuário</th>
                  <th className="pb-4 pr-6 font-semibold">Plano</th>
                  <th className="pb-4 pr-6 font-semibold">Assinatura</th>
                  <th className="pb-4 pr-6 font-semibold">Acesso</th>
                  <th className="pb-4 pr-6 font-semibold">Workspaces</th>
                  <th className="pb-4 pr-6 font-semibold">Último acesso</th>
                  <th className="pb-4 pr-6 font-semibold">Cadastro</th>
                  <th className="pb-4 text-right font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {data.users.map((user) => (
                  <tr key={user.id} className="transition hover:bg-slate-900/40">
                    <td className="py-5 pr-6 align-top"><div className="font-semibold text-white">{user.name || 'Sem nome'}</div><div className="mt-1 text-xs text-slate-400">{user.email}</div><div className="mt-1 text-xs text-slate-500">{user.id}</div></td>
                    <td className="py-5 pr-6 align-top"><PlanBadge label={formatPlanLabel(user.currentPlan)} /></td>
                    <td className="py-5 pr-6 align-top"><StatusBadge status={user.subscriptionStatus} /></td>
                    <td className="py-5 pr-6 align-top text-slate-300">{formatPlatformRole(user.platformRole)}</td>
                    <td className="py-5 pr-6 align-top text-slate-300">{formatAdminNumber(user.workspaceCount)}</td>
                    <td className="py-5 pr-6 align-top text-slate-300">{user.lastAccessAt ? formatAdminDateTime(user.lastAccessAt) : 'Sem registro'}</td>
                    <td className="py-5 pr-6 align-top text-slate-300">{formatAdminDate(user.createdAt)}</td>
                    <td className="py-5 align-top"><div className="flex justify-end"><Link href={`/superadmin/users/${user.id}`} className={secondaryActionClassName}>Ver detalhe</Link></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({ label, value, trend, trendValue, icon: Icon, trendType = 'up' }: { label: string; value: string; trend: string; trendValue: string; icon: React.ComponentType<{ size?: number; className?: string }>; trendType?: 'up' | 'down'; }) {
  return <div className="group relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50 p-6 transition-colors hover:border-slate-700"><div className="mb-4 flex items-center justify-between"><span className="text-sm font-medium text-slate-400">{label}</span><div className={trendType === 'up' ? 'rounded-lg bg-emerald-500/10 p-2 text-emerald-500' : 'rounded-lg bg-rose-500/10 p-2 text-rose-500'}><Icon size={18} /></div></div><div className="flex flex-col gap-1"><p className="text-2xl font-bold tracking-tight text-white">{value}</p><div className={trendType === 'up' ? 'flex items-center gap-1 text-sm font-semibold text-emerald-500' : 'flex items-center gap-1 text-sm font-semibold text-rose-500'}>{trendType === 'up' ? <ArrowUpRight size={14} /> : <ArrowUpRight size={14} className="rotate-90" />}{trendValue} <span className="ml-1 font-normal text-slate-500">{trend}</span></div></div></div>;
}
function ArrowUpRightIcon(props: { size?: number; className?: string }) { return <ArrowUpRight {...props} />; }
function PlanBadge({ label }: { label: string }) { return <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-semibold text-slate-300">{label}</span>; }
function StatusBadge({ status }: { status: string | null }) { return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getSubscriptionTone(status)}`}>{formatSubscriptionStatus(status)}</span>; }
function LoadingState({ label }: { label: string }) { return <div className="flex min-h-[220px] items-center justify-center"><div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 px-5 py-4 text-slate-200"><Loader2 className="h-5 w-5 animate-spin text-emerald-400" />{label}</div></div>; }
function ErrorState({ message }: { message: string }) { return <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-5 text-sm text-rose-100">{message}</div>; }
function EmptyState({ text }: { text: string }) { return <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/40 px-4 py-6 text-sm text-slate-400">{text}</div>; }
const fieldClassName = 'w-full rounded-xl border border-slate-800 bg-slate-900 py-3 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-500';
const secondaryActionClassName = 'inline-flex items-center justify-center rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-bold text-slate-200 transition-all hover:border-emerald-500 hover:text-white';
