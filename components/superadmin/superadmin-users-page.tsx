'use client';

import * as React from 'react';
import Link from 'next/link';
import { Loader2, Search } from 'lucide-react';

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
        const next = await fetchSuperadminJson<SuperadminUsersResponse>(
          `/api/superadmin/users${search ? `?q=${encodeURIComponent(search)}` : ''}`
        );
        if (active) setData(next);
      } catch (fetchError) {
        if (active) {
          setError(fetchError instanceof Error ? fetchError.message : 'Falha ao carregar Usuários.');
        }
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void run();
    return () => {
      active = false;
    };
  }, [debouncedQuery]);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-300">Super Admin</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Usuários</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
              Encontre Usuários rapidamente, visualize plano, assinatura, workspaces e sinais de uso da plataforma.
            </p>
          </div>
          <div className="w-full max-w-md">
            <label className="block text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Busca</label>
            <div className="relative mt-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar por nome, e-mail ou ID"
                className="w-full rounded-2xl border border-slate-700 bg-slate-950/70 py-3 pl-10 pr-4 text-sm text-white outline-none transition focus:border-emerald-400"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
        {isLoading ? (
          <LoadingState label="Carregando Usuários..." />
        ) : error || !data ? (
          <ErrorState message={error || 'Falha ao carregar Usuários.'} />
        ) : data.users.length === 0 ? (
          <EmptyState text="Nenhum usuÃ¡rio encontrado para os filtros atuais." />
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="text-sm text-slate-400">
                {formatAdminNumber(data.total)} usuÃƒÂ¡rio(s) encontrado(s)
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  <tr>
                    <th className="pb-3 pr-4 font-semibold">UsuÃ¡rio</th>
                    <th className="pb-3 pr-4 font-semibold">Plano</th>
                    <th className="pb-3 pr-4 font-semibold">Assinatura</th>
                    <th className="pb-3 pr-4 font-semibold">Role</th>
                    <th className="pb-3 pr-4 font-semibold">Workspaces</th>
                    <th className="pb-3 pr-4 font-semibold">Ãšltimo acesso</th>
                    <th className="pb-3 pr-4 font-semibold">Cadastro</th>
                    <th className="pb-3 pr-0 font-semibold">AÃ§Ãµes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {data.users.map((user) => (
                    <tr key={user.id}>
                      <td className="py-4 pr-4 align-top">
                        <div className="font-semibold text-white">{user.name || 'Sem nome'}</div>
                        <div className="mt-1 text-xs text-slate-400">{user.email}</div>
                        <div className="mt-1 text-[11px] text-slate-500">{user.id}</div>
                      </td>
                      <td className="py-4 pr-4 align-top text-slate-200">{formatPlanLabel(user.currentPlan)}</td>
                      <td className="py-4 pr-4 align-top">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getSubscriptionTone(
                            user.subscriptionStatus
                          )}`}
                        >
                          {formatSubscriptionStatus(user.subscriptionStatus)}
                        </span>
                      </td>
                      <td className="py-4 pr-4 align-top text-slate-200">{formatPlatformRole(user.platformRole)}</td>
                      <td className="py-4 pr-4 align-top text-slate-300">{formatAdminNumber(user.workspaceCount)}</td>
                      <td className="py-4 pr-4 align-top text-slate-300">
                        {user.lastAccessAt ? formatAdminDateTime(user.lastAccessAt) : 'Sem registro'}
                      </td>
                      <td className="py-4 pr-4 align-top text-slate-300">{formatAdminDate(user.createdAt)}</td>
                      <td className="py-4 pr-0 align-top">
                        <Link
                          href={`/superadmin/users/${user.id}`}
                          className="inline-flex rounded-full border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-slate-500 hover:text-white"
                        >
                          Ver detalhe
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function LoadingState({ label }: { label: string }) {
  return (
    <div className="flex min-h-[260px] items-center justify-center">
      <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 px-5 py-4 text-slate-200">
        <Loader2 className="h-5 w-5 animate-spin text-emerald-400" />
        {label}
      </div>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-5 text-sm text-rose-100">{message}</div>;
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/40 px-4 py-6 text-sm text-slate-400">{text}</div>;
}
