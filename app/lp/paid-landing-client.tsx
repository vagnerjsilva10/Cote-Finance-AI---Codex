'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Space_Grotesk } from 'next/font/google';
import { ArrowRight, Check, ShieldCheck, Sparkles } from 'lucide-react';
import { ButtonPrimary, ButtonSecondary, Card, Container, Header, Section } from '@/components/ui/premium-primitives';

const displayFont = Space_Grotesk({ subsets: ['latin'], weight: ['600', '700'], variable: '--font-display' });

type PublicPlanCatalogItem = {
  code: 'FREE' | 'PRO' | 'PREMIUM';
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  trialDays: number;
  description: string;
  features: string[];
  trustBadges: string[];
  default: boolean;
};

type PaidPlan = {
  name: string;
  price: string;
  href: string;
  cta: string;
  features: string[];
  highlight?: boolean;
};

const fallbackPlans: PaidPlan[] = [
  {
    name: 'Free',
    price: 'R$0/mês',
    href: '/signup?plan=free',
    cta: 'Criar conta grátis',
    features: ['Dashboard essencial', 'Controle inicial de gastos', 'Até 10 lançamentos por mês'],
  },
  {
    name: 'Pro',
    price: 'R$29/mês',
    href: '/signup?plan=pro&trial=true',
    cta: 'Testar Pro grátis',
    highlight: true,
    features: ['Lançamentos ilimitados', 'IA aplicada em decisões', 'Alertas e resumos no WhatsApp'],
  },
  {
    name: 'Premium',
    price: 'R$49/mês',
    href: '/signup?plan=premium',
    cta: 'Assinar Premium',
    features: ['Tudo do Pro', 'IA ilimitada', 'Previsões e automações avançadas'],
  },
];

function mapPlan(plan: PublicPlanCatalogItem): PaidPlan {
  if (plan.code === 'FREE') {
    return {
      name: 'Free',
      price: `R$${plan.monthlyPrice}/mês`,
      href: '/signup?plan=free',
      cta: 'Criar conta grátis',
      features: plan.features,
    };
  }

  if (plan.code === 'PREMIUM') {
    return {
      name: 'Premium',
      price: `R$${plan.monthlyPrice}/mês`,
      href: '/signup?plan=premium',
      cta: 'Assinar Premium',
      features: plan.features,
    };
  }

  return {
    name: 'Pro',
    price: `R$${plan.monthlyPrice}/mês`,
    href: plan.trialDays > 0 ? '/signup?plan=pro&trial=true' : '/signup?plan=pro',
    cta: plan.trialDays > 0 ? 'Testar Pro grátis' : 'Assinar Pro',
    features: plan.features,
    highlight: true,
  };
}

export default function PaidLandingClient() {
  const [plans, setPlans] = React.useState<PaidPlan[]>(fallbackPlans);

  React.useEffect(() => {
    let active = true;
    const run = async () => {
      try {
        const response = await fetch('/api/public/plan-catalog', { cache: 'no-store' });
        const payload = (await response.json().catch(() => null)) as { plans?: PublicPlanCatalogItem[] } | null;
        if (!response.ok || !payload?.plans?.length || !active) return;
        setPlans(payload.plans.map(mapPlan));
      } catch {
        // fallback local
      }
    };
    void run();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className={`marketing-dark-shell min-h-screen ${displayFont.variable}`}>
      <div className="marketing-dark-backdrop pointer-events-none fixed inset-0 -z-10" />

      <Header
        logo={
          <Link href="/lp" className="flex items-center">
            <Image src="/brand/cote-finance-ai-logo.svg" alt="Cote Finance AI" width={620} height={160} priority className="h-16 w-auto lg:h-20" />
          </Link>
        }
        navItems={[]}
        actions={
          <>
            <Link href="/app?auth=login" className="button-secondary px-4 py-2 text-sm">
              Entrar
            </Link>
            <Link href="/signup" className="button-primary px-4 py-2 text-sm">
              Criar conta grátis
            </Link>
          </>
        }
      />

      <Container>
        <Section className="pt-16 lg:pt-20">
          <section className="grid items-center gap-10 lg:grid-cols-[1.04fr_.96fr]">
            <div className="space-y-6">
              <span className="badge-premium badge-premium-info px-4 py-2 text-xs">
                <Sparkles size={13} /> Diagnóstico financeiro em segundos
              </span>
              <h1 className="text-4xl font-bold leading-[1.03] text-[var(--text-primary)] md:text-6xl">
                Descubra para onde seu dinheiro está indo e ajuste rápido.
              </h1>
              <p className="max-w-2xl text-base leading-8 text-[var(--text-secondary)] md:text-lg">
                O Cote Finance AI cruza seus dados de gastos e mostra ações objetivas para recuperar previsibilidade no mês.
              </p>
              <div className="space-y-2 text-sm text-[var(--text-secondary)]">
                {[
                  'Controle financeiro sem planilha improvisada',
                  'Insights automáticos para decisões melhores',
                  'Resumo operacional no dashboard e no WhatsApp',
                ].map((item) => (
                  <p key={item} className="flex items-center gap-2">
                    <Check size={14} className="text-[var(--primary)]" />
                    {item}
                  </p>
                ))}
              </div>
              <div className="flex flex-wrap gap-3">
                <ButtonPrimary className="px-6 py-3 text-sm" onClick={() => (window.location.href = '/signup')}>
                  Começar grátis <ArrowRight size={16} />
                </ButtonPrimary>
                <ButtonSecondary className="px-6 py-3 text-sm" onClick={() => (window.location.href = '/quiz')}>
                  Fazer diagnóstico
                </ButtonSecondary>
              </div>
            </div>

            <Card className="p-6 md:p-7">
              <div className="mb-5 grid gap-3 sm:grid-cols-3">
                {[
                  { title: 'Despesas invisíveis', value: 'R$ 870/mês' },
                  { title: 'Potencial de ajuste', value: '19%' },
                  { title: 'Economia anual', value: 'R$ 10.440' },
                ].map((item) => (
                  <div key={item.title} className="app-surface-subtle rounded-xl p-4">
                    <p className="text-xs text-[var(--text-muted)]">{item.title}</p>
                    <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">{item.value}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-container)] p-4">
                <p className="label-premium">Simulação de comportamento</p>
                <svg viewBox="0 0 320 110" className="mt-3 h-28 w-full">
                  <path d="M0,88 C26,82 54,68 84,54 C110,42 132,42 162,50 C188,57 212,72 242,68 C270,65 296,44 320,28" fill="none" stroke="var(--primary)" strokeWidth="3.5" />
                  <path d="M0,102 C22,102 48,98 80,95 C108,92 136,92 166,90 C196,88 224,82 252,84 C282,86 303,90 320,92" fill="none" stroke="var(--secondary-highlight)" strokeWidth="2.4" strokeOpacity="0.55" />
                </svg>
              </div>
            </Card>
          </section>
        </Section>

        <Section>
          <div id="planos" />
          <div className="space-y-3 text-center">
            <p className="label-premium">Planos</p>
            <h2 className="text-3xl font-bold text-[var(--text-primary)] md:text-4xl">Escolha o plano para o seu momento.</h2>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {plans.map((plan) => (
              <Card key={plan.name} className={plan.highlight ? 'border-[color:var(--border-strong)] bg-[color:var(--primary-soft)] p-6' : 'p-6'}>
                <h3 className="text-2xl font-bold text-[var(--text-primary)]">{plan.name}</h3>
                <p className="mt-2 text-3xl font-bold text-[var(--text-primary)]">{plan.price}</p>
                <ul className="mt-5 space-y-2">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                      <Check size={14} className="mt-0.5 text-[var(--primary)]" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link href={plan.href} className={plan.highlight ? 'button-primary mt-6 w-full px-4 py-3 text-sm font-semibold' : 'button-secondary mt-6 w-full px-4 py-3 text-sm font-semibold'}>
                  {plan.cta}
                </Link>
              </Card>
            ))}
          </div>
        </Section>

        <Section className="pt-2">
          <Card className="p-8 text-center md:p-10">
            <h2 className="mx-auto max-w-3xl text-3xl font-bold text-[var(--text-primary)] md:text-5xl">
              Comece hoje e crie previsibilidade no seu financeiro.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-[var(--text-secondary)]">
              Menos ruído, mais decisões práticas com um produto visualmente consistente.
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <Link href="/signup" className="button-primary px-6 py-3 text-sm font-semibold">
                Criar conta grátis
              </Link>
              <Link href="/app?auth=login" className="button-secondary px-6 py-3 text-sm font-semibold">
                Entrar no app
              </Link>
            </div>
            <p className="mt-4 inline-flex items-center gap-2 text-sm text-[var(--text-secondary)]">
              <ShieldCheck size={14} className="text-[var(--primary)]" /> Segurança e dados protegidos
            </p>
          </Card>
        </Section>
      </Container>
    </div>
  );
}
