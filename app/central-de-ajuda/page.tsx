import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  BadgeHelp,
  CreditCard,
  LockKeyhole,
  Rocket,
  Sparkles,
  Wallet,
} from 'lucide-react';
import { absoluteUrl } from '@/lib/blog/seo';

const categories = [
  {
    id: 'primeiros-passos',
    icon: Rocket,
    title: 'Primeiros passos',
    description: 'Cadastro, confirmação de e-mail, onboarding e primeiro acesso ao painel.',
    bullets: [
      'Como criar sua conta gratuita',
      'Como confirmar o e-mail corretamente',
      'Como começar com o workspace zerado',
    ],
  },
  {
    id: 'acesso-e-seguranca',
    icon: LockKeyhole,
    title: 'Acesso e segurança',
    description: 'Login com e-mail, Google, código por e-mail e recuperação de senha.',
    bullets: [
      'Entrar com Google ou e-mail e senha',
      'Usar código por e-mail para acessar',
      'Redefinir senha e proteger a conta',
    ],
  },
  {
    id: 'planos-e-cobranca',
    icon: CreditCard,
    title: 'Planos e cobrança',
    description: 'Assinatura, checkout, atualização de plano e regularização de pagamento.',
    bullets: [
      'Diferenças entre Free, Pro e Premium',
      'Como concluir o checkout com cartão',
      'Como regularizar cobrança pendente',
    ],
  },
  {
    id: 'uso-do-produto',
    icon: Wallet,
    title: 'Uso do produto',
    description: 'Transações, metas, dívidas, investimentos, relatórios e insights com IA.',
    bullets: [
      'Como lançar a primeira transação',
      'Como criar metas e acompanhar progresso',
      'Como usar os insights financeiros com IA',
    ],
  },
];

const faqs = [
  {
    question: 'Como começar a usar o Cote Finance AI?',
    answer:
      'Crie sua conta, confirme seu e-mail, faça login, conclua o onboarding inicial e comece com o workspace zerado. O sistema foi desenhado para iniciar sem dados antigos ou compartilhados.',
  },
  {
    question: 'Posso entrar com Google e continuar usando meu mesmo workspace?',
    answer:
      'Sim, desde que o e-mail da conta e a identidade autenticada estejam corretamente vinculados no Supabase Auth. O ideal é manter o mesmo e-mail principal para evitar duplicidade de usuário.',
  },
  {
    question: 'O que faço se o checkout não abrir o campo do cartão?',
    answer:
      'Primeiro confirme que suas chaves Stripe estão no mesmo ambiente, como sk_live com pk_live ou sk_test com pk_test. Se houver cobrança pendente ou assinatura incompleta, a área de assinatura também pode orientar você para regularização.',
  },
  {
    question: 'Quando meu plano Pro é liberado?',
    answer:
      'O acesso premium só deve ser concedido quando o pagamento ou o estado elegível da assinatura for confirmado pelo Stripe e sincronizado no backend. Estados como past_due, unpaid e incomplete não devem liberar acesso pago.',
  },
  {
    question: 'O blog faz parte do produto?',
    answer:
      'Sim. O blog foi criado para educar, mostrar uso prático do Cote Finance AI e ajudar você a transformar conteúdo em ação dentro do app.',
  },
  {
    question: 'Como falar com o suporte?',
    answer:
      'Hoje você pode usar a própria plataforma, a central de ajuda, os artigos do blog e os fluxos de autenticação e cobrança já integrados ao sistema. A próxima camada natural é adicionar um canal de suporte dedicado com SLA por plano.',
  },
];

export const metadata: Metadata = {
  title: 'Central de Ajuda | Cote Finance AI',
  description:
    'Encontre respostas sobre cadastro, login, assinatura, checkout, uso do app, IA e boas práticas para usar o Cote Finance AI.',
  alternates: {
    canonical: absoluteUrl('/central-de-ajuda'),
  },
  openGraph: {
    title: 'Central de Ajuda | Cote Finance AI',
    description:
      'Respostas rápidas sobre conta, assinatura, cobrança, dashboard, transações e inteligência artificial no Cote Finance AI.',
    url: absoluteUrl('/central-de-ajuda'),
    siteName: 'Cote Finance AI',
    type: 'website',
    images: [
      {
        url: absoluteUrl('/brand/cote-finance-ai-logo.png'),
        width: 2400,
        height: 640,
        alt: 'Central de Ajuda do Cote Finance AI',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Central de Ajuda | Cote Finance AI',
    description:
      'Respostas rápidas sobre conta, assinatura, cobrança, dashboard, transações e inteligência artificial no Cote Finance AI.',
    images: [absoluteUrl('/brand/cote-finance-ai-logo.png')],
  },
};

export default function HelpCenterPage() {
  return (
    <div className="min-h-screen bg-[#f7f8f3] text-slate-900">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(16,185,129,.10),transparent_30%),linear-gradient(180deg,#fbfcf8_0%,#f7f8f3_100%)]" />

      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-[#f7f8f3]/92 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/brand/cote-finance-ai-logo-black.svg"
              alt="Cote Finance AI - By Cote Juros"
              width={460}
              height={122}
              priority
              className="hidden h-11 w-auto sm:block"
            />
            <Image
              src="/brand/cote-favicon.svg"
              alt="Cote Finance AI"
              width={44}
              height={44}
              priority
              className="h-10 w-10 sm:hidden"
            />
          </Link>

          <nav className="hidden items-center gap-6 text-sm text-slate-600 md:flex">
            <Link href="/" className="transition-colors hover:text-slate-950">
              Landing
            </Link>
            <Link href="/blog" className="transition-colors hover:text-slate-950">
              Blog
            </Link>
            <Link href="/central-de-ajuda" className="font-semibold text-slate-950 transition-colors hover:text-emerald-700">
              Ajuda
            </Link>
            <Link href="/termos-de-uso" className="transition-colors hover:text-slate-950">
              Termos
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/app"
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-400 hover:text-slate-950"
            >
              Entrar
            </Link>
            <Link
              href="/app?auth=signup"
              className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-emerald-600"
            >
              Começar grátis
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 pb-20 pt-10 sm:px-6 sm:pb-24 sm:pt-14">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_28px_90px_-54px_rgba(15,23,42,.18)] sm:p-8 lg:p-10">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
            <BadgeHelp size={14} /> Central de ajuda
          </span>
          <h1 className="mt-5 max-w-4xl text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
            Tudo o que você precisa para usar o Cote Finance AI com clareza
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600 sm:text-lg">
            Encontre respostas rápidas sobre cadastro, login, cobrança, checkout, uso do dashboard, inteligência artificial e estrutura do SaaS.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              href="/app?auth=signup"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-emerald-600"
            >
              Começar grátis <ArrowRight size={16} />
            </Link>
            <Link
              href="/blog"
              className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-400 hover:text-slate-950"
            >
              Ver artigos do blog
            </Link>
          </div>
        </section>

        <section className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {categories.map((category) => {
            const Icon = category.icon;
            return (
              <article key={category.id} className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="inline-flex rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-700">
                  <Icon size={22} />
                </div>
                <h2 className="mt-5 text-xl font-black tracking-tight text-slate-950">{category.title}</h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">{category.description}</p>
                <ul className="mt-5 space-y-3 text-sm text-slate-700">
                  {category.bullets.map((bullet) => (
                    <li key={bullet} className="rounded-2xl border border-slate-200 bg-[#f7f8f3] px-4 py-3">
                      {bullet}
                    </li>
                  ))}
                </ul>
                <a href={`#${category.id}`} className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-emerald-700">
                  Ir para a seção <ArrowRight size={15} />
                </a>
              </article>
            );
          })}
        </section>

        <section className="mt-14 grid gap-8 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm lg:sticky lg:top-24 lg:h-fit">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Navegação</p>
            <nav className="mt-4 flex flex-col gap-3 text-sm">
              {categories.map((category) => (
                <a key={category.id} href={`#${category.id}`} className="rounded-xl border border-slate-200 px-4 py-3 font-medium text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-950">
                  {category.title}
                </a>
              ))}
              <a href="#faq" className="rounded-xl border border-slate-200 px-4 py-3 font-medium text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-950">
                Perguntas frequentes
              </a>
            </nav>
          </aside>

          <div className="space-y-8">
            <section id="primeiros-passos" className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <h2 className="text-2xl font-black tracking-tight text-slate-950">Primeiros passos</h2>
              <div className="mt-4 space-y-4 text-base leading-8 text-slate-700">
                <p>O fluxo ideal para começar no Cote Finance AI é simples: criar a conta, confirmar o e-mail, fazer login, concluir o onboarding inicial e começar com o workspace zerado.</p>
                <p>O sistema foi pensado para funcionar como SaaS multi-tenant. Isso significa que cada workspace deve começar sem dados herdados, respeitando o plano e o contexto do usuário autenticado.</p>
                <p>Se você estiver testando pela primeira vez, comece adicionando as primeiras transações, depois crie uma meta financeira e use a área de IA para interpretar o comportamento do mês.</p>
              </div>
            </section>

            <section id="acesso-e-seguranca" className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <h2 className="text-2xl font-black tracking-tight text-slate-950">Acesso e segurança</h2>
              <div className="mt-4 space-y-4 text-base leading-8 text-slate-700">
                <p>Você pode entrar com e-mail e senha, login com Google e código por e-mail. O ideal é manter um fluxo consistente por usuário para evitar duplicidade de contas.</p>
                <p>Se o login com Google apresentar erro, revise a configuração do provider no Supabase, as Redirect URLs autorizadas e o Client ID/Client Secret do Google Cloud.</p>
                <p>Em caso de perda de acesso, use a redefinição de senha e confirme se o e-mail transacional do projeto está corretamente configurado via SMTP.</p>
              </div>
            </section>

            <section id="planos-e-cobranca" className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <h2 className="text-2xl font-black tracking-tight text-slate-950">Planos e cobrança</h2>
              <div className="mt-4 space-y-4 text-base leading-8 text-slate-700">
                <p>Usuários Free devem seguir para o checkout correto quando tentam assinar. Usuários com assinatura ativa devem ver status, próxima cobrança e ação adequada para gerenciar o plano.</p>
                <p>Se houver cobrança pendente, o sistema precisa orientar para regularização. Estados como incomplete, unpaid e past_due não devem liberar acesso premium.</p>
                <p>O fluxo profissional depende de sincronização entre Stripe, banco e webhook. O portal do cliente continua útil para método de pagamento, invoices e cancelamento, mas não deve substituir o checkout inicial.</p>
              </div>
            </section>

            <section id="uso-do-produto" className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <h2 className="text-2xl font-black tracking-tight text-slate-950">Uso do produto</h2>
              <div className="mt-4 space-y-4 text-base leading-8 text-slate-700">
                <p>O núcleo do produto passa por transações, metas, dívidas, investimentos, relatórios e IA. O ideal é manter cada lançamento associado ao workspace correto, com leitura limpa e atualização rápida no dashboard.</p>
                <p>Para extrair valor rápido, registre movimentações reais, revise categorias, acompanhe o resumo do mês e use os insights para entender onde o dinheiro está sendo drenado.</p>
                <p>Se estiver em onboarding, procure atingir o primeiro valor percebido o quanto antes: registrar despesas, visualizar o painel e receber o primeiro insight acionável.</p>
              </div>
            </section>

            <section id="faq" className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <h2 className="text-2xl font-black tracking-tight text-slate-950">Perguntas frequentes</h2>
              <div className="mt-6 space-y-4">
                {faqs.map((faq) => (
                  <details key={faq.question} className="group rounded-2xl border border-slate-200 bg-[#f7f8f3] px-5 py-4">
                    <summary className="cursor-pointer list-none text-base font-semibold text-slate-950 marker:hidden">
                      {faq.question}
                    </summary>
                    <p className="mt-3 text-sm leading-7 text-slate-600">{faq.answer}</p>
                  </details>
                ))}
              </div>
            </section>
          </div>
        </section>

        <section className="mt-14 rounded-[2rem] border border-emerald-200 bg-[linear-gradient(180deg,#ffffff_0%,#f0fdf4_100%)] p-6 shadow-[0_24px_80px_-50px_rgba(16,185,129,0.30)] sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <p className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                <Sparkles size={14} /> Próximo passo
              </p>
              <h2 className="text-3xl font-black tracking-tight text-slate-950">Quer ver a ajuda virar resultado no app?</h2>
              <p className="max-w-2xl text-base leading-8 text-slate-600">
                Crie sua conta, organize suas finanças, acompanhe o dashboard e use a IA para transformar clareza em ação prática.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/app?auth=signup" className="rounded-xl bg-emerald-500 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-emerald-600">
                Começar grátis
              </Link>
              <Link href="/blog" className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-400 hover:text-slate-950">
                Ler o blog
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
