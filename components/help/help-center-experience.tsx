'use client';

import * as React from 'react';
import {
  ArrowRight,
  BadgeHelp,
  BookOpenText,
  CreditCard,
  LockKeyhole,
  Search,
  ShieldCheck,
  Target,
  Wallet,
} from 'lucide-react';
import { BlogShell } from '@/components/blog/blog-shell';

type HelpCategory = {
  id: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  description: string;
  keywords: string[];
};

type PopularGuide = {
  id: string;
  title: string;
  description: string;
  categoryId: string;
  keywords: string[];
};

type HelpFaq = {
  id: string;
  question: string;
  answer: string[];
  keywords: string[];
};

type SearchItem = {
  id: string;
  title: string;
  body: string;
  kind: 'categoria' | 'guia' | 'faq';
  anchor: string;
  keywords: string[];
};

const categories: HelpCategory[] = [
  {
    id: 'primeiros-passos',
    icon: BadgeHelp,
    title: 'Primeiros passos',
    description: 'Aprenda a criar sua conta e começar a organizar suas finanças.',
    keywords: ['conta', 'cadastro', 'começar', 'primeiro acesso', 'email'],
  },
  {
    id: 'controle-de-gastos',
    icon: Wallet,
    title: 'Controle de gastos',
    description: 'Veja como registrar despesas, acompanhar movimentações e entender seus hábitos financeiros.',
    keywords: ['gastos', 'despesas', 'movimentações', 'receitas', 'controle', 'whatsapp', 'alertas'],
  },
  {
    id: 'metas-e-planejamento-financeiro',
    icon: Target,
    title: 'Metas e planejamento financeiro',
    description: 'Aprenda a criar metas financeiras e acompanhar seu progresso.',
    keywords: ['metas', 'planejamento', 'economizar', 'objetivos', 'progresso'],
  },
  {
    id: 'conta-e-seguranca',
    icon: LockKeyhole,
    title: 'Conta e segurança',
    description: 'Gerencie informações da conta, login e segurança.',
    keywords: ['senha', 'segurança', 'google', 'login', 'conta', 'whatsapp'],
  },
  {
    id: 'planos-e-pagamentos',
    icon: CreditCard,
    title: 'Planos e pagamentos',
    description: 'Tire dúvidas sobre assinatura, cobrança e gerenciamento do seu plano.',
    keywords: ['assinatura', 'pagamento', 'plano', 'cancelar plano', 'cobrança'],
  },
];

const popularGuides: PopularGuide[] = [
  {
    id: 'guia-comecar',
    title: 'Como começar a usar o Cote Finance AI',
    description:
      'Criar uma conta leva menos de um minuto. Depois de entrar na plataforma, registre suas primeiras movimentações financeiras e acompanhe o resumo do mês no painel.',
    categoryId: 'primeiros-passos',
    keywords: ['começar', 'conta', 'painel', 'primeiras movimentações'],
  },
  {
    id: 'guia-gastos',
    title: 'Como acompanhar seus gastos',
    description:
      'Registrar despesas ajuda você a entender para onde seu dinheiro está indo e identificar hábitos financeiros que podem ser melhorados.',
    categoryId: 'controle-de-gastos',
    keywords: ['gastos', 'despesas', 'controle de gastos', 'dinheiro'],
  },
  {
    id: 'guia-metas',
    title: 'Como definir metas financeiras',
    description:
      'Você pode criar metas para economizar dinheiro, pagar dívidas ou acompanhar objetivos financeiros importantes.',
    categoryId: 'metas-e-planejamento-financeiro',
    keywords: ['metas', 'economizar', 'dívidas', 'objetivos financeiros'],
  },
  {
    id: 'guia-relatorios',
    title: 'Como entender os relatórios financeiros',
    description:
      'Os relatórios mostram como seu dinheiro entra e sai ao longo do mês, ajudando você a tomar decisões financeiras melhores.',
    categoryId: 'controle-de-gastos',
    keywords: ['relatórios', 'painel', 'gastos mensais', 'receitas e despesas'],
  },
  {
    id: 'guia-whatsapp',
    title: 'Como receber alertas e resumos no WhatsApp',
    description:
      'Conecte seu número para receber lembretes de vencimento, resumos do mês e alertas que ajudam você a acompanhar o que merece atenção.',
    categoryId: 'conta-e-seguranca',
    keywords: ['whatsapp', 'alertas', 'resumos', 'vencimento', 'notificações'],
  },
];

const faqs: HelpFaq[] = [
  {
    id: 'faq-comecar',
    question: 'Como começo a usar o Cote Finance AI?',
    answer: [
      'Crie sua conta, confirme seu e-mail e registre suas primeiras despesas ou receitas.',
      'Em poucos minutos você já terá uma visão clara da sua situação financeira.',
    ],
    keywords: ['começar', 'conta', 'email', 'primeiro acesso'],
  },
  {
    id: 'faq-google',
    question: 'Posso entrar com Google?',
    answer: ['Sim. Você pode acessar sua conta usando login com Google ou e-mail e senha.'],
    keywords: ['google', 'login', 'entrar', 'conta'],
  },
  {
    id: 'faq-seguro',
    question: 'O Cote Finance AI é seguro?',
    answer: ['Sim. Utilizamos práticas modernas de segurança para proteger suas informações.'],
    keywords: ['segurança', 'seguro', 'dados', 'conta'],
  },
  {
    id: 'faq-cancelar',
    question: 'Posso cancelar minha assinatura?',
    answer: ['Sim. Você pode cancelar sua assinatura a qualquer momento nas configurações da conta.'],
    keywords: ['cancelar plano', 'assinatura', 'pagamento', 'plano'],
  },
  {
    id: 'faq-blog',
    question: 'O blog faz parte da plataforma?',
    answer: ['Sim. O blog ajuda você a aprender mais sobre organização financeira e aproveitar melhor o Cote Finance AI.'],
    keywords: ['blog', 'plataforma', 'ajuda', 'educação financeira'],
  },
  {
    id: 'faq-whatsapp',
    question: 'Posso receber alertas no WhatsApp?',
    answer: [
      'Sim. Você pode conectar seu número para receber resumos financeiros, lembretes de vencimento e alertas úteis diretamente no WhatsApp.',
      'Isso ajuda você a acompanhar o que merece atenção sem depender apenas do painel.',
    ],
    keywords: ['whatsapp', 'alertas', 'lembretes', 'resumos'],
  },
];

const searchItems: SearchItem[] = [
  ...categories.map((category) => ({
    id: category.id,
    title: category.title,
    body: category.description,
    kind: 'categoria' as const,
    anchor: category.id,
    keywords: category.keywords,
  })),
  ...popularGuides.map((guide) => ({
    id: guide.id,
    title: guide.title,
    body: guide.description,
    kind: 'guia' as const,
    anchor: guide.id,
    keywords: guide.keywords,
  })),
  ...faqs.map((faq) => ({
    id: faq.id,
    title: faq.question,
    body: faq.answer.join(' '),
    kind: 'faq' as const,
    anchor: faq.id,
    keywords: faq.keywords,
  })),
];

const faqCategoryMap: Record<string, string[]> = {
  'primeiros-passos': ['faq-comecar'],
  'controle-de-gastos': ['faq-blog'],
  'metas-e-planejamento-financeiro': ['faq-blog'],
  'conta-e-seguranca': ['faq-google', 'faq-seguro', 'faq-whatsapp'],
  'planos-e-pagamentos': ['faq-cancelar'],
};

function normalizeValue(value: string) {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
}

function rankSearchItem(item: SearchItem, query: string) {
  const normalizedQuery = normalizeValue(query);
  const normalizedTitle = normalizeValue(item.title);
  const normalizedBody = normalizeValue(item.body);
  const normalizedKeywords = item.keywords.map(normalizeValue);

  let score = 0;

  if (normalizedTitle === normalizedQuery) score += 120;
  if (normalizedTitle.startsWith(normalizedQuery)) score += 60;
  if (normalizedTitle.includes(normalizedQuery)) score += 40;
  if (normalizedBody.includes(normalizedQuery)) score += 18;

  for (const keyword of normalizedKeywords) {
    if (keyword === normalizedQuery) score += 36;
    else if (keyword.includes(normalizedQuery)) score += 18;
  }

  return score;
}

function scrollToAnchor(anchor: string) {
  const node = document.getElementById(anchor);
  if (!node) return;
  node.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export function HelpCenterExperience() {
  const [query, setQuery] = React.useState('');
  const [ticketName, setTicketName] = React.useState('');
  const [ticketEmail, setTicketEmail] = React.useState('');
  const [ticketCategory, setTicketCategory] = React.useState('Primeiros passos');
  const [ticketSubject, setTicketSubject] = React.useState('');
  const [ticketMessage, setTicketMessage] = React.useState('');
  const trimmedQuery = query.trim();

  const results = React.useMemo(() => {
    if (!trimmedQuery) return [];

    return searchItems
      .map((item) => ({
        ...item,
        score: rankSearchItem(item, trimmedQuery),
      }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
      .slice(0, 6);
  }, [trimmedQuery]);

  const handleTicketSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const name = ticketName.trim();
    const email = ticketEmail.trim();
    const subject = ticketSubject.trim();
    const message = ticketMessage.trim();

    if (!name || !email || !subject || !message) {
      return;
    }

    const mailtoSubject = encodeURIComponent(`[Ticket] ${ticketCategory} - ${subject}`);
    const mailtoBody = encodeURIComponent(
      [`Nome: ${name}`, `E-mail: ${email}`, `Categoria: ${ticketCategory}`, '', 'Detalhes do pedido:', message].join(
        '\n'
      )
    );

    window.location.href = `mailto:suporte@cotejuros.com.br?subject=${mailtoSubject}&body=${mailtoBody}`;
  };

  return (
    <BlogShell activeItem="help">
      <section className="rounded-[2rem] border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 shadow-[var(--shadow-soft)] sm:p-8 lg:p-10">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_320px] lg:items-end">
          <div className="max-w-4xl space-y-5">
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border-default)] bg-[color:var(--primary-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
              <ShieldCheck size={14} /> Central de ajuda
            </span>
            <div className="space-y-4">
              <h1 className="text-4xl font-black tracking-tight text-[var(--text-primary)] sm:text-5xl">Como podemos ajudar?</h1>
              <p className="max-w-3xl text-base leading-8 text-[var(--text-secondary)] sm:text-lg">
                Encontre respostas rápidas sobre como usar o Cote Finance AI, organizar suas finanças e resolver dúvidas
                sobre sua conta.
              </p>
            </div>

            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" size={18} />
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar ajuda..."
                className="w-full rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] py-4 pl-12 pr-4 text-sm text-[var(--text-primary)] outline-none transition focus:border-[color:var(--primary)] focus:shadow-[0_0_0_4px_var(--focus-ring)] focus:bg-[var(--bg-surface)]"
              />
            </div>

            <p className="text-sm public-light-subtle">
              Digite palavras como &quot;conta&quot;, &quot;gastos&quot;, &quot;pagamento&quot;, &quot;assinatura&quot; ou
              &quot;WhatsApp&quot;.
            </p>
          </div>

          <div className="rounded-[1.75rem] border border-[var(--border-default)] bg-[var(--bg-surface)] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] public-light-subtle">Atalhos rápidos</p>
            <div className="mt-4 space-y-3">
              {categories.slice(0, 4).map((category) => {
                const Icon = category.icon;
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => scrollToAnchor(category.id)}
                    className="flex w-full items-center gap-3 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] px-4 py-3 text-left text-sm font-medium text-[var(--text-primary)] transition hover:border-[var(--border-default)] hover:text-[var(--text-primary)]"
                  >
                    <span className="inline-flex rounded-xl border border-[var(--border-default)] bg-[color:var(--primary-soft)] p-2 text-[var(--text-secondary)]">
                      <Icon size={16} />
                    </span>
                    <span>{category.title}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {trimmedQuery ? (
          <div className="mt-6 rounded-[1.5rem] border border-[var(--border-default)] bg-[var(--bg-surface)] p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-[var(--text-primary)]">Resultados da busca</p>
              <p className="text-xs uppercase tracking-[0.18em] public-light-subtle">
                {results.length} resultado{results.length === 1 ? '' : 's'}
              </p>
            </div>

            {results.length ? (
              <div className="space-y-3">
                {results.map((result) => (
                  <button
                    key={result.id}
                    type="button"
                    onClick={() => scrollToAnchor(result.anchor)}
                    className="flex w-full items-start justify-between gap-4 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] px-4 py-4 text-left transition hover:border-[var(--border-default)]"
                  >
                    <div className="space-y-1">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">{result.kind}</p>
                      <p className="text-sm font-semibold text-[var(--text-primary)]">{result.title}</p>
                      <p className="text-sm leading-6 text-[var(--text-secondary)]">{result.body}</p>
                    </div>
                    <ArrowRight className="mt-1 shrink-0 text-[var(--text-secondary)]" size={16} />
                  </button>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] px-4 py-5 text-sm leading-7 text-[var(--text-secondary)]">
                Nenhum resultado encontrado para essa busca. Tente palavras como &quot;login&quot;, &quot;gastos&quot;,
                &quot;metas&quot; ou &quot;assinatura&quot;.
              </div>
            )}
          </div>
        ) : null}
      </section>

      <section className="mt-10">
        <div className="mb-6">
          <h2 className="text-3xl font-black tracking-tight text-[var(--text-primary)]">Categorias principais</h2>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-[var(--text-secondary)]">
            Escolha o assunto certo e vá direto ao que você precisa resolver.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {categories.map((category) => {
            const Icon = category.icon;
            return (
              <article key={category.id} className="rounded-[1.5rem] border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 shadow-sm">
                <div className="inline-flex rounded-2xl border border-[var(--border-default)] bg-[color:var(--primary-soft)] p-3 text-[var(--text-secondary)]">
                  <Icon size={20} />
                </div>
                <h3 className="mt-4 text-lg font-black tracking-tight text-[var(--text-primary)]">{category.title}</h3>
                <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">{category.description}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mt-14 grid gap-8 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="rounded-[1.75rem] border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 shadow-sm lg:sticky lg:top-24 lg:h-fit">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] public-light-subtle">Navegação</p>
          <nav className="mt-4 flex flex-col gap-3 text-sm">
            {categories.map((category) => (
              <a
                key={category.id}
                href={`#${category.id}`}
                className="rounded-xl border border-[var(--border-default)] px-4 py-3 font-medium text-[var(--text-primary)] transition-colors hover:border-[var(--border-default)] hover:text-[var(--text-primary)]"
              >
                {category.title}
              </a>
            ))}
            <a
              href="#guias-populares"
              className="rounded-xl border border-[var(--border-default)] px-4 py-3 font-medium text-[var(--text-primary)] transition-colors hover:border-[var(--border-default)] hover:text-[var(--text-primary)]"
            >
              Guias mais acessados
            </a>
            <a
              href="#faq"
              className="rounded-xl border border-[var(--border-default)] px-4 py-3 font-medium text-[var(--text-primary)] transition-colors hover:border-[var(--border-default)] hover:text-[var(--text-primary)]"
            >
              Perguntas frequentes
            </a>
          </nav>
        </aside>

        <div className="space-y-8">
          {categories.map((category) => {
            const Icon = category.icon;
            const categoryGuides = popularGuides.filter((guide) => guide.categoryId === category.id);
            const relatedFaqs = faqs.filter((faq) => faqCategoryMap[category.id]?.includes(faq.id));

            return (
              <section key={category.id} id={category.id} className="rounded-[1.75rem] border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 shadow-sm sm:p-8">
                <div className="flex items-start gap-4">
                  <div className="inline-flex rounded-2xl border border-[var(--border-default)] bg-[color:var(--primary-soft)] p-3 text-[var(--text-secondary)]">
                    <Icon size={22} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-2xl font-black tracking-tight text-[var(--text-primary)]">{category.title}</h2>
                    <p className="mt-3 text-base leading-8 text-[var(--text-primary)]">{category.description}</p>
                  </div>
                </div>

                {categoryGuides.length ? (
                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    {categoryGuides.map((guide) => (
                      <article key={guide.id} id={guide.id} className="rounded-[1.5rem] border border-[var(--border-default)] bg-[var(--bg-surface)] p-5">
                        <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                          <BookOpenText size={14} /> Guia
                        </div>
                        <h3 className="mt-4 text-lg font-black tracking-tight text-[var(--text-primary)]">{guide.title}</h3>
                        <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">{guide.description}</p>
                      </article>
                    ))}
                  </div>
                ) : null}

                {relatedFaqs.length ? (
                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    {relatedFaqs.map((faq) => (
                      <article key={faq.id} className="rounded-[1.5rem] border border-[var(--border-default)] bg-[var(--bg-surface)] p-5">
                        <p className="text-sm font-semibold text-[var(--text-primary)]">{faq.question}</p>
                        <div className="mt-3 space-y-2 text-sm leading-7 text-[var(--text-secondary)]">
                          {faq.answer.map((paragraph) => (
                            <p key={paragraph}>{paragraph}</p>
                          ))}
                        </div>
                      </article>
                    ))}
                  </div>
                ) : null}
              </section>
            );
          })}

          <section id="guias-populares" className="rounded-[1.75rem] border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 shadow-sm sm:p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-black tracking-tight text-[var(--text-primary)]">Guias mais acessados</h2>
            </div>
            <div className="grid gap-5 lg:grid-cols-2">
              {popularGuides.map((guide) => (
                <article key={guide.id} className="rounded-[1.6rem] border border-[var(--border-default)] bg-[var(--bg-surface)] p-6">
                  <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                    <BookOpenText size={14} /> Guia
                  </div>
                  <h3 className="mt-4 text-xl font-black tracking-tight text-[var(--text-primary)]">{guide.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">{guide.description}</p>
                </article>
              ))}
            </div>
          </section>

          <section id="faq" className="rounded-[1.75rem] border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 shadow-sm sm:p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-black tracking-tight text-[var(--text-primary)]">Perguntas frequentes</h2>
            </div>

            <div className="space-y-4">
              {faqs.map((faq) => (
                <details key={faq.id} className="group rounded-[1.4rem] border border-[var(--border-default)] bg-[var(--bg-surface)] px-5 py-4">
                  <summary className="cursor-pointer list-none text-base font-semibold text-[var(--text-primary)] marker:hidden">
                    {faq.question}
                  </summary>
                  <div className="mt-3 space-y-3 text-sm leading-7 text-[var(--text-secondary)]">
                    {faq.answer.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          </section>
        </div>
      </section>

      <section className="mt-14 rounded-[2rem] border border-[var(--border-default)] bg-[linear-gradient(180deg,var(--bg-surface)_0%,var(--bg-surface-elevated)_100%)] p-6 shadow-[var(--shadow-soft)] sm:p-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)]">
          <div className="space-y-3">
            <p className="inline-flex items-center gap-2 rounded-full border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
              <BadgeHelp size={14} /> Suporte
            </p>
            <h2 className="text-3xl font-black tracking-tight text-[var(--text-primary)]">Ainda precisa de ajuda?</h2>
            <p className="max-w-2xl text-base leading-8 text-[var(--text-secondary)]">
              Se você não encontrou o que procurava, envie um ticket para nossa equipe. Vamos receber sua solicitação no
              e-mail de suporte com o contexto já organizado.
            </p>
            <div className="rounded-[1.5rem] border border-[var(--border-default)] bg-[var(--bg-surface)] p-5">
              <p className="text-sm font-semibold text-[var(--text-primary)]">Atendimento por e-mail</p>
              <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                Preencha o formulário ao lado e envie sua dúvida. Nossa equipe vai responder pelo e-mail{' '}
                <span className="font-semibold text-[var(--text-primary)]">suporte@cotejuros.com.br</span>.
              </p>
            </div>
          </div>

          <form onSubmit={handleTicketSubmit} className="rounded-[1.75rem] border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 shadow-sm">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-sm font-medium text-[var(--text-primary)]">
                <span>Nome</span>
                <input
                  type="text"
                  value={ticketName}
                  onChange={(event) => setTicketName(event.target.value)}
                  placeholder="Seu nome"
                  className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[color:var(--primary)] focus:shadow-[0_0_0_4px_var(--focus-ring)]"
                />
              </label>
              <label className="space-y-2 text-sm font-medium text-[var(--text-primary)]">
                <span>E-mail</span>
                <input
                  type="email"
                  value={ticketEmail}
                  onChange={(event) => setTicketEmail(event.target.value)}
                  placeholder="voce@exemplo.com"
                  className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[color:var(--primary)] focus:shadow-[0_0_0_4px_var(--focus-ring)]"
                />
              </label>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-[220px_minmax(0,1fr)]">
              <label className="space-y-2 text-sm font-medium text-[var(--text-primary)]">
                <span>Categoria</span>
                <select
                  value={ticketCategory}
                  onChange={(event) => setTicketCategory(event.target.value)}
                  className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[color:var(--primary)] focus:shadow-[0_0_0_4px_var(--focus-ring)]"
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.title}>
                      {category.title}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2 text-sm font-medium text-[var(--text-primary)]">
                <span>Assunto</span>
                <input
                  type="text"
                  value={ticketSubject}
                  onChange={(event) => setTicketSubject(event.target.value)}
                  placeholder="Resumo rápido da sua dúvida"
                  className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[color:var(--primary)] focus:shadow-[0_0_0_4px_var(--focus-ring)]"
                />
              </label>
            </div>

            <label className="mt-4 block space-y-2 text-sm font-medium text-[var(--text-primary)]">
              <span>Mensagem</span>
              <textarea
                value={ticketMessage}
                onChange={(event) => setTicketMessage(event.target.value)}
                rows={6}
                placeholder="Explique o que aconteceu, o que você tentou fazer e qual ajuda você precisa."
                className="w-full resize-none rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] px-4 py-3 text-sm leading-7 text-[var(--text-primary)] outline-none transition focus:border-[color:var(--primary)] focus:shadow-[0_0_0_4px_var(--focus-ring)]"
              />
            </label>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs leading-6 public-light-subtle">
                Ao enviar, abriremos seu aplicativo de e-mail com o ticket preenchido para{' '}
                <span className="font-semibold text-[var(--text-primary)]">suporte@cotejuros.com.br</span>.
              </p>
              <button
                type="submit"
                disabled={!ticketName.trim() || !ticketEmail.trim() || !ticketSubject.trim() || !ticketMessage.trim()}
                className="inline-flex items-center justify-center gap-2 rounded-xl button-light-primary px-5 py-3 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-60"
              >
                Enviar ticket <ArrowRight size={16} />
              </button>
            </div>
          </form>
        </div>
      </section>
    </BlogShell>
  );
}
