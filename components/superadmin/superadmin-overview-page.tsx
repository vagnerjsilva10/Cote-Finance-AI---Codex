'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Activity,
  Bot,
  CreditCard,
  DollarSign,
  Loader2,
  MessageSquare,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
  ShieldAlert,
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

const KPI_CARDS = [
  { key: 'totalUsers', label: 'Usuarios', icon: Users },
  { key: 'totalWorkspaces', label: 'Workspaces', icon: Wallet },
  { key: 'activeUsers', label: 'Usuarios ativos', icon: Activity },
  { key: 'estimatedMrr', label: 'MRR estimado', icon: DollarSign },
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
        if (active) {
          setData(next);
        }
      } catch (fetchError) {
        if (active) {
          setError(fetchError instanceof Error ? fetchError.message : 'Falha ao carregar a Visao Geral.');
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void run();
    return () => {
      active = false;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 px-5 py-4 text-slate-200">
          <Loader2 className="h-5 w-5 animate-spin text-emerald-400" />
          Carregando Visao Geral...
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-3xl border border-rose-500/20 bg-slate-900/70 p-8">
        <h1 className="text-2xl font-semibold text-white">Visao Geral</h1>
        <p className="mt-4 text-sm leading-7 text-rose-200">{error || 'Falha ao carregar dados.'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-300">Super Admin</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Visao Geral</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
              Acompanhe os indicadores principais da operacao, identifique sinais de churn e monitore uso de IA,
              WhatsApp e billing em um unico lugar.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/superadmin/users"
              className="inline-flex rounded-full border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:text-white"
            >
              Ver usuarios
            </Link>
            <Link
              href="/superadmin/workspaces"
              className="inline-flex rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
            >
              Ver workspaces
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {KPI_CARDS.map(({ key, label, icon: Icon }) => {
          const rawValue = data.metrics[key];
          const value =
            key === 'estimatedMrr'
              ? formatAdminCurrency(Number(rawValue))
              : formatAdminNumber(Number(rawValue));

          return (
            <div key={key} className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">{label}</p>
                  <p className="mt-4 text-3xl font-semibold text-white">{value}</p>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
                  <Icon className="h-5 w-5 text-emerald-300" />
                </div>
              </div>
            </div>
          );
        })}
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
              <CreditCard className="h-5 w-5 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Billing</h2>
              <p className="text-sm text-slate-400">Conversao, trials e churn.</p>
            </div>
          </div>
          <div className="mt-6 space-y-4 text-sm">
            <MetricRow
              label="Trials ativos"
              value={data.metrics.activeTrials === null ? 'Nao rastreado' : formatAdminNumber(data.metrics.activeTrials)}
            />
            <MetricRow label="Workspaces Pro" value={formatAdminNumber(data.metrics.proWorkspaces)} />
            <MetricRow label="Workspaces Premium" value={formatAdminNumber(data.metrics.premiumWorkspaces)} />
            <MetricRow
              label="Cancelamentos"
              value={formatAdminNumber(data.metrics.canceledWorkspaces)}
              tone="danger"
            />
            <MetricRow
              label="Conversao Pro"
              value={formatAdminPercent(data.conversion.proRate)}
              icon={<TrendingUp className="h-4 w-4 text-emerald-300" />}
            />
            <MetricRow
              label="Conversao Premium"
              value={formatAdminPercent(data.conversion.premiumRate)}
              icon={<TrendingUp className="h-4 w-4 text-sky-300" />}
            />
          </div>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
              <Bot className="h-5 w-5 text-sky-300" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Uso do produto</h2>
              <p className="text-sm text-slate-400">IA, WhatsApp e dados financeiros.</p>
            </div>
          </div>
          <div className="mt-6 space-y-4 text-sm">
            <MetricRow label="Eventos de IA (30 dias)" value={formatAdminNumber(data.metrics.aiUsageLast30Days)} />
            <MetricRow
              label="WhatsApp conectado"
              value={formatAdminNumber(data.metrics.whatsappConnectedWorkspaces)}
              icon={<MessageSquare className="h-4 w-4 text-emerald-300" />}
            />
            <MetricRow label="Transacoes" value={formatAdminNumber(data.metrics.totalTransactions)} />
            <MetricRow label="Carteiras" value={formatAdminNumber(data.metrics.totalWallets)} />
            <MetricRow label="Investimentos" value={formatAdminNumber(data.metrics.totalInvestments)} />
            <MetricRow label="Dividas" value={formatAdminNumber(data.metrics.totalDebts)} />
          </div>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
              <TrendingDown className="h-5 w-5 text-rose-300" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Saude da operacao</h2>
              <p className="text-sm text-slate-400">Monitoramento do que merece atencao.</p>
            </div>
          </div>
          <div className="mt-6 space-y-4 text-sm">
            <MetricRow label="Novos cadastros (30 dias)" value={formatAdminNumber(data.metrics.newSignupsLast30Days)} />
            <MetricRow label="Usuarios ativos (30 dias)" value={formatAdminNumber(data.metrics.activeUsers)} />
          <MetricRow
              label="Erros recentes"
              value={formatAdminNumber(data.metrics.errorEventsLast30Days)}
              tone={data.metrics.errorEventsLast30Days > 0 ? 'danger' : 'neutral'}
            />
            <MetricRow label="Ações admin (30 dias)" value={formatAdminNumber(data.metrics.adminActionsLast30Days)} />
            <MetricRow label="Workspaces suspensos" value={formatAdminNumber(data.metrics.suspendedWorkspaces)} tone={data.metrics.suspendedWorkspaces > 0 ? 'danger' : 'neutral'} />
            <MetricRow label="MRR estimado" value={formatAdminCurrency(data.metrics.estimatedMrr)} />
            <p className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 leading-7 text-slate-300">
              Use esta visao como termometro rapido. Para acao operacional, siga para usuarios e workspaces.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.4fr_0.8fr]">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-white">Eventos recentes</h2>
              <p className="text-sm text-slate-400">Sinais operacionais recentes de toda a plataforma.</p>
            </div>
            <span className="rounded-full border border-slate-700 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
              {data.recentEvents.length} eventos
            </span>
          </div>
          <div className="mt-6 space-y-3">
            {data.recentEvents.length === 0 ? (
              <EmptyState text="Nenhum evento recente encontrado." />
            ) : (
              data.recentEvents.map((event) => (
                <div
                  key={event.id}
                  className="rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm text-slate-300"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="font-semibold text-white">{humanizeEventType(event.type)}</div>
                    <div className="text-xs text-slate-500">{formatAdminDateTime(event.createdAt)}</div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-400">
                    <span>Workspace: {event.workspaceName || 'Sem workspace'}</span>
                    <span>Usuario: {event.userEmail || 'Sistema'}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
                <ShieldAlert className="h-5 w-5 text-amber-300" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Alertas operacionais</h2>
                <p className="text-sm text-slate-400">Sinais que pedem ação direta do Super Admin.</p>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              {data.alerts.length === 0 ? (
                <EmptyState text="Nenhum alerta operacional relevante no momento." />
              ) : (
                data.alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={
                      alert.tone === 'danger'
                        ? 'rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4'
                        : alert.tone === 'warning'
                          ? 'rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4'
                          : 'rounded-2xl border border-sky-500/20 bg-sky-500/10 p-4'
                    }
                  >
                    <div className="flex items-start justify-between gap-4">
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

          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
            <h2 className="text-lg font-semibold text-white">Arquitetura pronta para expansao</h2>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              Esta base ja esta preparada para adicionar modulos administrativos mais profundos sem quebrar a
              experiencia principal do SaaS.
            </p>
            <ul className="mt-5 space-y-3 text-sm text-slate-300">
              <li>Planos e assinaturas</li>
              <li>Feature flags</li>
              <li>IA e monitoramento</li>
              <li>WhatsApp</li>
              <li>Relatorios operacionais</li>
              <li>Logs e auditoria</li>
            </ul>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
            <h2 className="text-lg font-semibold text-white">Limites atuais</h2>
            <div className="mt-4 space-y-4 text-sm text-slate-300">
              {Object.entries(data.limitsReference).map(([plan, limits]) => (
                <div key={plan} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                  <div className="font-semibold text-white">{plan}</div>
                  <div className="mt-2 text-xs leading-6 text-slate-400">
                    {typeof limits.transactionsPerMonth === 'number'
                      ? `${formatAdminNumber(limits.transactionsPerMonth)} transacoes/mes`
                      : 'Transacoes ilimitadas'}
                    {' · '}
                    {typeof limits.aiInteractionsPerMonth === 'number'
                      ? `${formatAdminNumber(limits.aiInteractionsPerMonth)} IA/mes`
                      : 'IA ilimitada'}
                    {' · '}
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

function MetricRow({
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
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3">
      <div className="flex items-center gap-2 text-slate-400">
        {icon}
        <span>{label}</span>
      </div>
      <span className={tone === 'danger' ? 'font-semibold text-rose-300' : 'font-semibold text-white'}>{value}</span>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/40 px-4 py-6 text-sm text-slate-400">
      {text}
    </div>
  );
}
