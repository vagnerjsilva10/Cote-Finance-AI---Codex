'use client';

import * as React from 'react';
import Link from 'next/link';
import { Loader2, MessageCircleMore, Search, ShieldCheck } from 'lucide-react';

import { fetchSuperadminJson, useDebouncedValue } from '@/components/superadmin/fetch-superadmin-json';
import {
  formatAdminDateTime,
  formatAdminNumber,
  formatPlanLabel,
} from '@/components/superadmin/superadmin-utils';
import {
  SuperadminActionLink,
  SuperadminMetricChip,
  SuperadminPageHeader,
  SuperadminSectionCard,
} from '@/components/superadmin/superadmin-page-primitives';
import type { SuperadminWhatsappResponse } from '@/lib/superadmin/types';

const PLAN_OPTIONS = [
  { value: 'ALL', label: 'Todos os planos' },
  { value: 'FREE', label: 'Free' },
  { value: 'PRO', label: 'Pro' },
  { value: 'PREMIUM', label: 'Premium' },
];

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'Todos os status' },
  { value: 'CONNECTED', label: 'Conectado' },
  { value: 'CONNECTING', label: 'Conectando' },
  { value: 'DISCONNECTED', label: 'Desconectado' },
];

export function SuperadminWhatsappPage() {
  const [query, setQuery] = React.useState('');
  const [plan, setPlan] = React.useState('ALL');
  const [status, setStatus] = React.useState('ALL');
  const debouncedQuery = useDebouncedValue(query, 250);
  const [data, setData] = React.useState<SuperadminWhatsappResponse | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

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

        const next = await fetchSuperadminJson<SuperadminWhatsappResponse>(
          `/api/superadmin/whatsapp${params.toString() ? `?${params.toString()}` : ''}`
        );

        if (active) setData(next);
      } catch (fetchError) {
        if (active) setError(fetchError instanceof Error ? fetchError.message : 'Falha ao carregar operação de WhatsApp.');
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void run();
    return () => {
      active = false;
    };
  }, [debouncedQuery, plan, status]);

  const summary = data?.summary;
  const environment = data?.environment;
  const trendMax = Math.max(...(data?.trend.map((item) => item.total) ?? [0]), 1);

  return (
    <div className="space-y-6">
      <SuperadminPageHeader
        eyebrow="Canal"
        title="Operação de WhatsApp"
        description="Monitore a saúde da integração com Meta Cloud API, a base conectada, a cadência de resumos e a configuração operacional por workspace."
        actions={<SuperadminActionLink href="/superadmin/ai">Ver IA</SuperadminActionLink>}
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SuperadminMetricChip label="Conectados" value={formatAdminNumber(summary?.connectedWorkspaces || 0)} tone="success" />
          <SuperadminMetricChip label="Elegíveis" value={formatAdminNumber(summary?.eligibleWorkspaces || 0)} />
          <SuperadminMetricChip label="Resumos enviados" value={formatAdminNumber(summary?.digestsSentLast30Days || 0)} tone="info" />
          <SuperadminMetricChip label="Pré-visualizações" value={formatAdminNumber(summary?.previewTestsLast30Days || 0)} />
        </div>
      </SuperadminPageHeader>

      <SuperadminSectionCard
        title="Ambiente e credenciais"
        description="Visão rápida do que está pronto no servidor para operar o canal sem depender de checagens manuais nas variáveis de ambiente."
      >
        <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatusTile label="API Meta" value={environment?.apiConfigured ? 'Configurada' : 'Pendente'} tone={environment?.apiConfigured ? 'success' : 'danger'} description="Token de acesso e phone number id disponíveis no backend." />
            <StatusTile label="Webhook" value={environment?.verifyConfigured ? 'Pronto' : 'Pendente'} tone={environment?.verifyConfigured ? 'success' : 'danger'} description="Token de verificação para handshake do webhook." />
            <StatusTile label="Assinatura" value={environment?.signatureValidationEnabled ? 'Protegida' : 'Opcional'} description="Validação `x-hub-signature-256` com app secret." />
            <StatusTile label="Idioma" value={environment?.templateLanguage || 'pt_BR'} description="Idioma padrão usado para os templates do canal." />
          </div>

          <div className="rounded-[1.6rem] border border-white/10 bg-slate-950/55 p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Template base</p>
                <h3 className="mt-2 text-lg font-semibold text-white">Cobertura operacional</h3>
              </div>
              <ShieldCheck className="h-5 w-5 text-emerald-300" />
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <MiniState title="Conexão" enabled={Boolean(environment?.connectTemplateConfigured)} description="Template usado no vínculo inicial do número." />
              <MiniState title="Resumo diário" enabled={Boolean(environment?.digestTemplateConfigured)} description="Template usado nos resumos e envios automatizados." />
              <MiniState title="Phone Number ID" enabled={Boolean(environment?.phoneNumberIdConfigured)} description="Identificador do canal ativo configurado no ambiente." />
            </div>
          </div>
        </div>
      </SuperadminSectionCard>

      <SuperadminSectionCard
        title="Tendência dos últimos 14 dias"
        description="Acompanhe configuração, entregas e eventos de conexão para detectar quedas de uso ou picos de operação."
      >
        {isLoading ? (
          <LoadingState message="Carregando tendência do canal..." />
        ) : error || !data ? (
          <ErrorState message={error || 'Falha ao carregar tendência do canal.'} />
        ) : (
          <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="grid h-64 grid-cols-7 gap-3 rounded-[1.6rem] border border-white/10 bg-slate-950/55 p-4 sm:grid-cols-14">
              {data.trend.map((item) => {
                const height = Math.max(12, Math.round((item.total / trendMax) * 100));
                return (
                  <div key={item.date} className="flex min-w-0 flex-col justify-end gap-3">
                    <div className="flex flex-1 items-end justify-center rounded-2xl border border-white/5 bg-white/[0.03] px-1 pb-1 pt-4">
                      <div
                        className="w-full rounded-xl bg-[linear-gradient(180deg,rgba(16,185,129,.95),rgba(14,165,233,.72))] shadow-[0_16px_40px_-24px_rgba(16,185,129,.9)]"
                        style={{ height: `${height}%` }}
                        title={`${item.total} eventos em ${item.date}`}
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
              <BreakdownTile label="Configuração" value={formatAdminNumber(summary?.configUpdatesLast30Days || 0)} description="Ajustes de template, idioma e telefone de teste gravados pelos workspaces." />
              <BreakdownTile label="Entregas" value={formatAdminNumber(summary?.digestsSentLast30Days || 0)} description="Resumos diários enviados com sucesso na janela recente." />
              <BreakdownTile label="Conexão" value={`${formatAdminNumber(summary?.connectedWorkspaces || 0)} conectado(s)`} description="Base atual com status conectado e pronta para receber resumos e alertas." />
            </div>
          </div>
        )}
      </SuperadminSectionCard>

      <SuperadminSectionCard
        title="Base por workspace"
        description="Veja rapidamente quem está elegível, conectado ou parado, com plano, owner, telefone e última movimentação do canal."
      >
        <div className="grid gap-3 lg:grid-cols-[1fr_0.45fr_0.45fr]">
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
            <select value={plan} onChange={(event) => setPlan(event.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400">
              {PLAN_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Status</span>
            <select value={status} onChange={(event) => setStatus(event.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400">
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-5">
          {isLoading ? (
            <LoadingState message="Carregando workspaces do canal..." />
          ) : error || !data ? (
            <ErrorState message={error || 'Falha ao carregar workspaces do canal.'} />
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
                      <th className="pb-3 pr-4 font-semibold">Status</th>
                      <th className="pb-3 pr-4 font-semibold">Telefone</th>
                      <th className="pb-3 pr-4 font-semibold">Config.</th>
                      <th className="pb-3 pr-4 font-semibold">Último evento</th>
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
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusTone(item.whatsappStatus)}`}>
                            {formatStatus(item.whatsappStatus)}
                          </span>
                        </td>
                        <td className="py-4 pr-4 align-top text-slate-300">{item.whatsappPhoneNumber || 'Não conectado'}</td>
                        <td className="py-4 pr-4 align-top text-slate-300">{formatAdminDateTime(item.configUpdatedAt)}</td>
                        <td className="py-4 pr-4 align-top text-slate-300">{formatAdminDateTime(item.lastEventAt)}</td>
                        <td className="py-4 pr-0 align-top">
                          <Link href={`/superadmin/workspaces/${item.workspaceId}`} className="inline-flex rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/5 hover:text-white">
                            Ver workspace
                          </Link>
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
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusTone(item.whatsappStatus)}`}>
                        {formatStatus(item.whatsappStatus)}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <InfoPill label="Plano" value={formatPlanLabel(item.plan)} />
                      <InfoPill label="Telefone" value={item.whatsappPhoneNumber || 'Não conectado'} />
                      <InfoPill label="Config." value={formatAdminDateTime(item.configUpdatedAt)} />
                      <InfoPill label="Último evento" value={formatAdminDateTime(item.lastEventAt)} />
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${item.hasPlanAccess ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border border-white/10 bg-white/5 text-slate-300'}`}>
                        {item.hasPlanAccess ? 'Plano elegível' : 'Requer Pro ou Premium'}
                      </span>
                    </div>

                    <div className="mt-5">
                      <Link href={`/superadmin/workspaces/${item.workspaceId}`} className="inline-flex rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/5 hover:text-white">
                        Ver workspace
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}
        </div>
      </SuperadminSectionCard>

      <SuperadminSectionCard
        title="Eventos recentes do canal"
        description="Rastreie rapidamente vínculos, ajustes de configuração e envios de resumo sem entrar em cada workspace manualmente."
      >
        {isLoading ? (
          <LoadingState message="Carregando eventos do WhatsApp..." />
        ) : error || !data ? (
          <ErrorState message={error || 'Falha ao carregar eventos do WhatsApp.'} />
        ) : data.recentEvents.length === 0 ? (
          <EmptyState message="Nenhum evento recente de WhatsApp encontrado para os filtros atuais." />
        ) : (
          <div className="space-y-3">
            {data.recentEvents.map((event) => (
              <article key={event.id} className="rounded-2xl border border-white/10 bg-slate-950/55 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${getEventTone(event.category)}`}>
                        {event.typeLabel}
                      </span>
                      <span className="text-xs text-slate-500">{formatAdminDateTime(event.createdAt)}</span>
                    </div>
                    <p className="mt-3 text-sm font-semibold text-white">{event.workspaceName}</p>
                    <p className="mt-1 text-sm text-slate-400">{event.userEmail || 'Usuário não identificado'} • {event.type}</p>
                  </div>
                  <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300">
                    <MessageCircleMore className="h-3.5 w-3.5" />
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

function formatStatus(status: string) {
  if (status === 'CONNECTED') return 'Conectado';
  if (status === 'CONNECTING') return 'Conectando';
  return 'Desconectado';
}

function getStatusTone(status: string) {
  if (status === 'CONNECTED') return 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
  if (status === 'CONNECTING') return 'border border-amber-500/30 bg-amber-500/10 text-amber-300';
  return 'border border-white/10 bg-white/5 text-slate-300';
}

function getEventTone(category: string) {
  if (category === 'delivery') return 'border border-cyan-500/25 bg-cyan-500/10 text-cyan-200';
  if (category === 'connection') return 'border border-emerald-500/25 bg-emerald-500/10 text-emerald-200';
  if (category === 'config') return 'border border-amber-500/25 bg-amber-500/10 text-amber-200';
  return 'border border-white/10 bg-white/5 text-slate-200';
}

function StatusTile({ label, value, description, tone = 'default' }: { label: string; value: string; description: string; tone?: 'default' | 'success' | 'danger' }) {
  const toneClassName = tone === 'success' ? 'border-emerald-500/20 bg-emerald-500/10' : tone === 'danger' ? 'border-rose-500/20 bg-rose-500/10' : 'border-white/10 bg-slate-950/55';
  return (
    <div className={`rounded-[1.5rem] border p-4 ${toneClassName}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
      <p className="mt-2 text-xs leading-6 text-slate-400">{description}</p>
    </div>
  );
}

function MiniState({ title, enabled, description }: { title: string; enabled: boolean; description: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{title}</p>
      <p className="mt-2 text-lg font-semibold text-white">{enabled ? 'Ativo' : 'Pendente'}</p>
      <p className="mt-1 text-xs leading-5 text-slate-400">{description}</p>
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

function EmptyState({ message }: { message: string }) {
  return <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/40 px-4 py-6 text-sm text-slate-400">{message}</div>;
}
