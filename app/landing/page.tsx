'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Space_Grotesk } from 'next/font/google';
import { motion, useReducedMotion } from 'motion/react';
import {
  ArrowRight,
  BrainCircuit,
  Check,
  CircleAlert,
  Compass,
  LineChart,
  Lock,
  MessageCircle,
  Sparkles,
  Target,
  Wallet,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ButtonPrimary, ButtonSecondary, Container, Header, Section } from '@/components/ui/premium-primitives';

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
  microcopy: string;
  highlight?: boolean;
};

function useElementInView<T extends Element>(threshold = 0.25) {
  const ref = React.useRef<T | null>(null);
  const [inView, setInView] = React.useState(false);

  React.useEffect(() => {
    const node = ref.current;
    if (!node || inView) return;

    let raf = 0;
    let observer: IntersectionObserver | null = null;

    const checkVisible = () => {
      const rect = node.getBoundingClientRect();
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
      const triggerLine = viewportHeight * (1 - threshold);
      return rect.top <= triggerLine && rect.bottom >= 0;
    };

    const teardown = () => {
      if (observer) {
        observer.disconnect();
        observer = null;
      }
      window.removeEventListener('scroll', scheduleCheck);
      window.removeEventListener('resize', scheduleCheck);
      window.removeEventListener('orientationchange', scheduleCheck);
      if (raf) {
        window.cancelAnimationFrame(raf);
        raf = 0;
      }
    };

    const activate = () => {
      setInView(true);
      teardown();
    };

    const scheduleCheck = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        if (checkVisible()) activate();
      });
    };

    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting || entry.intersectionRatio >= threshold) {
              activate();
              break;
            }
          }
        },
        { threshold: [0, threshold, 0.5], rootMargin: '0px 0px -8% 0px' }
      );
      observer.observe(node);
    }

    scheduleCheck();
    window.addEventListener('scroll', scheduleCheck, { passive: true });
    window.addEventListener('resize', scheduleCheck);
    window.addEventListener('orientationchange', scheduleCheck);
    const delayedCheck = window.setTimeout(scheduleCheck, 260);

    return () => {
      window.clearTimeout(delayedCheck);
      teardown();
    };
  }, [threshold, inView]);

  return [ref, inView] as const;
}

const reveal = {
  initial: { opacity: 0, y: 14 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.16 },
  transition: { duration: 0.4, ease: 'easeOut' },
} as const;

const partners = ['Stripe', 'OpenAI', 'Supabase', 'Vercel', 'Meta', 'Recharts'];

const problemBullets = [
  'Seu dinheiro some ao longo do mês',
  'Você não sabe onde ajustar',
  'Pequenos gastos sabotam seus resultados',
  'Você decide no escuro',
];

const solutionChecks = [
  'Onde você está perdendo dinheiro',
  'O que ajustar agora',
  'Como evoluir mês a mês',
];

const benefits = [
  { icon: Compass, title: 'Contexto real', description: 'Veja seu dinheiro com contexto e entenda o impacto de cada decisão.' },
  { icon: CircleAlert, title: 'Alertas antecipados', description: 'Receba sinais antes do problema virar descontrole.' },
  { icon: BrainCircuit, title: 'Padrões invisíveis', description: 'A IA identifica repetições que passam despercebidas no dia a dia.' },
  { icon: Target, title: 'Decisão com segurança', description: 'Saiba exatamente o que ajustar sem agir no escuro.' },
  { icon: LineChart, title: 'Evolução mensal', description: 'Tenha um plano claro e acompanhe sua melhora ao longo dos meses.' },
  {
    icon: MessageCircle,
    title: 'Alertas no WhatsApp',
    description: 'Receba alertas financeiros no WhatsApp e aja antes que pequenos desvios virem descontrole.',
  },
];

const lossSources = [
  { label: 'Assinaturas esquecidas', value: 'R$120/mês', hint: 'Pagamentos recorrentes sem uso real.' },
  { label: 'Taxas invisíveis', value: 'R$80/mês', hint: 'Custos pequenos que se acumulam sem percepção.' },
  { label: 'Pequenos gastos', value: 'R$220/mês', hint: 'Compras de baixo valor com alto impacto anual.' },
];

const aiFindings = [
  'Seu pico de gasto ocorre na semana 3',
  'Você pode economizar até R$680/mês',
  'Seu padrão está desbalanceado em alimentação e recorrentes',
];

const planFeatures = {
  FREE: [
    'Até 10 lançamentos por mês',
    'Até 10 interações com IA por mês',
    'Dashboard financeiro',
    'Categorias automáticas',
    'Análise básica de despesas',
  ],
  PRO: [
    'Lançamentos ilimitados',
    'Relatórios completos e gráficos avançados',
    'Até 500 interações com IA por mês',
    'Insights financeiros automáticos',
    'Metas financeiras ilimitadas',
    'Acompanhamento de dívidas',
    'Controle de investimentos',
    'Resumos e alertas no WhatsApp',
    'Suporte por e-mail',
  ],
  PREMIUM: [
    'Tudo do Pro',
    'IA financeira sem limite mensal',
    'Insights financeiros mais avançados',
    'Previsão de saldo e alertas inteligentes',
    'Análises profundas de despesas',
    'Automação financeira no WhatsApp',
    'Suporte por e-mail',
  ],
};

const planBlueprint = {
  FREE: {
    name: 'Free' as const,
    badge: 'Entrada',
    description: 'Ideal para começar a organizar suas finanças e testar o produto.',
    ctaLabel: 'Criar conta grátis',
    href: '/signup?plan=free',
    features: planFeatures.FREE,
    microcopy: 'Sem cartão de crédito. Crie sua conta em segundos.',
  },
  PRO: {
    name: 'Pro' as const,
    badge: 'Mais escolhido',
    description: 'Para quem quer controle completo do dinheiro, análises úteis com IA e lançamentos ilimitados no dia a dia.',
    ctaLabel: 'Começar grátis agora',
    href: '/signup?plan=pro&trial=true',
    features: planFeatures.PRO,
    microcopy: 'Teste grátis por 3 dias e evolua no seu ritmo.',
    highlight: true,
  },
  PREMIUM: {
    name: 'Premium' as const,
    badge: 'Estratégico',
    description: 'Para quem busca IA sem limite mensal, previsões mais profundas e uma camada mais estratégica de inteligência financeira.',
    ctaLabel: 'Assinar Premium',
    href: '/signup?plan=premium',
    features: planFeatures.PREMIUM,
    microcopy: 'Para quem quer acompanhar tudo com mais profundidade e automação.',
  },
};

const fallbackPlans: Plan[] = [
  {
    name: planBlueprint.FREE.name,
    badge: planBlueprint.FREE.badge,
    price: 'R$0/mês',
    description: planBlueprint.FREE.description,
    ctaLabel: planBlueprint.FREE.ctaLabel,
    href: planBlueprint.FREE.href,
    features: planBlueprint.FREE.features,
    microcopy: planBlueprint.FREE.microcopy,
  },
  {
    name: planBlueprint.PRO.name,
    badge: planBlueprint.PRO.badge,
    price: 'R$29/mês',
    description: planBlueprint.PRO.description,
    ctaLabel: planBlueprint.PRO.ctaLabel,
    href: planBlueprint.PRO.href,
    features: planBlueprint.PRO.features,
    microcopy: planBlueprint.PRO.microcopy,
    highlight: true,
  },
  {
    name: planBlueprint.PREMIUM.name,
    badge: planBlueprint.PREMIUM.badge,
    price: 'R$49/mês',
    description: planBlueprint.PREMIUM.description,
    ctaLabel: planBlueprint.PREMIUM.ctaLabel,
    href: planBlueprint.PREMIUM.href,
    features: planBlueprint.PREMIUM.features,
    microcopy: planBlueprint.PREMIUM.microcopy,
  },
];

function mapPlan(plan: PublicPlanCatalogItem): Plan {
  if (plan.code === 'FREE') {
    return {
      name: planBlueprint.FREE.name,
      badge: planBlueprint.FREE.badge,
      price: 'R$0/mês',
      description: planBlueprint.FREE.description,
      ctaLabel: planBlueprint.FREE.ctaLabel,
      href: planBlueprint.FREE.href,
      features: planBlueprint.FREE.features,
      microcopy: planBlueprint.FREE.microcopy,
    };
  }

  if (plan.code === 'PREMIUM') {
    return {
      name: planBlueprint.PREMIUM.name,
      badge: planBlueprint.PREMIUM.badge,
      price: `R$${plan.monthlyPrice}/mês`,
      description: planBlueprint.PREMIUM.description,
      ctaLabel: planBlueprint.PREMIUM.ctaLabel,
      href: planBlueprint.PREMIUM.href,
      features: planBlueprint.PREMIUM.features,
      microcopy: planBlueprint.PREMIUM.microcopy,
    };
  }

  return {
    name: planBlueprint.PRO.name,
    badge: planBlueprint.PRO.badge,
    price: `R$${plan.monthlyPrice}/mês`,
    description: planBlueprint.PRO.description,
    ctaLabel: plan.trialDays > 0 ? 'Começar grátis agora' : 'Assinar Pro',
    href: plan.trialDays > 0 ? '/signup?plan=pro&trial=true' : '/signup?plan=pro',
    features: planBlueprint.PRO.features,
    microcopy: planBlueprint.PRO.microcopy,
    highlight: true,
  };
}

function alignPlanCopy(plan: Plan): Plan {
  if (plan.name === 'Free') {
    return {
      ...plan,
      badge: planBlueprint.FREE.badge,
      price: 'R$0/mês',
      description: planBlueprint.FREE.description,
      ctaLabel: 'Criar conta grátis',
      features: planBlueprint.FREE.features,
      microcopy: planBlueprint.FREE.microcopy,
    };
  }

  if (plan.name === 'Premium') {
    return {
      ...plan,
      badge: planBlueprint.PREMIUM.badge,
      price: 'R$49/mês',
      description: planBlueprint.PREMIUM.description,
      features: planBlueprint.PREMIUM.features,
      microcopy: planBlueprint.PREMIUM.microcopy,
    };
  }

  return {
    ...plan,
    badge: planBlueprint.PRO.badge,
    price: 'R$29/mês',
    description: planBlueprint.PRO.description,
    features: planBlueprint.PRO.features,
    microcopy: planBlueprint.PRO.microcopy,
    highlight: true,
  };
}

function useNumberTicker(target: number, duration = 900, shouldStart = true) {
  const [value, setValue] = React.useState(0);

  React.useEffect(() => {
    if (!shouldStart) return;

    let frame = 0;
    let raf = 0;
    const startTime = performance.now();
    const loop = (time: number) => {
      const progress = Math.min((time - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = Math.round(target * eased);
      if (next !== frame) {
        frame = next;
        setValue(next);
      }
      if (progress < 1) raf = window.requestAnimationFrame(loop);
    };
    raf = window.requestAnimationFrame(loop);
    return () => window.cancelAnimationFrame(raf);
  }, [target, duration, shouldStart]);

  return value;
}

function CurrencyTicker({ target }: { target: number }) {
  const shouldReduceMotion = useReducedMotion();
  const [ref, inView] = useElementInView<HTMLSpanElement>(0.3);
  const [started, setStarted] = React.useState(false);

  React.useEffect(() => {
    if (inView) setStarted(true);
  }, [inView]);

  const animatedValue = useNumberTicker(target, 900, started && !shouldReduceMotion);
  const value = shouldReduceMotion ? target : animatedValue;
  return (
    <span ref={ref}>
      {new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        maximumFractionDigits: 0,
      }).format(value)}
    </span>
  );
}

function AnimatedChart() {
  const shouldReduceMotion = useReducedMotion();
  const [svgRef, inView] = useElementInView<SVGSVGElement>(0.22);
  const gradientA = React.useId();
  const gradientB = React.useId();
  const glowId = React.useId();
  const shouldStart = shouldReduceMotion || inView;

  return (
    <svg ref={svgRef} viewBox="0 0 360 130" className="h-32 w-full" aria-hidden>
      <defs>
        <linearGradient id={gradientA} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="var(--primary)" />
          <stop offset="100%" stopColor="var(--accent-cyan)" />
        </linearGradient>
        <linearGradient id={gradientB} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="var(--accent-indigo)" />
          <stop offset="100%" stopColor="var(--primary)" />
        </linearGradient>
        <filter id={glowId} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="2.2" result="glow" />
          <feMerge>
            <feMergeNode in="glow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <motion.path
        d="M0,106 C34,96 68,80 102,62 C136,46 170,48 204,61 C236,72 268,84 300,74 C326,66 344,50 360,36"
        fill="none"
        stroke={`url(#${gradientA})`}
        strokeWidth="3.1"
        filter={`url(#${glowId})`}
        strokeLinecap="round"
        pathLength={1}
        initial={shouldReduceMotion ? { opacity: 0.95 } : { pathLength: 0.08, opacity: 0.2 }}
        animate={
          shouldReduceMotion
            ? { opacity: 0.95 }
            : shouldStart
              ? { pathLength: [0.08, 1], opacity: [0.4, 0.95, 0.72] }
              : { pathLength: 0.08, opacity: 0.2 }
        }
        transition={shouldReduceMotion ? { duration: 0 } : { duration: 1.05, ease: 'easeOut' }}
      />
      <motion.path
        d="M0,120 C34,116 66,110 98,104 C134,98 170,94 206,88 C242,82 272,84 304,92 C328,98 345,104 360,108"
        fill="none"
        stroke={`url(#${gradientB})`}
        strokeWidth="2.1"
        strokeOpacity="0.82"
        strokeLinecap="round"
        pathLength={1}
        initial={shouldReduceMotion ? { opacity: 0.82 } : { pathLength: 0.08, opacity: 0.16 }}
        animate={
          shouldReduceMotion
            ? { opacity: 0.82 }
            : shouldStart
              ? { pathLength: [0.08, 1], opacity: [0.3, 0.82, 0.58] }
              : { pathLength: 0.08, opacity: 0.16 }
        }
        transition={shouldReduceMotion ? { duration: 0 } : { duration: 1.1, delay: 0.06, ease: 'easeOut' }}
      />
      {shouldReduceMotion ? null : (
        <motion.path
          d="M0,106 C34,96 68,80 102,62 C136,46 170,48 204,61 C236,72 268,84 300,74 C326,66 344,50 360,36"
          fill="none"
          stroke="var(--accent-cyan)"
          strokeWidth="1.1"
          strokeLinecap="round"
          strokeDasharray="5 11"
          initial={{ strokeDashoffset: 0, opacity: 0 }}
          animate={shouldStart ? { strokeDashoffset: [-4, -68], opacity: [0.1, 0.38, 0.1] } : { strokeDashoffset: 0, opacity: 0 }}
          transition={{ duration: 3.4, repeat: Infinity, ease: 'linear' }}
        />
      )}
      <motion.circle
        cx="300"
        cy="74"
        r="3.8"
        fill="var(--accent-cyan)"
        animate={
          shouldReduceMotion
            ? { opacity: 0.9, scale: 1 }
            : shouldStart
              ? { opacity: [0.55, 1, 0.55], scale: [0.96, 1.12, 0.96] }
              : { opacity: 0.35, scale: 1 }
        }
        transition={shouldReduceMotion ? { duration: 0 } : { duration: 2.2, repeat: Infinity }}
      />
    </svg>
  );
}

function HeroVisual({ offset, enableParallax }: { offset: number; enableParallax: boolean }) {
  return (
    <motion.div
      className="landing-hero-cluster relative"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55 }}
    >
      <motion.div style={enableParallax ? { y: offset * -1 } : undefined}>
        <div className="landing-panel landing-glass p-4 sm:p-5">
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Entradas', value: 9120 },
              { label: 'Despesas', value: 5940 },
              { label: 'Margem', value: 3180 },
            ].map((item) => (
              <div key={item.label} className="landing-tile p-3">
                <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)]">{item.label}</p>
                <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">
                  <CurrencyTicker target={item.value} />
                </p>
              </div>
            ))}
          </div>

          <div className="mt-4 landing-tile p-3">
            <p className="label-premium">Fluxo financeiro vivo</p>
            <AnimatedChart />
          </div>
        </div>
      </motion.div>

      <motion.div
        className="landing-floating-chip landing-panel landing-glass p-3"
        animate={enableParallax ? { y: [0, -6, 0] } : undefined}
        transition={enableParallax ? { duration: 5, repeat: Infinity } : undefined}
      >
        <p className="text-xs text-[var(--text-secondary)]">Despesas invisíveis</p>
        <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">R$680/mês</p>
      </motion.div>

      <motion.div
        className="landing-floating-chip-alt landing-panel landing-glass p-3"
        animate={enableParallax ? { y: [0, -8, 0] } : undefined}
        transition={enableParallax ? { duration: 5.3, repeat: Infinity } : undefined}
      >
        <p className="text-xs text-[var(--text-secondary)]">Ação prioritária</p>
        <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">Cortar assinaturas</p>
      </motion.div>
    </motion.div>
  );
}

export default function LandingPage() {
  const router = useRouter();
  const [plans, setPlans] = React.useState<Plan[]>(fallbackPlans.map(alignPlanCopy));
  const [scrollY, setScrollY] = React.useState(0);
  const [enableParallax, setEnableParallax] = React.useState(true);

  React.useEffect(() => {
    const mediaMobile = window.matchMedia('(max-width: 768px)');
    const mediaReduce = window.matchMedia('(prefers-reduced-motion: reduce)');

    const sync = () => setEnableParallax(!(mediaMobile.matches || mediaReduce.matches));
    sync();

    mediaMobile.addEventListener('change', sync);
    mediaReduce.addEventListener('change', sync);

    return () => {
      mediaMobile.removeEventListener('change', sync);
      mediaReduce.removeEventListener('change', sync);
    };
  }, []);

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
        setPlans(payload.plans.map(mapPlan).map(alignPlanCopy));
      } catch {
        // fallback local
      }
    };
    void loadPlans();
    return () => {
      active = false;
    };
  }, []);

  const navItems = [
    { label: 'Produto', onClick: () => document.getElementById('produto')?.scrollIntoView({ behavior: 'smooth' }) },
    { label: 'Como funciona', onClick: () => document.getElementById('como-funciona')?.scrollIntoView({ behavior: 'smooth' }) },
    { label: 'Planos', onClick: () => document.getElementById('planos')?.scrollIntoView({ behavior: 'smooth' }) },
    { label: 'FAQ', onClick: () => document.getElementById('faq')?.scrollIntoView({ behavior: 'smooth' }) },
  ];

  const backgroundOffset = enableParallax ? Math.min(scrollY * 0.08, 34) : 0;
  const heroOffset = enableParallax ? Math.min(scrollY * 0.045, 22) : 0;

  return (
    <div className={`landing-premium-shell min-h-screen ${displayFont.variable}`}>
      <div className="landing-premium-backdrop pointer-events-none fixed inset-0 -z-20" style={{ transform: `translate3d(0, ${backgroundOffset * -1}px, 0)` }} />
      <div className="landing-noise pointer-events-none fixed inset-0 -z-10" />
      <div className="landing-grid-overlay pointer-events-none fixed inset-0 -z-10" />

      <Header
        className="landing-mobile-header"
        logo={
          <Link href="/" className="landing-header-logo flex items-center">
            <Image src="/brand/cote-favicon.svg" alt="Cote Finance AI" width={40} height={40} priority className="size-9 sm:hidden" />
            <Image src="/brand/cote-finance-ai-logo.svg" alt="Cote Finance AI" width={620} height={160} priority className="hidden h-11 w-auto sm:block lg:h-16" />
          </Link>
        }
        navItems={navItems}
        actions={
          <>
            <ButtonSecondary className="h-9 min-h-9 rounded-xl px-3 text-xs sm:h-auto sm:min-h-[44px] sm:px-4 sm:text-sm" onClick={() => router.push('/app?auth=login')}>
              Entrar
            </ButtonSecondary>
            <ButtonPrimary className="h-9 min-h-9 rounded-xl px-3 text-xs sm:h-auto sm:min-h-[44px] sm:px-4 sm:text-sm" onClick={() => router.push('/signup')}>
              Começar grátis
            </ButtonPrimary>
          </>
        }
      />

      <Container className="landing-page-flow">
        <Section className="pt-10 sm:pt-14 lg:pt-20">
          <section id="produto" className="landing-hero-spotlight grid items-center gap-8 sm:gap-11 xl:gap-14 lg:grid-cols-[1.02fr_.98fr]">
            <motion.div {...reveal} className="space-y-5 sm:space-y-6">
              <span className="badge-premium badge-premium-info px-4 py-2 text-xs">
                <Sparkles size={13} /> IA aplicada ao seu financeiro
              </span>

              <h1 className="max-w-4xl text-[clamp(2rem,9vw,2.65rem)] font-bold leading-[1.08] tracking-tight text-[var(--text-primary)] sm:text-5xl md:text-6xl">
                Você não está sem dinheiro. Está sem visibilidade.
              </h1>

              <p className="max-w-2xl text-[15px] leading-7 text-[var(--text-secondary)] sm:text-base sm:leading-8 md:text-lg">
                Descubra para onde seu dinheiro realmente vai, elimine desperdícios invisíveis e tome decisões financeiras com confiança em minutos.
              </p>

              <div className="grid gap-2.5 sm:flex sm:flex-wrap sm:gap-3">
                <ButtonPrimary className="w-full px-5 py-3 text-sm hover:scale-[1.02] sm:w-auto sm:px-6" onClick={() => router.push('/signup')}>
                  Começar grátis agora <ArrowRight size={16} />
                </ButtonPrimary>
                <ButtonSecondary className="w-full px-5 py-3 text-sm hover:scale-[1.02] sm:w-auto sm:px-6" onClick={() => document.getElementById('como-funciona')?.scrollIntoView({ behavior: 'smooth' })}>
                  Ver como funciona
                </ButtonSecondary>
              </div>

              <ul className="flex flex-wrap items-center gap-x-3 gap-y-2.5 text-[13px] text-[var(--text-secondary)] sm:gap-x-4 sm:text-sm">
                <li className="inline-flex items-center gap-2">
                  <Check size={14} className="text-[var(--accent-cyan)]" />
                  <span>Sem cartão de crédito</span>
                </li>
                <li className="inline-flex items-center gap-2">
                  <Check size={14} className="text-[var(--accent-cyan)]" />
                  <span>+12.000 pessoas já usam</span>
                </li>
              </ul>
            </motion.div>

            <HeroVisual offset={heroOffset} enableParallax={enableParallax} />
          </section>

          <motion.div {...reveal} className="mt-8 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)] sm:mt-12 sm:gap-x-6 sm:text-xs sm:tracking-[0.18em]">
            {partners.map((partner) => (
              <span key={partner}>{partner}</span>
            ))}
          </motion.div>
        </Section>

        <Section>
          <motion.section {...reveal} className="grid items-center gap-12 xl:gap-16 lg:grid-cols-[1.04fr_.96fr]">
            <div className="space-y-4">
              <p className="label-premium">Problema</p>
              <h2 className="text-3xl font-bold text-[var(--text-primary)] md:text-4xl">
                Você pode estar perdendo dinheiro todos os meses sem perceber.
              </h2>
              <div className="space-y-2">
                {problemBullets.map((item) => (
                  <p key={item} className="flex items-start gap-2 text-sm leading-7 text-[var(--text-secondary)]">
                    <CircleAlert size={15} className="mt-1 text-[var(--accent-indigo)]" />
                    {item}
                  </p>
                ))}
              </div>
              <p className="text-sm leading-7 text-[var(--text-secondary)]">E quanto mais o tempo passa, mais isso se acumula.</p>
            </div>

            <div className="landing-panel landing-glass landing-depth-card p-6 sm:p-7">
              <p className="label-premium">Diagnóstico rápido</p>
              <div className="mt-4 space-y-3">
                {[
                  { k: 'Despesas invisíveis', v: 'R$680' },
                  { k: 'Categoria mais crítica', v: 'Alimentação' },
                  { k: 'Perda anual', v: 'R$8.160' },
                ].map((row) => (
                  <div key={row.k} className="landing-tile flex items-center justify-between p-3.5">
                    <span className="text-sm text-[var(--text-secondary)]">{row.k}</span>
                    <span className="text-sm font-semibold text-[var(--text-primary)]">{row.v}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.section>
        </Section>

        <Section>
          <motion.section {...reveal} className="space-y-6">
            <div className="space-y-3 text-center">
              <p className="label-premium">Você está perdendo dinheiro aqui</p>
              <h2 className="text-3xl font-bold text-[var(--text-primary)] md:text-4xl">
                Pequenos vazamentos mensais viram uma perda grande no ano.
              </h2>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {lossSources.map((item, index) => (
                <motion.div
                  key={item.label}
                  className="landing-glow-card rounded-[var(--radius-lg)] p-5"
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.22 }}
                  transition={{ duration: 0.36, delay: index * 0.05 }}
                >
                  <p className="label-premium">{item.label}</p>
                  <p className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">{item.value}</p>
                  <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">{item.hint}</p>
                </motion.div>
              ))}
            </div>
          </motion.section>
        </Section>

        <Section>
          <motion.section {...reveal} className="grid items-center gap-12 xl:gap-16 lg:grid-cols-[.98fr_1.02fr]">
            <div className="landing-panel landing-glass landing-depth-card p-6 sm:p-7">
              <p className="label-premium">Sistema real em uso</p>

              <div className="mt-4 landing-tile p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">Contexto em tempo real</p>
                <p className="mt-2 text-base font-semibold text-[var(--text-primary)]">Ajuste imediato</p>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">Reduzir recorrentes em 12%</p>
              </div>

              <div className="mt-4 landing-tile p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">Impacto estimado</p>
                <p className="mt-2 text-xl font-semibold text-[var(--text-primary)]">+R$680/mês</p>
              </div>

              <div className="mt-4 landing-tile p-3">
                <AnimatedChart />
              </div>
            </div>

            <div className="space-y-4">
              <p className="label-premium">Solução</p>
              <h2 className="text-3xl font-bold text-[var(--text-primary)] md:text-4xl">
                Clareza financeira em minutos, sem planilhas e sem esforço.
              </h2>
              <p className="text-base leading-8 text-[var(--text-secondary)]">O Cote analisa seu comportamento e mostra:</p>
              <div className="space-y-2">
                {solutionChecks.map((item) => (
                  <p key={item} className="inline-flex w-full items-center gap-2 text-sm leading-7 text-[var(--text-secondary)]">
                    <Check size={15} className="text-[var(--accent-cyan)]" />
                    {item}
                  </p>
                ))}
              </div>
              <p className="text-sm leading-7 text-[var(--text-secondary)]">Tudo com contexto real.</p>
            </div>
          </motion.section>
        </Section>

        <Section>
          <motion.section {...reveal} className="grid items-center gap-12 xl:gap-16 lg:grid-cols-[1.04fr_.96fr]">
            <div className="space-y-4">
              <p className="label-premium">O que a IA vê que você não vê</p>
              <h2 className="text-3xl font-bold text-[var(--text-primary)] md:text-4xl">
                Direcionamento claro com base em padrões reais, não em achismo.
              </h2>
              <div className="space-y-2">
                {aiFindings.map((item) => (
                  <p key={item} className="inline-flex w-full items-center gap-2 text-sm leading-7 text-[var(--text-secondary)]">
                    <Zap size={15} className="text-[var(--accent-cyan)]" />
                    {item}
                  </p>
                ))}
              </div>
            </div>

            <div className="landing-panel landing-depth-card p-6 sm:p-7">
              <div className="landing-tile p-4">
                <p className="label-premium">Padrão detectado</p>
                <p className="mt-2 text-base font-semibold text-[var(--text-primary)]">Pico de despesa entre dia 19 e 24</p>
                <p className="mt-1 text-sm leading-7 text-[var(--text-secondary)]">Concentração em alimentação e recorrentes no fim do ciclo.</p>
              </div>
              <div className="mt-4 landing-tile p-4">
                <p className="label-premium">Simulação de correção</p>
                <p className="mt-2 text-base font-semibold text-[var(--text-primary)]">Economia potencial anual de R$8.160</p>
                <div className="mt-3">
                  <AnimatedChart />
                </div>
              </div>
            </div>
          </motion.section>
        </Section>

        <Section>
          <div id="como-funciona" />
          <motion.section {...reveal} className="space-y-8">
            <div className="space-y-3 text-center">
              <p className="label-premium">Como funciona</p>
              <h2 className="text-3xl font-bold text-[var(--text-primary)] md:text-4xl">Organize. Entenda. Decida melhor.</h2>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              {[
                {
                  title: '1. Organize suas informações financeiras',
                  desc: 'Tenha tudo em um só lugar para enxergar o cenário completo.',
                  icon: Wallet,
                },
                {
                  title: '2. A IA analisa seu comportamento',
                  desc: 'Identifica padrões e desperdícios invisíveis na rotina.',
                  icon: BrainCircuit,
                },
                {
                  title: '3. Receba direcionamento claro',
                  desc: 'Saiba exatamente o que fazer para melhorar mês a mês.',
                  icon: Target,
                },
              ].map((step) => (
                <div key={step.title} className="landing-panel p-5">
                  <step.icon size={16} className="text-[var(--accent-cyan)]" />
                  <h3 className="mt-3 text-lg font-semibold text-[var(--text-primary)]">{step.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">{step.desc}</p>
                </div>
              ))}
            </div>

            <p className="text-center text-sm text-[var(--text-secondary)]">Sem planilhas. Sem complexidade. Sem achismos.</p>
          </motion.section>
        </Section>

        <Section>
          <motion.section {...reveal} className="space-y-8">
            <div className="space-y-3 text-center">
              <p className="label-premium">Benefícios</p>
              <h2 className="mx-auto max-w-4xl text-3xl font-bold text-[var(--text-primary)] md:text-4xl">
                Tudo que você precisa para sair do modo tentativa e erro.
              </h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {benefits.map((item, index) => (
                <motion.div
                  key={item.title}
                  className="landing-glow-card rounded-[var(--radius-lg)] p-5"
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.36, delay: index * 0.04 }}
                >
                  <item.icon size={16} className="text-[var(--accent-cyan)]" />
                  <p className="mt-3 text-lg font-semibold text-[var(--text-primary)]">{item.title}</p>
                  <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">{item.description}</p>
                </motion.div>
              ))}
            </div>
          </motion.section>
        </Section>

        <Section>
          <motion.section {...reveal} className="grid items-center gap-12 xl:gap-16 lg:grid-cols-[1.05fr_.95fr]">
            <div className="space-y-4">
              <p className="label-premium">Simulação prática</p>
              <h2 className="text-3xl font-bold text-[var(--text-primary)] md:text-4xl">
                Menos ansiedade, mais direção no mês.
              </h2>
              <p className="text-base leading-8 text-[var(--text-secondary)]">
                Com visão centralizada e recomendações claras, você para de reagir no escuro e começa a executar um plano financeiro consistente.
              </p>
              <div className="space-y-2 text-sm leading-7 text-[var(--text-secondary)]">
                <p className="inline-flex items-center gap-2">
                  <Check size={14} className="text-[var(--accent-cyan)]" /> Acompanhamento de metas e dívidas com contexto
                </p>
                <p className="inline-flex items-center gap-2">
                  <Check size={14} className="text-[var(--accent-cyan)]" /> Ajustes práticos priorizados por impacto
                </p>
                <p className="inline-flex items-center gap-2">
                  <Check size={14} className="text-[var(--accent-cyan)]" /> Evolução mensurável sem aumentar complexidade
                </p>
              </div>
            </div>

            <div className="landing-panel landing-depth-card p-6 sm:p-7">
              <p className="label-premium">Painel de decisão</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="landing-tile p-3">
                  <p className="text-xs text-[var(--text-muted)]">Gasto mensal</p>
                  <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">R$5.940</p>
                </div>
                <div className="landing-tile p-3">
                  <p className="text-xs text-[var(--text-muted)]">Economia potencial</p>
                  <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">R$680</p>
                </div>
              </div>
              <div className="mt-4 landing-tile p-3">
                <AnimatedChart />
              </div>
            </div>
          </motion.section>
        </Section>

        <Section>
          <motion.div {...reveal} className="landing-metrics-strip">
            {[
              { label: 'Usuários ativos', value: '+12.000' },
              { label: 'Valor analisado', value: 'R$320 milhões' },
              { label: 'Relatam mais clareza', value: '94%' },
            ].map((metric) => (
              <div key={metric.label}>
                <p className="label-premium">{metric.label}</p>
                <p className="mt-2 text-3xl font-bold text-[var(--text-primary)]">{metric.value}</p>
              </div>
            ))}
            <p className="col-span-full text-sm text-[var(--text-secondary)]">Menos ansiedade. Mais controle. Mais resultado.</p>
          </motion.div>
        </Section>

        <Section>
          <motion.section {...reveal} className="space-y-3 text-center">
            <p className="label-premium">Depoimentos</p>
            <h2 className="text-3xl font-bold text-[var(--text-primary)] md:text-4xl">Histórias de quem ganhou mais clareza.</h2>
          </motion.section>
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            {[
              {
                quote: 'Eu achava que precisava ganhar mais. Descobri que estava desperdiçando dinheiro.',
                author: 'João',
              },
              {
                quote: 'Agora sei exatamente onde cortar e o que manter.',
                author: 'Mariana',
              },
              {
                quote: 'Tenho um plano claro todo mês e parei de decidir no impulso.',
                author: 'Carlos',
              },
            ].map((item) => (
              <div key={item.author} className="landing-panel p-6">
                <p className="text-base leading-7 text-[var(--text-primary)]">&ldquo;{item.quote}&rdquo;</p>
                <p className="mt-5 border-t border-[var(--border-default)] pt-4 text-sm text-[var(--text-secondary)]">— {item.author}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section>
          <div id="planos" />
          <motion.section {...reveal} className="space-y-3 text-center">
            <p className="label-premium">Planos</p>
            <h2 className="mx-auto max-w-4xl text-3xl font-bold text-[var(--text-primary)] md:text-4xl">
              Escolha o plano ideal para assumir o controle do seu dinheiro.
            </h2>
          </motion.section>

          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            {plans.map((plan) => (
              <div key={plan.name} className={cn('landing-plan', plan.highlight && 'landing-plan-pro')}>
                <div className="flex items-start justify-between gap-2">
                  <p className="text-2xl font-bold text-[var(--text-primary)]">{plan.name}</p>
                  <span className={plan.highlight ? 'badge-premium badge-premium-info px-3 py-1 text-[10px]' : 'badge-premium px-3 py-1 text-[10px]'}>{plan.badge}</span>
                </div>
                <p className="mt-3 text-3xl font-bold text-[var(--text-primary)]">{plan.price}</p>
                <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">{plan.description}</p>
                <p className="mt-2 text-xs text-[var(--text-muted)]">{plan.microcopy}</p>
                <ul className="mt-5 space-y-2">
                  {plan.features.map((feature) => (
                    <li key={`${plan.name}-${feature}`} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                      <Check size={14} className="mt-0.5 text-[var(--accent-cyan)]" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link href={plan.href} className={plan.highlight ? 'button-primary mt-6 w-full px-4 py-3 text-sm font-semibold hover:scale-[1.02]' : 'button-secondary mt-6 w-full px-4 py-3 text-sm font-semibold hover:scale-[1.02]'}>
                  {plan.ctaLabel}
                </Link>
              </div>
            ))}
          </div>

          <motion.div {...reveal} className="mt-4 flex flex-wrap items-center justify-center gap-4 text-sm text-[var(--text-secondary)]">
            <span className="inline-flex items-center gap-2">
              <Check size={14} className="text-[var(--accent-cyan)]" /> Sem contrato
            </span>
            <span className="inline-flex items-center gap-2">
              <Check size={14} className="text-[var(--accent-cyan)]" /> Cancele quando quiser
            </span>
          </motion.div>
        </Section>

        <Section>
          <div id="faq" />
          <motion.section {...reveal} className="grid gap-6 lg:grid-cols-2">
            <div className="landing-panel p-6">
              <h3 className="text-xl font-semibold text-[var(--text-primary)]">Funciona pra mim?</h3>
              <ul className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[var(--text-secondary)]">
                <li className="inline-flex items-center gap-2">
                  <Check size={14} className="text-[var(--accent-cyan)]" />
                  <span>Não precisa entender finanças</span>
                </li>
                <li className="inline-flex items-center gap-2">
                  <Check size={14} className="text-[var(--accent-cyan)]" />
                  <span>Funciona com qualquer renda</span>
                </li>
              </ul>
            </div>

            <div className="landing-panel p-6">
              <h3 className="text-xl font-semibold text-[var(--text-primary)]">Segurança</h3>
              <div className="mt-4 space-y-2 text-sm text-[var(--text-secondary)]">
                <p className="inline-flex items-center gap-2">
                  <Lock size={14} className="text-[var(--accent-cyan)]" /> Proteção de dados com criptografia
                </p>
                <p className="inline-flex items-center gap-2">
                  <MessageCircle size={14} className="text-[var(--accent-cyan)]" /> Suporte para decisões com mais confiança
                </p>
              </div>
            </div>
          </motion.section>

          <motion.section {...reveal} className="mt-6 space-y-3 text-center">
            <p className="label-premium">FAQ</p>
            <h2 className="text-3xl font-bold text-[var(--text-primary)] md:text-4xl">Objeções mais comuns.</h2>
          </motion.section>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {[
              {
                q: 'Preciso de muito tempo para usar?',
                a: 'Não. Em poucos minutos você já enxerga o panorama e as primeiras ações.',
              },
              {
                q: 'Serve para autônomo e CLT?',
                a: 'Sim. O sistema funciona para diferentes perfis de renda e rotina.',
              },
              {
                q: 'O plano Pro é suficiente?',
                a: 'Sim. É o plano recomendado para controle total com melhor custo-benefício.',
              },
              {
                q: 'Posso sair quando quiser?',
                a: 'Sim. Sem contrato e com cancelamento a qualquer momento.',
              },
            ].map((item) => (
              <details key={item.q} className="landing-panel p-5">
                <summary className="cursor-pointer list-none text-sm font-semibold text-[var(--text-primary)]">{item.q}</summary>
                <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">{item.a}</p>
              </details>
            ))}
          </div>
        </Section>

        <Section className="pt-6">
          <motion.div {...reveal} className="landing-final-cta">
            <h2 className="mx-auto max-w-3xl text-3xl font-bold text-[var(--text-primary)] md:text-5xl">Pare de perder dinheiro sem perceber.</h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-[var(--text-secondary)]">
              Descubra hoje o que está travando sua vida financeira e o que fazer para mudar isso.
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <ButtonPrimary className="px-6 py-3 text-sm hover:scale-[1.02]" onClick={() => router.push('/signup')}>
                Começar grátis agora <ArrowRight size={16} />
              </ButtonPrimary>
            </div>
            <p className="mt-4 text-sm text-[var(--text-secondary)]">Sem cartão. Sem compromisso.</p>
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
