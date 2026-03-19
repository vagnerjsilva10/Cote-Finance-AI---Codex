'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Space_Grotesk } from 'next/font/google';
import { motion } from 'motion/react';
import { ArrowRight, BarChart3, BrainCircuit, Check, CircleAlert, Cpu, Gauge, Layers, Lock, MessageCircle, Sparkles, Wallet, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ButtonPrimary, ButtonSecondary, Card, Container, Header, Section } from '@/components/ui/premium-primitives';

const displayFont = Space_Grotesk({ subsets: ['latin'], weight: ['600', '700'], variable: '--font-display' });

type PublicPlanCatalogItem = {
  code: 'FREE' | 'PRO' | 'PREMIUM';
  monthlyPrice: number;
  trialDays: number;
  features: string[];
};

type Plan = {
  name: 'Free' | 'Pro' | 'Premium';
  badge: string;
  price: string;
  description: string;
  ctaLabel: string;
  href: string;
  features: string[];
  note: string;
  highlight?: boolean;
};

type VisualFlowStep = {
  step: string;
  title: string;
  description: string;
  variant: 'connect' | 'analyze' | 'act';
};

const planCopy = {
  FREE: {
    name: 'Free' as const,
    badge: 'Entrada rápida',
    description: 'Para organizar o básico e iniciar com clareza.',
    ctaLabel: 'Começar grátis',
    href: '/signup?plan=free',
    features: ['Até 10 lançamentos por mês', 'Dashboard essencial', 'Categorias principais'],
    note: 'Sem cartão de crédito',
  },
  PRO: {
    name: 'Pro' as const,
    badge: 'Mais escolhido',
    description: 'Para quem quer controle contínuo com IA prática.',
    ctaLabel: 'Começar grátis agora',
    href: '/signup?plan=pro&trial=true',
    features: ['Lançamentos ilimitados', 'Insights automáticos com IA', 'Alertas no WhatsApp'],
    note: 'Teste grátis com ativação imediata',
    highlight: true,
  },
  PREMIUM: {
    name: 'Premium' as const,
    badge: 'Nível avançado',
    description: 'Para operar com máxima previsibilidade financeira.',
    ctaLabel: 'Assinar Premium',
    href: '/signup?plan=premium',
    features: ['Tudo do Pro', 'IA ilimitada', 'Previsões avançadas'],
    note: 'Camada estratégica completa',
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
    note: planCopy.FREE.note,
  },
  {
    name: planCopy.PRO.name,
    badge: planCopy.PRO.badge,
    price: 'R$29/mês',
    description: planCopy.PRO.description,
    ctaLabel: planCopy.PRO.ctaLabel,
    href: planCopy.PRO.href,
    features: planCopy.PRO.features,
    note: planCopy.PRO.note,
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
    note: planCopy.PREMIUM.note,
  },
];

const partners = ['Stripe', 'OpenAI', 'Supabase', 'Vercel', 'Meta', 'Recharts'];

const painPoints = [
  {
    title: 'Dinheiro sai sem rastreio',
    description: 'Sem visibilidade, o mês fecha com sensação de perda e nenhuma ação clara.',
  },
  {
    title: 'Decisão no impulso',
    description: 'Cada ajuste vira tentativa e erro porque faltam sinais objetivos.',
  },
  {
    title: 'Ansiedade recorrente',
    description: 'Sem padrão visual e analítico, o controle não estabiliza.',
  },
];

const solutionPillars = [
  {
    icon: Wallet,
    title: 'Centralização total',
    description: 'Entradas, saídas, metas e contas em uma única superfície visual.',
  },
  {
    icon: BrainCircuit,
    title: 'IA orientada por contexto',
    description: 'O sistema aponta desperdícios e oportunidades com prioridade.',
  },
  {
    icon: Gauge,
    title: 'Ação com previsibilidade',
    description: 'Você decide com cenário e impacto projetado.',
  },
];

const features = [
  {
    icon: Layers,
    title: 'Visão consolidada em tempo real',
    description: 'Sem planilhas fragmentadas e sem leitura confusa.',
  },
  {
    icon: Zap,
    title: 'Recomendações acionáveis',
    description: 'A IA indica o que cortar, manter e priorizar agora.',
  },
  {
    icon: MessageCircle,
    title: 'Alertas no momento certo',
    description: 'Resumo estratégico no app e no WhatsApp.',
  },
  {
    icon: BarChart3,
    title: 'Evolução por tendência',
    description: 'Compare comportamento e ganho de margem mês a mês.',
  },
  {
    icon: Cpu,
    title: 'Fluxo financeiro inteligente',
    description: 'Classificação e leitura de padrões com baixa fricção.',
  },
  {
    icon: Lock,
    title: 'Segurança padrão bancário',
    description: 'Estrutura robusta para dados sensíveis com confiança.',
  },
];

const visualFlow: VisualFlowStep[] = [
  {
    step: '01',
    title: 'Conecte',
    description: 'Centralize contas e categorias para criar base limpa de análise.',
    variant: 'connect',
  },
  {
    step: '02',
    title: 'Analise',
    description: 'A IA identifica ruídos, picos e padrões que drenam resultado.',
    variant: 'analyze',
  },
  {
    step: '03',
    title: 'Aja',
    description: 'Receba plano claro e acompanhe impacto real no mês.',
    variant: 'act',
  },
];

const testimonials = [
  {
    quote: 'Eu parei de apagar incêndio no fim do mês e passei a antecipar decisão com segurança.',
    author: 'João, São Paulo',
  },
  {
    quote: 'Em duas semanas reduzi gasto recorrente porque finalmente consegui enxergar os padrões.',
    author: 'Mariana, Rio de Janeiro',
  },
  {
    quote: 'O diferencial é receber recomendação pronta para agir sem interpretação confusa.',
    author: 'Carlos, Belo Horizonte',
  },
];

const faqItems = [
  {
    question: 'Preciso entender de finanças para usar?',
    answer: 'Não. O produto traduz dados em decisões práticas com linguagem direta.',
  },
  {
    question: 'Os dados estão protegidos?',
    answer: 'Sim. A arquitetura usa padrões de segurança de nível bancário.',
  },
  {
    question: 'Consigo cancelar quando quiser?',
    answer: 'Sim. O cancelamento pode ser feito a qualquer momento na área de assinatura.',
  },
  {
    question: 'Funciona para quem está começando?',
    answer: 'Sim. O Free organiza a base e o Pro acelera decisões com IA.',
  },
];

const reveal = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.44 },
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
      note: planCopy.FREE.note,
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
      note: planCopy.PREMIUM.note,
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
    note: plan.trialDays > 0 ? `${plan.trialDays} dias de teste grátis` : planCopy.PRO.note,
    highlight: true,
  };
}

function FlowPanel({ variant }: { variant: VisualFlowStep['variant'] }) {
  if (variant === 'connect') {
    return (
      <Card className="landing-glow-card landing-depth-card p-5">
        <p className="label-premium mb-3">Origens conectadas</p>
        <div className="grid gap-2 sm:grid-cols-3">
          {['Nubank', 'Itaú', 'Carteira'].map((item) => (
            <div key={item} className="app-surface-subtle rounded-xl p-3 text-sm font-semibold text-[var(--text-primary)]">
              {item}
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-container)] p-3">
          <p className="text-xs text-[var(--text-muted)]">Sincronização</p>
          <div className="mt-2 h-2 rounded-full bg-[var(--bg-surface-elevated)]">
            <motion.div
              className="h-full rounded-full bg-[linear-gradient(90deg,var(--primary),var(--accent-cyan))]"
              initial={{ width: '20%' }}
              whileInView={{ width: '86%' }}
              viewport={{ once: true }}
              transition={{ duration: 0.9, delay: 0.1 }}
            />
          </div>
        </div>
      </Card>
    );
  }

  if (variant === 'analyze') {
    return (
      <Card className="landing-glow-card landing-depth-card p-5">
        <p className="label-premium mb-3">Diagnóstico da IA</p>
        <div className="space-y-3">
          {[
            { label: 'Despesas evitáveis', value: 'R$ 680' },
            { label: 'Categoria crítica', value: 'Alimentação +18%' },
            { label: 'Ajuste recomendado', value: 'Reduzir assinaturas em 12%' },
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
    <Card className="landing-glow-card landing-depth-card p-5">
      <p className="label-premium mb-3">Plano de ação</p>
      <div className="space-y-2">
        {[
          'Cortar despesas invisíveis da semana',
          'Definir limite por categoria',
          'Priorizar pagamentos com maior impacto',
        ].map((item) => (
          <div key={item} className="flex items-start gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-container)] p-3">
            <Check size={14} className="mt-0.5 text-[var(--accent-cyan)]" />
            <p className="text-sm text-[var(--text-secondary)]">{item}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function DemoGraph() {
  return (
    <svg viewBox="0 0 360 150" className="h-36 w-full">
      <defs>
        <linearGradient id="landingLineA" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="var(--primary)" />
          <stop offset="100%" stopColor="var(--accent-cyan)" />
        </linearGradient>
        <linearGradient id="landingLineB" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="var(--accent-indigo)" />
          <stop offset="100%" stopColor="var(--primary)" />
        </linearGradient>
      </defs>
      <path d="M0,120 C40,116 72,95 108,78 C140,62 173,63 206,72 C236,80 269,96 300,84 C326,74 344,50 360,32" fill="none" stroke="url(#landingLineA)" strokeWidth="3.4" />
      <path d="M0,136 C34,132 70,124 104,118 C138,112 170,110 204,106 C238,102 270,98 302,104 C326,108 343,112 360,116" fill="none" stroke="url(#landingLineB)" strokeWidth="2.5" strokeOpacity="0.75" />
      <circle cx="108" cy="78" r="4" fill="var(--accent-cyan)" />
      <circle cx="206" cy="72" r="4" fill="var(--primary)" />
      <circle cx="300" cy="84" r="4" fill="var(--accent-indigo)" />
    </svg>
  );
}

export default function LandingPage() {
  const router = useRouter();
  const [plans, setPlans] = React.useState<Plan[]>(fallbackPlans);
  const [scrollY, setScrollY] = React.useState(0);

  React.useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY || 0);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  React.useEffect(() => {
    let active = true;
    const loadPlans = async () => {
      try {
        const response = await fetch('/api/public/plan-catalog', { cache: 'no-store' });
        const payload = (await response.json().catch(() => null)) as { plans?: PublicPlanCatalogItem[] } | null;
        if (!response.ok || !payload?.plans?.length || !active) return;
        setPlans(payload.plans.map(mapPlan));
      } catch {
        // mantém fallback local
      }
    };
    void loadPlans();
    return () => {
      active = false;
    };
  }, []);

  const navItems = [
    { label: 'Produto', onClick: () => document.getElementById('produto')?.scrollIntoView({ behavior: 'smooth' }) },
    { label: 'Solução', onClick: () => document.getElementById('solucao')?.scrollIntoView({ behavior: 'smooth' }) },
    { label: 'Planos', onClick: () => document.getElementById('planos')?.scrollIntoView({ behavior: 'smooth' }) },
    { label: 'FAQ', onClick: () => document.getElementById('faq')?.scrollIntoView({ behavior: 'smooth' }) },
  ];

  const backdropOffset = Math.min(scrollY * 0.09, 44);
  const heroOffset = Math.min(scrollY * 0.05, 30);

  return (
    <div className={`landing-premium-shell theme-landing-shell marketing-dark-shell min-h-screen ${displayFont.variable}`}>
      <div className="landing-premium-backdrop pointer-events-none fixed inset-0 -z-20" style={{ transform: `translate3d(0, ${backdropOffset * -1}px, 0)` }} />
      <div className="landing-noise pointer-events-none fixed inset-0 -z-10" />

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
        <Section className="pt-14 lg:pt-20">
          <section id="produto" className="landing-hero-spotlight grid items-center gap-10 lg:grid-cols-[1.02fr_.98fr]">
            <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} className="space-y-6">
              <span className="badge-premium badge-premium-info px-4 py-2 text-xs">
                <Sparkles size={13} /> Plataforma financeira com IA aplicada
              </span>
              <h1 className="max-w-4xl text-4xl font-bold leading-[1.05] tracking-tight text-[var(--text-primary)] md:text-6xl">
                Pare de perder dinheiro sem perceber e passe a enxergar tudo com clareza total.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-[var(--text-secondary)] md:text-lg">
                Controle financeiro premium com leitura automática, diagnóstico inteligente e ação objetiva.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <ButtonPrimary className="px-6 py-3 text-sm" onClick={() => router.push('/signup')}>
                  Começar grátis <ArrowRight size={16} />
                </ButtonPrimary>
                <ButtonSecondary className="px-6 py-3 text-sm" onClick={() => document.getElementById('solucao')?.scrollIntoView({ behavior: 'smooth' })}>
                  Ver como funciona
                </ButtonSecondary>
              </div>
              <p className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                <Check size={14} className="text-[var(--accent-cyan)]" /> Mais de 12.000 pessoas já usam para organizar melhor as finanças
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.08 }}
              className="relative landing-float"
              style={{ transform: `translate3d(0, ${heroOffset * -1}px, 0)` }}
            >
              <Card className="landing-mockup-shell landing-depth-card relative overflow-hidden p-4 md:p-6">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <p className="label-premium">Dashboard em tempo real</p>
                  <span className="badge-premium badge-premium-info px-3 py-1 text-[10px]">ao vivo</span>
                </div>
                <div className="relative overflow-hidden rounded-xl border border-[var(--border-default)] bg-[var(--bg-container)] p-3">
                  <video className="h-auto w-full rounded-lg" autoPlay loop muted playsInline preload="auto">
                    <source src="/videos/cote-demo-v2.mp4" type="video/mp4" />
                  </video>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {[
                    { label: 'Entradas', value: 'R$ 9.120' },
                    { label: 'Despesas', value: 'R$ 5.940' },
                    { label: 'Margem atual', value: 'R$ 3.180' },
                  ].map((item) => (
                    <div key={item.label} className="app-surface-subtle rounded-xl p-3">
                      <p className="text-xs text-[var(--text-muted)]">{item.label}</p>
                      <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{item.value}</p>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>
          </section>

          <motion.section {...reveal} className="mt-12 space-y-4">
            <p className="label-premium text-center">Usado por pessoas e times que exigem controle financeiro de verdade</p>
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
          <motion.section {...reveal} className="grid gap-6 lg:grid-cols-[1.04fr_.96fr]">
            <Card className="landing-glow-card landing-depth-card p-6 md:p-8">
              <p className="label-premium mb-3">Dor real</p>
              <h2 className="max-w-3xl text-3xl font-bold text-[var(--text-primary)] md:text-4xl">
                Se o dinheiro sempre some, o problema é falta de visibilidade operacional.
              </h2>
              <p className="mt-4 text-base leading-8 text-[var(--text-secondary)]">
                Sem leitura contínua, você decide no escuro, perde margem e mantém ruído financeiro todo mês.
              </p>
            </Card>
            <div className="space-y-3">
              {painPoints.map((point) => (
                <Card key={point.title} className="landing-glow-card landing-depth-card p-5">
                  <p className="flex items-start gap-3 text-sm font-semibold text-[var(--text-primary)]">
                    <CircleAlert size={16} className="mt-1 text-[var(--accent-indigo)]" />
                    {point.title}
                  </p>
                  <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">{point.description}</p>
                </Card>
              ))}
            </div>
          </motion.section>
        </Section>

        <Section>
          <div id="solucao" />
          <motion.section {...reveal} className="space-y-6">
            <div className="space-y-3 text-center">
              <p className="label-premium">Solução</p>
              <h2 className="mx-auto max-w-4xl text-3xl font-bold text-[var(--text-primary)] md:text-4xl">
                Uma camada inteligente que transforma confusão em decisão com clareza.
              </h2>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {solutionPillars.map((pillar, index) => (
                <motion.div key={pillar.title} {...reveal} transition={{ duration: 0.42, delay: index * 0.05 }}>
                  <Card className="landing-glow-card landing-depth-card h-full p-6">
                    <div className="inline-flex rounded-xl border border-[var(--border-default)] bg-[var(--primary-soft)] p-2.5 text-[var(--text-primary)]">
                      <pillar.icon size={18} />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold text-[var(--text-primary)]">{pillar.title}</h3>
                    <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">{pillar.description}</p>
                  </Card>
                </motion.div>
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
                Arquitetura visual premium para decisões melhores e mais rápidas.
              </h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {features.map((feature, index) => (
                <motion.div key={feature.title} {...reveal} transition={{ duration: 0.42, delay: index * 0.04 }}>
                  <Card className="landing-glow-card landing-depth-card h-full p-6">
                    <div className="inline-flex rounded-xl border border-[var(--border-default)] bg-[var(--primary-soft)] p-2.5 text-[var(--text-primary)]">
                      <feature.icon size={18} />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold text-[var(--text-primary)]">{feature.title}</h3>
                    <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">{feature.description}</p>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.section>
        </Section>

        <Section>
          <motion.div {...reveal} className="space-y-8">
            {visualFlow.map((step, index) => (
              <section key={step.step} className="grid items-center gap-8 lg:grid-cols-2">
                <div className={cn(index % 2 ? 'lg:order-2' : '')}>
                  <Card className="landing-glow-card landing-depth-card p-6 md:p-8">
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
          <motion.section {...reveal} className="grid items-center gap-6 lg:grid-cols-[1.04fr_.96fr]">
            <Card className="landing-glow-card landing-depth-card p-6 md:p-8">
              <p className="label-premium">Demonstração do sistema</p>
              <h2 className="mt-3 text-3xl font-bold text-[var(--text-primary)] md:text-4xl">
                Um cockpit financeiro completo para agir no mesmo lugar em que você analisa.
              </h2>
              <p className="mt-4 text-base leading-8 text-[var(--text-secondary)]">
                Visualize padrões, valide recomendações e acompanhe impacto sem trocar de contexto.
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {['Painel estratégico', 'Linha de tendência', 'Resumo operacional', 'Próximas ações'].map((item) => (
                  <div key={item} className="app-surface-subtle rounded-xl p-3 text-sm text-[var(--text-primary)]">
                    {item}
                  </div>
                ))}
              </div>
            </Card>
            <Card className="landing-glow-card landing-depth-card p-5">
              <p className="label-premium mb-2">Performance mensal</p>
              <DemoGraph />
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {[
                  { label: 'Receita', value: '+8.2%' },
                  { label: 'Despesa', value: '-4.1%' },
                  { label: 'Margem', value: '+12.6%' },
                ].map((metric) => (
                  <div key={metric.label} className="app-surface-subtle rounded-lg p-3">
                    <p className="text-[11px] text-[var(--text-muted)]">{metric.label}</p>
                    <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{metric.value}</p>
                  </div>
                ))}
              </div>
            </Card>
          </motion.section>
        </Section>

        <Section>
          <motion.section {...reveal}>
            <Card className="landing-glow-card landing-depth-card p-6 md:p-8">
              <div className="mb-5 space-y-2">
                <p className="label-premium">Resultados</p>
                <h2 className="text-3xl font-bold text-[var(--text-primary)] md:text-4xl">
                  Indicadores reais para quem quer controle com consistência.
                </h2>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                {[
                  { label: 'Usuários ativos', value: '+12.000' },
                  { label: 'Volume analisado', value: 'R$ 320 milhões' },
                  { label: 'Mais controle percebido', value: '94%' },
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
            <h2 className="text-3xl font-bold text-[var(--text-primary)] md:text-4xl">
              Quem usa no dia a dia percebe ganho de clareza imediatamente.
            </h2>
          </motion.section>
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            {testimonials.map((item) => (
              <Card key={item.author} className="landing-glow-card landing-depth-card p-6">
                <p className="text-base leading-7 text-[var(--text-primary)]">&ldquo;{item.quote}&rdquo;</p>
                <p className="mt-5 border-t border-[var(--border-default)] pt-4 text-sm text-[var(--text-secondary)]">{item.author}</p>
              </Card>
            ))}
          </div>
        </Section>

        <Section>
          <div id="planos" />
          <motion.section {...reveal} className="space-y-3 text-center">
            <p className="label-premium">Pricing</p>
            <h2 className="mx-auto max-w-4xl text-3xl font-bold text-[var(--text-primary)] md:text-4xl">
              Planos objetivos para cada nível de maturidade financeira.
            </h2>
          </motion.section>
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            {plans.map((plan) => (
              <Card
                key={plan.name}
                className={cn(
                  'landing-glow-card landing-depth-card p-6',
                  plan.highlight && 'landing-pricing-highlight border-[color:var(--border-strong)]'
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
                <p className="mt-2 text-xs text-[var(--text-muted)]">{plan.note}</p>
                <ul className="mt-5 space-y-2">
                  {plan.features.map((feature) => (
                    <li key={`${plan.name}-${feature}`} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                      <Check size={14} className="mt-0.5 text-[var(--accent-cyan)]" />
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
            <h2 className="text-3xl font-bold text-[var(--text-primary)] md:text-4xl">Perguntas frequentes antes de começar.</h2>
          </motion.section>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {faqItems.map((item) => (
              <details key={item.question} className="ds-card landing-glow-card landing-depth-card p-5">
                <summary className="cursor-pointer list-none text-sm font-semibold text-[var(--text-primary)]">{item.question}</summary>
                <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">{item.answer}</p>
              </details>
            ))}
          </div>
        </Section>

        <Section className="pt-4">
          <motion.div {...reveal}>
            <Card className="landing-glow-card landing-depth-card p-8 text-center md:p-10">
              <h2 className="mx-auto max-w-3xl text-3xl font-bold text-[var(--text-primary)] md:text-5xl">
                Comece hoje e transforme seu financeiro em um sistema de decisões claras.
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-[var(--text-secondary)]">
                Configure em minutos, visualize em tempo real e ajuste com confiança.
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
