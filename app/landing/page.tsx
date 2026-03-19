'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Space_Grotesk } from 'next/font/google';
import { motion } from 'motion/react';
import { ArrowRight, BarChart3, BrainCircuit, Check, CircleAlert, Lock, MessageCircle, Sparkles, Target, Wallet } from 'lucide-react';
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

const planBlueprint = {
  FREE: {
    name: 'Free' as const,
    badge: 'Entrada',
    description: 'Para começar a organizar sem fricção.',
    ctaLabel: 'Começar grátis',
    href: '/signup?plan=free',
    features: ['Até 10 lançamentos por mês', 'Visão consolidada inicial', 'Categorias essenciais'],
    microcopy: 'Sem cartão de crédito',
  },
  PRO: {
    name: 'Pro' as const,
    badge: 'Recomendado',
    description: 'Para controlar o mês com inteligência contínua.',
    ctaLabel: 'Começar grátis agora',
    href: '/signup?plan=pro&trial=true',
    features: ['Lançamentos ilimitados', 'Insights automáticos com IA', 'Alertas no app e WhatsApp'],
    microcopy: 'Melhor custo-benefício para evolução',
    highlight: true,
  },
  PREMIUM: {
    name: 'Premium' as const,
    badge: 'Estratégico',
    description: 'Para operar com máxima previsibilidade e profundidade.',
    ctaLabel: 'Assinar Premium',
    href: '/signup?plan=premium',
    features: ['Tudo do Pro', 'IA ilimitada', 'Previsões e camadas avançadas'],
    microcopy: 'Nível máximo de análise',
  },
};

const fallbackPlans: Plan[] = [
  {
    name: planBlueprint.FREE.name,
    badge: planBlueprint.FREE.badge,
    price: 'Grátis',
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

const partners = ['Stripe', 'OpenAI', 'Supabase', 'Vercel', 'Meta', 'Recharts'];
const reveal = { initial: { opacity: 0, y: 22 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, amount: 0.2 }, transition: { duration: 0.45 } } as const;

const painPoints = ['Dinheiro some no meio do mês sem explicação clara', 'Decisões são tomadas no impulso sem contexto', 'Ansiedade financeira cresce por falta de visão real'];

function mapPlan(plan: PublicPlanCatalogItem): Plan {
  if (plan.code === 'FREE') {
    return {
      name: planBlueprint.FREE.name,
      badge: planBlueprint.FREE.badge,
      price: 'Grátis',
      description: planBlueprint.FREE.description,
      ctaLabel: planBlueprint.FREE.ctaLabel,
      href: planBlueprint.FREE.href,
      features: plan.features.length > 0 ? plan.features.slice(0, 4) : planBlueprint.FREE.features,
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
      features: plan.features.length > 0 ? plan.features.slice(0, 4) : planBlueprint.PREMIUM.features,
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
    features: plan.features.length > 0 ? plan.features.slice(0, 4) : planBlueprint.PRO.features,
    microcopy: plan.trialDays > 0 ? `${plan.trialDays} dias de teste grátis` : planBlueprint.PRO.microcopy,
    highlight: true,
  };
}

function HeroVisual({ offset }: { offset: number }) {
  return (
    <motion.div className="landing-hero-cluster" style={{ transform: `translate3d(0, ${offset * -1}px, 0)` }} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <div className="landing-panel landing-glass p-4 sm:p-5">
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Entradas', value: 'R$ 9.120' },
            { label: 'Despesas', value: 'R$ 5.940' },
            { label: 'Margem', value: '+R$ 3.180' },
          ].map((item) => (
            <div key={item.label} className="landing-tile p-3">
              <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)]">{item.label}</p>
              <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{item.value}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 landing-tile p-3">
          <p className="label-premium">Ritmo financeiro</p>
          <svg viewBox="0 0 360 130" className="mt-2 h-28 w-full">
            <motion.path d="M0,102 C34,96 70,78 106,62 C140,48 176,50 210,62 C240,72 270,84 306,74 C330,68 346,54 360,38" fill="none" stroke="var(--primary)" strokeWidth="3.2" initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 1.1 }} />
            <motion.path d="M0,118 C30,116 62,110 96,104 C132,98 166,96 204,90 C242,84 274,82 304,88 C330,92 346,96 360,100" fill="none" stroke="var(--accent-cyan)" strokeOpacity="0.62" strokeWidth="2.2" initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 1.2, delay: 0.08 }} />
          </svg>
        </div>
      </div>

      <motion.div className="landing-float-card landing-panel p-3" animate={{ y: [0, -7, 0] }} transition={{ duration: 4.4, repeat: Infinity }}>
        <p className="text-xs text-[var(--text-secondary)]">Ajuste sugerido</p>
        <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">-12% em assinaturas</p>
      </motion.div>
      <motion.div className="landing-float-card landing-panel right p-3" animate={{ y: [0, -6, 0] }} transition={{ duration: 5.2, repeat: Infinity }}>
        <p className="text-xs text-[var(--text-secondary)]">Ganho potencial</p>
        <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">R$ 680/mês</p>
      </motion.div>
    </motion.div>
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
    { label: 'Benefícios', onClick: () => document.getElementById('beneficios')?.scrollIntoView({ behavior: 'smooth' }) },
    { label: 'Planos', onClick: () => document.getElementById('planos')?.scrollIntoView({ behavior: 'smooth' }) },
    { label: 'FAQ', onClick: () => document.getElementById('faq')?.scrollIntoView({ behavior: 'smooth' }) },
  ];

  const backgroundOffset = Math.min(scrollY * 0.08, 34);
  const heroOffset = Math.min(scrollY * 0.05, 24);

  return (
    <div className={`landing-premium-shell theme-landing-shell marketing-dark-shell min-h-screen ${displayFont.variable}`}>
      <div className="landing-premium-backdrop pointer-events-none fixed inset-0 -z-20" style={{ transform: `translate3d(0, ${backgroundOffset * -1}px, 0)` }} />
      <div className="landing-noise pointer-events-none fixed inset-0 -z-10" />
      <div className="landing-grid-overlay pointer-events-none fixed inset-0 -z-10" />

      <Header
        logo={<Link href="/" className="flex items-center"><Image src="/brand/cote-finance-ai-logo.svg" alt="Cote Finance AI" width={620} height={160} priority className="h-14 w-auto lg:h-16" /></Link>}
        navItems={navItems}
        actions={<><ButtonSecondary className="px-4 py-2 text-sm" onClick={() => router.push('/app?auth=login')}>Entrar</ButtonSecondary><ButtonPrimary className="px-4 py-2 text-sm" onClick={() => router.push('/signup')}>Começar grátis</ButtonPrimary></>}
      />

      <Container>
        <Section className="pt-14 lg:pt-20">
          <section id="produto" className="grid items-center gap-10 lg:grid-cols-[1.05fr_.95fr]">
            <motion.div {...reveal} className="space-y-6">
              <span className="badge-premium badge-premium-info px-4 py-2 text-xs"><Sparkles size={13} /> Tecnologia financeira orientada por IA</span>
              <h1 className="max-w-4xl text-4xl font-bold leading-[1.05] tracking-tight text-[var(--text-primary)] md:text-6xl">Controle financeiro não é sobre esforço, é sobre clareza.</h1>
              <p className="max-w-2xl text-base leading-7 text-[var(--text-secondary)] md:text-lg">Veja para onde o dinheiro está indo, entenda o que corrigir e tome decisões confiantes em minutos.</p>
              <div className="flex flex-wrap gap-3">
                <ButtonPrimary className="px-6 py-3 text-sm" onClick={() => router.push('/signup')}>Começar grátis <ArrowRight size={16} /></ButtonPrimary>
                <ButtonSecondary className="px-6 py-3 text-sm" onClick={() => document.getElementById('beneficios')?.scrollIntoView({ behavior: 'smooth' })}>Ver produto em ação</ButtonSecondary>
              </div>
              <p className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)]"><Check size={14} className="text-[var(--accent-cyan)]" /> Mais de 12.000 pessoas já usam para sair do modo tentativa e erro.</p>
            </motion.div>
            <HeroVisual offset={heroOffset} />
          </section>

          <motion.div {...reveal} className="mt-12 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
            {partners.map((partner) => <span key={partner}>{partner}</span>)}
          </motion.div>
        </Section>

        <Section>
          <div id="beneficios" />
          <motion.section {...reveal} className="grid items-center gap-12 lg:grid-cols-[1.04fr_.96fr]">
            <div className="space-y-4">
              <p className="label-premium">A dor real</p>
              <h2 className="text-3xl font-bold text-[var(--text-primary)] md:text-4xl">O problema não é ganhar pouco, é não enxergar o que está drenando resultado.</h2>
              <div className="space-y-3">
                {painPoints.map((item) => <p key={item} className="flex items-start gap-2 text-sm leading-7 text-[var(--text-secondary)]"><CircleAlert size={15} className="mt-1 text-[var(--accent-indigo)]" />{item}</p>)}
              </div>
            </div>
            <div className="landing-panel landing-glass p-6">
              <p className="label-premium">Clareza operacional</p>
              <div className="mt-3 grid gap-3">
                {[{ k: 'Despesas invisíveis', v: 'R$ 680' }, { k: 'Pico crítico do mês', v: 'semana 3' }, { k: 'Melhor alocação imediata', v: 'Reserva +12%' }].map((row) => (
                  <div key={row.k} className="landing-tile flex items-center justify-between p-3"><span className="text-sm text-[var(--text-secondary)]">{row.k}</span><span className="text-sm font-semibold text-[var(--text-primary)]">{row.v}</span></div>
                ))}
              </div>
            </div>
          </motion.section>
        </Section>

        <Section>
          <motion.section {...reveal} className="space-y-8">
            <div className="grid items-center gap-10 lg:grid-cols-[1fr_.95fr]">
              <div className="space-y-4">
                <p className="label-premium">Como resolve</p>
                <h3 className="text-3xl font-bold text-[var(--text-primary)]">Conecta, analisa e recomenda com contexto real do seu mês.</h3>
                <p className="text-base leading-8 text-[var(--text-secondary)]">Sem planilha manual, sem leitura técnica, sem decisões cegas.</p>
                <div className="space-y-2 text-sm text-[var(--text-secondary)]">
                  {[{ i: Wallet, t: 'Centralização de dados' }, { i: BrainCircuit, t: 'IA para padrões e desvios' }, { i: Target, t: 'Plano claro de ação' }].map((b) => (
                    <p key={b.t} className="inline-flex w-full items-center gap-2"><b.i size={15} className="text-[var(--accent-cyan)]" />{b.t}</p>
                  ))}
                </div>
              </div>
              <div className="landing-panel p-5">
                <p className="label-premium">Sinal de evolução</p>
                <div className="mt-3 landing-tile p-3">
                  <svg viewBox="0 0 320 120" className="h-28 w-full">
                    <motion.path d="M0,104 C34,92 66,74 96,58 C124,44 154,46 182,58 C210,70 238,78 268,66 C292,56 308,40 320,26" fill="none" stroke="var(--accent-cyan)" strokeWidth="3.1" initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 1.2 }} />
                  </svg>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[{ i: BarChart3, t: 'Visão de fluxo', d: 'Leia entradas, saídas e margem no mesmo contexto.' }, { i: MessageCircle, t: 'Alertas inteligentes', d: 'Receba sinais antes de perder o controle.' }, { i: BrainCircuit, t: 'Insights de impacto', d: 'Priorize o ajuste que muda resultado primeiro.' }, { i: Lock, t: 'Segurança robusta', d: 'Dados sensíveis protegidos em padrão bancário.' }].map((item) => (
                <div key={item.t} className="landing-feature-block">
                  <item.i size={16} className="text-[var(--accent-cyan)]" />
                  <h4 className="mt-3 text-base font-semibold text-[var(--text-primary)]">{item.t}</h4>
                  <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">{item.d}</p>
                </div>
              ))}
            </div>
          </motion.section>
        </Section>

        <Section>
          <motion.div {...reveal} className="landing-metrics-strip">
            {[{ label: 'Usuários ativos', value: '+12.000' }, { label: 'Volume analisado', value: 'R$ 320 milhões' }, { label: 'Relatam mais clareza', value: '94%' }].map((metric) => (
              <div key={metric.label}>
                <p className="label-premium">{metric.label}</p>
                <p className="mt-2 text-3xl font-bold text-[var(--text-primary)]">{metric.value}</p>
              </div>
            ))}
          </motion.div>
        </Section>

        <Section>
          <motion.section {...reveal} className="space-y-3 text-center">
            <p className="label-premium">Depoimentos</p>
            <h2 className="text-3xl font-bold text-[var(--text-primary)] md:text-4xl">Quem usa para de adivinhar e começa a decidir com confiança.</h2>
          </motion.section>
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            {[{ q: 'Eu troquei ansiedade por previsibilidade em menos de um mês.', a: 'João, São Paulo' }, { q: 'Os insights mostraram exatamente onde eu estava desperdiçando.', a: 'Mariana, Rio de Janeiro' }, { q: 'Agora eu tenho um plano claro do que fazer toda semana.', a: 'Carlos, Belo Horizonte' }].map((item) => (
              <div key={item.a} className="landing-panel p-6"><p className="text-base leading-7 text-[var(--text-primary)]">&ldquo;{item.q}&rdquo;</p><p className="mt-5 border-t border-[var(--border-default)] pt-4 text-sm text-[var(--text-secondary)]">{item.a}</p></div>
            ))}
          </div>
        </Section>

        <Section>
          <div id="planos" />
          <motion.section {...reveal} className="space-y-3 text-center">
            <p className="label-premium">Planos</p>
            <h2 className="mx-auto max-w-4xl text-3xl font-bold text-[var(--text-primary)] md:text-4xl">Escolha o nível ideal para ganhar clareza com consistência.</h2>
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
                  {plan.features.map((feature) => <li key={`${plan.name}-${feature}`} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]"><Check size={14} className="mt-0.5 text-[var(--accent-cyan)]" />{feature}</li>)}
                </ul>
                <Link href={plan.href} className={plan.highlight ? 'button-primary mt-6 w-full px-4 py-3 text-sm font-semibold' : 'button-secondary mt-6 w-full px-4 py-3 text-sm font-semibold'}>{plan.ctaLabel}</Link>
              </div>
            ))}
          </div>
        </Section>

        <Section>
          <div id="faq" />
          <motion.section {...reveal} className="space-y-3 text-center">
            <p className="label-premium">FAQ</p>
            <h2 className="text-3xl font-bold text-[var(--text-primary)] md:text-4xl">Dúvidas objetivas antes de começar.</h2>
          </motion.section>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {[
              { q: 'Preciso entender finanças para usar?', a: 'Não. O produto traduz dados em ação prática e direta.' },
              { q: 'Os dados estão protegidos?', a: 'Sim. Camada de segurança robusta no padrão bancário.' },
              { q: 'Posso cancelar quando quiser?', a: 'Sim. Cancelamento simples na área de assinatura.' },
              { q: 'O plano Pro é para quem?', a: 'Para quem quer controle contínuo com IA e alertas acionáveis.' },
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
            <h2 className="mx-auto max-w-3xl text-3xl font-bold text-[var(--text-primary)] md:text-5xl">Pare de adivinhar e comece a enxergar seu financeiro com inteligência.</h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-[var(--text-secondary)]">Comece grátis hoje e transforme ruído em decisão clara.</p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <ButtonPrimary className="px-6 py-3 text-sm" onClick={() => router.push('/signup')}>Começar grátis <ArrowRight size={16} /></ButtonPrimary>
              <ButtonSecondary className="px-6 py-3 text-sm" onClick={() => router.push('/app?auth=login')}>Entrar no app</ButtonSecondary>
            </div>
          </motion.div>
        </Section>
      </Container>

      <footer className="border-t border-[var(--border-default)] py-8">
        <Container className="flex flex-col items-center justify-between gap-3 text-center text-xs text-[var(--text-muted)] sm:flex-row sm:text-left">
          <p>© {new Date().getFullYear()} Cote Finance AI. Todos os direitos reservados.</p>
          <div className="flex items-center gap-4">
            <Link href="/blog" className="hover:text-[var(--text-secondary)]">Blog</Link>
            <Link href="/central-de-ajuda" className="hover:text-[var(--text-secondary)]">Ajuda</Link>
            <Link href="/termos-de-uso" className="hover:text-[var(--text-secondary)]">Termos</Link>
            <Link href="/politica-de-privacidade" className="hover:text-[var(--text-secondary)]">Privacidade</Link>
          </div>
        </Container>
      </footer>
    </div>
  );
}
