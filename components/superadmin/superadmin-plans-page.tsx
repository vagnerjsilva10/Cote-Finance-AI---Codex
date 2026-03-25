'use client';

import * as React from 'react';
import { Loader2, Save, Settings2, Sparkles } from 'lucide-react';

import { fetchSuperadminJson } from '@/components/superadmin/fetch-superadmin-json';
import {
  formatAdminCurrency,
  formatAdminNumber,
  formatPlanLabel,
} from '@/components/superadmin/superadmin-utils';
import type {
  SuperadminPlanConfig,
  SuperadminPlansResponse,
  SuperadminPlansUpdateResponse,
} from '@/lib/superadmin/types';

type EditablePlanState = SuperadminPlanConfig & {
  featuresText: string;
  trustBadgesText: string;
};

function toEditablePlan(plan: SuperadminPlanConfig): EditablePlanState {
  return {
    ...plan,
    featuresText: plan.features.join('\n'),
    trustBadgesText: plan.trustBadges.join('\n'),
  };
}

function fromEditablePlan(plan: EditablePlanState): SuperadminPlanConfig {
  return {
    ...plan,
    features: plan.featuresText
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean),
    trustBadges: plan.trustBadgesText
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean),
  };
}

export function SuperadminPlansPage() {
  const [data, setData] = React.useState<SuperadminPlansResponse | null>(null);
  const [plans, setPlans] = React.useState<EditablePlanState[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    let active = true;

    const run = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await fetchSuperadminJson<SuperadminPlansResponse>('/api/superadmin/plans');
        if (!active) return;
        setData(response);
        setPlans(response.plans.map(toEditablePlan));
      } catch (fetchError) {
        if (active) {
          setError(fetchError instanceof Error ? fetchError.message : 'Falha ao carregar os planos.');
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

  const defaultPlan = plans.find((plan) => plan.default)?.code || 'FREE';

  const updatePlan = React.useCallback(
    (code: SuperadminPlanConfig['code'], updater: (plan: EditablePlanState) => EditablePlanState) => {
      setPlans((current) => current.map((plan) => (plan.code === code ? updater(plan) : plan)));
    },
    []
  );

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);
      setSuccess(null);

      const response = await fetchSuperadminJson<SuperadminPlansUpdateResponse>('/api/superadmin/plans', {
        method: 'PATCH',
        body: JSON.stringify({
          defaultPlan,
          plans: plans.map(fromEditablePlan),
        }),
      });

      setPlans(response.plans.map(toEditablePlan));
      setSuccess('Catalogo de planos atualizado com sucesso.');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Falha ao salvar os planos.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--text-muted)]">Planos</p>
            <h1 className="text-2xl font-black tracking-tight text-[var(--text-primary)] md:text-3xl">Catalogo de planos</h1>
            <p className="max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
              Ajuste preco, trial, visibilidade, limites e beneficios sem sair do backoffice.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={isSaving || isLoading}
            className={primaryButtonClassName}
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar catalogo
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
          <MetricCard
            label="Planos ativos"
            value={formatAdminNumber(plans.filter((plan) => plan.active).length)}
            helper="em operação"
          />
          <MetricCard
            label="Visiveis"
            value={formatAdminNumber(plans.filter((plan) => plan.visible).length)}
            helper="expostos no produto"
          />
          <MetricCard label="Plano padrao" value={formatPlanLabel(defaultPlan)} helper="entrada principal" />
          <MetricCard
            label="Preco Pro"
            value={formatAdminCurrency(plans.find((plan) => plan.code === 'PRO')?.monthlyPrice || 0)}
            helper="mensal atual"
          />
        </div>
      </section>

      {success ? <SuccessState message={success} /> : null}
      {error ? <ErrorState message={error} /> : null}

      {isLoading ? (
        <LoadingState label="Carregando catalogo de planos..." />
      ) : (
        <div className="grid gap-4 xl:grid-cols-3">
          {plans
            .slice()
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((plan) => (
              <section key={plan.code} className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-black text-[var(--text-primary)]">{plan.name}</h2>
                      {plan.default ? (
                        <span className="rounded-full border border-[var(--border-default)] bg-[color:var(--primary-soft)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-secondary)]">
                          Padrão
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{plan.description}</p>
                  </div>
                  <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-app)] p-3 text-[var(--text-secondary)]">
                    {plan.code === 'FREE' ? <Settings2 className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--text-muted)]">Nome</span>
                    <input
                      value={plan.name}
                      onChange={(event) => updatePlan(plan.code, (current) => ({ ...current, name: event.target.value }))}
                      className={fieldClassName}
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--text-muted)]">Ordem</span>
                    <input
                      type="number"
                      value={plan.sortOrder}
                      onChange={(event) =>
                        updatePlan(plan.code, (current) => ({
                          ...current,
                          sortOrder: Number(event.target.value) || current.sortOrder,
                        }))
                      }
                      className={fieldClassName}
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--text-muted)]">Preco mensal</span>
                    <input
                      type="number"
                      value={plan.monthlyPrice}
                      onChange={(event) =>
                        updatePlan(plan.code, (current) => ({
                          ...current,
                          monthlyPrice: Number(event.target.value) || 0,
                        }))
                      }
                      className={fieldClassName}
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--text-muted)]">Preco anual</span>
                    <input
                      type="number"
                      value={plan.annualPrice}
                      onChange={(event) =>
                        updatePlan(plan.code, (current) => ({
                          ...current,
                          annualPrice: Number(event.target.value) || 0,
                        }))
                      }
                      className={fieldClassName}
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--text-muted)]">Trial</span>
                    <input
                      type="number"
                      value={plan.trialDays}
                      onChange={(event) =>
                        updatePlan(plan.code, (current) => ({
                          ...current,
                          trialDays: Number(event.target.value) || 0,
                        }))
                      }
                      className={fieldClassName}
                    />
                  </label>
                  <div className="grid gap-2.5">
                    <ToggleRow
                      label="Plano ativo"
                      checked={plan.active}
                      onChange={(checked) => updatePlan(plan.code, (current) => ({ ...current, active: checked }))}
                    />
                    <ToggleRow
                      label="Visivel no produto"
                      checked={plan.visible}
                      onChange={(checked) => updatePlan(plan.code, (current) => ({ ...current, visible: checked }))}
                    />
                    <ToggleRow
                      label="Plano padrao"
                      checked={plan.default}
                      onChange={(checked) =>
                        setPlans((current) =>
                          current.map((item) => ({
                            ...item,
                            default: checked ? item.code === plan.code : item.code === 'FREE',
                          }))
                        )
                      }
                    />
                  </div>
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <label className="block">
                    <span className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--text-muted)]">Transações/mês</span>
                    <input
                      value={plan.limits.transactionsPerMonth ?? ''}
                      onChange={(event) =>
                        updatePlan(plan.code, (current) => ({
                          ...current,
                          limits: {
                            ...current.limits,
                            transactionsPerMonth: event.target.value.trim() ? Number(event.target.value) : null,
                          },
                        }))
                      }
                      placeholder="Ilimitado"
                      className={fieldClassName}
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--text-muted)]">IA/mês</span>
                    <input
                      value={plan.limits.aiInteractionsPerMonth ?? ''}
                      onChange={(event) =>
                        updatePlan(plan.code, (current) => ({
                          ...current,
                          limits: {
                            ...current.limits,
                            aiInteractionsPerMonth: event.target.value.trim() ? Number(event.target.value) : null,
                          },
                        }))
                      }
                      placeholder="Ilimitado"
                      className={fieldClassName}
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--text-muted)]">Relatórios</span>
                    <select
                      value={plan.limits.reports}
                      onChange={(event) =>
                        updatePlan(plan.code, (current) => ({
                          ...current,
                          limits: {
                            ...current.limits,
                            reports: event.target.value === 'full' ? 'full' : 'basic',
                          },
                        }))
                      }
                      className={fieldClassName}
                    >
                      <option value="basic">Básicos</option>
                      <option value="full">Completos</option>
                    </select>
                  </label>
                </div>

                <label className="mt-3 block">
                  <span className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--text-muted)]">Descricao</span>
                  <textarea
                    value={plan.description}
                    onChange={(event) => updatePlan(plan.code, (current) => ({ ...current, description: event.target.value }))}
                    rows={3}
                    className={textareaClassName}
                  />
                </label>

                <div className="mt-3 grid gap-3">
                  <label className="block">
                    <span className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--text-muted)]">Beneficios</span>
                    <textarea
                      value={plan.featuresText}
                      onChange={(event) =>
                        updatePlan(plan.code, (current) => ({ ...current, featuresText: event.target.value }))
                      }
                      rows={5}
                      className={textareaClassName}
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--text-muted)]">Badges</span>
                    <textarea
                      value={plan.trustBadgesText}
                      onChange={(event) =>
                        updatePlan(plan.code, (current) => ({ ...current, trustBadgesText: event.target.value }))
                      }
                      rows={3}
                      className={textareaClassName}
                    />
                  </label>
                </div>
              </section>
            ))}
        </div>
      )}

      {data ? (
        <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5">
          <h2 className="text-lg font-black text-[var(--text-primary)]">Leitura rapida do catalogo</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">Veja o estado atual da oferta sem abrir cada formulário.</p>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {plans.map((plan) => (
              <div key={plan.code} className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-app)] p-3.5">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-[var(--text-primary)]">{plan.name}</p>
                  <span className="rounded-full border border-[var(--border-default)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-secondary)]">
                    {plan.active ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
                <p className="mt-3 text-2xl font-bold tracking-tight text-[var(--text-primary)]">
                  {formatAdminCurrency(plan.monthlyPrice)}
                  <span className="text-sm font-medium text-[var(--text-muted)]"> / mês</span>
                </p>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  {plan.limits.transactionsPerMonth === null
                    ? 'Transações ilimitadas'
                    : `${formatAdminNumber(plan.limits.transactionsPerMonth)} transações/mês`}
                </p>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  {plan.limits.aiInteractionsPerMonth === null
                    ? 'IA ilimitada'
                    : `${formatAdminNumber(plan.limits.aiInteractionsPerMonth)} interações de IA/mês`}
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function MetricCard({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-app)] p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">{label}</p>
      <p className="mt-2 text-xl font-bold tracking-tight text-[var(--text-primary)]">{value}</p>
      <p className="mt-1 text-sm text-[var(--text-muted)]">{helper}</p>
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between rounded-xl border border-[var(--border-default)] bg-[var(--bg-app)] px-3 py-2.5 text-sm text-[var(--text-primary)]">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-[var(--border-strong)] bg-[var(--bg-surface)] text-[var(--text-secondary)]"
      />
    </label>
  );
}

function LoadingState({ label }: { label: string }) {
  return (
    <div className="flex min-h-[220px] items-center justify-center">
      <div className="flex items-center gap-3 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-app)] px-5 py-4 text-[var(--text-primary)]">
        <Loader2 className="h-5 w-5 animate-spin text-[var(--text-secondary)]" />
        {label}
      </div>
    </div>
  );
}

function SuccessState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border-default)] bg-[color:var(--primary-soft)] px-4 py-5 text-sm text-[var(--text-secondary)]">
      {message}
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border-default)] bg-[color:var(--danger-soft)] px-4 py-5 text-sm text-[var(--danger)]">
      {message}
    </div>
  );
}

const fieldClassName =
  'mt-2 w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--primary)]';
const textareaClassName =
  'mt-2 w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--primary)]';
const primaryButtonClassName =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-bold text-[var(--text-primary)] transition-all hover:bg-[var(--primary-hover)] disabled:opacity-60';

