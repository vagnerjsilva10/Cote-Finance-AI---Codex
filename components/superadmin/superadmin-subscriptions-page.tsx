'use client';

import * as React from 'react';
import Link from 'next/link';
import { Loader2, Search } from 'lucide-react';

import { fetchSuperadminJson, useDebouncedValue } from '@/components/superadmin/fetch-superadmin-json';
import {
  formatAdminCurrency,
  formatAdminDate,
  formatAdminNumber,
  formatPlanLabel,
  formatSubscriptionStatus,
  getSubscriptionTone,
} from '@/components/superadmin/superadmin-utils';
import {
  SuperadminActionLink,
  SuperadminMetricChip,
  SuperadminPageHeader,
  SuperadminSectionCard,
} from '@/components/superadmin/superadmin-page-primitives';
import type { SuperadminSubscriptionsResponse } from '@/lib/superadmin/types';

const PLAN_OPTIONS = [
  { value: 'ALL', label: 'Todos os planos' },
  { value: 'FREE', label: 'Free' },
  { value: 'PRO', label: 'Pro' },
  { value: 'PREMIUM', label: 'Premium' },
];

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'Todos os status' },
  { value: 'ACTIVE', label: 'Ativas' },
  { value: 'PENDING', label: 'Pendentes' },
  { value: 'CANCELED', label: 'Canceladas' },
];

export function SuperadminSubscriptionsPage() {
  const [query, setQuery] = React.useState('');
  const [plan, setPlan] = React.useState('ALL');
  const [status, setStatus] = React.useState('ALL');
  const debouncedQuery = useDebouncedValue(query, 250);
  const [data, setData] = React.useState<SuperadminSubscriptionsResponse | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    let active = true;

    const run = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const params = new URLSearchParams();
        if (debouncedQuery.trim()) params.set('q', debouncedQuery.trim());
        if (plan !== 'ALL') params.set('plan', plan);
        if (status !== 'ALL') params.set('status', status);

        const next = await fetchSuperadminJson<SuperadminSubscriptionsResponse>(
          `/api/superadmin/subscriptions${params.toString() ? `?${params.toString()}` : ''}`
        );

        if (active) setData(next);
      } catch (fetchError) {
        if (active) setError(fetchError instanceof Error ? fetchError.message : 'Falha ao carregar assinaturas.');
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void run();
    return () => {
      active = false;
    };
  }, [debouncedQuery, plan, status]);

  const metrics = data?.metrics;

  return (
    <div className="space-y-6">
      <SuperadminPageHeader
        eyebrow="Billing"
        title="Assinaturas"
        description="Acompanhe a operação de billing com visão consolidada de plano, status, vencimento, vínculo com Stripe e MRR estimado da base atual."
        actions={<SuperadminActionLink href="/superadmin/plans">Ver planos</SuperadminActionLink>}
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SuperadminMetricChip label="Assinaturas" value={formatAdminNumber(metrics?.total || 0)} />
          <SuperadminMetricChip label="Pagantes" value={formatAdminNumber(metrics?.paying || 0)} tone="success" />
          <SuperadminMetricChip label="Pendentes" value={formatAdminNumber(metrics?.pending || 0)} tone="info" />
          <SuperadminMetricChip label="MRR estimado" value={formatAdminCurrency(metrics?.estimatedMrr || 0)} />
        </div>
      </SuperadminPageHeader>

      <SuperadminSectionCard
        title="Operação de billing"
        description="Filtre por plano, status ou workspace para localizar rapidamente contas ativas, pendentes de pagamento e canceladas."
      >
        <div className="grid gap-3 lg:grid-cols-[1.2fr_0.4fr_0.4fr]">
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Buscar</span>
            <div className="relative mt-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar por workspace, owner ou ID"
                className="w-full rounded-2xl border border-white/10 bg-slate-950/70 py-3 pl-10 pr-4 text-sm text-white outline-none transition focus:border-emerald-400"
              />
            </div>
          </label>

          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Plano</span>
            <select
              value={plan}
              onChange={(event) => setPlan(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400"
            >
              {PLAN_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Status</span>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </SuperadminSectionCard>

      <SuperadminSectionCard
        title="Base de assinaturas"
        description={data ? `${formatAdminNumber(data.total)} assinatura(s) encontrada(s).` : 'Carregando assinaturas da base.'}
      >
        {isLoading ? (
          <LoadingState />
        ) : error || !data ? (
          <ErrorState message={error || 'Falha ao carregar assinaturas.'} />
        ) : data.subscriptions.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-4">
            <div className="hidden overflow-x-auto xl:block">
              <table className="min-w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  <tr>
                    <th className="pb-3 pr-4 font-semibold">Workspace</th>
                    <th className="pb-3 pr-4 font-semibold">Owner</th>
                    <th className="pb-3 pr-4 font-semibold">Plano</th>
                    <th className="pb-3 pr-4 font-semibold">Status</th>
                    <th className="pb-3 pr-4 font-semibold">Período atual</th>
                    <th className="pb-3 pr-4 font-semibold">Stripe</th>
                    <th className="pb-3 pr-4 font-semibold">MRR</th>
                    <th className="pb-3 pr-0 font-semibold">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {data.subscriptions.map((item) => (
                    <tr key={item.workspaceId}>
                      <td className="py-4 pr-4 align-top">
                        <div className="font-semibold text-white">{item.workspaceName}</div>
                        <div className="mt-1 text-[11px] text-slate-500">{item.workspaceId}</div>
                      </td>
                      <td className="py-4 pr-4 align-top text-slate-300">{item.ownerEmail || 'Sem owner'}</td>
                      <td className="py-4 pr-4 align-top text-slate-200">{formatPlanLabel(item.plan)}</td>
                      <td className="py-4 pr-4 align-top">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getSubscriptionTone(item.status)}`}>
                          {formatSubscriptionStatus(item.status)}
                        </span>
                      </td>
                      <td className="py-4 pr-4 align-top text-slate-300">{formatAdminDate(item.currentPeriodEnd)}</td>
                      <td className="py-4 pr-4 align-top text-slate-300">
                        {item.hasStripeSubscription ? 'Assinatura Stripe' : item.hasStripeCustomer ? 'Cliente Stripe' : 'Sem vínculo'}
                      </td>
                      <td className="py-4 pr-4 align-top text-slate-200">{formatAdminCurrency(item.estimatedMrr)}</td>
                      <td className="py-4 pr-0 align-top">
                        <Link
                          href={`/superadmin/workspaces/${item.workspaceId}`}
                          className="inline-flex rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/5 hover:text-white"
                        >
                          Ver workspace
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid gap-4 xl:hidden">
              {data.subscriptions.map((item) => (
                <article key={item.workspaceId} className="rounded-2xl border border-white/10 bg-slate-950/55 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-white">{item.workspaceName}</p>
                      <p className="mt-1 text-xs text-slate-500">{item.workspaceId}</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getSubscriptionTone(item.status)}`}>
                      {formatSubscriptionStatus(item.status)}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <InfoPill label="Plano" value={formatPlanLabel(item.plan)} />
                    <InfoPill label="Owner" value={item.ownerEmail || 'Sem owner'} />
                    <InfoPill label="Período atual" value={formatAdminDate(item.currentPeriodEnd)} />
                    <InfoPill label="MRR" value={formatAdminCurrency(item.estimatedMrr)} />
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
                      {item.hasStripeSubscription ? 'Assinatura Stripe' : item.hasStripeCustomer ? 'Cliente Stripe' : 'Sem Stripe'}
                    </span>
                  </div>

                  <div className="mt-5">
                    <Link
                      href={`/superadmin/workspaces/${item.workspaceId}`}
                      className="inline-flex rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/5 hover:text-white"
                    >
                      Ver workspace
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

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex min-h-[260px] items-center justify-center">
      <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/60 px-5 py-4 text-slate-200">
        <Loader2 className="h-5 w-5 animate-spin text-emerald-400" />
        Carregando assinaturas...
      </div>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-5 text-sm text-rose-100">{message}</div>;
}

function EmptyState() {
  return <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/40 px-4 py-6 text-sm text-slate-400">Nenhuma assinatura encontrada para os filtros atuais.</div>;
}
