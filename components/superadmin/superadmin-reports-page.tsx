'use client';

import * as React from 'react';
import { ArrowUpRight, BarChart3, Loader2, Radar, Users } from 'lucide-react';

import { fetchSuperadminJson } from '@/components/superadmin/fetch-superadmin-json';
import {
  formatAdminCurrency,
  formatAdminNumber,
  formatAdminPercent,
  formatPlanLabel,
} from '@/components/superadmin/superadmin-utils';
import {
  SuperadminActionLink,
  SuperadminMetricChip,
  SuperadminPageHeader,
  SuperadminSectionCard,
} from '@/components/superadmin/superadmin-page-primitives';
import type { SuperadminReportsResponse } from '@/lib/superadmin/types';

export function SuperadminReportsPage() {
  const [data, setData] = React.useState<SuperadminReportsResponse | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    let active = true;

    const run = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const next = await fetchSuperadminJson<SuperadminReportsResponse>('/api/superadmin/reports');
        if (active) setData(next);
      } catch (fetchError) {
        if (active) {
          setError(fetchError instanceof Error ? fetchError.message : 'Falha ao carregar relatórios executivos.');
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

  const summary = data?.summary;
  const monthlyTrendMax = Math.max(
    ...(data?.monthlyTrend.map((item) => Math.max(item.signups, item.transactions, item.aiEvents, item.newWorkspaces)) ?? [0]),
    1
  );
  const payingRate =
    summary && summary.totalWorkspaces > 0 ? (summary.payingWorkspaces / summary.totalWorkspaces) * 100 : 0;
  const activationRate =
    data && data.funnel.totalUsers > 0 ? (data.funnel.totalWorkspaces / data.funnel.totalUsers) * 100 : 0;

  return (
    <div className="space-y-6">
      <SuperadminPageHeader
        eyebrow="Relatórios"
        title="Visão executiva da plataforma"
        description="Acompanhe crescimento, mix de receita, ativação e intensidade operacional em um painel consolidado para decisões mais rápidas no Superadmin."
        actions={<SuperadminActionLink href="/superadmin/audit-logs">Ver logs de auditoria</SuperadminActionLink>}
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SuperadminMetricChip label="MRR estimado" value={formatAdminCurrency(summary?.estimatedMrr || 0)} tone="success" />
          <SuperadminMetricChip label="Pagantes" value={formatAdminNumber(summary?.payingWorkspaces || 0)} />
          <SuperadminMetricChip label="Signups 30d" value={formatAdminNumber(summary?.newSignupsLast30Days || 0)} tone="info" />
          <SuperadminMetricChip label="Usuários ativos 30d" value={formatAdminNumber(summary?.activeUsersLast30Days || 0)} />
        </div>
      </SuperadminPageHeader>

      <SuperadminSectionCard
        title="Pulso executivo"
        description="Os principais números para ler crescimento, ativação e intensidade operacional sem navegar por múltiplos módulos."
      >
        {isLoading ? (
          <LoadingState message="Carregando visão executiva..." />
        ) : error || !data ? (
          <ErrorState message={error || 'Falha ao carregar visão executiva.'} />
        ) : (
          <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <ExecutiveTile
                label="Workspaces"
                value={formatAdminNumber(data.summary.totalWorkspaces)}
                description="Base total cadastrada na plataforma."
                icon={<Users className="h-4 w-4 text-emerald-300" />}
              />
              <ExecutiveTile
                label="Transações 30d"
                value={formatAdminNumber(data.summary.transactionsLast30Days)}
                description="Volume recente que indica adoção do core financeiro."
                icon={<BarChart3 className="h-4 w-4 text-cyan-300" />}
              />
              <ExecutiveTile
                label="IA ativa"
                value={formatAdminNumber(data.summary.aiActiveWorkspacesLast30Days)}
                description="Contas com uso real de IA na janela recente."
                icon={<Radar className="h-4 w-4 text-violet-300" />}
              />
              <ExecutiveTile
                label="WhatsApp conectado"
                value={formatAdminNumber(data.summary.whatsappConnectedWorkspaces)}
                description="Workspaces com canal conectado nos últimos 30 dias."
                icon={<ArrowUpRight className="h-4 w-4 text-amber-300" />}
              />
            </div>

            <div className="rounded-[1.6rem] border border-white/10 bg-slate-950/55 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Indicadores compostos</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <BreakdownTile
                  label="Conversão para pagantes"
                  value={formatAdminPercent(payingRate)}
                  description="Participação atual de workspaces Pro e Premium dentro da base total."
                />
                <BreakdownTile
                  label="Ativação de workspaces"
                  value={formatAdminPercent(activationRate)}
                  description="Percentual de usuários que já criaram workspace dentro da plataforma."
                />
                <BreakdownTile
                  label="Uso de IA 30d"
                  value={formatAdminNumber(data.summary.aiUsageLast30Days)}
                  description="Total de interações registradas entre chat e classificação automática."
                />
                <BreakdownTile
                  label="Transações totais"
                  value={formatAdminNumber(data.summary.totalTransactions)}
                  description="Base consolidada de movimentações processadas no produto."
                />
              </div>
            </div>
          </div>
        )}
      </SuperadminSectionCard>

      <SuperadminSectionCard
        title="Crescimento nos últimos 6 meses"
        description="Leitura rápida da evolução de aquisição, criação de workspaces, uso de IA e volume de transações em uma única grade."
      >
        {isLoading ? (
          <LoadingState message="Carregando série histórica..." />
        ) : error || !data ? (
          <ErrorState message={error || 'Falha ao carregar série histórica.'} />
        ) : (
          <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="grid gap-3 rounded-[1.6rem] border border-white/10 bg-slate-950/55 p-4 md:grid-cols-3 xl:grid-cols-6">
              {data.monthlyTrend.map((item) => (
                <MonthTrendCard key={item.month} item={item} maxValue={monthlyTrendMax} />
              ))}
            </div>
            <div className="space-y-3">
              <BreakdownTile
                label="Novos usuários"
                value={formatAdminNumber(data.monthlyTrend.reduce((total, item) => total + item.signups, 0))}
                description="Usuários criados ao longo da janela observada."
              />
              <BreakdownTile
                label="Novos workspaces"
                value={formatAdminNumber(data.monthlyTrend.reduce((total, item) => total + item.newWorkspaces, 0))}
                description="Indicador de ativação e primeira configuração do produto."
              />
              <BreakdownTile
                label="Transações recentes"
                value={formatAdminNumber(data.monthlyTrend.reduce((total, item) => total + item.transactions, 0))}
                description="Sinal direto de uso do core financeiro nos últimos meses."
              />
            </div>
          </div>
        )}
      </SuperadminSectionCard>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <SuperadminSectionCard
          title="Mix de planos"
          description="Distribuição atual da base entre Free, Pro e Premium, com leitura rápida do impacto em receita."
        >
          {isLoading ? (
            <LoadingState message="Carregando mix de planos..." />
          ) : error || !data ? (
            <ErrorState message={error || 'Falha ao carregar mix de planos.'} />
          ) : (
            <div className="space-y-3">
              {data.planMix.map((item) => (
                <article key={item.plan} className="rounded-2xl border border-white/10 bg-slate-950/55 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-white">{formatPlanLabel(item.plan)}</p>
                      <p className="mt-1 text-xs text-slate-400">{formatAdminNumber(item.workspaces)} workspace(s)</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-white">{formatAdminCurrency(item.estimatedMrr)}</p>
                      <p className="mt-1 text-xs text-slate-500">MRR estimado</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </SuperadminSectionCard>

        <SuperadminSectionCard
          title="Funil e operação"
          description="Um resumo enxuto de ativação do produto e do volume operacional distribuído por categoria de eventos."
        >
          {isLoading ? (
            <LoadingState message="Carregando funil e operação..." />
          ) : error || !data ? (
            <ErrorState message={error || 'Falha ao carregar funil e operação.'} />
          ) : (
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <InfoPill label="Usuários totais" value={formatAdminNumber(data.funnel.totalUsers)} />
                <InfoPill label="Workspaces criados" value={formatAdminNumber(data.funnel.totalWorkspaces)} />
                <InfoPill label="Pagantes" value={formatAdminNumber(data.funnel.payingWorkspaces)} />
                <InfoPill label="WhatsApp conectado" value={formatAdminNumber(data.funnel.whatsappConnectedWorkspaces)} />
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                <OperationStat label="IA" value={data.operations.ai} tone="emerald" />
                <OperationStat label="WhatsApp" value={data.operations.whatsapp} tone="sky" />
                <OperationStat label="Billing" value={data.operations.billing} tone="amber" />
                <OperationStat label="Tracking" value={data.operations.tracking} tone="violet" />
                <OperationStat label="Produto" value={data.operations.product} />
              </div>
            </div>
          )}
        </SuperadminSectionCard>
      </div>
    </div>
  );
}

function ExecutiveTile({
  label,
  value,
  description,
  icon,
}: {
  label: string;
  value: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/55 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</p>
        {icon}
      </div>
      <p className="mt-3 text-xl font-semibold text-white">{value}</p>
      <p className="mt-2 text-xs leading-6 text-slate-400">{description}</p>
    </div>
  );
}

function BreakdownTile({ label, value, description }: { label: string; value: string; description: string }) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/65 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
      <p className="mt-2 text-xs leading-6 text-slate-400">{description}</p>
    </div>
  );
}

function MonthTrendCard({
  item,
  maxValue,
}: {
  item: SuperadminReportsResponse['monthlyTrend'][number];
  maxValue: number;
}) {
  const bars = [
    { key: 'signups', label: 'Usuários', value: item.signups, className: 'bg-emerald-400/90' },
    { key: 'workspaces', label: 'Workspaces', value: item.newWorkspaces, className: 'bg-cyan-400/90' },
    { key: 'transactions', label: 'Transações', value: item.transactions, className: 'bg-violet-400/90' },
    { key: 'ai', label: 'IA', value: item.aiEvents, className: 'bg-amber-400/90' },
  ];

  return (
    <article className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{item.month}</p>
      <div className="mt-4 flex h-32 items-end gap-2">
        {bars.map((bar) => {
          const height = Math.max(8, Math.round((bar.value / maxValue) * 100));
          return (
            <div key={bar.key} className="flex flex-1 flex-col items-center justify-end gap-2">
              <div className="flex h-full w-full items-end rounded-xl border border-white/5 bg-white/[0.03] p-1">
                <div className={`w-full rounded-lg ${bar.className}`} style={{ height: `${height}%` }} title={`${bar.label}: ${bar.value}`} />
              </div>
              <span className="text-[10px] font-semibold text-slate-400">{formatAdminNumber(bar.value)}</span>
            </div>
          );
        })}
      </div>
      <div className="mt-3 grid gap-1">
        {bars.map((bar) => (
          <div key={bar.key} className="flex items-center justify-between text-[11px] text-slate-400">
            <span>{bar.label}</span>
            <span className="font-semibold text-slate-200">{formatAdminNumber(bar.value)}</span>
          </div>
        ))}
      </div>
    </article>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function OperationStat({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: number;
  tone?: 'default' | 'emerald' | 'sky' | 'amber' | 'violet';
}) {
  const toneClassName =
    tone === 'emerald'
      ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-100'
      : tone === 'sky'
        ? 'border-sky-500/20 bg-sky-500/10 text-sky-100'
        : tone === 'amber'
          ? 'border-amber-500/20 bg-amber-500/10 text-amber-100'
          : tone === 'violet'
            ? 'border-violet-500/20 bg-violet-500/10 text-violet-100'
            : 'border-white/10 bg-white/5 text-slate-200';

  return (
    <div className={`rounded-2xl border px-4 py-3 ${toneClassName}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] opacity-80">{label}</p>
      <p className="mt-2 text-lg font-semibold">{formatAdminNumber(value)}</p>
    </div>
  );
}

function LoadingState({ message }: { message: string }) {
  return (
    <div className="flex min-h-[220px] items-center justify-center">
      <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/60 px-5 py-4 text-slate-200">
        <Loader2 className="h-5 w-5 animate-spin text-emerald-400" />
        {message}
      </div>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-5 text-sm text-rose-100">{message}</div>;
}
