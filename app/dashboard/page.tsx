'use client';

import * as React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

export default function DashboardAuthBridgePage() {
  const router = useRouter();

  React.useEffect(() => {
    const hasAuthPayload =
      window.location.search.includes('code=') ||
      window.location.search.includes('token_hash=') ||
      window.location.search.includes('error=') ||
      window.location.hash.includes('access_token=') ||
      window.location.hash.includes('error=');

    const targetPath = hasAuthPayload
      ? `/auth/callback${window.location.search}${window.location.hash}`
      : '/app';

    router.replace(targetPath);
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-slate-100">
      <div className="w-full max-w-md rounded-[2rem] border border-slate-800 bg-slate-900/95 p-7 text-center shadow-[0_32px_120px_-60px_rgba(16,185,129,0.45)]">
        <Image
          src="/brand/cote-finance-ai-logo.svg"
          alt="Cote Finance AI - By Cote Juros"
          width={460}
          height={122}
          priority
          className="mx-auto mb-5 h-auto w-full max-w-[360px]"
        />
        <div className="mx-auto mb-4 size-10 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
        <h1 className="text-lg font-bold text-white">Preparando seu acesso</h1>
        <p className="mt-2 text-sm text-slate-400">
          Estamos concluindo o login com seguranca e carregando seu workspace.
        </p>
      </div>
    </main>
  );
}
