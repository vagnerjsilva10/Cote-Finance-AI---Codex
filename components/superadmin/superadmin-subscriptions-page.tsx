'use client';

import * as React from 'react';
import Link from 'next/link';
import { CreditCard, Loader2, Search, ShieldCheck, Sparkles } from 'lucide-react';

import { fetchSuperadminJson, useDebouncedValue } from '@/components/superadmin/fetch-superadmin-json';
import {
  SuperadminActionLink,
  SuperadminGhostAction,
  SuperadminMetricChip,
  SuperadminPageHeader,
  SuperadminSectionCard,
} from '@/components/superadmin/superadmin-page-primitives';
import {
  formatAdminCurrency,
  formatAdminDate,
  formatAdminNumber,
  formatPlanLabel,
  formatSubscriptionStatus,
  getSubscriptionTone,
} from '@/components/superadmin/superadmin-utils';
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
    <div className="space-y-6 xl:space-y-7">
      <SuperadminPageHeader
        eyebrow="Billing"
        title="Assinaturas"
        description="Acompanhe receita recorrente, saúde da base pagante e movimentações críticas do billing em uma visão mais nobre, limpa e pronta para operação executiva."
        actions={
          <div className="flex flex-wrap gap-3">
            <SuperadminGhostAction href="/superadmin/plans">Ver catálogo</SuperadminGhostAction>
            <SuperadminActionLink href="/superadmin/reports" primary>
              Abrir relatórios
            </SuperadminActionLink>
          </div>
        }
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.3fr_.9fr_.9fr_.9fr]">
          <SuperadminMetricChip label="Assinaturas" value={formatAdminNumber(metrics?.total || 0)} />
          <SuperadminMetricChip label="Pagantes" value={formatAdminNumber(metrics?.paying || 0)} tone="success" />
          <SuperadminMetricChip label="Pendentes" value={formatAdminNumber(metrics?.pending || 0)} tone="info" />
          <SuperadminMetricChip label="MRR estimado" value={formatAdminCurrency(metrics?.estimatedMrr || 0)} />
        </div>
      </SuperadminPageHeader>

      {actionMessage ? <SuccessState message={actionMessage} /> : null}
      {error ? <ErrorState message={error} /> : null}

      <SuperadminSectionCard
        title="Operação de billing"
        description="Busque por workspace, owner ou identificador e cruze rapidamente plano, status e sinais de estabilidade antes de agir."
      >
        <div className="grid gap-4 xl:grid-cols-[1.35fr_.48fr_.48fr]">
          <label className="block">
            <span className="field-label">Buscar</span>
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
            <span className="field-label">Plano</span>
            <select value={plan} onChange={(event) => setPlan(event.target.value)} className={filterFieldClassName}>
              {PLAN_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="field-label">Status</span>
            <select value={status} onChange={(event) => setStatus(event.target.value)} className={filterFieldClassName}>
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          <InsightTile
            icon={<Sparkles className="h-4 w-4 text-emerald-300" />}
            label="Base pagante"
            value={`${formatAdminNumber(metrics?.paying || 0)} contas`}
            description="Workspaces em Pro e Premium concentrados em uma leitura de valor."
          />
          <InsightTile
            icon={<ShieldCheck className="h-4 w-4 text-sky-300" />}
            label="Estabilidade"
            value={`${formatAdminNumber(metrics?.active || 0)} ativas`}
            description="Assinaturas saudáveis com menor fricção operacional no ciclo atual."
          />
          <InsightTile
            icon={<CreditCard className="h-4 w-4 text-slate-200" />}
            label="Atenção de churn"
            value={`${formatAdminNumber(metrics?.canceled || 0)} canceladas`}
            description="Contas que pedem revisão de retenção, suporte e recuperação de receita."
          />
        </div>
      </SuperadminSectionCard>

      <SuperadminSectionCard
        title="Base de assinaturas"
        description={
          data
            ? `${formatAdminNumber(data.total)} assinatura(s) encontradas. A nova tabela privilegia leitura executiva, comparação rápida e ações limpas.`
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
            <div className="hidden overflow-hidden rounded-[1.85rem] border border-white/[0.07] bg-[linear-gradient(180deg,rgba(8,14,25,.72),rgba(8,14,25,.52))] xl:block">
              <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
                <thead className="bg-white/[0.03] text-[10px] uppercase tracking-[0.28em] text-slate-500">
                  <tr>
                    <th className="px-7 py-4 font-semibold">Workspace</th>
                    <th className="px-7 py-4 font-semibold">Owner</th>
                    <th className="px-7 py-4 font-semibold">Plano</th>
                    <th className="px-7 py-4 font-semibold">Status</th>
                    <th className="px-7 py-4 font-semibold">Período</th>
                    <th className="px-7 py-4 font-semibold">Stripe</th>
                    <th className="px-7 py-4 font-semibold">MRR</th>
                    <th className="px-7 py-4 font-semibold text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {data.subscriptions.map((item, index) => (
                    <tr key={item.workspaceId} className="group transition hover:bg-white/[0.02]">
                      <td className={rowCellClassName(index)}>
                        <div className="min-w-[230px]">
                          <div className="font-semibold text-white">{item.workspaceName}</div>
                          <div className="mt-1.5 text-[11px] text-slate-500">{item.workspaceId}</div>
                        </div>
                      </td>
                      <td className={rowCellClassName(index)}>
                        <div className="min-w-[190px] text-sm text-slate-300">{item.ownerEmail || 'Sem owner'}</div>
                      </td>
                      <td className={rowCellClassName(index)}>
                        <PlanBadge plan={item.plan} />
                      </td>
                      <td className={rowCellClassName(index)}>
                        <StatusBadge status={item.status} />
                      </td>
                      <td className={rowCellClassName(index)}>
                        <div className="text-sm text-slate-300">{formatAdminDate(item.currentPeriodEnd)}</div>
                      </td>
                      <td className={rowCellClassName(index)}>
                        <div className="text-sm text-slate-400">
                          {item.hasStripeSubscription ? 'Assinatura Stripe' : item.hasStripeCustomer ? 'Cliente Stripe' : 'Sem vínculo'}
                        </div>
                      </td>
                      <td className={rowCellClassName(index)}>
                        <div className="text-sm font-semibold text-white">{formatAdminCurrency(item.estimatedMrr)}</div>
                      </td>
                      <td className={rowCellClassName(index)}>
                        <div className="flex justify-end gap-2.5">
                          <button
                            type="button"
                            onClick={() => setSelectedSubscription(item)}
                            className="inline-flex rounded-full border border-emerald-400/16 bg-emerald-400/[0.08] px-3.5 py-2 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-400/[0.12]"
                          >
                            Editar
                          </button>
                          <Link href={`/superadmin/workspaces/${item.workspaceId}`} className={secondaryActionClassName}>
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
                  className="rounded-[1.75rem] border border-white/[0.07] bg-[linear-gradient(180deg,rgba(10,17,30,.86),rgba(10,17,30,.7))] p-5 shadow-[0_24px_70px_-48px_rgba(2,6,23,.95)]"
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
                    <InfoPill label="Período" value={formatAdminDate(item.currentPeriodEnd)} />
                    <InfoPill label="MRR" value={formatAdminCurrency(item.estimatedMrr)} />
                  </div>

                  <div className="mt-4">
                    <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-xs text-slate-300">
                      {item.hasStripeSubscription ? 'Assinatura Stripe' : item.hasStripeCustomer ? 'Cliente Stripe' : 'Sem Stripe'}
                    </span>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2.5">
                    <button
                      type="button"
                      onClick={() => setSelectedSubscription(item)}
                      className="inline-flex rounded-full border border-emerald-400/16 bg-emerald-400/[0.08] px-3.5 py-2 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-400/[0.12]"
                    >
                      Editar assinatura
                    </button>
                    <Link href={`/superadmin/workspaces/${item.workspaceId}`} className={secondaryActionClassName}>
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

              const response = await fetchSuperadminJson<SuperadminSubscriptionUpdateResponse>('/api/superadmin/subscriptions', {
                method: 'PATCH',
                body: JSON.stringify(payload),
              });

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
  onSubmit: (payload: { workspaceId: string; plan: string; status: string; currentPeriodEnd: string | null }) => Promise<void>;
}) {
  const [plan, setPlan] = React.useState(subscription.plan);
  const [status, setStatus] = React.useState(subscription.status);
  const [currentPeriodEnd, setCurrentPeriodEnd] = React.useState(subscription.currentPeriodEnd ? subscription.currentPeriodEnd.slice(0, 10) : '');

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/82 p-4 backdrop-blur-md xl:items-center">
      <div className="w-full max-w-xl rounded-[2rem] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(8,15,28,.98),rgba(8,15,28,.92))] p-6 shadow-[0_42px_120px_-70px_rgba(2,6,23,.98)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-500">Ação administrativa</p>
            <h3 className="mt-3 text-[1.45rem] font-semibold tracking-[-0.04em] text-white">{subscription.workspaceName}</h3>
            <p className="mt-2 text-sm leading-7 text-slate-400">Ajuste plano, status e período atual com o mesmo acabamento visual do painel.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-white/[0.05]"
          >
            Fechar
          </button>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="field-label">Plano</span>
            <select value={plan} onChange={(event) => setPlan(event.target.value)} className={filterFieldClassName}>
              {PLAN_OPTIONS.filter((option) => option.value !== 'ALL').map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="field-label">Status</span>
            <select value={status} onChange={(event) => setStatus(event.target.value)} className={filterFieldClassName}>
              {STATUS_OPTIONS.filter((option) => option.value !== 'ALL').map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label className="block sm:col-span-2">
            <span className="field-label">Período atual</span>
            <input type="date" value={currentPeriodEnd} onChange={(event) => setCurrentPeriodEnd(event.target.value)} className={filterFieldClassName} />
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} disabled={isSaving} className={secondaryActionClassName}>Cancelar</button>
          <button
            type="button"
            disabled={isSaving}
            onClick={() => void onSubmit({ workspaceId: subscription.workspaceId, plan, status, currentPeriodEnd: currentPeriodEnd || null })}
            className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-60"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Salvar ajustes
          </button>
        </div>
      </div>
    </div>
  );
}

function InsightTile({ icon, label, value, description }: { icon: React.ReactNode; label: string; value: string; description: string }) {
  return (
    <div className="rounded-[1.5rem] border border-white/[0.07] bg-slate-950/35 px-4 py-4">
      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-500">{icon}{label}</div>
      <p className="mt-3 text-sm font-semibold text-white">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
    </div>
  );
}

function PlanBadge({ plan }: { plan: string }) {
  const tone = plan === 'PREMIUM' ? 'border-sky-400/16 bg-sky-400/[0.08] text-sky-100' : plan === 'PRO' ? 'border-emerald-400/16 bg-emerald-400/[0.08] text-emerald-100' : 'border-white/[0.08] bg-white/[0.03] text-slate-200';
  return <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${tone}`}>{formatPlanLabel(plan)}</span>;
}

function StatusBadge({ status }: { status: string | null }) {
  return <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${getSubscriptionTone(status)}`}>{formatSubscriptionStatus(status)}</span>;
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.25rem] border border-white/[0.07] bg-slate-950/40 px-4 py-3.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function LoadingState({ message }: { message: string }) {
  return (
    <div className="flex min-h-[260px] items-center justify-center">
      <div className="flex items-center gap-3 rounded-[1.5rem] border border-white/[0.08] bg-slate-950/55 px-5 py-4 text-slate-200">
        <Loader2 className="h-5 w-5 animate-spin text-emerald-400" />
        {message}
      </div>
    </div>
  );
}

function SuccessState({ message }: { message: string }) {
  return <div className="rounded-[1.6rem] border border-emerald-500/18 bg-emerald-400/[0.08] px-4 py-5 text-sm text-emerald-100">{message}</div>;
}

function ErrorState({ message }: { message: string }) {
  return <div className="rounded-[1.6rem] border border-rose-500/18 bg-rose-500/10 px-4 py-5 text-sm text-rose-100">{message}</div>;
}

function EmptyState() {
  return <div className="rounded-[1.6rem] border border-dashed border-white/[0.08] bg-slate-950/35 px-4 py-8 text-sm text-slate-400">Nenhuma assinatura encontrada com os filtros atuais.</div>;
}

function rowCellClassName(index: number) {
  return `px-7 py-5 align-top ${index > 0 ? 'border-t border-white/[0.06]' : ''}`;
}

const filterFieldClassName =
  'w-full rounded-[1.35rem] border border-white/[0.08] bg-slate-950/45 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-400/45 focus:bg-slate-950';

const secondaryActionClassName =
  'inline-flex rounded-full border border-white/[0.08] bg-white/[0.03] px-3.5 py-2 text-xs font-semibold text-slate-200 transition hover:border-white/[0.16] hover:bg-white/[0.05] hover:text-white';
