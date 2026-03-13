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
  TrendingDown,
  Wallet,
} from 'lucide-react';

const displayFont = Space_Grotesk({ subsets: ['latin'], weight: ['600', '700'], variable: '--font-display' });
const bodyFont = Manrope({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-body' });

const heroBullets = [
  'Análise automática de gastos',
  'Insights financeiros com inteligência artificial',
  'Alertas e resumos no WhatsApp',
];

const storyLines = [
  'No começo do mês parece que tudo está sob controle.',
  'O salário entra.',
  'Algumas contas são pagas.',
  'Pequenas compras acontecem.',
  'E quando você percebe...',
  'o dinheiro simplesmente desapareceu.',
  'Você não sabe exatamente onde foi parar.',
];

const invisibleExpenseList = ['Assinaturas esquecidas', 'Delivery frequente', 'Compras impulsivas', 'Parcelas acumuladas'];

const solutionList = [
  'Onde você está gastando demais',
  'Categorias que consomem mais dinheiro',
  'Padrões invisíveis de gasto',
  'Oportunidades reais de economia',
];

const dashboardItems = [
  'Resumo financeiro do mês',
  'Categorias de despesas',
  'Gráficos inteligentes',
  'Tendências financeiras',
  'Insights automáticos da IA',
];

const benefits = [
  { title: 'Clareza total', text: 'Veja exatamente para onde seu dinheiro está indo.' },
  { title: 'Controle financeiro real', text: 'Tome decisões melhores.' },
  { title: 'Organização automática', text: 'Sem planilhas complicadas.' },
  { title: 'Tranquilidade no fim do mês', text: 'Sem surpresas desagradáveis.' },
];

const testimonials = [
  { quote: 'Descobri que gastava muito mais com delivery do que imaginava.', author: 'Mariana R.' },
  { quote: 'Agora recebo alertas no WhatsApp.', author: 'Lucas T.' },
  { quote: 'Muito mais simples que planilhas.', author: 'Rafael S.' },
];

const plans = [
  {
    name: 'Free',
    price: 'R$0/mês',
    href: '/signup',
    cta: 'Criar conta grátis',
    badge: 'Entrada',
    features: ['Dashboard financeiro', 'Categorização automática', 'Análise básica de despesas'],
  },
  {
    name: 'Pro',
    price: 'R$29/mês',
    href: '/signup?plan=pro',
    cta: 'Começar teste grátis',
    badge: 'Mais popular',
    highlight: true,
    features: ['Tudo do Free', 'Insights avançados da IA', 'Alertas financeiros', 'Resumos no WhatsApp', 'Relatórios detalhados'],
  },
  {
    name: 'Premium',
    price: 'R$49/mês',
    href: '/signup?plan=premium',
    cta: 'Assinar Premium',
    badge: 'Completo',
    features: ['Tudo do Pro', 'Análises financeiras profundas', 'Recomendações personalizadas'],
  },
];

const faqs = [
  { question: 'Preciso conectar conta bancária?', answer: 'Não necessariamente.' },
  { question: 'O app usa IA?', answer: 'Sim.' },
  { question: 'Meus dados são seguros?', answer: 'Sim, usamos criptografia.' },
  { question: 'Existe plano gratuito?', answer: 'Sim.' },
  { question: 'Posso cancelar quando quiser?', answer: 'Sim.' },
];

const sectionMotion = {
  initial: { opacity: 0, y: 26 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-100px' },
  transition: { duration: 0.45 },
};

const staggerMotion = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-100px' },
  transition: { staggerChildren: 0.08, delayChildren: 0.05 },
};

function PrimaryCta({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-emerald-600"
    >
      {children}
      <ArrowRight size={16} />
    </Link>
  );
}

function FadeCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.4 }}
      whileHover={{ y: -4 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export default function PaidLandingClient() {
  return (
    <main
      className={`${displayFont.variable} ${bodyFont.variable} min-h-screen bg-slate-950 text-slate-100`}
      style={{ fontFamily: 'var(--font-body)' }}
    >
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_12%_10%,rgba(16,185,129,.18),transparent_30%),radial-gradient(circle_at_88%_8%,rgba(59,130,246,.16),transparent_26%),linear-gradient(180deg,#020617_0%,#020617_52%,#0b1120_100%)]" />

      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Link href="/lp" className="flex items-center gap-3">
          <Image src="/brand/cote-favicon.svg" alt="Cote Finance AI" width={40} height={40} className="h-10 w-10" priority />
          <Image
            src="/brand/cote-finance-ai-logo.svg"
            alt="Cote Finance AI"
            width={420}
            height={120}
            className="hidden h-10 w-auto sm:block"
            priority
          />
        </Link>
        <PrimaryCta href="/signup">Criar conta grátis</PrimaryCta>
      </div>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-14 px-4 pb-20 pt-4 sm:px-6 sm:pb-24">
        <section className="grid items-center gap-10 lg:grid-cols-[1.02fr_.98fr]">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
            className="space-y-6 text-center lg:text-left"
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200">
              <Sparkles size={14} /> Leva menos de 30 segundos
            </span>
            <h1 className="text-[2.45rem] font-bold leading-tight text-white sm:text-5xl lg:text-6xl" style={{ fontFamily: 'var(--font-display)' }}>
              Seu dinheiro está sumindo - e você nem sabe por quê.
            </h1>
            <p className="max-w-2xl text-lg leading-relaxed text-slate-300">
              O Cote Finance AI analisa seus gastos automaticamente e mostra exatamente para onde seu dinheiro está indo.
            </p>

            <motion.ul {...staggerMotion} className="space-y-3 text-left text-slate-200">
              {heroBullets.map((item) => (
                <motion.li
                  key={item}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3 }}
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-900/55 px-4 py-3"
                >
                  <Check size={16} className="shrink-0 text-emerald-300" />
                  <span>{item}</span>
                </motion.li>
              ))}
            </motion.ul>

            <div className="rounded-3xl border border-white/10 bg-slate-900/50 p-5 text-left">
              <div className="space-y-2 text-slate-300">
                {storyLines.map((line, index) => (
                  <motion.p
                    key={line}
                    initial={{ opacity: 0, y: 8 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.35, delay: index * 0.05 }}
                    className={index >= 5 ? 'font-semibold text-white' : ''}
                  >
                    {line}
                  </motion.p>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center lg:justify-start">
              <PrimaryCta href="/signup">Criar conta grátis</PrimaryCta>
              <p className="text-sm text-slate-400">Leva menos de 30 segundos.</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.08 }}
            className="relative mx-auto w-full max-w-xl"
          >
            <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-r from-emerald-500/25 via-cyan-500/12 to-blue-500/20 blur-3xl sm:-inset-6" />
            <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-900/75 p-4 shadow-[0_28px_95px_-38px_rgba(16,185,129,.68)]">
              <div className="mb-4 flex items-center justify-between rounded-xl bg-slate-950/70 px-4 py-2">
                <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Dashboard do Cote Finance AI</p>
                <motion.span
                  animate={{ opacity: [0.8, 1, 0.8] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                  className="rounded-full border border-emerald-300/25 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-200"
                >
                  IA ativa
                </motion.span>
              </div>

              <div className="mb-4 rounded-2xl border border-white/10 bg-slate-950/70 p-3">
                <div className="mb-4 grid gap-3 sm:grid-cols-3">
                  {[
                    { label: 'Saldo total', value: 'R$ 12.830', accent: 'emerald' },
                    { label: 'Receitas', value: 'R$ 9.430', accent: 'cyan' },
                    { label: 'Despesas', value: 'R$ 4.180', accent: 'rose' },
                  ].map((item, index) => (
                    <motion.div
                      key={item.label}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.2 + index * 0.08 }}
                      className={`rounded-xl border p-3 ${
                        item.accent === 'emerald'
                          ? 'border-emerald-300/30 bg-emerald-500/10'
                          : item.accent === 'cyan'
                            ? 'border-cyan-300/30 bg-cyan-500/10'
                            : 'border-rose-300/30 bg-rose-500/10'
                      }`}
                    >
                      <p
                        className={`text-[11px] ${
                          item.accent === 'emerald'
                            ? 'text-emerald-200'
                            : item.accent === 'cyan'
                              ? 'text-cyan-200'
                              : 'text-rose-200'
                        }`}
                      >
                        {item.label}
                      </p>
                      <motion.p
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: [1, 1.03, 1] }}
                        transition={{ duration: 0.7, delay: 0.35 + index * 0.08 }}
                        className={`text-base font-bold ${
                          item.accent === 'emerald'
                            ? 'text-emerald-100'
                            : item.accent === 'cyan'
                              ? 'text-cyan-100'
                              : 'text-rose-100'
                        }`}
                      >
                        {item.value}
                      </motion.p>
                    </motion.div>
                  ))}
                </div>

                <Image
                  src="/landing/solution-visual.svg"
                  alt="Mockup do dashboard do Cote Finance AI"
                  width={880}
                  height={620}
                  className="h-auto w-full"
                  priority
                />
              </div>

              <div className="grid gap-3 md:grid-cols-[1.1fr_.9fr]">
                <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                  <p className="mb-2 text-xs text-slate-400">Categorias do mês</p>
                  <div className="space-y-3">
                    {[
                      { name: 'Moradia', width: '78%', color: 'bg-emerald-400' },
                      { name: 'Alimentação', width: '61%', color: 'bg-cyan-400' },
                      { name: 'Transporte', width: '42%', color: 'bg-sky-400' },
                      { name: 'Lazer', width: '33%', color: 'bg-amber-400' },
                    ].map((item, index) => (
                      <div key={item.name} className="space-y-1">
                        <div className="flex items-center justify-between text-xs text-slate-300">
                          <span>{item.name}</span>
                          <span>{item.width}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-white/10">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: item.width }}
                            transition={{ duration: 0.8, delay: 0.45 + index * 0.1 }}
                            className={`h-full rounded-full ${item.color}`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <motion.div
                    animate={{ y: [0, -3, 0] }}
                    transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
                    className="rounded-2xl border border-emerald-300/25 bg-emerald-500/10 p-3"
                  >
                    <p className="mb-1 text-[11px] text-emerald-200">Insight da IA</p>
                    <p className="text-sm text-emerald-50">Delivery subiu 18%. Existe espaço para economizar neste mês.</p>
                  </motion.div>
                  <motion.div
                    animate={{ y: [0, 3, 0] }}
                    transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut' }}
                    className="rounded-2xl border border-cyan-300/25 bg-cyan-500/10 p-3"
                  >
                    <p className="mb-1 text-[11px] text-cyan-200">WhatsApp</p>
                    <p className="text-sm text-cyan-50">Resumo automático entregue com o que mais merece sua atenção.</p>
                  </motion.div>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        <motion.section {...sectionMotion} className="rounded-3xl border border-white/10 bg-slate-900/50 p-6 md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <p className="text-amber-300">★★★★★</p>
              <h2 className="text-2xl font-bold text-white md:text-3xl" style={{ fontFamily: 'var(--font-display)' }}>
                Mais de 1.000 pessoas já começaram a organizar suas finanças com o Cote Finance AI.
              </h2>
              <p className="text-slate-300">&ldquo;Finalmente entendi para onde meu dinheiro estava indo.&rdquo;</p>
            </div>
            <PrimaryCta href="/signup">Criar conta grátis</PrimaryCta>
          </div>
        </motion.section>

        <motion.section {...sectionMotion} className="grid gap-6 lg:grid-cols-2">
          <FadeCard className="rounded-3xl border border-white/10 bg-slate-900/55 p-6 md:p-8">
            <h2 className="mb-4 text-3xl font-bold text-white md:text-4xl" style={{ fontFamily: 'var(--font-display)' }}>
              O problema não é quanto você ganha.
            </h2>
            <p className="mb-5 text-lg text-slate-300">A maioria das pessoas acredita que precisa ganhar mais dinheiro.</p>
            <p className="mb-5 text-slate-300">Mas na prática o problema é não enxergar para onde o dinheiro está indo.</p>
            <motion.ul {...staggerMotion} className="space-y-3 text-slate-200">
              {['O salário entra', 'As despesas aparecem', 'O dinheiro desaparece'].map((item) => (
                <motion.li
                  key={item}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3 }}
                  className="flex items-center gap-3"
                >
                  <TrendingDown size={16} className="text-rose-300" />
                  <span>{item}</span>
                </motion.li>
              ))}
            </motion.ul>
            <div className="mt-6 rounded-2xl border border-rose-300/20 bg-rose-500/10 p-4 text-slate-100">
              <p>Sem controle.</p>
              <p>Sem clareza.</p>
            </div>
          </FadeCard>

          <FadeCard className="rounded-3xl border border-white/10 bg-slate-900/55 p-6 md:p-8">
            <h2 className="mb-4 text-3xl font-bold text-white md:text-4xl" style={{ fontFamily: 'var(--font-display)' }}>
              Pequenos gastos invisíveis estão drenando sua renda.
            </h2>
            <p className="mb-5 text-slate-300">
              Separados parecem pequenos. Mas juntos podem consumir uma parte significativa da sua renda todos os meses.
            </p>
            <motion.ul {...staggerMotion} className="space-y-3 text-slate-200">
              {invisibleExpenseList.map((item) => (
                <motion.li
                  key={item}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3 }}
                  className="flex items-center gap-3"
                >
                  <Wallet size={16} className="text-amber-300" />
                  <span>{item}</span>
                </motion.li>
              ))}
            </motion.ul>
          </FadeCard>
        </motion.section>

        <motion.section {...sectionMotion} className="grid gap-8 lg:grid-cols-[1fr_.95fr] lg:items-center">
          <div className="space-y-5">
            <h2 className="text-3xl font-bold text-white md:text-4xl" style={{ fontFamily: 'var(--font-display)' }}>
              O Cote Finance AI mostra exatamente para onde seu dinheiro está indo.
            </h2>
            <p className="text-lg text-slate-300">O Cote Finance AI funciona como um raio-X da sua vida financeira.</p>
            <p className="text-slate-300">
              Ele analisa automaticamente suas receitas e despesas e transforma seus dados em insights claros.
            </p>
            <motion.ul {...staggerMotion} className="space-y-3 text-slate-200">
              {solutionList.map((item) => (
                <motion.li
                  key={item}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3 }}
                  className="flex items-center gap-3"
                >
                  <Check size={16} className="text-emerald-300" />
                  <span>{item}</span>
                </motion.li>
              ))}
            </motion.ul>
          </div>

          <motion.div
            whileHover={{ y: -4 }}
            transition={{ duration: 0.2 }}
            className="rounded-[2rem] border border-white/10 bg-slate-900/60 p-5"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-cyan-300/25 bg-cyan-500/10 p-4">
                <BarChart3 size={18} className="mb-3 text-cyan-200" />
                <p className="font-semibold text-white">Visão por categoria</p>
                <p className="mt-2 text-sm text-slate-300">Veja com clareza o peso de cada tipo de gasto no seu mês.</p>
              </div>
              <div className="rounded-2xl border border-emerald-300/25 bg-emerald-500/10 p-4">
                <BrainCircuit size={18} className="mb-3 text-emerald-200" />
                <p className="font-semibold text-white">IA aplicada no dia a dia</p>
                <p className="mt-2 text-sm text-slate-300">Receba sinais rápidos do que está piorando e do que pode melhorar.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4 sm:col-span-2">
                <MessageCircle size={18} className="mb-3 text-emerald-200" />
                <p className="font-semibold text-white">Alertas e resumos no WhatsApp</p>
                <p className="mt-2 text-sm text-slate-300">Continue acompanhando sua vida financeira sem abrir o app o tempo todo.</p>
              </div>
            </div>
          </motion.div>
        </motion.section>

        <motion.section {...sectionMotion} className="rounded-3xl border border-white/10 bg-slate-900/55 p-6 md:p-8">
          <h2 className="mb-6 text-3xl font-bold text-white md:text-4xl" style={{ fontFamily: 'var(--font-display)' }}>
            Um dashboard simples. Uma visão completa.
          </h2>
          <motion.div {...staggerMotion} className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {dashboardItems.map((item) => (
              <motion.div
                key={item}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35 }}
                whileHover={{ y: -3 }}
                className="rounded-2xl border border-white/10 bg-slate-950/70 p-4 text-sm text-slate-200"
              >
                {item}
              </motion.div>
            ))}
          </motion.div>
        </motion.section>

        <motion.section {...sectionMotion} className="grid gap-6 lg:grid-cols-2">
          <FadeCard className="rounded-3xl border border-white/10 bg-slate-900/55 p-6 md:p-8">
            <h2 className="mb-5 text-3xl font-bold text-white md:text-4xl" style={{ fontFamily: 'var(--font-display)' }}>
              Planilhas vs Inteligência Financeira
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-5">
                <h3 className="mb-4 text-xl font-semibold text-white">Planilhas</h3>
                <ul className="space-y-3 text-slate-300">
                  <li>Controle manual</li>
                  <li>Difícil manter</li>
                  <li>Difícil identificar padrões</li>
                </ul>
              </div>
              <div className="rounded-2xl border border-emerald-300/25 bg-emerald-500/10 p-5">
                <h3 className="mb-4 text-xl font-semibold text-white">Cote Finance AI</h3>
                <ul className="space-y-3 text-emerald-50">
                  <li>Análise automática</li>
                  <li>Insights inteligentes</li>
                  <li>Clareza financeira</li>
                </ul>
              </div>
            </div>
          </FadeCard>

          <FadeCard className="rounded-3xl border border-white/10 bg-slate-900/55 p-6 md:p-8">
            <h2 className="mb-4 text-3xl font-bold text-white md:text-4xl" style={{ fontFamily: 'var(--font-display)' }}>
              Quando você entende seu dinheiro, tudo muda.
            </h2>
            <p className="mb-6 text-slate-300">
              Quando você finalmente enxerga para onde seu dinheiro está indo, tomar decisões financeiras se torna muito mais simples.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              {benefits.map((benefit) => (
                <motion.div
                  key={benefit.title}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.35 }}
                  whileHover={{ y: -3 }}
                  className="rounded-2xl border border-white/10 bg-slate-950/70 p-4"
                >
                  <p className="font-semibold text-white">{benefit.title}</p>
                  <p className="mt-2 text-sm text-slate-300">{benefit.text}</p>
                </motion.div>
              ))}
            </div>
          </FadeCard>
        </motion.section>

        <motion.section {...sectionMotion} className="space-y-6">
          <h2 className="text-center text-3xl font-bold text-white md:text-4xl" style={{ fontFamily: 'var(--font-display)' }}>
            Quem usa entende rápido a diferença.
          </h2>
          <motion.div {...staggerMotion} className="grid gap-4 md:grid-cols-3">
            {testimonials.map((item) => (
              <motion.blockquote
                key={item.author}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35 }}
                whileHover={{ y: -4 }}
                className="rounded-3xl border border-white/10 bg-slate-900/55 p-6"
              >
                <p className="text-slate-100">&ldquo;{item.quote}&rdquo;</p>
                <footer className="mt-4 text-sm text-slate-400">- {item.author}</footer>
              </motion.blockquote>
            ))}
          </motion.div>
        </motion.section>

        <motion.section {...sectionMotion} className="space-y-6" id="planos">
          <div className="space-y-3 text-center">
            <h2 className="text-3xl font-bold text-white md:text-4xl" style={{ fontFamily: 'var(--font-display)' }}>
              Comece gratuitamente.
            </h2>
          </div>

          <motion.div {...staggerMotion} className="grid gap-4 lg:grid-cols-3">
            {plans.map((plan) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35 }}
                whileHover={{ y: -5, scale: 1.01 }}
                className={`relative flex h-full flex-col rounded-[30px] border p-6 ${
                  plan.highlight
                    ? 'border-emerald-300/45 bg-gradient-to-b from-emerald-400/18 via-white/10 to-white/8 shadow-[0_30px_90px_rgba(16,185,129,0.22)] lg:-translate-y-3'
                    : 'border-white/10 bg-slate-900/55'
                }`}
              >
                <span
                  className={`inline-flex w-fit rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] ${
                    plan.highlight ? 'bg-emerald-500 text-white' : 'border border-white/10 bg-white/5 text-slate-300'
                  }`}
                >
                  {plan.badge}
                </span>
                <div className="mt-4 space-y-2">
                  <h3 className="text-2xl font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>
                    {plan.name}
                  </h3>
                  <p className="text-3xl font-semibold text-white">{plan.price}</p>
                </div>
                <ul className="mb-6 mt-6 space-y-3 text-sm text-slate-200">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check size={15} className="mt-0.5 shrink-0 text-emerald-300" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={plan.href}
                  className={`mt-auto inline-flex items-center justify-center rounded-xl px-4 py-3 text-sm font-bold transition-colors ${
                    plan.highlight ? 'bg-emerald-500 text-white hover:bg-emerald-600' : 'bg-slate-100 text-slate-900 hover:bg-white'
                  }`}
                >
                  {plan.cta}
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </motion.section>

        <motion.section {...sectionMotion} className="rounded-3xl border border-white/10 bg-slate-900/55 p-6 md:p-8">
          <h2 className="mb-6 text-3xl font-bold text-white md:text-4xl" style={{ fontFamily: 'var(--font-display)' }}>
            Perguntas frequentes
          </h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {faqs.map((item) => (
              <motion.details
                key={item.question}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35 }}
                className="rounded-2xl border border-white/10 bg-slate-950/70 p-5"
              >
                <summary className="cursor-pointer list-none font-semibold text-white">{item.question}</summary>
                <p className="mt-3 text-sm text-slate-300">{item.answer}</p>
              </motion.details>
            ))}
          </div>
        </motion.section>

        <motion.section
          {...sectionMotion}
          className="rounded-[2rem] border border-emerald-300/20 bg-[linear-gradient(180deg,rgba(16,185,129,0.14),rgba(15,23,42,0.94)_35%,rgba(2,6,23,0.98)_100%)] px-6 py-10 text-center md:px-10"
        >
          <h2 className="mx-auto max-w-3xl text-3xl font-bold text-white md:text-5xl" style={{ fontFamily: 'var(--font-display)' }}>
            Descubra para onde seu dinheiro está indo.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-slate-200">Comece gratuitamente e tenha controle real da sua vida financeira.</p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3">
            <PrimaryCta href="/signup">Criar conta grátis</PrimaryCta>
            <p className="text-sm text-slate-400">Leva menos de 30 segundos.</p>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300">
              <ShieldCheck size={14} className="text-emerald-300" />
              Seus dados protegidos com criptografia
            </div>
          </div>
        </motion.section>
      </div>
    </main>
  );
}
