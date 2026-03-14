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
import type { SuperadminSubscriptionSummary, SuperadminSubscriptionUpdateResponse } from '@/lib/superadmin/types';

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
  const [selectedSubscription, setSelectedSubscription] = React.useState<SuperadminSubscriptionSummary | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const [actionMessage, setActionMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;

    const run = async () => {
      try {
        setIsLoading(true);
        setError(null);
        setActionMessage(null);

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
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedSubscription(item)}
                            className="inline-flex rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-500/15"
                          >
                            Editar
                          </button>
                          <Link
                            href={`/superadmin/workspaces/${item.workspaceId}`}
                            className="inline-flex rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/5 hover:text-white"
                          >
                            Ver workspace
                          </Link>
                        </div>
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
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedSubscription(item)}
                        className="inline-flex rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-500/15"
                      >
                        Editar assinatura
                      </button>
                      <Link
                        href={`/superadmin/workspaces/${item.workspaceId}`}
                        className="inline-flex rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/5 hover:text-white"
                      >
                        Ver workspace
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
      </SuperadminSectionCard>

      {actionMessage ? (
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-5 text-sm text-emerald-100">
          {actionMessage}
        </div>
      ) : null}

      {selectedSubscription ? (
        <SubscriptionActionSheet
          subscription={selectedSubscription}
          isSaving={isSaving}
          onClose={() => {
            if (!isSaving) setSelectedSubscription(null);
          }}
          onSubmit={async (payload) => {
            try {
              setIsSaving(true);
              setError(null);
              setActionMessage(null);

              const response = await fetchSuperadminJson<SuperadminSubscriptionUpdateResponse>(
                '/api/superadmin/subscriptions',
                {
                  method: 'PATCH',
                  body: JSON.stringify(payload),
                }
              );

              setData((current) =>
                current
                  ? {
                      ...current,
                      subscriptions: current.subscriptions.map((item) =>
                        item.workspaceId === response.subscription.workspaceId
                          ? {
                              ...item,
                              plan: response.subscription.plan,
                              status: response.subscription.status,
                              currentPeriodEnd: response.subscription.currentPeriodEnd,
                              estimatedMrr: response.subscription.estimatedMrr,
                            }
                          : item
                      ),
                    }
                  : current
              );
              setSelectedSubscription(null);
              setActionMessage('Assinatura atualizada com sucesso.');
            } catch (submitError) {
              setError(submitError instanceof Error ? submitError.message : 'Falha ao atualizar assinatura.');
            } finally {
              setIsSaving(false);
            }
          }}
        />
      ) : null}
    </div>
  );
}

function SubscriptionActionSheet({
  subscription,
  isSaving,
  onClose,
  onSubmit,
}: {
  subscription: SuperadminSubscriptionSummary;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    workspaceId: string;
    plan: string;
    status: string;
    currentPeriodEnd: string | null;
  }) => Promise<void>;
}) {
  const [plan, setPlan] = React.useState(subscription.plan);
  const [status, setStatus] = React.useState(subscription.status);
  const [currentPeriodEnd, setCurrentPeriodEnd] = React.useState(
    subscription.currentPeriodEnd ? subscription.currentPeriodEnd.slice(0, 10) : ''
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/70 p-4 backdrop-blur-sm xl:items-center">
      <div className="w-full max-w-xl rounded-[1.75rem] border border-white/10 bg-slate-900 p-6 shadow-[0_32px_120px_-60px_rgba(15,23,42,.95)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Ação administrativa</p>
            <h3 className="mt-2 text-xl font-semibold text-white">{subscription.workspaceName}</h3>
            <p className="mt-2 text-sm text-slate-400">
              Ajuste manual de plano, status e período atual sem depender da interface do cliente.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-white/5"
          >
            Fechar
          </button>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Plano</span>
            <select value={plan} onChange={(event) => setPlan(event.target.value)} className={fieldClassName}>
              {PLAN_OPTIONS.filter((option) => option.value !== 'ALL').map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Status</span>
            <select value={status} onChange={(event) => setStatus(event.target.value)} className={fieldClassName}>
              {STATUS_OPTIONS.filter((option) => option.value !== 'ALL').map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="mt-4 block">
          <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Período atual</span>
          <input
            type="date"
            value={currentPeriodEnd}
            onChange={(event) => setCurrentPeriodEnd(event.target.value)}
            className={fieldClassName}
          />
        </label>

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-full border border-white/10 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/5 disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() =>
              void onSubmit({
                workspaceId: subscription.workspaceId,
                plan,
                status,
                currentPeriodEnd: currentPeriodEnd || null,
              })
            }
            disabled={isSaving}
            className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-60"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Salvar assinatura
          </button>
        </div>
      </div>
    </div>
  );
}

const fieldClassName =
  'mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400';

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
