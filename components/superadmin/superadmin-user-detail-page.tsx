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
import type { SuperadminUserDetailResponse, SuperadminUserUpdateResponse } from '@/lib/superadmin/types';

const planOptions = [
  { value: 'FREE', label: 'Free' },
  { value: 'PRO', label: 'Pro' },
  { value: 'PREMIUM', label: 'Premium' },
];

const statusOptions = [
  { value: 'ACTIVE', label: 'Ativo' },
  { value: 'PENDING', label: 'Pendente' },
  { value: 'CANCELED', label: 'Cancelado' },
];

export function SuperadminUserDetailPage() {
  const params = useParams<{ id: string }>();
  const userId = typeof params?.id === 'string' ? params.id : '';
  const [data, setData] = React.useState<SuperadminUserDetailResponse | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [actionMessage, setActionMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;

    const run = async () => {
      try {
        setIsLoading(true);
        setError(null);
        setActionMessage(null);
        const next = await fetchSuperadminJson<SuperadminUserDetailResponse>(`/api/superadmin/users/${userId}`);
        if (active) setData(next);
      } catch (fetchError) {
        if (active) setError(fetchError instanceof Error ? fetchError.message : 'Falha ao carregar usuário.');
      } finally {
        if (active) setIsLoading(false);
      }
    };

    if (userId) void run();
    return () => {
      active = false;
    };
  }, [userId]);

  if (isLoading) return <LoadingState label="Carregando usuário..." />;
  if (error || !data) return <ErrorState message={error || 'Usuário não encontrado.'} />;

  const { user } = data;
  const currentPlan = user.subscription?.plan || user.profilePlan || 'FREE';
  const subscriptionStatus = user.subscription?.status || null;
  const workspaceCount = user.workspaces.length;
  const aiUsageCount = user.usage.aiUsageLast30Days;
  const whatsappWorkspaceCount = user.workspaces.filter((workspace) => workspace.whatsappStatus === 'CONNECTED').length;
  const estimatedMrr = currentPlan === 'PREMIUM' ? 49 : currentPlan === 'PRO' ? 29 : 0;

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
            <Badge label={formatPlanLabel(currentPlan)} tone="emerald" />
            <Badge label={formatPlatformRole(user.platformRole)} tone="sky" />
            <Badge label={formatSubscriptionStatus(subscriptionStatus)} toneClass={getSubscriptionTone(subscriptionStatus)} />
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <InfoCard label="Workspaces" value={formatAdminNumber(workspaceCount)} />
        <InfoCard label="Uso de IA" value={formatAdminNumber(aiUsageCount)} />
        <InfoCard label="WhatsApp ativo" value={formatAdminNumber(whatsappWorkspaceCount)} />
        <InfoCard label="Cadastro" value={formatAdminDate(user.createdAt)} />
      </section>

      {actionMessage ? (
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-5 text-sm text-emerald-100">
          {actionMessage}
        </div>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
          <h2 className="text-lg font-semibold text-white">Dados do usuário</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <InfoRow label="Nome" value={user.name || 'Sem nome'} />
            <InfoRow label="E-mail" value={user.email} />
            <InfoRow label="Plano atual" value={formatPlanLabel(currentPlan)} />
            <InfoRow label="Assinatura" value={formatSubscriptionStatus(subscriptionStatus)} />
            <InfoRow label="Role da plataforma" value={formatPlatformRole(user.platformRole)} />
            <InfoRow label="Último acesso" value={user.lastAccessAt ? formatAdminDateTime(user.lastAccessAt) : 'Sem registro'} />
            <InfoRow
              label="Fim do período atual"
              value={user.subscription?.currentPeriodEnd ? formatAdminDate(user.subscription.currentPeriodEnd) : 'Sem período ativo'}
            />
            <InfoRow label="MRR estimado" value={formatAdminCurrency(estimatedMrr)} />
          </div>
        </div>

        <UserActionsCard
          user={user}
          isSaving={isSaving}
          onSubmit={async (payload) => {
            try {
              setIsSaving(true);
              setError(null);
              setActionMessage(null);

              const response = await fetchSuperadminJson<SuperadminUserUpdateResponse>(
                `/api/superadmin/users/${user.id}`,
                {
                  method: 'PATCH',
                  body: JSON.stringify(payload),
                }
              );

              setData((current) =>
                current
                  ? {
                      ...current,
                      user: {
                        ...current.user,
                        name: response.user.name,
                        profilePlan: response.user.profilePlan,
                        platformRole: response.user.platformRole,
                        subscription: response.user.entitlement,
                      },
                    }
                  : current
              );
              setActionMessage('Usuário atualizado com sucesso.');
            } catch (submitError) {
              setError(submitError instanceof Error ? submitError.message : 'Falha ao atualizar usuário.');
            } finally {
              setIsSaving(false);
            }
          }}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
          <h2 className="text-lg font-semibold text-white">Workspaces vinculados</h2>
          <div className="mt-5 space-y-3">
            {user.workspaces.length === 0 ? (
              <EmptyState text="Este usuário ainda não participa de nenhum workspace." />
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
                        {workspace.role} · {formatPlanLabel(workspace.plan)}
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

        <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
          <h2 className="text-lg font-semibold text-white">Eventos recentes</h2>
          <div className="mt-5 space-y-3">
            {user.recentEvents.length === 0 ? (
              <EmptyState text="Nenhum evento recente associado a este usuário." />
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
      </section>
    </div>
  );
}

function UserActionsCard({
  user,
  isSaving,
  onSubmit,
}: {
  user: SuperadminUserDetailResponse['user'];
  isSaving: boolean;
  onSubmit: (payload: {
    name: string | null;
    profilePlan: string;
    entitlementPlan: string;
    entitlementStatus: string;
    currentPeriodEnd: string | null;
  }) => Promise<void>;
}) {
  const [name, setName] = React.useState(user.name || '');
  const [profilePlan, setProfilePlan] = React.useState(user.profilePlan || 'FREE');
  const [entitlementPlan, setEntitlementPlan] = React.useState(user.subscription?.plan || user.profilePlan || 'FREE');
  const [entitlementStatus, setEntitlementStatus] = React.useState(user.subscription?.status || 'ACTIVE');
  const [currentPeriodEnd, setCurrentPeriodEnd] = React.useState(
    user.subscription?.currentPeriodEnd ? user.subscription.currentPeriodEnd.slice(0, 10) : ''
  );

  React.useEffect(() => {
    setName(user.name || '');
    setProfilePlan(user.profilePlan || 'FREE');
    setEntitlementPlan(user.subscription?.plan || user.profilePlan || 'FREE');
    setEntitlementStatus(user.subscription?.status || 'ACTIVE');
    setCurrentPeriodEnd(user.subscription?.currentPeriodEnd ? user.subscription.currentPeriodEnd.slice(0, 10) : '');
  }, [user]);

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
      <h2 className="text-lg font-semibold text-white">Ações administrativas</h2>
      <p className="mt-3 text-sm leading-7 text-slate-400">
        Ajuste nome, plano do perfil e entitlement do usuário. O papel da plataforma continua controlado por
        <span className="font-medium text-slate-200"> `SUPERADMIN_EMAILS` </span>e
        <span className="font-medium text-slate-200"> `ADMIN_EMAILS`</span>.
      </p>

      <div className="mt-5 space-y-4">
        <label className="block">
          <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Nome</span>
          <input value={name} onChange={(event) => setName(event.target.value)} className={fieldClassName} />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Plano do perfil</span>
            <select value={profilePlan} onChange={(event) => setProfilePlan(event.target.value)} className={fieldClassName}>
              {planOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Plano do entitlement</span>
            <select value={entitlementPlan} onChange={(event) => setEntitlementPlan(event.target.value)} className={fieldClassName}>
              {planOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Status do entitlement</span>
            <select value={entitlementStatus} onChange={(event) => setEntitlementStatus(event.target.value)} className={fieldClassName}>
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Período atual</span>
            <input type="date" value={currentPeriodEnd} onChange={(event) => setCurrentPeriodEnd(event.target.value)} className={fieldClassName} />
          </label>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            disabled={isSaving}
            onClick={() =>
              void onSubmit({
                name: name.trim() || null,
                profilePlan,
                entitlementPlan,
                entitlementStatus,
                currentPeriodEnd: currentPeriodEnd || null,
              })
            }
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

const fieldClassName =
  'mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400';
