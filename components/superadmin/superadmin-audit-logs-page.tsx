'use client';

import * as React from 'react';
import { Loader2, Search, ShieldCheck } from 'lucide-react';

import { fetchSuperadminJson, useDebouncedValue } from '@/components/superadmin/fetch-superadmin-json';
import {
  formatAdminDateTime,
  formatAdminNumber,
  humanizeEventType,
} from '@/components/superadmin/superadmin-utils';
import {
  SuperadminMetricChip,
  SuperadminPageHeader,
  SuperadminSectionCard,
} from '@/components/superadmin/superadmin-page-primitives';
import type { SuperadminAuditLogsResponse } from '@/lib/superadmin/types';

const CATEGORY_OPTIONS = [
  { value: 'all', label: 'Todas as categorias' },
  { value: 'admin', label: 'Admin' },
  { value: 'billing', label: 'Billing' },
  { value: 'tracking', label: 'Tracking' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'ai', label: 'IA' },
  { value: 'produto', label: 'Produto' },
  { value: 'geral', label: 'Geral' },
];

export function SuperadminAuditLogsPage() {
  const [query, setQuery] = React.useState('');
  const [category, setCategory] = React.useState('all');
  const debouncedQuery = useDebouncedValue(query, 250);
  const [data, setData] = React.useState<SuperadminAuditLogsResponse | null>(null);
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
        if (category !== 'all') params.set('category', category);

        const next = await fetchSuperadminJson<SuperadminAuditLogsResponse>(
          `/api/superadmin/audit-logs${params.toString() ? `?${params.toString()}` : ''}`
        );

        if (active) setData(next);
      } catch (fetchError) {
        if (active) setError(fetchError instanceof Error ? fetchError.message : 'Falha ao carregar auditoria.');
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void run();
    return () => {
      active = false;
    };
  }, [debouncedQuery, category]);

  const summary = data?.summary;

  return (
    <div className="space-y-5">
      <SuperadminPageHeader
        eyebrow="Auditoria"
        title="Logs / Auditoria"
        description="Rastro operacional de billing, tracking, IA, WhatsApp e acoes criticas."
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SuperadminMetricChip label="Eventos" value={formatAdminNumber(summary?.total || 0)} />
          <SuperadminMetricChip label="Admin" value={formatAdminNumber(summary?.admin || 0)} tone="info" />
          <SuperadminMetricChip label="Billing" value={formatAdminNumber(summary?.billing || 0)} tone="info" />
          <SuperadminMetricChip label="Tracking" value={formatAdminNumber(summary?.tracking || 0)} tone="success" />
          <SuperadminMetricChip label="IA / WhatsApp" value={formatAdminNumber((summary?.ai || 0) + (summary?.whatsapp || 0))} />
        </div>
      </SuperadminPageHeader>

      <SuperadminSectionCard title="Filtro operacional" description="Busca rapida por workspace, usuario, categoria ou evento.">
        <div className="grid gap-3 lg:grid-cols-[1.2fr_0.5fr]">
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Buscar</span>
            <div className="relative mt-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar por tipo, workspace, usuário ou ID"
                className="w-full rounded-2xl border border-white/10 bg-slate-950/70 py-3 pl-10 pr-4 text-sm text-white outline-none transition focus:border-emerald-400"
              />
            </div>
          </label>

          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Categoria</span>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400"
            >
              {CATEGORY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </SuperadminSectionCard>

      <SuperadminSectionCard title="Timeline de auditoria" description={data ? `${formatAdminNumber(data.total)} evento(s) encontrados.` : 'Carregando trilha de auditoria.'}>
        {isLoading ? (
          <LoadingState />
        ) : error || !data ? (
          <ErrorState message={error || 'Falha ao carregar logs de auditoria.'} />
        ) : data.events.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-3">
            {data.events.map((event) => (
              <article key={event.id} className="rounded-2xl border border-white/10 bg-slate-950/55 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="font-semibold text-white">{humanizeEventType(event.type)}</p>
                      <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">
                        {event.category}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-400">
                      <span>Workspace: {event.workspaceName}</span>
                      <span>Usuário: {event.userEmail || 'Sistema'}</span>
                      <span>ID: {event.id}</span>
                    </div>
                  </div>
                  <div className="inline-flex items-center gap-2 text-xs text-slate-500">
                    <ShieldCheck className="h-4 w-4 text-emerald-300" />
                    {formatAdminDateTime(event.createdAt)}
                  </div>
                </div>

                {event.payload ? (
                  <details className="mt-3 rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                    <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                      Ver payload do evento
                    </summary>
                    <pre className="mt-4 overflow-x-auto whitespace-pre-wrap text-xs leading-6 text-slate-300">{JSON.stringify(event.payload, null, 2)}</pre>
                  </details>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </SuperadminSectionCard>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex min-h-[260px] items-center justify-center">
      <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/60 px-5 py-4 text-slate-200">
        <Loader2 className="h-5 w-5 animate-spin text-emerald-400" />
        Carregando auditoria...
      </div>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-5 text-sm text-rose-100">{message}</div>;
}

function EmptyState() {
  return <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/40 px-4 py-6 text-sm text-slate-400">Nenhum evento encontrado para os filtros atuais.</div>;
}

