'use client';

import * as React from 'react';
import Link from 'next/link';
import { Building2, CreditCard, Loader2, Search, Sparkles } from 'lucide-react';

import { fetchSuperadminJson, useDebouncedValue } from '@/components/superadmin/fetch-superadmin-json';
import {
  SuperadminMetricChip,
  SuperadminPageHeader,
  SuperadminSectionCard,
} from '@/components/superadmin/superadmin-page-primitives';
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
  const connectedWhatsapp = workspaces.filter((workspace) => workspace.whatsappStatus === 'CONNECTED').length;
  const paidWorkspaces = workspaces.filter((workspace) => workspace.plan === 'PRO' || workspace.plan === 'PREMIUM').length;

  return (
    <div className="space-y-6">
      <SuperadminPageHeader eyebrow="Operations" title="Workspaces" description="Visualize owners, plano, saúde operacional e distribuição de recursos em uma interface mais clara para acompanhar a base do produto.">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <SuperadminMetricChip label="Base total" value={formatAdminNumber(data?.total || 0)} />
          <SuperadminMetricChip label="Pagantes" value={formatAdminNumber(paidWorkspaces)} tone="success" />
          <SuperadminMetricChip label="WhatsApp conectado" value={formatAdminNumber(connectedWhatsapp)} tone="info" />
          <SuperadminMetricChip label="MRR estimado" value={formatAdminCurrency(estimatedMrr)} />
        </div>
      </SuperadminPageHeader>

      {error ? <ErrorState message={error} /> : null}

      <SuperadminSectionCard title="Busca operacional" description="Filtre por nome do workspace, owner ou identificador e navegue com mais rapidez para contexto operacional, billing e canal ativo.">
        <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Buscar workspace</span>
            <div className="relative mt-2">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nome, owner ou ID" className={fieldClassName} />
            </div>
          </label>
          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <QuickInsight icon={<Building2 className="h-4 w-4 text-slate-200" />} label="Cobertura" value={`${formatAdminNumber(data?.total || 0)} ambientes ativos`} description="Uma visão central da operação financeira criada pelos clientes." />
            <QuickInsight icon={<Sparkles className="h-4 w-4 text-emerald-300" />} label="Adoção" value={`${formatAdminNumber(connectedWhatsapp)} canais conectados`} description="Sinal rápido de engajamento e rotina assistida por mensagens." />
            <QuickInsight icon={<CreditCard className="h-4 w-4 text-sky-300" />} label="Receita potencial" value={formatAdminCurrency(estimatedMrr)} description="Estimativa baseada na composição atual dos planos da base." />
          </div>
        </div>
      </SuperadminSectionCard>

      <SuperadminSectionCard title="Base de workspaces" description={data ? `${formatAdminNumber(data.total)} workspace(s) encontrados. Plano, MRR, recursos e status ficam mais fáceis de comparar na mesma leitura.` : 'Carregando workspaces.'}>
        {isLoading ? (
          <LoadingState label="Carregando workspaces..." />
        ) : !data ? (
          <ErrorState message={error || 'Falha ao carregar workspaces.'} />
        ) : data.workspaces.length === 0 ? (
          <EmptyState text="Nenhum workspace encontrado para os filtros atuais." />
        ) : (
          <div className="space-y-5">
            <div className="hidden overflow-hidden rounded-[1.6rem] border border-white/8 bg-[linear-gradient(180deg,rgba(2,6,23,.26),rgba(2,6,23,.14))] xl:block">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-white/[0.03] text-[11px] uppercase tracking-[0.22em] text-slate-500">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Workspace</th>
                    <th className="px-6 py-4 font-semibold">Owner</th>
                    <th className="px-6 py-4 font-semibold">Plano</th>
                    <th className="px-6 py-4 font-semibold">Assinatura</th>
                    <th className="px-6 py-4 font-semibold">MRR</th>
                    <th className="px-6 py-4 font-semibold">Recursos</th>
                    <th className="px-6 py-4 font-semibold">Criação</th>
                    <th className="px-6 py-4 font-semibold text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/8">
                  {data.workspaces.map((workspace) => {
                    const featureLabels = getWorkspaceFeatureLabels(workspace);
                    return (
                      <tr key={workspace.id} className="transition hover:bg-white/[0.025]">
                        <td className="px-6 py-5 align-top"><div className="min-w-[220px]"><div className="font-semibold text-white">{workspace.name}</div><div className="mt-2 text-[11px] text-slate-500">{workspace.id}</div></div></td>
                        <td className="px-6 py-5 align-top text-sm text-slate-300">{workspace.ownerEmail || 'Sem owner'}</td>
                        <td className="px-6 py-5 align-top"><PlanBadge plan={workspace.plan} /></td>
                        <td className="px-6 py-5 align-top"><StatusBadge status={workspace.subscriptionStatus} /></td>
                        <td className="px-6 py-5 align-top text-sm font-semibold text-white">{formatAdminCurrency(getWorkspaceEstimatedMrr(workspace.plan))}</td>
                        <td className="px-6 py-5 align-top"><div className="flex max-w-[260px] flex-wrap gap-2">{featureLabels.length === 0 ? <span className="text-sm text-slate-500">Sem recursos extras</span> : featureLabels.map((feature) => <span key={feature} className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-slate-200">{feature}</span>)}</div></td>
                        <td className="px-6 py-5 align-top text-sm text-slate-300">{formatAdminDate(workspace.createdAt)}</td>
                        <td className="px-6 py-5 align-top"><div className="flex justify-end"><Link href={`/superadmin/workspaces/${workspace.id}`} className={secondaryActionClassName}>Ver detalhe</Link></div></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="grid gap-4 xl:hidden">
              {data.workspaces.map((workspace) => {
                const featureLabels = getWorkspaceFeatureLabels(workspace);
                return (
                  <article key={workspace.id} className="rounded-[1.6rem] border border-white/8 bg-[linear-gradient(180deg,rgba(15,23,42,.72),rgba(15,23,42,.56))] p-5 shadow-[0_18px_56px_-38px_rgba(2,6,23,.92)]">
                    <div className="flex items-start justify-between gap-4"><div><p className="font-semibold text-white">{workspace.name}</p><p className="mt-1 text-xs text-slate-400">{workspace.ownerEmail || 'Sem owner'}</p></div><StatusBadge status={workspace.subscriptionStatus} /></div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <InfoPill label="Plano" value={formatPlanLabel(workspace.plan)} />
                      <InfoPill label="MRR" value={formatAdminCurrency(getWorkspaceEstimatedMrr(workspace.plan))} />
                      <InfoPill label="Criação" value={formatAdminDate(workspace.createdAt)} />
                      <InfoPill label="Recursos" value={featureLabels.length > 0 ? featureLabels.join(', ') : 'Sem extras'} />
                    </div>
                    <div className="mt-5 flex justify-end"><Link href={`/superadmin/workspaces/${workspace.id}`} className={secondaryActionClassName}>Ver detalhe</Link></div>
                  </article>
                );
              })}
            </div>
          </div>
        )}
      </SuperadminSectionCard>
    </div>
  );
}

function QuickInsight({ icon, label, value, description }: { icon: React.ReactNode; label: string; value: string; description: string }) {
  return <div className="rounded-[1.35rem] border border-white/8 bg-[linear-gradient(180deg,rgba(2,6,23,.42),rgba(2,6,23,.28))] p-4"><div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">{icon}{label}</div><p className="mt-3 text-sm font-semibold text-white">{value}</p><p className="mt-2 text-sm leading-6 text-slate-400">{description}</p></div>;
}
function PlanBadge({ plan }: { plan: string }) { return <span className="rounded-full border border-emerald-400/18 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-200">{formatPlanLabel(plan)}</span>; }
function StatusBadge({ status }: { status: string | null }) { return <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${getSubscriptionTone(status)}`}>{formatSubscriptionStatus(status)}</span>; }
function InfoPill({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl border border-white/8 bg-slate-950/45 px-4 py-3"><p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</p><p className="mt-2 text-sm font-semibold text-white">{value}</p></div>; }
function LoadingState({ label }: { label: string }) { return <div className="flex min-h-[260px] items-center justify-center"><div className="flex items-center gap-3 rounded-2xl border border-white/8 bg-slate-950/60 px-5 py-4 text-slate-200"><Loader2 className="h-5 w-5 animate-spin text-emerald-400" />{label}</div></div>; }
function ErrorState({ message }: { message: string }) { return <div className="rounded-[1.5rem] border border-rose-500/20 bg-rose-500/10 px-4 py-5 text-sm text-rose-100">{message}</div>; }
function EmptyState({ text }: { text: string }) { return <div className="rounded-[1.5rem] border border-dashed border-white/10 bg-slate-950/40 px-4 py-8 text-sm text-slate-400">{text}</div>; }
const fieldClassName = 'w-full rounded-[1.2rem] border border-white/10 bg-slate-950/70 py-3 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-400/60 focus:bg-slate-950';
const secondaryActionClassName = 'inline-flex rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs font-semibold text-slate-200 transition hover:border-white/18 hover:bg-white/[0.05] hover:text-white';
