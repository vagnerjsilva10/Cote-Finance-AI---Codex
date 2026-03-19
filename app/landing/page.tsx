'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Space_Grotesk } from 'next/font/google';
import { motion } from 'motion/react';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  BrainCircuit,
  Check,
  EyeOff,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Target,
  Wallet,
} from 'lucide-react';
import { cn } from '@/lib/utils';
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

type Plan = {
  name: 'Free' | 'Pro' | 'Premium';
  badge: string;
  price: string;
  description: string;
  ctaLabel: string;
  href: string;
  features: string[];
  highlight?: boolean;
};

type FlowStep = {
  step: string;
  title: string;
  description: string;
  variant: 'connect' | 'analyze' | 'improve';
};

const planCopy = {
  FREE: {
    name: 'Free' as const,
    badge: 'Começo rápido',
    description: 'Para começar a organizar sua vida financeira.',
    ctaLabel: 'Começar grátis',
    href: '/signup?plan=free',
    features: ['Até 10 lançamentos por mês', 'Dashboard essencial', 'Organização inicial de gastos'],
  },
  PRO: {
    name: 'Pro' as const,
    badge: 'Mais escolhido',
    description: 'Para quem quer controle real e decisões inteligentes.',
    ctaLabel: 'Começar grátis agora',
    href: '/signup?plan=pro&trial=true',
    features: ['Lançamentos ilimitados', 'Insights automáticos com IA', 'Alertas e resumos no WhatsApp'],
    highlight: true,
  },
  PREMIUM: {
    name: 'Premium' as const,
    badge: 'Máxima análise',
    description: 'Para quem quer máximo nível de análise e evolução.',
    ctaLabel: 'Assinar Premium',
    href: '/signup?plan=premium',
    features: ['Tudo do Pro', 'IA ilimitada', 'Previsões e automações avançadas'],
  },
};

const fallbackPlans: Plan[] = [
  {
    name: planCopy.FREE.name,
    badge: planCopy.FREE.badge,
    price: 'Grátis',
    description: planCopy.FREE.description,
    ctaLabel: planCopy.FREE.ctaLabel,
    href: planCopy.FREE.href,
    features: planCopy.FREE.features,
  },
  {
    name: planCopy.PRO.name,
    badge: planCopy.PRO.badge,
    price: 'R$29/mês',
    description: planCopy.PRO.description,
    ctaLabel: planCopy.PRO.ctaLabel,
    href: planCopy.PRO.href,
    features: planCopy.PRO.features,
    highlight: true,
  },
  {
    name: planCopy.PREMIUM.name,
    badge: planCopy.PREMIUM.badge,
    price: 'R$49/mês',
    description: planCopy.PREMIUM.description,
    ctaLabel: planCopy.PREMIUM.ctaLabel,
    href: planCopy.PREMIUM.href,
    features: planCopy.PREMIUM.features,
  },
];

const painPoints = [
  'Dinheiro “desaparece” no meio do mês',
  'Decisões no impulso por falta de visão',
  'Ansiedade constante por não saber o que ajustar',
];

const features = [
  {
    icon: Wallet,
    title: 'Visão completa',
    description: 'Veja tudo em um só lugar, sem confusão.',
  },
  {
    icon: BrainCircuit,
    title: 'IA que encontra padrões',
    description: 'Descubra desperdícios e oportunidades antes que virem problema.',
  },
  {
    icon: BarChart3,
    title: 'Controle de gastos inteligente',
    description: 'Saiba exatamente onde cortar sem adivinhar.',
  },
  {
    icon: Sparkles,
    title: 'Organização automática',
    description: 'Sem planilhas, sem trabalho manual.',
  },
  {
    icon: MessageCircle,
    title: 'Alertas no WhatsApp',
    description: 'Acompanhe seu mês sem depender só do dashboard.',
  },
  {
    icon: ShieldCheck,
    title: 'Segurança real',
    description: 'Dados protegidos com padrão bancário.',
  },
];

const flowSteps: FlowStep[] = [
  {
    step: '01',
    title: 'Conecte',
    description: 'Centralize seus dados em um único lugar.',
    variant: 'connect',
  },
  {
    step: '02',
    title: 'Entenda',
    description: 'A IA analisa padrões e mostra onde ajustar.',
    variant: 'analyze',
  },
  {
    step: '03',
    title: 'Melhore',
    description: 'Tome decisões com clareza e consistência.',
    variant: 'improve',
  },
];

const testimonials = [
  {
    quote: 'Em poucas semanas, eu entendi para onde meu dinheiro estava indo e recuperei controle.',
    author: 'João',
    role: 'São Paulo',
  },
  {
    quote: 'Antes era ansiedade no fim do mês. Hoje eu enxergo e decido com tranquilidade.',
    author: 'Mariana',
    role: 'Rio de Janeiro',
  },
  {
    quote: 'A parte mais forte foi ver desperdícios invisíveis de forma clara e prática.',
    author: 'Carlos',
    role: 'Belo Horizonte',
  },
];

const faqItems = [
  {
    question: 'Preciso saber finanças para usar?',
    answer: 'Não. A interface foi pensada para simplificar a leitura e a ação.',
  },
  {
    question: 'É seguro?',
    answer: 'Sim. Seus dados ficam protegidos com padrão de segurança de nível bancário.',
  },
  {
    question: 'Funciona mesmo?',
    answer: 'Sim. O foco é mostrar o que você não está enxergando hoje para melhorar decisões.',
  },
  {
    question: 'Posso cancelar quando quiser?',
    answer: 'Sim. Você pode cancelar o plano pago a qualquer momento na sua área de assinatura.',
  },
];

const partners = ['Stripe', 'OpenAI', 'Supabase', 'Vercel', 'Meta', 'Recharts'];

const reveal = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.45 },
} as const;

function mapPlan(plan: PublicPlanCatalogItem): Plan {
  if (plan.code === 'FREE') {
    return {
      name: planCopy.FREE.name,
      badge: planCopy.FREE.badge,
      price: 'Grátis',
      description: planCopy.FREE.description,
      ctaLabel: planCopy.FREE.ctaLabel,
      href: planCopy.FREE.href,
      features: plan.features.length > 0 ? plan.features.slice(0, 4) : planCopy.FREE.features,
    };
  }

  if (plan.code === 'PREMIUM') {
    return {
      name: planCopy.PREMIUM.name,
      badge: planCopy.PREMIUM.badge,
      price: `R$${plan.monthlyPrice}/mês`,
      description: planCopy.PREMIUM.description,
      ctaLabel: planCopy.PREMIUM.ctaLabel,
      href: planCopy.PREMIUM.href,
      features: plan.features.length > 0 ? plan.features.slice(0, 4) : planCopy.PREMIUM.features,
    };
  }

  return {
    name: planCopy.PRO.name,
    badge: planCopy.PRO.badge,
    price: `R$${plan.monthlyPrice}/mês`,
    description: planCopy.PRO.description,
    ctaLabel: plan.trialDays > 0 ? 'Começar grátis agora' : 'Assinar Pro',
    href: plan.trialDays > 0 ? '/signup?plan=pro&trial=true' : '/signup?plan=pro',
    features: plan.features.length > 0 ? plan.features.slice(0, 4) : planCopy.PRO.features,
    highlight: true,
  };
}

function FlowPanel({ variant }: { variant: FlowStep['variant'] }) {
  if (variant === 'connect') {
    return (
      <Card className="landing-glow-card p-5">
        <p className="label-premium mb-3">Contas conectadas</p>
        <div className="grid gap-2 sm:grid-cols-3">
          {['Nubank', 'Itaú', 'Carteira'].map((item) => (
            <div key={item} className="app-surface-subtle rounded-xl p-3 text-sm font-semibold text-[var(--text-primary)]">
              {item}
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-container)] p-3">
          <p className="text-xs text-[var(--text-muted)]">Sincronização de dados</p>
          <div className="mt-2 h-2 rounded-full bg-[var(--bg-surface-elevated)]">
            <motion.div
              className="h-full rounded-full bg-[var(--primary)]"
              initial={{ width: '30%' }}
              whileInView={{ width: '84%' }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.1 }}
            />
          </div>
        </div>
      </Card>
    );
  }

  if (variant === 'analyze') {
    return (
      <Card className="landing-glow-card p-5">
        <p className="label-premium mb-3">Análise da IA</p>
        <div className="space-y-3">
          {[
            { label: 'Gastos evitáveis', value: 'R$ 680' },
            { label: 'Categoria que mais subiu', value: 'Alimentação' },
            { label: 'Ajuste sugerido', value: '-12% em assinaturas' },
          ].map((item) => (
            <div key={item.label} className="app-surface-subtle rounded-xl p-3">
              <p className="text-xs text-[var(--text-secondary)]">{item.label}</p>
              <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{item.value}</p>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="landing-glow-card p-5">
      <p className="label-premium mb-3">Plano de ação</p>
      <div className="space-y-2">
        {[
          'Cortar despesas invisíveis da semana',
          'Ajustar limite por categoria',
          'Priorizar pagamento com maior impacto',
        ].map((item) => (
          <div key={item} className="flex items-start gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-container)] p-3">
            <Check size={14} className="mt-0.5 text-[var(--primary)]" />
            <p className="text-sm text-[var(--text-secondary)]">{item}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

export default function LandingPage() {
  const router = useRouter();
  const [plans, setPlans] = React.useState<Plan[]>(fallbackPlans);

  React.useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const response = await fetch('/api/public/plan-catalog', { cache: 'no-store' });
        const payload = (await response.json().catch(() => null)) as { plans?: PublicPlanCatalogItem[] } | null;
        if (!response.ok || !payload?.plans?.length || !active) return;
        setPlans(payload.plans.map(mapPlan));
      } catch {
        // mantém fallback local
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, []);

  const navItems = [
    { label: 'Produto', onClick: () => document.getElementById('produto')?.scrollIntoView({ behavior: 'smooth' }) },
    { label: 'Features', onClick: () => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' }) },
    { label: 'Planos', onClick: () => document.getElementById('planos')?.scrollIntoView({ behavior: 'smooth' }) },
    { label: 'FAQ', onClick: () => document.getElementById('faq')?.scrollIntoView({ behavior: 'smooth' }) },
  ];

  return (
    <div className={`landing-premium-shell theme-landing-shell marketing-dark-shell min-h-screen ${displayFont.variable}`}>
      <div className="landing-premium-backdrop pointer-events-none fixed inset-0 -z-10" />

      <Header
        logo={
          <Link href="/" className="flex items-center">
            <Image
              src="/brand/cote-finance-ai-logo.svg"
              alt="Cote Finance AI"
              width={620}
              height={160}
              priority
              className="h-16 w-auto lg:h-20"
            />
          </Link>
        }
        navItems={navItems}
        actions={
          <>
            <ButtonSecondary className="px-4 py-2 text-sm" onClick={() => router.push('/app?auth=login')}>
              Entrar
            </ButtonSecondary>
            <ButtonPrimary className="px-4 py-2 text-sm" onClick={() => router.push('/signup')}>
              Começar grátis
            </ButtonPrimary>
          </>
        }
      />

      <Container>
        <Section className="pt-16 lg:pt-22">
          <section id="produto" className="landing-hero-spotlight grid items-center gap-10 lg:grid-cols-[1.02fr_.98fr]">
            <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} className="space-y-6">
              <span className="badge-premium badge-premium-info px-4 py-2 text-xs">
                <Sparkles size={13} /> IA aplicada ao seu dinheiro
              </span>
              <h1 className="max-w-4xl text-4xl font-bold leading-[1.02] tracking-tight text-[var(--text-primary)] md:text-6xl">
                Seu dinheiro não some.
                <br />
                Você só não vê.
              </h1>
              <p className="max-w-2xl text-base leading-8 text-[var(--text-secondary)] md:text-lg">
                O Cote Finance AI organiza, analisa e mostra exatamente onde ajustar para você voltar ao controle.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <ButtonPrimary className="px-6 py-3 text-sm" onClick={() => router.push('/signup')}>
                  Começar grátis <ArrowRight size={16} />
                </ButtonPrimary>
                <ButtonSecondary className="px-6 py-3 text-sm" onClick={() => document.getElementById('como-funciona')?.scrollIntoView({ behavior: 'smooth' })}>
                  Ver como funciona
                </ButtonSecondary>
              </div>
              <p className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                <Check size={14} className="text-[var(--primary)]" /> Mais de 12.000 pessoas já usam para organizar melhor as finanças
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.08 }}
              className="relative landing-float"
            >
              <Card className="landing-mockup-shell landing-glow-card relative overflow-hidden p-6 md:p-7">
                <div className="mb-5 flex items-center justify-between">
                  <p className="label-premium">Dashboard ao vivo</p>
                  <span className="badge-premium badge-premium-info px-3 py-1 text-[10px]">tempo real</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    { label: 'Entradas', value: 'R$ 9.120' },
                    { label: 'Despesas', value: 'R$ 5.940' },
                    { label: 'Potencial', value: 'R$ 1.180' },
                  ].map((item) => (
                    <div key={item.label} className="app-surface-subtle rounded-xl p-4">
                      <p className="text-xs text-[var(--text-secondary)]">{item.label}</p>
                      <p className="mt-1.5 text-sm font-semibold text-[var(--text-primary)]">{item.value}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-container)] p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">Padrão de gastos</p>
                  <svg viewBox="0 0 320 110" className="mt-3 h-28 w-full">
                    <path d="M0,86 C24,80 52,67 84,50 C112,36 138,38 166,48 C194,58 220,71 248,66 C278,61 299,42 320,24" fill="none" stroke="var(--primary)" strokeWidth="3.2" />
                    <path d="M0,100 C24,99 52,96 80,92 C110,88 137,89 166,86 C196,83 221,76 250,79 C278,82 300,89 320,92" fill="none" stroke="var(--accent-indigo)" strokeWidth="2.2" strokeOpacity="0.58" />
                  </svg>
                </div>
              </Card>
            </motion.div>
          </section>

          <motion.section {...reveal} className="mt-12 space-y-5">
            <p className="label-premium text-center">Usado por pessoas e times que tratam finanças com seriedade</p>
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {partners.map((partner) => (
                <Card key={partner} className="landing-glow-card p-4 text-center">
                  <span className="text-sm font-semibold text-[var(--text-secondary)]">{partner}</span>
                </Card>
              ))}
            </div>
          </motion.section>
        </Section>

        <Section>
          <motion.section {...reveal} className="grid gap-6 lg:grid-cols-[1.05fr_.95fr]">
            <Card className="landing-glow-card p-6 md:p-8">
              <p className="label-premium mb-3">A dor</p>
              <h2 className="text-3xl font-bold text-[var(--text-primary)] md:text-4xl">
                Se o dinheiro “some”, o problema é falta de visão.
              </h2>
              <p className="mt-4 text-base leading-8 text-[var(--text-secondary)]">
                Você recebe, paga algumas contas e no fim do mês sobra incerteza.
              </p>
              <p className="mt-4 text-base leading-8 text-[var(--text-secondary)]">
                Sem clareza, você perde margem e decide no escuro.
              </p>
            </Card>
            <div className="space-y-3">
              {painPoints.map((point) => (
                <Card key={point} className="landing-glow-card p-5">
                  <p className="flex items-start gap-3 text-sm leading-7 text-[var(--text-primary)]">
                    <AlertTriangle size={16} className="mt-1 text-[var(--danger)]" />
                    {point}
                  </p>
                </Card>
              ))}
            </div>
          </motion.section>
        </Section>

        <Section>
          <div id="features" />
          <motion.section {...reveal} className="space-y-5">
            <div className="space-y-3 text-center">
              <p className="label-premium">Features</p>
              <h2 className="mx-auto max-w-4xl text-3xl font-bold text-[var(--text-primary)] md:text-4xl">
                Clareza, controle e ação em uma interface viva
              </h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {features.map((feature) => (
                <Card key={feature.title} className="landing-glow-card p-6">
                  <div className="inline-flex rounded-xl border border-[var(--border-default)] bg-[var(--primary-soft)] p-2.5 text-[var(--text-primary)]">
                    <feature.icon size={18} />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-[var(--text-primary)]">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">{feature.description}</p>
                </Card>
              ))}
            </div>
          </motion.section>
        </Section>

        <Section>
          <div id="como-funciona" />
          <motion.div {...reveal} className="space-y-8">
            <div className="space-y-3 text-center">
              <p className="label-premium">Fluxo</p>
              <h2 className="mx-auto max-w-4xl text-3xl font-bold text-[var(--text-primary)] md:text-4xl">Conecta. Entende. Melhora.</h2>
            </div>
            {flowSteps.map((step, index) => (
              <section key={step.step} className="grid items-center gap-8 lg:grid-cols-2">
                <div className={cn(index % 2 ? 'lg:order-2' : '')}>
                  <Card className="landing-glow-card p-6 md:p-8">
                    <span className="badge-premium px-3 py-1 text-[10px]">Passo {step.step}</span>
                    <h3 className="mt-3 text-3xl font-bold text-[var(--text-primary)] md:text-4xl">{step.title}</h3>
                    <p className="mt-4 text-base leading-8 text-[var(--text-secondary)]">{step.description}</p>
                  </Card>
                </div>
                <div className={cn(index % 2 ? 'lg:order-1' : '')}>
                  <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.2 }}>
                    <FlowPanel variant={step.variant} />
                  </motion.div>
                </div>
              </section>
            ))}
          </motion.div>
        </Section>

        <Section>
          <motion.section {...reveal}>
            <Card className="landing-glow-card p-6 md:p-8">
              <div className="mb-5 space-y-2">
                <p className="label-premium">Prova social</p>
                <h2 className="text-3xl font-bold text-[var(--text-primary)] md:text-4xl">Resultados reais para quem decidiu enxergar melhor</h2>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                {[
                  { label: 'Usuários ativos', value: '+12.000' },
                  { label: 'Valor analisado', value: 'R$ 320 milhões' },
                  { label: 'Relatam mais controle', value: '94%' },
                ].map((metric) => (
                  <div key={metric.label} className="app-surface-subtle rounded-xl p-5">
                    <p className="label-premium">{metric.label}</p>
                    <p className="mt-3 text-3xl font-bold text-[var(--text-primary)]">{metric.value}</p>
                  </div>
                ))}
              </div>
            </Card>
          </motion.section>
        </Section>

        <Section>
          <motion.section {...reveal} className="space-y-3 text-center">
            <p className="label-premium">Depoimentos</p>
            <h2 className="text-3xl font-bold text-[var(--text-primary)] md:text-4xl">Quem usa sente a diferença no mês</h2>
          </motion.section>
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            {testimonials.map((item) => (
              <Card key={item.author} className="landing-glow-card p-6">
                <p className="text-base leading-7 text-[var(--text-primary)]">&ldquo;{item.quote}&rdquo;</p>
                <div className="mt-5 border-t border-[var(--border-default)] pt-4">
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{item.author}</p>
                  <p className="text-xs text-[var(--text-secondary)]">{item.role}</p>
                </div>
              </Card>
            ))}
          </div>
        </Section>

        <Section>
          <div id="planos" />
          <motion.section {...reveal} className="space-y-3 text-center">
            <p className="label-premium">Pricing</p>
            <h2 className="mx-auto max-w-4xl text-3xl font-bold text-[var(--text-primary)] md:text-4xl">Escolha seu nível de controle</h2>
          </motion.section>
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            {plans.map((plan) => (
              <Card
                key={plan.name}
                className={cn(
                  'landing-glow-card p-6',
                  plan.highlight && 'border-[color:var(--border-strong)] bg-[color:var(--primary-soft)]'
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-2xl font-bold text-[var(--text-primary)]">{plan.name}</p>
                  <span className={plan.highlight ? 'badge-premium badge-premium-info px-3 py-1 text-[10px]' : 'badge-premium px-3 py-1 text-[10px]'}>
                    {plan.badge}
                  </span>
                </div>
                <p className="mt-3 text-3xl font-bold text-[var(--text-primary)]">{plan.price}</p>
                <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">{plan.description}</p>
                <ul className="mt-5 space-y-2">
                  {plan.features.map((feature) => (
                    <li key={`${plan.name}-${feature}`} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                      <Check size={14} className="mt-0.5 text-[var(--primary)]" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  href={plan.href}
                  className={cn(
                    plan.highlight
                      ? 'button-primary mt-6 w-full px-4 py-3 text-sm font-semibold'
                      : 'button-secondary mt-6 w-full px-4 py-3 text-sm font-semibold'
                  )}
                >
                  {plan.ctaLabel}
                </Link>
              </Card>
            ))}
          </div>
        </Section>

        <Section>
          <div id="faq" />
          <motion.section {...reveal} className="space-y-3 text-center">
            <p className="label-premium">FAQ</p>
            <h2 className="text-3xl font-bold text-[var(--text-primary)] md:text-4xl">Dúvidas antes de começar</h2>
          </motion.section>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {faqItems.map((item) => (
              <details key={item.question} className="ds-card landing-glow-card p-5">
                <summary className="cursor-pointer list-none text-sm font-semibold text-[var(--text-primary)]">{item.question}</summary>
                <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">{item.answer}</p>
              </details>
            ))}
          </div>
        </Section>

        <Section className="pt-4">
          <motion.div {...reveal}>
            <Card className="landing-glow-card p-8 text-center md:p-10">
              <h2 className="mx-auto max-w-3xl text-3xl font-bold text-[var(--text-primary)] md:text-5xl">
                Você não precisa ganhar mais.
                <br />
                Precisa enxergar melhor.
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-[var(--text-secondary)]">
                Comece grátis hoje e veja para onde seu dinheiro realmente está indo.
              </p>
              <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
                <ButtonPrimary className="px-6 py-3 text-sm" onClick={() => router.push('/signup')}>
                  Começar grátis <ArrowRight size={16} />
                </ButtonPrimary>
                <ButtonSecondary className="px-6 py-3 text-sm" onClick={() => router.push('/app?auth=login')}>
                  Entrar no app
                </ButtonSecondary>
              </div>
            </Card>
          </motion.div>
        </Section>
      </Container>

      <footer className="border-t border-[var(--border-default)] py-8">
        <Container className="flex flex-col items-center justify-between gap-3 text-center text-xs text-[var(--text-muted)] sm:flex-row sm:text-left">
          <p>© {new Date().getFullYear()} Cote Finance AI. Todos os direitos reservados.</p>
          <div className="flex items-center gap-4">
            <Link href="/blog" className="hover:text-[var(--text-secondary)]">
              Blog
            </Link>
            <Link href="/central-de-ajuda" className="hover:text-[var(--text-secondary)]">
              Ajuda
            </Link>
            <Link href="/termos-de-uso" className="hover:text-[var(--text-secondary)]">
              Termos
            </Link>
            <Link href="/politica-de-privacidade" className="hover:text-[var(--text-secondary)]">
              Privacidade
            </Link>
          </div>
        </Container>
      </footer>
    </div>
  );
}
