'use client';

import * as React from 'react';
import { fetchSuperadminJson } from '@/components/superadmin/fetch-superadmin-json';
import type { TrackingSettings } from '@/lib/tracking/types';

const defaultSettings: TrackingSettings = {
  pixelId: '',
  pixelEnabled: false,
  conversionsApiEnabled: false,
  conversionsApiAccessToken: '',
  testEventCode: '',
  quizTrackingEnabled: true,
  signupTrackingEnabled: true,
  purchaseTrackingEnabled: true,
  utmCaptureEnabled: true,
};

type TrackingResponse = {
  settings: TrackingSettings;
  status: {
    pixelConfigured: boolean;
    utmCaptureActive: boolean;
    purchaseTrackingActive: boolean;
  };
};

export function SuperadminTrackingSettingsPage() {
  const [settings, setSettings] = React.useState<TrackingSettings>(defaultSettings);
  const [status, setStatus] = React.useState<TrackingResponse['status'] | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let mounted = true;

    const run = async () => {
      try {
        const response = await fetchSuperadminJson<TrackingResponse>('/api/superadmin/global-settings/tracking');
        if (!mounted) return;
        setSettings(response.settings);
        setStatus(response.status);
      } catch (fetchError) {
        if (!mounted) return;
        setError(fetchError instanceof Error ? fetchError.message : 'Falha ao carregar configuracoes de tracking.');
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    void run();
    return () => {
      mounted = false;
    };
  }, []);

  const updateField = React.useCallback(<K extends keyof TrackingSettings>(field: K, value: TrackingSettings[K]) => {
    setSettings((current) => ({ ...current, [field]: value }));
  }, []);

  const handleSave = React.useCallback(async () => {
    try {
      setIsSaving(true);
      setError(null);
      setNotice(null);
      const response = await fetchSuperadminJson<TrackingResponse>('/api/superadmin/global-settings/tracking', {
        method: 'POST',
        body: JSON.stringify(settings),
      });
      setSettings(response.settings);
      setStatus(response.status);
      setNotice('Configuracoes de tracking salvas com sucesso.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Falha ao salvar configuracoes.');
    } finally {
      setIsSaving(false);
    }
  }, [settings]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-white">Tracking e Marketing</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">
          Configure Pixel da Meta, toggles do funil e prepare a estrutura para UTMIFY, Stripe e futuras integracoes server-side.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {[
          { label: 'Pixel configurado', value: status?.pixelConfigured ? 'Ativo' : 'Pendente' },
          { label: 'Captura de UTM', value: status?.utmCaptureActive ? 'Ativa' : 'Desligada' },
          { label: 'Purchase tracking', value: status?.purchaseTrackingActive ? 'Ativo' : 'Desligado' },
        ].map((item) => (
          <div key={item.label} className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">{item.label}</p>
            <p className="mt-3 text-lg font-semibold text-white">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
        {isLoading ? (
          <p className="text-sm text-slate-300">Carregando configuracoes...</p>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Meta Pixel ID">
                <input value={settings.pixelId} onChange={(event) => updateField('pixelId', event.target.value)} className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-emerald-500" placeholder="123456789012345" />
              </Field>
              <Field label="Meta Test Event Code">
                <input value={settings.testEventCode} onChange={(event) => updateField('testEventCode', event.target.value)} className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-emerald-500" placeholder="TEST12345" />
              </Field>
            </div>

            <Field label="Meta Conversions API Access Token">
              <input value={settings.conversionsApiAccessToken} onChange={(event) => updateField('conversionsApiAccessToken', event.target.value)} className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-emerald-500" placeholder="EAAG..." />
              <p className="mt-2 text-xs text-slate-500">Esse token fica apenas no backend. Nao e exposto no frontend.</p>
            </Field>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <ToggleCard label="Habilitar Meta Pixel" checked={settings.pixelEnabled} onChange={(value) => updateField('pixelEnabled', value)} />
              <ToggleCard label="Habilitar Conversions API" checked={settings.conversionsApiEnabled} onChange={(value) => updateField('conversionsApiEnabled', value)} />
              <ToggleCard label="Habilitar tracking do quiz" checked={settings.quizTrackingEnabled} onChange={(value) => updateField('quizTrackingEnabled', value)} />
              <ToggleCard label="Habilitar tracking de signup" checked={settings.signupTrackingEnabled} onChange={(value) => updateField('signupTrackingEnabled', value)} />
              <ToggleCard label="Habilitar tracking de purchase" checked={settings.purchaseTrackingEnabled} onChange={(value) => updateField('purchaseTrackingEnabled', value)} />
              <ToggleCard label="Habilitar captura de UTM" checked={settings.utmCaptureEnabled} onChange={(value) => updateField('utmCaptureEnabled', value)} />
            </div>

            {notice ? <p className="text-sm text-emerald-300">{notice}</p> : null}
            {error ? <p className="text-sm text-rose-300">{error}</p> : null}

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={isSaving}
                className="rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-400 disabled:opacity-60"
              >
                {isSaving ? 'Salvando...' : 'Salvar configuracoes'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function ToggleCard({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`rounded-3xl border p-4 text-left transition ${
        checked ? 'border-emerald-500/40 bg-emerald-500/10 text-white' : 'border-slate-800 bg-slate-950/70 text-slate-300'
      }`}
    >
      <p className="text-sm font-semibold">{label}</p>
      <p className="mt-3 text-xs uppercase tracking-[0.22em] text-slate-500">{checked ? 'Ligado' : 'Desligado'}</p>
    </button>
  );
}
