'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Loader2, RotateCcw } from 'lucide-react';

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

const whatsappStatusOptions = [{ value: 'CONNECTED', label: 'Conectado' }, { value: 'CONNECTING', label: 'Conectando' }, { value: 'DISCONNECTED', label: 'Desconectado' }];
const lifecycleOptions = [{ value: 'ACTIVE', label: 'Ativo' }, { value: 'SUSPENDED', label: 'Suspenso' }];

export function SuperadminWorkspaceDetailPage() {
  const params = useParams<{ id: string }>();
  const workspaceId = typeof params?.id === 'string' ? params.id : '';
  const [data, setData] = React.useState<SuperadminWorkspaceDetailResponse | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [newMemberEmail, setNewMemberEmail] = React.useState('');
  const [newMemberRole, setNewMemberRole] = React.useState<'MEMBER' | 'ADMIN'>('MEMBER');

  React.useEffect(() => {
    let active = true;
    const run = async () => {
      if (!workspaceId) {
        setError('Workspace invalido.');
        setIsLoading(false);
        return;
      }
      try {
        setIsLoading(true);
        setError(null);
        setMessage(null);
        const response = await fetchSuperadminJson<SuperadminWorkspaceDetailResponse>(`/api/superadmin/workspaces/${workspaceId}`);
        if (active) setData(response);
      } catch (fetchError) {
        if (active) setError(fetchError instanceof Error ? fetchError.message : 'Falha ao carregar o workspace.');
      } finally {
        if (active) setIsLoading(false);
      }
    };
    void run();
    return () => {
      active = false;
    };
  }, [workspaceId]);

  if (isLoading) return <LoadingState label="Carregando detalhe do workspace..." />;
  if (error || !data) return <ErrorState message={error || 'Workspace indisponivel.'} />;

  const { workspace } = data;
  const estimatedMrr = workspace.plan === 'PREMIUM' ? 49 : workspace.plan === 'PRO' ? 29 : 0;

  return (
    <div className="space-y-5">
      {message ? <FeedbackState message={message} success /> : null}
      {error ? <ErrorState message={error} /> : null}

      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-slate-800 bg-slate-950/70 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">Workspace</span>
              <PlanBadge label={formatPlanLabel(workspace.plan)} />
              <StatusBadge status={workspace.subscriptionStatus} />
              <ChannelBadge label={workspace.whatsappStatus || 'DISCONNECTED'} />
              <LifecycleBadge status={workspace.lifecycleStatus} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">{workspace.name}</h1>
              <p className="mt-1 text-sm text-slate-300">{workspace.owner?.name || workspace.owner?.email || 'Sem owner definido'}</p>
            </div>
          </div>
          <Link href="/superadmin/workspaces" className={secondaryActionClassName}>Voltar para workspaces</Link>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Membros" value={formatAdminNumber(workspace.members.length)} />
        <StatCard label="Transacoes" value={formatAdminNumber(workspace.resourceCounts.transactions)} />
        <StatCard label="Carteiras" value={formatAdminNumber(workspace.resourceCounts.wallets)} />
        <StatCard label="MRR estimado" value={formatAdminCurrency(estimatedMrr)} />
      </section>

      <section className="grid gap-3 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-3">
          <CompactSection title="Contexto do workspace" subtitle="Plano, owner, canal e limites operacionais.">
            <div className="grid gap-2 sm:grid-cols-2">
              <InfoPill label="ID" value={workspace.id} />
              <InfoPill label="Owner" value={workspace.owner?.name || workspace.owner?.email || 'Nao identificado'} />
              <InfoPill label="Plano" value={formatPlanLabel(workspace.plan)} />
              <InfoPill label="Assinatura" value={formatSubscriptionStatus(workspace.subscriptionStatus)} />
              <InfoPill label="Status operacional" value={workspace.lifecycleStatus === 'SUSPENDED' ? 'Suspenso' : 'Ativo'} />
              <InfoPill label="Periodo atual" value={formatAdminDate(workspace.currentPeriodEnd)} />
              <InfoPill label="WhatsApp" value={workspace.whatsappPhoneNumber || 'Nao configurado'} />
              <InfoPill label="Atualizado em" value={formatAdminDateTime(workspace.updatedAt)} />
              <InfoPill label="Transacoes/mes" value={workspace.limits.transactionsPerMonth === null ? 'Ilimitado' : formatAdminNumber(workspace.limits.transactionsPerMonth)} />
              <InfoPill label="IA/mes" value={workspace.limits.aiInteractionsPerMonth === null ? 'Ilimitado' : formatAdminNumber(workspace.limits.aiInteractionsPerMonth)} />
              <InfoPill label="Uso transacoes no mes" value={formatAdminNumber(workspace.monthlyUsage.transactionsEffective)} />
              <InfoPill label="Uso IA no mes" value={formatAdminNumber(workspace.monthlyUsage.aiEffective)} />
              <InfoPill label="Relatorios" value={workspace.limits.reports === 'full' ? 'Completos' : 'Basicos'} />
              <InfoPill label="Criado em" value={formatAdminDateTime(workspace.createdAt)} />
            </div>
          </CompactSection>

          <CompactSection title="Time do workspace" subtitle="Membros, ownership e governanca interna.">
            <div className="mb-3 rounded-xl border border-slate-800 bg-slate-950/55 p-4">
              <div className="grid gap-3 md:grid-cols-[1fr_180px_auto]">
                <input value={newMemberEmail} onChange={(event) => setNewMemberEmail(event.target.value)} placeholder="usuario@empresa.com" className={fieldClassName} />
                <SelectField label="Papel inicial" value={newMemberRole} onChange={(value) => setNewMemberRole(value as 'MEMBER' | 'ADMIN')} options={[{ value: 'MEMBER', label: 'Member' }, { value: 'ADMIN', label: 'Admin' }]} />
                <div className="flex items-end">
                  <button
                    type="button"
                    disabled={isSaving || !newMemberEmail.trim()}
                    onClick={async () => {
                      try {
                        setIsSaving(true);
                        setError(null);
                        setMessage(null);
                        const response = await fetchSuperadminJson<{ ok: boolean; member: { id: string; userId: string; name: string | null; email: string; role: string } }>(`/api/superadmin/workspaces/${workspace.id}`, { method: 'PATCH', body: JSON.stringify({ action: 'add-member', memberEmail: newMemberEmail.trim(), memberRole: newMemberRole }) });
                        setData((current) => current ? { ...current, workspace: { ...current.workspace, members: [...current.workspace.members, response.member] } } : current);
                        setNewMemberEmail('');
                        setNewMemberRole('MEMBER');
                        setMessage('Membro adicionado com sucesso.');
                      } catch (submitError) {
                        setError(submitError instanceof Error ? submitError.message : 'Falha ao adicionar membro.');
                      } finally {
                        setIsSaving(false);
                      }
                    }}
                    className={primaryActionClassName}
                  >
                    Adicionar
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-2.5">
              {workspace.members.map((member) => (
                <div key={member.id} className="rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">{member.name || member.email}</p>
                      <p className="truncate text-xs text-slate-400">{member.email}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-300">{member.role}</span>
                      <ActionChip
                        disabled={isSaving || member.role === 'MEMBER'}
                        onClick={async () => {
                          try {
                            setIsSaving(true);
                            setError(null);
                            setMessage(null);
                            const nextRole = member.role === 'OWNER' ? 'ADMIN' : 'MEMBER';
                            await fetchSuperadminJson(`/api/superadmin/workspaces/${workspace.id}`, { method: 'PATCH', body: JSON.stringify({ action: 'update-member-role', memberId: member.id, memberRole: nextRole }) });
                            setData((current) => current ? { ...current, workspace: { ...current.workspace, members: current.workspace.members.map((item) => item.id === member.id ? { ...item, role: nextRole } : item) } } : current);
                            setMessage('Papel do membro atualizado com sucesso.');
                          } catch (submitError) {
                            setError(submitError instanceof Error ? submitError.message : 'Falha ao atualizar papel do membro.');
                          } finally {
                            setIsSaving(false);
                          }
                        }}
                      >
                        Rebaixar
                      </ActionChip>
                      <ActionChip
                        primary
                        disabled={isSaving || member.role === 'OWNER'}
                        onClick={async () => {
                          try {
                            setIsSaving(true);
                            setError(null);
                            setMessage(null);
                            const nextRole = member.role === 'MEMBER' ? 'ADMIN' : 'OWNER';
                            const response = await fetchSuperadminJson<{ ok: boolean; member: { id: string; role: string } }>(`/api/superadmin/workspaces/${workspace.id}`, { method: 'PATCH', body: JSON.stringify({ action: 'update-member-role', memberId: member.id, memberRole: nextRole }) });
                            setData((current) => current ? { ...current, workspace: { ...current.workspace, owner: nextRole === 'OWNER' ? { userId: member.userId, name: member.name, email: member.email } : current.workspace.owner, members: current.workspace.members.map((item) => ({ ...item, role: item.id === response.member.id ? response.member.role : nextRole === 'OWNER' && item.role === 'OWNER' ? 'ADMIN' : item.role })) } } : current);
                            setMessage('Papel do membro atualizado com sucesso.');
                          } catch (submitError) {
                            setError(submitError instanceof Error ? submitError.message : 'Falha ao atualizar papel do membro.');
                          } finally {
                            setIsSaving(false);
                          }
                        }}
                      >
                        {member.role === 'MEMBER' ? 'Promover' : 'Tornar owner'}
                      </ActionChip>
                      <ActionChip
                        disabled={isSaving || member.role === 'OWNER'}
                        onClick={async () => {
                          try {
                            setIsSaving(true);
                            setError(null);
                            setMessage(null);
                            await fetchSuperadminJson(`/api/superadmin/workspaces/${workspace.id}`, { method: 'PATCH', body: JSON.stringify({ action: 'remove-member', memberId: member.id }) });
                            setData((current) => current ? { ...current, workspace: { ...current.workspace, members: current.workspace.members.filter((item) => item.id !== member.id) } } : current);
                            setMessage('Membro removido com sucesso.');
                          } catch (submitError) {
                            setError(submitError instanceof Error ? submitError.message : 'Falha ao remover membro.');
                          } finally {
                            setIsSaving(false);
                          }
                        }}
                      >
                        Remover
                      </ActionChip>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CompactSection>
        </div>

        <div className="space-y-3">
          <WorkspaceActionsCard
            workspace={workspace}
            isSaving={isSaving}
            onResetTransactions={async () => {
              try {
                setIsSaving(true);
                setError(null);
                setMessage(null);
                const response = await fetchSuperadminJson<SuperadminWorkspaceUpdateResponse>(`/api/superadmin/workspaces/${workspace.id}`, {
                  method: 'PATCH',
                  body: JSON.stringify({ action: 'reset-transaction-usage', reason: 'Reset manual pelo Super Admin.' }),
                });
                setData((current) => current ? { ...current, workspace: { ...current.workspace, monthlyUsage: response.monthlyUsage || current.workspace.monthlyUsage } } : current);
                setMessage('Uso mensal de transacoes resetado com sucesso.');
              } catch (submitError) {
                setError(submitError instanceof Error ? submitError.message : 'Falha ao resetar transacoes do workspace.');
              } finally {
                setIsSaving(false);
              }
            }}
            onResetAi={async () => {
              try {
                setIsSaving(true);
                setError(null);
                setMessage(null);
                const response = await fetchSuperadminJson<SuperadminWorkspaceUpdateResponse>(`/api/superadmin/workspaces/${workspace.id}`, {
                  method: 'PATCH',
                  body: JSON.stringify({ action: 'reset-ai-usage', reason: 'Reset manual pelo Super Admin.' }),
                });
                setData((current) => current ? { ...current, workspace: { ...current.workspace, monthlyUsage: response.monthlyUsage || current.workspace.monthlyUsage } } : current);
                setMessage('Uso mensal de IA resetado com sucesso.');
              } catch (submitError) {
                setError(submitError instanceof Error ? submitError.message : 'Falha ao resetar IA do workspace.');
              } finally {
                setIsSaving(false);
              }
            }}
            onSubmit={async (payload) => {
              try {
                setIsSaving(true);
                setError(null);
                setMessage(null);
                const response = await fetchSuperadminJson<SuperadminWorkspaceUpdateResponse>(`/api/superadmin/workspaces/${workspace.id}`, { method: 'PATCH', body: JSON.stringify(payload) });
                setData((current) => current ? { ...current, workspace: { ...current.workspace, name: response.workspace.name, whatsappStatus: response.workspace.whatsappStatus, whatsappPhoneNumber: response.workspace.whatsappPhoneNumber, lifecycleStatus: response.workspace.lifecycleStatus, lifecycleReason: response.workspace.lifecycleReason, owner: response.workspace.ownerUserId ? current.workspace.members.find((member) => member.userId === response.workspace.ownerUserId) ? { userId: response.workspace.ownerUserId, name: current.workspace.members.find((member) => member.userId === response.workspace.ownerUserId)?.name || null, email: current.workspace.members.find((member) => member.userId === response.workspace.ownerUserId)?.email || null } : current.workspace.owner : current.workspace.owner, preference: response.workspace.preference, monthlyUsage: response.monthlyUsage ? response.monthlyUsage : current.workspace.monthlyUsage, members: response.workspace.ownerUserId ? current.workspace.members.map((member) => ({ ...member, role: member.userId === response.workspace.ownerUserId ? 'OWNER' : member.role === 'OWNER' ? 'ADMIN' : member.role })) : current.workspace.members } } : current);
                setMessage('Workspace atualizado com sucesso.');
              } catch (submitError) {
                setError(submitError instanceof Error ? submitError.message : 'Falha ao atualizar workspace.');
              } finally {
                setIsSaving(false);
              }
            }}
          />

          <CompactSection title="Eventos recentes" subtitle="Ultima atividade operacional do ambiente.">
            <div className="space-y-2.5">
              {workspace.recentEvents.length === 0 ? <EmptyState text="Nenhum evento recente encontrado para este workspace." /> : workspace.recentEvents.map((event) => (
                <div key={event.id} className="rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-white">{humanizeEventType(event.type)}</p>
                    <span className="text-xs text-slate-500">{formatAdminDateTime(event.createdAt)}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">{event.userEmail || 'Sistema'}</p>
                </div>
              ))}
            </div>
          </CompactSection>
        </div>
      </section>
    </div>
  );
}

function WorkspaceActionsCard({ workspace, isSaving, onResetTransactions, onResetAi, onSubmit }: { workspace: SuperadminWorkspaceDetailResponse['workspace']; isSaving: boolean; onResetTransactions: () => Promise<void>; onResetAi: () => Promise<void>; onSubmit: (payload: { name: string; whatsappStatus: string; whatsappPhoneNumber: string | null; onboardingCompleted: boolean; aiSuggestionsEnabled: boolean; objective: string | null; financialProfile: string | null; lifecycleStatus: 'ACTIVE' | 'SUSPENDED'; lifecycleReason: string | null; ownerUserId: string | null; }) => Promise<void>; }) {
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
    <CompactSection title="Ajustes operacionais" subtitle="Owner, canal, status e preferencias de IA.">
      <div className="grid gap-3 sm:grid-cols-2">
        <input value={name} onChange={(event) => setName(event.target.value)} className={fieldClassName} placeholder="Nome do workspace" />
        <SelectField label="Owner" value={ownerUserId} onChange={setOwnerUserId} options={workspace.members.map((member) => ({ value: member.userId, label: `${member.name || member.email} · ${member.role}` }))} />
        <SelectField label="Status operacional" value={lifecycleStatus} onChange={(value) => setLifecycleStatus(value as 'ACTIVE' | 'SUSPENDED')} options={lifecycleOptions} />
        <input value={lifecycleReason} onChange={(event) => setLifecycleReason(event.target.value)} placeholder="Motivo operacional" className={fieldClassName} />
        <SelectField label="Status do WhatsApp" value={whatsappStatus} onChange={setWhatsappStatus} options={whatsappStatusOptions} />
        <input value={whatsappPhoneNumber} onChange={(event) => setWhatsappPhoneNumber(event.target.value)} placeholder="+55 11 99999-9999" className={fieldClassName} />
        <ToggleCard label="Onboarding concluido" checked={onboardingCompleted} onChange={setOnboardingCompleted} />
        <ToggleCard label="Sugestoes de IA ativas" checked={aiSuggestionsEnabled} onChange={setAiSuggestionsEnabled} />
        <input value={objective} onChange={(event) => setObjective(event.target.value)} placeholder="Objetivo" className={fieldClassName} />
        <input value={financialProfile} onChange={(event) => setFinancialProfile(event.target.value)} placeholder="Perfil financeiro" className={fieldClassName} />
      </div>
      <div className="mt-4 flex justify-end">
        <button type="button" disabled={isSaving} onClick={() => void onSubmit({ name, whatsappStatus, whatsappPhoneNumber: whatsappPhoneNumber || null, onboardingCompleted, aiSuggestionsEnabled, objective: objective || null, financialProfile: financialProfile || null, lifecycleStatus, lifecycleReason: lifecycleReason || null, ownerUserId: ownerUserId || null })} className={primaryActionClassName}>{isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}Salvar ajustes</button>
      </div>

      <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/55 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">Resets administrativos do mes</h3>
            <p className="mt-1 text-sm text-slate-400">Zere o consumo efetivo de transacoes ou IA sem mexer manualmente no banco.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={isSaving}
              onClick={() => void onResetTransactions()}
              className={secondaryActionClassName}
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
              Resetar transacoes
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={() => void onResetAi()}
              className={secondaryActionClassName}
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
              Resetar IA
            </button>
          </div>
        </div>
      </div>
    </CompactSection>
  );
}

function CompactSection({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) { return <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4"><div className="mb-3"><h2 className="text-base font-bold text-white">{title}</h2><p className="mt-1 text-sm text-slate-400">{subtitle}</p></div>{children}</section>; }
function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }>; }) { return <label className="block"><span className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className={fieldClassName}>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>; }
function ToggleCard({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void; }) { return <label className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2.5 text-sm text-white"><span>{label}</span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 rounded border-white/20 bg-slate-900 text-emerald-400" /></label>; }
function InfoPill({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3"><p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">{label}</p><p className="mt-1.5 text-sm font-semibold text-white">{value}</p></div>; }
function StatCard({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl border border-slate-800 bg-slate-900/50 px-4 py-3.5"><p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">{label}</p><p className="mt-2 text-xl font-bold tracking-tight text-white">{value}</p></div>; }
function ActionChip({ children, onClick, disabled, primary = false }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; primary?: boolean; }) { return <button type="button" disabled={disabled} onClick={onClick} className={primary ? primaryActionClassName : secondaryActionClassName}>{children}</button>; }
function PlanBadge({ label }: { label: string }) { return <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-semibold text-slate-300">{label}</span>; }
function StatusBadge({ status }: { status: string | null }) { return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getSubscriptionTone(status)}`}>{formatSubscriptionStatus(status)}</span>; }
function ChannelBadge({ label }: { label: string }) { const normalized = label === 'CONNECTED' ? 'Canal conectado' : label === 'CONNECTING' ? 'Conectando' : 'Sem canal'; return <span className="rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-200">{normalized}</span>; }
function LifecycleBadge({ status }: { status: 'ACTIVE' | 'SUSPENDED' }) { return <span className={status === 'SUSPENDED' ? 'rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-200' : 'rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200'}>{status === 'SUSPENDED' ? 'Suspenso' : 'Ativo'}</span>; }
function LoadingState({ label }: { label: string }) { return <div className="flex min-h-[220px] items-center justify-center"><div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 px-5 py-4 text-slate-200"><Loader2 className="h-5 w-5 animate-spin text-emerald-400" />{label}</div></div>; }
function ErrorState({ message }: { message: string }) { return <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-5 text-sm text-rose-100">{message}</div>; }
function FeedbackState({ message, success }: { message: string; success: boolean }) { return <div className={`rounded-2xl px-4 py-4 text-sm ${success ? 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-100' : 'border border-rose-500/20 bg-rose-500/10 text-rose-100'}`}>{message}</div>; }
function EmptyState({ text }: { text: string }) { return <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/40 px-4 py-5 text-sm text-slate-400">{text}</div>; }
const fieldClassName = 'mt-2 w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none transition focus:border-emerald-500';
const secondaryActionClassName = 'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm font-bold text-slate-200 transition-all hover:border-emerald-500 hover:text-white disabled:opacity-60';
const primaryActionClassName = 'inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-bold text-slate-950 transition-all hover:bg-emerald-400 disabled:opacity-60';
