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
  { key: 'totalUsers', label: 'UsuÃƒÂ¡rios', icon: Users },
  { key: 'totalWorkspaces', label: 'Workspaces', icon: Wallet },
  { key: 'activeUsersLast30Days', label: 'UsuÃƒÂ¡rios ativos', icon: Activity },
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
        if (active) setData(next);
      } catch (fetchError) {
        if (active) {
          setError(fetchError instanceof Error ? fetchError.message : 'Falha ao carregar a VisÃ£o Geral.');
        }
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
      <div className="flex min-h-[420px] items-center justify-center">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 px-5 py-4 text-slate-200">
          <Loader2 className="h-5 w-5 animate-spin text-emerald-400" />
          Carregando VisÃ£o Geral...
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-3xl border border-rose-500/20 bg-slate-900/70 p-8">
        <h1 className="text-2xl font-semibold text-white">VisÃ£o Geral</h1>
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
            <h1 className="mt-2 text-3xl font-semibold text-white">VisÃ£o Geral</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
              Acompanhe os indicadores principais da operaÃ§Ã£o, identifique riscos de churn e monitore uso de IA,
              WhatsApp e billing em um sÃƒÂ³ lugar.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/superadmin/users"
              className="inline-flex rounded-full border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:text-white"
            >
              Ver Usuários
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
          const rawValue = data.kpis[key];
          const value = key === 'estimatedMrr' ? formatAdminCurrency(Number(rawValue)) : formatAdminNumber(Number(rawValue));
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
              <p className="text-sm text-slate-400">ConversÃ£o, trials e churn.</p>
            </div>
          </div>
          <div className="mt-6 space-y-4 text-sm">
            <MetricRow label="Trials ativos" value={formatAdminNumber(data.kpis.trialActiveWorkspaces)} />
            <MetricRow label="Workspaces Pro" value={formatAdminNumber(data.kpis.proWorkspaces)} />
            <MetricRow label="Workspaces Premium" value={formatAdminNumber(data.kpis.premiumWorkspaces)} />
            <MetricRow label="Churn / cancelados" value={formatAdminNumber(data.kpis.canceledWorkspaces)} tone="danger" />
            <MetricRow
              label="ConversÃ£o Pro"
              value={formatAdminPercent(data.kpis.proConversionRate)}
              icon={<TrendingUp className="h-4 w-4 text-emerald-300" />}
            />
            <MetricRow
              label="ConversÃ£o Premium"
              value={formatAdminPercent(data.kpis.premiumConversionRate)}
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
            <MetricRow label="Eventos de IA (30 dias)" value={formatAdminNumber(data.kpis.aiUsageEventsLast30Days)} />
            <MetricRow
              label="WhatsApp conectado"
              value={formatAdminNumber(data.kpis.whatsappConnectedWorkspaces)}
              icon={<MessageSquare className="h-4 w-4 text-emerald-300" />}
            />
            <MetricRow label="TransaÃ§Ãµes" value={formatAdminNumber(data.kpis.totalTransactions)} />
            <MetricRow label="Carteiras" value={formatAdminNumber(data.kpis.totalWallets)} />
            <MetricRow label="Investimentos" value={formatAdminNumber(data.kpis.totalInvestments)} />
            <MetricRow label="DÃ­vidas" value={formatAdminNumber(data.kpis.totalDebts)} />
          </div>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
              <TrendingDown className="h-5 w-5 text-rose-300" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">SaÃƒÂºde da operaÃ§Ã£o</h2>
              <p className="text-sm text-slate-400">Monitoramento do que merece atenÃ§Ã£o.</p>
            </div>
          </div>
          <div className="mt-6 space-y-4 text-sm">
            <MetricRow label="Novos cadastros (30 dias)" value={formatAdminNumber(data.kpis.newSignupsLast30Days)} />
            <MetricRow label="UsuÃƒÂ¡rios ativos (30 dias)" value={formatAdminNumber(data.kpis.activeUsersLast30Days)} />
            <MetricRow
              label="Erros recentes"
              value={formatAdminNumber(data.kpis.errorEventsLast30Days)}
              tone={data.kpis.errorEventsLast30Days > 0 ? 'danger' : 'neutral'}
            />
            <MetricRow label="MRR estimado" value={formatAdminCurrency(data.kpis.estimatedMrr)} />
            <p className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 leading-7 text-slate-300">
              Use esta visÃƒÂ£o como termÃ´metro rÃ¡pido. Para aÃƒÂ§ÃƒÂ£o operacional, siga para usuÃƒÂ¡rios e workspaces.
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
                    <span>UsuÃ¡rio: {event.userEmail || 'Sistema'}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
            <h2 className="text-lg font-semibold text-white">Arquitetura pronta para expansÃƒÂ£o</h2>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              Esta base jÃ¡ estÃ¡ preparada para adicionar mÃ³dulos administrativos mais profundos sem quebrar a
              experiÃƒÂªncia principal do SaaS.
            </p>
            <ul className="mt-5 space-y-3 text-sm text-slate-300">
              <li>Planos e assinaturas</li>
              <li>Feature flags</li>
              <li>IA e monitoramento</li>
              <li>WhatsApp</li>
              <li>RelatÃ³rios operacionais</li>
              <li>Logs e auditoria</li>
            </ul>
          </div>
          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
            <h2 className="text-lg font-semibold text-white">Limites atuais</h2>
            <div className="mt-4 space-y-4 text-sm text-slate-300">
              {Object.entries(data.planLimits).map(([plan, limits]) => (
                <div key={plan} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                  <div className="font-semibold text-white">{plan}</div>
                  <div className="mt-2 text-xs leading-6 text-slate-400">
                    {typeof limits.transactionsPerMonth === 'number'
                      ? `${formatAdminNumber(limits.transactionsPerMonth)} TransaÃ§Ãµes/mÃƒÂªs`
                      : 'TransaÃ§Ãµes ilimitadas'}
                    {' Â· '}
                    {typeof limits.aiInteractionsPerMonth === 'number'
                      ? `${formatAdminNumber(limits.aiInteractionsPerMonth)} IA/mÃƒÂªs`
                      : 'IA ilimitada'}
                    {' Â· '}
                    RelatÃ³rios {limits.reports}
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
  return <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/40 px-4 py-6 text-sm text-slate-400">{text}</div>;
}
