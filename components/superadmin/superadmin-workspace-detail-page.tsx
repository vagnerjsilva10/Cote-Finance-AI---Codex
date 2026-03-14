'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import * as React from 'react';
import { ArrowLeft, Building2, Loader2, ShieldAlert } from 'lucide-react';

import { fetchSuperadminJson } from '@/components/superadmin/fetch-superadmin-json';
import {
  formatAdminCurrency,
  formatAdminDate,
  formatAdminDateTime,
  formatAdminNumber,
  formatPlanLabel,
  formatSubscriptionStatus,
  getSubscriptionTone,
  humanizeEventType,
} from '@/components/superadmin/superadmin-utils';
import type { SuperadminWorkspaceDetailResponse, SuperadminWorkspaceUpdateResponse } from '@/lib/superadmin/types';

const whatsappStatusOptions = [
  { value: 'CONNECTED', label: 'Conectado' },
  { value: 'CONNECTING', label: 'Conectando' },
  { value: 'DISCONNECTED', label: 'Desconectado' },
];

export function SuperadminWorkspaceDetailPage() {
  const params = useParams<{ id: string }>();
  const workspaceId = typeof params?.id === 'string' ? params.id : '';

  const [data, setData] = React.useState<SuperadminWorkspaceDetailResponse | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [actionMessage, setActionMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    let isMounted = true;

    const run = async () => {
      if (!workspaceId) {
        setError('Workspace inválido.');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        setActionMessage(null);
        const response = await fetchSuperadminJson<SuperadminWorkspaceDetailResponse>(
          `/api/superadmin/workspaces/${workspaceId}`
        );
        if (isMounted) setData(response);
      } catch (fetchError) {
        if (isMounted) {
          setError(fetchError instanceof Error ? fetchError.message : 'Falha ao carregar o workspace.');
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    void run();
    return () => {
      isMounted = false;
    };
  }, [workspaceId]);

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center rounded-3xl border border-slate-800 bg-slate-900/70">
        <div className="flex items-center gap-3 text-slate-200">
          <Loader2 className="h-5 w-5 animate-spin text-emerald-400" />
          Carregando detalhe do workspace...
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-3xl border border-rose-500/20 bg-slate-900/70 p-8 text-center">
        <ShieldAlert className="mx-auto h-10 w-10 text-rose-400" />
        <h1 className="mt-4 text-2xl font-semibold text-white">Workspace indisponível</h1>
        <p className="mt-3 text-sm leading-7 text-slate-400">{error || 'Falha ao carregar o workspace.'}</p>
        <Link
          href="/superadmin/workspaces"
          className="mt-6 inline-flex rounded-full border border-slate-700 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:text-white"
        >
          Voltar para Workspaces
        </Link>
      </div>
    );
  }

  const { workspace } = data;
  const estimatedMrr = workspace.plan === 'PREMIUM' ? 49 : workspace.plan === 'PRO' ? 29 : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Link
            href="/superadmin/workspaces"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-400 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para Workspaces
          </Link>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-semibold text-white">{workspace.name}</h1>
            <span className="rounded-full border border-slate-700 bg-slate-900/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
              {formatPlanLabel(workspace.plan)}
            </span>
            <span
              className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${getSubscriptionTone(
                workspace.subscriptionStatus
              )}`}
            >
              {formatSubscriptionStatus(workspace.subscriptionStatus)}
            </span>
          </div>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">
            Owner: {workspace.owner?.email || 'Não identificado'} · Criado em {formatAdminDate(workspace.createdAt)} ·
            WhatsApp: {workspace.whatsappPhoneNumber || 'Não configurado'}
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DetailMetricCard label="Membros" value={formatAdminNumber(workspace.members.length)} helper="Usuários vinculados" />
        <DetailMetricCard
          label="Transações"
          value={formatAdminNumber(workspace.resourceCounts.transactions)}
          helper="Volume operacional"
        />
        <DetailMetricCard label="Carteiras" value={formatAdminNumber(workspace.resourceCounts.wallets)} helper="Contas financeiras" />
        <DetailMetricCard label="MRR estimado" value={formatAdminCurrency(estimatedMrr)} helper="Base no plano atual" />
      </div>

      {actionMessage ? (
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-5 text-sm text-emerald-100">
          {actionMessage}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-5 text-sm text-rose-100">{error}</div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Detalhes</p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Field label="ID do workspace" value={workspace.id} />
            <Field label="Owner" value={workspace.owner?.name || workspace.owner?.email || 'Não identificado'} />
            <Field label="Plano" value={formatPlanLabel(workspace.plan)} />
            <Field label="Status da assinatura" value={formatSubscriptionStatus(workspace.subscriptionStatus)} />
            <Field label="Período atual" value={formatAdminDate(workspace.currentPeriodEnd)} />
            <Field label="WhatsApp" value={workspace.whatsappStatus || 'Não conectado'} />
            <Field label="Criado em" value={formatAdminDateTime(workspace.createdAt)} />
            <Field label="Atualizado em" value={formatAdminDateTime(workspace.updatedAt)} />
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <LimitCard
              label="Limite de transações"
              value={
                workspace.limits.transactionsPerMonth === null
                  ? 'Ilimitado'
                  : formatAdminNumber(workspace.limits.transactionsPerMonth)
              }
            />
            <LimitCard
              label="Limite de IA"
              value={
                workspace.limits.aiInteractionsPerMonth === null
                  ? 'Ilimitado'
                  : formatAdminNumber(workspace.limits.aiInteractionsPerMonth)
              }
            />
            <LimitCard label="Relatórios" value={workspace.limits.reports === 'full' ? 'Completos' : 'Básicos'} />
          </div>
        </section>

        <WorkspaceActionsCard
          workspace={workspace}
          isSaving={isSaving}
          onSubmit={async (payload) => {
            try {
              setIsSaving(true);
              setError(null);
              setActionMessage(null);

              const response = await fetchSuperadminJson<SuperadminWorkspaceUpdateResponse>(
                `/api/superadmin/workspaces/${workspace.id}`,
                {
                  method: 'PATCH',
                  body: JSON.stringify(payload),
                }
              );

              setData((current) =>
                current
                  ? {
                      ...current,
                      workspace: {
                        ...current.workspace,
                        name: response.workspace.name,
                        whatsappStatus: response.workspace.whatsappStatus,
                        whatsappPhoneNumber: response.workspace.whatsappPhoneNumber,
                        preference: response.workspace.preference,
                      },
                    }
                  : current
              );
              setActionMessage('Workspace atualizado com sucesso.');
            } catch (submitError) {
              setError(submitError instanceof Error ? submitError.message : 'Falha ao atualizar workspace.');
            } finally {
              setIsSaving(false);
            }
          }}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Membros</p>
              <h2 className="mt-2 text-xl font-semibold text-white">Time do workspace</h2>
            </div>
            <span className="rounded-full border border-slate-700 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
              {formatAdminNumber(workspace.members.length)}
            </span>
          </div>
          <div className="mt-5 space-y-3">
            {workspace.members.map((member) => (
              <div key={member.id} className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">{member.name || member.email}</p>
                    <p className="truncate text-xs text-slate-400">{member.email}</p>
                  </div>
                  <span className="rounded-full border border-slate-700 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-300">
                    {member.role}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Eventos recentes</p>
              <h2 className="mt-2 text-xl font-semibold text-white">Última atividade operacional</h2>
            </div>
            <Building2 className="h-5 w-5 text-slate-500" />
          </div>
          <div className="mt-5 space-y-3">
            {workspace.recentEvents.length === 0 ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-6 text-center text-sm text-slate-400">
                Nenhum evento recente encontrado para este workspace.
              </div>
            ) : (
              workspace.recentEvents.map((event) => (
                <div key={event.id} className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white">{humanizeEventType(event.type)}</p>
                      <p className="mt-1 text-xs text-slate-400">{event.userEmail || 'Sistema'}</p>
                    </div>
                    <span className="shrink-0 text-xs text-slate-500">{formatAdminDateTime(event.createdAt)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function WorkspaceActionsCard({
  workspace,
  isSaving,
  onSubmit,
}: {
  workspace: SuperadminWorkspaceDetailResponse['workspace'];
  isSaving: boolean;
  onSubmit: (payload: {
    name: string;
    whatsappStatus: string;
    whatsappPhoneNumber: string | null;
    onboardingCompleted: boolean;
    aiSuggestionsEnabled: boolean;
    objective: string | null;
    financialProfile: string | null;
  }) => Promise<void>;
}) {
  const [name, setName] = React.useState(workspace.name);
  const [whatsappStatus, setWhatsappStatus] = React.useState(workspace.whatsappStatus || 'DISCONNECTED');
  const [whatsappPhoneNumber, setWhatsappPhoneNumber] = React.useState(workspace.whatsappPhoneNumber || '');
  const [onboardingCompleted, setOnboardingCompleted] = React.useState(workspace.preference?.onboardingCompleted ?? false);
  const [aiSuggestionsEnabled, setAiSuggestionsEnabled] = React.useState(workspace.preference?.aiSuggestionsEnabled ?? true);
  const [objective, setObjective] = React.useState(workspace.preference?.objective || '');
  const [financialProfile, setFinancialProfile] = React.useState(workspace.preference?.financialProfile || '');

  React.useEffect(() => {
    setName(workspace.name);
    setWhatsappStatus(workspace.whatsappStatus || 'DISCONNECTED');
    setWhatsappPhoneNumber(workspace.whatsappPhoneNumber || '');
    setOnboardingCompleted(workspace.preference?.onboardingCompleted ?? false);
    setAiSuggestionsEnabled(workspace.preference?.aiSuggestionsEnabled ?? true);
    setObjective(workspace.preference?.objective || '');
    setFinancialProfile(workspace.preference?.financialProfile || '');
  }, [workspace]);

  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Ações administrativas</p>
      <h2 className="mt-2 text-xl font-semibold text-white">Ajustes operacionais do workspace</h2>
      <p className="mt-3 text-sm leading-7 text-slate-400">
        Atualize nome, estado do canal, onboarding e preferências de IA sem depender do workspace do cliente.
      </p>

      <div className="mt-6 space-y-4">
        <label className="block">
          <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Nome do workspace</span>
          <input value={name} onChange={(event) => setName(event.target.value)} className={fieldClassName} />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Status do WhatsApp</span>
            <select value={whatsappStatus} onChange={(event) => setWhatsappStatus(event.target.value)} className={fieldClassName}>
              {whatsappStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Telefone do WhatsApp</span>
            <input
              value={whatsappPhoneNumber}
              onChange={(event) => setWhatsappPhoneNumber(event.target.value)}
              placeholder="+55 11 99999-9999"
              className={fieldClassName}
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white">
            <span>Onboarding concluído</span>
            <input
              type="checkbox"
              checked={onboardingCompleted}
              onChange={(event) => setOnboardingCompleted(event.target.checked)}
              className="h-4 w-4 rounded border-white/20 bg-slate-900 text-emerald-400"
            />
          </label>
          <label className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white">
            <span>Sugestões de IA ativas</span>
            <input
              type="checkbox"
              checked={aiSuggestionsEnabled}
              onChange={(event) => setAiSuggestionsEnabled(event.target.checked)}
              className="h-4 w-4 rounded border-white/20 bg-slate-900 text-emerald-400"
            />
          </label>
        </div>

        <label className="block">
          <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Objetivo</span>
          <input value={objective} onChange={(event) => setObjective(event.target.value)} className={fieldClassName} />
        </label>

        <label className="block">
          <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Perfil financeiro</span>
          <input value={financialProfile} onChange={(event) => setFinancialProfile(event.target.value)} className={fieldClassName} />
        </label>

        <div className="flex justify-end">
          <button
            type="button"
            disabled={isSaving}
            onClick={() =>
              void onSubmit({
                name,
                whatsappStatus,
                whatsappPhoneNumber: whatsappPhoneNumber || null,
                onboardingCompleted,
                aiSuggestionsEnabled,
                objective: objective || null,
                financialProfile: financialProfile || null,
              })
            }
            className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-60"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Salvar ajustes
          </button>
        </div>
      </div>
    </section>
  );
}

function DetailMetricCard({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">{label}</p>
      <p className="mt-4 text-3xl font-semibold text-white">{value}</p>
      <p className="mt-2 text-sm text-slate-400">{helper}</p>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 break-words text-sm font-medium text-slate-100">{value}</p>
    </div>
  );
}

function LimitCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

const fieldClassName =
  'mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400';
