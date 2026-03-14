'use client';

import Image from 'next/image';
import Link from 'next/link';
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

const heroBullets = [
  'Analise automatica dos seus gastos',
  'Insights financeiros com inteligencia artificial',
  'Alertas e resumos no WhatsApp',
];

const socialBullets = ['entender seus gastos', 'organizar suas financas', 'tomar decisoes melhores'];

const invisibleExpenseExamples = [
  { label: 'Delivery frequente', monthly: 'R$350' },
  { label: 'Assinaturas esquecidas', monthly: 'R$120' },
  { label: 'Compras impulsivas', monthly: 'R$280' },
];

const savingsExamples = [
  { label: 'Delivery frequente', monthly: 'R$300' },
  { label: 'Assinaturas esquecidas', monthly: 'R$120' },
  { label: 'Compras impulsivas', monthly: 'R$250' },
  { label: 'Pequenos gastos diarios', monthly: 'R$200' },
];

const solutionBullets = [
  'onde esta gastando demais',
  'quais categorias consomem mais dinheiro',
  'padroes invisiveis de consumo',
  'oportunidades reais de economia',
];

const howItWorks = [
  { step: '1. Registre seus gastos', text: 'Adicione suas despesas e receitas em poucos segundos.' },
  { step: '2. O sistema analisa seus habitos', text: 'O Cote Finance AI organiza seus gastos automaticamente e identifica padroes.' },
  { step: '3. Receba insights e alertas', text: 'Descubra onde economizar e receba resumos diretamente no WhatsApp.' },
];

const functionalityCards = [
  {
    title: 'Visao por categoria',
    text: 'Veja quanto voce gasta em cada area da sua vida.',
    items: ['Alimentacao', 'Transporte', 'Lazer', 'Moradia', 'Compras'],
    icon: BarChart3,
    accent: 'cyan',
  },
  {
    title: 'Inteligencia aplicada no dia a dia',
    text: 'Receba insights automaticos sobre seus habitos financeiros.',
    items: ['Padroes invisiveis', 'Mudancas do mes', 'Oportunidades de ajuste'],
    icon: BrainCircuit,
    accent: 'emerald',
  },
  {
    title: 'Alertas no WhatsApp',
    text: 'Acompanhe sua vida financeira sem precisar abrir o app o tempo todo.',
    items: ['Resumo diario', 'Alertas importantes', 'Lembretes uteis'],
    icon: MessageCircle,
    accent: 'slate',
  },
];

const dashboardItems = [
  'resumo financeiro do mes',
  'categorias de despesas',
  'graficos inteligentes',
  'tendencias financeiras',
  'insights automaticos da IA',
];

const comparison = {
  left: ['controle manual', 'dificil manter atualizado', 'dificil identificar padroes'],
  right: ['analise automatica', 'insights inteligentes', 'clareza financeira real'],
};

const transformationBullets = [
  'descobre para onde o dinheiro esta indo',
  'elimina gastos desnecessarios',
  'toma decisoes financeiras melhores',
  'ganha tranquilidade no fim do mes',
];

const securityBullets = ['criptografia de dados', 'armazenamento seguro', 'protecao de informacoes sensiveis'];

const testimonials = [
  { quote: 'Descobri que gastava muito mais com delivery do que imaginava.', author: 'Mariana R.' },
  { quote: 'Agora recebo alertas no WhatsApp e acompanho tudo.', author: 'Lucas T.' },
  { quote: 'Muito mais simples que planilhas.', author: 'Rafael S.' },
];

const plans = [
  {
    name: 'Free',
    price: 'R$0/mes',
    href: '/signup',
    cta: 'Criar conta gratis',
    badge: 'Entrada',
    features: [
      'Dashboard financeiro',
      'Categorias automaticas',
      'Analise basica de despesas',
      'Ate 15 lancamentos por mes',
      'Ate 15 interacoes com IA por mes',
    ],
  },
  {
    name: 'Pro',
    price: 'R$29/mes',
    href: '/signup?plan=pro&trial=true',
    cta: 'Comecar teste gratis',
    badge: 'Mais popular',
    highlight: true,
    features: [
      'Tudo do Free',
      'Lancamentos ilimitados',
      '500 interacoes com IA por mes',
      'Insights avancados da IA',
      'Alertas financeiros',
      'Resumos no WhatsApp',
      'Relatorios detalhados',
    ],
  },
  {
    name: 'Premium',
    price: 'R$49/mes',
    href: '/signup?plan=premium',
    cta: 'Assinar Premium',
    badge: 'Completo',
    features: [
      'Tudo do Pro',
      'Lancamentos ilimitados',
      'IA ilimitada',
      'Analises financeiras profundas',
      'Recomendacoes personalizadas',
    ],
  },
];

const faqs = [
  { question: 'Preciso conectar conta bancaria?', answer: 'Nao.' },
  { question: 'O app usa IA?', answer: 'Sim, para gerar insights e analises financeiras.' },
  { question: 'Existe plano gratuito?', answer: 'Sim.' },
  { question: 'Posso cancelar quando quiser?', answer: 'Sim.' },
];

const sectionMotion = {
  initial: { opacity: 0, y: 26 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-100px' },
  transition: { duration: 0.45 },
};

function PrimaryCta({ href, children, invert = false }: { href: string; children: ReactNode; invert?: boolean }) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3.5 text-sm font-bold transition-all duration-200 ${
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
  return (
    <main className={`${displayFont.variable} ${bodyFont.variable} min-h-screen overflow-x-clip bg-slate-950 text-slate-100`} style={{ fontFamily: 'var(--font-body)' }}>
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_12%_8%,rgba(16,185,129,.18),transparent_28%),radial-gradient(circle_at_88%_10%,rgba(59,130,246,.18),transparent_24%),linear-gradient(180deg,#020617_0%,#020617_54%,#0b1120_100%)]" />
      <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/70 backdrop-blur-2xl">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/lp" className="flex items-center gap-3">
            <Image src="/brand/cote-favicon.svg" alt="Cote Finance AI" width={40} height={40} className="h-10 w-10" priority />
            <Image src="/brand/cote-finance-ai-logo.svg" alt="Cote Finance AI" width={420} height={120} className="hidden h-10 w-auto sm:block" priority />
          </Link>
          <PrimaryCta href="/signup">Criar conta gratis</PrimaryCta>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-16 px-4 pb-24 pt-8 sm:px-6 sm:gap-20 sm:pb-28">
        <section className="grid items-center gap-10 lg:grid-cols-[1.04fr_.96fr] lg:gap-14">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }} className="space-y-7 text-center lg:text-left">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3.5 py-1.5 text-xs font-semibold text-emerald-200 shadow-[0_16px_40px_-28px_rgba(16,185,129,.95)]"><Sparkles size={14} /> Leva menos de 30 segundos.</span>
            <h1 className="text-[2.55rem] font-bold leading-[1.04] text-white sm:text-5xl lg:text-[4.2rem]" style={{ fontFamily: 'var(--font-display)' }}>Seu dinheiro esta sumindo - e voce nem sabe por que.</h1>
            <div className="space-y-3 text-base leading-7 text-slate-300 sm:text-lg">
              <p>O Cote Finance AI analisa seus gastos e mostra exatamente para onde seu dinheiro esta indo e o que esta drenando sua renda.</p>
              <p>Entenda seus habitos financeiros, descubra desperdicios invisiveis e tome decisoes melhores sem planilhas complicadas.</p>
            </div>
            <div className="space-y-3">
              {heroBullets.map((item, index) => (
                <motion.div key={item} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.35, delay: 0.12 + index * 0.06 }} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-900/55 px-4 py-3 text-left text-slate-100 shadow-[0_18px_44px_-30px_rgba(15,23,42,.95)] backdrop-blur-sm">
                  <Check size={16} className="shrink-0 text-emerald-300" />
                  <span>{item}</span>
                </motion.div>
              ))}
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center lg:justify-start">
              <PrimaryCta href="/signup">Criar conta gratis</PrimaryCta>
              <p className="text-sm text-slate-400">Leva menos de 30 segundos.</p>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.08 }} className="relative mx-auto w-full max-w-xl">
            <div className="absolute -inset-6 rounded-[2.4rem] bg-[radial-gradient(circle_at_30%_15%,rgba(16,185,129,.46),transparent_48%),radial-gradient(circle_at_80%_82%,rgba(59,130,246,.26),transparent_44%)] blur-3xl" />
            <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-emerald-300/40 to-transparent" />
            <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-900/78 p-4 shadow-[0_34px_110px_-40px_rgba(16,185,129,.72)]">
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
                <svg viewBox="0 0 320 120" className="h-36 w-full">
                  <path d="M0,88 C28,78 48,42 74,36 C100,30 122,52 149,42 C176,32 200,18 226,16 C252,14 274,30 300,32 C312,33 318,26 320,24" fill="none" stroke="rgba(16,185,129,.95)" strokeWidth="3.5" />
                  <path d="M0,108 C22,106 48,95 74,90 C98,86 122,98 149,94 C176,90 200,76 226,80 C252,84 274,90 300,94 C312,96 318,92 320,89" fill="none" stroke="rgba(251,113,133,.92)" strokeWidth="3.5" />
                  <circle cx="300" cy="32" r="4" fill="rgba(16,185,129,.95)" />
                </svg>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-[1.1fr_.9fr]">
                <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,.03)]">
                  <p className="mb-3 text-xs text-slate-400">Categorias do mes</p>
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
                    <p className="text-sm text-emerald-50">Delivery subiu 18%. Existe espaco para economizar neste mes.</p>
                  </motion.div>
                  <motion.div animate={{ y: [0, 3, 0] }} transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut' }} className="rounded-2xl border border-cyan-300/25 bg-cyan-500/10 p-3 shadow-[0_20px_40px_-28px_rgba(34,211,238,.75)]">
                    <p className="mb-1 text-[11px] text-cyan-200">WhatsApp</p>
                    <p className="text-sm text-cyan-50">Resumo automatico entregue com o que mais merece sua atencao.</p>
                  </motion.div>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        <motion.section {...sectionMotion} className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,.82),rgba(15,23,42,.62))] p-6 md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <p className="text-amber-300">★★★★★</p>
              <h2 className="text-2xl font-bold text-white md:text-3xl" style={{ fontFamily: 'var(--font-display)' }}>Mais de 1.000 pessoas ja comecaram a organizar suas financas com o Cote Finance AI.</h2>
              <p className="text-slate-300">&ldquo;Finalmente entendi para onde meu dinheiro estava indo.&rdquo; - Usuario do Cote Finance</p>
              <div className="flex flex-wrap gap-3 pt-1 text-sm text-slate-200">
                {socialBullets.map((item) => (
                  <span key={item} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5"><Check size={14} className="text-emerald-300" /> {item}</span>
                ))}
              </div>
            </div>
            <PrimaryCta href="/signup">Criar conta gratis</PrimaryCta>
          </div>
        </motion.section>

        <motion.section {...sectionMotion} className="grid gap-6 lg:grid-cols-2">
          <MotionCard className="rounded-[2rem] border border-white/10 bg-slate-900/55 p-6 md:p-8">
            <h2 className="mb-4 text-3xl font-bold text-white md:text-4xl" style={{ fontFamily: 'var(--font-display)' }}>O problema nao e quanto voce ganha.</h2>
            <p className="mb-5 text-lg text-slate-300">A maioria das pessoas acredita que precisa ganhar mais dinheiro.</p>
            <p className="mb-5 text-slate-300">Mas na pratica, o problema e outro. Voce nao consegue enxergar para onde o dinheiro esta indo.</p>
            <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-5">
              <p className="mb-4 text-slate-300">No comeco do mes parece que tudo esta sob controle.</p>
              <ul className="space-y-3 text-slate-200">
                <li className="flex items-center gap-3"><Check size={16} className="text-emerald-300" /> o salario entra</li>
                <li className="flex items-center gap-3"><Check size={16} className="text-emerald-300" /> algumas contas sao pagas</li>
              </ul>
            </div>
            <div className="mt-5 rounded-2xl border border-rose-300/20 bg-rose-500/10 p-4 text-slate-100">
              <p className="mb-2 font-semibold">Mas entao aparecem:</p>
              <ul className="space-y-2 text-sm text-rose-50">
                <li>- pequenas compras</li>
                <li>- assinaturas esquecidas</li>
                <li>- gastos invisiveis</li>
              </ul>
              <p className="mt-4 font-semibold">E no final do mes o dinheiro simplesmente desaparece.</p>
            </div>
          </MotionCard>

          <MotionCard className="rounded-[2rem] border border-white/10 bg-slate-900/55 p-6 md:p-8">
            <h2 className="mb-4 text-3xl font-bold text-white md:text-4xl" style={{ fontFamily: 'var(--font-display)' }}>Quanto dinheiro voce pode estar perdendo?</h2>
            <p className="mb-5 text-slate-300">A maioria das pessoas perde dinheiro sem perceber.</p>
            <p className="mb-5 text-slate-300">Pequenos gastos que parecem inofensivos podem somar valores enormes.</p>
            <div className="space-y-3 rounded-2xl border border-white/10 bg-slate-950/70 p-5">
              {invisibleExpenseExamples.map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-4 border-b border-white/10 pb-3 text-sm last:border-none last:pb-0"><span className="text-slate-300">{item.label}</span><span className="font-semibold text-white">{item.monthly}</span></div>
              ))}
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-amber-300/25 bg-amber-500/10 p-4"><p className="text-xs uppercase tracking-[0.22em] text-amber-200">Total perdido</p><p className="mt-2 text-2xl font-bold text-white">R$750 por mes</p></div>
              <div className="rounded-2xl border border-emerald-300/25 bg-emerald-500/10 p-4"><p className="text-xs uppercase tracking-[0.22em] text-emerald-200">Em um ano</p><p className="mt-2 text-2xl font-bold text-white">R$9.000 ou mais</p></div>
            </div>
            <p className="mt-5 text-slate-300">O problema nao e gastar. O problema e nao enxergar o que esta acontecendo.</p>
          </MotionCard>
        </motion.section>
        <motion.section {...sectionMotion} className="grid gap-8 lg:grid-cols-[1fr_.95fr] lg:items-center">
          <div className="space-y-5">
            <h2 className="text-3xl font-bold text-white md:text-4xl" style={{ fontFamily: 'var(--font-display)' }}>O Cote Finance AI mostra exatamente para onde seu dinheiro esta indo.</h2>
            <p className="text-lg text-slate-300">Ele funciona como um raio-X da sua vida financeira.</p>
            <p className="text-slate-300">O sistema analisa seus gastos e transforma tudo em informacoes simples.</p>
            <ul className="space-y-3 text-slate-200">
              {solutionBullets.map((item) => (
                <li key={item} className="flex items-center gap-3"><Check size={16} className="text-emerald-300" /><span>{item}</span></li>
              ))}
            </ul>
            <p className="text-slate-300">Tudo explicado de forma simples, visual e pratica.</p>
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
          <SectionTitle eyebrow="Como funciona" title="Comecar e simples." />
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {howItWorks.map((item, index) => (
              <MotionCard key={item.step} className="rounded-2xl border border-white/10 bg-slate-950/70 p-5">
                <p className="mb-3 text-sm font-semibold text-emerald-200">{item.step}</p>
                <p className="text-slate-300">{item.text}</p>
                <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/10"><motion.div initial={{ width: 0 }} whileInView={{ width: `${(index + 1) * 33}%` }} viewport={{ once: true }} transition={{ duration: 0.5, delay: index * 0.08 }} className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400" /></div>
              </MotionCard>
            ))}
          </div>
        </motion.section>

        <motion.section {...sectionMotion} className="rounded-[2rem] border border-white/10 bg-slate-900/55 p-6 md:p-8">
          <SectionTitle eyebrow="Dashboard" title="Um dashboard simples. Uma visao completa." description="Em poucos segundos voce consegue ver:" />
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {dashboardItems.map((item) => (
              <MotionCard key={item} className="rounded-2xl border border-white/10 bg-slate-950/70 p-4 text-sm text-slate-200"><div className="flex items-start gap-3"><Check size={16} className="mt-0.5 shrink-0 text-emerald-300" /><span>{item}</span></div></MotionCard>
            ))}
          </div>
        </motion.section>

        <motion.section {...sectionMotion} className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,.86),rgba(15,23,42,.62))] p-6 md:p-8">
          <SectionTitle eyebrow="Simulacao de ganho" title="Quanto dinheiro voce pode economizar ao entender seus gastos?" />
          <div className="mt-8 grid gap-6 lg:grid-cols-[1.05fr_.95fr]">
            <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/70 p-5">
              {savingsExamples.map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-4 border-b border-white/10 pb-3 text-sm last:border-none last:pb-0"><span className="text-slate-300">{item.label}</span><span className="font-semibold text-white">{item.monthly}</span></div>
              ))}
              <div className="grid gap-3 pt-2 sm:grid-cols-2">
                <div className="rounded-2xl border border-rose-300/20 bg-rose-500/10 p-4"><p className="text-xs uppercase tracking-[0.22em] text-rose-200">Possivel desperdicio</p><p className="mt-2 text-2xl font-bold text-white">R$870 por mes</p></div>
                <div className="rounded-2xl border border-emerald-300/20 bg-emerald-500/10 p-4"><p className="text-xs uppercase tracking-[0.22em] text-emerald-200">Em um ano</p><p className="mt-2 text-2xl font-bold text-white">R$10.440</p></div>
              </div>
            </div>
            <div className="space-y-4 rounded-2xl border border-emerald-300/20 bg-emerald-500/10 p-5">
              <p className="text-slate-100">A maioria das pessoas nem percebe que esta perdendo esse dinheiro.</p>
              <div className="space-y-3 text-slate-50">
                <p>Com o Cote Finance AI voce consegue:</p>
                <ul className="space-y-2">
                  <li className="flex items-center gap-3"><Check size={16} className="text-emerald-200" /> identificar gastos invisiveis</li>
                  <li className="flex items-center gap-3"><Check size={16} className="text-emerald-200" /> descobrir habitos que drenam sua renda</li>
                  <li className="flex items-center gap-3"><Check size={16} className="text-emerald-200" /> encontrar oportunidades reais de economia</li>
                </ul>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-4"><p className="text-sm text-slate-100">Muitos usuarios relatam economias de <span className="font-semibold text-white">R$300 a R$1000 por mes</span> apenas entendendo melhor seus gastos.</p></div>
              <div className="pt-2"><PrimaryCta href="/signup">Descubra quanto voce pode economizar</PrimaryCta></div>
            </div>
          </div>
        </motion.section>
        <motion.section {...sectionMotion} className="grid gap-6 lg:grid-cols-2">
          <MotionCard className="rounded-[2rem] border border-white/10 bg-slate-900/55 p-6 md:p-8">
            <h2 className="mb-5 text-3xl font-bold text-white md:text-4xl" style={{ fontFamily: 'var(--font-display)' }}>Planilhas vs Inteligencia Financeira</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-5">
                <h3 className="mb-4 text-xl font-semibold text-white">Planilhas</h3>
                <ul className="space-y-3 text-slate-300">{comparison.left.map((item) => <li key={item}>❌ {item}</li>)}</ul>
              </div>
              <div className="rounded-2xl border border-emerald-300/25 bg-emerald-500/10 p-5">
                <h3 className="mb-4 text-xl font-semibold text-white">Cote Finance AI</h3>
                <ul className="space-y-3 text-emerald-50">{comparison.right.map((item) => <li key={item}>✔ {item}</li>)}</ul>
              </div>
            </div>
          </MotionCard>

          <MotionCard className="rounded-[2rem] border border-white/10 bg-slate-900/55 p-6 md:p-8">
            <h2 className="mb-4 text-3xl font-bold text-white md:text-4xl" style={{ fontFamily: 'var(--font-display)' }}>Quando voce entende seu dinheiro, tudo muda.</h2>
            <p className="mb-6 text-slate-300">Quando voce tem clareza financeira:</p>
            <div className="grid gap-4 sm:grid-cols-2">
              {transformationBullets.map((item) => (
                <motion.div key={item} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.35 }} className="rounded-2xl border border-white/10 bg-slate-950/70 p-4"><p className="text-slate-100">✔ {item}</p></motion.div>
              ))}
            </div>
          </MotionCard>
        </motion.section>

        <motion.section {...sectionMotion} className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,.82),rgba(15,23,42,.62))] p-6 md:p-8">
          <SectionTitle eyebrow="Seguranca e privacidade" title="Suas informacoes sao 100% privadas." description="Seus dados financeiros sao extremamente importantes." />
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {securityBullets.map((item) => (
              <MotionCard key={item} className="rounded-2xl border border-white/10 bg-slate-950/70 p-5"><ShieldCheck size={18} className="mb-3 text-emerald-300" /><p className="font-semibold text-white">{item}</p></MotionCard>
            ))}
          </div>
        </motion.section>

        <motion.section {...sectionMotion} className="space-y-6">
          <SectionTitle title="Quem usa entende rapido a diferenca." />
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
              <MotionCard key={plan.name} className={`relative flex h-full flex-col overflow-hidden rounded-[30px] border p-6 ${plan.highlight ? 'border-emerald-300/45 bg-gradient-to-b from-emerald-400/18 via-white/10 to-white/8 shadow-[0_34px_100px_rgba(16,185,129,0.24)] lg:-translate-y-3' : 'border-white/10 bg-slate-900/55'}`}>
                <span className={`inline-flex w-fit rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] ${plan.highlight ? 'bg-emerald-500 text-white' : 'border border-white/10 bg-white/5 text-slate-300'}`}>{plan.badge}</span>
                <div className="mt-4 space-y-2"><h3 className="text-2xl font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>{plan.name}</h3><p className="text-3xl font-semibold text-white">{plan.price}</p></div>
                <ul className="mb-6 mt-6 space-y-3 text-sm text-slate-200">{plan.features.map((feature) => <li key={feature} className="flex items-start gap-2"><Check size={15} className="mt-0.5 shrink-0 text-emerald-300" /><span>{feature}</span></li>)}</ul>
                <Link href={plan.href} className={`mt-auto inline-flex items-center justify-center rounded-xl px-4 py-3 text-sm font-bold transition-colors ${plan.highlight ? 'bg-emerald-500 text-white hover:bg-emerald-600' : 'bg-slate-100 text-slate-900 hover:bg-white'}`}>{plan.cta}</Link>
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
                <p className="mt-3 text-sm text-slate-300">{item.answer}</p>
              </motion.details>
            ))}
          </div>
        </motion.section>

        <motion.section {...sectionMotion} className="rounded-[2rem] border border-emerald-300/20 bg-[linear-gradient(180deg,rgba(16,185,129,0.14),rgba(15,23,42,0.94)_35%,rgba(2,6,23,0.98)_100%)] px-6 py-10 text-center md:px-10">
          <h2 className="mx-auto max-w-3xl text-3xl font-bold text-white md:text-5xl" style={{ fontFamily: 'var(--font-display)' }}>Descubra para onde seu dinheiro realmente esta indo.</h2>
          <p className="mx-auto mt-4 max-w-2xl text-slate-200">Comece gratuitamente e tenha uma visao clara da sua vida financeira.</p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3">
            <PrimaryCta href="/signup" invert>Criar conta gratis</PrimaryCta>
            <p className="text-sm text-slate-400">Leva menos de 30 segundos.</p>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300"><ShieldCheck size={14} className="text-emerald-300" /> Seus dados protegidos com criptografia</div>
          </div>
        </motion.section>
      </div>
    </main>
  );
}

