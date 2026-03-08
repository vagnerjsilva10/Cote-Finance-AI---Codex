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
    <section className="rounded-[2rem] border border-emerald-200 bg-[linear-gradient(180deg,#ffffff_0%,#f0fdf4_100%)] p-6 shadow-[0_24px_80px_-50px_rgba(16,185,129,0.30)] sm:p-8">
      <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
        <Sparkles size={14} /> Como o Cote Finance AI pode ajudar
      </div>
      <h2 className="mt-5 text-3xl font-black tracking-tight text-slate-950">Experimente o Cote Finance AI gratuitamente</h2>
      <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600">
        Organize sua vida financeira, acompanhe gastos, defina metas e receba insights com IA em um só lugar.
      </p>
      <ul className="mt-6 grid gap-3 text-sm text-slate-700 md:grid-cols-2">
        {benefits.map((benefit) => (
          <li key={benefit} className="flex items-start gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <Check size={16} className="mt-0.5 text-emerald-600" />
            <span>{benefit}</span>
          </li>
        ))}
      </ul>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Link
          href="/app?auth=signup"
          className="rounded-xl bg-emerald-500 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-emerald-600"
        >
          Começar grátis
        </Link>
        <Link
          href="/app"
          className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-400 hover:text-slate-950"
        >
          Ver o produto
        </Link>
      </div>
    </section>
  );
}
