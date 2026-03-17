'use client';

import Image from 'next/image';
import Link from 'next/link';
import * as React from 'react';
import type { ReactNode } from 'react';
import { Manrope, Space_Grotesk } from 'next/font/google';
import { motion } from 'motion/react';
import {
  ArrowRight,
  BarChart3,
  BrainCircuit,
  Check,
  MessageCircle,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

const displayFont = Space_Grotesk({ subsets: ['latin'], weight: ['600', '700'], variable: '--font-display' });
const bodyFont = Manrope({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-body' });

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

const heroBullets = [
  'Análise automática dos seus gastos',
  'Insights financeiros com inteligência artificial',
  'Alertas e resumos no WhatsApp',
];

const socialBullets = ['entender seus gastos', 'organizar suas finanças', 'tomar decisões melhores'];

const invisibleExpenseExamples = [
  { label: 'Delivery frequente', monthly: 'R$350' },
  { label: 'Assinaturas esquecidas', monthly: 'R$120' },
  { label: 'Compras impulsivas', monthly: 'R$280' },
];

const savingsExamples = [
  { label: 'Delivery frequente', monthly: 'R$300' },
  { label: 'Assinaturas esquecidas', monthly: 'R$120' },
  { label: 'Compras impulsivas', monthly: 'R$250' },
  { label: 'Pequenos gastos diários', monthly: 'R$200' },
];

const solutionBullets = [
  'onde está gastando demais',
  'quais categorias consomem mais dinheiro',
  'padrões invisíveis de consumo',
  'oportunidades reais de economia',
];

const howItWorks = [
  { step: '1. Registre seus gastos', text: 'Adicione suas despesas e receitas em poucos segundos.' },
  { step: '2. O sistema analisa seus hábitos', text: 'O Cote Finance AI organiza seus gastos automaticamente e identifica padrões.' },
  { step: '3. Receba insights e alertas', text: 'Descubra onde economizar e acompanhe alertas e resumos diretamente no WhatsApp.' },
];

const functionalityCards = [
  {
    title: 'Visão por categoria',
    text: 'Veja quanto você gasta em cada área da sua vida.',
    items: ['Alimentação', 'Transporte', 'Lazer', 'Moradia', 'Compras'],
    icon: BarChart3,
    accent: 'cyan',
  },
  {
    title: 'Inteligência aplicada no dia a dia',
    text: 'Receba insights automáticos sobre seus hábitos financeiros.',
    items: ['Padrões invisíveis', 'Mudanças do mês', 'Oportunidades de ajuste'],
    icon: BrainCircuit,
    accent: 'emerald',
  },
  {
    title: 'WhatsApp no dia a dia',
    text: 'Acompanhe sua vida financeira pelo canal mais prático da rotina.',
    items: ['Resumo diário', 'Alertas importantes', 'Acompanhamento mais rápido'],
    icon: MessageCircle,
    accent: 'slate',
  },
];

const dashboardItems = [
  'resumo financeiro do mês',
  'categorias de despesas',
  'gráficos inteligentes',
  'tendências financeiras',
  'insights automáticos da IA',
];

const comparison = {
  left: ['controle manual', 'difícil manter atualizado', 'difícil identificar padrões'],
  right: ['análise automática', 'insights inteligentes', 'clareza financeira real'],
};

const transformationBullets = [
  'descobre para onde o dinheiro está indo',
  'elimina gastos desnecessários',
  'toma decisões financeiras melhores',
  'ganha tranquilidade no fim do mês',
];

const securityBullets = ['criptografia de dados', 'armazenamento seguro', 'proteção de informações sensíveis'];

const testimonials = [
  { quote: 'Descobri que gastava muito mais com delivery do que imaginava.', author: 'Mariana R.' },
  { quote: 'Agora recebo alertas no WhatsApp e acompanho tudo.', author: 'Lucas T.' },
  { quote: 'Muito mais simples que planilhas.', author: 'Rafael S.' },
];

const featuredPortraitUrl = 'https://purepng.com/public/uploads/large/purepng.com-business-manbusinessmanbusinesssalesrevenuegeneratingsuits-1421526857853si53r.png';

const fallbackPlans = [
  {
    name: 'Free',
    price: 'R$0/mês',
    href: '/signup',
    cta: 'Criar conta grátis',
    badge: 'Entrada',
    features: [
      'Dashboard financeiro',
      'Categorias automáticas',
      'Análise básica de despesas',
      'Até 10 lançamentos por mês',
      'Até 10 interações com IA por mês',
    ],
  },
  {
    name: 'Pro',
    price: 'R$29/mês',
    href: '/signup?plan=pro&trial=true',
    cta: 'Começar teste grátis',
    badge: 'Mais popular',
    highlight: true,
    features: [
      'Tudo do Free',
      'Lançamentos ilimitados',
      '500 interações com IA por mês',
      'Insights avancados da IA',
      'Alertas financeiros',
      'Resumos e alertas no WhatsApp',
      'Relatórios detalhados',
    ],
  },
  {
    name: 'Premium',
    price: 'R$49/mês',
    href: '/signup?plan=premium',
    cta: 'Assinar Premium',
    badge: 'Completo',
    features: [
      'Tudo do Pro',
      'Lançamentos ilimitados',
      'IA ilimitada',
      'Análises financeiras profundas',
      'Recomendações personalizadas',
    ],
  },
];

function toPaidLandingPlan(plan: PublicPlanCatalogItem) {
  if (plan.code === 'FREE') {
    return {
      name: 'Free',
      price: `R$${plan.monthlyPrice}/mês`,
      href: '/signup',
      cta: 'Criar conta grátis',
      badge: 'Entrada',
      features: plan.features,
    };
  }

  if (plan.code === 'PREMIUM') {
    return {
      name: 'Premium',
      price: `R$${plan.monthlyPrice}/mês`,
      href: '/signup?plan=premium',
      cta: 'Assinar Premium',
      badge: 'Completo',
      features: plan.features,
    };
  }

  return {
    name: 'Pro',
    price: `R$${plan.monthlyPrice}/mês`,
    href: plan.trialDays > 0 ? '/signup?plan=pro&trial=true' : '/signup?plan=pro',
    cta: plan.trialDays > 0 ? 'Começar teste grátis' : 'Assinar Pro',
    badge: 'Mais popular',
    highlight: true,
    features: plan.features,
  };
}

const faqs = [
  {
    question: 'Preciso conectar conta bancária?',
    answer:
      'Não. Você pode começar registrando suas receitas e despesas manualmente no app e já usar os relatórios, categorias e análises para entender melhor sua rotina financeira.',
  },
  {
    question: 'O app usa IA?',
    answer:
      'Sim. O Cote Finance AI usa inteligência artificial para interpretar seus gastos, destacar padrões, gerar insights e ajudar você a enxergar com mais clareza onde pode ajustar sua rotina financeira.',
  },
  {
    question: 'Existe plano gratuito?',
    answer:
      'Sim. Você pode criar sua conta no plano Free e começar a organizar suas finanças sem custo. Depois, se quiser mais análises, alertas, WhatsApp e recursos avançados, pode evoluir para um plano pago.',
  },
  {
    question: 'Posso cancelar quando quiser?',
    answer:
      'Sim. Você pode cancelar quando quiser, sem fidelidade. A ideia é que você teste com tranquilidade e continue apenas se fizer sentido para a sua rotina.',
  },
];

const sectionMotion = {
  initial: { opacity: 0, y: 26 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-100px' },
  transition: { duration: 0.45 },
};

function PrimaryCta({ href, children, invert = false, className = '' }: { href: string; children: ReactNode; invert?: boolean; className?: string }) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold transition-all duration-200 sm:px-6 sm:py-3.5 ${className} ${
        invert
          ? 'bg-white text-slate-950 shadow-[0_18px_44px_-18px_rgba(255,255,255,.45)] hover:-translate-y-0.5 hover:bg-slate-100'
          : 'bg-emerald-500 text-white shadow-[0_22px_54px_-22px_rgba(16,185,129,.88)] hover:-translate-y-0.5 hover:bg-emerald-400'
      }`}
    >
      {children}
      <ArrowRight size={16} />
    </Link>
  );
}

function SectionTitle({ eyebrow, title, description }: { eyebrow?: string; title: string; description?: string }) {
  return (
    <div className="space-y-3 text-center">
      {eyebrow ? (
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-500/10 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-200 shadow-[0_14px_34px_-24px_rgba(16,185,129,.9)]">
          <Sparkles size={13} /> {eyebrow}
        </span>
      ) : null}
      <h2 className="mx-auto max-w-3xl text-3xl font-bold leading-tight text-white md:text-4xl" style={{ fontFamily: 'var(--font-display)' }}>
        {title}
      </h2>
      {description ? <p className="mx-auto max-w-3xl text-base leading-7 text-slate-300 md:text-lg">{description}</p> : null}
    </div>
  );
}

function MotionCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.4 }}
      whileHover={{ y: -4 }}
      className={`shadow-[0_26px_70px_-42px_rgba(15,23,42,.95)] ${className}`}
    >
      {children}
    </motion.div>
  );
}

export default function PaidLandingClient() {
  const [plans, setPlans] = React.useState(fallbackPlans);

  React.useEffect(() => {
    let active = true;

    const run = async () => {
      try {
        const response = await fetch('/api/public/plan-catalog', { cache: 'no-store' });
        const payload = (await response.json().catch(() => null)) as { plans?: PublicPlanCatalogItem[] } | null;
        if (!response.ok || !payload?.plans?.length) return;
        if (active) {
          setPlans(payload.plans.map(toPaidLandingPlan));
        }
      } catch {
        // Mantem fallback para a LP de mídia paga caso o endpoint falhe.
      }
    };

    void run();
    return () => {
      active = false;
    };
  }, []);

  return (
    <main className={`${displayFont.variable} ${bodyFont.variable} min-h-screen overflow-x-clip bg-slate-950 text-slate-100`} style={{ fontFamily: 'var(--font-body)' }}>
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_12%_8%,rgba(16,185,129,.18),transparent_28%),radial-gradient(circle_at_88%_10%,rgba(59,130,246,.18),transparent_24%),linear-gradient(180deg,#020617_0%,#020617_54%,#0b1120_100%)]" />
      <div className="border-b border-emerald-300/12 bg-[linear-gradient(90deg,rgba(16,185,129,.12),rgba(15,23,42,.92),rgba(34,211,238,.08))] px-4 py-2 text-center text-[11px] font-medium tracking-[0.08em] text-emerald-100 sm:px-6 sm:text-xs">
        Entenda melhor seus gastos • Sem planilhas complicadas
      </div>
      <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/70 backdrop-blur-2xl">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:gap-4 sm:px-6 sm:py-4">
          <Link href="/lp" className="flex items-center">
            <Image src="/brand/cote-finance-ai-logo.svg" alt="Cote Finance AI" width={680} height={180} className="h-16 w-auto sm:h-16 lg:h-20" priority />
          </Link>
          <PrimaryCta href="/signup" className="shrink-0 px-4 py-2.5 text-xs sm:px-6 sm:py-3.5 sm:text-sm">Criar conta grátis</PrimaryCta>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 pb-20 pt-6 sm:px-6 sm:gap-20 sm:pb-28 sm:pt-8">
        <section className="grid items-center gap-8 lg:grid-cols-[1.04fr_.96fr] lg:gap-14">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }} className="space-y-6 text-center lg:space-y-7 lg:text-left">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3.5 py-1.5 text-xs font-semibold text-emerald-200 shadow-[0_16px_40px_-28px_rgba(16,185,129,.95)]"><Sparkles size={14} /> Mais controle sobre o seu dinheiro</span>
            <h1 className="text-[2.15rem] font-bold leading-[1.04] text-white sm:text-5xl lg:text-[4.2rem]" style={{ fontFamily: 'var(--font-display)' }}>Seu dinheiro está sumindo e você nem sabe por quê</h1>
            <div className="space-y-3 text-[15px] leading-7 text-slate-300 sm:text-lg">
              <p>O Cote Finance AI analisa seus gastos e mostra exatamente para onde seu dinheiro está indo e o que está drenando sua renda.</p>
              <p>Entenda seus hábitos financeiros, descubra desperdícios invisíveis e tome decisões melhores sem planilhas complicadas.</p>
            </div>
            <div className="space-y-3">
              {heroBullets.map((item, index) => (
                <motion.div key={item} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.35, delay: 0.12 + index * 0.06 }} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-slate-900/55 px-4 py-3 text-left text-sm text-slate-100 shadow-[0_18px_44px_-30px_rgba(15,23,42,.95)] backdrop-blur-sm sm:items-center sm:text-base">
                  <Check size={16} className="shrink-0 text-emerald-300" />
                  <span>{item}</span>
                </motion.div>
              ))}
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center lg:justify-start">
              <PrimaryCta href="/signup" className="shrink-0 px-4 py-2.5 text-xs sm:px-6 sm:py-3.5 sm:text-sm">Criar conta grátis</PrimaryCta>
              <p className="text-sm text-slate-400">Comece grátis e veja seus gastos com mais clareza</p>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.08 }} className="relative mx-auto w-full max-w-xl px-1 sm:px-0">
            <div className="absolute -inset-3 rounded-[2rem] bg-[radial-gradient(circle_at_30%_15%,rgba(16,185,129,.38),transparent_48%),radial-gradient(circle_at_80%_82%,rgba(59,130,246,.2),transparent_44%)] blur-3xl sm:-inset-6 sm:rounded-[2.4rem] sm:bg-[radial-gradient(circle_at_30%_15%,rgba(16,185,129,.46),transparent_48%),radial-gradient(circle_at_80%_82%,rgba(59,130,246,.26),transparent_44%)]" />
            <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-emerald-300/40 to-transparent sm:inset-x-8" />
            <div className="relative overflow-hidden rounded-[1.65rem] border border-white/10 bg-slate-900/78 p-3.5 shadow-[0_34px_110px_-40px_rgba(16,185,129,.72)] sm:rounded-[2rem] sm:p-4">
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,.04),transparent_20%,transparent_80%,rgba(255,255,255,.03))]" />
              <div className="mb-4 flex items-center justify-between rounded-xl bg-slate-950/80 px-4 py-2">
                <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Dashboard do Cote Finance AI</p>
                <span className="rounded-full border border-emerald-300/25 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-200">IA ativa</span>
              </div>
              <div className="mb-4 grid gap-3 sm:grid-cols-3">
                {[
                  { label: 'Saldo total', value: 'R$ 12.830', accent: 'emerald' },
                  { label: 'Receitas', value: 'R$ 9.430', accent: 'cyan' },
                  { label: 'Despesas', value: 'R$ 4.180', accent: 'rose' },
                ].map((item, index) => (
                  <motion.div key={item.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 + index * 0.08 }} className={`rounded-xl border p-3 ${item.accent === 'emerald' ? 'border-emerald-300/30 bg-emerald-500/10' : item.accent === 'cyan' ? 'border-cyan-300/30 bg-cyan-500/10' : 'border-rose-300/30 bg-rose-500/10'}`}>
                    <p className="text-[11px] text-slate-200/80">{item.label}</p>
                    <p className="text-base font-bold text-white">{item.value}</p>
                  </motion.div>
                ))}
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,.03)]">
                <div className="mb-3 flex items-center justify-between text-xs text-slate-400"><span>Receitas x despesas (6 meses)</span><span>Atualizado agora</span></div>
                <svg viewBox="0 0 320 120" className="h-32 w-full sm:h-36">
                  <path d="M0,88 C28,78 48,42 74,36 C100,30 122,52 149,42 C176,32 200,18 226,16 C252,14 274,30 300,32 C312,33 318,26 320,24" fill="none" stroke="rgba(16,185,129,.95)" strokeWidth="3.5" />
                  <path d="M0,108 C22,106 48,95 74,90 C98,86 122,98 149,94 C176,90 200,76 226,80 C252,84 274,90 300,94 C312,96 318,92 320,89" fill="none" stroke="rgba(251,113,133,.92)" strokeWidth="3.5" />
                  <circle cx="300" cy="32" r="4" fill="rgba(16,185,129,.95)" />
                </svg>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-[1.1fr_.9fr]">
                <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,.03)]">
                  <p className="mb-3 text-xs text-slate-400">Categorias do mês</p>
                  <div className="space-y-3">
                    {[
                      { name: 'Delivery', width: '82%', color: 'bg-emerald-400' },
                      { name: 'Assinaturas', width: '61%', color: 'bg-cyan-400' },
                      { name: 'Compras', width: '49%', color: 'bg-sky-400' },
                    ].map((item, index) => (
                      <div key={item.name} className="space-y-1">
                        <div className="flex items-center justify-between text-xs text-slate-300"><span>{item.name}</span><span>{item.width}</span></div>
                        <div className="h-2 overflow-hidden rounded-full bg-white/10"><motion.div initial={{ width: 0 }} animate={{ width: item.width }} transition={{ duration: 0.8, delay: 0.35 + index * 0.08 }} className={`h-full rounded-full ${item.color}`} /></div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-3">
                  <motion.div animate={{ y: [0, -3, 0] }} transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }} className="rounded-2xl border border-emerald-300/25 bg-emerald-500/10 p-3 shadow-[0_20px_40px_-28px_rgba(16,185,129,.8)]">
                    <p className="mb-1 text-[11px] text-emerald-200">Insight IA</p>
                    <p className="text-sm text-emerald-50">Delivery subiu 18%. Existe espaço para economizar neste mês.</p>
                  </motion.div>
                  <motion.div animate={{ y: [0, 3, 0] }} transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut' }} className="rounded-2xl border border-cyan-300/25 bg-cyan-500/10 p-3 shadow-[0_20px_40px_-28px_rgba(34,211,238,.75)]">
                    <p className="mb-1 text-[11px] text-cyan-200">WhatsApp</p>
                    <p className="text-sm text-cyan-50">Resumo automático entregue com o que mais merece sua atenção.</p>
                  </motion.div>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        <motion.section
          {...sectionMotion}
          className="overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,.86),rgba(15,23,42,.62))] p-6 shadow-[0_32px_90px_-60px_rgba(15,23,42,.95)] md:p-8"
        >
          <div className="grid gap-8 xl:grid-cols-[1.08fr_.92fr] xl:items-stretch">
            <div className="space-y-5">
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35 }}
                className="space-y-4"
              >
                <p className="text-amber-300">★★★★★</p>
                <h2 className="max-w-2xl text-2xl font-bold text-white md:text-3xl" style={{ fontFamily: 'var(--font-display)' }}>
                  Mais de 1.000 pessoas já começaram a organizar suas finanças com o Cote Finance AI.
                </h2>
                <p className="max-w-2xl text-slate-300">
                  Uma rotina financeira mais clara começa quando você finalmente enxerga o que antes passava despercebido.
                </p>
              </motion.div>

              <div className="grid gap-3 sm:grid-cols-3">
                <motion.div
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.35, delay: 0.04 }}
                  className="rounded-[1.4rem] border border-white/10 bg-slate-950/60 p-4"
                >
                  <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Usuários</p>
                  <p className="mt-2 text-2xl font-bold text-white">+1.000</p>
                  <p className="mt-1 text-sm text-slate-400">organizando melhor receitas, despesas e hábitos</p>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.35, delay: 0.1 }}
                  className="rounded-[1.4rem] border border-emerald-300/18 bg-emerald-500/10 p-4"
                >
                  <p className="text-[11px] uppercase tracking-[0.22em] text-emerald-200">Resultado</p>
                  <p className="mt-2 text-2xl font-bold text-white">Mais controle</p>
                  <p className="mt-1 text-sm text-emerald-50/80">para agir com mais segurança ao longo do mês</p>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.35, delay: 0.16 }}
                  className="rounded-[1.4rem] border border-cyan-300/18 bg-cyan-500/10 p-4"
                >
                  <p className="text-[11px] uppercase tracking-[0.22em] text-cyan-200">Rotina</p>
                  <p className="mt-2 text-2xl font-bold text-white">Sem planilhas</p>
                  <p className="mt-1 text-sm text-cyan-50/80">com alertas e leituras simples no dia a dia</p>
                </motion.div>
              </div>

              <div className="flex flex-wrap gap-3 border-t border-white/10 pt-4 text-sm text-slate-200">
                {socialBullets.map((item, index) => (
                  <motion.span
                    key={item}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: 0.12 + index * 0.05 }}
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5"
                  >
                    <Check size={14} className="text-emerald-300" /> {item}
                  </motion.span>
                ))}
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, x: 18 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
              className="relative overflow-hidden rounded-[1.85rem] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,.78),rgba(2,6,23,.96))] p-6 shadow-[0_28px_72px_-48px_rgba(16,185,129,.35)]"
            >
              <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-emerald-300/30 to-transparent" />
              <div className="absolute -right-12 top-10 h-28 w-28 rounded-full bg-emerald-500/12 blur-3xl" />
              <p className="text-xs uppercase tracking-[0.22em] text-slate-500">História real de quem ganhou mais controle</p>
              <p className="mt-5 text-lg leading-8 text-slate-100 md:text-[1.15rem]">
                &ldquo;Finalmente entendi para onde meu dinheiro estava indo e onde eu podia economizar sem mexer em tudo.&rdquo;
              </p>
              <div className="mt-6 flex items-center gap-4 border-t border-white/10 pt-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/12 text-sm font-bold text-emerald-100">MR</div>
                <div>
                  <p className="text-sm font-semibold text-white">Mariana R.</p>
                  <p className="text-xs text-slate-400">Usuária do Cote Finance AI</p>
                </div>
              </div>
              <div className="mt-6 flex items-start">
                <PrimaryCta href="/signup" className="w-full sm:w-auto sm:px-6 sm:py-3.5">Criar conta grátis</PrimaryCta>
              </div>
            </motion.div>
          </div>
        </motion.section>

        <motion.section {...sectionMotion} className="grid gap-6 lg:grid-cols-2">
          <MotionCard className="rounded-[2rem] border border-white/10 bg-slate-900/55 p-6 md:p-8">
            <h2 className="mb-4 text-3xl font-bold text-white md:text-4xl" style={{ fontFamily: 'var(--font-display)' }}>O problema não é quanto você ganha.</h2>
            <p className="mb-5 text-lg text-slate-300">A maioria das pessoas acredita que precisa ganhar mais dinheiro.</p>
            <p className="mb-5 text-slate-300">Mas na prática, o problema é outro. Você não consegue enxergar para onde o dinheiro está indo.</p>
            <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-5">
              <p className="mb-4 text-slate-300">No começo do mês parece que tudo está sob controle.</p>
              <ul className="space-y-3 text-slate-200">
                <li className="flex items-center gap-3"><Check size={16} className="text-emerald-300" /> o salário entra</li>
                <li className="flex items-center gap-3"><Check size={16} className="text-emerald-300" /> algumas contas são pagas</li>
              </ul>
            </div>
            <div className="mt-5 rounded-2xl border border-rose-300/20 bg-rose-500/10 p-4 text-slate-100">
              <p className="mb-2 font-semibold">Mas então aparecem:</p>
              <ul className="space-y-2 text-sm text-rose-50">
                <li>- pequenas compras</li>
                <li>- assinaturas esquecidas</li>
                <li>- gastos invisíveis</li>
              </ul>
              <p className="mt-4 font-semibold">E no final do mês o dinheiro simplesmente desaparece.</p>
            </div>
          </MotionCard>

          <MotionCard className="rounded-[2rem] border border-white/10 bg-slate-900/55 p-6 md:p-8">
            <h2 className="mb-4 text-3xl font-bold text-white md:text-4xl" style={{ fontFamily: 'var(--font-display)' }}>Quanto dinheiro você pode estar perdendo?</h2>
            <p className="mb-5 text-slate-300">A maioria das pessoas perde dinheiro sem perceber.</p>
            <p className="mb-5 text-slate-300">Pequenos gastos que parecem inofensivos podem somar valores enormes.</p>
            <div className="space-y-3 rounded-2xl border border-white/10 bg-slate-950/70 p-5">
              {invisibleExpenseExamples.map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-4 border-b border-white/10 pb-3 text-sm last:border-none last:pb-0"><span className="text-slate-300">{item.label}</span><span className="font-semibold text-white">{item.monthly}</span></div>
              ))}
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-amber-300/25 bg-amber-500/10 p-4"><p className="text-xs uppercase tracking-[0.22em] text-amber-200">Total perdido</p><p className="mt-2 text-2xl font-bold text-white">R$750 por mês</p></div>
              <div className="rounded-2xl border border-emerald-300/25 bg-emerald-500/10 p-4"><p className="text-xs uppercase tracking-[0.22em] text-emerald-200">Em um ano</p><p className="mt-2 text-2xl font-bold text-white">R$9.000 ou mais</p></div>
            </div>
            <p className="mt-5 text-slate-300">O problema não é gastar. O problema é não enxergar o que está acontecendo.</p>
          </MotionCard>
        </motion.section>
        <motion.section {...sectionMotion} className="grid gap-8 lg:grid-cols-[1fr_.95fr] lg:items-center">
          <div className="space-y-5">
            <h2 className="text-3xl font-bold text-white md:text-4xl" style={{ fontFamily: 'var(--font-display)' }}>O Cote Finance AI mostra exatamente para onde seu dinheiro está indo.</h2>
            <p className="text-lg text-slate-300">Ele funciona como um raio-X da sua vida financeira.</p>
            <p className="text-slate-300">O sistema analisa seus gastos e transforma tudo em informações simples.</p>
            <ul className="space-y-3 text-slate-200">
              {solutionBullets.map((item) => (
                <li key={item} className="flex items-center gap-3"><Check size={16} className="text-emerald-300" /><span>{item}</span></li>
              ))}
            </ul>
            <p className="text-slate-300">Tudo explicado de forma simples, visual e prática.</p>
          </div>
          <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.2 }} className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,.82),rgba(15,23,42,.68))] p-5 shadow-[0_28px_74px_-44px_rgba(15,23,42,.95)]">
            <div className="grid gap-4 sm:grid-cols-2">
              {functionalityCards.map((card) => (
                <div key={card.title} className={`rounded-2xl border p-4 ${card.accent === 'cyan' ? 'border-cyan-300/25 bg-cyan-500/10' : card.accent === 'emerald' ? 'border-emerald-300/25 bg-emerald-500/10' : 'border-white/10 bg-slate-950/70 sm:col-span-2'}`}>
                  <card.icon size={18} className="mb-3 text-white" />
                  <p className="font-semibold text-white">{card.title}</p>
                  <p className="mt-2 text-sm text-slate-300">{card.text}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {card.items.map((item) => (
                      <span key={item} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200">{item}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.section>

        <motion.section {...sectionMotion} className="rounded-[2rem] border border-white/10 bg-slate-900/55 p-6 md:p-8">
          <SectionTitle eyebrow="Como funciona" title="Começar é simples." />
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {howItWorks.map((item, index) => (
              <MotionCard key={item.step} className="rounded-2xl border border-white/10 bg-slate-950/70 p-4 sm:p-5">
                <p className="mb-3 text-sm font-semibold text-emerald-200">{item.step}</p>
                <p className="text-slate-300">{item.text}</p>
                <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/10"><motion.div initial={{ width: 0 }} whileInView={{ width: `${(index + 1) * 33}%` }} viewport={{ once: true }} transition={{ duration: 0.5, delay: index * 0.08 }} className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400" /></div>
              </MotionCard>
            ))}
          </div>
        </motion.section>

        <motion.section {...sectionMotion} className="rounded-[2rem] border border-white/10 bg-slate-900/55 p-6 md:p-8">
          <SectionTitle eyebrow="Dashboard" title="Um dashboard simples. Uma visão completa." description="Em poucos segundos você consegue ver:" />
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {dashboardItems.map((item) => (
              <MotionCard key={item} className="rounded-2xl border border-white/10 bg-slate-950/70 p-4 text-sm text-slate-200"><div className="flex items-start gap-3"><Check size={16} className="mt-0.5 shrink-0 text-emerald-300" /><span>{item}</span></div></MotionCard>
            ))}
          </div>
        </motion.section>

        <motion.section {...sectionMotion} className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,.86),rgba(15,23,42,.62))] p-6 md:p-8">
          <SectionTitle eyebrow="Simulação de ganho" title="Quanto dinheiro você pode economizar ao entender seus gastos?" />
          <div className="mt-8 grid gap-6 lg:grid-cols-[1.05fr_.95fr]">
            <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/70 p-5">
              {savingsExamples.map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-4 border-b border-white/10 pb-3 text-sm last:border-none last:pb-0"><span className="text-slate-300">{item.label}</span><span className="font-semibold text-white">{item.monthly}</span></div>
              ))}
              <div className="grid gap-3 pt-2 sm:grid-cols-2">
                <div className="rounded-2xl border border-rose-300/20 bg-rose-500/10 p-4"><p className="text-xs uppercase tracking-[0.22em] text-rose-200">Possível desperdício</p><p className="mt-2 text-2xl font-bold text-white">R$870 por mês</p></div>
                <div className="rounded-2xl border border-emerald-300/20 bg-emerald-500/10 p-4"><p className="text-xs uppercase tracking-[0.22em] text-emerald-200">Em um ano</p><p className="mt-2 text-2xl font-bold text-white">R$10.440</p></div>
              </div>
            </div>
            <div className="space-y-4 rounded-2xl border border-emerald-300/20 bg-emerald-500/10 p-5">
              <p className="text-slate-100">A maioria das pessoas nem percebe que está perdendo esse dinheiro.</p>
              <div className="space-y-3 text-slate-50">
                <p>Com o Cote Finance AI você consegue:</p>
                <ul className="space-y-2">
                  <li className="flex items-center gap-3"><Check size={16} className="text-emerald-200" /> identificar gastos invisíveis</li>
                  <li className="flex items-center gap-3"><Check size={16} className="text-emerald-200" /> descobrir hábitos que drenam sua renda</li>
                  <li className="flex items-center gap-3"><Check size={16} className="text-emerald-200" /> encontrar oportunidades reais de economia</li>
                </ul>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-4"><p className="text-sm text-slate-100">Muitos usuários relatam economias de <span className="font-semibold text-white">R$300 a R$1000 por mês</span> apenas entendendo melhor seus gastos.</p></div>
              <div className="pt-2"><PrimaryCta href="/signup">Descubra quanto você pode economizar</PrimaryCta></div>
            </div>
          </div>
        </motion.section>
        <motion.section {...sectionMotion} className="grid gap-6 xl:grid-cols-[1.04fr_.96fr]">
          <MotionCard className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,.76),rgba(15,23,42,.58))] p-6 md:p-8">
            <div className="space-y-5">
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Comparação</p>
                <h2 className="text-3xl font-bold text-white md:text-4xl" style={{ fontFamily: 'var(--font-display)' }}>Planilhas vs Inteligência Financeira</h2>
                <p className="max-w-2xl text-slate-300">Controle manual consome tempo. Quando o sistema interpreta seus gastos por você, fica mais fácil agir com segurança.</p>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="flex h-full flex-col rounded-[1.75rem] border border-white/10 bg-slate-950/70 p-5">
                  <div className="mb-5 space-y-3">
                    <span className="inline-flex w-fit rounded-full border border-rose-300/15 bg-rose-500/10 px-3 py-1 text-[11px] font-medium text-rose-200">Mais esforço</span>
                    <h3 className="text-xl font-semibold text-white">Planilhas</h3>
                  </div>
                  <ul className="space-y-3 text-slate-300">
                    {comparison.left.map((item) => (
                      <li key={item} className="flex min-h-14 items-start gap-3 rounded-xl border border-white/6 bg-white/[0.02] px-3 py-3">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-500/12 text-xs text-rose-300">✕</span>
                        <span className="leading-6">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex h-full flex-col rounded-[1.75rem] border border-emerald-300/22 bg-[linear-gradient(180deg,rgba(16,185,129,.14),rgba(15,23,42,.78))] p-5 shadow-[0_22px_52px_-34px_rgba(16,185,129,.36)]">
                  <div className="mb-5 space-y-3">
                    <span className="inline-flex w-fit rounded-full border border-emerald-300/15 bg-emerald-500/10 px-3 py-1 text-[11px] font-medium text-emerald-100">Mais clareza</span>
                    <h3 className="text-xl font-semibold text-white">Cote Finance AI</h3>
                  </div>
                  <ul className="space-y-3 text-emerald-50">
                    {comparison.right.map((item) => (
                      <li key={item} className="flex min-h-14 items-start gap-3 rounded-xl border border-emerald-300/10 bg-white/[0.03] px-3 py-3">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/14 text-emerald-200">
                          <Check size={12} />
                        </span>
                        <span className="leading-6">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </MotionCard>

          <MotionCard className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,.76),rgba(15,23,42,.58))] p-6 md:p-8">
            <div className="space-y-5">
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Transformação</p>
                <h2 className="text-3xl font-bold text-white md:text-4xl" style={{ fontFamily: 'var(--font-display)' }}>Quando você entende seu dinheiro, tudo muda.</h2>
                <p className="max-w-2xl text-slate-300">Quando você enxerga melhor o seu dinheiro, fica mais fácil ajustar hábitos, cortar excessos e terminar o mês com mais tranquilidade.</p>
              </div>
              <div className="grid gap-3">
                {transformationBullets.map((item) => (
                  <motion.div key={item} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.35 }} className="rounded-[1.35rem] border border-white/10 bg-slate-950/70 px-4 py-4 shadow-[0_18px_44px_-30px_rgba(15,23,42,.95)]">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/12 text-emerald-300">
                        <Check size={14} />
                      </span>
                      <p className="text-slate-100">{item}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
              <div className="rounded-[1.5rem] border border-emerald-300/16 bg-[linear-gradient(180deg,rgba(16,185,129,.12),rgba(15,23,42,.82))] p-5">
                <p className="text-sm leading-7 text-emerald-100">Mais contexto para decidir melhor, reduzir excessos e ter uma rotina financeira muito mais previsível.</p>
              </div>
            </div>
          </MotionCard>
        </motion.section>

        <motion.section {...sectionMotion} className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,.82),rgba(15,23,42,.62))] p-6 md:p-8">
          <SectionTitle eyebrow="Segurança e privacidade" title="Suas informações são 100% privadas." description="Seus dados financeiros são extremamente importantes." />
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {securityBullets.map((item) => (
              <MotionCard key={item} className="rounded-2xl border border-white/10 bg-slate-950/70 p-5"><ShieldCheck size={18} className="mb-3 text-emerald-300" /><p className="font-semibold text-white">{item}</p></MotionCard>
            ))}
          </div>
        </motion.section>

        <motion.section {...sectionMotion} className="space-y-6">
          <SectionTitle title="Quem usa entende rápido a diferença." />
          <div className="grid gap-4 md:grid-cols-3">
            {testimonials.map((item) => (
              <MotionCard key={item.author} className="rounded-[1.75rem] border border-white/10 bg-slate-900/55 p-6 backdrop-blur-sm"><p className="text-slate-100">&ldquo;{item.quote}&rdquo;</p><footer className="mt-4 text-sm text-slate-400">- {item.author}</footer></MotionCard>
            ))}
          </div>
        </motion.section>

        <motion.section {...sectionMotion} className="space-y-6" id="planos">
          <SectionTitle title="Comece gratuitamente" />
          <div className="grid gap-4 lg:grid-cols-3">
            {plans.map((plan) => (
              <MotionCard key={plan.name} className={`relative flex h-full flex-col overflow-hidden rounded-[28px] border p-5 sm:rounded-[30px] sm:p-6 ${plan.highlight ? 'border-emerald-300/45 bg-gradient-to-b from-emerald-400/18 via-white/10 to-white/8 shadow-[0_34px_100px_rgba(16,185,129,0.24)] lg:-translate-y-3' : 'border-white/10 bg-slate-900/55'}`}>
                <span className={`inline-flex w-fit rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] ${plan.highlight ? 'bg-emerald-500 text-white' : 'border border-white/10 bg-white/5 text-slate-300'}`}>{plan.badge}</span>
                <div className="mt-4 space-y-2"><h3 className="text-2xl font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>{plan.name}</h3><p className="text-3xl font-semibold text-white">{plan.price}</p></div>
                <ul className="mb-6 mt-6 space-y-3 text-sm text-slate-200">{plan.features.map((feature) => <li key={feature} className="flex items-start gap-2"><Check size={15} className="mt-0.5 shrink-0 text-emerald-300" /><span>{feature}</span></li>)}</ul>
                <Link href={plan.href} className={`mt-auto inline-flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-bold transition-colors sm:w-auto ${plan.highlight ? 'bg-emerald-500 text-white hover:bg-emerald-600' : 'bg-slate-100 text-slate-900 hover:bg-white'}`}>{plan.cta}</Link>
              </MotionCard>
            ))}
          </div>
        </motion.section>

        <motion.section {...sectionMotion} className="rounded-[2rem] border border-white/10 bg-slate-900/55 p-6 md:p-8">
          <SectionTitle title="Perguntas frequentes" />
          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            {faqs.map((item) => (
              <motion.details key={item.question} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.35 }} className="rounded-2xl border border-white/10 bg-slate-950/70 p-5">
                <summary className="cursor-pointer list-none font-semibold text-white">{item.question}</summary>
                <p className="mt-3 text-sm leading-7 text-slate-300">{item.answer}</p>
              </motion.details>
            ))}
          </div>
        </motion.section>

        <motion.section {...sectionMotion} className="rounded-[2rem] border border-emerald-300/20 bg-[linear-gradient(180deg,rgba(16,185,129,0.14),rgba(15,23,42,0.94)_35%,rgba(2,6,23,0.98)_100%)] px-5 py-9 text-center sm:px-6 md:px-10">
          <h2 className="mx-auto max-w-3xl text-3xl font-bold text-white md:text-5xl" style={{ fontFamily: 'var(--font-display)' }}>Descubra para onde seu dinheiro realmente está indo.</h2>
          <p className="mx-auto mt-4 max-w-2xl text-slate-200">Comece gratuitamente e tenha uma visão clara da sua vida financeira.</p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3">
            <PrimaryCta href="/signup" invert className="w-full sm:w-auto">Criar conta grátis</PrimaryCta>
            <p className="text-sm text-slate-400">Sem compromisso para começar</p>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300"><ShieldCheck size={14} className="text-emerald-300" /> Seus dados protegidos com criptografia</div>
          </div>
        </motion.section>
      </div>
    </main>
  );
}


































