export default function NotFound() {
  return (
    <main className="theme-app-shell flex min-h-screen items-center justify-center px-6 text-[var(--text-primary)]">
      <div className="card-premium max-w-lg space-y-4 rounded-2xl p-8 text-center">
        <p className="label-premium">404</p>
        <h1 className="text-3xl font-semibold">Página não encontrada</h1>
        <p className="text-[var(--text-secondary)]">
          O conteúdo que você tentou acessar não existe ou foi movido.
        </p>
      </div>
    </main>
  );
}
