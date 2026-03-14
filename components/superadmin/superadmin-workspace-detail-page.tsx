'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { Loader2, ShieldCheck, Sparkles, Users2 } from 'lucide-react';

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
      <SuperadminPageHeader
        eyebrow="Workspace Ops"
        title={workspace.name}
        description="Reúna owner, plano, recursos, limites e sinais operacionais em uma visão mais clara para suporte, billing e governança."
        actions={<SuperadminActionLink href="/superadmin/workspaces">Voltar para workspaces</SuperadminActionLink>}
      >
        <div className="flex flex-wrap gap-2"><PlanBadge plan={workspace.plan} /><StatusBadge status={workspace.subscriptionStatus} /><ChannelBadge label={workspace.whatsappStatus || 'DISCONNECTED'} /></div>
        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <SuperadminMetricChip label="Membros" value={formatAdminNumber(workspace.members.length)} />
          <SuperadminMetricChip label="Transações" value={formatAdminNumber(workspace.resourceCounts.transactions)} tone="success" />
          <SuperadminMetricChip label="Carteiras" value={formatAdminNumber(workspace.resourceCounts.wallets)} tone="info" />
          <SuperadminMetricChip label="MRR estimado" value={formatAdminCurrency(estimatedMrr)} />
        </div>
      </SuperadminPageHeader>

      {actionMessage ? <SuccessState message={actionMessage} /> : null}
      {error ? <ErrorState message={error} /> : null}

      <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <SuperadminSectionCard title="Contexto do workspace" description="Leitura rápida do owner, ciclo comercial, canal ativo e limites operacionais aplicados ao ambiente.">
          <SuperadminInfoList columns={2} items={[
            { label: 'ID do workspace', value: workspace.id },
            { label: 'Owner', value: workspace.owner?.name || workspace.owner?.email || 'Não identificado' },
            { label: 'Plano', value: formatPlanLabel(workspace.plan) },
            { label: 'Assinatura', value: formatSubscriptionStatus(workspace.subscriptionStatus) },
            { label: 'Período atual', value: formatAdminDate(workspace.currentPeriodEnd) },
            { label: 'WhatsApp', value: workspace.whatsappPhoneNumber || 'Não configurado' },
            { label: 'Criado em', value: formatAdminDateTime(workspace.createdAt) },
            { label: 'Atualizado em', value: formatAdminDateTime(workspace.updatedAt) },
          ]} />
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <LimitCard label="Limite de transações" value={workspace.limits.transactionsPerMonth === null ? 'Ilimitado' : formatAdminNumber(workspace.limits.transactionsPerMonth)} />
            <LimitCard label="Limite de IA" value={workspace.limits.aiInteractionsPerMonth === null ? 'Ilimitado' : formatAdminNumber(workspace.limits.aiInteractionsPerMonth)} />
            <LimitCard label="Relatórios" value={workspace.limits.reports === 'full' ? 'Completos' : 'Básicos'} />
          </div>
        </SuperadminSectionCard>

        <WorkspaceActionsCard workspace={workspace} isSaving={isSaving} onSubmit={async (payload) => {
          try {
            setIsSaving(true);
            setError(null);
            setActionMessage(null);
            const response = await fetchSuperadminJson<SuperadminWorkspaceUpdateResponse>(`/api/superadmin/workspaces/${workspace.id}`, { method: 'PATCH', body: JSON.stringify(payload) });
            setData((current) => current ? { ...current, workspace: { ...current.workspace, name: response.workspace.name, whatsappStatus: response.workspace.whatsappStatus, whatsappPhoneNumber: response.workspace.whatsappPhoneNumber, preference: response.workspace.preference } } : current);
            setActionMessage('Workspace atualizado com sucesso.');
          } catch (submitError) {
            setError(submitError instanceof Error ? submitError.message : 'Falha ao atualizar workspace.');
          } finally {
            setIsSaving(false);
          }
        }} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SuperadminSectionCard title="Time do workspace" description="Membros, papel dentro do ambiente e contexto comercial em um bloco mais legível para administração.">
          <div className="space-y-3">{workspace.members.map((member) => <div key={member.id} className="rounded-[1.35rem] border border-white/8 bg-[linear-gradient(180deg,rgba(2,6,23,.4),rgba(2,6,23,.22))] px-4 py-4"><div className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-semibold text-white">{member.name || member.email}</p><p className="truncate text-xs text-slate-400">{member.email}</p></div><span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-300">{member.role}</span></div></div>)}</div>
        </SuperadminSectionCard>

        <SuperadminSectionCard title="Última atividade operacional" description="Eventos recentes do workspace para leitura rápida de mudanças, conexão de canal e ações administrativas.">
          <div className="space-y-3">{workspace.recentEvents.length === 0 ? <EmptyState text="Nenhum evento recente encontrado para este workspace." /> : workspace.recentEvents.map((event) => <div key={event.id} className="rounded-[1.35rem] border border-white/8 bg-[linear-gradient(180deg,rgba(2,6,23,.4),rgba(2,6,23,.22))] px-4 py-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-sm font-semibold text-white">{humanizeEventType(event.type)}</p><p className="mt-1 text-xs text-slate-400">{event.userEmail || 'Sistema'}</p></div><span className="shrink-0 text-xs text-slate-500">{formatAdminDateTime(event.createdAt)}</span></div></div>)}</div>
        </SuperadminSectionCard>
      </div>
    </div>
  );
}

function WorkspaceActionsCard({ workspace, isSaving, onSubmit }: { workspace: SuperadminWorkspaceDetailResponse['workspace']; isSaving: boolean; onSubmit: (payload: { name: string; whatsappStatus: string; whatsappPhoneNumber: string | null; onboardingCompleted: boolean; aiSuggestionsEnabled: boolean; objective: string | null; financialProfile: string | null; }) => Promise<void>; }) {
  const [name, setName] = React.useState(workspace.name);
  const [whatsappStatus, setWhatsappStatus] = React.useState(workspace.whatsappStatus || 'DISCONNECTED');
  const [whatsappPhoneNumber, setWhatsappPhoneNumber] = React.useState(workspace.whatsappPhoneNumber || '');
  const [onboardingCompleted, setOnboardingCompleted] = React.useState(workspace.preference?.onboardingCompleted ?? false);
  const [aiSuggestionsEnabled, setAiSuggestionsEnabled] = React.useState(workspace.preference?.aiSuggestionsEnabled ?? true);
  const [objective, setObjective] = React.useState(workspace.preference?.objective || '');
  const [financialProfile, setFinancialProfile] = React.useState(workspace.preference?.financialProfile || '');

  React.useEffect(() => {
    setName(workspace.name); setWhatsappStatus(workspace.whatsappStatus || 'DISCONNECTED'); setWhatsappPhoneNumber(workspace.whatsappPhoneNumber || ''); setOnboardingCompleted(workspace.preference?.onboardingCompleted ?? false); setAiSuggestionsEnabled(workspace.preference?.aiSuggestionsEnabled ?? true); setObjective(workspace.preference?.objective || ''); setFinancialProfile(workspace.preference?.financialProfile || '');
  }, [workspace]);

  return (
    <SuperadminSectionCard title="Ajustes operacionais" description="Atualize nome, estado do canal, onboarding e preferências de IA sem depender do workspace do cliente." action={<Sparkles className="h-5 w-5 text-emerald-300" />}>
      <div className="space-y-4">
        <label className="block"><span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Nome do workspace</span><input value={name} onChange={(event) => setName(event.target.value)} className={fieldClassName} /></label>
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField label="Status do WhatsApp" value={whatsappStatus} onChange={setWhatsappStatus} options={whatsappStatusOptions} />
          <label className="block"><span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Telefone do WhatsApp</span><input value={whatsappPhoneNumber} onChange={(event) => setWhatsappPhoneNumber(event.target.value)} placeholder="+55 11 99999-9999" className={fieldClassName} /></label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <ToggleCard label="Onboarding concluído" checked={onboardingCompleted} onChange={setOnboardingCompleted} icon={<Users2 className="h-4 w-4 text-slate-300" />} />
          <ToggleCard label="Sugestões de IA ativas" checked={aiSuggestionsEnabled} onChange={setAiSuggestionsEnabled} icon={<ShieldCheck className="h-4 w-4 text-emerald-300" />} />
        </div>
        <label className="block"><span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Objetivo</span><input value={objective} onChange={(event) => setObjective(event.target.value)} className={fieldClassName} /></label>
        <label className="block"><span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Perfil financeiro</span><input value={financialProfile} onChange={(event) => setFinancialProfile(event.target.value)} className={fieldClassName} /></label>
        <div className="flex justify-end"><button type="button" disabled={isSaving} onClick={() => void onSubmit({ name, whatsappStatus, whatsappPhoneNumber: whatsappPhoneNumber || null, onboardingCompleted, aiSuggestionsEnabled, objective: objective || null, financialProfile: financialProfile || null })} className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-60">{isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}Salvar ajustes</button></div>
      </div>
    </SuperadminSectionCard>
  );
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }>; }) { return <label className="block"><span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className={fieldClassName}>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>; }
function ToggleCard({ label, checked, onChange, icon }: { label: string; checked: boolean; onChange: (value: boolean) => void; icon: React.ReactNode; }) { return <label className="flex items-center justify-between rounded-[1.25rem] border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white"><span className="flex items-center gap-3">{icon}{label}</span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 rounded border-white/20 bg-slate-900 text-emerald-400" /></label>; }
function LimitCard({ label, value }: { label: string; value: string }) { return <div className="rounded-[1.25rem] border border-white/8 bg-slate-950/45 px-4 py-4"><p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</p><p className="mt-2 text-sm font-semibold text-white">{value}</p></div>; }
function PlanBadge({ plan }: { plan: string }) { return <span className="rounded-full border border-emerald-400/18 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-200">{formatPlanLabel(plan)}</span>; }
function StatusBadge({ status }: { status: string | null }) { return <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${getSubscriptionTone(status)}`}>{formatSubscriptionStatus(status)}</span>; }
function ChannelBadge({ label }: { label: string }) { const normalized = label === 'CONNECTED' ? 'Canal conectado' : label === 'CONNECTING' ? 'Conectando' : 'Sem canal'; return <span className="rounded-full border border-sky-400/18 bg-sky-500/10 px-3 py-1.5 text-xs font-semibold text-sky-200">{normalized}</span>; }
function LoadingState({ label }: { label: string }) { return <div className="flex min-h-[40vh] items-center justify-center rounded-[1.8rem] border border-white/8 bg-[linear-gradient(180deg,rgba(15,23,42,.78),rgba(15,23,42,.62))]"><div className="flex items-center gap-3 text-slate-200"><Loader2 className="h-5 w-5 animate-spin text-emerald-400" />{label}</div></div>; }
function ErrorState({ message }: { message: string }) { return <div className="rounded-[1.5rem] border border-rose-500/20 bg-rose-500/10 px-4 py-5 text-sm text-rose-100">{message}</div>; }
function EmptyState({ text }: { text: string }) { return <div className="rounded-[1.5rem] border border-dashed border-white/10 bg-slate-950/40 px-4 py-8 text-sm text-slate-400">{text}</div>; }
function SuccessState({ message }: { message: string }) { return <div className="rounded-[1.5rem] border border-emerald-500/20 bg-emerald-500/10 px-4 py-5 text-sm text-emerald-100">{message}</div>; }
const fieldClassName = 'mt-2 w-full rounded-[1.2rem] border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-400/60 focus:bg-slate-950';
