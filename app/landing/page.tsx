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
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';

const displayFont = Space_Grotesk({ subsets: ['latin'], weight: ['600', '700'], variable: '--font-display' });
const bodyFont = Manrope({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-body' });

type CheckoutPlan = 'Pro Mensal' | 'Premium Mensal';

type PlanCard = {
  name: 'Free' | 'Pro' | 'Premium';
  price: string;
  label?: string;
  benefit: string;
  buttonText: string;
  microcopy: string;
  features: string[];
  checkoutPlan?: CheckoutPlan;
  signupHref?: string;
  popular?: boolean;
  proof?: string;
  accent?: 'subtle' | 'highlight' | 'premium';
};

const legacyPlans: PlanCard[] = [
  {
    name: 'Premium',
    price: 'R$49/mÃªs',
    benefit: 'Controle financeiro avanÃ§ado com automaÃ§Ãµes inteligentes.',
    buttonText: 'Assinar Premium',
    microcopy: 'Mais profundidade, previsÃµes e suporte prioritÃ¡rio.',
    checkoutPlan: 'Premium Mensal',
    features: [
      'Tudo do plano Pro',
      'PrevisÃ£o de saldo futuro',
      'Alertas financeiros inteligentes',
      'AnÃ¡lise profunda de despesas',
      'AutomaÃ§Ã£o financeira no WhatsApp',
      'Suporte prioritÃ¡rio',
    ],
  },
  {
    name: 'Pro',
    price: 'R$29/mÃªs',
    benefit: 'Organize suas finanÃ§as com ajuda da inteligÃªncia artificial.',
    buttonText: 'Testar 3 dias grÃ¡tis',
    microcopy: 'Cancele quando quiser.',
    checkoutPlan: 'Pro Mensal',
    popular: true,
    proof: 'Mais de 80% dos usuÃ¡rios escolhem o plano Pro',
    features: [
      'LanÃ§amentos ilimitados',
      'Descubra exatamente para onde seu dinheiro estÃ¡ indo',
      'GrÃ¡ficos financeiros inteligentes',
      'AnÃ¡lise automÃ¡tica da IA sobre seus gastos',
      'Insights financeiros automÃ¡ticos',
      'RelatÃ³rios completos de despesas e receitas',
      'Resumos e alertas financeiros no WhatsApp',
    ],
  },
  {
    name: 'Free',
    price: 'R$0/mÃªs',
    benefit: 'Experimente o produto sem resolver completamente o problema.',
    buttonText: 'Criar conta grÃ¡tis',
    microcopy: 'Experimente gratuitamente. Sem cartÃ£o.',
    features: [
      'AtÃ© 15 lanÃ§amentos por mÃªs',
      'Dashboard financeiro bÃ¡sico',
      'Acompanhamento simples de saldo',
      'Sem anÃ¡lise da IA',
      'Sem relatÃ³rios avanÃ§ados',
      'Sem alertas no WhatsApp',
    ],
  },
];

const legacyPricingFaqs = [
  {
    question: 'Posso comeÃ§ar gratuitamente?',
    answer:
      'Sim. O plano Free permite experimentar o produto, registrar seus primeiros lanÃ§amentos e acompanhar seu saldo sem custo inicial.',
  },
  {
    question: 'Preciso de cartÃ£o para testar?',
    answer:
      'VocÃª pode criar sua conta grÃ¡tis sem cartÃ£o. Para testar o Pro, o fluxo segue o checkout do produto e vocÃª pode cancelar quando quiser.',
  },
  {
    question: 'Posso cancelar quando quiser?',
    answer:
      'Sim. Os planos pagos podem ser cancelados a qualquer momento na Ã¡rea de assinatura do produto.',
  },
  {
    question: 'Qual a diferenÃ§a entre Pro e Premium?',
    answer:
      'O Pro entrega controle financeiro completo com IA, relatÃ³rios e WhatsApp. O Premium adiciona previsÃµes, alertas inteligentes, anÃ¡lises profundas e suporte prioritÃ¡rio.',
  },
  {
    question: 'O WhatsApp estÃ¡ incluÃ­do em quais planos?',
    answer:
      'Os resumos e alertas financeiros no WhatsApp estÃ£o disponÃ­veis nos planos Pro e Premium. O Premium tambÃ©m inclui automaÃ§Ãµes financeiras mais avanÃ§adas.',
  },
] as const;

const currentPlans: PlanCard[] = [
  {
    name: 'Free',
    price: 'R$0/mÃªs',
    label: 'Entrada',
    benefit: 'Comece a visualizar seus gastos e sentir o produto na prÃ¡tica, sem compromisso.',
    buttonText: 'ComeÃ§ar grÃ¡tis',
    microcopy: 'Sem cartÃ£o. Ideal para dar o primeiro passo com seguranÃ§a.',
    features: [
      'AtÃ© 15 lanÃ§amentos por mÃªs',
      'Dashboard financeiro essencial',
      'VisÃ£o inicial de saldo, entradas e saÃ­das',
      'OrganizaÃ§Ã£o bÃ¡sica para sair do zero',
    ],
    accent: 'subtle',
  },
  {
    name: 'Pro',
    price: 'R$29/mÃªs',
    label: 'Melhor escolha',
    benefit: 'Descubra para onde seu dinheiro estÃ¡ indo e transforme seu diagnÃ³stico financeiro em uma rotina organizada.',
    buttonText: 'Testar Pro grÃ¡tis por 3 dias',
    microcopy: 'Depois do teste, continue por R$29/mÃªs. Cancele quando quiser.',
    checkoutPlan: 'Pro Mensal',
    popular: true,
    proof: 'Mais escolhido por quem quer sair do descontrole sem complicar a rotina.',
    features: [
      'LanÃ§amentos ilimitados para acompanhar tudo em um sÃ³ lugar',
      'IA que identifica padrÃµes e mostra onde vocÃª estÃ¡ perdendo dinheiro',
      'RelatÃ³rios e grÃ¡ficos completos para decisÃµes mais claras',
      'Insights automÃ¡ticos para economizar e ajustar sua rotina',
      'Metas, dÃ­vidas e investimentos com acompanhamento contÃ­nuo',
      'Resumos e alertas no WhatsApp para nÃ£o deixar nada passar',
    ],
    accent: 'highlight',
  },
  {
    name: 'Premium',
    price: 'R$49/mÃªs',
    label: 'Controle total',
    benefit: 'Para quem quer mais automaÃ§Ã£o, previsÃµes e profundidade para tomar decisÃµes com antecedÃªncia.',
    buttonText: 'Assinar Premium',
    microcopy: 'Mais inteligÃªncia, mais automaÃ§Ã£o e uma visÃ£o financeira mais estratÃ©gica.',
    checkoutPlan: 'Premium Mensal',
    features: [
      'Tudo do Pro com camada extra de automaÃ§Ã£o',
      'PrevisÃ£o de saldo para antecipar apertos e sobras',
      'Alertas inteligentes para agir antes do problema virar bola de neve',
      'AnÃ¡lises mais profundas de despesas e comportamento financeiro',
      'AutomaÃ§Ãµes financeiras no WhatsApp para acompanhamento contÃ­nuo',
      'Suporte prioritÃ¡rio para quem quer mais agilidade',
    ],
    accent: 'premium',
  },
];

const currentPricingFaqs = [
  {
    question: 'Posso comeÃ§ar gratuitamente?',
    answer:
      'Sim. O Free Ã© a porta de entrada para organizar seus primeiros lanÃ§amentos e entender como o Cote Finance AI funciona antes de evoluir.',
  },
  {
    question: 'Preciso de cartÃ£o para testar?',
    answer:
      'VocÃª pode criar sua conta no Free sem cartÃ£o. Para testar o Pro, o acesso comeÃ§a pelo checkout e o cancelamento pode ser feito quando quiser.',
  },
  {
    question: 'Posso cancelar quando quiser?',
    answer:
      'Sim. Os planos pagos podem ser cancelados a qualquer momento na Ã¡rea de assinatura, sem contrato de fidelidade.',
  },
  {
    question: 'Qual a diferenÃ§a entre Pro e Premium?',
    answer:
      'O Pro Ã© a melhor escolha para quem quer organizar a vida financeira com IA, clareza e acompanhamento diÃ¡rio. O Premium adiciona automaÃ§Ãµes, previsÃµes e anÃ¡lises mais profundas para quem quer controle total.',
  },
  {
    question: 'O WhatsApp estÃ¡ incluÃ­do em quais planos?',
    answer:
      'Os resumos e alertas no WhatsApp estÃ£o disponÃ­veis no Pro e no Premium. No Premium, esse acompanhamento ganha automaÃ§Ãµes mais avanÃ§adas.',
  },
] as const;

const currentFeatures = [
  {
    icon: LayoutDashboard,
    title: 'Dashboard inteligente',
    text: 'Visualize saldo, receitas e despesas instantaneamente.',
  },
  {
    icon: BrainCircuit,
    title: 'Insights com IA',
    text: 'Receba recomendaÃ§Ãµes automÃ¡ticas para melhorar suas finanÃ§as.',
  },
  {
    icon: Target,
    title: 'Metas financeiras',
    text: 'Defina metas e acompanhe seu progresso.',
  },
  {
    icon: CreditCard,
    title: 'Controle de dÃ­vidas',
    text: 'Saiba exatamente quanto deve e quanto jÃ¡ pagou.',
  },
  {
    icon: BarChart3,
    title: 'PrevisÃµes financeiras',
    text: 'Entenda como seus gastos impactam seu saldo no futuro.',
  },
  {
    icon: Wallet,
    title: 'Multi-contas',
    text: 'Gerencie contas e carteiras separadas sem misturar seus dados.',
  },
  {
    icon: MessageCircle,
    title: 'WhatsApp inteligente',
    text: 'Receba resumos, alertas e lembretes financeiros direto no seu WhatsApp.',
  },
];

const plans: PlanCard[] = [
  {
    name: 'Free',
    price: 'R$0/mÃªs',
    label: 'Entrada',
    benefit: 'Ideal para comeÃ§ar a organizar suas finanÃ§as',
    buttonText: 'Criar conta grÃ¡tis',
    microcopy: 'Sem cartÃ£o de crÃ©dito. Crie sua conta em segundos.',
    signupHref: '/signup?plan=free',
    features: [
      'Controle bÃ¡sico de receitas e despesas',
      'Dashboard financeiro',
      'GrÃ¡ficos essenciais',
      'OrganizaÃ§Ã£o simples das movimentaÃ§Ãµes',
    ],
    accent: 'subtle',
  },
  {
    name: 'Pro',
    price: 'R$29/mÃªs',
    label: 'Melhor escolha',
    benefit: 'A melhor escolha para quem quer entender melhor os gastos e usar a IA no dia a dia',
    buttonText: 'ComeÃ§ar teste grÃ¡tis',
    microcopy: 'Crie sua conta, teste grÃ¡tis e evolua no seu ritmo.',
    signupHref: '/signup?plan=pro&trial=true',
    popular: true,
    proof: 'Mais popular entre quem quer mais clareza sobre os gastos sem complicar a rotina.',
    features: [
      'Insights automÃ¡ticos da IA',
      'AnÃ¡lise avanÃ§ada de gastos',
      'RelatÃ³rios financeiros detalhados',
      'PrevisÃµes financeiras',
      'Alertas financeiros automÃ¡ticos',
    ],
    accent: 'highlight',
  },
  {
    name: 'Premium',
    price: 'R$49/mÃªs',
    label: 'Controle total',
    benefit: 'Controle financeiro mais completo com automaÃ§Ãµes e anÃ¡lises mais profundas',
    buttonText: 'Assinar Premium',
    microcopy: 'Para quem quer acompanhar tudo com mais profundidade e automaÃ§Ã£o.',
    signupHref: '/signup?plan=premium',
    features: [
      'Alertas financeiros via WhatsApp',
      'Resumos financeiros automÃ¡ticos',
      'Insights avanÃ§ados da IA',
      'Ferramentas avanÃ§adas de anÃ¡lise',
      'Suporte prioritÃ¡rio',
    ],
    accent: 'premium',
  },
];

const pricingFaqs = [
  {
    question: 'O Cote Finance AI Ã© gratuito?',
    answer: 'Sim. VocÃª pode comeÃ§ar com o plano gratuito e evoluir para um plano pago quando quiser mais recursos.',
  },
  {
    question: 'Preciso conectar minha conta bancÃ¡ria?',
    answer: 'NÃ£o. VocÃª pode registrar suas receitas e despesas manualmente e acompanhar tudo pela plataforma.',
  },
  {
    question: 'Como funciona a inteligÃªncia artificial?',
    answer:
      'A IA analisa seus lanÃ§amentos, identifica padrÃµes e entrega insights automÃ¡ticos para ajudar vocÃª a entender melhor seus gastos.',
  },
  {
    question: 'Posso cancelar quando quiser?',
    answer: 'Sim. Os planos pagos nÃ£o exigem contrato de longo prazo.',
  },
] as const;

const features = [
  {
    icon: LayoutDashboard,
    title: 'Receitas e despesas',
    text: 'Registro simples de receitas e despesas.',
  },
  {
    icon: BarChart3,
    title: 'GrÃ¡ficos inteligentes',
    text: 'GrÃ¡ficos financeiros inteligentes para visualizar tudo com mais clareza.',
  },
  {
    icon: BrainCircuit,
    title: 'AnÃ¡lise automÃ¡tica',
    text: 'AnÃ¡lise automÃ¡tica com IA e insights financeiros personalizados.',
  },
  {
    icon: Sparkles,
    title: 'Insights financeiros',
    text: 'Insights financeiros personalizados para apoiar decisÃµes melhores.',
  },
  {
    icon: MessageCircle,
    title: 'Alertas no WhatsApp',
    text: 'Alertas e resumos via WhatsApp.',
  },
  {
    icon: Target,
    title: 'PrevisÃµes financeiras',
    text: 'PrevisÃµes financeiras para acompanhar tendÃªncias e prÃ³ximos passos.',
  },
];

void currentPlans;
void currentPricingFaqs;
void currentFeatures;

export default function LandingPage() {
  const brandLogo = '/brand/cote-finance-ai-logo.svg';
  const router = useRouter();
  const [isBusy, setIsBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [heroParallax, setHeroParallax] = React.useState({ x: 0, y: 0 });

  const scrollTo = React.useCallback((id: string) => {
    const node = document.getElementById(id);
    if (!node) return;
    const header = document.querySelector('header');
    const headerHeight = header instanceof HTMLElement ? header.offsetHeight : 0;
    const top = node.getBoundingClientRect().top + window.scrollY - headerHeight - 16;
    window.scrollTo({ top: Math.max(top, 0), behavior: 'smooth' });
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

  const navigateToSignup = React.useCallback(
    (href: string) => {
      setError(null);
      router.push(href);
    },
    [router]
  );

  const startFree = React.useCallback(() => {
    navigateToSignup('/signup');
  }, [navigateToSignup]);

  return (
    <div
      className={`theme-landing-shell ${displayFont.variable} ${bodyFont.variable} min-h-screen overflow-x-clip bg-slate-950 text-slate-100`}
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
            <button type="button" onClick={() => scrollTo('produto')} className="transition-colors hover:text-white">
              Produto
            </button>
            <button type="button" onClick={() => scrollTo('como-funciona')} className="transition-colors hover:text-white">
              Como funciona
            </button>
            <button type="button" onClick={() => scrollTo('funcionalidades')} className="transition-colors hover:text-white">
              Funcionalidades
            </button>
            <Link href="/blog" className="transition-colors hover:text-white">
              Blog
            </Link>
            <button type="button" onClick={() => scrollTo('planos')} className="transition-colors hover:text-white">
              PreÃ§os
            </button>
          </nav>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <button
              onClick={() => router.push('/app?auth=login')}
              className="rounded-xl border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 transition-colors hover:border-slate-500 sm:min-w-[112px] sm:px-4 sm:text-sm"
            >
              Entrar
            </button>
            <button
              onClick={startFree}
              disabled={isBusy}
              className="rounded-xl bg-emerald-500 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-emerald-600 disabled:opacity-60 sm:min-w-[152px] sm:px-4 sm:text-sm"
            >
              ComeÃ§ar grÃ¡tis
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
              <Sparkles size={14} /> Sem cartÃ£o de crÃ©dito â€¢ Crie sua conta em segundos
            </span>
            <h1 className="text-[2.35rem] font-bold leading-tight text-white sm:text-5xl lg:text-6xl" style={{ fontFamily: 'var(--font-display)' }}>
              Descubra para onde seu dinheiro estÃ¡ indo e assuma o controle
            </h1>
            <p className="max-w-xl text-lg leading-relaxed text-slate-300">
              Cote Finance AI usa inteligÃªncia artificial para analisar seus gastos, organizar sua rotina financeira e
              mostrar com clareza como seu dinheiro estÃ¡ sendo usado. Receba insights automÃ¡ticos, grÃ¡ficos
              inteligentes e alertas via WhatsApp.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center lg:justify-start">
              <button
                onClick={startFree}
                disabled={isBusy}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-emerald-600 disabled:opacity-60"
              >
              ComeÃ§ar grÃ¡tis <ArrowRight size={16} />
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
            className="relative overflow-hidden sm:overflow-visible"
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
                  Insight IA: gasto em alimentaÃ§Ã£o subiu 14%.
                </div>
                <div className="rounded-xl border border-white/10 bg-slate-950/60 p-3 text-xs text-slate-300">
                  Meta mensal: 82% concluÃ­da.
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
              ProjeÃ§Ã£o mensal em tempo real
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
              Seu dinheiro saiâ€¦ mas vocÃª nÃ£o enxerga para onde.
            </h2>
            <p className="text-slate-300">No fim do mÃªs, a sensaÃ§Ã£o Ã© sempre a mesma:</p>
            <ul className="space-y-2 text-slate-200">
              <li className="flex items-center justify-start gap-2">
                <TrendingDown size={16} className="text-rose-300" /> O dinheiro acaba antes do esperado
              </li>
              <li className="flex items-center justify-start gap-2">
                <TrendingDown size={16} className="text-rose-300" /> Pequenos gastos passam despercebidos
              </li>
              <li className="flex items-center justify-start gap-2">
                <TrendingDown size={16} className="text-rose-300" /> Falta clareza sobre receitas e despesas
              </li>
              <li className="flex items-center justify-start gap-2">
                <TrendingDown size={16} className="text-rose-300" /> O saldo no fim do mÃªs sempre surpreende
              </li>
              <li className="flex items-center justify-start gap-2">
                <TrendingDown size={16} className="text-rose-300" /> Organizar tudo parece complicado
              </li>
            </ul>
            <p className="text-slate-300">Sem clareza, fica difÃ­cil entender o que ajustar e tomar decisÃµes melhores.</p>
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
              DecisÃ£o no escuro
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
              Insights automÃ¡ticos
            </div>
            <div className="absolute right-3 bottom-4 hidden rounded-lg border border-cyan-300/25 bg-slate-900/90 px-3 py-1.5 text-[11px] text-cyan-200 sm:block lg:-right-3 lg:bottom-7">
              Clareza em minutos
            </div>
          </motion.div>

          <div className="space-y-5 lg:order-1">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-100">
              <Sparkles size={14} /> Clareza financeira com inteligÃªncia artificial
            </span>
            <h2 className="text-3xl font-bold text-white md:text-4xl" style={{ fontFamily: 'var(--font-display)' }}>
              Clareza financeira muda tudo
            </h2>
            <p className="text-emerald-100">
              Cote Finance AI foi criado para transformar a forma como vocÃª entende seu dinheiro. Em vez de planilhas
              complicadas, vocÃª tem uma inteligÃªncia financeira trabalhando por vocÃª.
            </p>
            <ul className="space-y-2 text-emerald-100">
              <li className="flex items-center justify-start gap-2">
                <Check size={16} className="text-emerald-300" /> IA analisando gastos automaticamente
              </li>
              <li className="flex items-center justify-start gap-2">
                <Check size={16} className="text-emerald-300" /> GrÃ¡ficos financeiros inteligentes
              </li>
              <li className="flex items-center justify-start gap-2">
                <Check size={16} className="text-emerald-300" /> Insights personalizados
              </li>
              <li className="flex items-center justify-start gap-2">
                <Check size={16} className="text-emerald-300" /> OrganizaÃ§Ã£o financeira mais simples
              </li>
            </ul>
            <p className="text-emerald-100">Tudo explicado de forma simples, clara e prÃ¡tica.</p>
          </div>
        </motion.section>

        <motion.section
          id="como-funciona"
          className="scroll-mt-24 space-y-6 lg:scroll-mt-28"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-120px' }}
          transition={{ duration: 0.45 }}
        >
          <h2
            className="text-center text-3xl font-bold text-white md:text-4xl"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Um sistema completo para organizar sua vida financeira
          </h2>
          <div className="mx-auto grid max-w-5xl gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-slate-900/55 p-5 text-center">
              <p className="mb-2 text-xs uppercase tracking-widest text-cyan-300">Receitas e despesas</p>
              <p className="text-slate-200">Registro simples de receitas e despesas.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-900/55 p-5 text-center">
              <p className="mb-2 text-xs uppercase tracking-widest text-cyan-300">GrÃ¡ficos inteligentes</p>
              <p className="text-slate-200">GrÃ¡ficos financeiros inteligentes para entender o mÃªs com clareza.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-900/55 p-5 text-center">
              <p className="mb-2 text-xs uppercase tracking-widest text-cyan-300">IA e alertas</p>
              <p className="text-slate-200">
                AnÃ¡lise automÃ¡tica com IA, insights personalizados e alertas via WhatsApp.
              </p>
            </div>
          </div>
        </motion.section>

                <motion.section
          id="produto"
          className="relative scroll-mt-24 overflow-hidden py-4 pb-14 lg:scroll-mt-28 lg:overflow-visible lg:pb-16"
          initial={{ opacity: 0, y: 26 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-120px' }}
          transition={{ duration: 0.5 }}
        >
          <div className="pointer-events-none absolute inset-x-0 top-8 -z-10 h-72 bg-[radial-gradient(circle_at_15%_20%,rgba(16,185,129,.2),transparent_46%),radial-gradient(circle_at_82%_80%,rgba(59,130,246,.18),transparent_42%)]" />
          <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:gap-12">
            <div className="max-w-xl space-y-6 text-left">
              <span className="inline-flex items-center gap-2 rounded-full border border-cyan-300/35 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-100">
                <Sparkles size={14} /> Demonstração do produto
              </span>
              <div className="space-y-4">
                <h3 className="text-3xl font-bold text-white md:text-4xl" style={{ fontFamily: 'var(--font-display)' }}>
                  Tenha visão completa da sua vida financeira
                </h3>
                <p className="max-w-lg text-base leading-7 text-slate-300">
                  Visualize toda a sua vida financeira em um único lugar.
                </p>
              </div>

              <div className="grid gap-3">
                {[
                  'Receitas e despesas organizadas',
                  'Evolução do saldo em tempo real',
                  'Identificação automática de padrões de gastos',
                  'Alertas e tendências financeiras',
                ].map((benefit) => (
                  <div
                    key={benefit}
                    className="flex items-start gap-3 rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-slate-200 shadow-[0_18px_40px_-34px_rgba(15,23,42,.9)]"
                  >
                    <div className="mt-0.5 rounded-full border border-emerald-300/25 bg-emerald-500/10 p-1 text-emerald-200">
                      <Check size={14} />
                    </div>
                    <span>{benefit}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-col items-start gap-3 pt-1">
                <button
                  onClick={startFree}
                  disabled={isBusy}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-emerald-600 disabled:opacity-60"
                >
                  Começar grátis <ArrowRight size={16} />
                </button>
                <p className="text-sm text-slate-500">Experimente a organização financeira com IA sem complicar sua rotina.</p>
              </div>
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
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.35, delay: 0.28 }}
                      className="rounded-2xl border border-emerald-300/25 bg-emerald-500/10 p-3"
                    >
                      <p className="mb-1 text-[11px] text-emerald-200">WhatsApp</p>
                      <p className="text-sm text-emerald-50">
                        Receba lembretes de vencimento, resumo diário e alertas do que merece atenção.
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
                IA analisando gastos
              </motion.div>
              <motion.div
                animate={{ y: [0, 6, 0] }}
                transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute -right-4 -bottom-2 hidden rounded-xl border border-emerald-300/30 bg-slate-900/92 px-3 py-2 text-xs text-emerald-200 xl:block"
              >
                Organização em tempo real
              </motion.div>
            </motion.div>
          </div>
        </motion.section>

        <motion.section
          id="funcionalidades"
          className="scroll-mt-24 space-y-6 lg:scroll-mt-28"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-120px' }}
          transition={{ duration: 0.45 }}
        >
          <h2
            className="text-center text-3xl font-bold text-white md:text-4xl"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Um sistema completo para organizar sua vida financeira
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
              Quando vocÃª entende seu dinheiro, tudo muda
            </h2>
            <p className="text-slate-300">Quando vocÃª entende seu dinheiro:</p>
            <ul className="space-y-2 text-slate-200">
              <li className="flex items-center justify-start gap-2">
                <TrendingUp size={16} className="text-emerald-300" /> Pare de perder dinheiro sem perceber
              </li>
              <li className="flex items-center justify-start gap-2">
                <TrendingUp size={16} className="text-emerald-300" /> Visualize seus gastos com mais clareza
              </li>
              <li className="flex items-center justify-start gap-2">
                <TrendingUp size={16} className="text-emerald-300" /> Tome decisÃµes financeiras melhores
              </li>
              <li className="flex items-center justify-start gap-2">
                <TrendingUp size={16} className="text-emerald-300" /> Tenha mais controle sobre sua rotina financeira
              </li>
            </ul>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-200">
              Resultado: mais clareza, mais controle e decisÃµes mais seguras.
            </div>
          </div>

          <motion.div
            whileHover={{ y: -4 }}
            transition={{ duration: 0.2 }}
            className="relative mx-auto w-full max-w-xl"
          >
            <Image
              src="/landing/clarity-visual.svg"
              alt="Visual de evoluÃ§Ã£o financeira com clareza"
              width={880}
              height={620}
              className="h-auto w-full"
              priority={false}
            />
            <div className="absolute left-3 top-4 hidden rounded-lg border border-emerald-300/25 bg-slate-900/90 px-3 py-1.5 text-[11px] text-emerald-200 sm:block lg:-left-3 lg:top-7">
              + Controle
            </div>
            <div className="absolute right-3 bottom-4 hidden rounded-lg border border-cyan-300/25 bg-slate-900/90 px-3 py-1.5 text-[11px] text-cyan-200 sm:block lg:-right-3 lg:bottom-7">
              + DecisÃµes melhores
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
            Centenas de pessoas jÃ¡ estÃ£o organizando suas finanÃ§as
          </h2>
          <p className="mb-6 text-slate-300">
            Cada vez mais usuÃ¡rios estÃ£o usando o Cote Finance AI para visualizar melhor os gastos, entender seus
            hÃ¡bitos financeiros e tomar decisÃµes com mais clareza.
          </p>
          <p className="mb-6 text-slate-300">Nossa missÃ£o Ã© simples: ajudar vocÃª a enxergar o que acontece com o seu dinheiro.</p>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-5">
              <p className="text-2xl font-bold text-white">+12k</p>
              <p className="text-sm text-slate-400">usuÃ¡rios ativos</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-5">
              <p className="text-2xl font-bold text-white">R$ 320M</p>
              <p className="text-sm text-slate-400">em movimentaÃ§Ãµes acompanhadas</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-5">
              <p className="text-2xl font-bold text-white">94%</p>
              <p className="text-sm text-slate-400">avaliam a plataforma como fÃ¡cil de usar</p>
            </div>
          </div>
        </motion.section>

        <motion.section
          id="planos"
          className="scroll-mt-24 space-y-8 lg:scroll-mt-28"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-120px' }}
          transition={{ duration: 0.45 }}
        >
          <div className="space-y-5 text-center">
            <span className="inline-flex rounded-full border border-emerald-300/30 bg-emerald-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-200">
              Planos para cada fase da sua organizaÃ§Ã£o
            </span>
            <h2 className="text-center text-3xl font-bold text-white md:text-4xl" style={{ fontFamily: 'var(--font-display)' }}>
              Escolha o plano ideal para assumir o controle do seu dinheiro
            </h2>
            <p className="mx-auto max-w-3xl text-base leading-7 text-slate-300 md:text-lg">
              Use inteligÃªncia artificial para entender seus gastos, organizar sua rotina financeira e parar de perder
              dinheiro sem perceber.
            </p>
          </div>

          <div className="grid gap-5 lg:grid-cols-3 lg:items-stretch">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative flex h-full flex-col overflow-hidden rounded-[30px] border p-6 sm:p-7 ${
                  plan.accent === 'highlight'
                    ? 'border-emerald-300/50 bg-gradient-to-b from-emerald-400/20 via-slate-900/95 to-slate-950 shadow-[0_30px_90px_rgba(16,185,129,0.24)] ring-1 ring-emerald-300/20 lg:-translate-y-3 lg:scale-[1.02]'
                    : plan.accent === 'premium'
                      ? 'border-cyan-300/25 bg-[linear-gradient(180deg,rgba(14,116,144,0.22),rgba(15,23,42,0.94)_30%,rgba(2,6,23,0.98)_100%)] shadow-[0_26px_80px_rgba(34,211,238,0.14)]'
                      : 'border-white/10 bg-slate-900/55'
                }`}
              >
                <div
                  className={`pointer-events-none absolute inset-x-0 top-0 h-28 ${
                    plan.accent === 'highlight'
                      ? 'bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.24),transparent_72%)]'
                      : plan.accent === 'premium'
                        ? 'bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.16),transparent_72%)]'
                        : 'bg-[radial-gradient(circle_at_top,rgba(148,163,184,0.1),transparent_72%)]'
                  }`}
                />
                {plan.popular && (
                  <span className="absolute right-6 top-6 inline-flex rounded-full bg-emerald-500 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white">
                    Mais popular
                  </span>
                )}

                <div className="relative space-y-5">
                  <div className="space-y-3">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] ${
                        plan.accent === 'highlight'
                          ? 'border border-emerald-300/30 bg-emerald-400/10 text-emerald-100'
                          : plan.accent === 'premium'
                            ? 'border border-cyan-300/25 bg-cyan-400/10 text-cyan-100'
                            : 'border border-white/10 bg-white/5 text-slate-300'
                      }`}
                    >
                      {plan.label}
                    </span>
                    <h3 className="text-2xl font-bold text-white md:text-[2rem]" style={{ fontFamily: 'var(--font-display)' }}>
                      Plano {plan.name}
                    </h3>
                    <p className="text-sm leading-6 text-slate-200">{plan.benefit}</p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4">
                    <p className="text-3xl font-semibold text-white md:text-4xl">{plan.price}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-300">{plan.microcopy}</p>
                  </div>
                </div>

                <ul className="mb-7 mt-7 space-y-3.5">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-sm leading-6 text-slate-200">
                      <span className="mt-0.5 rounded-full border border-emerald-300/25 bg-emerald-400/10 p-1">
                        <Check size={12} className="shrink-0 text-emerald-300" />
                      </span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => navigateToSignup(plan.signupHref || '/signup')}
                  disabled={isBusy}
                  className={`mt-auto w-full rounded-xl px-4 py-3.5 text-sm font-bold transition-colors disabled:opacity-60 ${
                    plan.accent === 'highlight'
                      ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                      : plan.accent === 'premium'
                        ? 'bg-cyan-100 text-slate-950 hover:bg-white'
                        : 'bg-slate-100 text-slate-900 hover:bg-white'
                  }`}
                >
                  {plan.buttonText}
                </button>

                {plan.proof ? <p className="mt-4 text-center text-xs font-medium text-emerald-100">{plan.proof}</p> : null}
              </div>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {pricingFaqs.map((item) => (
              <details key={item.question} className="rounded-3xl border border-white/10 bg-slate-900/55 p-6">
                <summary className="cursor-pointer list-none text-base font-semibold text-white">{item.question}</summary>
                <p className="mt-4 text-sm leading-7 text-slate-300">{item.answer}</p>
              </details>
            ))}
          </div>
        </motion.section>

        <motion.section
          id="planos-legacy"
          className="hidden scroll-mt-24 space-y-8 lg:scroll-mt-28"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-120px' }}
          transition={{ duration: 0.45 }}
        >
          <div className="space-y-5 text-center">
            <span className="inline-flex rounded-full border border-emerald-300/30 bg-emerald-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-200">
              Planos para cada fase da sua organizaÃ§Ã£o
            </span>
            <h2
              className="text-center text-3xl font-bold text-white md:text-4xl"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Estas sÃ£o as melhores opÃ§Ãµes para organizar sua vida financeira
            </h2>
            <p className="mx-auto max-w-3xl text-base leading-7 text-slate-300 md:text-lg">
              Escolha o plano que faz mais sentido para o seu momento e transforme o resultado do quiz em uma rotina
              financeira mais clara, prÃ¡tica e consistente.
            </p>
          </div>

          <div className="grid gap-5 lg:grid-cols-3 lg:items-stretch">
            {legacyPlans.map((plan) => (
              <div
                key={plan.name}
                className={`relative flex h-full flex-col rounded-[30px] border p-6 ${
                  plan.popular
                    ? 'border-emerald-300/45 bg-gradient-to-b from-emerald-400/18 via-white/10 to-white/8 shadow-[0_30px_90px_rgba(16,185,129,0.22)] lg:-translate-y-3'
                    : 'border-white/10 bg-slate-900/55'
                }`}
              >
                {plan.popular && (
                  <span className="absolute right-6 top-6 inline-flex rounded-full bg-emerald-500 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white">
                    Mais popular
                  </span>
                )}
                <div className="space-y-4">
                  <p className="max-w-[18rem] text-sm leading-6 text-slate-200">{plan.benefit}</p>
                  <div>
                    <h3 className="text-2xl font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>
                      Plano {plan.name}
                    </h3>
                    <p className="mt-1 text-3xl font-semibold text-white">{plan.price}</p>
                    <p className="mt-2 text-sm text-slate-300">{plan.microcopy}</p>
                  </div>
                </div>

                <ul className="mb-6 mt-8 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-slate-200">
                      <Check size={15} className="mt-0.5 shrink-0 text-emerald-300" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => navigateToSignup(plan.signupHref || '/signup')}
                  disabled={isBusy}
                  className={`mt-auto w-full rounded-xl px-4 py-3 text-sm font-bold transition-colors disabled:opacity-60 ${
                    plan.popular
                      ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                      : 'bg-slate-100 text-slate-900 hover:bg-white'
                  }`}
                >
                  {plan.buttonText}
                </button>

                {plan.proof ? <p className="mt-4 text-center text-xs font-medium text-emerald-100">{plan.proof}</p> : null}
              </div>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {legacyPricingFaqs.map((item) => (
              <details key={item.question} className="rounded-3xl border border-white/10 bg-slate-900/55 p-6">
                <summary className="cursor-pointer list-none text-base font-semibold text-white">{item.question}</summary>
                <p className="mt-4 text-sm leading-7 text-slate-300">{item.answer}</p>
              </details>
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
            Comece gratuitamente, use no seu ritmo e evolua para um plano pago quando quiser mais recursos.
          </p>
          <div className="flex flex-wrap justify-center gap-3 text-sm text-slate-300">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1.5">
              <ShieldCheck size={14} className="text-emerald-300" /> SeguranÃ§a de dados
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1.5">
              <Wallet size={14} className="text-cyan-300" /> Controle total da assinatura
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1.5">
              <CircleDollarSign size={14} className="text-amber-300" /> Sem fidelidade
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1.5">
              <MessageCircle size={14} className="text-emerald-300" /> Alertas no WhatsApp
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
            Comece gratuitamente e descubra exatamente para onde seu dinheiro estÃ¡ indo.
          </p>
          <button
            onClick={startFree}
            disabled={isBusy}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-slate-900 transition-colors hover:bg-slate-100 disabled:opacity-60"
          >
            Criar conta grÃ¡tis <ArrowRight size={16} />
          </button>
        </motion.section>
      </main>

      <footer className="border-t border-white/10 py-8">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-3 px-4 text-center text-xs text-slate-500 sm:flex-row sm:px-6 sm:text-left">
          <p>Â© {new Date().getFullYear()} Cote Finance AI. Todos os direitos reservados.</p>
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
            <button onClick={() => navigateToSignup('/signup')} className="hover:text-slate-300">
              Cadastro
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

