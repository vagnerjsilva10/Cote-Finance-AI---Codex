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
    <section className="rounded-[2rem] border border-emerald-300/20 bg-emerald-500/10 p-6 sm:p-8">
      <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/25 bg-slate-950/40 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200">
        <Sparkles size={14} /> Como o Cote Finance AI pode ajudar
      </div>
      <h2 className="mt-5 text-3xl font-bold text-white">Experimente o Cote Finance AI gratuitamente</h2>
      <p className="mt-4 max-w-3xl text-base leading-7 text-emerald-50/90">
        Transforme conhecimento em ação com um sistema que organiza suas finanças, mostra o que realmente importa e ajuda você a tomar decisões melhores todos os meses.
      </p>
      <ul className="mt-6 grid gap-3 text-sm text-slate-100 md:grid-cols-2">
        {benefits.map((benefit) => (
          <li key={benefit} className="flex items-start gap-2 rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3">
            <Check size={16} className="mt-0.5 text-emerald-300" />
            <span>{benefit}</span>
          </li>
        ))}
      </ul>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Link
          href="/app?auth=signup"
          className="rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-900 transition-colors hover:bg-slate-100"
        >
          Começar grátis
        </Link>
        <Link
          href="/app"
          className="rounded-xl border border-white/15 px-5 py-3 text-sm font-semibold text-white transition-colors hover:border-white/30"
        >
          Ver o produto
        </Link>
      </div>
    </section>
  );
}
