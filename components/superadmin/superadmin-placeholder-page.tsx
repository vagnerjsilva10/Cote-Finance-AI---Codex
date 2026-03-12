import Link from 'next/link';

export function SuperadminPlaceholderPage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-white">{title}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">{description}</p>
      </div>

      <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Base criada</p>
        <h2 className="mt-4 text-xl font-semibold text-white">Módulo preparado para expansão</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">
          A rota, o layout administrativo e a proteção server-side já estão ativos. Este módulo entra na próxima etapa com
          APIs e ações operacionais específicas.
        </p>
        <Link
          href="/superadmin"
          className="mt-6 inline-flex rounded-full border border-slate-700 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:text-white"
        >
          Voltar para Visão Geral
        </Link>
      </div>
    </div>
  );
}
