'use client';

import {
  BadgeCheck,
  CircleDollarSign,
  Gem,
  Layers3,
  Sparkles,
  Wallet,
} from 'lucide-react';

import {
  SuperadminInfoList,
  SuperadminMetricChip,
  SuperadminPageHeader,
  SuperadminSectionCard,
} from '@/components/superadmin/superadmin-page-primitives';
import { formatAdminCurrency, formatAdminNumber } from '@/components/superadmin/superadmin-utils';
import { BILLING_PLAN_DETAILS, getBillingTrialDays } from '@/lib/billing/plans';
import { PLAN_LIMITS } from '@/lib/server/multi-tenant';

const PLAN_ORDER = ['FREE', 'PRO', 'PREMIUM'] as const;

const PLAN_VISUALS = {
  FREE: {
    icon: Wallet,
    title: 'Free',
    tone: 'border-white/10 bg-slate-900/70',
    accent: 'text-slate-200',
  },
  PRO: {
    icon: Layers3,
    title: 'Pro',
    tone: 'border-emerald-400/20 bg-emerald-500/10',
    accent: 'text-emerald-100',
  },
  PREMIUM: {
    icon: Gem,
    title: 'Premium',
    tone: 'border-sky-400/20 bg-sky-500/10',
    accent: 'text-sky-100',
  },
} as const;

export function SuperadminPlansPage() {
  return (
    <div className="space-y-6">
      <SuperadminPageHeader
        eyebrow="Monetização"
        title="Planos e oferta comercial"
        description="Visualize a arquitetura atual de planos, posicionamento de preço, períodos de teste, limites e sinais de expansão. Esta área já fica pronta para receber edição administrativa no próximo passo."
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <SuperadminMetricChip label="Planos ativos" value="3 ofertas" tone="success" />
          <SuperadminMetricChip label="Trial atual" value={`${getBillingTrialDays('PRO')} dias no Pro`} tone="info" />
          <SuperadminMetricChip label="Catálogo" value="Estrutura pronta para edição" />
        </div>
      </SuperadminPageHeader>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <SuperadminSectionCard
          title="Catálogo atual"
          description="Resumo comercial das ofertas atuais do produto e como cada uma está posicionada hoje."
        >
          <div className="grid gap-4 lg:grid-cols-3">
            {PLAN_ORDER.map((planKey) => {
              const planVisual = PLAN_VISUALS[planKey];
              const planDetails = planKey === 'FREE' ? null : BILLING_PLAN_DETAILS[planKey];
              const limits = PLAN_LIMITS[planKey];
              const Icon = planVisual.icon;

              return (
                <article key={planKey} className={`rounded-[1.6rem] border p-5 ${planVisual.tone}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className={`text-lg font-semibold ${planVisual.accent}`}>{planVisual.title}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-300">
                        {planKey === 'FREE'
                          ? 'Entrada para organização inicial e experimentação do produto.'
                          : planDetails?.description}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-3">
                      <Icon className={`h-5 w-5 ${planVisual.accent}`} />
                    </div>
                  </div>

                  <div className="mt-5 space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Preço</p>
                    {planKey === 'FREE' ? (
                      <p className="text-3xl font-semibold text-white">Grátis</p>
                    ) : (
                      <>
                        <p className="text-3xl font-semibold text-white">
                          {formatAdminCurrency(planDetails?.monthlyPrice || 0)}
                          <span className="text-base font-medium text-slate-400"> / mês</span>
                        </p>
                        <p className="text-sm text-slate-400">
                          {formatAdminCurrency(planDetails?.annualPrice || 0)} no anual
                        </p>
                      </>
                    )}
                  </div>

                  <div className="mt-5 space-y-3 text-sm text-slate-300">
                    <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Trial</p>
                      <p className="mt-2 font-semibold text-white">
                        {planKey === 'FREE'
                          ? 'Sem trial'
                          : getBillingTrialDays(planKey) > 0
                            ? `${getBillingTrialDays(planKey)} dias`
                            : 'Sem trial'}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Limites-chave</p>
                      <p className="mt-2">
                        {typeof limits.transactionsPerMonth === 'number'
                          ? `${formatAdminNumber(limits.transactionsPerMonth)} transações/mês`
                          : 'Transações ilimitadas'}
                      </p>
                      <p className="mt-1">
                        {typeof limits.aiInteractionsPerMonth === 'number'
                          ? `${formatAdminNumber(limits.aiInteractionsPerMonth)} interações com IA/mês`
                          : 'IA ilimitada'}
                      </p>
                      <p className="mt-1">Relatórios {limits.reports === 'full' ? 'completos' : 'básicos'}</p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </SuperadminSectionCard>

        <SuperadminSectionCard
          title="Direção da oferta"
          description="Leitura rápida do que já está claro na arquitetura atual e do que vale entrar na próxima fase."
        >
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-3">
                  <Sparkles className="h-5 w-5 text-emerald-200" />
                </div>
                <div>
                  <p className="font-semibold text-white">Estrutura comercial bem definida</p>
                  <p className="mt-2 text-sm leading-7 text-slate-400">
                    O catálogo já diferencia entrada, recorrência principal e valor premium. O próximo passo natural é
                    permitir edição operacional sem depender de código.
                  </p>
                </div>
              </div>
            </div>

            <SuperadminInfoList
              columns={1}
              items={[
                { label: 'Próximo módulo útil', value: 'Editor administrativo de preço, benefício e trial' },
                { label: 'Gap atual', value: 'Planos ainda estão configurados em código e variáveis de ambiente' },
                { label: 'Próxima integração natural', value: 'Conectar com billing, subscriptions e feature flags' },
              ]}
            />
          </div>
        </SuperadminSectionCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <SuperadminSectionCard
          title="Comparação de proposta de valor"
          description="Visão curta dos principais argumentos de venda e percepção esperada por plano."
        >
          <div className="space-y-3">
            {PLAN_ORDER.map((planKey) => {
              const label = PLAN_VISUALS[planKey].title;
              const items =
                planKey === 'FREE'
                  ? [
                      'Organização inicial do usuário',
                      'Entrada sem risco para experimentar o produto',
                      'Boa camada de ativação e educação',
                    ]
                  : BILLING_PLAN_DETAILS[planKey].features.slice(0, 4);

              return (
                <div key={planKey} className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                  <p className="text-sm font-semibold text-white">{label}</p>
                  <ul className="mt-3 space-y-2 text-sm text-slate-300">
                    {items.map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <BadgeCheck className="mt-0.5 h-4 w-4 text-emerald-300" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </SuperadminSectionCard>

        <SuperadminSectionCard
          title="Arquitetura pronta para crescer"
          description="A página já fica preparada para a próxima etapa de superadmin funcional."
        >
          <div className="grid gap-3">
            {[
              {
                icon: CircleDollarSign,
                title: 'Ações futuras de pricing',
                text: 'Editar preço mensal/anual, trials e posicionamento comercial direto pelo painel.',
              },
              {
                icon: Layers3,
                title: 'Pacotes e benefícios',
                text: 'Controlar listas de benefícios, badges e diferenciais por plano sem hardcode.',
              },
              {
                icon: Gem,
                title: 'Expansão enterprise',
                text: 'Abrir espaço para novos tiers, ofertas limitadas e feature flags comerciais.',
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                      <Icon className="h-5 w-5 text-sky-200" />
                    </div>
                    <div>
                      <p className="font-semibold text-white">{item.title}</p>
                      <p className="mt-2 text-sm leading-7 text-slate-400">{item.text}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </SuperadminSectionCard>
      </div>
    </div>
  );
}
