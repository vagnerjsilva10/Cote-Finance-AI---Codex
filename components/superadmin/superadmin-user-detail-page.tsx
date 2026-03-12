'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';

import { fetchSuperadminJson } from '@/components/superadmin/fetch-superadmin-json';
import {
  formatAdminCurrency,
  formatAdminDate,
  formatAdminDateTime,
  formatAdminNumber,
  formatPlanLabel,
  formatPlatformRole,
  formatSubscriptionStatus,
  getSubscriptionTone,
  humanizeEventType,
} from '@/components/superadmin/superadmin-utils';
import type { SuperadminUserDetailResponse } from '@/lib/superadmin/types';

export function SuperadminUserDetailPage() {
  const params = useParams<{ id: string }>();
  const userId = typeof params?.id === 'string' ? params.id : '';
  const [data, setData] = React.useState<SuperadminUserDetailResponse | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    let active = true;

    const run = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const next = await fetchSuperadminJson<SuperadminUserDetailResponse>(`/api/superadmin/users/${userId}`);
        if (active) setData(next);
      } catch (fetchError) {
        if (active) setError(fetchError instanceof Error ? fetchError.message : 'Falha ao carregar usuÃ¡rio.');
      } finally {
        if (active) setIsLoading(false);
      }
    };

    if (userId) void run();
    return () => {
      active = false;
    };
  }, [userId]);

  if (isLoading) return <LoadingState label="Carregando usuÃ¡rio..." />;
  if (error || !data) return <ErrorState message={error || 'UsuÃ¡rio nÃ£o encontrado.'} />;

  const { user } = data;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
        <Link
          href="/superadmin/users"
          className="inline-flex items-center gap-2 rounded-full border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para Usuários
        </Link>
        <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-300">Super Admin</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">{user.name || 'Sem nome'}</h1>
            <p className="mt-2 text-sm text-slate-300">{user.email}</p>
            <p className="mt-2 text-xs text-slate-500">{user.id}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge label={formatPlanLabel(user.currentPlan)} tone="emerald" />
            <Badge label={formatPlatformRole(user.platformRole)} tone="sky" />
            <Badge label={formatSubscriptionStatus(user.subscriptionStatus)} toneClass={getSubscriptionTone(user.subscriptionStatus)} />
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <InfoCard label="Workspaces" value={formatAdminNumber(user.workspaceCount)} />
        <InfoCard label="Uso de IA" value={formatAdminNumber(user.aiUsageCount)} />
        <InfoCard label="WhatsApp ativo" value={formatAdminNumber(user.whatsappWorkspaceCount)} />
        <InfoCard label="Cadastro" value={formatAdminDate(user.createdAt)} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
          <h2 className="text-lg font-semibold text-white">Dados do usuÃ¡rio</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <InfoRow label="Nome" value={user.name || 'Sem nome'} />
            <InfoRow label="E-mail" value={user.email} />
            <InfoRow label="Plano atual" value={formatPlanLabel(user.currentPlan)} />
            <InfoRow label="Assinatura" value={formatSubscriptionStatus(user.subscriptionStatus)} />
            <InfoRow label="Role da plataforma" value={formatPlatformRole(user.platformRole)} />
            <InfoRow label="Ãšltimo acesso" value={user.lastAccessAt ? formatAdminDateTime(user.lastAccessAt) : 'Sem registro'} />
            <InfoRow
              label="Fim do perÃ­odo atual"
              value={user.subscriptionCurrentPeriodEnd ? formatAdminDate(user.subscriptionCurrentPeriodEnd) : 'Sem perÃƒÂ­odo ativo'}
            />
            <InfoRow label="MRR estimado" value={formatAdminCurrency(user.estimatedMrr)} />
          </div>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
          <h2 className="text-lg font-semibold text-white">Workspaces vinculados</h2>
          <div className="mt-5 space-y-3">
            {user.workspaces.length === 0 ? (
              <EmptyState text="Este usuÃ¡rio ainda nÃ£o participa de nenhum workspace." />
            ) : (
              user.workspaces.map((workspace) => (
                <Link
                  key={workspace.id}
                  href={`/superadmin/workspaces/${workspace.id}`}
                  className="block rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-4 transition hover:border-slate-600"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold text-white">{workspace.name}</div>
                      <div className="mt-1 text-xs text-slate-400">
                        {workspace.role} Â· {formatPlanLabel(workspace.plan)}
                      </div>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getSubscriptionTone(workspace.subscriptionStatus)}`}>
                      {formatSubscriptionStatus(workspace.subscriptionStatus)}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
        <h2 className="text-lg font-semibold text-white">Eventos recentes</h2>
        <div className="mt-5 space-y-3">
          {user.recentEvents.length === 0 ? (
            <EmptyState text="Nenhum evento recente associado a este usuÃ¡rio." />
          ) : (
            user.recentEvents.map((event) => (
              <div key={event.id} className="rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="font-semibold text-white">{humanizeEventType(event.type)}</div>
                  <div className="text-xs text-slate-500">{formatAdminDateTime(event.createdAt)}</div>
                </div>
                <div className="mt-2 text-xs text-slate-400">{event.workspaceName || 'Sem workspace associado'}</div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function LoadingState({ label }: { label: string }) {
  return (
    <div className="flex min-h-[420px] items-center justify-center">
      <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 px-5 py-4 text-slate-200">
        <Loader2 className="h-5 w-5 animate-spin text-emerald-400" />
        {label}
      </div>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-5 text-sm text-rose-100">{message}</div>;
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">{label}</p>
      <p className="mt-4 text-3xl font-semibold text-white">{value}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3">
      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</div>
      <div className="mt-2 text-sm text-slate-200">{value}</div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/40 px-4 py-6 text-sm text-slate-400">{text}</div>;
}

function Badge({ label, tone, toneClass }: { label: string; tone?: 'emerald' | 'sky'; toneClass?: string }) {
  const defaultTone =
    tone === 'sky'
      ? 'bg-sky-500/15 text-sky-200 border border-sky-400/20'
      : 'bg-emerald-500/15 text-emerald-200 border border-emerald-400/20';

  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${toneClass || defaultTone}`}>{label}</span>;
}
