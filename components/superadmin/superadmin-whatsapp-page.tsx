'use client';

import * as React from 'react';
import { Loader2, RefreshCw, Search, ShieldCheck } from 'lucide-react';

import { fetchSuperadminJson, useDebouncedValue } from '@/components/superadmin/fetch-superadmin-json';
import { formatAdminDateTime, formatPlanLabel } from '@/components/superadmin/superadmin-utils';
import type { SuperadminWhatsappResponse } from '@/lib/superadmin/types';

export function SuperadminWhatsappPage() {
  const [query, setQuery] = React.useState('');
  const debouncedQuery = useDebouncedValue(query, 250);
  const [data, setData] = React.useState<SuperadminWhatsappResponse | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [feedback, setFeedback] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const payload = await fetchSuperadminJson<SuperadminWhatsappResponse>(
        `/api/superadmin/whatsapp${debouncedQuery ? `?q=${encodeURIComponent(debouncedQuery)}` : ''}`
      );
      setData(payload);
    } catch (fetchError) {
      setData(null);
      setError(fetchError instanceof Error ? fetchError.message : 'Falha ao carregar o painel de WhatsApp.');
    } finally {
      setIsLoading(false);
    }
  }, [debouncedQuery]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const runAction = React.useCallback(
    async (workspaceId: string, action: 'disconnect' | 'reset' | 'diagnose' | 'send_test' | 'send_alerts') => {
      try {
        setIsSaving(`${workspaceId}:${action}`);
        setError(null);
        setFeedback(null);

        await fetchSuperadminJson('/api/superadmin/whatsapp', {
          method: 'PATCH',
          body: JSON.stringify({ workspaceId, action }),
        });

        setFeedback(
          action === 'diagnose'
            ? 'Diagnóstico concluído com sucesso.'
            : action === 'send_test'
              ? 'Teste enviado com sucesso.'
              : action === 'send_alerts'
                ? 'Alertas enviados com sucesso.'
                : action === 'reset'
                  ? 'Configuração resetada com sucesso.'
                  : 'Integração desconectada com sucesso.'
        );

        await load();
      } catch (actionError) {
        setError(actionError instanceof Error ? actionError.message : 'Falha ao executar a ação administrativa.');
      } finally {
        setIsSaving(null);
      }
    },
    [load]
  );

  const hasData = Boolean(data);
  const showInitialLoading = isLoading && !hasData;
  const showUnavailableState = !isLoading && !hasData;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-300">Super Admin</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">WhatsApp</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
              Audite integrações por workspace, identifique falhas de autenticação e acompanhe uso, alertas e ações do canal.
            </p>
          </div>
          <div className="w-full max-w-md">
            <label className="block text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Busca</label>
            <div className="relative mt-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar workspace, owner ou número"
                className="w-full rounded-2xl border border-slate-700 bg-slate-950/70 py-3 pl-10 pr-4 text-sm text-white outline-none transition focus:border-emerald-400"
              />
            </div>
          </div>
        </div>
      </section>

      {feedback ? <Banner tone="success" message={feedback} /> : null}
      {error ? <Banner tone="error" message={error} /> : null}

      {showInitialLoading ? (
        <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-8">
          <div className="flex min-h-[220px] items-center justify-center text-slate-300">
            <Loader2 className="mr-3 h-5 w-5 animate-spin text-emerald-400" />
            Carregando painel de WhatsApp...
          </div>
        </section>
      ) : null}

      {showUnavailableState ? (
        <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-5 py-5 text-sm text-rose-100">
            <p className="font-semibold text-rose-50">O painel de WhatsApp não conseguiu carregar os dados agora.</p>
            <p className="mt-2 text-rose-100/90">
              Quando a requisição falha, o sistema não mostra mais estados falsos de configuração pendente ou métricas zeradas.
              Tente novamente para validar o estado real da integração.
            </p>
            <div className="mt-4">
              <ActionButton onClick={() => void load()}>
                <RefreshCw className="h-4 w-4" />
                Tentar novamente
              </ActionButton>
            </div>
          </div>
        </section>
      ) : null}

      {data ? (
        <>
          {!isLoading && !data.environment.ready ? (
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-4 text-sm text-amber-100">
              <p className="font-semibold text-amber-50">Configuração do WhatsApp ainda não foi concluída.</p>
              <p className="mt-1 text-amber-100/90">
                Revise as variáveis de ambiente, os templates e os números por workspace antes de usar o painel para testes e operações.
              </p>
            </div>
          ) : null}

          <section className="grid gap-3 md:grid-cols-5">
            <ReadinessCard label="Access token" ok={data.environment.accessTokenConfigured} />
            <ReadinessCard label="Phone number ID" ok={data.environment.phoneNumberIdConfigured} />
            <ReadinessCard label="Verify token" ok={data.environment.verifyTokenConfigured} />
            <ReadinessCard label="App secret" ok={data.environment.appSecretConfigured} />
            <ReadinessCard label="API version" ok={data.environment.apiVersionConfigured} />
          </section>

          <section className="grid gap-3 md:grid-cols-4">
            <MetricCard label="Workspaces" value={String(data.summary.total)} />
            <MetricCard label="Conectados" value={String(data.summary.connected)} />
            <MetricCard label="Com erro" value={String(data.summary.withErrors)} />
            <MetricCard label="Ajustes pendentes" value={String(data.summary.pendingConfig)} />
          </section>

          <section className="grid gap-3 md:grid-cols-4">
            <MetricCard label="Mensagens 30d" value={String(data.summary.messagesLast30Days)} />
            <MetricCard label="Transações 30d" value={String(data.summary.transactionsViaWhatsappLast30Days)} />
            <MetricCard label="IA via WhatsApp" value={String(data.summary.aiViaWhatsappLast30Days)} />
            <MetricCard label="Alertas 30d" value={String(data.summary.alertsSentLast30Days)} />
          </section>

          <section className="grid gap-3 md:grid-cols-2">
            <MetricCard
              label="IA por intents fixas"
              value={String(data.summary.aiViaWhatsappDeterministicLast30Days)}
              helper="Consultas resolvidas pelo fluxo determinístico do canal."
            />
            <MetricCard
              label="IA via Gemini"
              value={String(data.summary.aiViaWhatsappGeminiLast30Days)}
              helper="Perguntas livres respondidas com contexto financeiro do workspace."
            />
          </section>

          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Lançamentos editados"
              value={String(data.summary.transactionsEditedViaWhatsappLast30Days)}
              helper="Correções recentes feitas direto no canal."
            />
            <MetricCard
              label="Lançamentos removidos"
              value={String(data.summary.transactionsRemovedViaWhatsappLast30Days)}
              helper="Exclusões e desfazimentos recentes."
            />
            <MetricCard
              label="Alertas de meta atrasada"
              value={String(data.summary.overdueGoalAlertsLast30Days)}
              helper="Metas vencidas que ainda exigem valor adicional."
            />
            <MetricCard
              label="Alertas de recorrência pesada"
              value={String(data.summary.recurringHeavyAlertsLast30Days)}
              helper="Pressão de contas recorrentes sobre o mês."
            />
          </section>

          <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
            {data.workspaces.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/40 px-4 py-6 text-sm text-slate-400">
                Nenhum workspace com configuração ou atividade de WhatsApp foi encontrado para este filtro.
              </div>
            ) : (
              <div className="space-y-4">
                {data.workspaces.map((workspace) => {
                  const actionKeyPrefix = `${workspace.workspaceId}:`;
                  return (
                    <div key={workspace.workspaceId} className="rounded-2xl border border-slate-800 bg-slate-950/55 p-4">
                      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-semibold text-slate-300">
                              {formatPlanLabel(workspace.plan)}
                            </span>
                            <StateBadge state={workspace.lastConnectionState} />
                            <span className="rounded-full border border-slate-700 bg-slate-900/70 px-3 py-1 text-xs font-semibold text-slate-300">
                              {workspace.whatsappStatus || 'DISCONNECTED'}
                            </span>
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                workspace.readiness.ready
                                  ? 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-200'
                                  : 'border border-amber-500/20 bg-amber-500/10 text-amber-200'
                              }`}
                            >
                              {workspace.readiness.ready ? 'Pronto para teste' : `${workspace.readiness.issues.length} ajuste(s)`}
                            </span>
                          </div>
                          <div>
                            <p className="text-base font-semibold text-white">{workspace.workspaceName}</p>
                            <p className="text-sm text-slate-400">{workspace.ownerName || workspace.ownerEmail || 'Sem owner'}</p>
                          </div>
                          <div className="grid gap-2 text-sm text-slate-300 md:grid-cols-2 xl:grid-cols-4">
                            <Info label="Número do workspace" value={workspace.phoneNumber || 'Não configurado'} />
                            <Info label="Número de teste" value={workspace.testPhoneNumber || 'Não configurado'} />
                            <Info label="Última validação" value={formatAdminDateTime(workspace.lastValidatedAt)} />
                            <Info label="Último teste" value={formatAdminDateTime(workspace.lastTestSentAt)} />
                          </div>
                          {!workspace.readiness.ready ? (
                            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                              <p className="font-semibold text-amber-50">Checklist de prontidão</p>
                              <ul className="mt-2 space-y-1 text-sm">
                                {workspace.readiness.issues.map((issue) => (
                                  <li key={issue}>• {issue}</li>
                                ))}
                              </ul>
                            </div>
                          ) : null}
                          {workspace.lastErrorMessage ? (
                            <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                              <p className="font-semibold text-rose-50">{workspace.lastErrorCategory || 'Erro de conexão'}</p>
                              <p className="mt-1">{workspace.lastErrorMessage}</p>
                            </div>
                          ) : null}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <ActionButton
                            disabled={isSaving === `${actionKeyPrefix}diagnose`}
                            onClick={() => void runAction(workspace.workspaceId, 'diagnose')}
                          >
                            {isSaving === `${actionKeyPrefix}diagnose` ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                            Diagnosticar
                          </ActionButton>
                          <ActionButton
                            disabled={isSaving === `${actionKeyPrefix}send_test`}
                            onClick={() => void runAction(workspace.workspaceId, 'send_test')}
                          >
                            {isSaving === `${actionKeyPrefix}send_test` ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                            Reenviar teste
                          </ActionButton>
                          <ActionButton
                            disabled={isSaving === `${actionKeyPrefix}send_alerts`}
                            onClick={() => void runAction(workspace.workspaceId, 'send_alerts')}
                          >
                            {isSaving === `${actionKeyPrefix}send_alerts` ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                            Enviar alertas
                          </ActionButton>
                          <ActionButton
                            disabled={isSaving === `${actionKeyPrefix}disconnect`}
                            onClick={() => void runAction(workspace.workspaceId, 'disconnect')}
                          >
                            Desconectar
                          </ActionButton>
                          <ActionButton
                            tone="danger"
                            disabled={isSaving === `${actionKeyPrefix}reset`}
                            onClick={() => void runAction(workspace.workspaceId, 'reset')}
                          >
                            {isSaving === `${actionKeyPrefix}reset` ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                            Resetar
                          </ActionButton>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                        <MiniMetric label="Última entrada" value={formatAdminDateTime(workspace.activity.lastInboundAt)} />
                        <MiniMetric
                          label="Última operação"
                          value={
                            workspace.activity.lastOperationalType
                              ? `${workspace.activity.lastOperationalType} • ${formatAdminDateTime(workspace.activity.lastOperationalAt)}`
                              : 'Sem atividade recente'
                          }
                        />
                        <MiniMetric
                          label="Última IA"
                          value={
                            workspace.activity.lastAiAt
                              ? `${formatAdminDateTime(workspace.activity.lastAiAt)}${workspace.activity.lastAiMode ? ` • ${workspace.activity.lastAiMode}` : ''}`
                              : 'Sem atividade recente'
                          }
                        />
                        <MiniMetric label="Entradas 24h" value={String(workspace.activity.inboundLast24h)} />
                        <MiniMetric label="Lançamentos 24h" value={String(workspace.activity.transactionsLast24h)} />
                        <MiniMetric label="Alertas 24h" value={String(workspace.activity.alertsLast24h)} />
                        <MiniMetric label="IA 24h" value={String(workspace.activity.aiLast24h)} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-white">Atividade recente do canal</h2>
                <p className="mt-1 text-sm text-slate-400">Eventos recentes de WhatsApp em todos os workspaces.</p>
              </div>
              <span className="rounded-full border border-slate-700 bg-slate-950/70 px-3 py-1 text-xs font-semibold text-slate-300">
                {data.recentEvents.length} eventos
              </span>
            </div>

            <div className="mt-5 space-y-3">
              {!data.recentEvents.length ? (
                <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/40 px-4 py-6 text-sm text-slate-400">
                  Nenhum evento recente de WhatsApp encontrado.
                </div>
              ) : (
                data.recentEvents.map((event) => (
                  <div key={event.id} className="rounded-2xl border border-slate-800 bg-slate-950/55 px-4 py-3">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-white">{event.workspaceName}</p>
                        <p className="mt-1 text-sm text-slate-400">
                          {event.type}
                          {event.type === 'ai.chat.used' && event.aiMode ? ` • modo ${event.aiMode}` : ''}
                        </p>
                      </div>
                      <div className="text-sm text-slate-400">
                        <p>{formatAdminDateTime(event.createdAt)}</p>
                        <p>{event.userEmail || 'Sem usuário vinculado'}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}

function MetricCard({ label, value, helper }: { label: string; value: string; helper?: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/50 px-4 py-3.5">
      <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-bold tracking-tight text-white">{value}</p>
      {helper ? <p className="mt-1 text-xs leading-5 text-slate-400">{helper}</p> : null}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2.5">
      <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm text-white">{value}</p>
    </div>
  );
}

function Banner({ tone, message }: { tone: 'success' | 'error'; message: string }) {
  return (
    <div
      className={`rounded-2xl px-4 py-4 text-sm ${
        tone === 'success'
          ? 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-100'
          : 'border border-rose-500/20 bg-rose-500/10 text-rose-100'
      }`}
    >
      {message}
    </div>
  );
}

function StateBadge({ state }: { state: SuperadminWhatsappResponse['workspaces'][number]['lastConnectionState'] }) {
  const label =
    state === 'connected'
      ? 'Conectado'
      : state === 'error'
        ? 'Com erro'
        : state === 'testing'
          ? 'Testando'
          : state === 'config_pending'
            ? 'Config. pendente'
            : state === 'disconnected'
              ? 'Desconectado'
              : 'Sem diagnóstico';
  const className =
    state === 'connected'
      ? 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-200'
      : state === 'error'
        ? 'border border-rose-500/20 bg-rose-500/10 text-rose-200'
        : state === 'testing'
          ? 'border border-amber-500/20 bg-amber-500/10 text-amber-200'
          : 'border border-slate-700 bg-slate-900/70 text-slate-300';
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${className}`}>{label}</span>;
}

function ActionButton(props: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  tone?: 'default' | 'danger';
}) {
  return (
    <button
      type="button"
      disabled={props.disabled}
      onClick={props.onClick}
      className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${
        props.tone === 'danger'
          ? 'border border-rose-500/20 bg-rose-500/10 text-rose-100 hover:bg-rose-500/20'
          : 'border border-slate-700 bg-slate-900/70 text-slate-100 hover:border-emerald-500/40'
      } disabled:cursor-not-allowed disabled:opacity-60`}
    >
      {props.children}
    </button>
  );
}

function ReadinessCard({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div
      className={`rounded-2xl border px-4 py-3.5 ${ok ? 'border-emerald-500/20 bg-emerald-500/10' : 'border-amber-500/20 bg-amber-500/10'}`}
    >
      <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">{label}</p>
      <p className={`mt-2 text-sm font-semibold ${ok ? 'text-emerald-100' : 'text-amber-100'}`}>
        {ok ? 'Configurado' : 'Pendente'}
      </p>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2.5">
      <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}