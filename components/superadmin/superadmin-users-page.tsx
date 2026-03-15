'use client';

import * as React from 'react';
import Link from 'next/link';
import { Loader2, Search, ShieldCheck, Sparkles, UserPlus2, Users2 } from 'lucide-react';

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
import type { SuperadminUserCreateResponse, SuperadminUsersResponse } from '@/lib/superadmin/types';

export function SuperadminUsersPage() {
  const [query, setQuery] = React.useState('');
  const debouncedQuery = useDebouncedValue(query, 250);
  const [data, setData] = React.useState<SuperadminUsersResponse | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isCreating, setIsCreating] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [createForm, setCreateForm] = React.useState({
    email: '',
    name: '',
    password: '',
    mode: 'invite' as 'invite' | 'password',
  });

  const loadUsers = React.useCallback(async (searchValue: string) => {
    const search = searchValue.trim();
    return fetchSuperadminJson<SuperadminUsersResponse>(`/api/superadmin/users${search ? `?q=${encodeURIComponent(search)}` : ''}`);
  }, []);

  React.useEffect(() => {
    let active = true;
    const run = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const next = await loadUsers(debouncedQuery);
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
  }, [debouncedQuery, loadUsers]);

  const users = data?.users ?? [];
  const paidUsers = users.filter((user) => user.currentPlan === 'PRO' || user.currentPlan === 'PREMIUM').length;
  const superadmins = users.filter((user) => user.platformRole === 'superadmin').length;
  const blockedUsers = users.filter((user) => user.lifecycleStatus === 'BLOCKED').length;

  async function handleCreateUser() {
    try {
      setIsCreating(true);
      setMessage(null);
      const response = await fetchSuperadminJson<SuperadminUserCreateResponse>('/api/superadmin/users', {
        method: 'POST',
        body: JSON.stringify(createForm),
      });
      setMessage(`Usuário ${response.createdUser.email} criado com sucesso.`);
      setCreateForm({ email: '', name: '', password: '', mode: 'invite' });
      const next = await loadUsers(query);
      setData(next);
    } catch (createError) {
      setMessage(createError instanceof Error ? createError.message : 'Falha ao criar usuario.');
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div className="space-y-5">
      {error ? <ErrorState message={error} /> : null}
      {message ? <FeedbackState message={message} success={message.includes('sucesso')} /> : null}

      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-slate-800 bg-slate-950/70 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
                Usuários
              </span>
              <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-emerald-300">
                Governança de acesso
              </span>
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">Base de usuários e suporte administrativo</h1>
              <p className="mt-2 text-sm leading-7 text-slate-300">
                Controle ciclo de vida, planos, roles e provisionamento de contas em uma superfície única e mais compacta.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Base total" value={formatAdminNumber(data?.total || 0)} icon={<Users2 className="h-4.5 w-4.5 text-emerald-300" />} />
        <StatCard label="Pagantes" value={formatAdminNumber(paidUsers)} icon={<Sparkles className="h-4.5 w-4.5 text-sky-300" />} />
        <StatCard label="Super admins" value={formatAdminNumber(superadmins)} icon={<ShieldCheck className="h-4.5 w-4.5 text-amber-300" />} />
        <StatCard label="Bloqueados" value={formatAdminNumber(blockedUsers)} icon={<ShieldCheck className="h-4.5 w-4.5 text-rose-300" />} />
      </section>

      <section className="grid gap-3 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-white">Operação de usuários</h2>
              <p className="mt-1 text-sm text-slate-400">Busque por nome, e-mail ou ID para chegar rápido na conta certa.</p>
            </div>
            <span className="rounded-full border border-slate-800 bg-slate-950/70 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
              {formatAdminNumber(users.length)} visíveis
            </span>
          </div>
          <label className="mt-4 block">
            <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">Buscar</span>
            <div className="relative mt-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Nome, e-mail ou ID"
                className={searchFieldClassName}
              />
            </div>
          </label>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-white">Provisionar usuario</h2>
              <p className="mt-1 text-sm text-slate-400">Crie acesso real com suporte ao Auth Admin.</p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] ${
                data?.capabilities.authAdminConfigured
                  ? 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-200'
                  : 'border border-amber-500/20 bg-amber-500/10 text-amber-200'
              }`}
            >
              {data?.capabilities.authAdminConfigured ? 'Ativo' : 'Pendente'}
            </span>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <input
              value={createForm.name}
              onChange={(event) => setCreateForm((current) => ({ ...current, name: event.target.value }))}
              className={compactFieldClassName}
              placeholder="Nome"
            />
            <input
              value={createForm.email}
              onChange={(event) => setCreateForm((current) => ({ ...current, email: event.target.value }))}
              className={compactFieldClassName}
              placeholder="usuario@empresa.com"
            />
            <select
              value={createForm.mode}
              onChange={(event) => setCreateForm((current) => ({ ...current, mode: event.target.value as 'invite' | 'password' }))}
              className={compactFieldClassName}
            >
              <option value="invite">Convite por e-mail</option>
              <option value="password">Criar com senha</option>
            </select>
            <input
              value={createForm.password}
              onChange={(event) => setCreateForm((current) => ({ ...current, password: event.target.value }))}
              className={compactFieldClassName}
              placeholder={createForm.mode === 'password' ? 'Senha inicial' : 'Não usada em convite'}
              disabled={createForm.mode !== 'password'}
            />
          </div>

          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={handleCreateUser}
              disabled={isCreating || !data?.capabilities.authAdminConfigured}
              className={primaryActionClassName}
            >
              {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus2 className="h-4 w-4" />}
              Criar usuario
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white">Base de usuários</h2>
            <p className="mt-1 text-sm text-slate-400">
              {data ? `${formatAdminNumber(data.total)} usuario(s) encontrados.` : 'Carregando base de usuários.'}
            </p>
          </div>
        </div>

        {isLoading ? (
          <LoadingState label="Carregando usuários..." />
        ) : !data ? (
          <ErrorState message={error || 'Falha ao carregar usuários.'} />
        ) : data.users.length === 0 ? (
          <EmptyState text="Nenhum usuario encontrado para os filtros atuais." />
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-800 text-[11px] uppercase tracking-[0.22em] text-slate-500">
                <tr>
                  <th className="px-3 py-3 font-semibold">Usuário</th>
                  <th className="px-3 py-3 font-semibold">Plano</th>
                  <th className="px-3 py-3 font-semibold">Status</th>
                  <th className="px-3 py-3 font-semibold">Role</th>
                  <th className="px-3 py-3 font-semibold">Workspaces</th>
                  <th className="px-3 py-3 font-semibold">Último acesso</th>
                  <th className="px-3 py-3 font-semibold">Cadastro</th>
                  <th className="px-3 py-3 text-right font-semibold">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {data.users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-950/30">
                    <td className="px-3 py-3.5 align-top">
                      <div className="font-semibold text-white">{user.name || 'Sem nome'}</div>
                      <div className="mt-0.5 text-xs text-slate-400">{user.email}</div>
                      <div className="mt-0.5 text-[11px] text-slate-500">{user.id}</div>
                    </td>
                    <td className="px-3 py-3.5 align-top">
                      <PlanBadge label={formatPlanLabel(user.currentPlan)} />
                    </td>
                    <td className="px-3 py-3.5 align-top">
                      <div className="flex flex-wrap gap-2">
                        <StatusBadge status={user.subscriptionStatus} />
                        <LifecycleBadge status={user.lifecycleStatus} />
                      </div>
                    </td>
                    <td className="px-3 py-3.5 align-top text-slate-300">{formatPlatformRole(user.platformRole)}</td>
                    <td className="px-3 py-3.5 align-top text-slate-300">{formatAdminNumber(user.workspaceCount)}</td>
                    <td className="px-3 py-3.5 align-top text-slate-300">{user.lastAccessAt ? formatAdminDateTime(user.lastAccessAt) : 'Sem registro'}</td>
                    <td className="px-3 py-3.5 align-top text-slate-300">{formatAdminDate(user.createdAt)}</td>
                    <td className="px-3 py-3.5 text-right align-top">
                      <Link href={`/superadmin/users/${user.id}`} className={secondaryActionClassName}>
                        Abrir
                      </Link>
                    </td>
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

function StatCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/50 px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">{label}</p>
          <p className="text-2xl font-bold tracking-tight text-white">{value}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-2.5">{icon}</div>
      </div>
    </div>
  );
}

function PlanBadge({ label }: { label: string }) {
  return <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-semibold text-slate-300">{label}</span>;
}

function StatusBadge({ status }: { status: string | null }) {
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getSubscriptionTone(status)}`}>{formatSubscriptionStatus(status)}</span>;
}

function LifecycleBadge({ status }: { status: 'ACTIVE' | 'SUSPENDED' | 'BLOCKED' }) {
  return (
    <span
      className={
        status === 'BLOCKED'
          ? 'rounded-full border border-rose-500/20 bg-rose-500/10 px-2.5 py-1 text-xs font-semibold text-rose-200'
          : status === 'SUSPENDED'
            ? 'rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-200'
            : 'rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-200'
      }
    >
      {status === 'BLOCKED' ? 'Bloqueado' : status === 'SUSPENDED' ? 'Suspenso' : 'Ativo'}
    </span>
  );
}

function LoadingState({ label }: { label: string }) {
  return (
    <div className="flex min-h-[220px] items-center justify-center">
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

function FeedbackState({ message, success }: { message: string; success: boolean }) {
  return (
    <div className={`rounded-2xl px-4 py-4 text-sm ${success ? 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-100' : 'border border-rose-500/20 bg-rose-500/10 text-rose-100'}`}>
      {message}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/40 px-4 py-6 text-sm text-slate-400">{text}</div>;
}

const searchFieldClassName =
  'w-full rounded-xl border border-slate-800 bg-slate-900 py-3 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-500';
const compactFieldClassName =
  'w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-500';
const secondaryActionClassName =
  'inline-flex items-center justify-center rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-bold text-slate-200 transition-all hover:border-emerald-500 hover:text-white';
const primaryActionClassName =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-bold text-slate-950 transition-all hover:bg-emerald-400 disabled:opacity-60';


