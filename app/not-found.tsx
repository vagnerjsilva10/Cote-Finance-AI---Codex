export default function NotFound() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center px-6">
      <div className="max-w-lg text-center space-y-4">
        <p className="text-sm uppercase tracking-[0.2em] text-zinc-400">404</p>
        <h1 className="text-3xl font-semibold">Página não encontrada</h1>
        <p className="text-zinc-300">
          O conteúdo que você tentou acessar não existe ou foi movido.
        </p>
      </div>
    </main>
  );
}
