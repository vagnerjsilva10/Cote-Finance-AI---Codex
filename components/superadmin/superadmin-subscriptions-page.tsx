'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowDownRight, ArrowUpRight, CreditCard, Loader2, Search, ShieldCheck, Sparkles } from 'lucide-react';

import { fetchSuperadminJson, useDebouncedValue } from '@/components/superadmin/fetch-superadmin-json';
import {
  formatAdminCurrency,
  formatAdminDate,
  formatAdminNumber,
  formatPlanLabel,
  formatSubscriptionStatus,
  getSubscriptionTone,
} from '@/components/superadmin/superadmin-utils';
import type { SuperadminSubscriptionSummary, SuperadminSubscriptionUpdateResponse, SuperadminSubscriptionsResponse } from '@/lib/superadmin/types';

const PLAN_OPTIONS = [
  { value: 'ALL', label: 'Todos os planos' },
  { value: 'FREE', label: 'Free' },
  { value: 'PRO', label: 'Pro' },
  { value: 'PREMIUM', label: 'Premium' },
];
const STATUS_OPTIONS = [
  { value: 'ALL', label: 'Todos os status' },
  { value: 'ACTIVE', label: 'Ativas' },
  { value: 'PENDING', label: 'Pendentes' },
  { value: 'CANCELED', label: 'Canceladas' },
];

export function SuperadminSubscriptionsPage() {
  const [query, setQuery] = React.useState('');
  const [plan, setPlan] = React.useState('ALL');
  const [status, setStatus] = React.useState('ALL');
  const debouncedQuery = useDebouncedValue(query, 250);
  const [data, setData] = React.useState<SuperadminSubscriptionsResponse | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [selectedSubscription, setSelectedSubscription] = React.useState<SuperadminSubscriptionSummary | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const [actionMessage, setActionMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;
    const run = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const params = new URLSearchParams();
        if (debouncedQuery.trim()) params.set('q', debouncedQuery.trim());
        if (plan !== 'ALL') params.set('plan', plan);
        if (status !== 'ALL') params.set('status', status);
        const next = await fetchSuperadminJson<SuperadminSubscriptionsResponse>(`/api/superadmin/subscriptions${params.toString() ? `?${params.toString()}` : ''}`);
        if (active) setData(next);
      } catch (fetchError) {
        if (active) setError(fetchError instanceof Error ? fetchError.message : 'Falha ao carregar assinaturas.');
      } finally {
        if (active) setIsLoading(false);
      }
    };
    void run();
    return () => {
      active = false;
    };
  }, [debouncedQuery, plan, status]);

  const metrics = data?.metrics;

  return (
    <div className="space-y-6">
      <section className="rounded-[1.9rem] border border-slate-800 bg-slate-900/60 p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Assinaturas</p>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-white md:text-4xl">Assinaturas</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
                Monitore a base pagante, veja pendências de billing e opere mudanças de plano dentro da mesma linguagem visual do app principal.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/superadmin/plans" className={secondaryActionClassName}>Ver planos</Link>
            <Link href="/superadmin/reports" className={primaryActionClassName}>Relatórios</Link>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Assinaturas" value={formatAdminNumber(metrics?.total || 0)} trend="na base" trendValue={formatAdminNumber(metrics?.active || 0)} icon={CreditCard} />
          <StatCard label="Pagantes" value={formatAdminNumber(metrics?.paying || 0)} trend="em planos pagos" trendValue={formatAdminNumber(metrics?.paying || 0)} icon={Sparkles} />
          <StatCard label="Pendentes" value={formatAdminNumber(metrics?.pending || 0)} trend="exigem atenção" trendValue={formatAdminNumber(metrics?.pending || 0)} icon={ShieldCheck} trendType="down" />
          <StatCard label="MRR estimado" value={formatAdminCurrency(metrics?.estimatedMrr || 0)} trend="receita mensal" trendValue={formatAdminNumber(metrics?.paying || 0)} icon={ArrowUpRightIcon} />
        </div>
      </section>

      {actionMessage ? <SuccessState message={actionMessage} /> : null}
      {error ? <ErrorState message={error} /> : null}

      <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
        <div className="mb-5">
          <h2 className="text-xl font-black text-white">Operação de billing</h2>
          <p className="mt-2 text-sm leading-7 text-slate-400">Use busca e filtros para chegar rápido nas contas certas e operar mudanças sem sair do padrão visual do produto.</p>
        </div>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr_.45fr_.45fr]">
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Buscar</span>
            <div className="relative mt-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por workspace, owner ou ID" className={filterFieldClassName} />
            </div>
          </label>
          <label className="block"><span className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Plano</span><select value={plan} onChange={(event) => setPlan(event.target.value)} className={filterFieldClassName}>{PLAN_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          <label className="block"><span className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Status</span><select value={status} onChange={(event) => setStatus(event.target.value)} className={filterFieldClassName}>{STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
        <div className="mb-5">
          <h2 className="text-xl font-black text-white">Base de assinaturas</h2>
          <p className="mt-2 text-sm leading-7 text-slate-400">{data ? `${formatAdminNumber(data.total)} assinatura(s) encontradas.` : 'Carregando base de assinaturas.'}</p>
        </div>
        {isLoading ? (
          <LoadingState message="Carregando assinaturas..." />
        ) : !data ? (
          <ErrorState message={error || 'Falha ao carregar assinaturas.'} />
        ) : data.subscriptions.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.2em] text-slate-500">
                <tr>
                  <th className="pb-4 pr-6 font-semibold">Workspace</th>
                  <th className="pb-4 pr-6 font-semibold">Owner</th>
                  <th className="pb-4 pr-6 font-semibold">Plano</th>
                  <th className="pb-4 pr-6 font-semibold">Status</th>
                  <th className="pb-4 pr-6 font-semibold">Período</th>
                  <th className="pb-4 pr-6 font-semibold">Stripe</th>
                  <th className="pb-4 pr-6 font-semibold">MRR</th>
                  <th className="pb-4 font-semibold text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {data.subscriptions.map((item) => (
                  <tr key={item.workspaceId} className="transition hover:bg-slate-900/40">
                    <td className="py-5 pr-6 align-top"><div className="font-semibold text-white">{item.workspaceName}</div><div className="mt-1 text-xs text-slate-500">{item.workspaceId}</div></td>
                    <td className="py-5 pr-6 align-top text-slate-300">{item.ownerEmail || 'Sem owner'}</td>
                    <td className="py-5 pr-6 align-top"><PlanBadge plan={item.plan} /></td>
                    <td className="py-5 pr-6 align-top"><StatusBadge status={item.status} /></td>
                    <td className="py-5 pr-6 align-top text-slate-300">{formatAdminDate(item.currentPeriodEnd)}</td>
                    <td className="py-5 pr-6 align-top text-slate-400">{item.hasStripeSubscription ? 'Assinatura Stripe' : item.hasStripeCustomer ? 'Cliente Stripe' : 'Sem vínculo'}</td>
                    <td className="py-5 pr-6 align-top font-semibold text-white">{formatAdminCurrency(item.estimatedMrr)}</td>
                    <td className="py-5 align-top">
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => setSelectedSubscription(item)} className={secondaryActionClassName}>Editar</button>
                        <Link href={`/superadmin/workspaces/${item.workspaceId}`} className={secondaryActionClassName}>Ver workspace</Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selectedSubscription ? <SubscriptionActionSheet subscription={selectedSubscription} isSaving={isSaving} onClose={() => { if (!isSaving) setSelectedSubscription(null); }} onSubmit={async (payload) => {
        try {
          setIsSaving(true);
          setError(null);
          setActionMessage(null);
          const response = await fetchSuperadminJson<SuperadminSubscriptionUpdateResponse>('/api/superadmin/subscriptions', { method: 'PATCH', body: JSON.stringify(payload) });
          setData((current) => current ? { ...current, subscriptions: current.subscriptions.map((item) => item.workspaceId === response.subscription.workspaceId ? { ...item, plan: response.subscription.plan, status: response.subscription.status, currentPeriodEnd: response.subscription.currentPeriodEnd, estimatedMrr: response.subscription.estimatedMrr, stripeCustomerId: response.subscription.stripeCustomerId, stripeSubscriptionId: response.subscription.stripeSubscriptionId, adminNote: response.subscription.adminNote, hasStripeCustomer: Boolean(response.subscription.stripeCustomerId), hasStripeSubscription: Boolean(response.subscription.stripeSubscriptionId) } : item) } : current);
          setSelectedSubscription(null);
          setActionMessage('Assinatura atualizada com sucesso.');
        } catch (submitError) {
          setError(submitError instanceof Error ? submitError.message : 'Falha ao atualizar assinatura.');
        } finally {
          setIsSaving(false);
        }
      }} /> : null}
    </div>
  );
}

function SubscriptionActionSheet({ subscription, isSaving, onClose, onSubmit }: { subscription: SuperadminSubscriptionSummary; isSaving: boolean; onClose: () => void; onSubmit: (payload: { workspaceId: string; plan: string; status: string; currentPeriodEnd: string | null; stripeCustomerId: string | null; stripeSubscriptionId: string | null; clearStripeLinks: boolean; adminNote: string | null; }) => Promise<void>; }) {
  const [plan, setPlan] = React.useState(subscription.plan);
  const [status, setStatus] = React.useState(subscription.status);
  const [currentPeriodEnd, setCurrentPeriodEnd] = React.useState(subscription.currentPeriodEnd ? subscription.currentPeriodEnd.slice(0, 10) : '');
  const [stripeCustomerId, setStripeCustomerId] = React.useState(subscription.stripeCustomerId || '');
  const [stripeSubscriptionId, setStripeSubscriptionId] = React.useState(subscription.stripeSubscriptionId || '');
  const [adminNote, setAdminNote] = React.useState(subscription.adminNote || '');
  const [clearStripeLinks, setClearStripeLinks] = React.useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/80 p-4 backdrop-blur-sm xl:items-center">
      <div className="w-full max-w-xl rounded-3xl border border-slate-800 bg-slate-950/98 p-6 shadow-2xl backdrop-blur-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Ação administrativa</p>
            <h3 className="mt-2 text-xl font-black text-white">{subscription.workspaceName}</h3>
            <p className="mt-2 text-sm leading-7 text-slate-400">Ajuste plano, status, período, vínculo Stripe e observações administrativas da assinatura.</p>
          </div>
          <button type="button" onClick={onClose} disabled={isSaving} className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-bold text-slate-300 transition hover:text-white">Fechar</button>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="block"><span className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Plano</span><select value={plan} onChange={(event) => setPlan(event.target.value)} className={filterFieldClassName}>{PLAN_OPTIONS.filter((option) => option.value !== 'ALL').map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          <label className="block"><span className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Status</span><select value={status} onChange={(event) => setStatus(event.target.value)} className={filterFieldClassName}>{STATUS_OPTIONS.filter((option) => option.value !== 'ALL').map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          <label className="block sm:col-span-2"><span className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Período atual</span><input type="date" value={currentPeriodEnd} onChange={(event) => setCurrentPeriodEnd(event.target.value)} className={filterFieldClassName} /></label>
          <label className="block sm:col-span-2"><span className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Stripe Customer ID</span><input value={stripeCustomerId} onChange={(event) => setStripeCustomerId(event.target.value)} className={filterFieldClassName} placeholder="cus_..." /></label>
          <label className="block sm:col-span-2"><span className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Stripe Subscription ID</span><input value={stripeSubscriptionId} onChange={(event) => setStripeSubscriptionId(event.target.value)} className={filterFieldClassName} placeholder="sub_..." /></label>
          <label className="block sm:col-span-2"><span className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Observação administrativa</span><textarea value={adminNote} onChange={(event) => setAdminNote(event.target.value)} rows={4} className={filterFieldClassName} placeholder="Ex: upgrade manual aprovado, cobrança conciliada, conta migrada." /></label>
          <label className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-white sm:col-span-2"><span>Desvincular referências Stripe</span><input type="checkbox" checked={clearStripeLinks} onChange={(event) => setClearStripeLinks(event.target.checked)} className="h-4 w-4 rounded border-white/20 bg-slate-900 text-emerald-400" /></label>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} disabled={isSaving} className={secondaryActionClassName}>Cancelar</button>
          <button type="button" disabled={isSaving} onClick={() => void onSubmit({ workspaceId: subscription.workspaceId, plan, status, currentPeriodEnd: currentPeriodEnd || null, stripeCustomerId: stripeCustomerId || null, stripeSubscriptionId: stripeSubscriptionId || null, clearStripeLinks, adminNote: adminNote || null })} className={primaryActionClassName}>{isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}Salvar ajustes</button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, trend, trendValue, icon: Icon, trendType = 'up' }: { label: string; value: string; trend: string; trendValue: string; icon: React.ComponentType<{ size?: number; className?: string }>; trendType?: 'up' | 'down'; }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50 p-6 transition-colors hover:border-slate-700">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm font-medium text-slate-400">{label}</span>
        <div className={trendType === 'up' ? 'rounded-lg bg-emerald-500/10 p-2 text-emerald-500' : 'rounded-lg bg-rose-500/10 p-2 text-rose-500'}><Icon size={18} /></div>
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-2xl font-bold tracking-tight text-white">{value}</p>
        <div className={trendType === 'up' ? 'flex items-center gap-1 text-sm font-semibold text-emerald-500' : 'flex items-center gap-1 text-sm font-semibold text-rose-500'}>
          {trendType === 'up' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          {trendValue} <span className="ml-1 font-normal text-slate-500">{trend}</span>
        </div>
      </div>
    </div>
  );
}

function ArrowUpRightIcon(props: { size?: number; className?: string }) { return <ArrowUpRight {...props} />; }
function PlanBadge({ plan }: { plan: string }) { return <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-semibold text-slate-300">{formatPlanLabel(plan)}</span>; }
function StatusBadge({ status }: { status: string | null }) { return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getSubscriptionTone(status)}`}>{formatSubscriptionStatus(status)}</span>; }
function LoadingState({ message }: { message: string }) { return <div className="flex min-h-[220px] items-center justify-center"><div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 px-5 py-4 text-slate-200"><Loader2 className="h-5 w-5 animate-spin text-emerald-400" />{message}</div></div>; }
function SuccessState({ message }: { message: string }) { return <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-5 text-sm text-emerald-100">{message}</div>; }
function ErrorState({ message }: { message: string }) { return <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-5 text-sm text-rose-100">{message}</div>; }
function EmptyState() { return <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/40 px-4 py-6 text-sm text-slate-400">Nenhuma assinatura encontrada com os filtros atuais.</div>; }
const filterFieldClassName = 'mt-2 w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-500';
const secondaryActionClassName = 'inline-flex items-center justify-center rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-bold text-slate-200 transition-all hover:border-emerald-500 hover:text-white';
const primaryActionClassName = 'inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-bold text-white transition-all hover:bg-emerald-600 disabled:opacity-60';
