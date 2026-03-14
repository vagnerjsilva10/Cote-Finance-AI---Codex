'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowUpRight, Building2, CreditCard, Loader2, Plus, Search, Sparkles } from 'lucide-react';

import { fetchSuperadminJson, useDebouncedValue } from '@/components/superadmin/fetch-superadmin-json';
import {
  formatAdminCurrency,
  formatAdminDate,
  formatAdminNumber,
  formatPlanLabel,
  formatSubscriptionStatus,
  getSubscriptionTone,
} from '@/components/superadmin/superadmin-utils';
import type { SuperadminWorkspacesResponse } from '@/lib/superadmin/types';

function getWorkspaceEstimatedMrr(plan: string) {
  if (plan === 'PREMIUM') return 49;
  if (plan === 'PRO') return 29;
  return 0;
}

function getWorkspaceFeatureLabels(workspace: SuperadminWorkspacesResponse['workspaces'][number]) {
  const labels: string[] = [];
  if (workspace.whatsappStatus === 'CONNECTED') labels.push('WhatsApp');
  if (workspace.walletsCount > 0) labels.push('Carteiras');
  if (workspace.investmentsCount > 0) labels.push('Investimentos');
  if (workspace.debtsCount > 0) labels.push('Dívidas');
  return labels;
}

export function SuperadminWorkspacesPage() {
  const [query, setQuery] = React.useState('');
  const debouncedQuery = useDebouncedValue(query, 250);
  const [data, setData] = React.useState<SuperadminWorkspacesResponse | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isCreating, setIsCreating] = React.useState(false);
  const [isSubmittingCreate, setIsSubmittingCreate] = React.useState(false);
  const [actionMessage, setActionMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;
    const run = async () => {
      try {
        setIsLoading(true);
        setError(null);
        setActionMessage(null);
        const search = debouncedQuery.trim();
        const next = await fetchSuperadminJson<SuperadminWorkspacesResponse>(`/api/superadmin/workspaces${search ? `?q=${encodeURIComponent(search)}` : ''}`);
        if (active) setData(next);
      } catch (fetchError) {
        if (active) setError(fetchError instanceof Error ? fetchError.message : 'Falha ao carregar workspaces.');
      } finally {
        if (active) setIsLoading(false);
      }
    };
    void run();
    return () => {
      active = false;
    };
  }, [debouncedQuery]);

  const workspaces = data?.workspaces ?? [];
  const estimatedMrr = workspaces.reduce((total, workspace) => total + getWorkspaceEstimatedMrr(workspace.plan), 0);
  const connectedWhatsapp = workspaces.filter((workspace) => workspace.whatsappStatus === 'CONNECTED').length;
  const paidWorkspaces = workspaces.filter((workspace) => workspace.plan === 'PRO' || workspace.plan === 'PREMIUM').length;

  return (
    <div className="space-y-6">
      {actionMessage ? <SuccessState message={actionMessage} /> : null}
      <section className="rounded-[1.9rem] border border-slate-800 bg-slate-900/60 p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Workspaces</p>
            <h1 className="text-3xl font-black tracking-tight text-white md:text-4xl">Workspaces</h1>
            <p className="max-w-3xl text-sm leading-7 text-slate-300">Visualize owners, plano, saúde operacional e distribuição de recursos usando a mesma estrutura do app principal.</p>
          </div>
          <button type="button" onClick={() => setIsCreating(true)} className={primaryActionClassName}>
            <Plus className="h-4 w-4" />
            Criar workspace
          </button>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Base total" value={formatAdminNumber(data?.total || 0)} trend="ambientes ativos" trendValue={formatAdminNumber(data?.total || 0)} icon={Building2} />
          <StatCard label="Pagantes" value={formatAdminNumber(paidWorkspaces)} trend="em planos pagos" trendValue={formatAdminNumber(paidWorkspaces)} icon={Sparkles} />
          <StatCard label="WhatsApp conectado" value={formatAdminNumber(connectedWhatsapp)} trend="canais ativos" trendValue={formatAdminNumber(connectedWhatsapp)} icon={CreditCard} />
          <StatCard label="MRR estimado" value={formatAdminCurrency(estimatedMrr)} trend="receita mensal" trendValue={formatAdminNumber(paidWorkspaces)} icon={ArrowUpRightIcon} />
        </div>
      </section>

      {error ? <ErrorState message={error} /> : null}

      <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
        <div className="mb-5">
          <h2 className="text-xl font-black text-white">Busca operacional</h2>
          <p className="mt-2 text-sm leading-7 text-slate-400">Filtre por nome do workspace, owner ou identificador e navegue com mais rapidez para o detalhe operacional.</p>
        </div>
        <label className="block max-w-2xl">
          <span className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Buscar workspace</span>
          <div className="relative mt-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nome, owner ou ID" className={fieldClassName} />
          </div>
        </label>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
        <div className="mb-5">
          <h2 className="text-xl font-black text-white">Base de workspaces</h2>
          <p className="mt-2 text-sm leading-7 text-slate-400">{data ? `${formatAdminNumber(data.total)} workspace(s) encontrados.` : 'Carregando workspaces.'}</p>
        </div>
        {isLoading ? <LoadingState label="Carregando workspaces..." /> : !data ? <ErrorState message={error || 'Falha ao carregar workspaces.'} /> : data.workspaces.length === 0 ? <EmptyState text="Nenhum workspace encontrado para os filtros atuais." /> : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.2em] text-slate-500">
                <tr>
                  <th className="pb-4 pr-6 font-semibold">Workspace</th>
                  <th className="pb-4 pr-6 font-semibold">Owner</th>
                  <th className="pb-4 pr-6 font-semibold">Plano</th>
                  <th className="pb-4 pr-6 font-semibold">Assinatura</th>
                  <th className="pb-4 pr-6 font-semibold">MRR</th>
                  <th className="pb-4 pr-6 font-semibold">Recursos</th>
                  <th className="pb-4 pr-6 font-semibold">Criação</th>
                  <th className="pb-4 text-right font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {data.workspaces.map((workspace) => {
                  const featureLabels = getWorkspaceFeatureLabels(workspace);
                  return (
                    <tr key={workspace.id} className="transition hover:bg-slate-900/40">
                      <td className="py-5 pr-6 align-top"><div className="font-semibold text-white">{workspace.name}</div><div className="mt-1 text-xs text-slate-500">{workspace.id}</div></td>
                      <td className="py-5 pr-6 align-top text-slate-300">{workspace.ownerEmail || 'Sem owner'}</td>
                      <td className="py-5 pr-6 align-top"><div className="flex flex-wrap gap-2"><PlanBadge label={formatPlanLabel(workspace.plan)} /><LifecycleBadge status={workspace.lifecycleStatus} /></div></td>
                      <td className="py-5 pr-6 align-top"><StatusBadge status={workspace.subscriptionStatus} /></td>
                      <td className="py-5 pr-6 align-top font-semibold text-white">{formatAdminCurrency(getWorkspaceEstimatedMrr(workspace.plan))}</td>
                      <td className="py-5 pr-6 align-top"><div className="flex max-w-[260px] flex-wrap gap-2">{featureLabels.length === 0 ? <span className="text-sm text-slate-500">Sem recursos extras</span> : featureLabels.map((feature) => <span key={feature} className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">{feature}</span>)}</div></td>
                      <td className="py-5 pr-6 align-top text-slate-300">{formatAdminDate(workspace.createdAt)}</td>
                      <td className="py-5 align-top"><div className="flex justify-end"><Link href={`/superadmin/workspaces/${workspace.id}`} className={secondaryActionClassName}>Ver detalhe</Link></div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {isCreating ? (
        <CreateWorkspaceSheet
          isSaving={isSubmittingCreate}
          onClose={() => setIsCreating(false)}
          onCreate={async (payload) => {
            try {
              setIsSubmittingCreate(true);
              setError(null);
              const response = await fetchSuperadminJson<{
                ok: boolean;
                workspace: {
                  id: string;
                };
              }>('/api/superadmin/workspaces', {
                method: 'POST',
                body: JSON.stringify(payload),
              });
              setActionMessage('Workspace criado com sucesso.');
              setIsCreating(false);
              setQuery('');
              setData((current) => current ? { ...current, total: current.total + 1 } : current);
              window.location.href = `/superadmin/workspaces/${response.workspace.id}`;
            } catch (submitError) {
              setError(submitError instanceof Error ? submitError.message : 'Falha ao criar workspace.');
            } finally {
              setIsSubmittingCreate(false);
            }
          }}
        />
      ) : null}
    </div>
  );
}

function StatCard({ label, value, trend, trendValue, icon: Icon, trendType = 'up' }: { label: string; value: string; trend: string; trendValue: string; icon: React.ComponentType<{ size?: number; className?: string }>; trendType?: 'up' | 'down'; }) {
  return <div className="group relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50 p-6 transition-colors hover:border-slate-700"><div className="mb-4 flex items-center justify-between"><span className="text-sm font-medium text-slate-400">{label}</span><div className={trendType === 'up' ? 'rounded-lg bg-emerald-500/10 p-2 text-emerald-500' : 'rounded-lg bg-rose-500/10 p-2 text-rose-500'}><Icon size={18} /></div></div><div className="flex flex-col gap-1"><p className="text-2xl font-bold tracking-tight text-white">{value}</p><div className={trendType === 'up' ? 'flex items-center gap-1 text-sm font-semibold text-emerald-500' : 'flex items-center gap-1 text-sm font-semibold text-rose-500'}>{trendType === 'up' ? <ArrowUpRight size={14} /> : <ArrowUpRight size={14} className="rotate-90" />}{trendValue} <span className="ml-1 font-normal text-slate-500">{trend}</span></div></div></div>;
}
function ArrowUpRightIcon(props: { size?: number; className?: string }) { return <ArrowUpRight {...props} />; }
function PlanBadge({ label }: { label: string }) { return <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-semibold text-slate-300">{label}</span>; }
function LifecycleBadge({ status }: { status: 'ACTIVE' | 'SUSPENDED' }) { return <span className={status === 'SUSPENDED' ? 'rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-200' : 'rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200'}>{status === 'SUSPENDED' ? 'Suspenso' : 'Ativo'}</span>; }
function StatusBadge({ status }: { status: string | null }) { return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getSubscriptionTone(status)}`}>{formatSubscriptionStatus(status)}</span>; }
function LoadingState({ label }: { label: string }) { return <div className="flex min-h-[220px] items-center justify-center"><div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 px-5 py-4 text-slate-200"><Loader2 className="h-5 w-5 animate-spin text-emerald-400" />{label}</div></div>; }
function ErrorState({ message }: { message: string }) { return <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-5 text-sm text-rose-100">{message}</div>; }
function EmptyState({ text }: { text: string }) { return <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/40 px-4 py-6 text-sm text-slate-400">{text}</div>; }
function SuccessState({ message }: { message: string }) { return <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-5 text-sm text-emerald-100">{message}</div>; }

function CreateWorkspaceSheet({
  isSaving,
  onClose,
  onCreate,
}: {
  isSaving: boolean;
  onClose: () => void;
  onCreate: (payload: { name: string; ownerEmail: string; initialPlan: 'FREE' | 'PRO' | 'PREMIUM' }) => Promise<void>;
}) {
  const [name, setName] = React.useState('');
  const [ownerEmail, setOwnerEmail] = React.useState('');
  const [initialPlan, setInitialPlan] = React.useState<'FREE' | 'PRO' | 'PREMIUM'>('FREE');

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/80 p-4 backdrop-blur-sm xl:items-center">
      <div className="w-full max-w-xl rounded-3xl border border-slate-800 bg-slate-950/98 p-6 shadow-2xl backdrop-blur-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Operação administrativa</p>
            <h3 className="mt-2 text-xl font-black text-white">Criar workspace</h3>
            <p className="mt-2 text-sm leading-7 text-slate-400">Crie um novo ambiente já com owner e plano inicial definidos.</p>
          </div>
          <button type="button" onClick={onClose} disabled={isSaving} className={secondaryActionClassName}>Fechar</button>
        </div>
        <div className="mt-6 space-y-4">
          <label className="block"><span className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Nome do workspace</span><input value={name} onChange={(event) => setName(event.target.value)} className={modalFieldClassName} /></label>
          <label className="block"><span className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Owner (e-mail)</span><input value={ownerEmail} onChange={(event) => setOwnerEmail(event.target.value)} placeholder="usuario@empresa.com" className={modalFieldClassName} /></label>
          <label className="block"><span className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Plano inicial</span><select value={initialPlan} onChange={(event) => setInitialPlan(event.target.value as 'FREE' | 'PRO' | 'PREMIUM')} className={modalFieldClassName}><option value="FREE">Free</option><option value="PRO">Pro</option><option value="PREMIUM">Premium</option></select></label>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} disabled={isSaving} className={secondaryActionClassName}>Cancelar</button>
          <button type="button" onClick={() => void onCreate({ name: name.trim(), ownerEmail: ownerEmail.trim(), initialPlan })} disabled={isSaving} className={primaryActionClassName}>{isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}Criar</button>
        </div>
      </div>
    </div>
  );
}
const fieldClassName = 'w-full rounded-xl border border-slate-800 bg-slate-900 py-3 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-500';
const modalFieldClassName = 'mt-2 w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-500';
const secondaryActionClassName = 'inline-flex items-center justify-center rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-bold text-slate-200 transition-all hover:border-emerald-500 hover:text-white';
const primaryActionClassName = 'inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-bold text-white transition-all hover:bg-emerald-600 disabled:opacity-60';
