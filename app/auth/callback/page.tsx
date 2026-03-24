'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import type { EmailOtpType } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

const AUTH_TIMEOUT_MS = 10000;
const AUTH_RETRY_ATTEMPTS = 2;

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

function authDebug(event: string, payload?: Record<string, unknown>) {
  console.log('AUTH DEBUG:', {
    event,
    timestamp: new Date().toISOString(),
    ...(payload || {}),
  });
}

function shouldRetryAuthError(message: string) {
  return /timeout|upstream request timeout|failed to fetch|network|fetch failed|temporarily unavailable/i.test(
    message
  );
}

async function runWithTimeout<T>(operation: Promise<T>, timeoutMessage: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(timeoutMessage)), AUTH_TIMEOUT_MS);
  });

  try {
    return (await Promise.race([operation, timeoutPromise])) as T;
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
  }
}

async function runWithRetry<T>(
  operationName: string,
  operationFactory: () => Promise<T>,
  timeoutMessage: string
): Promise<T> {
  let attempt = 0;
  let lastError: unknown = null;

  while (attempt < AUTH_RETRY_ATTEMPTS) {
    attempt += 1;
    try {
      authDebug(`${operationName}:start`, { attempt });
      const result = await runWithTimeout(operationFactory(), timeoutMessage);
      authDebug(`${operationName}:success`, { attempt });
      return result;
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error || 'Erro desconhecido');
      const retryable = shouldRetryAuthError(message);
      authDebug(`${operationName}:error`, { attempt, retryable, message });

      if (!retryable || attempt >= AUTH_RETRY_ATTEMPTS) {
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, 450 * attempt));
    }
  }

  throw lastError instanceof Error ? lastError : new Error(timeoutMessage);
}

function normalizeAuthErrorMessage(message: string) {
  if (/Unable to exchange external code/i.test(message)) {
    return 'Não foi possível concluir o login com Google. Tente novamente para gerar um novo link de autenticação.';
  }

  if (/code verifier|invalid request/i.test(message)) {
    return 'Falha ao validar o retorno do login. Verifique as Redirect URLs do Supabase e tente novamente.';
  }

  if (/timeout|upstream request timeout/i.test(message)) {
    return 'O login demorou além do esperado. Tente novamente em alguns segundos.';
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
        const tokenHash = url.searchParams.get('token_hash') || hashParams.get('token_hash');
        const authType = url.searchParams.get('type') || hashParams.get('type');
        const hashAccessToken = hashParams.get('access_token');
        const hashRefreshToken = hashParams.get('refresh_token');

        const authError =
          url.searchParams.get('error_description') ||
          url.searchParams.get('error') ||
          hashParams.get('error_description') ||
          hashParams.get('error');

        authDebug('callback_start', {
          url: `${url.origin}${url.pathname}`,
          hasCode: Boolean(authCode),
          hasTokenHash: Boolean(tokenHash),
          authType: authType || null,
          hasHashAccessToken: Boolean(hashAccessToken),
          hasHashRefreshToken: Boolean(hashRefreshToken),
        });

        if (authError) {
          authDebug('callback_error_param', { authError });
          setError(decodeURIComponent(authError));
          return;
        }

        let resolvedSession = (
          await runWithRetry(
            'callback_get_session_initial',
            () => supabase.auth.getSession(),
            'Não foi possível ler a sessão inicial.'
          )
        ).data.session;

        if (!resolvedSession?.access_token && hashAccessToken && hashRefreshToken) {
          const { data: hashSessionData, error: hashSessionError } = await runWithRetry(
            'callback_set_session_hash',
            () =>
              supabase.auth.setSession({
                access_token: hashAccessToken,
                refresh_token: hashRefreshToken,
              }),
            'Não foi possível validar os tokens de retorno da autenticação.'
          );

          if (hashSessionError) {
            throw hashSessionError;
          }

          if (hashSessionData?.session?.access_token) {
            resolvedSession = hashSessionData.session;
          }
        }

        if (!resolvedSession?.access_token && authCode) {
          const { data: exchangeData, error: exchangeError } = await runWithRetry(
            'callback_exchange_code',
            () => supabase.auth.exchangeCodeForSession(authCode),
            'A troca do código de autenticação demorou demais.'
          );

          if (exchangeError) {
            const existingSession = (
              await runWithRetry(
                'callback_get_session_after_exchange_error',
                () => supabase.auth.getSession(),
                'Não foi possível recuperar a sessão após falha na troca do código.'
              )
            ).data.session;

            if (!existingSession?.access_token) {
              throw exchangeError;
            }

            resolvedSession = existingSession;
          } else if (exchangeData?.session?.access_token) {
            resolvedSession = exchangeData.session;
          }
        } else if (!resolvedSession?.access_token && tokenHash && authType) {
          if (!isEmailOtpType(authType)) {
            throw new Error('Tipo de confirmação inválido.');
          }

          const { data: verifyData, error: verifyError } = await runWithRetry(
            'callback_verify_token_hash',
            () =>
              supabase.auth.verifyOtp({
                token_hash: tokenHash,
                type: authType,
              }),
            'A validação do token de autenticação demorou demais.'
          );

          if (verifyError) {
            throw verifyError;
          }

          if (verifyData?.session?.access_token) {
            resolvedSession = verifyData.session;
          }
        }

        let session =
          resolvedSession ||
          (
            await runWithRetry(
              'callback_get_session_before_poll',
              () => supabase.auth.getSession(),
              'Não foi possível recuperar a sessão após a autenticação.'
            )
          ).data.session;

        let attempts = 0;
        while (!session?.access_token && attempts < 8) {
          await new Promise((resolve) => setTimeout(resolve, 350));
          session = (
            await runWithRetry(
              'callback_poll_session',
              () => supabase.auth.getSession(),
              'A sessão não ficou disponível a tempo.'
            )
          ).data.session;
          attempts += 1;
        }

        if (!session?.access_token) {
          authDebug('callback_missing_session', { attempts });
          setError(
            'Não foi possível concluir a autenticação. Verifique as Redirect URLs do Supabase e tente novamente.'
          );
          return;
        }

        const setupResponse = await runWithRetry(
          'callback_setup_user',
          async () => {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), AUTH_TIMEOUT_MS);
            return fetch('/api/setup-user', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${session.access_token}`,
              },
              signal: controller.signal,
            }).finally(() => {
              clearTimeout(timeoutId);
            });
          },
          'Não foi possível finalizar seu acesso no servidor.'
        );

        const setupPayload = await setupResponse.json().catch(() => ({}));
        if (!setupResponse.ok) {
          throw new Error(
            typeof setupPayload?.error === 'string'
              ? setupPayload.error
              : 'Falha ao preparar seu ambiente após autenticação.'
          );
        }

        authDebug('callback_success', { redirectTo: '/app' });
        if (!cancelled) {
          router.replace('/app');
        }
      } catch (err) {
        if (!cancelled) {
          const rawMessage = err instanceof Error ? err.message : 'Falha na autenticação.';
          authDebug('callback_failed', { message: rawMessage });
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
    <main className="marketing-dark-shell flex min-h-screen items-center justify-center p-6">
      <div className="marketing-panel w-full max-w-md p-6 text-center">
        {error ? (
          <>
            <h1 className="mb-2 text-lg font-bold text-[var(--text-primary)]">Falha na autenticação</h1>
            <p className="mb-4 text-sm text-[var(--danger)]">{error}</p>
            <button
              onClick={() => router.replace('/app?auth=login')}
              className="button-primary px-4 py-2 text-sm font-semibold"
            >
              Voltar para login
            </button>
          </>
        ) : (
          <>
            <div className="mx-auto mb-4 size-10 animate-spin rounded-full border-4 border-[var(--primary)] border-t-transparent" />
            <h1 className="mb-2 text-lg font-bold text-[var(--text-primary)]">Concluindo autenticação</h1>
            <p className="text-sm text-[var(--text-secondary)]">Aguarde enquanto preparamos seu ambiente.</p>
          </>
        )}
      </div>
    </main>
  );
}

