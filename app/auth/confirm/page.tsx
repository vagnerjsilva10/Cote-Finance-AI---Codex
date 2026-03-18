'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

export default function AuthConfirmPage() {
  const router = useRouter();

  React.useEffect(() => {
    const redirectUrl = `/auth/callback${window.location.search}${window.location.hash}`;
    router.replace(redirectUrl);
  }, [router]);

  return (
    <main className="marketing-dark-shell flex min-h-screen items-center justify-center p-6">
      <div className="marketing-panel w-full max-w-md p-6 text-center">
        <div className="mx-auto size-10 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin mb-4" />
        <h1 className="text-lg font-bold text-[var(--text-primary)] mb-2">Confirmando e-mail</h1>
        <p className="text-sm text-[var(--text-secondary)]">Aguarde enquanto validamos sua conta.</p>
      </div>
    </main>
  );
}
