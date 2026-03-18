'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Space_Grotesk } from 'next/font/google';
import { motion } from 'motion/react';
import {
  ArrowRight,
  BarChart3,
  BrainCircuit,
  Check,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Target,
  Wallet,
} from 'lucide-react';
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

const fallbackPlans: Plan[] = [
  {
    name: 'Free',
    badge: 'Entrada',
    price: 'R$0/mês',
    description: 'Ideal para começar e validar sua rotina financeira.',
    ctaLabel: 'Criar conta grátis',
    href: '/signup?plan=free',
    features: ['Até 10 lançamentos/mês', 'Dashboard essencial', 'Organização inicial de gastos'],
  },
  {
    name: 'Pro',
    badge: 'Mais escolhido',
    price: 'R$29/mês',
    description: 'Controle completo com IA e acompanhamento diário.',
    ctaLabel: 'Testar Pro grátis',
    href: '/signup?plan=pro&trial=true',
    highlight: true,
    features: ['Lançamentos ilimitados', '500 interações com IA', 'Relatórios e alertas no WhatsApp'],
  },
  {
    name: 'Premium',
    badge: 'Avançado',
    price: 'R$49/mês',
    description: 'Camada estratégica com automações e previsões avançadas.',
    ctaLabel: 'Assinar Premium',
    href: '/signup?plan=premium',
    features: ['Tudo do Pro', 'IA ilimitada', 'Previsão e alertas inteligentes'],
  },
];

const features = [
  {
    icon: Wallet,
    title: 'Controle em tempo real',
    description: 'Registre entradas e despesas com clareza em uma única visão.',
  },
  {
    icon: BrainCircuit,
    title: 'IA financeira aplicada',
    description: 'A IA identifica padrões de gasto e propõe ajustes objetivos.',
  },
  {
    icon: BarChart3,
    title: 'Relatórios consistentes',
    description: 'Painéis, métricas e tendências para decisões com mais segurança.',
  },
  {
    icon: MessageCircle,
    title: 'WhatsApp integrado',
    description: 'Alertas e resumos automáticos sem depender só do dashboard.',
  },
  {
    icon: Target,
    title: 'Metas e dívida no mesmo fluxo',
    description: 'Planejamento, execução e acompanhamento em uma jornada única.',
  },
  {
    icon: ShieldCheck,
    title: 'Infra segura',
    description: 'Proteção de dados e operações com padrão SaaS moderno.',
  },
];

const detailSections = [
  {
    title: 'Segmentação financeira sem ruído',
    description:
      'Organize transações por categorias relevantes e enxergue rapidamente onde está a maior pressão do caixa.',
    visual: '/landing/clarity-visual.svg',
  },
  {
    title: 'Diagnóstico de hábitos com IA',
    description:
      'A plataforma cruza comportamento de gastos, receita e sazonalidade para mostrar ações práticas de curto prazo.',
    visual: '/landing/problem-visual.svg',
  },
  {
    title: 'Execução com contexto diário',
    description:
      'Combine dashboard e alertas inteligentes para manter consistência nas decisões financeiras do mês.',
    visual: '/landing/solution-visual.svg',
  },
];

const testimonials = [
  {
    quote: 'Finalmente minha visão mensal ficou objetiva. Consigo agir antes do fim do caixa.',
    author: 'Mariana L.',
    role: 'Empreendedora',
  },
  {
    quote: 'A diferença foi tirar o improviso. Tudo agora segue um fluxo muito claro.',
    author: 'Carlos N.',
    role: 'Líder comercial',
  },
  {
    quote: 'A leitura financeira ficou simples, sem perder profundidade.',
    author: 'Fernanda P.',
    role: 'Autônoma',
  },
];

const faqItems = [
  {
    question: 'Preciso conectar banco para começar?',
    answer:
      'Não. Você pode iniciar com lançamento manual e evoluir no seu ritmo mantendo total controle dos dados.',
  },
  {
    question: 'Posso cancelar quando quiser?',
    answer: 'Sim. Os planos pagos podem ser cancelados a qualquer momento pela área de assinatura.',
  },
  {
    question: 'Qual plano é melhor para começar?',
    answer:
      'O Pro é o plano recomendado para quem quer consistência operacional com IA, relatórios e alertas automáticos.',
  },
  {
    question: 'O WhatsApp está em quais planos?',
    answer: 'O canal está disponível no Pro e Premium, com mais automação no Premium.',
  },
];

const partners = ['Meta', 'Vercel', 'Supabase', 'Stripe', 'Recharts', 'OpenAI'];

function mapPlan(plan: PublicPlanCatalogItem): Plan {
  if (plan.code === 'FREE') {
    return {
      name: 'Free',
      badge: 'Entrada',
      price: `R$${plan.monthlyPrice}/mês`,
      description: plan.description,
      ctaLabel: 'Criar conta grátis',
      href: '/signup?plan=free',
      features: plan.features,
    };
  }

  if (plan.code === 'PREMIUM') {
    return {
      name: 'Premium',
      badge: 'Avançado',
      price: `R$${plan.monthlyPrice}/mês`,
      description: plan.description,
      ctaLabel: 'Assinar Premium',
      href: '/signup?plan=premium',
      features: plan.features,
    };
  }

  return {
    name: 'Pro',
    badge: 'Mais escolhido',
    price: `R$${plan.monthlyPrice}/mês`,
    description: plan.description,
    ctaLabel: plan.trialDays > 0 ? 'Testar Pro grátis' : 'Assinar Pro',
    href: plan.trialDays > 0 ? '/signup?plan=pro&trial=true' : '/signup?plan=pro',
    features: plan.features,
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
    { label: 'Produto', onClick: () => document.getElementById('produto')?.scrollIntoView({ behavior: 'smooth' }) },
    { label: 'Funcionalidades', onClick: () => document.getElementById('funcionalidades')?.scrollIntoView({ behavior: 'smooth' }) },
    { label: 'Preços', onClick: () => document.getElementById('planos')?.scrollIntoView({ behavior: 'smooth' }) },
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
        <Section className="pt-16 lg:pt-20">
          <section id="produto" className="grid items-center gap-10 lg:grid-cols-[1.05fr_.95fr]">
            <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} className="space-y-6">
              <span className="badge-premium badge-premium-info px-4 py-2 text-xs">
                <Sparkles size={13} /> Plataforma financeira com IA
              </span>
              <h1 className="max-w-4xl text-4xl font-bold leading-[1.03] tracking-tight text-[var(--text-primary)] md:text-6xl">
                Clareza financeira para decidir melhor todos os meses.
              </h1>
              <p className="max-w-2xl text-base leading-8 text-[var(--text-secondary)] md:text-lg">
                O Cote Finance AI unifica gastos, metas, dívidas, relatórios e assistente IA em um fluxo visual único,
                sofisticado e orientado à ação.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <ButtonPrimary className="px-6 py-3 text-sm" onClick={() => router.push('/signup')}>
                  Começar agora <ArrowRight size={16} />
                </ButtonPrimary>
                <ButtonSecondary className="px-6 py-3 text-sm" onClick={() => router.push('/quiz')}>
                  Fazer diagnóstico rápido
                </ButtonSecondary>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.06 }}>
              <Card className="p-6 md:p-7">
                <div className="mb-5 flex items-center justify-between">
                  <p className="label-premium">Visão operacional</p>
                  <span className="badge-premium badge-premium-info px-3 py-1 text-[10px]">IA ativa</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    { label: 'Entradas', value: 'R$ 9.430' },
                    { label: 'Despesas', value: 'R$ 4.180' },
                    { label: 'Saldo', value: 'R$ 5.250' },
                  ].map((item) => (
                    <div key={item.label} className="app-surface-subtle rounded-xl p-3">
                      <p className="text-xs text-[var(--text-secondary)]">{item.label}</p>
                      <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{item.value}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-container)] p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">Tendência mensal</p>
                  <svg viewBox="0 0 320 110" className="mt-3 h-28 w-full">
                    <path d="M0,90 C35,80 55,48 80,42 C104,36 130,55 160,44 C188,34 215,21 248,26 C270,29 296,40 320,24" fill="none" stroke="var(--primary)" strokeWidth="3.5" />
                    <path d="M0,102 C32,101 58,98 86,93 C112,89 134,91 160,88 C188,86 214,79 246,82 C272,84 298,91 320,94" fill="none" stroke="var(--secondary-highlight)" strokeWidth="2.5" strokeOpacity="0.55" />
                  </svg>
                </div>
              </Card>
            </motion.div>
          </section>

          <section className="space-y-5">
            <p className="label-premium text-center">Confiado por times que operam com dados e disciplina financeira</p>
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {partners.map((partner) => (
                <Card key={partner} className="p-4 text-center">
                  <span className="text-sm font-semibold text-[var(--text-secondary)]">{partner}</span>
                </Card>
              ))}
            </div>
          </section>
        </Section>

        <Section>
          <div id="funcionalidades" />
          <div className="space-y-3 text-center">
            <p className="label-premium">Vantagens da plataforma</p>
            <h2 className="mx-auto max-w-4xl text-3xl font-bold text-[var(--text-primary)] md:text-4xl">
              Uma única interface para gestão financeira com padrão enterprise.
            </h2>
            <p className="mx-auto max-w-3xl text-base leading-7 text-[var(--text-secondary)]">
              Cards, tabelas, métricas e IA operam com a mesma linguagem visual e sem ruído de navegação.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {features.map((feature) => (
              <Card key={feature.title} className="p-6">
                <div className="inline-flex rounded-xl border border-[var(--border-default)] bg-[var(--primary-soft)] p-2.5 text-[var(--text-primary)]">
                  <feature.icon size={18} />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-[var(--text-primary)]">{feature.title}</h3>
                <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">{feature.description}</p>
              </Card>
            ))}
          </div>
        </Section>

        <Section>
          {detailSections.map((section, index) => (
            <section key={section.title} className="grid items-center gap-8 lg:grid-cols-2">
              <div className={index % 2 ? 'lg:order-2' : ''}>
                <Card className="p-6 md:p-8">
                  <p className="label-premium">Fluxo {index + 1}</p>
                  <h3 className="mt-3 text-3xl font-bold text-[var(--text-primary)] md:text-4xl">{section.title}</h3>
                  <p className="mt-4 text-base leading-8 text-[var(--text-secondary)]">{section.description}</p>
                  <ul className="mt-6 space-y-3">
                    {[
                      'Estrutura visual consistente entre módulos',
                      'Hierarquia tipográfica clara para leitura rápida',
                      'Estados de ação refinados e discretos',
                    ].map((item) => (
                      <li key={item} className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                        <Check size={14} className="text-[var(--primary)]" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </Card>
              </div>

              <div className={index % 2 ? 'lg:order-1' : ''}>
                <Card className="p-4 md:p-6">
                  <Image src={section.visual} alt={section.title} width={920} height={620} className="h-auto w-full" />
                </Card>
              </div>
            </section>
          ))}
        </Section>

        <Section>
          <Card className="p-6 md:p-8">
            <div className="grid gap-6 md:grid-cols-3">
              {[
                { label: 'Workspaces ativos', value: '+12.000' },
                { label: 'Movimentações analisadas', value: 'R$ 320 mi' },
                { label: 'Usuários com mais controle', value: '94%' },
              ].map((metric) => (
                <div key={metric.label} className="app-surface-subtle rounded-xl p-5">
                  <p className="label-premium">{metric.label}</p>
                  <p className="mt-3 text-3xl font-bold text-[var(--text-primary)]">{metric.value}</p>
                </div>
              ))}
            </div>
          </Card>
        </Section>

        <Section>
          <div className="space-y-3 text-center">
            <p className="label-premium">Depoimentos</p>
            <h2 className="text-3xl font-bold text-[var(--text-primary)] md:text-4xl">Produto simples, sólido e consistente.</h2>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
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
          <div className="space-y-3 text-center">
            <p className="label-premium">Planos</p>
            <h2 className="mx-auto max-w-4xl text-3xl font-bold text-[var(--text-primary)] md:text-4xl">
              Preços objetivos para cada estágio de maturidade financeira.
            </h2>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {plans.map((plan) => (
              <Card key={plan.name} className={plan.highlight ? 'border-[color:var(--border-strong)] bg-[color:var(--primary-soft)] p-6' : 'p-6'}>
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
                    <li key={feature} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                      <Check size={14} className="mt-0.5 text-[var(--primary)]" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link href={plan.href} className={plan.highlight ? 'button-primary mt-6 w-full px-4 py-3 text-sm font-semibold' : 'button-secondary mt-6 w-full px-4 py-3 text-sm font-semibold'}>
                  {plan.ctaLabel}
                </Link>
              </Card>
            ))}
          </div>
        </Section>

        <Section>
          <div className="space-y-3 text-center">
            <p className="label-premium">FAQ</p>
            <h2 className="text-3xl font-bold text-[var(--text-primary)] md:text-4xl">Perguntas frequentes</h2>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {faqItems.map((item) => (
              <details key={item.question} className="ds-card p-5">
                <summary className="cursor-pointer list-none text-sm font-semibold text-[var(--text-primary)]">{item.question}</summary>
                <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">{item.answer}</p>
              </details>
            ))}
          </div>
        </Section>

        <Section className="pt-4">
          <Card className="p-8 text-center md:p-10">
            <h2 className="mx-auto max-w-3xl text-3xl font-bold text-[var(--text-primary)] md:text-5xl">
              Eleve sua operação financeira com um produto visualmente coerente e pronto para escala.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-[var(--text-secondary)]">
              Crie sua conta e aplique uma rotina de controle financeiro com clareza, consistência e inteligência prática.
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
