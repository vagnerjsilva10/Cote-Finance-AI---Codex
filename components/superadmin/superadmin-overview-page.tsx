'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Activity,
  AlertTriangle,
  Bot,
  CreditCard,
  DollarSign,
  Loader2,
  MessageSquare,
  ShieldAlert,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';

import { fetchSuperadminJson } from '@/components/superadmin/fetch-superadmin-json';
import {
  formatAdminCurrency,
  formatAdminDateTime,
  formatAdminNumber,
  formatAdminPercent,
  humanizeEventType,
} from '@/components/superadmin/superadmin-utils';
import type { SuperadminOverviewResponse } from '@/lib/superadmin/types';

const PRIMARY_METRICS = [
  { key: 'totalUsers', label: 'Usuarios', icon: Users },
  { key: 'totalWorkspaces', label: 'Workspaces', icon: Wallet },
  { key: 'activeUsers', label: 'Ativos 30d', icon: Activity },
  { key: 'estimatedMrr', label: 'MRR', icon: DollarSign },
] as const;

export function SuperadminOverviewPage() {
  const [data, setData] = React.useState<SuperadminOverviewResponse | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    let active = true;

    const run = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const next = await fetchSuperadminJson<SuperadminOverviewResponse>('/api/superadmin/overview');
        if (active) setData(next);
      } catch (fetchError) {
        if (active) setError(fetchError instanceof Error ? fetchError.message : 'Falha ao carregar a Visao Geral.');
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void run();
    return () => {
      active = false;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex min-h-[360px] items-center justify-center">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 px-5 py-4 text-slate-200">
          <Loader2 className="h-5 w-5 animate-spin text-emerald-400" />
          Carregando visao geral...
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-rose-500/20 bg-slate-900/70 p-6">
        <h1 className="text-2xl font-bold text-white">Visao geral</h1>
        <p className="mt-3 text-sm leading-7 text-rose-200">{error || 'Falha ao carregar os dados da plataforma.'}</p>
      </div>
    );
  }

  const recentEvents = Array.isArray(data.recentEvents) ? data.recentEvents : [];
  const alerts = Array.isArray(data.alerts) ? data.alerts : [];
  const limitsReference =
    data.limitsReference && typeof data.limitsReference === 'object' ? data.limitsReference : {};

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.24em] text-emerald-300">
                Super Admin
              </span>
              <span className="rounded-full border border-slate-800 bg-slate-950/70 px-2.5 py-1 text-[11px] font-medium text-slate-400">
                Centro de comando da plataforma
              </span>
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">Visao operacional em tempo real</h1>
              <p className="mt-2 text-sm leading-6 text-slate-300">Usuarios, billing, IA, WhatsApp e risco em uma leitura curta.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <QuickAction href="/superadmin/users">Abrir usuarios</QuickAction>
            <QuickAction href="/superadmin/workspaces">Abrir workspaces</QuickAction>
            <QuickAction href="/superadmin/subscriptions">Operar billing</QuickAction>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {PRIMARY_METRICS.map(({ key, label, icon: Icon }) => {
          const rawValue = data.metrics[key];
          const value = key === 'estimatedMrr' ? formatAdminCurrency(Number(rawValue)) : formatAdminNumber(Number(rawValue));

          return (
            <div key={key} className="rounded-2xl border border-slate-800 bg-slate-900/50 px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">{label}</p>
                  <p className="text-2xl font-bold tracking-tight text-white">{value}</p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-2.5">
                  <Icon className="h-4.5 w-4.5 text-emerald-300" />
                </div>
              </div>
            </div>
          );
        })}
      </section>

      <section className="grid gap-3 xl:grid-cols-12">
        <div className="space-y-3 xl:col-span-8">
          <div className="grid gap-3 lg:grid-cols-3">
            <ControlCard
              icon={<CreditCard className="h-4.5 w-4.5 text-emerald-300" />}
              title="Billing"
              subtitle="Conversao, pagantes e churn"
              rows={[
                { label: 'Pagantes', value: formatAdminNumber(data.metrics.payingWorkspaces) },
                { label: 'Canceladas', value: formatAdminNumber(data.metrics.canceledWorkspaces), tone: data.metrics.canceledWorkspaces > 0 ? 'danger' : 'neutral' },
                { label: 'Conversao Pro', value: formatAdminPercent(data.conversion.proRate) },
                { label: 'Conversao Premium', value: formatAdminPercent(data.conversion.premiumRate) },
              ]}
            />
            <ControlCard
              icon={<Bot className="h-4.5 w-4.5 text-sky-300" />}
              title="Uso de produto"
              subtitle="IA, WhatsApp e atividade"
              rows={[
                { label: 'Eventos IA 30d', value: formatAdminNumber(data.metrics.aiUsageLast30Days) },
                { label: 'WhatsApp conectado', value: formatAdminNumber(data.metrics.whatsappConnectedWorkspaces) },
                { label: 'Transacoes', value: formatAdminNumber(data.metrics.totalTransactions) },
                { label: 'Carteiras', value: formatAdminNumber(data.metrics.totalWallets) },
              ]}
            />
            <ControlCard
              icon={<AlertTriangle className="h-4.5 w-4.5 text-amber-300" />}
              title="Saude da operacao"
              subtitle="Sinais que exigem atencao"
              rows={[
                { label: 'Erros recentes', value: formatAdminNumber(data.metrics.errorEventsLast30Days), tone: data.metrics.errorEventsLast30Days > 0 ? 'danger' : 'neutral' },
                { label: 'Usuarios suspensos', value: formatAdminNumber(data.metrics.suspendedUsers), tone: data.metrics.suspendedUsers > 0 ? 'danger' : 'neutral' },
                { label: 'Usuarios bloqueados', value: formatAdminNumber(data.metrics.blockedUsers), tone: data.metrics.blockedUsers > 0 ? 'danger' : 'neutral' },
                { label: 'Workspaces suspensos', value: formatAdminNumber(data.metrics.suspendedWorkspaces), tone: data.metrics.suspendedWorkspaces > 0 ? 'danger' : 'neutral' },
              ]}
            />
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-white">Eventos recentes</h2>
                <p className="mt-1 text-sm text-slate-400">Sinais operacionais recentes de toda a plataforma.</p>
              </div>
              <span className="rounded-full border border-slate-800 bg-slate-950/70 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
                {recentEvents.length} eventos
              </span>
            </div>

            <div className="mt-3 space-y-2.5">
              {recentEvents.length === 0 ? (
                <EmptyState text="Nenhum evento recente encontrado." />
              ) : (
                recentEvents.map((event) => (
                  <div key={event.id} className="rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="font-semibold text-white">{humanizeEventType(event.type)}</div>
                      <div className="text-xs text-slate-500">{formatAdminDateTime(event.createdAt)}</div>
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-4 text-xs text-slate-400">
                      <span>Workspace: {event.workspaceName || 'Sem workspace'}</span>
                      <span>Usuario: {event.userEmail || 'Sistema'}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="space-y-3 xl:col-span-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-2.5">
                <ShieldAlert className="h-4.5 w-4.5 text-amber-300" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Alertas operacionais</h2>
                <p className="text-sm text-slate-400">Fila de acao do Super Admin.</p>
              </div>
            </div>
            <div className="mt-3 space-y-2.5">
              {alerts.length === 0 ? (
                <EmptyState text="Nenhum alerta relevante no momento." />
              ) : (
                alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={
                      alert.tone === 'danger'
                        ? 'rounded-xl border border-rose-500/20 bg-rose-500/10 p-3.5'
                        : alert.tone === 'warning'
                          ? 'rounded-xl border border-amber-500/20 bg-amber-500/10 p-3.5'
                          : 'rounded-xl border border-sky-500/20 bg-sky-500/10 p-3.5'
                    }
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-white">{alert.title}</p>
                        <p className="mt-1 text-sm leading-6 text-slate-200">{alert.description}</p>
                      </div>
                      {alert.href ? (
                        <Link href={alert.href} className="text-xs font-semibold text-white underline-offset-4 hover:underline">
                          Abrir
                        </Link>
                      ) : null}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-2.5">
                <TrendingUp className="h-4.5 w-4.5 text-emerald-300" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Governanca ativa</h2>
                <p className="text-sm text-slate-400">Indicadores de supervisao central.</p>
              </div>
            </div>
            <div className="mt-3 space-y-2.5">
              <MetricPill label="Acoes admin 30d" value={formatAdminNumber(data.metrics.adminActionsLast30Days)} />
              <MetricPill label="Assinaturas com nota" value={formatAdminNumber(data.metrics.subscriptionsWithNotes)} />
              <MetricPill label="Novos cadastros 30d" value={formatAdminNumber(data.metrics.newSignupsLast30Days)} />
              <MetricPill label="Integracoes WhatsApp" value={formatAdminNumber(data.metrics.whatsappConnectedWorkspaces)} icon={<MessageSquare className="h-3.5 w-3.5 text-emerald-300" />} />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
            <h2 className="text-lg font-bold text-white">Limites vigentes</h2>
            <div className="mt-4 space-y-2.5">
              {Object.entries(limitsReference).map(([plan, limits]) => (
                <div key={plan} className="rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3">
                  <div className="text-sm font-semibold text-white">{plan}</div>
                  <div className="mt-1.5 text-xs leading-6 text-slate-400">
                    {typeof limits.transactionsPerMonth === 'number'
                      ? `${formatAdminNumber(limits.transactionsPerMonth)} transacoes/mes`
                      : 'Transacoes ilimitadas'}
                    {' Â· '}
                    {typeof limits.aiInteractionsPerMonth === 'number'
                      ? `${formatAdminNumber(limits.aiInteractionsPerMonth)} IA/mes`
                      : 'IA ilimitada'}
                    {' Â· '}
                    Relatorios {limits.reports}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function QuickAction({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:border-emerald-500 hover:text-white"
    >
      {children}
    </Link>
  );
}

function ControlCard({
  icon,
  title,
  subtitle,
  rows,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  rows: Array<{ label: string; value: string; tone?: 'neutral' | 'danger' }>;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
      <div className="flex items-center gap-3">
        <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-2.5">{icon}</div>
        <div>
          <h2 className="text-base font-bold text-white">{title}</h2>
          <p className="text-sm text-slate-400">{subtitle}</p>
        </div>
      </div>
      <div className="mt-4 space-y-2.5">
        {rows.map((row) => (
          <MetricPill key={row.label} label={row.label} value={row.value} tone={row.tone} />
        ))}
      </div>
    </div>
  );
}

function MetricPill({
  label,
  value,
  tone = 'neutral',
  icon,
}: {
  label: string;
  value: string;
  tone?: 'neutral' | 'danger';
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-950/60 px-3.5 py-3">
      <div className="flex items-center gap-2 text-sm text-slate-400">
        {icon}
        <span>{label}</span>
      </div>
      <span className={tone === 'danger' ? 'text-sm font-semibold text-rose-300' : 'text-sm font-semibold text-white'}>{value}</span>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/40 px-4 py-5 text-sm text-slate-400">{text}</div>;
}

