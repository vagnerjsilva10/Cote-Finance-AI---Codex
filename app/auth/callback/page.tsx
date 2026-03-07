'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import type { EmailOtpType } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

const OTP_TYPES: ReadonlyArray<EmailOtpType> = [
  'signup',
  'magiclink',
  'recovery',
  'invite',
  'email_change',
  'email',
];

const isEmailOtpType = (value: string): value is EmailOtpType =>
  OTP_TYPES.includes(value as EmailOtpType);

function normalizeAuthErrorMessage(message: string) {
  if (/Unable to exchange external code/i.test(message)) {
    return 'Não foi possível concluir o login com Google. Tente novamente para gerar um novo link de autenticação.';
  }

  return message;
}

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const url = new URL(window.location.href);
        const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''));
        const authCode = url.searchParams.get('code');
        const tokenHash = url.searchParams.get('token_hash');
        const authType = url.searchParams.get('type');

        const authError =
          url.searchParams.get('error_description') ||
          url.searchParams.get('error') ||
          hashParams.get('error_description') ||
          hashParams.get('error');

        if (authError) {
          setError(decodeURIComponent(authError));
          return;
        }

        if (authCode) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(authCode);
          if (exchangeError) {
            const existingSession = (await supabase.auth.getSession()).data.session;
            if (!existingSession?.access_token) {
              throw exchangeError;
            }
          }
        } else if (tokenHash && authType) {
          if (!isEmailOtpType(authType)) {
            throw new Error('Tipo de confirmação inválido.');
          }

          const { error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: authType,
          });
          if (verifyError) {
            throw verifyError;
          }
        }

        let session = (await supabase.auth.getSession()).data.session;
        let attempts = 0;
        while (!session?.access_token && attempts < 8) {
          await new Promise((resolve) => setTimeout(resolve, 350));
          session = (await supabase.auth.getSession()).data.session;
          attempts += 1;
        }

        if (!session?.access_token) {
          setError(
            'Não foi possível concluir a autenticação. Verifique as Redirect URLs do Supabase e tente novamente.'
          );
          return;
        }

        const setupResponse = await fetch('/api/setup-user', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });
        const setupPayload = await setupResponse.json().catch(() => ({}));
        if (!setupResponse.ok) {
          throw new Error(
            typeof setupPayload?.error === 'string'
              ? setupPayload.error
              : 'Falha ao preparar seu ambiente após autenticação.'
          );
        }

        if (!cancelled) {
          router.replace('/app');
        }
      } catch (err) {
        if (!cancelled) {
          const rawMessage = err instanceof Error ? err.message : 'Falha na autenticação.';
          setError(normalizeAuthErrorMessage(rawMessage));
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 text-center">
        {error ? (
          <>
            <h1 className="text-lg font-bold text-white mb-2">Falha na autenticação</h1>
            <p className="text-sm text-rose-400 mb-4">{error}</p>
            <button
              onClick={() => router.replace('/app?auth=login')}
              className="px-4 py-2 rounded-lg bg-emerald-500 text-white text-sm font-bold hover:bg-emerald-600 transition-colors"
            >
              Voltar para login
            </button>
          </>
        ) : (
          <>
            <div className="mx-auto size-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
            <h1 className="text-lg font-bold text-white mb-2">Concluindo autenticação</h1>
            <p className="text-sm text-slate-400">Aguarde enquanto preparamos seu ambiente.</p>
          </>
        )}
      </div>
    </main>
  );
}
