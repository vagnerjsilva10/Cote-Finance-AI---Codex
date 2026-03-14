'use client';

import * as React from 'react';
import Link from 'next/link';
import { Loader2, Search, ShieldCheck, Sparkles, Users2 } from 'lucide-react';

import { fetchSuperadminJson, useDebouncedValue } from '@/components/superadmin/fetch-superadmin-json';
import {
  SuperadminMetricChip,
  SuperadminPageHeader,
  SuperadminSectionCard,
} from '@/components/superadmin/superadmin-page-primitives';
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
          setError(fetchError instanceof Error ? fetchError.message : 'Falha ao carregar usuários.');
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

  const users = data?.users ?? [];
  const paidUsers = users.filter((user) => user.currentPlan === 'PRO' || user.currentPlan === 'PREMIUM').length;
  const superadmins = users.filter((user) => user.platformRole === 'superadmin').length;
  const activeRecently = users.filter((user) => Boolean(user.lastAccessAt)).length;

  return (
    <div className="space-y-6">
      <SuperadminPageHeader
        eyebrow="People Ops"
        title="Usuários"
        description="Acompanhe a base de contas, plano atual, acesso administrativo e sinais de atividade em uma leitura mais clara para operação diária."
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <SuperadminMetricChip label="Base total" value={formatAdminNumber(data?.total || 0)} />
          <SuperadminMetricChip label="Pagantes" value={formatAdminNumber(paidUsers)} tone="success" />
          <SuperadminMetricChip label="Super admins" value={formatAdminNumber(superadmins)} tone="info" />
          <SuperadminMetricChip label="Com acesso recente" value={formatAdminNumber(activeRecently)} />
        </div>
      </SuperadminPageHeader>

      {error ? <ErrorState message={error} /> : null}

      <SuperadminSectionCard
        title="Busca operacional"
        description="Encontre usuários por nome, e-mail ou identificador e isole rapidamente quem precisa de suporte, ajuste de acesso ou revisão de plano."
      >
        <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Buscar usuário</span>
            <div className="relative mt-2">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar por nome, e-mail ou ID"
                className={fieldClassName}
              />
            </div>
          </label>
          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <QuickInsight
              icon={<Users2 className="h-4 w-4 text-slate-200" />}
              label="Leitura rápida"
              value={`${formatAdminNumber(data?.total || 0)} contas na base`}
              description="A listagem mantém plano, role e último acesso no mesmo fluxo de leitura."
            />
            <QuickInsight
              icon={<Sparkles className="h-4 w-4 text-emerald-300" />}
              label="Maior valor"
              value={`${formatAdminNumber(paidUsers)} usuários em planos pagos`}
              description="Útil para suporte prioritário e revisão de retenção."
            />
            <QuickInsight
              icon={<ShieldCheck className="h-4 w-4 text-sky-300" />}
              label="Governança"
              value={`${formatAdminNumber(superadmins)} perfis críticos`}
              description="Monitore acessos elevados com mais segurança."
            />
          </div>
        </div>
      </SuperadminSectionCard>

      <SuperadminSectionCard
        title="Base de usuários"
        description={
          data
            ? `${formatAdminNumber(data.total)} usuário(s) encontrados. A tabela prioriza nome, contexto operacional e atalhos para o detalhe.`
            : 'Carregando usuários.'
        }
      >
        {isLoading ? (
          <LoadingState label="Carregando usuários..." />
        ) : !data ? (
          <ErrorState message={error || 'Falha ao carregar usuários.'} />
        ) : data.users.length === 0 ? (
          <EmptyState text="Nenhum usuário encontrado para os filtros atuais." />
        ) : (
          <div className="space-y-5">
            <div className="hidden overflow-hidden rounded-[1.6rem] border border-white/8 bg-[linear-gradient(180deg,rgba(2,6,23,.26),rgba(2,6,23,.14))] xl:block">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-white/[0.03] text-[11px] uppercase tracking-[0.22em] text-slate-500">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Usuário</th>
                    <th className="px-6 py-4 font-semibold">Plano</th>
                    <th className="px-6 py-4 font-semibold">Assinatura</th>
                    <th className="px-6 py-4 font-semibold">Acesso</th>
                    <th className="px-6 py-4 font-semibold">Workspaces</th>
                    <th className="px-6 py-4 font-semibold">Último acesso</th>
                    <th className="px-6 py-4 font-semibold">Cadastro</th>
                    <th className="px-6 py-4 font-semibold text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/8">
                  {data.users.map((user) => (
                    <tr key={user.id} className="transition hover:bg-white/[0.025]">
                      <td className="px-6 py-5 align-top">
                        <div className="min-w-[240px]">
                          <div className="font-semibold text-white">{user.name || 'Sem nome'}</div>
                          <div className="mt-1 text-xs text-slate-400">{user.email}</div>
                          <div className="mt-2 text-[11px] text-slate-500">{user.id}</div>
                        </div>
                      </td>
                      <td className="px-6 py-5 align-top">
                        <PlanBadge plan={user.currentPlan} />
                      </td>
                      <td className="px-6 py-5 align-top">
                        <StatusBadge status={user.subscriptionStatus} />
                      </td>
                      <td className="px-6 py-5 align-top text-sm font-medium text-white">{formatPlatformRole(user.platformRole)}</td>
                      <td className="px-6 py-5 align-top text-sm text-slate-300">{formatAdminNumber(user.workspaceCount)}</td>
                      <td className="px-6 py-5 align-top text-sm text-slate-300">
                        {user.lastAccessAt ? formatAdminDateTime(user.lastAccessAt) : 'Sem registro'}
                      </td>
                      <td className="px-6 py-5 align-top text-sm text-slate-300">{formatAdminDate(user.createdAt)}</td>
                      <td className="px-6 py-5 align-top">
                        <div className="flex justify-end">
                          <Link href={`/superadmin/users/${user.id}`} className={secondaryActionClassName}>
                            Ver detalhe
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid gap-4 xl:hidden">
              {data.users.map((user) => (
                <article
                  key={user.id}
                  className="rounded-[1.6rem] border border-white/8 bg-[linear-gradient(180deg,rgba(15,23,42,.72),rgba(15,23,42,.56))] p-5 shadow-[0_18px_56px_-38px_rgba(2,6,23,.92)]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-white">{user.name || 'Sem nome'}</p>
                      <p className="mt-1 text-xs text-slate-400">{user.email}</p>
                    </div>
                    <StatusBadge status={user.subscriptionStatus} />
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <InfoPill label="Plano" value={formatPlanLabel(user.currentPlan)} />
                    <InfoPill label="Acesso" value={formatPlatformRole(user.platformRole)} />
                    <InfoPill label="Workspaces" value={formatAdminNumber(user.workspaceCount)} />
                    <InfoPill
                      label="Último acesso"
                      value={user.lastAccessAt ? formatAdminDateTime(user.lastAccessAt) : 'Sem registro'}
                    />
                  </div>

                  <div className="mt-5 flex justify-end">
                    <Link href={`/superadmin/users/${user.id}`} className={secondaryActionClassName}>
                      Ver detalhe
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
      </SuperadminSectionCard>
    </div>
  );
}

function QuickInsight({ icon, label, value, description }: { icon: React.ReactNode; label: string; value: string; description: string }) {
  return (
    <div className="rounded-[1.35rem] border border-white/8 bg-[linear-gradient(180deg,rgba(2,6,23,.42),rgba(2,6,23,.28))] p-4">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">{icon}{label}</div>
      <p className="mt-3 text-sm font-semibold text-white">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
    </div>
  );
}

function PlanBadge({ plan }: { plan: string }) {
  return <span className="rounded-full border border-emerald-400/18 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-200">{formatPlanLabel(plan)}</span>;
}

function StatusBadge({ status }: { status: string | null }) {
  return <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${getSubscriptionTone(status)}`}>{formatSubscriptionStatus(status)}</span>;
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-slate-950/45 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function LoadingState({ label }: { label: string }) {
  return <div className="flex min-h-[260px] items-center justify-center"><div className="flex items-center gap-3 rounded-2xl border border-white/8 bg-slate-950/60 px-5 py-4 text-slate-200"><Loader2 className="h-5 w-5 animate-spin text-emerald-400" />{label}</div></div>;
}

function ErrorState({ message }: { message: string }) {
  return <div className="rounded-[1.5rem] border border-rose-500/20 bg-rose-500/10 px-4 py-5 text-sm text-rose-100">{message}</div>;
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-[1.5rem] border border-dashed border-white/10 bg-slate-950/40 px-4 py-8 text-sm text-slate-400">{text}</div>;
}

const fieldClassName = 'w-full rounded-[1.2rem] border border-white/10 bg-slate-950/70 py-3 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-400/60 focus:bg-slate-950';
const secondaryActionClassName = 'inline-flex rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs font-semibold text-slate-200 transition hover:border-white/18 hover:bg-white/[0.05] hover:text-white';
