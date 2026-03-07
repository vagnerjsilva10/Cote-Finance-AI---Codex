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
    <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 text-center">
        <div className="mx-auto size-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
        <h1 className="text-lg font-bold text-white mb-2">Confirmando e-mail</h1>
        <p className="text-sm text-slate-400">Aguarde enquanto validamos sua conta.</p>
      </div>
    </main>
  );
}
