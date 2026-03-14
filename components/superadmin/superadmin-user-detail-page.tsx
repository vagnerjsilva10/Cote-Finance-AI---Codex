'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowUpRight, Loader2 } from 'lucide-react';

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
const platformRoleOptions = [
  { value: 'user', label: 'Usuário padrão' },
  { value: 'admin', label: 'Admin da plataforma' },
  { value: 'superadmin', label: 'Super Admin' },
];
const lifecycleOptions = [
  { value: 'ACTIVE', label: 'Ativo' },
  { value: 'SUSPENDED', label: 'Suspenso' },
  { value: 'BLOCKED', label: 'Bloqueado' },
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
      <section className="rounded-[1.9rem] border border-slate-800 bg-slate-900/60 p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Usuário</p>
            <h1 className="text-3xl font-black tracking-tight text-white md:text-4xl">{user.name || 'Sem nome'}</h1>
            <p className="text-sm text-slate-300">{user.email}</p>
            <div className="flex flex-wrap gap-2"><PlanBadge label={formatPlanLabel(currentPlan)} /><RoleBadge label={formatPlatformRole(user.platformRole)} /><StatusBadge status={subscriptionStatus} /><LifecycleBadge status={user.lifecycleStatus} /></div>
          </div>
          <Link href="/superadmin/users" className={secondaryActionClassName}>Voltar para usuários</Link>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Workspaces" value={formatAdminNumber(workspaceCount)} helper="ambientes vinculados" />
          <StatCard label="Uso de IA 30d" value={formatAdminNumber(aiUsageCount)} helper="interações recentes" />
          <StatCard label="WhatsApp ativo" value={formatAdminNumber(whatsappWorkspaceCount)} helper="canais conectados" />
          <StatCard label="MRR estimado" value={formatAdminCurrency(estimatedMrr)} helper="base no plano atual" />
        </div>
      </section>

      {actionMessage ? <SuccessState message={actionMessage} /> : null}
      {error ? <ErrorState message={error} /> : null}

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
          <div className="mb-5"><h2 className="text-xl font-black text-white">Identidade e contexto</h2><p className="mt-2 text-sm leading-7 text-slate-400">Dados de identificação, acesso e contexto comercial do usuário.</p></div>
          <div className="grid gap-4 md:grid-cols-2">
            <InfoBlock label="Nome" value={user.name || 'Sem nome'} />
            <InfoBlock label="E-mail" value={user.email} />
            <InfoBlock label="ID do usuário" value={user.id} />
            <InfoBlock label="Plano atual" value={formatPlanLabel(currentPlan)} />
            <InfoBlock label="Assinatura" value={formatSubscriptionStatus(subscriptionStatus)} />
            <InfoBlock label="Status operacional" value={user.lifecycleStatus === 'BLOCKED' ? 'Bloqueado' : user.lifecycleStatus === 'SUSPENDED' ? 'Suspenso' : 'Ativo'} />
            <InfoBlock label="Role da plataforma" value={formatPlatformRole(user.platformRole)} />
            <InfoBlock label="Origem do role" value={formatRoleSource(user.platformRoleSource)} />
            <InfoBlock label="Último acesso" value={user.lastAccessAt ? formatAdminDateTime(user.lastAccessAt) : 'Sem registro'} />
            <InfoBlock label="Fim do período atual" value={user.subscription?.currentPeriodEnd ? formatAdminDate(user.subscription.currentPeriodEnd) : 'Sem período ativo'} />
            <InfoBlock label="Cadastro" value={formatAdminDate(user.createdAt)} />
          </div>
        </section>

        <UserActionsCard user={user} isSaving={isSaving} onSubmit={async (payload) => {
          try {
            setIsSaving(true);
            setError(null);
            setActionMessage(null);
            const response = await fetchSuperadminJson<SuperadminUserUpdateResponse>(`/api/superadmin/users/${user.id}`, { method: 'PATCH', body: JSON.stringify(payload) });
            setData((current) => current ? { ...current, user: { ...current.user, name: response.user.name, profilePlan: response.user.profilePlan, lifecycleStatus: response.user.lifecycleStatus, lifecycleReason: response.user.lifecycleReason, platformRole: response.user.platformRole, platformRoleSource: response.user.platformRoleSource, subscription: response.user.entitlement } } : current);
            setActionMessage('Usuário atualizado com sucesso.');
          } catch (submitError) {
            setError(submitError instanceof Error ? submitError.message : 'Falha ao atualizar usuário.');
          } finally {
            setIsSaving(false);
          }
        }} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
        <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
          <div className="mb-5"><h2 className="text-xl font-black text-white">Workspaces vinculados</h2><p className="mt-2 text-sm leading-7 text-slate-400">Vínculos do usuário com workspaces da plataforma.</p></div>
          <div className="space-y-3">{user.workspaces.length === 0 ? <EmptyState text="Este usuário ainda não participa de nenhum workspace." /> : user.workspaces.map((workspace) => <Link key={workspace.id} href={`/superadmin/workspaces/${workspace.id}`} className="block rounded-2xl border border-slate-800 bg-slate-950/55 px-4 py-4 transition hover:border-emerald-500/30"><div className="flex items-start justify-between gap-3"><div><div className="font-semibold text-white">{workspace.name}</div><div className="mt-1 text-xs text-slate-400">{workspace.role} · {formatPlanLabel(workspace.plan)}</div></div><StatusBadge status={workspace.subscriptionStatus} /></div></Link>)}</div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
          <div className="mb-5"><h2 className="text-xl font-black text-white">Eventos recentes</h2><p className="mt-2 text-sm leading-7 text-slate-400">Leitura rápida da atividade associada a esse usuário.</p></div>
          <div className="space-y-3">{user.recentEvents.length === 0 ? <EmptyState text="Nenhum evento recente associado a este usuário." /> : user.recentEvents.map((event) => <div key={event.id} className="rounded-2xl border border-slate-800 bg-slate-950/55 px-4 py-4"><div className="flex flex-wrap items-center justify-between gap-3"><div className="font-semibold text-white">{humanizeEventType(event.type)}</div><div className="text-xs text-slate-500">{formatAdminDateTime(event.createdAt)}</div></div><div className="mt-2 text-xs text-slate-400">{event.workspaceName || 'Sem workspace associado'}</div></div>)}</div>
        </section>
      </div>
    </div>
  );
}

function UserActionsCard({ user, isSaving, onSubmit }: { user: SuperadminUserDetailResponse['user']; isSaving: boolean; onSubmit: (payload: { name: string | null; profilePlan: string; entitlementPlan: string; entitlementStatus: string; currentPeriodEnd: string | null; platformRole: string; lifecycleStatus: string; lifecycleReason: string | null; }) => Promise<void>; }) {
  const [name, setName] = React.useState(user.name || '');
  const [profilePlan, setProfilePlan] = React.useState(user.profilePlan || 'FREE');
  const [entitlementPlan, setEntitlementPlan] = React.useState(user.subscription?.plan || user.profilePlan || 'FREE');
  const [entitlementStatus, setEntitlementStatus] = React.useState(user.subscription?.status || 'ACTIVE');
  const [currentPeriodEnd, setCurrentPeriodEnd] = React.useState(user.subscription?.currentPeriodEnd ? user.subscription.currentPeriodEnd.slice(0, 10) : '');
  const [platformRole, setPlatformRole] = React.useState(user.platformRole || 'user');
  const [lifecycleStatus, setLifecycleStatus] = React.useState(user.lifecycleStatus || 'ACTIVE');
  const [lifecycleReason, setLifecycleReason] = React.useState(user.lifecycleReason || '');

  React.useEffect(() => {
    setName(user.name || '');
    setProfilePlan(user.profilePlan || 'FREE');
    setEntitlementPlan(user.subscription?.plan || user.profilePlan || 'FREE');
    setEntitlementStatus(user.subscription?.status || 'ACTIVE');
    setCurrentPeriodEnd(user.subscription?.currentPeriodEnd ? user.subscription.currentPeriodEnd.slice(0, 10) : '');
    setPlatformRole(user.platformRole || 'user');
    setLifecycleStatus(user.lifecycleStatus || 'ACTIVE');
    setLifecycleReason(user.lifecycleReason || '');
  }, [user]);

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
      <div className="mb-5"><h2 className="text-xl font-black text-white">Ações administrativas</h2><p className="mt-2 text-sm leading-7 text-slate-400">Ajuste nome, plano, entitlement, role da plataforma e status operacional do usuário.</p></div>
      <div className="space-y-4">
        <label className="block"><span className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Nome</span><input value={name} onChange={(event) => setName(event.target.value)} className={fieldClassName} /></label>
        <div className="grid gap-4 sm:grid-cols-2"><SelectField label="Plano do perfil" value={profilePlan} onChange={setProfilePlan} options={planOptions} /><SelectField label="Plano do entitlement" value={entitlementPlan} onChange={setEntitlementPlan} options={planOptions} /></div>
        <div className="grid gap-4 sm:grid-cols-2"><SelectField label="Role da plataforma" value={platformRole} onChange={setPlatformRole} options={platformRoleOptions} /><SelectField label="Status do entitlement" value={entitlementStatus} onChange={setEntitlementStatus} options={statusOptions} /></div>
        <div className="grid gap-4 sm:grid-cols-2"><SelectField label="Status operacional" value={lifecycleStatus} onChange={(value) => setLifecycleStatus(value as 'ACTIVE' | 'SUSPENDED' | 'BLOCKED')} options={lifecycleOptions} /><label className="block"><span className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Motivo operacional</span><input value={lifecycleReason} onChange={(event) => setLifecycleReason(event.target.value)} className={fieldClassName} placeholder="Opcional. Ex: fraude, chargeback, revisão interna." /></label></div>
        <label className="block"><span className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Período atual</span><input type="date" value={currentPeriodEnd} onChange={(event) => setCurrentPeriodEnd(event.target.value)} className={fieldClassName} /></label>
        <div className="flex justify-end"><button type="button" disabled={isSaving} onClick={() => void onSubmit({ name: name.trim() || null, profilePlan, entitlementPlan, entitlementStatus, currentPeriodEnd: currentPeriodEnd || null, platformRole, lifecycleStatus, lifecycleReason: lifecycleReason.trim() || null })} className={primaryActionClassName}>{isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}Salvar ajustes</button></div>
      </div>
    </section>
  );
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }>; }) { return <label className="block"><span className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className={fieldClassName}>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>; }
function StatCard({ label, value, helper }: { label: string; value: string; helper: string }) { return <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6"><p className="text-sm font-medium text-slate-400">{label}</p><p className="mt-3 text-2xl font-bold tracking-tight text-white">{value}</p><p className="mt-1 text-sm text-slate-500">{helper}</p></div>; }
function InfoBlock({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-4"><p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">{label}</p><p className="mt-2 text-lg font-semibold text-white">{value}</p></div>; }
function formatRoleSource(source: string) { if (source === 'override') return 'Override do Super Admin'; if (source === 'env') return 'Configuração de ambiente'; return 'Padrão da plataforma'; }
function PlanBadge({ label }: { label: string }) { return <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-semibold text-slate-300">{label}</span>; }
function RoleBadge({ label }: { label: string }) { return <span className="rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-200">{label}</span>; }
function StatusBadge({ status }: { status: string | null }) { return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getSubscriptionTone(status)}`}>{formatSubscriptionStatus(status)}</span>; }
function LifecycleBadge({ status }: { status: 'ACTIVE' | 'SUSPENDED' | 'BLOCKED' }) { return <span className={status === 'BLOCKED' ? 'rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-200' : status === 'SUSPENDED' ? 'rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-200' : 'rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200'}>{status === 'BLOCKED' ? 'Bloqueado' : status === 'SUSPENDED' ? 'Suspenso' : 'Ativo'}</span>; }
function LoadingState({ label }: { label: string }) { return <div className="flex min-h-[220px] items-center justify-center"><div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 px-5 py-4 text-slate-200"><Loader2 className="h-5 w-5 animate-spin text-emerald-400" />{label}</div></div>; }
function ErrorState({ message }: { message: string }) { return <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-5 text-sm text-rose-100">{message}</div>; }
function EmptyState({ text }: { text: string }) { return <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/40 px-4 py-6 text-sm text-slate-400">{text}</div>; }
function SuccessState({ message }: { message: string }) { return <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-5 text-sm text-emerald-100">{message}</div>; }
const fieldClassName = 'mt-2 w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-500';
const secondaryActionClassName = 'inline-flex items-center justify-center rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm font-bold text-slate-200 transition-all hover:border-emerald-500 hover:text-white';
const primaryActionClassName = 'inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-bold text-white transition-all hover:bg-emerald-600 disabled:opacity-60';
