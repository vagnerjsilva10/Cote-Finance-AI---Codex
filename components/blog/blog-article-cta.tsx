import Link from 'next/link';
import { Check, Sparkles } from 'lucide-react';

const benefits = [
  'Controle de gastos em um painel claro e atualizado',
  'Insights com IA para entender padrões financeiros',
  'Metas financeiras com acompanhamento contínuo',
  'Gestão de dívidas e investimentos no mesmo lugar',
];

export function BlogArticleCta() {
  return (
    <section className="card-premium rounded-[2rem] bg-[linear-gradient(180deg,var(--bg-surface)_0%,var(--bg-surface-elevated)_100%)] p-6 shadow-[var(--shadow-card)] sm:p-8">
      <div className="badge-premium inline-flex items-center gap-2 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]">
        <Sparkles size={14} /> Como o Cote Finance AI pode ajudar
      </div>
      <h2 className="mt-5 text-3xl font-black tracking-tight text-[var(--text-primary)]">Comece a organizar suas finanças hoje</h2>
      <p className="mt-4 max-w-3xl text-base leading-8 text-[var(--text-secondary)]">
        Entenda seus gastos, acompanhe seu dinheiro e receba insights financeiros com inteligência artificial.
      </p>
      <ul className="mt-6 grid gap-3 text-sm text-[var(--text-secondary)] md:grid-cols-2">
        {benefits.map((benefit) => (
          <li key={benefit} className="card-premium flex items-start gap-2 rounded-2xl bg-[var(--bg-surface)] px-4 py-3">
            <Check size={16} className="mt-0.5 text-[var(--primary)]" />
            <span>{benefit}</span>
          </li>
        ))}
      </ul>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Link href="/signup" className="button-primary px-5 py-3 text-sm font-bold">
          Começar grátis
        </Link>
        <Link href="/app" className="button-secondary px-5 py-3 text-sm font-semibold">
          Ver o produto
        </Link>
      </div>
    </section>
  );
}
