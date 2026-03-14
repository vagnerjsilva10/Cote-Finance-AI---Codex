'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

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
const lifecycleOptions = [
  { value: 'ACTIVE', label: 'Ativo' },
  { value: 'SUSPENDED', label: 'Suspenso' },
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
        const response = await fetchSuperadminJson<SuperadminWorkspaceDetailResponse>(`/api/superadmin/workspaces/${workspaceId}`);
        if (isMounted) setData(response);
      } catch (fetchError) {
        if (isMounted) setError(fetchError instanceof Error ? fetchError.message : 'Falha ao carregar o workspace.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    void run();
    return () => {
      isMounted = false;
    };
  }, [workspaceId]);

  if (isLoading) return <LoadingState label="Carregando detalhe do workspace..." />;
  if (error || !data) return <ErrorState message={error || 'Workspace indisponível.'} />;

  const { workspace } = data;
  const estimatedMrr = workspace.plan === 'PREMIUM' ? 49 : workspace.plan === 'PRO' ? 29 : 0;

  return (
    <div className="space-y-6">
      <section className="rounded-[1.9rem] border border-slate-800 bg-slate-900/60 p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Workspace</p>
            <h1 className="text-3xl font-black tracking-tight text-white md:text-4xl">{workspace.name}</h1>
            <div className="flex flex-wrap gap-2"><PlanBadge label={formatPlanLabel(workspace.plan)} /><StatusBadge status={workspace.subscriptionStatus} /><ChannelBadge label={workspace.whatsappStatus || 'DISCONNECTED'} /><LifecycleBadge status={workspace.lifecycleStatus} /></div>
          </div>
          <Link href="/superadmin/workspaces" className={secondaryActionClassName}>Voltar para workspaces</Link>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Membros" value={formatAdminNumber(workspace.members.length)} helper="usuários vinculados" />
          <StatCard label="Transações" value={formatAdminNumber(workspace.resourceCounts.transactions)} helper="volume operacional" />
          <StatCard label="Carteiras" value={formatAdminNumber(workspace.resourceCounts.wallets)} helper="contas financeiras" />
          <StatCard label="MRR estimado" value={formatAdminCurrency(estimatedMrr)} helper="base no plano atual" />
        </div>
      </section>

      {actionMessage ? <SuccessState message={actionMessage} /> : null}
      {error ? <ErrorState message={error} /> : null}

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
          <div className="mb-5"><h2 className="text-xl font-black text-white">Contexto do workspace</h2><p className="mt-2 text-sm leading-7 text-slate-400">Owner, ciclo comercial, canal ativo e limites operacionais do ambiente.</p></div>
          <div className="grid gap-4 md:grid-cols-2">
            <InfoBlock label="ID do workspace" value={workspace.id} />
            <InfoBlock label="Owner" value={workspace.owner?.name || workspace.owner?.email || 'Não identificado'} />
            <InfoBlock label="Plano" value={formatPlanLabel(workspace.plan)} />
            <InfoBlock label="Assinatura" value={formatSubscriptionStatus(workspace.subscriptionStatus)} />
            <InfoBlock label="Status operacional" value={workspace.lifecycleStatus === 'SUSPENDED' ? 'Suspenso' : 'Ativo'} />
            <InfoBlock label="Período atual" value={formatAdminDate(workspace.currentPeriodEnd)} />
            <InfoBlock label="WhatsApp" value={workspace.whatsappPhoneNumber || 'Não configurado'} />
            <InfoBlock label="Criado em" value={formatAdminDateTime(workspace.createdAt)} />
            <InfoBlock label="Atualizado em" value={formatAdminDateTime(workspace.updatedAt)} />
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <InfoBlock label="Limite de transações" value={workspace.limits.transactionsPerMonth === null ? 'Ilimitado' : formatAdminNumber(workspace.limits.transactionsPerMonth)} />
            <InfoBlock label="Limite de IA" value={workspace.limits.aiInteractionsPerMonth === null ? 'Ilimitado' : formatAdminNumber(workspace.limits.aiInteractionsPerMonth)} />
            <InfoBlock label="Relatórios" value={workspace.limits.reports === 'full' ? 'Completos' : 'Básicos'} />
          </div>
        </section>

        <WorkspaceActionsCard workspace={workspace} isSaving={isSaving} onSubmit={async (payload) => {
          try {
            setIsSaving(true);
            setError(null);
            setActionMessage(null);
            const response = await fetchSuperadminJson<SuperadminWorkspaceUpdateResponse>(`/api/superadmin/workspaces/${workspace.id}`, { method: 'PATCH', body: JSON.stringify(payload) });
            setData((current) =>
              current
                ? {
                    ...current,
                    workspace: {
                      ...current.workspace,
                      name: response.workspace.name,
                      whatsappStatus: response.workspace.whatsappStatus,
                      whatsappPhoneNumber: response.workspace.whatsappPhoneNumber,
                      lifecycleStatus: response.workspace.lifecycleStatus,
                      lifecycleReason: response.workspace.lifecycleReason,
                      owner:
                        response.workspace.ownerUserId
                          ? current.workspace.members.find((member) => member.userId === response.workspace.ownerUserId)
                            ? {
                                userId: response.workspace.ownerUserId,
                                name:
                                  current.workspace.members.find((member) => member.userId === response.workspace.ownerUserId)?.name ||
                                  null,
                                email:
                                  current.workspace.members.find((member) => member.userId === response.workspace.ownerUserId)?.email ||
                                  null,
                              }
                            : current.workspace.owner
                          : current.workspace.owner,
                      preference: response.workspace.preference,
                      members: response.workspace.ownerUserId
                        ? current.workspace.members.map((member) => ({
                            ...member,
                            role:
                              member.userId === response.workspace.ownerUserId
                                ? 'OWNER'
                                : member.role === 'OWNER'
                                  ? 'ADMIN'
                                  : member.role,
                          }))
                        : current.workspace.members,
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
        }} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
          <div className="mb-5"><h2 className="text-xl font-black text-white">Time do workspace</h2><p className="mt-2 text-sm leading-7 text-slate-400">Membros vinculados ao ambiente.</p></div>
          <div className="space-y-3">{workspace.members.map((member) => <div key={member.id} className="rounded-2xl border border-slate-800 bg-slate-950/55 px-4 py-4"><div className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-semibold text-white">{member.name || member.email}</p><p className="truncate text-xs text-slate-400">{member.email}</p></div><span className="rounded-full border border-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-300">{member.role}</span></div></div>)}</div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
          <div className="mb-5"><h2 className="text-xl font-black text-white">Última atividade operacional</h2><p className="mt-2 text-sm leading-7 text-slate-400">Eventos recentes do workspace.</p></div>
          <div className="space-y-3">{workspace.recentEvents.length === 0 ? <EmptyState text="Nenhum evento recente encontrado para este workspace." /> : workspace.recentEvents.map((event) => <div key={event.id} className="rounded-2xl border border-slate-800 bg-slate-950/55 px-4 py-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-sm font-semibold text-white">{humanizeEventType(event.type)}</p><p className="mt-1 text-xs text-slate-400">{event.userEmail || 'Sistema'}</p></div><span className="shrink-0 text-xs text-slate-500">{formatAdminDateTime(event.createdAt)}</span></div></div>)}</div>
        </section>
      </div>
    </div>
  );
}

function WorkspaceActionsCard({ workspace, isSaving, onSubmit }: { workspace: SuperadminWorkspaceDetailResponse['workspace']; isSaving: boolean; onSubmit: (payload: { name: string; whatsappStatus: string; whatsappPhoneNumber: string | null; onboardingCompleted: boolean; aiSuggestionsEnabled: boolean; objective: string | null; financialProfile: string | null; lifecycleStatus: 'ACTIVE' | 'SUSPENDED'; lifecycleReason: string | null; ownerUserId: string | null; }) => Promise<void>; }) {
  const [name, setName] = React.useState(workspace.name);
  const [whatsappStatus, setWhatsappStatus] = React.useState(workspace.whatsappStatus || 'DISCONNECTED');
  const [whatsappPhoneNumber, setWhatsappPhoneNumber] = React.useState(workspace.whatsappPhoneNumber || '');
  const [onboardingCompleted, setOnboardingCompleted] = React.useState(workspace.preference?.onboardingCompleted ?? false);
  const [aiSuggestionsEnabled, setAiSuggestionsEnabled] = React.useState(workspace.preference?.aiSuggestionsEnabled ?? true);
  const [objective, setObjective] = React.useState(workspace.preference?.objective || '');
  const [financialProfile, setFinancialProfile] = React.useState(workspace.preference?.financialProfile || '');
  const [lifecycleStatus, setLifecycleStatus] = React.useState<'ACTIVE' | 'SUSPENDED'>(workspace.lifecycleStatus);
  const [lifecycleReason, setLifecycleReason] = React.useState(workspace.lifecycleReason || '');
  const [ownerUserId, setOwnerUserId] = React.useState(workspace.owner?.userId || '');

  React.useEffect(() => {
    setName(workspace.name);
    setWhatsappStatus(workspace.whatsappStatus || 'DISCONNECTED');
    setWhatsappPhoneNumber(workspace.whatsappPhoneNumber || '');
    setOnboardingCompleted(workspace.preference?.onboardingCompleted ?? false);
    setAiSuggestionsEnabled(workspace.preference?.aiSuggestionsEnabled ?? true);
    setObjective(workspace.preference?.objective || '');
    setFinancialProfile(workspace.preference?.financialProfile || '');
    setLifecycleStatus(workspace.lifecycleStatus);
    setLifecycleReason(workspace.lifecycleReason || '');
    setOwnerUserId(workspace.owner?.userId || '');
  }, [workspace]);

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
      <div className="mb-5"><h2 className="text-xl font-black text-white">Ajustes operacionais</h2><p className="mt-2 text-sm leading-7 text-slate-400">Atualize nome, owner, status do canal, governança operacional e preferências de IA.</p></div>
      <div className="space-y-4">
        <label className="block"><span className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Nome do workspace</span><input value={name} onChange={(event) => setName(event.target.value)} className={fieldClassName} /></label>
        <div className="grid gap-4 sm:grid-cols-2"><SelectField label="Owner do workspace" value={ownerUserId} onChange={setOwnerUserId} options={workspace.members.map((member) => ({ value: member.userId, label: `${member.name || member.email} · ${member.role}` }))} /><SelectField label="Status operacional" value={lifecycleStatus} onChange={(value) => setLifecycleStatus(value as 'ACTIVE' | 'SUSPENDED')} options={lifecycleOptions} /></div>
        <label className="block"><span className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Motivo operacional</span><input value={lifecycleReason} onChange={(event) => setLifecycleReason(event.target.value)} placeholder="Opcional. Ex: atraso recorrente, revisão interna, fraude." className={fieldClassName} /></label>
        <div className="grid gap-4 sm:grid-cols-2"><SelectField label="Status do WhatsApp" value={whatsappStatus} onChange={setWhatsappStatus} options={whatsappStatusOptions} /><label className="block"><span className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Telefone do WhatsApp</span><input value={whatsappPhoneNumber} onChange={(event) => setWhatsappPhoneNumber(event.target.value)} placeholder="+55 11 99999-9999" className={fieldClassName} /></label></div>
        <div className="grid gap-4 sm:grid-cols-2"><ToggleCard label="Onboarding concluído" checked={onboardingCompleted} onChange={setOnboardingCompleted} /><ToggleCard label="Sugestões de IA ativas" checked={aiSuggestionsEnabled} onChange={setAiSuggestionsEnabled} /></div>
        <label className="block"><span className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Objetivo</span><input value={objective} onChange={(event) => setObjective(event.target.value)} className={fieldClassName} /></label>
        <label className="block"><span className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Perfil financeiro</span><input value={financialProfile} onChange={(event) => setFinancialProfile(event.target.value)} className={fieldClassName} /></label>
        <div className="flex justify-end"><button type="button" disabled={isSaving} onClick={() => void onSubmit({ name, whatsappStatus, whatsappPhoneNumber: whatsappPhoneNumber || null, onboardingCompleted, aiSuggestionsEnabled, objective: objective || null, financialProfile: financialProfile || null, lifecycleStatus, lifecycleReason: lifecycleReason || null, ownerUserId: ownerUserId || null })} className={primaryActionClassName}>{isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}Salvar ajustes</button></div>
      </div>
    </section>
  );
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }>; }) { return <label className="block"><span className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className={fieldClassName}>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>; }
function ToggleCard({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void; }) { return <label className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-white"><span>{label}</span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 rounded border-white/20 bg-slate-900 text-emerald-400" /></label>; }
function StatCard({ label, value, helper }: { label: string; value: string; helper: string }) { return <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6"><p className="text-sm font-medium text-slate-400">{label}</p><p className="mt-3 text-2xl font-bold tracking-tight text-white">{value}</p><p className="mt-1 text-sm text-slate-500">{helper}</p></div>; }
function InfoBlock({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-4"><p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">{label}</p><p className="mt-2 text-lg font-semibold text-white">{value}</p></div>; }
function PlanBadge({ label }: { label: string }) { return <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-semibold text-slate-300">{label}</span>; }
function StatusBadge({ status }: { status: string | null }) { return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getSubscriptionTone(status)}`}>{formatSubscriptionStatus(status)}</span>; }
function ChannelBadge({ label }: { label: string }) { const normalized = label === 'CONNECTED' ? 'Canal conectado' : label === 'CONNECTING' ? 'Conectando' : 'Sem canal'; return <span className="rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-200">{normalized}</span>; }
function LifecycleBadge({ status }: { status: 'ACTIVE' | 'SUSPENDED' }) { return <span className={status === 'SUSPENDED' ? 'rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-200' : 'rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200'}>{status === 'SUSPENDED' ? 'Suspenso' : 'Ativo'}</span>; }
function LoadingState({ label }: { label: string }) { return <div className="flex min-h-[220px] items-center justify-center"><div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 px-5 py-4 text-slate-200"><Loader2 className="h-5 w-5 animate-spin text-emerald-400" />{label}</div></div>; }
function ErrorState({ message }: { message: string }) { return <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-5 text-sm text-rose-100">{message}</div>; }
function EmptyState({ text }: { text: string }) { return <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/40 px-4 py-6 text-sm text-slate-400">{text}</div>; }
function SuccessState({ message }: { message: string }) { return <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-5 text-sm text-emerald-100">{message}</div>; }
const fieldClassName = 'mt-2 w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-500';
const secondaryActionClassName = 'inline-flex items-center justify-center rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm font-bold text-slate-200 transition-all hover:border-emerald-500 hover:text-white';
const primaryActionClassName = 'inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-bold text-white transition-all hover:bg-emerald-600 disabled:opacity-60';
