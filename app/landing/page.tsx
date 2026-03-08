'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Manrope, Space_Grotesk } from 'next/font/google';
import { motion } from 'motion/react';
import {
  ArrowRight,
  BarChart3,
  BrainCircuit,
  Check,
  CircleDollarSign,
  CreditCard,
  LayoutDashboard,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getCheckoutPath, parseCheckoutPlanLabel } from '@/lib/billing/plans';

const displayFont = Space_Grotesk({ subsets: ['latin'], weight: ['600', '700'], variable: '--font-display' });
const bodyFont = Manrope({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-body' });

type CheckoutPlan = 'Pro Mensal' | 'Premium Mensal';

type PlanCard = {
  name: 'Free' | 'Pro' | 'Premium';
  price: string;
  buttonText: string;
  features: string[];
  checkoutPlan?: CheckoutPlan;
  popular?: boolean;
};

const plans: PlanCard[] = [
  {
    name: 'Free',
    price: 'R$0 / mês',
    buttonText: 'Começar grátis',
    features: [
      'até 20 lançamentos por mês',
      'dashboard básico',
      'acompanhamento de saldo',
      'relatórios simples',
      'IA limitada',
    ],
  },
  {
    name: 'Pro',
    price: 'R$29 / mês',
    buttonText: 'Testar 3 dias grátis',
    checkoutPlan: 'Pro Mensal',
    popular: true,
    features: [
      'tudo do plano Free',
      'lançamentos ilimitados',
      'relatórios completos',
      'gráficos avançados',
      'análise inteligente da IA',
      'insights financeiros automáticos',
    ],
  },
  {
    name: 'Premium',
    price: 'R$49 / mês',
    buttonText: 'Assinar Premium',
    checkoutPlan: 'Premium Mensal',
    features: [
      'tudo do plano Pro',
      'IA financeira avançada',
      'previsões de saldo',
      'alertas inteligentes',
      'análises profundas de despesas',
      'suporte prioritário',
    ],
  },
];

const features = [
  {
    icon: LayoutDashboard,
    title: 'Dashboard inteligente',
    text: 'Visualize saldo, receitas e despesas instantaneamente.',
  },
  {
    icon: BrainCircuit,
    title: 'Insights com IA',
    text: 'Receba recomendações automáticas para melhorar suas finanças.',
  },
  {
    icon: Target,
    title: 'Metas financeiras',
    text: 'Defina metas e acompanhe seu progresso.',
  },
  {
    icon: CreditCard,
    title: 'Controle de dívidas',
    text: 'Saiba exatamente quanto deve e quanto já pagou.',
  },
  {
    icon: BarChart3,
    title: 'Previsões financeiras',
    text: 'Entenda como seus gastos impactam seu saldo no futuro.',
  },
  {
    icon: Wallet,
    title: 'Multi-contas',
    text: 'Gerencie contas e carteiras separadas sem misturar seus dados.',
  },
];

export default function LandingPage() {
  const brandLogo = '/brand/cote-finance-ai-logo.svg';
  const router = useRouter();
  const [isBusy, setIsBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [heroParallax, setHeroParallax] = React.useState({ x: 0, y: 0 });

  const scrollTo = React.useCallback((id: string) => {
    const node = document.getElementById(id);
    if (!node) return;
    node.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const handleHeroMouseMove = React.useCallback((event: React.MouseEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const nx = (event.clientX - rect.left) / rect.width - 0.5;
    const ny = (event.clientY - rect.top) / rect.height - 0.5;
    setHeroParallax({
      x: nx * 18,
      y: ny * 16,
    });
  }, []);

  const handleHeroMouseLeave = React.useCallback(() => {
    setHeroParallax({ x: 0, y: 0 });
  }, []);

  const openAuth = React.useCallback(
    (mode: 'signup' | 'login', plan?: string) => {
      const search = new URLSearchParams();
      search.set('auth', mode);
      if (plan) search.set('plan', plan);
      router.push(`/app?${search.toString()}`);
    },
    [router]
  );

  const startFree = React.useCallback(async () => {
    setIsBusy(true);
    setError(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        openAuth('signup');
        return;
      }

      // Never block navigation to app on setup latency/error.
      void fetch('/api/setup-user', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      }).catch((setupError) => {
        console.error('setup-user warmup failed:', setupError);
      });

      router.push('/app');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao iniciar cadastro.');
    } finally {
      setIsBusy(false);
    }
  }, [openAuth, router]);

  const checkoutPlan = React.useCallback(
    async (plan?: CheckoutPlan) => {
      if (!plan) {
        await startFree();
        return;
      }

      setIsBusy(true);
      setError(null);

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.access_token) {
          openAuth('signup', plan);
          return;
        }

        const setupResponse = await fetch('/api/setup-user', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }).catch(() => null);

        if (setupResponse && !setupResponse.ok && (setupResponse.status === 401 || setupResponse.status === 403)) {
          openAuth('login', plan);
          return;
        }

        const dashboardResponse = await fetch('/api/dashboard', {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }).catch(() => null);

        const dashboardPayload = dashboardResponse
          ? await dashboardResponse.json().catch(() => ({}))
          : {};
        const workspaceId =
          typeof dashboardPayload?.activeWorkspaceId === 'string' ? dashboardPayload.activeWorkspaceId : undefined;

        const selectedPlan = parseCheckoutPlanLabel(plan);
        if (!selectedPlan) {
          throw new Error('Plano invalido para checkout.');
        }

        router.push(
          getCheckoutPath({
            plan: selectedPlan.plan,
            interval: selectedPlan.interval,
            workspaceId,
          })
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao iniciar checkout.');
      } finally {
        setIsBusy(false);
      }
    },
    [openAuth, router, startFree]
  );

  return (
    <div
      className={`theme-landing-shell ${displayFont.variable} ${bodyFont.variable} min-h-screen bg-slate-950 text-slate-100`}
      style={{ fontFamily: 'var(--font-body)' }}
    >
      <div className="theme-landing-backdrop pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_10%_10%,rgba(16,185,129,.18),transparent_32%),radial-gradient(circle_at_90%_8%,rgba(59,130,246,.16),transparent_28%),linear-gradient(180deg,#020617_0%,#020617_52%,#0b1120_100%)]" />

      <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/75 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:gap-6 lg:py-4">
          <Link href="/" className="flex min-w-0 items-center">
            <Image
              src="/brand/cote-favicon.svg"
              alt="Cote Finance AI"
              width={96}
              height={96}
              priority
              className="h-11 w-11 sm:hidden"
            />
            <Image
              src={brandLogo}
              alt="Cote Finance AI - By Cote Juros"
              width={560}
              height={150}
              priority
              className="hidden h-16 w-auto sm:block lg:h-20"
            />
          </Link>

          <nav className="hidden items-center gap-6 text-sm text-slate-300 lg:flex">
            <button onClick={() => scrollTo('video-demo')} className="transition-colors hover:text-white">
              Produto
            </button>
            <button onClick={() => scrollTo('como-funciona')} className="transition-colors hover:text-white">
              Como funciona
            </button>
            <button onClick={() => scrollTo('funcionalidades')} className="transition-colors hover:text-white">
              Funcionalidades
            </button>
            <Link href="/blog" className="transition-colors hover:text-white">
              Blog
            </Link>
            <button onClick={() => scrollTo('planos')} className="transition-colors hover:text-white">
              Preços
            </button>
          </nav>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <button
              onClick={() => openAuth('login')}
              className="rounded-xl border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 transition-colors hover:border-slate-500 sm:min-w-[112px] sm:px-4 sm:text-sm"
            >
              Entrar
            </button>
            <button
              onClick={startFree}
              disabled={isBusy}
              className="rounded-xl bg-emerald-500 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-emerald-600 disabled:opacity-60 sm:min-w-[152px] sm:px-4 sm:text-sm"
            >
              Começar grátis
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl space-y-16 px-4 pb-20 pt-10 sm:space-y-20 sm:px-6 sm:pb-24 sm:pt-14">
        <section
          className="grid items-center gap-10 lg:grid-cols-2"
          onMouseMove={handleHeroMouseMove}
          onMouseLeave={handleHeroMouseLeave}
        >
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
            className="space-y-6 text-center lg:text-left"
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200">
              <Sparkles size={14} /> Controle financeiro com IA
            </span>
            <h1 className="text-[2.35rem] font-bold leading-tight text-white sm:text-5xl lg:text-6xl" style={{ fontFamily: 'var(--font-display)' }}>
              Entenda para onde o seu dinheiro está indo em minutos
            </h1>
            <p className="max-w-xl text-lg leading-relaxed text-slate-300">
              O Cote Finance AI organiza suas finanças automaticamente e usa inteligência artificial para mostrar como
              você pode economizar mais e tomar decisões financeiras melhores.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center lg:justify-start">
              <button
                onClick={startFree}
                disabled={isBusy}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-emerald-600 disabled:opacity-60"
              >
                Começar grátis <ArrowRight size={16} />
              </button>
              <button
                onClick={() => scrollTo('como-funciona')}
                className="rounded-xl border border-slate-700 bg-slate-900/60 px-6 py-3 text-sm font-semibold text-slate-200 transition-colors hover:border-slate-500"
              >
                Ver como funciona
              </button>
            </div>
            {error && <div className="rounded-xl border border-rose-400/25 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</div>}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.08 }}
            className="relative"
            style={{
              transform: `translate3d(${heroParallax.x * -0.35}px, ${heroParallax.y * -0.35}px, 0)`,
            }}
          >
            <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-r from-emerald-500/25 via-cyan-500/12 to-blue-500/20 blur-3xl sm:-inset-6" />
            <div className="relative rounded-[2rem] border border-white/10 bg-slate-900/75 p-4 sm:p-5">
              <motion.div
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
                className="mb-3 inline-flex items-center rounded-xl border border-cyan-300/25 bg-slate-900/90 px-3 py-2 text-[11px] text-cyan-200 sm:text-xs"
              >
                IA detectou 3 oportunidades
              </motion.div>
              <p className="mb-4 text-xs uppercase tracking-[0.2em] text-slate-500">Preview do dashboard</p>
              <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3">
                  <p className="text-[11px] text-emerald-200">Saldo</p>
                  <p className="text-sm font-bold text-emerald-100">R$ 12.830</p>
                </div>
                <div className="rounded-xl border border-cyan-400/30 bg-cyan-500/10 p-3">
                  <p className="text-[11px] text-cyan-200">Receitas</p>
                  <p className="text-sm font-bold text-cyan-100">R$ 9.430</p>
                </div>
                <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-3">
                  <p className="text-[11px] text-rose-200">Despesas</p>
                  <p className="text-sm font-bold text-rose-100">R$ 4.180</p>
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                <p className="mb-2 text-xs text-slate-400">Receitas x Despesas (6 meses)</p>
                <svg viewBox="0 0 320 96" className="h-24 w-full">
                  <path
                    d="M0,70 C22,62 42,42 68,38 C92,34 116,49 142,42 C168,35 190,24 214,22 C238,20 262,34 288,36 C302,38 311,33 320,27"
                    fill="none"
                    stroke="rgba(16,185,129,.95)"
                    strokeWidth="3"
                  />
                  <path
                    d="M0,86 C24,84 42,74 68,72 C92,70 116,78 142,75 C170,72 188,63 214,66 C240,69 262,78 288,80 C304,82 312,77 320,73"
                    fill="none"
                    stroke="rgba(251,113,133,.9)"
                    strokeWidth="3"
                  />
                </svg>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-slate-950/60 p-3 text-xs text-slate-300">
                  Insight IA: gasto em alimentação subiu 14%.
                </div>
                <div className="rounded-xl border border-white/10 bg-slate-950/60 p-3 text-xs text-slate-300">
                  Meta mensal: 82% concluída.
                </div>
              </div>
            </div>
            <motion.div
              animate={{ y: [0, 6, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute -bottom-5 -right-6 hidden rounded-xl border border-emerald-300/25 bg-slate-900/90 px-3 py-2 text-xs text-emerald-200 xl:block"
              style={{
                transform: `translate3d(${heroParallax.x * 0.45}px, ${heroParallax.y * 0.45}px, 0)`,
              }}
            >
              Projeção mensal em tempo real
            </motion.div>
          </motion.div>
        </section>

        <motion.section
          id="problema"
          className="relative grid items-center gap-10 lg:grid-cols-[1.05fr_.95fr]"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-120px' }}
          transition={{ duration: 0.45 }}
        >
          <div className="pointer-events-none absolute inset-x-0 top-8 -z-10 h-56 bg-[radial-gradient(circle_at_20%_30%,rgba(248,113,113,.14),transparent_55%)]" />
          <div className="space-y-5 lg:order-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-rose-300/30 bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-100">
              <TrendingDown size={14} /> Problemas comuns no controle financeiro
            </span>
            <h2 className="text-3xl font-bold text-white md:text-4xl" style={{ fontFamily: 'var(--font-display)' }}>
              Seu dinheiro sai, mas você não enxerga para onde.
            </h2>
            <p className="text-slate-300">No fim do mês, a sensação é sempre a mesma:</p>
            <ul className="space-y-2 text-slate-200">
              <li className="flex items-center justify-start gap-2">
                <TrendingDown size={16} className="text-rose-300" /> o dinheiro simplesmente desaparece
              </li>
              <li className="flex items-center justify-start gap-2">
                <TrendingDown size={16} className="text-rose-300" /> pequenas despesas viram grandes problemas
              </li>
              <li className="flex items-center justify-start gap-2">
                <TrendingDown size={16} className="text-rose-300" /> falta clareza para decidir com confiança
              </li>
              <li className="flex items-center justify-start gap-2">
                <TrendingDown size={16} className="text-rose-300" /> economizar parece difícil de manter
              </li>
              <li className="flex items-center justify-start gap-2">
                <TrendingDown size={16} className="text-rose-300" /> decisões financeiras viram um chute
              </li>
            </ul>
            <p className="text-slate-300">Sem visibilidade real, melhorar suas finanças fica lento e cansativo.</p>
          </div>

          <motion.div
            whileHover={{ y: -4 }}
            transition={{ duration: 0.2 }}
            className="relative mx-auto w-full max-w-xl lg:order-1"
          >
            <Image
              src="/landing/problem-visual.svg"
              alt="Problemas comuns no controle financeiro"
              width={880}
              height={620}
              className="h-auto w-full"
              priority={false}
            />
            <div className="absolute left-3 top-3 hidden rounded-lg border border-rose-300/25 bg-slate-900/90 px-3 py-1.5 text-[11px] text-rose-200 sm:block lg:-left-3 lg:top-5">
              Sem visibilidade real
            </div>
            <div className="absolute right-3 bottom-4 hidden rounded-lg border border-amber-300/25 bg-slate-900/90 px-3 py-1.5 text-[11px] text-amber-200 sm:block lg:-right-3 lg:bottom-7">
              Decisão no escuro
            </div>
          </motion.div>
        </motion.section>

        <motion.section
          id="solucao"
          className="relative grid items-center gap-10 lg:grid-cols-[.95fr_1.05fr]"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-120px' }}
          transition={{ duration: 0.45 }}
        >
          <div className="pointer-events-none absolute inset-x-0 top-6 -z-10 h-56 bg-[radial-gradient(circle_at_80%_30%,rgba(16,185,129,.18),transparent_52%)]" />
          <motion.div
            whileHover={{ y: -4 }}
            transition={{ duration: 0.2 }}
            className="relative mx-auto w-full max-w-xl lg:order-2"
          >
            <Image
              src="/landing/solution-visual.svg"
              alt="Clareza financeira com IA"
              width={880}
              height={620}
              className="h-auto w-full"
              priority={false}
            />
            <div className="absolute left-3 top-3 hidden rounded-lg border border-emerald-300/25 bg-slate-900/90 px-3 py-1.5 text-[11px] text-emerald-200 sm:block lg:-left-3 lg:top-5">
              Insights automáticos
            </div>
            <div className="absolute right-3 bottom-4 hidden rounded-lg border border-cyan-300/25 bg-slate-900/90 px-3 py-1.5 text-[11px] text-cyan-200 sm:block lg:-right-3 lg:bottom-7">
              Clareza em minutos
            </div>
          </motion.div>

          <div className="space-y-5 lg:order-1">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-100">
              <Sparkles size={14} /> Clareza financeira com inteligência artificial
            </span>
            <h2 className="text-3xl font-bold text-white md:text-4xl" style={{ fontFamily: 'var(--font-display)' }}>
              Tenha visão completa da sua vida financeira em minutos.
            </h2>
            <p className="text-emerald-100">Com o Cote Finance AI você entende exatamente o que acontece com seu dinheiro:</p>
            <ul className="space-y-2 text-emerald-100">
              <li className="flex items-center justify-start gap-2">
                <Check size={16} className="text-emerald-300" /> exatamente para onde seu dinheiro está indo
              </li>
              <li className="flex items-center justify-start gap-2">
                <Check size={16} className="text-emerald-300" /> quais gastos estão aumentando e por quê
              </li>
              <li className="flex items-center justify-start gap-2">
                <Check size={16} className="text-emerald-300" /> quanto você realmente está economizando
              </li>
              <li className="flex items-center justify-start gap-2">
                <Check size={16} className="text-emerald-300" /> quais ações práticas melhoram seus hábitos financeiros
              </li>
            </ul>
            <p className="text-emerald-100">Tudo explicado de forma simples, direta e acionável.</p>
          </div>
        </motion.section>

        <motion.section
          id="como-funciona"
          className="space-y-6"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-120px' }}
          transition={{ duration: 0.45 }}
        >
          <h2
            className="text-center text-3xl font-bold text-white md:text-4xl"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Como funciona
          </h2>
          <div className="mx-auto grid max-w-5xl gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-slate-900/55 p-5 text-center">
              <p className="mb-2 text-xs uppercase tracking-widest text-cyan-300">Passo 1</p>
              <p className="text-slate-200">Adicione suas receitas e despesas rapidamente.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-900/55 p-5 text-center">
              <p className="mb-2 text-xs uppercase tracking-widest text-cyan-300">Passo 2</p>
              <p className="text-slate-200">Veja tudo em um dashboard financeiro claro.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-900/55 p-5 text-center">
              <p className="mb-2 text-xs uppercase tracking-widest text-cyan-300">Passo 3</p>
              <p className="text-slate-200">
                Receba insights da inteligência artificial que ajudam você a melhorar suas finanças.
              </p>
            </div>
          </div>
        </motion.section>

        <motion.section
          id="video-demo"
          className="relative overflow-hidden py-4"
          initial={{ opacity: 0, y: 26 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-120px' }}
          transition={{ duration: 0.5 }}
        >
          <div className="pointer-events-none absolute inset-x-0 top-8 -z-10 h-72 bg-[radial-gradient(circle_at_15%_20%,rgba(16,185,129,.2),transparent_46%),radial-gradient(circle_at_82%_80%,rgba(59,130,246,.18),transparent_42%)]" />
          <div className="mx-auto flex max-w-5xl flex-col items-center gap-8 text-center">
            <div className="max-w-3xl space-y-5">
              <span className="inline-flex items-center gap-2 rounded-full border border-cyan-300/35 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-100">
                <Sparkles size={14} /> Demonstração do produto
              </span>
              <h3 className="text-3xl font-bold text-white md:text-4xl" style={{ fontFamily: 'var(--font-display)' }}>
                Veja o Cote Finance AI em ação
              </h3>
              <p className="text-slate-300">
                Demonstração dinâmica da plataforma analisando finanças em tempo real.
              </p>
              <ul className="space-y-2 text-slate-200">
                <li className="flex items-center justify-center gap-2">
                  <Check size={16} className="text-emerald-300" /> movimentação automática de receitas e despesas
                </li>
                <li className="flex items-center justify-center gap-2">
                  <Check size={16} className="text-cyan-300" /> análise instantânea de gastos por categoria
                </li>
                <li className="flex items-center justify-center gap-2">
                  <Check size={16} className="text-blue-300" /> insights acionáveis da IA
                </li>
              </ul>
              <button
                onClick={startFree}
                disabled={isBusy}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-emerald-600 disabled:opacity-60"
              >
                Testar no meu painel <ArrowRight size={16} />
              </button>
            </div>

            <motion.div whileHover={{ y: -3, scale: 1.005 }} className="relative mx-auto w-full max-w-3xl">
              <div className="absolute -inset-5 rounded-[2.3rem] bg-[radial-gradient(circle_at_35%_15%,rgba(16,185,129,.35),transparent_48%),radial-gradient(circle_at_70%_80%,rgba(16,185,129,.18),transparent_45%)] blur-2xl" />
              <div className="relative overflow-hidden rounded-[2rem] bg-slate-950/88 p-3 sm:p-4 ring-1 ring-emerald-300/15 shadow-[0_28px_95px_-38px_rgba(16,185,129,.68)]">
                <div className="mb-4 flex items-center justify-between rounded-xl bg-slate-900/80 px-3 py-2 sm:px-4">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-rose-400/90" />
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-400/90" />
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/90" />
                  </div>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Cote Finance AI</p>
                </div>

                <div className="grid gap-4 md:grid-cols-[1.1fr_.9fr]">
                  <div className="space-y-4 rounded-2xl bg-slate-900/70 p-4 ring-1 ring-emerald-300/12">
                    <p className="text-xs text-slate-400">Receitas x despesas (6 meses)</p>
                    <svg viewBox="0 0 320 120" className="h-32 w-full">
                      <motion.path
                        d="M0,88 C28,78 48,42 74,36 C100,30 122,52 149,42 C176,32 200,18 226,16 C252,14 274,30 300,32 C312,33 318,26 320,24"
                        fill="none"
                        stroke="rgba(16,185,129,.95)"
                        strokeWidth="3.5"
                        initial={{ pathLength: 0, opacity: 0.3 }}
                        whileInView={{ pathLength: 1, opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 1.2, ease: 'easeOut' }}
                      />
                      <motion.path
                        d="M0,108 C22,106 48,95 74,90 C98,86 122,98 149,94 C176,90 200,76 226,80 C252,84 274,90 300,94 C312,96 318,92 320,89"
                        fill="none"
                        stroke="rgba(251,113,133,.92)"
                        strokeWidth="3.5"
                        initial={{ pathLength: 0, opacity: 0.3 }}
                        whileInView={{ pathLength: 1, opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 1.2, delay: 0.2, ease: 'easeOut' }}
                      />
                    </svg>
                    <div className="grid grid-cols-3 gap-2">
                      {[62, 84, 56, 88, 70, 94].map((height, idx) => (
                        <div key={`bar-${idx}`} className="flex h-16 items-end rounded-lg bg-slate-950/70 p-1">
                          <motion.div
                            className="w-full rounded-md bg-gradient-to-t from-emerald-500 to-cyan-400"
                            initial={{ height: 6 }}
                            animate={{ height: [Math.max(8, height - 16), height, Math.max(10, height - 10)] }}
                            transition={{
                              duration: 2 + idx * 0.1,
                              repeat: Infinity,
                              repeatType: 'mirror',
                              ease: 'easeInOut',
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.35 }}
                      className="rounded-2xl border border-emerald-300/30 bg-emerald-500/10 p-3"
                    >
                      <p className="text-[11px] text-emerald-200">Saldo projetado</p>
                      <p className="text-lg font-bold text-emerald-100">R$ 8.430</p>
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.35, delay: 0.1 }}
                      className="rounded-2xl border border-cyan-300/30 bg-cyan-500/10 p-3"
                    >
                      <p className="text-[11px] text-cyan-200">Economia potencial</p>
                      <p className="text-lg font-bold text-cyan-100">+ R$ 1.280/ano</p>
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.35, delay: 0.2 }}
                      className="rounded-2xl bg-slate-900/70 p-3 ring-1 ring-white/10"
                    >
                      <p className="mb-1 text-[11px] text-slate-400">Insight IA</p>
                      <p className="text-sm text-slate-200">
                        Transporte subiu 18%. Reduzindo 10% você recupera R$ 146/mês.
                      </p>
                    </motion.div>
                  </div>
                </div>
              </div>

              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute -left-5 top-12 hidden rounded-xl border border-cyan-300/30 bg-slate-900/92 px-3 py-2 text-xs text-cyan-200 xl:block"
              >
                IA analisando padrões
              </motion.div>
              <motion.div
                animate={{ y: [0, 6, 0] }}
                transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute -right-4 bottom-10 hidden rounded-xl border border-emerald-300/30 bg-slate-900/92 px-3 py-2 text-xs text-emerald-200 xl:block"
              >
                Atualização em tempo real
              </motion.div>
            </motion.div>
          </div>
        </motion.section>

        <motion.section
          id="funcionalidades"
          className="space-y-6"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-120px' }}
          transition={{ duration: 0.45 }}
        >
          <h2
            className="text-center text-3xl font-bold text-white md:text-4xl"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Um sistema completo para sua vida financeira
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <motion.div
                key={feature.title}
                whileHover={{ y: -4 }}
                className="rounded-2xl border border-white/10 bg-slate-900/55 p-5 text-center"
              >
                <feature.icon size={18} className="mx-auto mb-3 text-emerald-300" />
                <h3 className="mb-2 text-lg font-semibold text-white">{feature.title}</h3>
                <p className="text-sm text-slate-300">{feature.text}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        <motion.section
          className="relative grid items-center gap-10 lg:grid-cols-[1.05fr_.95fr]"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-120px' }}
          transition={{ duration: 0.45 }}
        >
          <div className="pointer-events-none absolute inset-x-0 top-10 -z-10 h-56 bg-[radial-gradient(circle_at_20%_30%,rgba(16,185,129,.15),transparent_54%)]" />

          <div className="space-y-5">
            <h2 className="text-3xl font-bold text-white md:text-4xl" style={{ fontFamily: 'var(--font-display)' }}>
              Clareza financeira muda tudo.
            </h2>
            <p className="text-slate-300">Quando você entende seus números:</p>
            <ul className="space-y-2 text-slate-200">
              <li className="flex items-center justify-start gap-2">
                <TrendingUp size={16} className="text-emerald-300" /> economizar fica mais fácil
              </li>
              <li className="flex items-center justify-start gap-2">
                <TrendingUp size={16} className="text-emerald-300" /> decisões ficam melhores
              </li>
              <li className="flex items-center justify-start gap-2">
                <TrendingUp size={16} className="text-emerald-300" /> metas se tornam possíveis
              </li>
              <li className="flex items-center justify-start gap-2">
                <TrendingUp size={16} className="text-emerald-300" /> dívidas deixam de ser um problema
              </li>
            </ul>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-200">
              Resultado: Mais controle sobre sua vida financeira.
            </div>
          </div>

          <motion.div
            whileHover={{ y: -4 }}
            transition={{ duration: 0.2 }}
            className="relative mx-auto w-full max-w-xl"
          >
            <Image
              src="/landing/clarity-visual.svg"
              alt="Visual de evolução financeira com clareza"
              width={880}
              height={620}
              className="h-auto w-full"
              priority={false}
            />
            <div className="absolute left-3 top-4 hidden rounded-lg border border-emerald-300/25 bg-slate-900/90 px-3 py-1.5 text-[11px] text-emerald-200 sm:block lg:-left-3 lg:top-7">
              + Controle
            </div>
            <div className="absolute right-3 bottom-4 hidden rounded-lg border border-cyan-300/25 bg-slate-900/90 px-3 py-1.5 text-[11px] text-cyan-200 sm:block lg:-right-3 lg:bottom-7">
              + Decisões melhores
            </div>
          </motion.div>
        </motion.section>

        <motion.section
          className="rounded-3xl border border-white/10 bg-slate-900/50 p-6 md:p-10"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-120px' }}
          transition={{ duration: 0.45 }}
        >
          <h2 className="mb-4 text-3xl font-bold text-white md:text-4xl" style={{ fontFamily: 'var(--font-display)' }}>
            Controle financeiro não precisa ser complicado.
          </h2>
          <p className="mb-6 text-slate-300">
            Milhares de usuários já começaram a organizar suas finanças com o Cote Finance AI.
          </p>
          <p className="mb-6 text-slate-300">Nossa missão é simples: Dar clareza sobre o seu dinheiro.</p>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-5">
              <p className="text-2xl font-bold text-white">+12k</p>
              <p className="text-sm text-slate-400">usuários ativos</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-5">
              <p className="text-2xl font-bold text-white">R$ 320M</p>
              <p className="text-sm text-slate-400">em movimentações acompanhadas</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-5">
              <p className="text-2xl font-bold text-white">94%</p>
              <p className="text-sm text-slate-400">avaliam a plataforma como fácil de usar</p>
            </div>
          </div>
        </motion.section>

        <motion.section
          id="planos"
          className="space-y-6"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-120px' }}
          transition={{ duration: 0.45 }}
        >
          <h2
            className="text-center text-3xl font-bold text-white md:text-4xl"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Escolha o plano ideal para você
          </h2>

          <div className="grid gap-4 lg:grid-cols-3">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-3xl border p-6 ${
                  plan.popular ? 'border-emerald-300/45 bg-emerald-500/10' : 'border-white/10 bg-slate-900/55'
                }`}
              >
                {plan.popular && (
                  <span className="mb-4 inline-flex rounded-full bg-emerald-500 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white">
                    Mais popular
                  </span>
                )}
                <h3 className="text-2xl font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>
                  Plano {plan.name}
                </h3>
                <p className="mb-4 mt-1 text-xl font-semibold text-white">{plan.price}</p>

                <ul className="mb-6 space-y-2">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-slate-200">
                      <Check size={15} className="mt-0.5 text-emerald-300" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => void checkoutPlan(plan.checkoutPlan)}
                  disabled={isBusy}
                  className={`w-full rounded-xl px-4 py-3 text-sm font-bold transition-colors disabled:opacity-60 ${
                    plan.popular
                      ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                      : 'bg-slate-100 text-slate-900 hover:bg-white'
                  }`}
                >
                  {plan.buttonText}
                </button>
              </div>
            ))}
          </div>
        </motion.section>

        <motion.section
          className="relative space-y-5 py-4 text-center"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-120px' }}
          transition={{ duration: 0.45 }}
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-44 bg-[radial-gradient(circle_at_50%_10%,rgba(59,130,246,.18),transparent_62%)]" />
          <h2 className="text-3xl font-bold text-white md:text-4xl" style={{ fontFamily: 'var(--font-display)' }}>
            Sem contrato. Cancele quando quiser.
          </h2>
          <p className="mx-auto max-w-3xl text-slate-300">
            Comece gratuitamente e evolua para um plano pago apenas se quiser. Seus dados são protegidos e você mantém
            controle total da sua conta.
          </p>
          <div className="flex flex-wrap justify-center gap-3 text-sm text-slate-300">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1.5">
              <ShieldCheck size={14} className="text-emerald-300" /> Segurança de dados
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1.5">
              <Wallet size={14} className="text-cyan-300" /> Controle total da assinatura
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1.5">
              <CircleDollarSign size={14} className="text-amber-300" /> Sem fidelidade
            </span>
          </div>
        </motion.section>

        <motion.section
          className="relative overflow-hidden py-6 text-center"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-120px' }}
          transition={{ duration: 0.45 }}
        >
          <div className="pointer-events-none absolute inset-x-0 top-1/2 -z-10 h-52 -translate-y-1/2 bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,.28),transparent_55%),radial-gradient(circle_at_60%_70%,rgba(56,189,248,.22),transparent_45%)] blur-xl" />
          <h2 className="mx-auto mb-4 max-w-3xl text-3xl font-bold text-white md:text-5xl" style={{ fontFamily: 'var(--font-display)' }}>
            Seu dinheiro merece mais clareza.
          </h2>
          <p className="mx-auto mb-6 max-w-2xl text-slate-100/90">
            Comece hoje e descubra exatamente para onde seu dinheiro está indo.
          </p>
          <button
            onClick={startFree}
            disabled={isBusy}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-slate-900 transition-colors hover:bg-slate-100 disabled:opacity-60"
          >
            Começar grátis <ArrowRight size={16} />
          </button>
        </motion.section>
      </main>

      <footer className="border-t border-white/10 py-8">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-3 px-4 text-center text-xs text-slate-500 sm:flex-row sm:px-6 sm:text-left">
          <p>© {new Date().getFullYear()} Cote Finance AI. Todos os direitos reservados.</p>
          <div className="flex items-center gap-4">
            <Link href="/blog" className="hover:text-slate-300">
              Blog
            </Link>
            <Link href="/central-de-ajuda" className="hover:text-slate-300">
              Ajuda
            </Link>
            <Link href="/termos-de-uso" className="hover:text-slate-300">
              Termos
            </Link>
            <Link href="/politica-de-privacidade" className="hover:text-slate-300">
              Privacidade
            </Link>
            <Link href="/app" className="hover:text-slate-300">
              App
            </Link>
            <button onClick={() => openAuth('signup')} className="hover:text-slate-300">
              Cadastro
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
