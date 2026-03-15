'use client';

import * as React from 'react';
import { Loader2, Sparkles } from 'lucide-react';

import { fetchSuperadminJson, useDebouncedValue } from '@/components/superadmin/fetch-superadmin-json';
import {
  SuperadminActionLink,
  SuperadminMetricChip,
  SuperadminPageHeader,
  SuperadminSectionCard,
} from '@/components/superadmin/superadmin-page-primitives';
import type { SuperadminFeatureFlagsResponse } from '@/lib/superadmin/types';

const PLAN_OPTIONS = ['FREE', 'PRO', 'PREMIUM'] as const;

export function SuperadminFeatureFlagsPage() {
  const [data, setData] = React.useState<SuperadminFeatureFlagsResponse | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [saveMessage, setSaveMessage] = React.useState<string | null>(null);
  const [workspaceSearch, setWorkspaceSearch] = React.useState('');
  const [userSearch, setUserSearch] = React.useState('');
  const [workspaceForm, setWorkspaceForm] = React.useState({
    flagKey: 'advanced_ai_insights',
    workspaceId: '',
    enabled: true,
    reason: '',
  });
  const [userForm, setUserForm] = React.useState({
    flagKey: 'advanced_ai_insights',
    userId: '',
    enabled: true,
    reason: '',
  });

  const debouncedWorkspaceSearch = useDebouncedValue(workspaceSearch, 300);
  const debouncedUserSearch = useDebouncedValue(userSearch, 300);
  const shouldSearch = Boolean(data);

  const load = React.useCallback(async (options?: { workspaceSearch?: string; userSearch?: string }) => {
    const params = new URLSearchParams();
    if (options?.workspaceSearch) params.set('workspaceSearch', options.workspaceSearch);
    if (options?.userSearch) params.set('userSearch', options.userSearch);

    return fetchSuperadminJson<SuperadminFeatureFlagsResponse>(
      `/api/superadmin/feature-flags${params.toString() ? `?${params}` : ''}`
    );
  }, []);

  React.useEffect(() => {
    let active = true;

    const run = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const next = await load();
        if (active) setData(next);
      } catch (fetchError) {
        if (active) setError(fetchError instanceof Error ? fetchError.message : 'Falha ao carregar feature flags.');
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void run();
    return () => {
      active = false;
    };
  }, [load]);

  React.useEffect(() => {
    if (!data) return;
    let active = true;

    const run = async () => {
      try {
        const next = await load({
          workspaceSearch: debouncedWorkspaceSearch,
          userSearch: debouncedUserSearch,
        });
        if (active) {
          setData(next);
        }
      } catch {}
    };

    void run();
    return () => {
      active = false;
    };
  }, [data, shouldSearch, debouncedWorkspaceSearch, debouncedUserSearch, load]);

  const toggleFlag = (key: string) => {
    setData((current) => {
      if (!current) return current;
      const flags = current.flags.map((flag) => (flag.key === key ? { ...flag, enabled: !flag.enabled } : flag));
      return {
        ...current,
        flags,
        summary: {
          ...current.summary,
          enabled: flags.filter((flag) => flag.enabled).length,
          disabled: flags.filter((flag) => !flag.enabled).length,
        },
      };
    });
    setSaveMessage(null);
  };

  const toggleAllowedPlan = (key: string, plan: (typeof PLAN_OPTIONS)[number]) => {
    setData((current) => {
      if (!current) return current;
      return {
        ...current,
        flags: current.flags.map((flag) => {
          if (flag.key !== key) return flag;
          const hasPlan = flag.allowedPlans.includes(plan);
          const nextAllowedPlans = hasPlan
            ? flag.allowedPlans.filter((item) => item !== plan)
            : [...flag.allowedPlans, plan];
          return {
            ...flag,
            allowedPlans: nextAllowedPlans.length > 0 ? nextAllowedPlans : flag.allowedPlans,
          };
        }),
      };
    });
    setSaveMessage(null);
  };

  const saveFlags = async () => {
    if (!data) return;

    try {
      setIsSaving(true);
      setSaveMessage(null);
      const next = await fetchSuperadminJson<SuperadminFeatureFlagsResponse>('/api/superadmin/feature-flags', {
        method: 'PUT',
        body: JSON.stringify({ flags: data.flags }),
      });
      setData(next);
      setSaveMessage('Governança global salva com sucesso.');
    } catch (saveError) {
      setSaveMessage(saveError instanceof Error ? saveError.message : 'Falha ao salvar feature flags.');
    } finally {
      setIsSaving(false);
    }
  };

  const applyWorkspaceOverride = async () => {
    if (!workspaceForm.workspaceId) return;
    try {
      setIsSaving(true);
      setSaveMessage(null);
      const next = await fetchSuperadminJson<SuperadminFeatureFlagsResponse>('/api/superadmin/feature-flags', {
        method: 'PATCH',
        body: JSON.stringify({
          action: 'set-workspace-override',
          ...workspaceForm,
        }),
      });
      setData(next);
      setWorkspaceForm((current) => ({ ...current, workspaceId: '', reason: '' }));
      setSaveMessage('Override por workspace salvo com sucesso.');
    } catch (saveError) {
      setSaveMessage(saveError instanceof Error ? saveError.message : 'Falha ao salvar override por workspace.');
    } finally {
      setIsSaving(false);
    }
  };

  const applyUserOverride = async () => {
    if (!userForm.userId) return;
    try {
      setIsSaving(true);
      setSaveMessage(null);
      const next = await fetchSuperadminJson<SuperadminFeatureFlagsResponse>('/api/superadmin/feature-flags', {
        method: 'PATCH',
        body: JSON.stringify({
          action: 'set-user-override',
          ...userForm,
        }),
      });
      setData(next);
      setUserForm((current) => ({ ...current, userId: '', reason: '' }));
      setSaveMessage('Override por usuário salvo com sucesso.');
    } catch (saveError) {
      setSaveMessage(saveError instanceof Error ? saveError.message : 'Falha ao salvar override por usuário.');
    } finally {
      setIsSaving(false);
    }
  };

  const removeOverride = async (params: { action: 'remove-workspace-override'; flagKey: string; workspaceId: string } | { action: 'remove-user-override'; flagKey: string; userId: string }) => {
    try {
      setIsSaving(true);
      setSaveMessage(null);
      const next = await fetchSuperadminJson<SuperadminFeatureFlagsResponse>('/api/superadmin/feature-flags', {
        method: 'PATCH',
        body: JSON.stringify(params),
      });
      setData(next);
      setSaveMessage('Override removido com sucesso.');
    } catch (saveError) {
      setSaveMessage(saveError instanceof Error ? saveError.message : 'Falha ao remover override.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <SuperadminPageHeader
        eyebrow="Feature Flags"
        title="Governança de rollout"
        description="Controle recursos por camada global, por plano, por workspace e por usuário. O rollout daqui já impacta os fluxos do app que respeitam essa resolução central."
        actions={
          <>
            <SuperadminActionLink href="/superadmin/ai">Ver operação de IA</SuperadminActionLink>
            <button
              type="button"
              onClick={saveFlags}
              disabled={isSaving || isLoading || !data}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-bold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Salvar rollout global
            </button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-4">
          <SuperadminMetricChip label="Flags" value={String(data?.summary.total ?? 0)} />
          <SuperadminMetricChip label="Ativas" value={String(data?.summary.enabled ?? 0)} tone="success" />
          <SuperadminMetricChip label="Overrides workspace" value={String(data?.summary.workspaceOverrides ?? 0)} tone="info" />
          <SuperadminMetricChip label="Overrides usuário" value={String(data?.summary.userOverrides ?? 0)} tone="info" />
        </div>
      </SuperadminPageHeader>

      {isLoading ? <StateBox label="Carregando feature flags..." /> : null}
      {!isLoading && (error || !data) ? <ErrorBox message={error || 'Falha ao carregar feature flags.'} /> : null}

      {!isLoading && data ? (
        <>
          <SuperadminSectionCard
            title="Camada global por plano"
            description="Defina se a feature está ativa na plataforma e em quais planos ela pode existir antes de qualquer override local."
          >
            <div className="space-y-4">
              {data.flags.map((flag) => (
                <article key={flag.key} className="rounded-2xl border border-slate-800 bg-slate-950/55 p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="max-w-3xl">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-base font-semibold text-white">{flag.label}</h3>
                        <span className="rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">
                          {flag.scope}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${
                            flag.enabled
                              ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                              : 'border border-slate-700/70 bg-slate-900/70 text-slate-300'
                          }`}
                        >
                          {flag.enabled ? 'Ativo' : 'Desativado'}
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-7 text-slate-400">{flag.description}</p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {PLAN_OPTIONS.map((plan) => {
                          const isActive = flag.allowedPlans.includes(plan);
                          return (
                            <button
                              key={`${flag.key}-${plan}`}
                              type="button"
                              onClick={() => toggleAllowedPlan(flag.key, plan)}
                              className={`rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] transition ${
                                isActive
                                  ? 'border border-sky-500/30 bg-sky-500/10 text-sky-300'
                                  : 'border border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-600 hover:text-slate-200'
                              }`}
                            >
                              {plan}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleFlag(flag.key)}
                      className={`inline-flex min-w-[148px] items-center justify-center rounded-xl px-4 py-2 text-sm font-bold transition ${
                        flag.enabled
                          ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/15'
                          : 'border border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800'
                      }`}
                    >
                      {flag.enabled ? 'Desativar' : 'Ativar'}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </SuperadminSectionCard>

          <div className="grid gap-6 xl:grid-cols-2">
            <SuperadminSectionCard
              title="Override por workspace"
              description="Liberte ou bloqueie recursos em contas específicas para suporte, rollout assistido ou contenção operacional."
            >
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Feature</span>
                    <select
                      value={workspaceForm.flagKey}
                      onChange={(event) => setWorkspaceForm((current) => ({ ...current, flagKey: event.target.value }))}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none transition focus:border-emerald-500"
                    >
                      {data.flags.map((flag) => (
                        <option key={flag.key} value={flag.key}>
                          {flag.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-2">
                    <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Estado</span>
                    <select
                      value={workspaceForm.enabled ? 'enabled' : 'disabled'}
                      onChange={(event) =>
                        setWorkspaceForm((current) => ({ ...current, enabled: event.target.value === 'enabled' }))
                      }
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none transition focus:border-emerald-500"
                    >
                      <option value="enabled">Liberar</option>
                      <option value="disabled">Bloquear</option>
                    </select>
                  </label>
                </div>

                <label className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Buscar workspace</span>
                  <input
                    value={workspaceSearch}
                    onChange={(event) => setWorkspaceSearch(event.target.value)}
                    placeholder="Nome ou ID do workspace"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-500"
                  />
                </label>

                {data.search.workspaces.length > 0 ? (
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/55 p-3">
                    <div className="space-y-2">
                      {data.search.workspaces.map((workspace) => (
                        <button
                          key={workspace.id}
                          type="button"
                          onClick={() => setWorkspaceForm((current) => ({ ...current, workspaceId: workspace.id }))}
                          className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition ${
                            workspaceForm.workspaceId === workspace.id ? 'bg-emerald-500/10 text-emerald-100' : 'hover:bg-slate-900'
                          }`}
                        >
                          <span>
                            <span className="block text-sm font-semibold text-white">{workspace.name}</span>
                            <span className="block text-xs text-slate-400">{workspace.id}</span>
                          </span>
                          <span className="rounded-full border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">
                            {workspace.plan}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                <label className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Motivo</span>
                  <textarea
                    value={workspaceForm.reason}
                    onChange={(event) => setWorkspaceForm((current) => ({ ...current, reason: event.target.value }))}
                    rows={3}
                    placeholder="Ex.: liberar rollout para customer beta"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-500"
                  />
                </label>

                <button
                  type="button"
                  onClick={applyWorkspaceOverride}
                  disabled={isSaving || !workspaceForm.workspaceId}
                  className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-bold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Salvar override do workspace
                </button>

                <div className="space-y-2">
                  {data.workspaceOverrides.map((override) => (
                    <div key={`${override.flagKey}-${override.workspaceId}`} className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-950/55 p-4 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-white">{override.workspaceName}</p>
                        <p className="text-xs text-slate-400">{override.flagLabel}</p>
                        {override.reason ? <p className="mt-2 text-xs text-slate-500">{override.reason}</p> : null}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${override.enabled ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border border-rose-500/20 bg-rose-500/10 text-rose-200'}`}>
                          {override.enabled ? 'Liberado' : 'Bloqueado'}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeOverride({ action: 'remove-workspace-override', flagKey: override.flagKey, workspaceId: override.workspaceId })}
                          className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-bold text-slate-200 transition hover:border-slate-600 hover:bg-slate-800"
                        >
                          Remover
                        </button>
                      </div>
                    </div>
                  ))}
                  {data.workspaceOverrides.length === 0 ? <EmptyHint label="Nenhum override por workspace configurado." /> : null}
                </div>
              </div>
            </SuperadminSectionCard>

            <SuperadminSectionCard
              title="Override por usuário"
              description="Use para suporte pontual, teste interno, bloqueio assistido ou liberação individual sem afetar o restante da base."
            >
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Feature</span>
                    <select
                      value={userForm.flagKey}
                      onChange={(event) => setUserForm((current) => ({ ...current, flagKey: event.target.value }))}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none transition focus:border-emerald-500"
                    >
                      {data.flags.map((flag) => (
                        <option key={flag.key} value={flag.key}>
                          {flag.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-2">
                    <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Estado</span>
                    <select
                      value={userForm.enabled ? 'enabled' : 'disabled'}
                      onChange={(event) => setUserForm((current) => ({ ...current, enabled: event.target.value === 'enabled' }))}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none transition focus:border-emerald-500"
                    >
                      <option value="enabled">Liberar</option>
                      <option value="disabled">Bloquear</option>
                    </select>
                  </label>
                </div>

                <label className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Buscar usuário</span>
                  <input
                    value={userSearch}
                    onChange={(event) => setUserSearch(event.target.value)}
                    placeholder="Nome, e-mail ou ID do usuário"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-500"
                  />
                </label>

                {data.search.users.length > 0 ? (
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/55 p-3">
                    <div className="space-y-2">
                      {data.search.users.map((user) => (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => setUserForm((current) => ({ ...current, userId: user.id }))}
                          className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition ${
                            userForm.userId === user.id ? 'bg-emerald-500/10 text-emerald-100' : 'hover:bg-slate-900'
                          }`}
                        >
                          <span>
                            <span className="block text-sm font-semibold text-white">{user.name || user.email}</span>
                            <span className="block text-xs text-slate-400">{user.email}</span>
                          </span>
                          <span className="rounded-full border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">
                            {user.plan}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                <label className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Motivo</span>
                  <textarea
                    value={userForm.reason}
                    onChange={(event) => setUserForm((current) => ({ ...current, reason: event.target.value }))}
                    rows={3}
                    placeholder="Ex.: liberar acesso para suporte avançado"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-500"
                  />
                </label>

                <button
                  type="button"
                  onClick={applyUserOverride}
                  disabled={isSaving || !userForm.userId}
                  className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-bold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Salvar override do usuário
                </button>

                <div className="space-y-2">
                  {data.userOverrides.map((override) => (
                    <div key={`${override.flagKey}-${override.userId}`} className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-950/55 p-4 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-white">{override.userName || override.userEmail}</p>
                        <p className="text-xs text-slate-400">{override.flagLabel}</p>
                        {override.reason ? <p className="mt-2 text-xs text-slate-500">{override.reason}</p> : null}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${override.enabled ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border border-rose-500/20 bg-rose-500/10 text-rose-200'}`}>
                          {override.enabled ? 'Liberado' : 'Bloqueado'}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeOverride({ action: 'remove-user-override', flagKey: override.flagKey, userId: override.userId })}
                          className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-bold text-slate-200 transition hover:border-slate-600 hover:bg-slate-800"
                        >
                          Remover
                        </button>
                      </div>
                    </div>
                  ))}
                  {data.userOverrides.length === 0 ? <EmptyHint label="Nenhum override por usuário configurado." /> : null}
                </div>
              </div>
            </SuperadminSectionCard>
          </div>

          {saveMessage ? (
            <div
              className={`rounded-2xl px-4 py-3 text-sm ${
                saveMessage.includes('sucesso')
                  ? 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-100'
                  : 'border border-rose-500/20 bg-rose-500/10 text-rose-100'
              }`}
            >
              {saveMessage}
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function EmptyHint({ label }: { label: string }) {
  return <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/40 px-4 py-5 text-sm text-slate-400">{label}</div>;
}

function StateBox({ label }: { label: string }) {
  return (
    <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/50">
      <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 px-5 py-4 text-slate-200">
        <Loader2 className="h-5 w-5 animate-spin text-emerald-400" />
        {label}
      </div>
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-5 text-sm text-rose-100">{message}</div>;
}
