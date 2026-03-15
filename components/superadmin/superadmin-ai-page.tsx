'use client';

import * as React from 'react';
import Link from 'next/link';
import { Bot, Loader2, RotateCcw, Search, Sparkles } from 'lucide-react';

import { fetchSuperadminJson, useDebouncedValue } from '@/components/superadmin/fetch-superadmin-json';
import {
  formatAdminDateTime,
  formatAdminNumber,
  formatAdminPercent,
  formatPlanLabel,
  humanizeEventType,
} from '@/components/superadmin/superadmin-utils';
import {
  SuperadminActionLink,
  SuperadminMetricChip,
  SuperadminPageHeader,
  SuperadminSectionCard,
} from '@/components/superadmin/superadmin-page-primitives';
import type { SuperadminAiResetResponse, SuperadminAiResponse } from '@/lib/superadmin/types';

const PLAN_OPTIONS = [
  { value: 'ALL', label: 'Todos os planos' },
  { value: 'FREE', label: 'Free' },
  { value: 'PRO', label: 'Pro' },
  { value: 'PREMIUM', label: 'Premium' },
];

export function SuperadminAiPage() {
  const [query, setQuery] = React.useState('');
  const [plan, setPlan] = React.useState('ALL');
  const debouncedQuery = useDebouncedValue(query, 250);
  const [data, setData] = React.useState<SuperadminAiResponse | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [actionMessage, setActionMessage] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [resettingWorkspaceId, setResettingWorkspaceId] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;

    const run = async () => {
      try {
        setIsLoading(true);
        setError(null);
        setActionMessage(null);

        const params = new URLSearchParams();
        if (debouncedQuery.trim()) params.set('q', debouncedQuery.trim());
        if (plan !== 'ALL') params.set('plan', plan);

        const next = await fetchSuperadminJson<SuperadminAiResponse>(
          `/api/superadmin/ai${params.toString() ? `?${params.toString()}` : ''}`
        );

        if (active) setData(next);
      } catch (fetchError) {
        if (active) setError(fetchError instanceof Error ? fetchError.message : 'Falha ao carregar operação de IA.');
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void run();

    return () => {
      active = false;
    };
  }, [debouncedQuery, plan]);

  const summary = data?.summary;
  const trendMax = Math.max(...(data?.trend.map((item) => item.total) ?? [0]), 1);

  return (
    <div className="space-y-5">
      <SuperadminPageHeader
        eyebrow="IA"
        title="Operação de IA"
        description="Monitore uso, quota, tendencia e saude operacional da IA em um unico painel."
        actions={<SuperadminActionLink href="/superadmin/feature-flags">Ver feature flags</SuperadminActionLink>}
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SuperadminMetricChip label="Interações no mês" value={formatAdminNumber(summary?.totalInteractionsThisMonth || 0)} />
          <SuperadminMetricChip label="Workspaces ativos" value={formatAdminNumber(summary?.activeWorkspaces || 0)} tone="success" />
          <SuperadminMetricChip label="Próximos do limite" value={formatAdminNumber(summary?.workspacesNearLimit || 0)} tone="info" />
          <SuperadminMetricChip label="IA ativa no setup" value={formatAdminNumber(summary?.aiSuggestionsEnabled || 0)} />
        </div>
      </SuperadminPageHeader>

      {actionMessage ? <SuccessState message={actionMessage} /> : null}

      <SuperadminSectionCard
        title="Saude operacional"
        description="Status do provedor, quotas e media de uso."
      >
        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatusTile
              label="Gemini"
              value={summary?.geminiConfigured ? 'Configurado' : 'Pendente'}
              tone={summary?.geminiConfigured ? 'success' : 'danger'}
              description={summary?.geminiConfigured ? 'Chave do provedor disponível no servidor.' : 'Defina GEMINI_API_KEY para liberar os fluxos de IA.'}
            />
            <StatusTile
              label="Chat com IA"
              value={formatAdminNumber(summary?.chatInteractionsThisMonth || 0)}
              description="Perguntas, leituras e explicações geradas pelo assistente no mês atual."
            />
            <StatusTile
              label="Classificação"
              value={formatAdminNumber(summary?.classifyInteractionsThisMonth || 0)}
              description="Classificações automáticas de transações geradas no mês atual."
            />
            <StatusTile
              label="Média por workspace"
              value={formatAdminNumber(summary?.averageUsagePerActiveWorkspace || 0)}
              description="Interações médias entre as contas que realmente usaram IA no mês."
            />
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Quotas por plano</p>
                <h3 className="mt-2 text-lg font-semibold text-white">Referência operacional</h3>
              </div>
              <Sparkles className="h-5 w-5 text-emerald-300" />
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {Object.entries(data?.quotaReference || {}).map(([planKey, limits]) => (
                <div key={planKey} className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{formatPlanLabel(planKey)}</p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    {typeof limits.aiInteractionsPerMonth === 'number' ? formatAdminNumber(limits.aiInteractionsPerMonth) : 'Ilimitada'}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-400">interações de IA por mês</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </SuperadminSectionCard>

      <SuperadminSectionCard
        title="Tendencia dos ultimos 14 dias"
        description="Aceleracao e desaceleracao do uso de IA."
      >
        {isLoading ? (
          <LoadingState message="Carregando tendência de IA..." />
        ) : error || !data ? (
          <ErrorState message={error || 'Falha ao carregar tendência de IA.'} />
        ) : (
          <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="grid h-56 grid-cols-7 gap-3 rounded-2xl border border-white/10 bg-slate-950/55 p-4 sm:grid-cols-14">
              {data.trend.map((item) => {
                const height = Math.max(12, Math.round((item.total / trendMax) * 100));
                return (
                  <div key={item.date} className="flex min-w-0 flex-col justify-end gap-3">
                    <div className="flex flex-1 items-end justify-center rounded-2xl border border-white/5 bg-white/[0.03] px-1 pb-1 pt-4">
                      <div
                        className="w-full rounded-xl bg-[linear-gradient(180deg,rgba(16,185,129,.95),rgba(6,182,212,.75))] shadow-[0_16px_40px_-24px_rgba(16,185,129,.9)]"
                        style={{ height: `${height}%` }}
                        title={`${item.total} interações em ${item.date}`}
                      />
                    </div>
                    <div className="text-center">
                      <p className="text-[11px] font-semibold text-white">{formatAdminNumber(item.total)}</p>
                      <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-slate-500">{item.date.slice(8, 10)}/{item.date.slice(5, 7)}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="space-y-3">
              <BreakdownTile label="Último recorte" value={`${formatAdminNumber(summary?.chatInteractionsThisMonth || 0)} chat(s)`} description="Uso conversacional do assistente com contexto financeiro." />
              <BreakdownTile label="Automação" value={`${formatAdminNumber(summary?.classifyInteractionsThisMonth || 0)} classificação(ões)`} description="Classificação inteligente aplicada sobre descrições de transações." />
              <BreakdownTile label="Adoção real" value={`${formatAdminNumber(summary?.activeWorkspaces || 0)} workspace(s)`} description="Contas que realmente usaram IA no mês atual para chat ou classificação." />
            </div>
          </div>
        )}
      </SuperadminSectionCard>

      <SuperadminSectionCard
        title="Uso por workspace"
        description="Busca rapida por plano, owner, quota e preferencia."
      >
        <div className="grid gap-3 lg:grid-cols-[1.1fr_0.45fr]">
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Buscar</span>
            <div className="relative mt-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar por workspace, owner ou ID"
                className="w-full rounded-2xl border border-white/10 bg-slate-950/70 py-3 pl-10 pr-4 text-sm text-white outline-none transition focus:border-emerald-400"
              />
            </div>
          </label>

          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Plano</span>
            <select
              value={plan}
              onChange={(event) => setPlan(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400"
            >
              {PLAN_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-5">
          {isLoading ? (
            <LoadingState message="Carregando workspaces com IA..." />
          ) : error || !data ? (
            <ErrorState message={error || 'Falha ao carregar workspaces.'} />
          ) : data.workspaces.length === 0 ? (
            <EmptyState message="Nenhum workspace encontrado para os filtros atuais." />
          ) : (
            <div className="space-y-4">
              <div className="hidden overflow-x-auto xl:block">
                <table className="min-w-full text-left text-sm">
                  <thead className="text-xs uppercase tracking-[0.2em] text-slate-500">
                    <tr>
                      <th className="pb-3 pr-4 font-semibold">Workspace</th>
                      <th className="pb-3 pr-4 font-semibold">Plano</th>
                      <th className="pb-3 pr-4 font-semibold">Uso no mês</th>
                      <th className="pb-3 pr-4 font-semibold">Detalhe</th>
                      <th className="pb-3 pr-4 font-semibold">Preferência</th>
                      <th className="pb-3 pr-4 font-semibold">Último uso</th>
                      <th className="pb-3 pr-0 font-semibold">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {data.workspaces.map((item) => (
                      <tr key={item.workspaceId}>
                        <td className="py-4 pr-4 align-top">
                          <div className="font-semibold text-white">{item.workspaceName}</div>
                          <div className="mt-1 text-xs text-slate-400">{item.ownerEmail || 'Sem owner'}</div>
                          <div className="mt-1 text-[11px] text-slate-500">{item.workspaceId}</div>
                        </td>
                        <td className="py-4 pr-4 align-top text-slate-200">{formatPlanLabel(item.plan)}</td>
                        <td className="py-4 pr-4 align-top">
                          <p className="font-semibold text-white">
                            {formatAdminNumber(item.effectiveUsage)}
                            {typeof item.limit === 'number' ? ` / ${formatAdminNumber(item.limit)}` : ' / ilimitado'}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            {item.usageRate !== null ? formatAdminPercent(item.usageRate) : 'Sem teto mensal'}
                          </p>
                        </td>
                        <td className="py-4 pr-4 align-top text-slate-300">{formatAdminNumber(item.chatUsage)} chat • {formatAdminNumber(item.classifyUsage)} class.</td>
                        <td className="py-4 pr-4 align-top">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.aiSuggestionsEnabled ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border border-white/10 bg-white/5 text-slate-300'}`}>
                            {item.aiSuggestionsEnabled ? 'Sugestões ativas' : 'Sugestões inativas'}
                          </span>
                        </td>
                        <td className="py-4 pr-4 align-top text-slate-300">{formatAdminDateTime(item.lastAiEventAt)}</td>
                        <td className="py-4 pr-0 align-top">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              disabled={resettingWorkspaceId === item.workspaceId}
                              onClick={async () => {
                                try {
                                  setResettingWorkspaceId(item.workspaceId);
                                  setError(null);
                                  const response = await fetchSuperadminJson<SuperadminAiResetResponse>('/api/superadmin/ai', {
                                    method: 'PATCH',
                                    body: JSON.stringify({
                                      workspaceId: item.workspaceId,
                                      action: 'reset-usage',
                                      reason: 'Reset manual pelo Super Admin',
                                    }),
                                  });
                                  setData((current) =>
                                    current
                                      ? {
                                          ...current,
                                          workspaces: current.workspaces.map((workspace) =>
                                            workspace.workspaceId === response.workspaceId
                                              ? {
                                                  ...workspace,
                                                  effectiveUsage: response.effectiveUsage,
                                                  usageRate:
                                                    typeof workspace.limit === 'number'
                                                      ? 0
                                                      : workspace.usageRate,
                                                  nearLimit: false,
                                                  resetOffset: response.resetOffset,
                                                  resetReason: response.resetReason,
                                                }
                                              : workspace
                                          ),
                                        }
                                      : current
                                  );
                                  setActionMessage('Uso de IA resetado com sucesso para o workspace.');
                                } catch (submitError) {
                                  setError(submitError instanceof Error ? submitError.message : 'Falha ao resetar uso de IA.');
                                } finally {
                                  setResettingWorkspaceId(null);
                                }
                              }}
                              className="inline-flex rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/5 hover:text-white disabled:opacity-60"
                            >
                              {resettingWorkspaceId === item.workspaceId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                              Resetar IA
                            </button>
                            <Link
                              href={`/superadmin/workspaces/${item.workspaceId}`}
                              className="inline-flex rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/5 hover:text-white"
                            >
                              Ver workspace
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid gap-4 xl:hidden">
                {data.workspaces.map((item) => (
                  <article key={item.workspaceId} className="rounded-2xl border border-white/10 bg-slate-950/55 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-white">{item.workspaceName}</p>
                        <p className="mt-1 text-xs text-slate-400">{item.ownerEmail || 'Sem owner'}</p>
                      </div>
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">{formatPlanLabel(item.plan)}</span>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <InfoPill label="Uso no mês" value={`${formatAdminNumber(item.effectiveUsage)}${typeof item.limit === 'number' ? ` / ${formatAdminNumber(item.limit)}` : ' / ilimitado'}`} />
                      <InfoPill label="Taxa de uso" value={item.usageRate !== null ? formatAdminPercent(item.usageRate) : 'Sem teto'} />
                      <InfoPill label="Detalhe" value={`${formatAdminNumber(item.chatUsage)} chat • ${formatAdminNumber(item.classifyUsage)} class.`} />
                      <InfoPill label="Último uso" value={formatAdminDateTime(item.lastAiEventAt)} />
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${item.aiSuggestionsEnabled ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border border-white/10 bg-white/5 text-slate-300'}`}>
                        {item.aiSuggestionsEnabled ? 'Sugestões ativas' : 'Sugestões inativas'}
                      </span>
                      {item.nearLimit ? (
                        <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300">
                          Próximo do limite
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-5">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={resettingWorkspaceId === item.workspaceId}
                          onClick={async () => {
                            try {
                              setResettingWorkspaceId(item.workspaceId);
                              setError(null);
                              const response = await fetchSuperadminJson<SuperadminAiResetResponse>('/api/superadmin/ai', {
                                method: 'PATCH',
                                body: JSON.stringify({
                                  workspaceId: item.workspaceId,
                                  action: 'reset-usage',
                                  reason: 'Reset manual pelo Super Admin',
                                }),
                              });
                              setData((current) =>
                                current
                                  ? {
                                      ...current,
                                      workspaces: current.workspaces.map((workspace) =>
                                        workspace.workspaceId === response.workspaceId
                                          ? {
                                              ...workspace,
                                              effectiveUsage: response.effectiveUsage,
                                              usageRate: typeof workspace.limit === 'number' ? 0 : workspace.usageRate,
                                              nearLimit: false,
                                              resetOffset: response.resetOffset,
                                              resetReason: response.resetReason,
                                            }
                                          : workspace
                                      ),
                                    }
                                  : current
                              );
                              setActionMessage('Uso de IA resetado com sucesso para o workspace.');
                            } catch (submitError) {
                              setError(submitError instanceof Error ? submitError.message : 'Falha ao resetar uso de IA.');
                            } finally {
                              setResettingWorkspaceId(null);
                            }
                          }}
                          className="inline-flex rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/5 hover:text-white disabled:opacity-60"
                        >
                          {resettingWorkspaceId === item.workspaceId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                          Resetar IA
                        </button>
                        <Link
                          href={`/superadmin/workspaces/${item.workspaceId}`}
                          className="inline-flex rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/5 hover:text-white"
                        >
                          Ver workspace
                        </Link>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}
        </div>
      </SuperadminSectionCard>

      <SuperadminSectionCard
        title="Eventos recentes de IA"
        description="Últimos usos registrados para chat e classificação automática, com rastreabilidade por workspace e usuário."
      >
        {isLoading ? (
          <LoadingState message="Carregando eventos recentes..." />
        ) : error || !data ? (
          <ErrorState message={error || 'Falha ao carregar eventos recentes.'} />
        ) : data.recentEvents.length === 0 ? (
          <EmptyState message="Nenhum evento recente de IA encontrado para os filtros atuais." />
        ) : (
          <div className="space-y-3">
            {data.recentEvents.map((event) => (
              <article key={event.id} className="rounded-2xl border border-white/10 bg-slate-950/55 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-cyan-500/25 bg-cyan-500/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-200">
                        {event.typeLabel}
                      </span>
                      <span className="text-xs text-slate-500">{formatAdminDateTime(event.createdAt)}</span>
                    </div>
                    <p className="mt-3 text-sm font-semibold text-white">{event.workspaceName}</p>
                    <p className="mt-1 text-sm text-slate-400">{event.userEmail || 'Usuário não identificado'} • {humanizeEventType(event.type)}</p>
                  </div>
                  <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300">
                    <Bot className="h-3.5 w-3.5" />
                    {event.id.slice(0, 8)}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </SuperadminSectionCard>
    </div>
  );
}

function StatusTile({
  label,
  value,
  description,
  tone = 'default',
}: {
  label: string;
  value: string;
  description: string;
  tone?: 'default' | 'success' | 'danger';
}) {
  const toneClassName =
    tone === 'success'
      ? 'border-emerald-500/20 bg-emerald-500/10'
      : tone === 'danger'
        ? 'border-rose-500/20 bg-rose-500/10'
        : 'border-white/10 bg-slate-950/55';

  return (
    <div className={`rounded-[1.5rem] border p-4 ${toneClassName}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
      <p className="mt-2 text-xs leading-6 text-slate-400">{description}</p>
    </div>
  );
}

function BreakdownTile({ label, value, description }: { label: string; value: string; description: string }) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/55 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
      <p className="mt-2 text-xs leading-6 text-slate-400">{description}</p>
    </div>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-white">{value}</p>
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

function SuccessState({ message }: { message: string }) {
  return <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-5 text-sm text-emerald-100">{message}</div>;
}

function EmptyState({ message }: { message: string }) {
  return <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/40 px-4 py-6 text-sm text-slate-400">{message}</div>;
}

