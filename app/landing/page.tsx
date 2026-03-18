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

const planCopy = {
  FREE: {
    name: 'Free' as const,
    badge: 'Para começar',
    description: 'Para começar a organizar sua vida financeira.',
    ctaLabel: 'Começar grátis',
    href: '/signup?plan=free',
    features: ['Dashboard essencial', 'Controle inicial de gastos', 'Até 10 lançamentos por mês'],
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
  'Toma decisões no escuro',
  'Perde dinheiro sem perceber',
  'Vive com sensação constante de descontrole',
];

const solutionPillars = [
  {
    icon: Wallet,
    title: 'Organização automática',
    description: 'Centralize entradas, despesas, metas e dívidas sem planilhas manuais.',
  },
  {
    icon: BrainCircuit,
    title: 'Insights com IA',
    description: 'Identifique padrões invisíveis e receba recomendações práticas para agir rápido.',
  },
  {
    icon: Target,
    title: 'Clareza total',
    description: 'Veja exatamente onde ajustar para recuperar controle e previsibilidade.',
  },
];

const featureCards = [
  {
    icon: BarChart3,
    title: 'Visão completa das suas finanças',
    description: 'Veja tudo em um só lugar, sem confusão.',
  },
  {
    icon: Sparkles,
    title: 'Insights automáticos com IA',
    description: 'Descubra padrões que você nunca perceberia sozinho.',
  },
  {
    icon: EyeOff,
    title: 'Controle de gastos inteligente',
    description: 'Saiba exatamente onde cortar sem adivinhar.',
  },
  {
    icon: Wallet,
    title: 'Organização automática',
    description: 'Sem planilhas, sem trabalho manual.',
  },
  {
    icon: MessageCircle,
    title: 'Alertas e acompanhamento',
    description: 'Não perca o controle ao longo do mês.',
  },
  {
    icon: ShieldCheck,
    title: 'Decisões com confiança',
    description: 'Pare de agir no escuro com dados claros e consistentes.',
  },
];

const flowSteps = [
  {
    step: '01',
    title: 'Conecte suas informações',
    description: 'Centralize seus dados em um só lugar para ter uma base única de decisão.',
    visual: '/landing/clarity-visual.svg',
  },
  {
    step: '02',
    title: 'A IA entende tudo automaticamente',
    description: 'O sistema identifica padrões, excessos e oportunidades sem esforço manual.',
    visual: '/landing/problem-visual.svg',
  },
  {
    step: '03',
    title: 'Melhore com decisões mais inteligentes',
    description: 'Receba clareza para agir com segurança, sem achismo e sem ansiedade.',
    visual: '/landing/solution-visual.svg',
  },
];

const testimonials = [
  {
    quote: 'Finalmente entendi para onde meu dinheiro estava indo. Em três semanas eu cortei gastos que nem via.',
    author: 'João',
    role: 'São Paulo',
  },
  {
    quote: 'Hoje consigo planejar sem ansiedade. Antes eu só descobria o problema no fim do mês.',
    author: 'Mariana',
    role: 'Rio de Janeiro',
  },
  {
    quote: 'Não imaginava o quanto eu desperdiçava até ver os dados organizados de forma tão clara.',
    author: 'Carlos',
    role: 'Belo Horizonte',
  },
];

const faqItems = [
  {
    question: 'Preciso entender de finanças para usar?',
    answer: 'Não. O sistema foi feito para simplificar. Você vê o que importa sem linguagem técnica.',
  },
  {
    question: 'É seguro?',
    answer: 'Sim. Seus dados são protegidos com padrão bancário e arquitetura moderna de segurança.',
  },
  {
    question: 'Funciona mesmo?',
    answer: 'Sim. A proposta é mostrar exatamente o que você não está enxergando hoje para agir melhor.',
  },
  {
    question: 'Posso cancelar quando quiser?',
    answer: 'Sim. Os planos pagos podem ser cancelados a qualquer momento na área de assinatura.',
  },
];

const partners = ['Meta', 'Stripe', 'Supabase', 'OpenAI', 'Vercel', 'Recharts'];

const reveal = {
  initial: { opacity: 0, y: 22 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.42 },
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
        // fallback local permanece
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, []);

  const navItems = [
    { label: 'Como funciona', onClick: () => document.getElementById('como-funciona')?.scrollIntoView({ behavior: 'smooth' }) },
    { label: 'Planos', onClick: () => document.getElementById('planos')?.scrollIntoView({ behavior: 'smooth' }) },
    { label: 'FAQ', onClick: () => document.getElementById('faq')?.scrollIntoView({ behavior: 'smooth' }) },
    { label: 'Blog', href: '/blog' },
  ];

  return (
    <div className={`theme-landing-shell marketing-dark-shell min-h-screen ${displayFont.variable}`}>
      <div className="theme-landing-backdrop marketing-dark-backdrop pointer-events-none fixed inset-0 -z-10" />

      <Header
        logo={
          <Link href="/" className="flex items-center">
            <Image src="/brand/cote-finance-ai-logo.svg" alt="Cote Finance AI" width={620} height={160} priority className="h-16 w-auto lg:h-20" />
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
          <section id="produto" className="grid items-center gap-10 lg:grid-cols-[1.04fr_.96fr]">
            <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.42 }} className="space-y-6">
              <span className="badge-premium badge-premium-info px-4 py-2 text-xs">
                <Sparkles size={13} /> Clareza financeira com IA
              </span>
              <h1 className="max-w-5xl text-4xl font-bold leading-[1.02] tracking-tight text-[var(--text-primary)] md:text-6xl">
                Seu dinheiro não some.
                <br />
                Você só não está vendo para onde ele vai.
              </h1>
              <p className="max-w-2xl text-base leading-8 text-[var(--text-secondary)] md:text-lg">
                O Cote Finance AI organiza sua vida financeira automaticamente e mostra, com clareza, exatamente onde você está
                perdendo dinheiro e como corrigir.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <ButtonPrimary className="px-6 py-3 text-sm" onClick={() => router.push('/signup')}>
                  Começar grátis <ArrowRight size={16} />
                </ButtonPrimary>
                <ButtonSecondary
                  className="px-6 py-3 text-sm"
                  onClick={() => document.getElementById('como-funciona')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  Ver como funciona
                </ButtonSecondary>
              </div>
              <p className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                <Check size={14} className="text-[var(--primary)]" /> Mais de 12.000 pessoas já estão organizando melhor suas finanças
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.08 }}
              className="relative"
            >
              <div className="pointer-events-none absolute -inset-4 rounded-[26px] bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.16)_0%,rgba(59,130,246,0)_65%)] blur-xl" />
              <Card className="relative overflow-hidden p-6 md:p-7">
                <div className="mb-5 flex items-center justify-between">
                  <p className="label-premium">Visão do mês</p>
                  <span className="badge-premium badge-premium-info px-3 py-1 text-[10px]">controle ativo</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    { label: 'Entradas', value: 'R$ 8.420' },
                    { label: 'Despesas', value: 'R$ 5.190' },
                    { label: 'Ajustável', value: 'R$ 1.120' },
                  ].map((item) => (
                    <motion.div key={item.label} whileHover={{ y: -1 }} transition={{ duration: 0.18 }} className="app-surface-subtle rounded-xl p-4">
                      <p className="text-xs text-[var(--text-secondary)]">{item.label}</p>
                      <p className="mt-1.5 text-sm font-semibold text-[var(--text-primary)]">{item.value}</p>
                    </motion.div>
                  ))}
                </div>
                <div className="mt-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-container)] p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">Comportamento financeiro</p>
                  <svg viewBox="0 0 320 110" className="mt-3 h-28 w-full">
                    <path
                      d="M0,88 C26,83 52,70 84,52 C110,38 136,40 162,48 C188,56 210,71 244,66 C272,62 296,44 320,22"
                      fill="none"
                      stroke="var(--primary)"
                      strokeWidth="3.2"
                    />
                    <path
                      d="M0,100 C26,99 52,96 80,92 C110,88 136,89 162,86 C190,83 216,77 244,80 C274,83 297,90 320,92"
                      fill="none"
                      stroke="var(--secondary-highlight)"
                      strokeWidth="2.2"
                      strokeOpacity="0.58"
                    />
                  </svg>
                </div>
              </Card>
            </motion.div>
          </section>
        </Section>

        <Section>
          <motion.section {...reveal} className="grid gap-6 lg:grid-cols-[1.05fr_.95fr]">
            <Card className="p-6 md:p-8">
              <p className="label-premium mb-3">Dor real</p>
              <h2 className="text-3xl font-bold text-[var(--text-primary)] md:text-4xl">
                Se você sente que o dinheiro desaparece, você não está sozinho.
              </h2>
              <p className="mt-4 text-base leading-8 text-[var(--text-secondary)]">
                Você recebe. Você paga algumas coisas. E no final do mês não sabe para onde foi o resto.
              </p>
              <p className="mt-4 text-base leading-8 text-[var(--text-secondary)]">
                O problema não é quanto você ganha. É não enxergar o que está acontecendo.
              </p>
            </Card>
            <div className="space-y-3">
              {painPoints.map((point) => (
                <Card key={point} className="p-5">
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
          <motion.section {...reveal} className="space-y-6">
            <div className="space-y-3 text-center">
              <p className="label-premium">Solução</p>
              <h2 className="mx-auto max-w-4xl text-3xl font-bold text-[var(--text-primary)] md:text-4xl">
                Clareza financeira muda tudo.
              </h2>
              <p className="mx-auto max-w-3xl text-base leading-8 text-[var(--text-secondary)]">
                O Cote Finance AI transforma confusão em controle, sem planilhas e sem complicação.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {solutionPillars.map((pillar) => (
                <Card key={pillar.title} className="p-6">
                  <div className="inline-flex rounded-xl border border-[var(--border-default)] bg-[var(--primary-soft)] p-2.5 text-[var(--text-primary)]">
                    <pillar.icon size={18} />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-[var(--text-primary)]">{pillar.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">{pillar.description}</p>
                </Card>
              ))}
            </div>
          </motion.section>
        </Section>

        <Section>
          <motion.section {...reveal} className="space-y-4">
            <div className="space-y-3 text-center">
              <p className="label-premium">Benefícios</p>
              <h2 className="mx-auto max-w-4xl text-3xl font-bold text-[var(--text-primary)] md:text-4xl">
                Tudo que você precisa para ter controle real do seu dinheiro
              </h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {featureCards.map((feature) => (
                <Card key={feature.title} className="p-6">
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
              <p className="label-premium">Como funciona</p>
              <h2 className="mx-auto max-w-4xl text-3xl font-bold text-[var(--text-primary)] md:text-4xl">Simples. Direto. Funciona.</h2>
            </div>
            {flowSteps.map((step, index) => (
              <section key={step.step} className="grid items-center gap-8 lg:grid-cols-2">
                <div className={cn(index % 2 ? 'lg:order-2' : '')}>
                  <Card className="p-6 md:p-8">
                    <span className="badge-premium px-3 py-1 text-[10px]">Passo {step.step}</span>
                    <h3 className="mt-3 text-3xl font-bold text-[var(--text-primary)] md:text-4xl">{step.title}</h3>
                    <p className="mt-4 text-base leading-8 text-[var(--text-secondary)]">{step.description}</p>
                  </Card>
                </div>
                <div className={cn(index % 2 ? 'lg:order-1' : '')}>
                  <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.2 }}>
                    <Card className="p-4 md:p-6">
                      <Image src={step.visual} alt={step.title} width={920} height={620} className="h-auto w-full" />
                    </Card>
                  </motion.div>
                </div>
              </section>
            ))}
          </motion.div>
        </Section>

        <Section>
          <motion.section {...reveal} className="space-y-6">
            <Card className="p-6 md:p-8">
              <div className="mb-5 space-y-2">
                <p className="label-premium">Autoridade</p>
                <h2 className="text-3xl font-bold text-[var(--text-primary)] md:text-4xl">Resultados reais para quem decidiu ter controle</h2>
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
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {partners.map((partner) => (
                <Card key={partner} className="p-4 text-center">
                  <span className="text-sm font-semibold text-[var(--text-secondary)]">{partner}</span>
                </Card>
              ))}
            </div>
          </motion.section>
        </Section>

        <Section>
          <motion.section {...reveal} className="space-y-4">
            <div className="space-y-3 text-center">
              <p className="label-premium">Transformação</p>
              <h2 className="mx-auto max-w-4xl text-3xl font-bold text-[var(--text-primary)] md:text-4xl">Antes e depois de ter clareza</h2>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="p-6">
                <p className="label-premium text-[var(--danger)]">Antes</p>
                <ul className="mt-4 space-y-2">
                  {['Dinheiro “sumia”', 'Decisões no impulso', 'Ansiedade financeira constante'].map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[var(--danger)]" />
                      {item}
                    </li>
                  ))}
                </ul>
              </Card>
              <Card className="p-6">
                <p className="label-premium text-[var(--primary)]">Depois</p>
                <ul className="mt-4 space-y-2">
                  {['Visão clara do que entra e sai', 'Decisões conscientes com dados', 'Controle real do mês'].map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                      <Check size={14} className="mt-0.5 text-[var(--primary)]" />
                      {item}
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          </motion.section>
        </Section>

        <Section>
          <motion.section {...reveal} className="space-y-3 text-center">
            <p className="label-premium">Depoimentos</p>
            <h2 className="text-3xl font-bold text-[var(--text-primary)] md:text-4xl">Experiências reais de quem saiu do caos financeiro</h2>
          </motion.section>
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            {testimonials.map((item) => (
              <Card key={item.author} className="p-6">
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
            <h2 className="mx-auto max-w-4xl text-3xl font-bold text-[var(--text-primary)] md:text-4xl">
              Escolha o nível de controle que você quer ter
            </h2>
          </motion.section>
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            {plans.map((plan) => (
              <Card key={plan.name} className={cn(plan.highlight ? 'border-[color:var(--border-strong)] bg-[color:var(--primary-soft)] p-6' : 'p-6')}>
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
                    plan.highlight ? 'button-primary mt-6 w-full px-4 py-3 text-sm font-semibold' : 'button-secondary mt-6 w-full px-4 py-3 text-sm font-semibold'
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
              <details key={item.question} className="ds-card p-5">
                <summary className="cursor-pointer list-none text-sm font-semibold text-[var(--text-primary)]">{item.question}</summary>
                <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">{item.answer}</p>
              </details>
            ))}
          </div>
        </Section>

        <Section className="pt-4">
          <motion.div {...reveal}>
            <Card className="p-8 text-center md:p-10">
              <h2 className="mx-auto max-w-3xl text-3xl font-bold text-[var(--text-primary)] md:text-5xl">
                Você não precisa ganhar mais.
                <br />
                Precisa enxergar melhor.
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-[var(--text-secondary)]">
                Comece hoje e descubra para onde seu dinheiro realmente está indo.
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
