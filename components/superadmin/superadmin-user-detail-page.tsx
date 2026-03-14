'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { Loader2, Sparkles } from 'lucide-react';

import { fetchSuperadminJson } from '@/components/superadmin/fetch-superadmin-json';
import {
  SuperadminActionLink,
  SuperadminInfoList,
  SuperadminMetricChip,
  SuperadminPageHeader,
  SuperadminSectionCard,
} from '@/components/superadmin/superadmin-page-primitives';
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
      <SuperadminPageHeader
        eyebrow="User Profile"
        title={user.name || 'Sem nome'}
        description="Acompanhe vínculo comercial, papel de acesso e workspaces relacionados em uma visão mais clara para suporte e governança."
        actions={<SuperadminActionLink href="/superadmin/users">Voltar para usuários</SuperadminActionLink>}
      >
        <div className="flex flex-wrap gap-2">
          <PlanBadge plan={currentPlan} />
          <RoleBadge label={formatPlatformRole(user.platformRole)} />
          <StatusBadge status={subscriptionStatus} />
        </div>
        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <SuperadminMetricChip label="Workspaces" value={formatAdminNumber(workspaceCount)} />
          <SuperadminMetricChip label="Uso de IA 30d" value={formatAdminNumber(aiUsageCount)} tone="success" />
          <SuperadminMetricChip label="WhatsApp ativo" value={formatAdminNumber(whatsappWorkspaceCount)} tone="info" />
          <SuperadminMetricChip label="MRR estimado" value={formatAdminCurrency(estimatedMrr)} />
        </div>
      </SuperadminPageHeader>

      {actionMessage ? <SuccessState message={actionMessage} /> : null}
      {error ? <ErrorState message={error} /> : null}

      <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <SuperadminSectionCard title="Identidade e contexto" description="Dados de identificação, acesso e contexto comercial do usuário em uma estrutura mais escaneável.">
          <SuperadminInfoList
            columns={2}
            items={[
              { label: 'Nome', value: user.name || 'Sem nome' },
              { label: 'E-mail', value: user.email },
              { label: 'ID do usuário', value: user.id },
              { label: 'Plano atual', value: formatPlanLabel(currentPlan) },
              { label: 'Assinatura', value: formatSubscriptionStatus(subscriptionStatus) },
              { label: 'Role da plataforma', value: formatPlatformRole(user.platformRole) },
              { label: 'Origem do role', value: formatRoleSource(user.platformRoleSource) },
              { label: 'Último acesso', value: user.lastAccessAt ? formatAdminDateTime(user.lastAccessAt) : 'Sem registro' },
              { label: 'Fim do período atual', value: user.subscription?.currentPeriodEnd ? formatAdminDate(user.subscription.currentPeriodEnd) : 'Sem período ativo' },
              { label: 'Cadastro', value: formatAdminDate(user.createdAt) },
            ]}
          />
        </SuperadminSectionCard>

        <UserActionsCard user={user} isSaving={isSaving} onSubmit={async (payload) => {
          try {
            setIsSaving(true);
            setError(null);
            setActionMessage(null);
            const response = await fetchSuperadminJson<SuperadminUserUpdateResponse>(`/api/superadmin/users/${user.id}`, { method: 'PATCH', body: JSON.stringify(payload) });
            setData((current) => current ? { ...current, user: { ...current.user, name: response.user.name, profilePlan: response.user.profilePlan, platformRole: response.user.platformRole, platformRoleSource: response.user.platformRoleSource, subscription: response.user.entitlement } } : current);
            setActionMessage('Usuário atualizado com sucesso.');
          } catch (submitError) {
            setError(submitError instanceof Error ? submitError.message : 'Falha ao atualizar usuário.');
          } finally {
            setIsSaving(false);
          }
        }} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
        <SuperadminSectionCard title="Workspaces vinculados" description="Cada vínculo mostra papel do usuário, plano do ambiente e status comercial para acelerar ações de suporte e operação.">
          <div className="space-y-3">
            {user.workspaces.length === 0 ? <EmptyState text="Este usuário ainda não participa de nenhum workspace." /> : user.workspaces.map((workspace) => (
              <a key={workspace.id} href={`/superadmin/workspaces/${workspace.id}`} className="block rounded-[1.35rem] border border-white/8 bg-[linear-gradient(180deg,rgba(2,6,23,.4),rgba(2,6,23,.22))] px-4 py-4 transition hover:border-white/14 hover:bg-white/[0.04]">
                <div className="flex items-start justify-between gap-3">
                  <div><div className="font-semibold text-white">{workspace.name}</div><div className="mt-1 text-xs text-slate-400">{workspace.role} · {formatPlanLabel(workspace.plan)}</div></div>
                  <StatusBadge status={workspace.subscriptionStatus} />
                </div>
              </a>
            ))}
          </div>
        </SuperadminSectionCard>

        <SuperadminSectionCard title="Eventos recentes" description="Leitura rápida dos últimos sinais de atividade ligados a esse usuário, com foco em rastreabilidade e contexto.">
          <div className="space-y-3">
            {user.recentEvents.length === 0 ? <EmptyState text="Nenhum evento recente associado a este usuário." /> : user.recentEvents.map((event) => (
              <div key={event.id} className="rounded-[1.35rem] border border-white/8 bg-[linear-gradient(180deg,rgba(2,6,23,.4),rgba(2,6,23,.22))] px-4 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3"><div className="font-semibold text-white">{humanizeEventType(event.type)}</div><div className="text-xs text-slate-500">{formatAdminDateTime(event.createdAt)}</div></div>
                <div className="mt-2 text-xs text-slate-400">{event.workspaceName || 'Sem workspace associado'}</div>
              </div>
            ))}
          </div>
        </SuperadminSectionCard>
      </div>
    </div>
  );
}

function UserActionsCard({ user, isSaving, onSubmit }: { user: SuperadminUserDetailResponse['user']; isSaving: boolean; onSubmit: (payload: { name: string | null; profilePlan: string; entitlementPlan: string; entitlementStatus: string; currentPeriodEnd: string | null; platformRole: string; }) => Promise<void>; }) {
  const [name, setName] = React.useState(user.name || '');
  const [profilePlan, setProfilePlan] = React.useState(user.profilePlan || 'FREE');
  const [entitlementPlan, setEntitlementPlan] = React.useState(user.subscription?.plan || user.profilePlan || 'FREE');
  const [entitlementStatus, setEntitlementStatus] = React.useState(user.subscription?.status || 'ACTIVE');
  const [currentPeriodEnd, setCurrentPeriodEnd] = React.useState(user.subscription?.currentPeriodEnd ? user.subscription.currentPeriodEnd.slice(0, 10) : '');
  const [platformRole, setPlatformRole] = React.useState(user.platformRole || 'user');

  React.useEffect(() => {
    setName(user.name || '');
    setProfilePlan(user.profilePlan || 'FREE');
    setEntitlementPlan(user.subscription?.plan || user.profilePlan || 'FREE');
    setEntitlementStatus(user.subscription?.status || 'ACTIVE');
    setCurrentPeriodEnd(user.subscription?.currentPeriodEnd ? user.subscription.currentPeriodEnd.slice(0, 10) : '');
    setPlatformRole(user.platformRole || 'user');
  }, [user]);

  return (
    <SuperadminSectionCard title="Ações administrativas" description="Ajuste nome, perfil comercial, entitlement e override de acesso sem quebrar a rastreabilidade do painel." action={<Sparkles className="h-5 w-5 text-emerald-300" />}>
      <div className="space-y-4">
        <label className="block"><span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Nome</span><input value={name} onChange={(event) => setName(event.target.value)} className={fieldClassName} /></label>
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField label="Plano do perfil" value={profilePlan} onChange={setProfilePlan} options={planOptions} />
          <SelectField label="Plano do entitlement" value={entitlementPlan} onChange={setEntitlementPlan} options={planOptions} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField label="Role da plataforma" value={platformRole} onChange={setPlatformRole} options={platformRoleOptions} />
          <SelectField label="Status do entitlement" value={entitlementStatus} onChange={setEntitlementStatus} options={statusOptions} />
        </div>
        <label className="block"><span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Período atual</span><input type="date" value={currentPeriodEnd} onChange={(event) => setCurrentPeriodEnd(event.target.value)} className={fieldClassName} /></label>
        <div className="flex justify-end"><button type="button" disabled={isSaving} onClick={() => void onSubmit({ name: name.trim() || null, profilePlan, entitlementPlan, entitlementStatus, currentPeriodEnd: currentPeriodEnd || null, platformRole })} className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-60">{isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}Salvar ajustes</button></div>
      </div>
    </SuperadminSectionCard>
  );
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }>; }) {
  return <label className="block"><span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className={fieldClassName}>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
}

function formatRoleSource(source: string) { if (source === 'override') return 'Override do Super Admin'; if (source === 'env') return 'Configuração de ambiente'; return 'Padrão da plataforma'; }
function PlanBadge({ plan }: { plan: string }) { return <span className="rounded-full border border-emerald-400/18 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-200">{formatPlanLabel(plan)}</span>; }
function StatusBadge({ status }: { status: string | null }) { return <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${getSubscriptionTone(status)}`}>{formatSubscriptionStatus(status)}</span>; }
function RoleBadge({ label }: { label: string }) { return <span className="rounded-full border border-sky-400/18 bg-sky-500/10 px-3 py-1.5 text-xs font-semibold text-sky-200">{label}</span>; }
function LoadingState({ label }: { label: string }) { return <div className="flex min-h-[40vh] items-center justify-center rounded-[1.8rem] border border-white/8 bg-[linear-gradient(180deg,rgba(15,23,42,.78),rgba(15,23,42,.62))]"><div className="flex items-center gap-3 text-slate-200"><Loader2 className="h-5 w-5 animate-spin text-emerald-400" />{label}</div></div>; }
function ErrorState({ message }: { message: string }) { return <div className="rounded-[1.5rem] border border-rose-500/20 bg-rose-500/10 px-4 py-5 text-sm text-rose-100">{message}</div>; }
function EmptyState({ text }: { text: string }) { return <div className="rounded-[1.5rem] border border-dashed border-white/10 bg-slate-950/40 px-4 py-8 text-sm text-slate-400">{text}</div>; }
function SuccessState({ message }: { message: string }) { return <div className="rounded-[1.5rem] border border-emerald-500/20 bg-emerald-500/10 px-4 py-5 text-sm text-emerald-100">{message}</div>; }
const fieldClassName = 'mt-2 w-full rounded-[1.2rem] border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-400/60 focus:bg-slate-950';
