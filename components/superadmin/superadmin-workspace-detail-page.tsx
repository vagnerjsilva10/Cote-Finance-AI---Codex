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
import type { SuperadminWorkspaceDetailResponse } from '@/lib/superadmin/types';

export function SuperadminWorkspaceDetailPage() {
  const params = useParams<{ id: string }>();
  const workspaceId = typeof params?.id === 'string' ? params.id : '';

  const [data, setData] = React.useState<SuperadminWorkspaceDetailResponse | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    let isMounted = true;

    const run = async () => {
      if (!workspaceId) {
        setError('Workspace invÃ¡lido.');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
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
        <h1 className="mt-4 text-2xl font-semibold text-white">Workspace indisponÃ­vel</h1>
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
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${getSubscriptionTone(workspace.subscriptionStatus)}`}>
              {formatSubscriptionStatus(workspace.subscriptionStatus)}
            </span>
          </div>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">
            Owner: {workspace.owner?.email || 'NÃ£o identificado'} Â· Criado em {formatAdminDate(workspace.createdAt)} Â·
            Phone number: {workspace.whatsappPhoneNumber || 'NÃ£o configurado'}
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DetailMetricCard label="Membros" value={formatAdminNumber(workspace.members.length)} helper="Usuários vinculados" />
        <DetailMetricCard
          label="TransaÃ§Ãµes"
          value={formatAdminNumber(workspace.resourceCounts.transactions)}
          helper="Volume operacional"
        />
        <DetailMetricCard label="Carteiras" value={formatAdminNumber(workspace.resourceCounts.wallets)} helper="Contas financeiras" />
        <DetailMetricCard label="MRR estimado" value={formatAdminCurrency(estimatedMrr)} helper="Base no plano atual" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Detalhes</p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Field label="ID do workspace" value={workspace.id} />
            <Field label="Owner" value={workspace.owner?.name || workspace.owner?.email || 'NÃ£o identificado'} />
            <Field label="Plano" value={formatPlanLabel(workspace.plan)} />
            <Field label="Status da assinatura" value={formatSubscriptionStatus(workspace.subscriptionStatus)} />
            <Field label="PerÃ­odo atual" value={formatAdminDate(workspace.currentPeriodEnd)} />
            <Field label="WhatsApp" value={workspace.whatsappStatus || 'NÃ£o conectado'} />
            <Field label="Criado em" value={formatAdminDateTime(workspace.createdAt)} />
            <Field label="Atualizado em" value={formatAdminDateTime(workspace.updatedAt)} />
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <LimitCard label="Limite de TransaÃ§Ãµes" value={workspace.limits.transactionsPerMonth === null ? 'Ilimitado' : formatAdminNumber(workspace.limits.transactionsPerMonth)} />
            <LimitCard label="Limite de IA" value={workspace.limits.aiInteractionsPerMonth === null ? 'Ilimitado' : formatAdminNumber(workspace.limits.aiInteractionsPerMonth)} />
            <LimitCard label="RelatÃ³rios" value={workspace.limits.reports === 'full' ? 'Completos' : 'BÃ¡sicos'} />
          </div>
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Recursos</p>
          <div className="mt-5 grid gap-3">
            {[
              { label: 'Onboarding concluÃ­do', value: workspace.preference?.onboardingCompleted ? 'Sim' : 'NÃƒÂ£o' },
              { label: 'SugestÃµes de IA', value: workspace.preference?.aiSuggestionsEnabled ? 'Ativadas' : 'Desativadas' },
              { label: 'Objetivo', value: workspace.preference?.objective || 'NÃ£o definido' },
              { label: 'Perfil financeiro', value: workspace.preference?.financialProfile || 'NÃ£o definido' },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{item.label}</p>
                <p className="mt-2 text-sm font-medium text-slate-100">{item.value}</p>
              </div>
            ))}
          </div>
        </section>
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
              <h2 className="mt-2 text-xl font-semibold text-white">Ãšltima atividade operacional</h2>
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
