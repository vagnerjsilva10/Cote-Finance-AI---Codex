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
    <main className="theme-app-shell flex min-h-screen items-center justify-center px-6 text-[var(--text-primary)]">
      <div className="card-premium w-full max-w-md rounded-[2rem] p-7 text-center">
        <Image
          src="/brand/cote-finance-ai-logo.svg"
          alt="Cote Finance AI - By Cote Juros"
          width={460}
          height={122}
          priority
          className="mx-auto mb-5 h-auto w-full max-w-[360px]"
        />
        <div className="mx-auto mb-4 size-10 rounded-full border-4 border-[var(--primary)] border-t-transparent animate-spin" />
        <h1 className="text-lg font-bold text-[var(--text-primary)]">Preparando seu acesso</h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          Estamos concluindo o login com seguranca e carregando seu workspace.
        </p>
      </div>
    </main>
  );
}
