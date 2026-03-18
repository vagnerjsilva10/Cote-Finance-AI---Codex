'use client';

import * as React from 'react';
import { FileText, Loader2, Megaphone, ShieldCheck } from 'lucide-react';

import { fetchSuperadminJson } from '@/components/superadmin/fetch-superadmin-json';
import {
  SuperadminActionLink,
  SuperadminMetricChip,
  SuperadminPageHeader,
  SuperadminSectionCard,
} from '@/components/superadmin/superadmin-page-primitives';
import type { SuperadminContentResponse } from '@/lib/superadmin/types';

const inputClassName =
  'w-full rounded-2xl border border-[var(--border-default)] bg-[var(--bg-app)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--primary)]';
const textareaClassName =
  'w-full rounded-2xl border border-[var(--border-default)] bg-[var(--bg-app)] px-4 py-3 text-sm leading-6 text-[var(--text-primary)] outline-none transition focus:border-[var(--primary)]';

export function SuperadminContentPage() {
  const [data, setData] = React.useState<SuperadminContentResponse | null>(null);
  const [draft, setDraft] = React.useState<SuperadminContentResponse['config'] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [saveMessage, setSaveMessage] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      setSaveMessage(null);

      const next = await fetchSuperadminJson<SuperadminContentResponse>('/api/superadmin/content');
      setData(next);
      setDraft(next.config);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Falha ao carregar operações de conteúdo.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const handleSave = async () => {
    if (!draft) return;

    try {
      setIsSaving(true);
      setError(null);
      setSaveMessage(null);

      const response = await fetch('/api/superadmin/content', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: draft }),
      });

      const payload = (await response.json()) as SuperadminContentResponse & { error?: string };
      if (!response.ok) throw new Error(payload.error || 'Falha ao salvar operações de conteúdo.');

      setData(payload);
      setDraft(payload.config);
      setSaveMessage('Configurações de conteúdo salvas com sucesso.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Falha ao salvar operações de conteúdo.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <SuperadminPageHeader
        eyebrow="Conteúdo"
        title="Operações de conteúdo"
        description="Centralize textos, CTA, descricoes comerciais e referencias do produto."
        actions={
          <>
            <SuperadminActionLink href="/superadmin/reports">Ver relatórios</SuperadminActionLink>
            <button
              type="button"
              onClick={handleSave}
              disabled={!draft || isLoading || isSaving}
              className="inline-flex items-center gap-2 rounded-full bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Salvar configurações
            </button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SuperadminMetricChip label="Superfícies" value={String(data?.summary.surfaces || 0)} />
          <SuperadminMetricChip label="Ativas" value={String(data?.summary.activeSurfaces || 0)} tone="success" />
          <SuperadminMetricChip label="CTA primário" value={data?.summary.primaryCta || '—'} tone="info" />
          <SuperadminMetricChip label="Suporte" value={data?.summary.supportEmail || '—'} />
        </div>
      </SuperadminPageHeader>

      {error ? <ErrorState message={error} /> : null}
      {saveMessage ? <SuccessState message={saveMessage} /> : null}

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <SuperadminSectionCard
          title="Guia editorial e comercial"
          description="Textos-base para landing, checkout e pricing."
        >
          {isLoading || !draft ? (
            <LoadingState message="Carregando configurações de conteúdo..." />
          ) : (
            <div className="space-y-4">
              <EditorGroup title="Marca" icon={<ShieldCheck className="h-4 w-4 text-[var(--text-secondary)]" />}>
                <Field label="Nome do produto">
                  <input value={draft.brand.productName} onChange={(event) => setDraft({ ...draft, brand: { ...draft.brand, productName: event.target.value } })} className={inputClassName} />
                </Field>
                <Field label="Assinatura da marca">
                  <input value={draft.brand.signature} onChange={(event) => setDraft({ ...draft, brand: { ...draft.brand, signature: event.target.value } })} className={inputClassName} />
                </Field>
                <Field label="E-mail de suporte">
                  <input value={draft.brand.supportEmail} onChange={(event) => setDraft({ ...draft, brand: { ...draft.brand, supportEmail: event.target.value } })} className={inputClassName} />
                </Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="URL de privacidade">
                    <input value={draft.brand.privacyUrl} onChange={(event) => setDraft({ ...draft, brand: { ...draft.brand, privacyUrl: event.target.value } })} className={inputClassName} />
                  </Field>
                  <Field label="URL de termos">
                    <input value={draft.brand.termsUrl} onChange={(event) => setDraft({ ...draft, brand: { ...draft.brand, termsUrl: event.target.value } })} className={inputClassName} />
                  </Field>
                </div>
              </EditorGroup>

              <EditorGroup title="Aquisição" icon={<Megaphone className="h-4 w-4 text-[var(--text-secondary)]" />}>
                <Field label="CTA primário padrão">
                  <input value={draft.acquisition.defaultPrimaryCta} onChange={(event) => setDraft({ ...draft, acquisition: { ...draft.acquisition, defaultPrimaryCta: event.target.value } })} className={inputClassName} />
                </Field>
                <Field label="CTA secundário padrão">
                  <input value={draft.acquisition.defaultSecondaryCta} onChange={(event) => setDraft({ ...draft, acquisition: { ...draft.acquisition, defaultSecondaryCta: event.target.value } })} className={inputClassName} />
                </Field>
                <Field label="Linha de risco reverso">
                  <input value={draft.acquisition.riskReversal} onChange={(event) => setDraft({ ...draft, acquisition: { ...draft.acquisition, riskReversal: event.target.value } })} className={inputClassName} />
                </Field>
                <Field label="Linha de confiança">
                  <textarea value={draft.acquisition.trustLine} onChange={(event) => setDraft({ ...draft, acquisition: { ...draft.acquisition, trustLine: event.target.value } })} className={textareaClassName} rows={3} />
                </Field>
              </EditorGroup>
            </div>
          )}
        </SuperadminSectionCard>

        <div className="space-y-6">
          <SuperadminSectionCard
            title="Pricing e narrativa"
            description="Mensagens comerciais e direcao editorial."
          >
            {isLoading || !draft ? (
              <LoadingState message="Carregando descrições comerciais..." />
            ) : (
              <div className="space-y-4">
                <EditorGroup title="Planos" icon={<FileText className="h-4 w-4 text-[var(--text-secondary)]" />}>
                  <Field label="Descrição do Free">
                    <textarea value={draft.pricing.freeDescription} onChange={(event) => setDraft({ ...draft, pricing: { ...draft.pricing, freeDescription: event.target.value } })} className={textareaClassName} rows={3} />
                  </Field>
                  <Field label="Descrição do Pro">
                    <textarea value={draft.pricing.proDescription} onChange={(event) => setDraft({ ...draft, pricing: { ...draft.pricing, proDescription: event.target.value } })} className={textareaClassName} rows={3} />
                  </Field>
                  <Field label="Descrição do Premium">
                    <textarea value={draft.pricing.premiumDescription} onChange={(event) => setDraft({ ...draft, pricing: { ...draft.pricing, premiumDescription: event.target.value } })} className={textareaClassName} rows={3} />
                  </Field>
                </EditorGroup>

                <EditorGroup title="Direção editorial" icon={<Megaphone className="h-4 w-4 text-[var(--text-secondary)]" />}>
                  <Field label="Tom de voz">
                    <textarea value={draft.editorial.voiceAndTone} onChange={(event) => setDraft({ ...draft, editorial: { ...draft.editorial, voiceAndTone: event.target.value } })} className={textareaClassName} rows={3} />
                  </Field>
                  <Field label="Mensagem prioritária">
                    <textarea value={draft.editorial.priorityMessage} onChange={(event) => setDraft({ ...draft, editorial: { ...draft.editorial, priorityMessage: event.target.value } })} className={textareaClassName} rows={3} />
                  </Field>
                  <Field label="Foco atual">
                    <textarea value={draft.editorial.currentFocus} onChange={(event) => setDraft({ ...draft, editorial: { ...draft.editorial, currentFocus: event.target.value } })} className={textareaClassName} rows={3} />
                  </Field>
                </EditorGroup>
              </div>
            )}
          </SuperadminSectionCard>

          <SuperadminSectionCard
            title="Superfícies mapeadas"
            description="Inventário das páginas mais estratégicas do produto."
          >
            {isLoading || !data ? (
              <LoadingState message="Carregando superfícies..." />
            ) : (
              <div className="space-y-3">
                {data.surfaces.map((surface) => (
                  <article key={surface.key} className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-app)] p-3.5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-[var(--text-primary)]">{surface.label}</p>
                        <p className="mt-1 text-xs text-[var(--text-secondary)]">{surface.objective}</p>
                      </div>
                      <span className="rounded-full border border-[var(--border-default)] bg-[color:var(--primary-soft)] px-3 py-1 text-xs font-semibold text-[var(--text-secondary)]">
                        {surface.status}
                      </span>
                    </div>
                    <div className="mt-4 grid gap-2 text-xs text-[var(--text-secondary)]">
                      <p><span className="text-[var(--text-muted)]">Rota:</span> {surface.route}</p>
                      <p><span className="text-[var(--text-muted)]">Arquivo:</span> {surface.file}</p>
                      <p>{surface.notes}</p>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </SuperadminSectionCard>
        </div>
      </div>
    </div>
  );
}

function EditorGroup({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-app)] p-4">
      <div className="flex items-center gap-3">
        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)]/5 p-2">{icon}</div>
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h3>
      </div>
      <div className="mt-4 space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">{label}</span>
      <div className="mt-2">{children}</div>
    </label>
  );
}

function LoadingState({ message }: { message: string }) {
  return (
    <div className="flex min-h-[180px] items-center justify-center">
      <div className="flex items-center gap-3 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-app)] px-5 py-4 text-[var(--text-primary)]">
        <Loader2 className="h-5 w-5 animate-spin text-[var(--text-secondary)]" />
        {message}
      </div>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return <div className="rounded-2xl border border-[var(--border-default)] bg-[color:var(--danger-soft)] px-4 py-5 text-sm text-[var(--danger)]">{message}</div>;
}

function SuccessState({ message }: { message: string }) {
  return <div className="rounded-2xl border border-[var(--border-default)] bg-[color:var(--primary-soft)] px-4 py-5 text-sm text-[var(--text-secondary)]">{message}</div>;
}


