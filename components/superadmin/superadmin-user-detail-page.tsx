'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowUpRight, Copy, KeyRound, Loader2 } from 'lucide-react';

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

const planOptions = [{ value: 'FREE', label: 'Free' }, { value: 'PRO', label: 'Pro' }, { value: 'PREMIUM', label: 'Premium' }];
const statusOptions = [{ value: 'ACTIVE', label: 'Ativo' }, { value: 'PENDING', label: 'Pendente' }, { value: 'CANCELED', label: 'Cancelado' }];
const platformRoleOptions = [{ value: 'user', label: 'Usuario padrao' }, { value: 'admin', label: 'Admin da plataforma' }, { value: 'superadmin', label: 'Super Admin' }];
const lifecycleOptions = [{ value: 'ACTIVE', label: 'Ativo' }, { value: 'SUSPENDED', label: 'Suspenso' }, { value: 'BLOCKED', label: 'Bloqueado' }];

type UserAuthAction = 'generate-magic-link' | 'generate-recovery-link' | 'ban-user' | 'unban-user' | 'soft-delete-user';
type UserUpdatePayload = {
  name: string | null;
  email: string;
  profilePlan: string;
  entitlementPlan: string;
  entitlementStatus: string;
  currentPeriodEnd: string | null;
  platformRole: string;
  lifecycleStatus: string;
  lifecycleReason: string | null;
  authAction?: UserAuthAction;
};

export function SuperadminUserDetailPage() {
  const params = useParams<{ id: string }>();
  const userId = typeof params?.id === 'string' ? params.id : '';
  const [data, setData] = React.useState<SuperadminUserDetailResponse | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [supportLink, setSupportLink] = React.useState<{ type: 'magiclink' | 'recovery'; url: string } | null>(null);

  React.useEffect(() => {
    let active = true;
    const run = async () => {
      try {
        setIsLoading(true);
        setError(null);
        setMessage(null);
        setSupportLink(null);
        const next = await fetchSuperadminJson<SuperadminUserDetailResponse>(`/api/superadmin/users/${userId}`);
        if (active) setData(next);
      } catch (fetchError) {
        if (active) setError(fetchError instanceof Error ? fetchError.message : 'Falha ao carregar usuario.');
      } finally {
        if (active) setIsLoading(false);
      }
    };
    if (userId) void run();
    return () => {
      active = false;
    };
  }, [userId]);

  if (isLoading) return <LoadingState label="Carregando usuario..." />;
  if (error || !data) return <ErrorState message={error || 'Usuario nao encontrado.'} />;

  const { user } = data;
  const currentPlan = user.subscription?.plan || user.profilePlan || 'FREE';
  const subscriptionStatus = user.subscription?.status || null;
  const estimatedMrr = currentPlan === 'PREMIUM' ? 49 : currentPlan === 'PRO' ? 29 : 0;

  return (
    <div className="space-y-5">
      {message ? <FeedbackState message={message} success /> : null}
      {error ? <ErrorState message={error} /> : null}

      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-slate-800 bg-slate-950/70 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">Usuario</span>
              <PlanBadge label={formatPlanLabel(currentPlan)} />
              <RoleBadge label={formatPlatformRole(user.platformRole)} />
              <StatusBadge status={subscriptionStatus} />
              <LifecycleBadge status={user.lifecycleStatus} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">{user.name || 'Sem nome'}</h1>
              <p className="mt-1 text-sm text-slate-300">{user.email}</p>
            </div>
          </div>
          <Link href="/superadmin/users" className={secondaryActionClassName}>Voltar para usuarios</Link>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Workspaces" value={formatAdminNumber(user.workspaces.length)} />
        <StatCard label="Uso IA 30d" value={formatAdminNumber(user.usage.aiUsageLast30Days)} />
        <StatCard label="Ultimo acesso" value={user.lastAccessAt ? formatAdminDate(user.lastAccessAt) : 'Sem registro'} />
        <StatCard label="MRR estimado" value={formatAdminCurrency(estimatedMrr)} />
      </section>

      <section className="grid gap-3 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-3">
          <CompactSection title="Identidade e contexto" subtitle="Dados essenciais e estado operacional.">
            <div className="grid gap-2 sm:grid-cols-2">
              <InfoPill label="ID" value={user.id} />
              <InfoPill label="Plano" value={formatPlanLabel(currentPlan)} />
              <InfoPill label="Assinatura" value={formatSubscriptionStatus(subscriptionStatus)} />
              <InfoPill label="Role" value={formatPlatformRole(user.platformRole)} />
              <InfoPill label="Origem do role" value={formatRoleSource(user.platformRoleSource)} />
              <InfoPill label="Fim do periodo" value={user.subscription?.currentPeriodEnd ? formatAdminDate(user.subscription.currentPeriodEnd) : 'Sem periodo ativo'} />
              <InfoPill label="Cadastro" value={formatAdminDate(user.createdAt)} />
              <InfoPill label="Status operacional" value={user.lifecycleStatus === 'BLOCKED' ? 'Bloqueado' : user.lifecycleStatus === 'SUSPENDED' ? 'Suspenso' : 'Ativo'} />
            </div>
          </CompactSection>

          <CompactSection title="Workspaces vinculados" subtitle="Ambientes associados ao usuario.">
            <div className="space-y-2.5">
              {user.workspaces.length === 0 ? <EmptyState text="Este usuario ainda nao participa de nenhum workspace." /> : user.workspaces.map((workspace) => (
                <Link key={workspace.id} href={`/superadmin/workspaces/${workspace.id}`} className="block rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 transition hover:border-emerald-500/30">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold text-white">{workspace.name}</div>
                      <div className="mt-0.5 text-xs text-slate-400">{workspace.role} · {formatPlanLabel(workspace.plan)}</div>
                    </div>
                    <StatusBadge status={workspace.subscriptionStatus} />
                  </div>
                </Link>
              ))}
            </div>
          </CompactSection>
        </div>

        <div className="space-y-3">
          <UserActionsCard
            user={user}
            authAdminConfigured={data.capabilities.authAdminConfigured}
            isSaving={isSaving}
            onSubmit={async (payload) => {
              try {
                setIsSaving(true);
                setError(null);
                setMessage(null);
                setSupportLink(null);
                const response = await fetchSuperadminJson<SuperadminUserUpdateResponse>(`/api/superadmin/users/${user.id}`, { method: 'PATCH', body: JSON.stringify(payload) });
                setData((current) => current ? { ...current, user: { ...current.user, name: response.user.name, email: response.user.email, profilePlan: response.user.profilePlan, lifecycleStatus: response.user.lifecycleStatus, lifecycleReason: response.user.lifecycleReason, platformRole: response.user.platformRole, platformRoleSource: response.user.platformRoleSource, subscription: response.user.entitlement } } : current);
                setSupportLink(response.supportLink || null);
                setMessage(getActionSuccessMessage(payload.authAction));
              } catch (submitError) {
                setError(submitError instanceof Error ? submitError.message : 'Falha ao atualizar usuario.');
              } finally {
                setIsSaving(false);
              }
            }}
          />

          {supportLink ? (
            <CompactSection title="Link de suporte" subtitle="Acesso assistido gerado pelo Super Admin.">
              <div className="flex flex-col gap-3">
                <div className="overflow-x-auto rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-xs text-slate-300">{supportLink.url}</div>
                <div className="flex justify-end">
                  <button type="button" onClick={() => navigator.clipboard.writeText(supportLink.url)} className="inline-flex items-center gap-2 rounded-xl border border-sky-400/30 bg-sky-500/10 px-4 py-2 text-sm font-bold text-sky-100 transition hover:bg-sky-500/20">
                    <Copy className="h-4 w-4" />
                    Copiar link
                  </button>
                </div>
              </div>
            </CompactSection>
          ) : null}

          <CompactSection title="Eventos recentes" subtitle="Ultima atividade associada a esta conta.">
            <div className="space-y-2.5">
              {user.recentEvents.length === 0 ? <EmptyState text="Nenhum evento recente associado a este usuario." /> : user.recentEvents.map((event) => (
                <div key={event.id} className="rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-semibold text-white">{humanizeEventType(event.type)}</div>
                    <div className="text-xs text-slate-500">{formatAdminDateTime(event.createdAt)}</div>
                  </div>
                  <div className="mt-1 text-xs text-slate-400">{event.workspaceName || 'Sem workspace associado'}</div>
                </div>
              ))}
            </div>
          </CompactSection>
        </div>
      </section>
    </div>
  );
}

function UserActionsCard({ user, authAdminConfigured, isSaving, onSubmit }: { user: SuperadminUserDetailResponse['user']; authAdminConfigured: boolean; isSaving: boolean; onSubmit: (payload: UserUpdatePayload) => Promise<void>; }) {
  const [name, setName] = React.useState(user.name || '');
  const [email, setEmail] = React.useState(user.email || '');
  const [profilePlan, setProfilePlan] = React.useState(user.profilePlan || 'FREE');
  const [entitlementPlan, setEntitlementPlan] = React.useState(user.subscription?.plan || user.profilePlan || 'FREE');
  const [entitlementStatus, setEntitlementStatus] = React.useState(user.subscription?.status || 'ACTIVE');
  const [currentPeriodEnd, setCurrentPeriodEnd] = React.useState(user.subscription?.currentPeriodEnd ? user.subscription.currentPeriodEnd.slice(0, 10) : '');
  const [platformRole, setPlatformRole] = React.useState(user.platformRole || 'user');
  const [lifecycleStatus, setLifecycleStatus] = React.useState(user.lifecycleStatus || 'ACTIVE');
  const [lifecycleReason, setLifecycleReason] = React.useState(user.lifecycleReason || '');

  React.useEffect(() => {
    setName(user.name || '');
    setEmail(user.email || '');
    setProfilePlan(user.profilePlan || 'FREE');
    setEntitlementPlan(user.subscription?.plan || user.profilePlan || 'FREE');
    setEntitlementStatus(user.subscription?.status || 'ACTIVE');
    setCurrentPeriodEnd(user.subscription?.currentPeriodEnd ? user.subscription.currentPeriodEnd.slice(0, 10) : '');
    setPlatformRole(user.platformRole || 'user');
    setLifecycleStatus(user.lifecycleStatus || 'ACTIVE');
    setLifecycleReason(user.lifecycleReason || '');
  }, [user]);

  const basePayload: UserUpdatePayload = { name: name.trim() || null, email: email.trim(), profilePlan, entitlementPlan, entitlementStatus, currentPeriodEnd: currentPeriodEnd || null, platformRole, lifecycleStatus, lifecycleReason: lifecycleReason.trim() || null };

  return (
    <CompactSection title="Acoes administrativas" subtitle="Identidade, plano, role e suporte de autenticacao.">
      <div className="grid gap-3 sm:grid-cols-2">
        <input value={name} onChange={(event) => setName(event.target.value)} className={fieldClassName} placeholder="Nome" />
        <input value={email} onChange={(event) => setEmail(event.target.value)} className={fieldClassName} placeholder="E-mail" />
        <SelectField label="Plano do perfil" value={profilePlan} onChange={setProfilePlan} options={planOptions} />
        <SelectField label="Plano do entitlement" value={entitlementPlan} onChange={setEntitlementPlan} options={planOptions} />
        <SelectField label="Role da plataforma" value={platformRole} onChange={setPlatformRole} options={platformRoleOptions} />
        <SelectField label="Status do entitlement" value={entitlementStatus} onChange={setEntitlementStatus} options={statusOptions} />
        <SelectField label="Status operacional" value={lifecycleStatus} onChange={(value) => setLifecycleStatus(value as 'ACTIVE' | 'SUSPENDED' | 'BLOCKED')} options={lifecycleOptions} />
        <input value={lifecycleReason} onChange={(event) => setLifecycleReason(event.target.value)} className={fieldClassName} placeholder="Motivo operacional" />
        <div className="sm:col-span-2">
          <label className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">Periodo atual</label>
          <input type="date" value={currentPeriodEnd} onChange={(event) => setCurrentPeriodEnd(event.target.value)} className={fieldClassName} />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <button type="button" disabled={isSaving} onClick={() => void onSubmit(basePayload)} className={primaryActionClassName}>{isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}Salvar ajustes</button>
      </div>

      <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/55 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white">Suporte de acesso</h3>
            <p className="mt-1 text-sm text-slate-400">Links assistidos, bloqueio, reativacao e remocao de acesso.</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] ${authAdminConfigured ? 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-200' : 'border border-amber-500/20 bg-amber-500/10 text-amber-200'}`}>{authAdminConfigured ? 'Ativo' : 'Pendente'}</span>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <ActionButton disabled={isSaving || !authAdminConfigured} onClick={() => void onSubmit({ ...basePayload, authAction: 'generate-magic-link' })}><KeyRound className="h-4 w-4" />Magic link</ActionButton>
          <ActionButton disabled={isSaving || !authAdminConfigured} onClick={() => void onSubmit({ ...basePayload, authAction: 'generate-recovery-link' })}><ArrowUpRight className="h-4 w-4" />Recuperacao</ActionButton>
          <ActionButton danger="warning" disabled={isSaving || !authAdminConfigured} onClick={() => void onSubmit({ ...basePayload, authAction: 'ban-user', lifecycleStatus: 'BLOCKED' })}>Bloquear</ActionButton>
          <ActionButton disabled={isSaving || !authAdminConfigured} onClick={() => void onSubmit({ ...basePayload, authAction: 'unban-user', lifecycleStatus: 'ACTIVE' })}>Reativar</ActionButton>
          <ActionButton danger="danger" disabled={isSaving || !authAdminConfigured} onClick={() => void onSubmit({ ...basePayload, authAction: 'soft-delete-user', lifecycleStatus: 'BLOCKED' })}>Remover acesso</ActionButton>
        </div>
      </div>
    </CompactSection>
  );
}

function CompactSection({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4"><div className="mb-3"><h2 className="text-base font-bold text-white">{title}</h2><p className="mt-1 text-sm text-slate-400">{subtitle}</p></div>{children}</section>;
}
function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }>; }) {
  return <label className="block"><span className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className={fieldClassName}>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
}
function InfoPill({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3"><p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">{label}</p><p className="mt-1.5 text-sm font-semibold text-white">{value}</p></div>; }
function StatCard({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl border border-slate-800 bg-slate-900/50 px-4 py-3.5"><p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">{label}</p><p className="mt-2 text-xl font-bold tracking-tight text-white">{value}</p></div>; }
function formatRoleSource(source: string) { if (source === 'override') return 'Override do Super Admin'; if (source === 'env') return 'Configuracao de ambiente'; return 'Padrao da plataforma'; }
function getActionSuccessMessage(action?: UserAuthAction) { if (action === 'generate-magic-link') return 'Magic link gerado com sucesso.'; if (action === 'generate-recovery-link') return 'Link de recuperacao gerado com sucesso.'; if (action === 'ban-user') return 'Acesso de autenticacao bloqueado com sucesso.'; if (action === 'unban-user') return 'Acesso de autenticacao reativado com sucesso.'; if (action === 'soft-delete-user') return 'Acesso de autenticacao removido com sucesso.'; return 'Usuario atualizado com sucesso.'; }
function ActionButton({ children, onClick, disabled, danger }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; danger?: 'warning' | 'danger'; }) {
  const className = danger === 'danger' ? 'inline-flex items-center justify-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm font-bold text-rose-100 transition-all hover:bg-rose-500/20 disabled:opacity-60' : danger === 'warning' ? 'inline-flex items-center justify-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm font-bold text-amber-100 transition-all hover:bg-amber-500/20 disabled:opacity-60' : secondaryActionClassName;
  return <button type="button" disabled={disabled} onClick={onClick} className={className}>{children}</button>;
}
function PlanBadge({ label }: { label: string }) { return <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-semibold text-slate-300">{label}</span>; }
function RoleBadge({ label }: { label: string }) { return <span className="rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-200">{label}</span>; }
function StatusBadge({ status }: { status: string | null }) { return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getSubscriptionTone(status)}`}>{formatSubscriptionStatus(status)}</span>; }
function LifecycleBadge({ status }: { status: 'ACTIVE' | 'SUSPENDED' | 'BLOCKED' }) { return <span className={status === 'BLOCKED' ? 'rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-200' : status === 'SUSPENDED' ? 'rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-200' : 'rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200'}>{status === 'BLOCKED' ? 'Bloqueado' : status === 'SUSPENDED' ? 'Suspenso' : 'Ativo'}</span>; }
function LoadingState({ label }: { label: string }) { return <div className="flex min-h-[220px] items-center justify-center"><div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 px-5 py-4 text-slate-200"><Loader2 className="h-5 w-5 animate-spin text-emerald-400" />{label}</div></div>; }
function ErrorState({ message }: { message: string }) { return <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-5 text-sm text-rose-100">{message}</div>; }
function FeedbackState({ message, success }: { message: string; success: boolean }) { return <div className={`rounded-2xl px-4 py-4 text-sm ${success ? 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-100' : 'border border-rose-500/20 bg-rose-500/10 text-rose-100'}`}>{message}</div>; }
function EmptyState({ text }: { text: string }) { return <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/40 px-4 py-5 text-sm text-slate-400">{text}</div>; }
const fieldClassName = 'mt-2 w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none transition focus:border-emerald-500';
const secondaryActionClassName = 'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm font-bold text-slate-200 transition-all hover:border-emerald-500 hover:text-white disabled:opacity-60';
const primaryActionClassName = 'inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-bold text-slate-950 transition-all hover:bg-emerald-400 disabled:opacity-60';
