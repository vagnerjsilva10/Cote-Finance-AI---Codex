'use client';

import * as React from 'react';
import Link from 'next/link';
import { Building2, CreditCard, Loader2, MessageSquare, Plus, Search, Sparkles, Wallet } from 'lucide-react';

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

export function SuperadminWorkspacesPage() {
  const [query, setQuery] = React.useState('');
  const debouncedQuery = useDebouncedValue(query, 250);
  const [data, setData] = React.useState<SuperadminWorkspacesResponse | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isCreating, setIsCreating] = React.useState(false);
  const [isSubmittingCreate, setIsSubmittingCreate] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;
    const run = async () => {
      try {
        setIsLoading(true);
        setError(null);
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
  const paidWorkspaces = workspaces.filter((workspace) => workspace.plan === 'PRO' || workspace.plan === 'PREMIUM').length;
  const suspended = workspaces.filter((workspace) => workspace.lifecycleStatus === 'SUSPENDED').length;
  const whatsappConnected = workspaces.filter((workspace) => workspace.whatsappStatus === 'CONNECTED').length;

  return (
    <div className="space-y-5">
      {error ? <ErrorState message={error} /> : null}
      {message ? <FeedbackState message={message} success={message.includes('sucesso')} /> : null}

      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-slate-800 bg-slate-950/70 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
                Workspaces
              </span>
              <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-emerald-300">
                Operação da base
              </span>
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">Workspaces, owners e estado operacional</h1>
              <p className="mt-2 text-sm leading-7 text-slate-300">
                Centralize criação, saúde da conta, plano, faturamento estimado e canais conectados sem inflar a página.
              </p>
            </div>
          </div>
          <button type="button" onClick={() => setIsCreating(true)} className={primaryActionClassName}>
            <Plus className="h-4 w-4" />
            Criar workspace
          </button>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Base total" value={formatAdminNumber(data?.total || 0)} icon={<Building2 className="h-4.5 w-4.5 text-emerald-300" />} />
        <StatCard label="Pagantes" value={formatAdminNumber(paidWorkspaces)} icon={<Sparkles className="h-4.5 w-4.5 text-sky-300" />} />
        <StatCard label="WhatsApp" value={formatAdminNumber(whatsappConnected)} icon={<MessageSquare className="h-4.5 w-4.5 text-emerald-300" />} />
        <StatCard label="Suspensos" value={formatAdminNumber(suspended)} icon={<CreditCard className="h-4.5 w-4.5 text-amber-300" />} />
      </section>

      <section className="grid gap-3 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-white">Operação de workspaces</h2>
              <p className="mt-1 text-sm text-slate-400">Busque por nome, owner ou identificador para ir direto ao ambiente certo.</p>
            </div>
            <span className="rounded-full border border-slate-800 bg-slate-950/70 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
              {formatAdminCurrency(estimatedMrr)} MRR
            </span>
          </div>
          <label className="mt-4 block">
            <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">Buscar</span>
            <div className="relative mt-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Workspace, owner ou ID"
                className={searchFieldClassName}
              />
            </div>
          </label>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-2.5">
              <Wallet className="h-4.5 w-4.5 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Pulso da base</h2>
              <p className="text-sm text-slate-400">Resumo rápido do estado dos ambientes.</p>
            </div>
          </div>
          <div className="mt-4 space-y-2.5">
            <MetricPill label="Base visível" value={formatAdminNumber(workspaces.length)} />
            <MetricPill label="Com owner" value={formatAdminNumber(workspaces.filter((item) => Boolean(item.ownerEmail)).length)} />
            <MetricPill label="Workspaces pagos" value={formatAdminNumber(paidWorkspaces)} />
            <MetricPill label="Suspensos" value={formatAdminNumber(suspended)} tone={suspended > 0 ? 'danger' : 'neutral'} />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white">Base de workspaces</h2>
            <p className="mt-1 text-sm text-slate-400">
              {data ? `${formatAdminNumber(data.total)} workspace(s) encontrados.` : 'Carregando base de workspaces.'}
            </p>
          </div>
        </div>

        {isLoading ? (
          <LoadingState label="Carregando workspaces..." />
        ) : !data ? (
          <ErrorState message={error || 'Falha ao carregar workspaces.'} />
        ) : data.workspaces.length === 0 ? (
          <EmptyState text="Nenhum workspace encontrado para os filtros atuais." />
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-800 text-[11px] uppercase tracking-[0.22em] text-slate-500">
                <tr>
                  <th className="px-3 py-3 font-semibold">Workspace</th>
                  <th className="px-3 py-3 font-semibold">Owner</th>
                  <th className="px-3 py-3 font-semibold">Plano</th>
                  <th className="px-3 py-3 font-semibold">Assinatura</th>
                  <th className="px-3 py-3 font-semibold">MRR</th>
                  <th className="px-3 py-3 font-semibold">Criação</th>
                  <th className="px-3 py-3 text-right font-semibold">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {data.workspaces.map((workspace) => (
                  <tr key={workspace.id} className="hover:bg-slate-950/30">
                    <td className="px-3 py-3.5 align-top">
                      <div className="font-semibold text-white">{workspace.name}</div>
                      <div className="mt-0.5 text-[11px] text-slate-500">{workspace.id}</div>
                    </td>
                    <td className="px-3 py-3.5 align-top text-slate-300">{workspace.ownerEmail || 'Sem owner'}</td>
                    <td className="px-3 py-3.5 align-top">
                      <div className="flex flex-wrap gap-2">
                        <PlanBadge label={formatPlanLabel(workspace.plan)} />
                        <LifecycleBadge status={workspace.lifecycleStatus} />
                      </div>
                    </td>
                    <td className="px-3 py-3.5 align-top">
                      <StatusBadge status={workspace.subscriptionStatus} />
                    </td>
                    <td className="px-3 py-3.5 align-top font-semibold text-white">{formatAdminCurrency(getWorkspaceEstimatedMrr(workspace.plan))}</td>
                    <td className="px-3 py-3.5 align-top text-slate-300">{formatAdminDate(workspace.createdAt)}</td>
                    <td className="px-3 py-3.5 text-right align-top">
                      <Link href={`/superadmin/workspaces/${workspace.id}`} className={secondaryActionClassName}>
                        Abrir
                      </Link>
                    </td>
                  </tr>
                ))}
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
              const response = await fetchSuperadminJson<{ ok: boolean; workspace: { id: string } }>('/api/superadmin/workspaces', {
                method: 'POST',
                body: JSON.stringify(payload),
              });
              setMessage('Workspace criado com sucesso.');
              setIsCreating(false);
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
          <button type="button" onClick={onClose} disabled={isSaving} className={secondaryActionClassName}>
            Fechar
          </button>
        </div>
        <div className="mt-6 space-y-4">
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Nome do workspace</span>
            <input value={name} onChange={(event) => setName(event.target.value)} className={modalFieldClassName} />
          </label>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Owner (e-mail)</span>
            <input value={ownerEmail} onChange={(event) => setOwnerEmail(event.target.value)} placeholder="usuario@empresa.com" className={modalFieldClassName} />
          </label>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Plano inicial</span>
            <select value={initialPlan} onChange={(event) => setInitialPlan(event.target.value as 'FREE' | 'PRO' | 'PREMIUM')} className={modalFieldClassName}>
              <option value="FREE">Free</option>
              <option value="PRO">Pro</option>
              <option value="PREMIUM">Premium</option>
            </select>
          </label>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} disabled={isSaving} className={secondaryActionClassName}>
            Cancelar
          </button>
          <button type="button" onClick={() => void onCreate({ name: name.trim(), ownerEmail: ownerEmail.trim(), initialPlan })} disabled={isSaving} className={primaryActionClassName}>
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Criar
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/50 px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">{label}</p>
          <p className="text-2xl font-bold tracking-tight text-white">{value}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-2.5">{icon}</div>
      </div>
    </div>
  );
}

function MetricPill({ label, value, tone = 'neutral' }: { label: string; value: string; tone?: 'neutral' | 'danger' }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-950/60 px-3.5 py-3">
      <span className="text-sm text-slate-400">{label}</span>
      <span className={tone === 'danger' ? 'text-sm font-semibold text-rose-300' : 'text-sm font-semibold text-white'}>{value}</span>
    </div>
  );
}

function PlanBadge({ label }: { label: string }) {
  return <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-semibold text-slate-300">{label}</span>;
}

function LifecycleBadge({ status }: { status: 'ACTIVE' | 'SUSPENDED' }) {
  return (
    <span className={status === 'SUSPENDED' ? 'rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-200' : 'rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200'}>
      {status === 'SUSPENDED' ? 'Suspenso' : 'Ativo'}
    </span>
  );
}

function StatusBadge({ status }: { status: string | null }) {
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getSubscriptionTone(status)}`}>{formatSubscriptionStatus(status)}</span>;
}

function LoadingState({ label }: { label: string }) {
  return (
    <div className="flex min-h-[220px] items-center justify-center">
      <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 px-5 py-4 text-slate-200">
        <Loader2 className="h-5 w-5 animate-spin text-emerald-400" />
        {label}
      </div>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-5 text-sm text-rose-100">{message}</div>;
}

function FeedbackState({ message, success }: { message: string; success: boolean }) {
  return (
    <div className={`rounded-2xl px-4 py-4 text-sm ${success ? 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-100' : 'border border-rose-500/20 bg-rose-500/10 text-rose-100'}`}>
      {message}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/40 px-4 py-6 text-sm text-slate-400">{text}</div>;
}

const searchFieldClassName =
  'w-full rounded-xl border border-slate-800 bg-slate-900 py-3 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-500';
const modalFieldClassName =
  'mt-2 w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-500';
const secondaryActionClassName =
  'inline-flex items-center justify-center rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-bold text-slate-200 transition-all hover:border-emerald-500 hover:text-white';
const primaryActionClassName =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-bold text-slate-950 transition-all hover:bg-emerald-400 disabled:opacity-60';


