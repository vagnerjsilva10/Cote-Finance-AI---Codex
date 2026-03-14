'use client';

import * as React from 'react';
import Link from 'next/link';
import { CreditCard, Loader2, Search, ShieldCheck, Sparkles } from 'lucide-react';

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
import type {
  SuperadminSubscriptionSummary,
  SuperadminSubscriptionUpdateResponse,
  SuperadminSubscriptionsResponse,
} from '@/lib/superadmin/types';

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
        description="Monitore receita recorrente, base pagante e saúde do billing em uma leitura mais limpa, com filtros mais claros e uma tabela pronta para operação diária."
        actions={<SuperadminActionLink href="/superadmin/plans">Ver catálogo de planos</SuperadminActionLink>}
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <SuperadminMetricChip label="Assinaturas" value={formatAdminNumber(metrics?.total || 0)} />
          <SuperadminMetricChip label="Pagantes" value={formatAdminNumber(metrics?.paying || 0)} tone="success" />
          <SuperadminMetricChip label="Pendentes" value={formatAdminNumber(metrics?.pending || 0)} tone="info" />
          <SuperadminMetricChip label="MRR estimado" value={formatAdminCurrency(metrics?.estimatedMrr || 0)} />
        </div>
      </SuperadminPageHeader>

      {actionMessage ? (
        <SuccessState message={actionMessage} />
      ) : null}

      {error ? <ErrorState message={error} /> : null}

      <SuperadminSectionCard
        title="Operação de billing"
        description="Busca e filtros desenhados para escanear rápido a base e isolar planos, pendências e contas canceladas sem perder contexto."
      >
        <div className="grid gap-4 xl:grid-cols-[1.35fr_0.42fr_0.42fr]">
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Buscar</span>
            <div className="relative mt-2">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar por workspace, owner ou ID"
                className={filterFieldClassName}
              />
            </div>
          </label>

          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Plano</span>
            <select value={plan} onChange={(event) => setPlan(event.target.value)} className={filterFieldClassName}>
              {PLAN_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Status</span>
            <select value={status} onChange={(event) => setStatus(event.target.value)} className={filterFieldClassName}>
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <QuickInsight
            icon={<Sparkles className="h-4 w-4 text-emerald-300" />}
            label="Conversão visível"
            value={`${formatAdminNumber(metrics?.paying || 0)} pagantes`}
            description="Workspaces ativos nos planos Pro e Premium."
          />
          <QuickInsight
            icon={<ShieldCheck className="h-4 w-4 text-sky-300" />}
            label="Base estável"
            value={`${formatAdminNumber(metrics?.active || 0)} ativas`}
            description="Assinaturas saudáveis e com boa continuidade."
          />
          <QuickInsight
            icon={<CreditCard className="h-4 w-4 text-slate-200" />}
            label="Acompanhamento"
            value={`${formatAdminNumber(metrics?.canceled || 0)} canceladas`}
            description="Contas que pedem leitura de churn e retenção."
          />
        </div>
      </SuperadminSectionCard>

      <SuperadminSectionCard
        title="Base de assinaturas"
        description={
          data
            ? `${formatAdminNumber(data.total)} assinatura(s) encontradas. Ações administrativas e navegação rápida ficam alinhadas ao lado do status.`
            : 'Carregando base de assinaturas.'
        }
      >
        {isLoading ? (
          <LoadingState message="Carregando assinaturas..." />
        ) : !data ? (
          <ErrorState message={error || 'Falha ao carregar assinaturas.'} />
        ) : data.subscriptions.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-5">
            <div className="hidden overflow-hidden rounded-[1.6rem] border border-white/8 bg-[linear-gradient(180deg,rgba(2,6,23,.26),rgba(2,6,23,.14))] xl:block">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-white/[0.03] text-[11px] uppercase tracking-[0.22em] text-slate-500">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Workspace</th>
                    <th className="px-6 py-4 font-semibold">Owner</th>
                    <th className="px-6 py-4 font-semibold">Plano</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                    <th className="px-6 py-4 font-semibold">Período</th>
                    <th className="px-6 py-4 font-semibold">Stripe</th>
                    <th className="px-6 py-4 font-semibold">MRR</th>
                    <th className="px-6 py-4 font-semibold text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/8">
                  {data.subscriptions.map((item) => (
                    <tr key={item.workspaceId} className="transition hover:bg-white/[0.025]">
                      <td className="px-6 py-5 align-top">
                        <div className="min-w-[220px]">
                          <div className="font-semibold text-white">{item.workspaceName}</div>
                          <div className="mt-1 text-xs text-slate-500">{item.workspaceId}</div>
                        </div>
                      </td>
                      <td className="px-6 py-5 align-top">
                        <div className="min-w-[180px] text-sm text-slate-300">{item.ownerEmail || 'Sem owner'}</div>
                      </td>
                      <td className="px-6 py-5 align-top">
                        <PlanBadge plan={item.plan} />
                      </td>
                      <td className="px-6 py-5 align-top">
                        <StatusBadge status={item.status} />
                      </td>
                      <td className="px-6 py-5 align-top text-sm text-slate-300">{formatAdminDate(item.currentPeriodEnd)}</td>
                      <td className="px-6 py-5 align-top text-sm text-slate-400">
                        {item.hasStripeSubscription
                          ? 'Assinatura Stripe'
                          : item.hasStripeCustomer
                            ? 'Cliente Stripe'
                            : 'Sem vínculo'}
                      </td>
                      <td className="px-6 py-5 align-top text-sm font-semibold text-white">{formatAdminCurrency(item.estimatedMrr)}</td>
                      <td className="px-6 py-5 align-top">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedSubscription(item)}
                            className="inline-flex rounded-full border border-emerald-400/18 bg-emerald-500/10 px-3.5 py-2 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-500/15"
                          >
                            Editar
                          </button>
                          <Link
                            href={`/superadmin/workspaces/${item.workspaceId}`}
                            className="inline-flex rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs font-semibold text-slate-200 transition hover:border-white/18 hover:bg-white/[0.05] hover:text-white"
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
                <article
                  key={item.workspaceId}
                  className="rounded-[1.6rem] border border-white/8 bg-[linear-gradient(180deg,rgba(15,23,42,.72),rgba(15,23,42,.56))] p-5 shadow-[0_18px_56px_-38px_rgba(2,6,23,.92)]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-white">{item.workspaceName}</p>
                      <p className="mt-1 text-xs text-slate-500">{item.workspaceId}</p>
                    </div>
                    <StatusBadge status={item.status} />
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <InfoPill label="Plano" value={formatPlanLabel(item.plan)} />
                    <InfoPill label="Owner" value={item.ownerEmail || 'Sem owner'} />
                    <InfoPill label="Período atual" value={formatAdminDate(item.currentPeriodEnd)} />
                    <InfoPill label="MRR" value={formatAdminCurrency(item.estimatedMrr)} />
                  </div>

                  <div className="mt-4">
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300">
                      {item.hasStripeSubscription
                        ? 'Assinatura Stripe'
                        : item.hasStripeCustomer
                          ? 'Cliente Stripe'
                          : 'Sem Stripe'}
                    </span>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedSubscription(item)}
                      className="inline-flex rounded-full border border-emerald-400/18 bg-emerald-500/10 px-3.5 py-2 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-500/15"
                    >
                      Editar assinatura
                    </button>
                    <Link
                      href={`/superadmin/workspaces/${item.workspaceId}`}
                      className="inline-flex rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs font-semibold text-slate-200 transition hover:border-white/18 hover:bg-white/[0.05] hover:text-white"
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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/78 p-4 backdrop-blur-sm xl:items-center">
      <div className="w-full max-w-xl rounded-[1.8rem] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,.96),rgba(9,17,30,.94))] p-6 shadow-[0_34px_120px_-60px_rgba(2,6,23,.98)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Ação administrativa</p>
            <h3 className="mt-2 text-xl font-semibold tracking-[-0.02em] text-white">{subscription.workspaceName}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Ajuste plano, status e período atual com a mesma linguagem visual do painel.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-white/[0.05]"
          >
            Fechar
          </button>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Plano</span>
            <select value={plan} onChange={(event) => setPlan(event.target.value)} className={filterFieldClassName}>
              {PLAN_OPTIONS.filter((option) => option.value !== 'ALL').map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Status</span>
            <select value={status} onChange={(event) => setStatus(event.target.value)} className={filterFieldClassName}>
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
            className={filterFieldClassName}
          />
        </label>

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-full border border-white/10 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.05] disabled:opacity-60"
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

function QuickInsight({
  icon,
  label,
  value,
  description,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-[1.35rem] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,.035),rgba(255,255,255,.02))] p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</p>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-2">{icon}</div>
      </div>
      <p className="mt-3 text-lg font-semibold text-white">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
    </div>
  );
}

function PlanBadge({ plan }: { plan: string }) {
  const toneClassName =
    plan === 'PREMIUM'
      ? 'border-cyan-400/18 bg-cyan-500/10 text-cyan-100'
      : plan === 'PRO'
        ? 'border-emerald-400/18 bg-emerald-500/10 text-emerald-100'
        : 'border-white/10 bg-white/[0.04] text-slate-200';

  return (
    <span className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold ${toneClassName}`}>
      {formatPlanLabel(plan)}
    </span>
  );
}

function StatusBadge({ status }: { status: string | null }) {
  return (
    <span className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold ${getSubscriptionTone(status)}`}>
      {formatSubscriptionStatus(status)}
    </span>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.3rem] border border-white/8 bg-[linear-gradient(180deg,rgba(2,6,23,.42),rgba(2,6,23,.28))] p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function LoadingState({ message }: { message: string }) {
  return (
    <div className="flex min-h-[260px] items-center justify-center">
      <div className="flex items-center gap-3 rounded-[1.4rem] border border-white/10 bg-slate-950/60 px-5 py-4 text-slate-200">
        <Loader2 className="h-5 w-5 animate-spin text-emerald-400" />
        {message}
      </div>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-[1.4rem] border border-rose-500/20 bg-rose-500/10 px-4 py-5 text-sm text-rose-100">
      {message}
    </div>
  );
}

function SuccessState({ message }: { message: string }) {
  return (
    <div className="rounded-[1.4rem] border border-emerald-500/20 bg-emerald-500/10 px-4 py-5 text-sm text-emerald-100">
      {message}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-[1.4rem] border border-dashed border-white/10 bg-slate-950/40 px-4 py-8 text-sm text-slate-400">
      Nenhuma assinatura encontrada para os filtros atuais.
    </div>
  );
}

const filterFieldClassName =
  'mt-2 w-full rounded-[1.25rem] border border-white/10 bg-[linear-gradient(180deg,rgba(2,6,23,.52),rgba(2,6,23,.36))] px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400';
