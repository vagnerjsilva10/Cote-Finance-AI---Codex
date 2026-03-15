'use client';

import * as React from 'react';
import { Loader2, RefreshCw, Search } from 'lucide-react';

import { fetchSuperadminJson, useDebouncedValue } from '@/components/superadmin/fetch-superadmin-json';
import { formatAdminDateTime, formatPlanLabel } from '@/components/superadmin/superadmin-utils';

type WhatsappWorkspaceRecord = {
  workspaceId: string;
  workspaceName: string;
  ownerName: string | null;
  ownerEmail: string | null;
  plan: string;
  whatsappStatus: string | null;
  phoneNumber: string | null;
  testPhoneNumber: string | null;
  lastConnectionState: 'idle' | 'connected' | 'disconnected' | 'error' | 'testing' | 'config_pending';
  lastErrorMessage: string | null;
  lastErrorCategory: string | null;
  lastValidatedAt: string | null;
  lastTestSentAt: string | null;
  updatedAt: string | null;
};

type SuperadminWhatsappPanelResponse = {
  query: string;
  summary: {
    total: number;
    connected: number;
    withErrors: number;
    pendingConfig: number;
  };
  workspaces: WhatsappWorkspaceRecord[];
};

export function SuperadminWhatsappPage() {
  const [query, setQuery] = React.useState('');
  const debouncedQuery = useDebouncedValue(query, 250);
  const [data, setData] = React.useState<SuperadminWhatsappPanelResponse | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [feedback, setFeedback] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const payload = await fetchSuperadminJson<SuperadminWhatsappPanelResponse>(
        `/api/superadmin/whatsapp${debouncedQuery ? `?q=${encodeURIComponent(debouncedQuery)}` : ''}`
      );
      setData(payload);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Falha ao carregar o painel de WhatsApp.');
    } finally {
      setIsLoading(false);
    }
  }, [debouncedQuery]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const runAction = React.useCallback(
    async (workspaceId: string, action: 'disconnect' | 'reset' | 'send_test') => {
      try {
        setIsSaving(`${workspaceId}:${action}`);
        setError(null);
        setFeedback(null);
        await fetchSuperadminJson('/api/superadmin/whatsapp', {
          method: 'PATCH',
          body: JSON.stringify({ workspaceId, action }),
        });
        setFeedback(
          action === 'send_test'
            ? 'Teste enviado com sucesso.'
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

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-300">Super Admin</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">WhatsApp</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
              Audite integrações por workspace, identifique falhas de autenticação e execute reset, desconexão e teste
              manual com rastreabilidade.
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

      <section className="grid gap-3 md:grid-cols-4">
        <MetricCard label="Workspaces" value={String(data?.summary.total ?? 0)} />
        <MetricCard label="Conectados" value={String(data?.summary.connected ?? 0)} />
        <MetricCard label="Com erro" value={String(data?.summary.withErrors ?? 0)} />
        <MetricCard label="Ajustes pendentes" value={String(data?.summary.pendingConfig ?? 0)} />
      </section>

      <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
        {isLoading ? (
          <div className="flex min-h-[240px] items-center justify-center text-slate-300">
            <Loader2 className="mr-3 h-5 w-5 animate-spin text-emerald-400" />
            Carregando painel de WhatsApp...
          </div>
        ) : !data || data.workspaces.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/40 px-4 py-6 text-sm text-slate-400">
            Nenhum workspace encontrado.
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
                      {workspace.lastErrorMessage ? (
                        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                          {workspace.lastErrorMessage}
                        </div>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <ActionButton
                        disabled={isSaving === `${actionKeyPrefix}send_test`}
                        onClick={() => void runAction(workspace.workspaceId, 'send_test')}
                      >
                        {isSaving === `${actionKeyPrefix}send_test` ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        Reenviar teste
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
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/50 px-4 py-3.5">
      <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-bold tracking-tight text-white">{value}</p>
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

function StateBadge({ state }: { state: WhatsappWorkspaceRecord['lastConnectionState'] }) {
  const label =
    state === 'connected'
      ? 'Conectado'
      : state === 'error'
        ? 'Com erro'
        : state === 'testing'
          ? 'Testando'
          : state === 'config_pending'
            ? 'Config pendente'
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
