'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  BadgeCheck,
  CheckCircle2,
  Copy,
  CreditCard,
  Loader2,
  LockKeyhole,
  QrCode,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { getStripeJs, getStripePublishableKey } from '@/lib/stripe-client';
import {
  BILLING_PLAN_DETAILS,
  formatBillingPrice,
  getCheckoutPath,
  normalizeBillingInterval,
  normalizeBillingPlan,
  type BillingIntervalCode,
  type BillingPlanCode,
} from '@/lib/billing/plans';
import type { Appearance } from '@stripe/stripe-js';
import { markPendingPurchase, pushInternalTrackingEvent, trackPixelStandard } from '@/lib/tracking/client';

type CheckoutIntentType = 'payment' | 'setup' | 'none';
type StripeMode = 'live' | 'test' | 'unknown';
type CheckoutPaymentMethod = 'card' | 'pix';
type PixCheckoutStatus = 'awaiting_payment' | 'processing' | 'confirmed' | 'expired' | 'failed';

type EmbeddedCheckoutResponse = {
  clientSecret: string | null;
  intentType: CheckoutIntentType;
  stripeMode: StripeMode;
  subscriptionId: string;
  customerId: string;
  workspaceId: string;
  workspaceName: string;
  plan: BillingPlanCode;
  interval: BillingIntervalCode;
  planName: string;
  priceLabel: string;
  priceId: string;
  subscriptionStatus: string;
  requiresConfirmation: boolean;
};

type PixCheckoutResponse = {
  paymentIntentId: string;
  status: PixCheckoutStatus;
  amount: number;
  currency: 'BRL';
  plan: BillingPlanCode;
  interval: BillingIntervalCode;
  workspaceId: string;
  workspaceName: string;
  planName: string;
  priceLabel: string;
  qrCodeUrl: string | null;
  copyAndPasteCode: string | null;
  hostedInstructionsUrl: string | null;
  expiresAt: string | null;
};

type FormStatus = 'idle' | 'submitting' | 'success';

const stripePromise = getStripeJs();
const CHECKOUT_INIT_TIMEOUT_MS = 20000;

function resolvePurchaseValue(plan: BillingPlanCode | null, interval: BillingIntervalCode | null) {
  if (plan === 'PREMIUM') return interval === 'ANNUAL' ? 490 : 49;
  if (plan === 'PRO') return interval === 'ANNUAL' ? 290 : 29;
  return 0;
}

function getPublishableKeyMode(key: string | null): StripeMode {
  if (!key) return 'unknown';
  if (key.startsWith('pk_live_')) return 'live';
  if (key.startsWith('pk_test_')) return 'test';
  return 'unknown';
}

function createTimeoutError(message: string) {
  const error = new Error(message);
  error.name = 'TimeoutError';
  return error;
}

async function withClientTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timeoutId: number | null = null;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutId = window.setTimeout(() => reject(createTimeoutError(message)), timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId !== null) {
      window.clearTimeout(timeoutId);
    }
  }
}

async function fetchJsonWithTimeout<T>(input: RequestInfo | URL, init: RequestInit, timeoutMs: number): Promise<T> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(input, {
      ...init,
      signal: controller.signal,
    });

    const payload = (await response.json().catch(() => ({}))) as T & { error?: string; code?: string };

    if (!response.ok) {
      const error = new Error(
        typeof payload?.error === 'string'
          ? payload.error
          : `Falha ao preparar checkout (HTTP ${response.status}).`
      );
      (error as Error & { status?: number; code?: string }).status = response.status;
      (error as Error & { status?: number; code?: string }).code = payload?.code;
      throw error;
    }

    return payload;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw createTimeoutError(
        'O checkout demorou demais para responder. Tente novamente ou use o checkout legado.'
      );
    }

    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function buildCacheKey(plan: BillingPlanCode, interval: BillingIntervalCode, workspaceId?: string | null) {
  return `cote-payment-element:${workspaceId || 'default'}:${plan}:${interval}`;
}

function readCachedCheckout(plan: BillingPlanCode, interval: BillingIntervalCode, workspaceId?: string | null) {
  if (typeof window === 'undefined') return null;

  const raw = window.sessionStorage.getItem(buildCacheKey(plan, interval, workspaceId));
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as { expiresAt: number; payload: EmbeddedCheckoutResponse };
    if (Date.now() > parsed.expiresAt) {
      window.sessionStorage.removeItem(buildCacheKey(plan, interval, workspaceId));
      return null;
    }
    return parsed.payload;
  } catch {
    window.sessionStorage.removeItem(buildCacheKey(plan, interval, workspaceId));
    return null;
  }
}

function cacheCheckout(payload: EmbeddedCheckoutResponse) {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(
    buildCacheKey(payload.plan, payload.interval, payload.workspaceId),
    JSON.stringify({
      expiresAt: Date.now() + 1000 * 60 * 30,
      payload,
    })
  );
}

function clearCachedCheckout(plan: BillingPlanCode, interval: BillingIntervalCode, workspaceId?: string | null) {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(buildCacheKey(plan, interval, workspaceId));
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

function formatCountdown(remainingMs: number) {
  if (remainingMs <= 0) return '00:00';
  const totalSeconds = Math.floor(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function getPixStatusLabel(status: PixCheckoutStatus) {
  if (status === 'confirmed') return 'Pagamento confirmado';
  if (status === 'processing') return 'Pagamento em processamento';
  if (status === 'expired') return 'Pix expirado';
  if (status === 'failed') return 'Falha no Pix';
  return 'Aguardando pagamento';
}

function getPixStatusTone(status: PixCheckoutStatus) {
  if (status === 'confirmed') return 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100';
  if (status === 'processing') return 'border-sky-400/20 bg-sky-500/10 text-sky-100';
  if (status === 'expired' || status === 'failed') return 'border-rose-400/20 bg-rose-500/10 text-rose-100';
  return 'border-amber-400/20 bg-amber-500/10 text-amber-100';
}

function EmbeddedPaymentForm(props: {
  intentType: CheckoutIntentType;
  returnUrl: string;
  submitLabel: string;
  helperText: string;
  onSuccess: () => void;
  onFallbackCheckout: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [status, setStatus] = React.useState<FormStatus>('idle');
  const [isPaymentElementReady, setIsPaymentElementReady] = React.useState(false);
  const [inlineError, setInlineError] = React.useState<string | null>(null);
  const [didElementTimeout, setDidElementTimeout] = React.useState(false);

  React.useEffect(() => {
    if (!elements || isPaymentElementReady) return;

    const mountProbe = window.setInterval(() => {
      if (elements.getElement(PaymentElement)) {
        setIsPaymentElementReady(true);
        window.clearInterval(mountProbe);
      }
    }, 400);

    const timeoutId = window.setTimeout(() => {
      if (!elements.getElement(PaymentElement)) {
        setDidElementTimeout(true);
        setInlineError(
          'Não foi possível carregar o formulário do cartão neste navegador. Use o checkout legado para concluir a assinatura.'
        );
      }
      window.clearInterval(mountProbe);
    }, 10000);

    return () => {
      window.clearInterval(mountProbe);
      window.clearTimeout(timeoutId);
    };
  }, [elements, isPaymentElementReady]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!stripe || !elements || status === 'submitting') return;

    setStatus('submitting');
    setInlineError(null);

    try {
      const paymentElement = elements.getElement(PaymentElement);
      if (!paymentElement) {
        setInlineError('O formulário de pagamento ainda não terminou de carregar. Aguarde alguns segundos e tente novamente.');
        setStatus('idle');
        return;
      }

      const submission = await elements.submit();
      if (submission.error) {
        setInlineError(submission.error.message || 'Não foi possível validar o formulário de pagamento.');
        setStatus('idle');
        return;
      }

      const result =
        props.intentType === 'setup'
          ? await stripe.confirmSetup({
              elements,
              confirmParams: {
                return_url: props.returnUrl,
              },
              redirect: 'if_required',
            })
          : await stripe.confirmPayment({
              elements,
              confirmParams: {
                return_url: props.returnUrl,
              },
              redirect: 'if_required',
            });

      if (result.error) {
        setInlineError(result.error.message || 'Não foi possível confirmar o pagamento.');
        setStatus('idle');
        return;
      }

      setStatus('success');
      props.onSuccess();
    } catch (error) {
      setInlineError(error instanceof Error ? error.message : 'Falha ao processar pagamento.');
      setStatus('idle');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="min-h-[220px] rounded-3xl border border-white/10 bg-slate-950/55 p-4">
        <PaymentElement
          options={{
            layout: 'tabs',
            fields: {
              billingDetails: {
                name: 'auto',
                email: 'auto',
                address: 'never',
              },
            },
          }}
          onReady={() => setIsPaymentElementReady(true)}
        />
      </div>

      <button
        type="submit"
        disabled={!stripe || !elements || status === 'submitting' || !isPaymentElementReady}
        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-5 py-4 text-sm font-bold text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === 'submitting' ? <Loader2 className="size-4 animate-spin" /> : <LockKeyhole className="size-4" />}
        {status === 'submitting' ? 'Confirmando pagamento...' : props.submitLabel}
      </button>
      <div className="space-y-2 text-center">
        <p className="text-xs font-medium text-slate-300">Sem compromisso • Cancele quando quiser</p>
        <div className="mx-auto flex max-w-md items-start justify-center gap-2 text-left text-xs text-slate-400">
          <LockKeyhole className="mt-0.5 size-3.5 shrink-0 text-emerald-300" />
          <p className="leading-5">{props.helperText}</p>
        </div>
      </div>
      {!isPaymentElementReady ? (
        <p className="text-center text-xs text-slate-500">Carregando formulário de pagamento seguro...</p>
      ) : null}
      {inlineError ? <p className="text-center text-sm text-rose-300">{inlineError}</p> : null}
      {didElementTimeout ? (
        <button
          type="button"
          onClick={props.onFallbackCheckout}
          className="inline-flex w-full items-center justify-center rounded-2xl border border-white/10 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/5"
        >
          Abrir checkout legado
        </button>
      ) : null}
    </form>
  );
}

function PixPaymentPanel(props: {
  data: PixCheckoutResponse | null;
  isLoading: boolean;
  error: string | null;
  countdownLabel: string;
  onGenerate: () => void;
  onCopy: () => Promise<void>;
}) {
  return (
    <div className="space-y-4 rounded-[1.6rem] border border-white/10 bg-slate-950/60 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-white">Pagamento via Pix</p>
          <p className="mt-1 text-sm text-slate-400">Pagamento instantâneo via banco.</p>
          <p className="mt-2 text-xs text-slate-500">Assinaturas mensais funcionam melhor com cartão.</p>
        </div>
        <button
          type="button"
          onClick={props.onGenerate}
          className="inline-flex items-center gap-2 rounded-2xl border border-white/10 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/5"
        >
          <RefreshCcw className="size-3.5" />
          Gerar novo Pix
        </button>
      </div>

      {props.isLoading ? (
        <div className="flex min-h-[260px] flex-col items-center justify-center rounded-[1.4rem] border border-white/10 bg-slate-900/70 px-6 text-center">
          <Loader2 className="mb-3 size-7 animate-spin text-emerald-300" />
          <p className="text-sm font-semibold text-white">Gerando seu QR Code Pix...</p>
        </div>
      ) : props.error ? (
        <div className="rounded-[1.4rem] border border-rose-400/20 bg-rose-500/10 p-4 text-sm text-rose-100">
          {props.error}
        </div>
      ) : props.data ? (
        <>
          <div className={cn('rounded-[1.4rem] border p-4', getPixStatusTone(props.data.status))}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] opacity-80">Status</p>
                <p className="mt-2 text-base font-semibold">{getPixStatusLabel(props.data.status)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] opacity-80">Expira em</p>
                <p className="mt-2 text-base font-semibold">{props.countdownLabel}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
            <div className="flex min-h-[220px] items-center justify-center rounded-[1.4rem] border border-white/10 bg-white p-4">
              {props.data.qrCodeUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={props.data.qrCodeUrl} alt="QR Code Pix" className="h-44 w-44 object-contain" />
              ) : props.data.hostedInstructionsUrl ? (
                <iframe
                  src={props.data.hostedInstructionsUrl}
                  title="Instruções oficiais do Pix"
                  className="h-52 w-full rounded-xl border-0"
                />
              ) : (
                <div className="flex flex-col items-center gap-3 text-center text-slate-600">
                  <QrCode className="size-10" />
                  <p className="text-sm">QR Code indisponível. Use o código copia e cola abaixo.</p>
                </div>
              )}
            </div>

            <div className="space-y-4 rounded-[1.4rem] border border-white/10 bg-slate-900/70 p-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Valor</p>
                <p className="mt-2 text-2xl font-black text-white">{formatCurrency(props.data.amount)}</p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Código Pix copia e cola</p>
                <div className="mt-2 rounded-2xl border border-white/10 bg-slate-950/80 p-3">
                  <p className="break-all text-sm text-slate-200">{props.data.copyAndPasteCode || 'Código indisponível no momento.'}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={props.onCopy}
                  disabled={!props.data.copyAndPasteCode}
                  className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-bold text-slate-900 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Copy className="size-4" />
                  Copiar código Pix
                </button>
                {props.data.hostedInstructionsUrl ? (
                  <a
                    href={props.data.hostedInstructionsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/5"
                  >
                    Abrir instruções do Pix
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

function CheckoutLoadingShell() {
  const brandLogo = '/brand/cote-finance-ai-logo.svg';

  return (
    <div className="theme-checkout-shell min-h-screen bg-slate-950 text-slate-100">
      <div className="theme-checkout-backdrop pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_15%_15%,rgba(16,185,129,.16),transparent_32%),radial-gradient(circle_at_85%_12%,rgba(14,165,233,.12),transparent_28%),linear-gradient(180deg,#020617_0%,#020617_45%,#0b1120_100%)]" />
      <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-8 lg:px-10">
        <div className="mb-8 flex items-center justify-between gap-4">
          <Link href="/app" className="inline-flex items-center gap-2 text-sm text-slate-300 transition hover:text-white">
            <ArrowLeft className="size-4" />
            Voltar ao painel
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center">
              <Image
                src={brandLogo}
                alt="Cote Finance AI - By Cote Juros"
                width={560}
                height={150}
                priority
                className="h-24 w-auto"
              />
            </Link>
          </div>
        </div>
        <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="rounded-[2rem] border border-white/10 bg-slate-900/65 p-7 backdrop-blur-xl">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-emerald-200">
                <Sparkles className="size-3.5" />
                Cote Finance AI
              </div>
              <div className="space-y-3">
                <div className="h-12 w-4/5 animate-pulse rounded-2xl bg-white/10" />
                <div className="h-5 w-full animate-pulse rounded-xl bg-white/5" />
                <div className="h-5 w-2/3 animate-pulse rounded-xl bg-white/5" />
              </div>
            </div>
          </section>
          <section className="rounded-[2rem] border border-white/10 bg-slate-900/72 p-7 backdrop-blur-xl">
            <div className="flex min-h-[360px] flex-col items-center justify-center rounded-[1.6rem] border border-white/10 bg-slate-950/60 px-6 text-center">
              <Loader2 className="mb-4 size-8 animate-spin text-emerald-300" />
              <p className="text-lg font-semibold text-white">Preparando checkout seguro...</p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function CheckoutPageContent() {
  const searchParams = useSearchParams();
  const plan = normalizeBillingPlan(searchParams.get('plan'));
  const interval = normalizeBillingInterval(searchParams.get('interval'));
  const workspaceId = searchParams.get('workspaceId');
  const paymentIntentClientSecret = searchParams.get('payment_intent_client_secret');
  const setupIntentClientSecret = searchParams.get('setup_intent_client_secret');
  const publishableKey = getStripePublishableKey();
  const publishableKeyMode = React.useMemo(() => getPublishableKeyMode(publishableKey), [publishableKey]);

  const [checkoutData, setCheckoutData] = React.useState<EmbeddedCheckoutResponse | null>(null);
  const [paymentMethod, setPaymentMethod] = React.useState<CheckoutPaymentMethod>('card');
  const [isLoading, setIsLoading] = React.useState(true);
  const [isPortalLoading, setIsPortalLoading] = React.useState(false);
  const [isPixLoading, setIsPixLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [errorCode, setErrorCode] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [pixData, setPixData] = React.useState<PixCheckoutResponse | null>(null);
  const [pixError, setPixError] = React.useState<string | null>(null);
  const [pixCountdownLabel, setPixCountdownLabel] = React.useState('30:00');
  const [copiedPixCode, setCopiedPixCode] = React.useState(false);

  const authPlanLabel = React.useMemo(() => {
    if (!plan || !interval) return null;
    if (plan === 'PREMIUM') {
      return interval === 'ANNUAL' ? 'Premium Anual' : 'Premium Mensal';
    }
    return interval === 'ANNUAL' ? 'Pro Anual' : 'Pro Mensal';
  }, [interval, plan]);
  const pendingPurchaseValue = resolvePurchaseValue(plan, interval);

  const appearance = React.useMemo<Appearance>(
    () => ({
      theme: 'night',
      variables: {
        colorPrimary: '#10b981',
        colorBackground: '#020617',
        colorText: '#e2e8f0',
        colorDanger: '#fb7185',
        colorTextSecondary: '#94a3b8',
        borderRadius: '18px',
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
      },
      rules: {
        '.Input, .Block, .Tab': {
          backgroundColor: '#0f172a',
          border: '1px solid rgba(148, 163, 184, 0.16)',
          boxShadow: 'none',
        },
        '.Label': {
          color: '#cbd5e1',
        },
      },
    }),
    []
  );

  const brandLogo = '/brand/cote-finance-ai-logo.svg';

  const handleLegacyCheckout = React.useCallback(async () => {
    if (!plan || !interval) return;

    try {
      setError(null);
      setErrorCode(null);
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        window.location.href = `/app?auth=signup&plan=${encodeURIComponent(authPlanLabel || 'Pro Mensal')}`;
        return;
      }

      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
          ...(workspaceId ? { 'x-workspace-id': workspaceId } : {}),
        },
        body: JSON.stringify({
          plan,
          interval,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as { error?: string; url?: string };
      if (!response.ok || !payload.url) {
        throw new Error(payload.error || 'Não foi possível abrir o checkout legado.');
      }

      if (pendingPurchaseValue > 0 && plan) {
        markPendingPurchase({ plan, value: pendingPurchaseValue, currency: 'BRL' });
      }
      trackPixelStandard('InitiateCheckout');
      pushInternalTrackingEvent('checkout_started', { plan, interval, mode: 'legacy_checkout' });
      window.location.href = payload.url;
    } catch (legacyError) {
      setError(legacyError instanceof Error ? legacyError.message : 'Falha no checkout legado.');
    }
  }, [authPlanLabel, interval, pendingPurchaseValue, plan, workspaceId]);

  const handleOpenPortal = React.useCallback(async () => {
    try {
      setIsPortalLoading(true);
      setError(null);
      setErrorCode(null);
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        window.location.href = '/app?auth=login';
        return;
      }

      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          ...(workspaceId ? { 'x-workspace-id': workspaceId } : {}),
        },
      });

      const payload = (await response.json().catch(() => ({}))) as { error?: string; url?: string };
      if (!response.ok || !payload.url) {
        throw new Error(payload.error || 'Não foi possível abrir o portal do cliente.');
      }

      if (pendingPurchaseValue > 0 && plan) {
        markPendingPurchase({ plan, value: pendingPurchaseValue, currency: 'BRL' });
      }
      trackPixelStandard('InitiateCheckout');
      pushInternalTrackingEvent('checkout_started', { plan, interval, mode: 'legacy_checkout' });
      window.location.href = payload.url;
    } catch (portalError) {
      setError(portalError instanceof Error ? portalError.message : 'Falha ao abrir portal.');
    } finally {
      setIsPortalLoading(false);
    }
  }, [interval, pendingPurchaseValue, plan, workspaceId]);

  React.useEffect(() => {
    if (!plan || !interval) {
      setError('Seleção de plano inválida. Volte e escolha um plano válido.');
      setIsLoading(false);
      return;
    }

    if (!publishableKey) {
      setIsLoading(false);
      return;
    }

    let isCancelled = false;

    const resolveRedirectResult = async () => {
      const stripe = await stripePromise;
      if (!stripe) {
        throw new Error('Stripe.js indisponível. Verifique NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.');
      }

      if (paymentIntentClientSecret) {
        const result = await stripe.retrievePaymentIntent(paymentIntentClientSecret);
        if (result.error) {
          throw new Error(result.error.message || 'Não foi possível confirmar o pagamento.');
        }

        const status = result.paymentIntent?.status;
        if (status === 'succeeded' || status === 'processing') {
          clearCachedCheckout(plan, interval, workspaceId);
          setSuccessMessage(
            status === 'processing'
              ? 'Pagamento recebido e em processamento. Seu workspace sera atualizado pelo webhook do Stripe.'
              : 'Pagamento confirmado. O plano do workspace sera atualizado em instantes.'
          );
          if (pendingPurchaseValue > 0 && plan) {
            trackPixelStandard('Purchase', { value: pendingPurchaseValue, currency: 'BRL' });
            pushInternalTrackingEvent('purchase_completed', { plan, interval, value: pendingPurchaseValue, origin: 'checkout_redirect' });
          }
          window.history.replaceState({}, '', getCheckoutPath({ plan, interval, workspaceId }));
          return;
        }

        throw new Error('O pagamento não foi concluído. Tente novamente.');
      }

      if (setupIntentClientSecret) {
        const result = await stripe.retrieveSetupIntent(setupIntentClientSecret);
        if (result.error) {
          throw new Error(result.error.message || 'Não foi possível confirmar o método de pagamento.');
        }

        const status = result.setupIntent?.status;
        if (status === 'succeeded' || status === 'processing') {
          clearCachedCheckout(plan, interval, workspaceId);
          setSuccessMessage(
            'Método de pagamento confirmado. O Stripe vai ativar a assinatura do workspace via webhook.'
          );
          window.history.replaceState({}, '', getCheckoutPath({ plan, interval, workspaceId }));
          return;
        }

        throw new Error('O método de pagamento não foi confirmado. Tente novamente.');
      }
    };

    const initializeCheckout = async () => {
      try {
        setIsLoading(true);
        setError(null);
        setErrorCode(null);

        if (paymentIntentClientSecret || setupIntentClientSecret) {
          await resolveRedirectResult();
          return;
        }

        const cached = readCachedCheckout(plan, interval, workspaceId);
        if (cached) {
          if (!isCancelled) {
            setCheckoutData(cached);
          }
          return;
        }

        const {
          data: { session },
        } = await withClientTimeout(
          supabase.auth.getSession(),
          8000,
          'Não foi possível validar sua sessão a tempo. Faça login novamente.'
        );

        if (!session?.access_token) {
          window.location.href = `/app?auth=signup&plan=${encodeURIComponent(authPlanLabel || 'Pro Mensal')}`;
          return;
        }

        const typedPayload = await fetchJsonWithTimeout<
          EmbeddedCheckoutResponse & { error?: string; code?: string; currentPlan?: string | null }
        >(
          '/api/stripe/payment-element',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`,
              ...(workspaceId ? { 'x-workspace-id': workspaceId } : {}),
            },
            body: JSON.stringify({
              plan,
              interval,
            }),
          },
          CHECKOUT_INIT_TIMEOUT_MS
        );

        if (
          typedPayload.stripeMode !== 'unknown' &&
          publishableKeyMode !== 'unknown' &&
          typedPayload.stripeMode !== publishableKeyMode
        ) {
          clearCachedCheckout(plan, interval, typedPayload.workspaceId);
          throw new Error(
            `Stripe configurado com chaves de ambientes diferentes. Use ${
              typedPayload.stripeMode === 'live'
                ? 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...'
                : 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...'
            } para combinar com STRIPE_SECRET_KEY.`
          );
        }

        cacheCheckout(typedPayload);

        if (pendingPurchaseValue > 0 && plan) {
          markPendingPurchase({ plan, value: pendingPurchaseValue, currency: 'BRL' });
        }
        trackPixelStandard('InitiateCheckout');
        pushInternalTrackingEvent('checkout_started', { plan, interval, mode: 'payment_element' });

        if (!isCancelled) {
          if (!typedPayload.requiresConfirmation) {
            clearCachedCheckout(plan, interval, typedPayload.workspaceId);
            setSuccessMessage('A assinatura não exige confirmação adicional. O workspace será atualizado em instantes.');
          }
          setCheckoutData(typedPayload);
        }
        } catch (checkoutError) {
          if (!isCancelled) {
            const message =
              checkoutError instanceof Error
                ? checkoutError.message
                : 'Falha ao abrir checkout.';
            setError(message);
            setErrorCode(
              checkoutError instanceof Error && 'code' in checkoutError
                ? String((checkoutError as Error & { code?: string }).code || '')
                : null
            );
          }
        } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    void initializeCheckout();

    return () => {
      isCancelled = true;
    };
  }, [
    authPlanLabel,
    interval,
    paymentIntentClientSecret,
    plan,
    publishableKeyMode,
    setupIntentClientSecret,
    publishableKey,
    pendingPurchaseValue,
    workspaceId,
  ]);

  const checkoutReturnUrl = React.useMemo(() => {
    if (!plan || !interval || typeof window === 'undefined') return '';
    const url = new URL(getCheckoutPath({ plan, interval, workspaceId }), window.location.origin);
    url.searchParams.set('redirect', '1');
    return url.toString();
  }, [interval, plan, workspaceId]);

  const summaryPlan = plan ? BILLING_PLAN_DETAILS[plan] : null;
  const showLegacyFallback = !publishableKey;
  const checkoutPlanName = checkoutData?.planName || summaryPlan?.name || 'Pro';
  const checkoutPriceLabel = checkoutData?.priceLabel || (plan && interval ? formatBillingPrice(plan, interval) : 'R$ 29 / mês');
  const checkoutWorkspaceName = checkoutData?.workspaceName || 'Meu Workspace';
  const checkoutPlanDescription =
    plan === 'PREMIUM'
      ? 'Camada avançada de inteligência financeira para quem quer mais previsibilidade e acompanhamento proativo.'
      : 'Controle financeiro completo com inteligência artificial.';
  const checkoutBenefits =
    plan === 'PREMIUM'
      ? [
          'Tudo do plano Pro',
          'Insights financeiros mais profundos',
          'Previsões de saldo e alertas inteligentes',
          'Análises avançadas de despesas',
          'Alertas e resumos automáticos no WhatsApp',
          'Suporte prioritário com acompanhamento acelerado',
        ]
      : [
          'Lançamentos ilimitados',
          'Relatórios completos e gráficos avançados',
          'Análises inteligentes com IA',
          'Insights financeiros automáticos',
          'Metas financeiras ilimitadas',
          'Acompanhamento de dívidas',
          'Controle de investimentos',
          'Resumos e alertas no WhatsApp',
          'Suporte prioritário por e-mail',
        ];
  const checkoutSecurityItems = [

    'Cobrança recorrente automática',
    'Cancele quando quiser',
    'Pagamento protegido pela Stripe',
    'Seus dados são criptografados',
  ];
  const subscriptionCenterPath = '/app?tab=subscription';
  const trialDays = plan === 'PRO' ? 3 : 0;
  const todayPriceLabel = paymentMethod === 'card' && trialDays > 0 ? 'R$ 0' : checkoutPriceLabel;
  const postTrialLabel = checkoutPriceLabel;
  const submitLabel =
    paymentMethod === 'pix'
      ? `Ativar ${checkoutPlanName} com Pix`
      : trialDays > 0
        ? 'Começar teste grátis'
        : `Ativar plano ${checkoutPlanName}`;

  React.useEffect(() => {
    if (pendingPurchaseValue > 0 && plan) {
      markPendingPurchase({ plan, value: pendingPurchaseValue, currency: 'BRL' });
    }
  }, [pendingPurchaseValue, plan]);

  const generatePix = React.useCallback(async () => {
    if (!plan || !interval) return;

    try {
      setPixError(null);
      setIsPixLoading(true);
      setCopiedPixCode(false);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        window.location.href = `/app?auth=signup&plan=${encodeURIComponent(authPlanLabel || 'Pro Mensal')}`;
        return;
      }

      const payload = await fetchJsonWithTimeout<PixCheckoutResponse & { error?: string }>(
        '/api/stripe/pix',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
            ...(workspaceId ? { 'x-workspace-id': workspaceId } : {}),
          },
          body: JSON.stringify({ plan, interval }),
        },
        CHECKOUT_INIT_TIMEOUT_MS
      );

      if (plan) {
        markPendingPurchase({ plan, value: payload.amount, currency: 'BRL' });
      }
      trackPixelStandard('InitiateCheckout');
      pushInternalTrackingEvent('checkout_started', { plan, interval, mode: 'pix_checkout' });
          setPixData(payload);
        } catch (pixInitError) {
      setPixError(
        pixInitError instanceof Error ? pixInitError.message : 'Não foi possível gerar o Pix agora. Tente novamente.'
      );
    } finally {
      setIsPixLoading(false);
    }
  }, [authPlanLabel, interval, plan, workspaceId]);

  React.useEffect(() => {
    if (paymentMethod !== 'pix' || pixData || isPixLoading || pixError) return;
    void generatePix();
  }, [generatePix, isPixLoading, paymentMethod, pixData, pixError]);

  React.useEffect(() => {
    if (!pixData?.expiresAt) {
      setPixCountdownLabel('30:00');
      return;
    }

    const updateCountdown = () => {
      const remainingMs = new Date(pixData.expiresAt as string).getTime() - Date.now();
      setPixCountdownLabel(formatCountdown(remainingMs));
      if (remainingMs <= 0 && pixData.status === 'awaiting_payment') {
        setPixData((current) => (current ? { ...current, status: 'expired' } : current));
      }
    };

    updateCountdown();
    const timer = window.setInterval(updateCountdown, 1000);
    return () => window.clearInterval(timer);
  }, [pixData?.expiresAt, pixData?.status]);

  React.useEffect(() => {
    if (paymentMethod !== 'pix' || !pixData?.paymentIntentId) return;
    if (pixData.status === 'confirmed' || pixData.status === 'expired' || pixData.status === 'failed') return;

    let isCancelled = false;
    const poll = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.access_token) return;

        const response = await fetch(`/api/stripe/pix/${pixData.paymentIntentId}`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            ...(workspaceId ? { 'x-workspace-id': workspaceId } : {}),
          },
        });
        const payload = (await response.json().catch(() => ({}))) as PixCheckoutResponse & { error?: string };
        if (!response.ok) {
          throw new Error(payload.error || 'Não foi possível atualizar o status do Pix.');
        }

        if (isCancelled) return;
          setPixData(payload);
        if (payload.status === 'confirmed') {
          setSuccessMessage('Pagamento confirmado. Seu acesso será liberado em instantes.');
        }
      } catch {
        if (!isCancelled) {
          setPixError('Não foi possível atualizar o status do Pix em tempo real.');
        }
      }
    };

    void poll();
    const intervalId = window.setInterval(poll, 5000);
    return () => {
      isCancelled = true;
      window.clearInterval(intervalId);
    };
  }, [paymentMethod, pixData?.paymentIntentId, pixData?.status, workspaceId]);

  const handleCopyPixCode = React.useCallback(async () => {
    if (!pixData?.copyAndPasteCode) return;
    await navigator.clipboard.writeText(pixData.copyAndPasteCode);
    setCopiedPixCode(true);
    window.setTimeout(() => setCopiedPixCode(false), 2000);
  }, [pixData?.copyAndPasteCode]);

  return (
    <div className="theme-checkout-shell min-h-screen bg-slate-950 text-slate-100">
      <div className="theme-checkout-backdrop pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_15%_15%,rgba(16,185,129,.16),transparent_32%),radial-gradient(circle_at_85%_12%,rgba(14,165,233,.12),transparent_28%),linear-gradient(180deg,#020617_0%,#020617_45%,#0b1120_100%)]" />

      <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-8 lg:px-10">
        <div className="mb-8 flex items-center justify-between gap-4">
          <Link href="/app" className="inline-flex items-center gap-2 text-sm text-slate-300 transition hover:text-white">
            <ArrowLeft className="size-4" />
            Voltar ao painel
          </Link>

          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center">
              <Image
                src={brandLogo}
                alt="Cote Finance AI - By Cote Juros"
                width={560}
                height={150}
                priority
                className="h-24 w-auto"
              />
            </Link>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-900/65 p-7 shadow-[0_32px_120px_-52px_rgba(16,185,129,0.45)] backdrop-blur-xl">
            <div className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top,rgba(16,185,129,.18),transparent_58%)]" />
            <div className="relative space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-emerald-200">
                <Sparkles className="size-3.5" />
                Cote Finance AI
              </div>

              <div className="space-y-3">
                <h1 className="max-w-xl text-2xl font-semibold tracking-tight text-white md:text-3xl">
                  Finalizar assinatura
                </h1>
                <p className="max-w-2xl text-sm leading-7 text-slate-300 md:text-base">
                  Finalize sua assinatura em poucos segundos. Seu pagamento é processado com segurança pela Stripe.
                </p>
              </div>

              <div className="grid gap-4 rounded-[1.6rem] border border-white/10 bg-slate-950/55 p-5 md:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Plano selecionado</p>
                  <h2 className="mt-3 text-4xl font-black tracking-tight text-white">
                    {checkoutPlanName}
                  </h2>
                  <p className="mt-2 text-sm text-slate-300">{checkoutPlanDescription}</p>
                  <p className="mt-4 text-2xl font-black tracking-tight text-emerald-200">{checkoutPriceLabel}</p>
                </div>

                <div className="rounded-2xl border border-emerald-400/15 bg-emerald-500/8 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-200">Workspace selecionado</p>
                  <p className="mt-3 text-xl font-semibold text-white">
                    {checkoutWorkspaceName}
                  </p>
                  <p className="mt-2 text-sm text-slate-300">
                    Esta assinatura será vinculada a este workspace. Você poderá gerenciar tudo depois na sua área de assinatura.
                  </p>
                </div>
              </div>

              {summaryPlan ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/55 p-5">
                    <p className="text-sm font-semibold text-white">O que você desbloqueia com o {checkoutPlanName}</p>
                    <ul className="mt-4 space-y-3">
                      {checkoutBenefits.map((feature) => (
                        <li key={feature} className="flex items-start gap-3 text-sm text-slate-300">
                          <CheckCircle2 className="mt-0.5 size-4 text-emerald-300" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/55 p-5">
                    <p className="text-sm font-semibold text-white">Pagamento seguro</p>
                    <div className="mt-4 grid gap-3">
                      {checkoutSecurityItems.map((item) => (
                        <div
                          key={item}
                          className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-slate-200"
                        >
                          <BadgeCheck className="size-4 text-cyan-300" />
                          {item}
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-400">
                      <span className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1">
                        <ShieldCheck className="size-3.5 text-emerald-300" />
                        PCI DSS
                      </span>
                      <span className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1">
                        <LockKeyhole className="size-3.5 text-emerald-300" />
                        Dados protegidos
                      </span>
                      <span className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1">
                        <CreditCard className="size-3.5 text-emerald-300" />
                        Faturamento recorrente
                      </span>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-slate-900/72 p-7 backdrop-blur-xl">
            <div className="space-y-6">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Pagamento</p>
                <h2 className="text-lg font-semibold tracking-tight text-white md:text-xl">Pagamento seguro</h2>
                <p className="max-w-lg text-sm leading-6 text-slate-400">
                  Ative seu plano em poucos segundos. Pagamento seguro processado pela Stripe.
                </p>
                <div className="rounded-[1.4rem] border border-white/10 bg-slate-950/60 p-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Hoje</p>
                      <p className="mt-2 text-3xl font-black tracking-tight text-white">{todayPriceLabel}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                        {trialDays > 0 && paymentMethod === 'card' ? 'Após o período de teste' : 'Plano contratado'}
                      </p>
                      <p className="mt-2 text-[2.1rem] font-black tracking-tight text-white md:text-[2.25rem]">
                        {postTrialLabel}
                      </p>
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-slate-300">
                    {paymentMethod === 'card'
                      ? trialDays > 0
                        ? 'Você não será cobrado hoje. Após o teste, a assinatura renova automaticamente.'
                        : 'Pagamento seguro processado pela Stripe com renovação automática.'
                      : 'Pix ativa o plano por 1 ciclo, sem renovação automática.'}
                  </p>
                </div>
              </div>

              <div className="space-y-3 rounded-[1.6rem] border border-white/10 bg-slate-950/55 p-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Método de pagamento</p>
                </div>
                <div className="grid gap-3">
                  {([
                    {
                      value: 'card',
                      title: 'Cartão de crédito',
                      badge: 'Mais indicado',
                      description:
                        trialDays > 0
                          ? '3 dias de teste grátis e renovação automática depois.'
                          : 'Recomendado para assinaturas com renovação automática.',
                    },
                    {
                      value: 'pix',
                      title: 'Pix',
                      badge: 'Sem renovação',
                      description: 'Pagamento instantâneo com acesso por 1 ciclo, sem renovação automática.',
                    },
                  ] as const).map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setPaymentMethod(option.value);
                        setError(null);
                        setSuccessMessage(null);
                      }}
                      className={cn(
                        'flex items-start justify-between rounded-[1.4rem] border p-4 text-left transition',
                        paymentMethod === option.value
                          ? 'border-emerald-400/30 bg-emerald-500/10'
                          : 'border-white/10 bg-slate-900/70 hover:border-white/20 hover:bg-slate-900/90'
                      )}
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-base font-semibold text-white">{option.title}</p>
                          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">
                            {option.badge}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-slate-400">{option.description}</p>
                      </div>
                      <div
                        className={cn(
                          'mt-1 flex size-5 items-center justify-center rounded-full border',
                          paymentMethod === option.value ? 'border-emerald-300 bg-emerald-400/20' : 'border-slate-600'
                        )}
                      >
                        {paymentMethod === option.value ? <div className="size-2 rounded-full bg-emerald-300" /> : null}
                      </div>
                    </button>
                  ))}
                </div>
                <p className="text-xs leading-5 text-slate-500">
                  Assinaturas mensais funcionam melhor com cartão. Pix libera acesso por um ciclo e não renova sozinho.
                </p>
              </div>

              {isLoading ? (
                <div className="flex min-h-[360px] flex-col items-center justify-center rounded-[1.6rem] border border-white/10 bg-slate-950/60 px-6 text-center">
                  <Loader2 className="mb-4 size-8 animate-spin text-emerald-300" />
                  <p className="text-lg font-semibold text-white">Preparando checkout seguro...</p>
                  <p className="mt-2 max-w-sm text-sm text-slate-400">
                    Estamos validando o workspace, cliente Stripe e a assinatura recorrente antes de renderizar o Payment
                    Element.
                  </p>
                </div>
              ) : successMessage ? (
                <div className="space-y-5 rounded-[1.6rem] border border-emerald-400/20 bg-emerald-500/10 p-6">
                  <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-emerald-200">
                    <CheckCircle2 className="size-3.5" />
                    Pagamento confirmado
                  </div>
                  <p className="text-base text-slate-100">{successMessage}</p>
                  <div className="flex flex-wrap gap-3">
                    <Link
                      href={subscriptionCenterPath}
                      className="inline-flex items-center justify-center rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-400"
                    >
                      Abrir minha assinatura
                    </Link>
                    <button
                      type="button"
                      onClick={handleOpenPortal}
                      disabled={isPortalLoading}
                      className="inline-flex items-center justify-center rounded-2xl border border-white/10 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/5 disabled:opacity-60"
                    >
                      {isPortalLoading ? 'Abrindo portal...' : 'Atualizar forma de pagamento'}
                    </button>
                  </div>
                </div>
              ) : error ? (
                <div className="space-y-5 rounded-[1.6rem] border border-rose-400/20 bg-rose-500/10 p-6">
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-rose-200">Checkout indisponível</p>
                  <p className="text-base text-slate-100">{error}</p>
                  <div className="flex flex-wrap gap-3">
                    <Link
                      href={subscriptionCenterPath}
                      className="inline-flex items-center justify-center rounded-2xl border border-white/10 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/5"
                    >
                      Abrir minha assinatura
                    </Link>
                    {errorCode === 'PAYMENT_METHOD_UPDATE_REQUIRED' || errorCode === 'ACTIVE_SUBSCRIPTION_EXISTS' ? (
                      <button
                        type="button"
                        onClick={handleOpenPortal}
                        disabled={isPortalLoading}
                        className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-bold text-slate-900 transition hover:bg-slate-100 disabled:opacity-60"
                      >
                        {isPortalLoading ? 'Abrindo portal...' : 'Abrir portal de cobrança'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleLegacyCheckout}
                        className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-bold text-slate-900 transition hover:bg-slate-100"
                      >
                        Abrir checkout legado
                      </button>
                    )}
                  </div>
                </div>
              ) : paymentMethod === 'pix' ? (
                <div className="space-y-4">
                  <PixPaymentPanel
                    data={pixData}
                    isLoading={isPixLoading}
                    error={pixError}
                    countdownLabel={pixCountdownLabel}
                    onGenerate={() => {
                      setPixData(null);
                      void generatePix();
                    }}
                    onCopy={handleCopyPixCode}
                  />
                  {copiedPixCode ? <p className="text-center text-xs text-emerald-300">Código Pix copiado.</p> : null}
                </div>
              ) : checkoutData?.clientSecret && publishableKey ? (
                <Elements
                  key={checkoutData.clientSecret}
                  stripe={stripePromise}
                  options={{
                    clientSecret: checkoutData.clientSecret,
                    appearance,
                    loader: 'auto',
                  }}
                >
                  <EmbeddedPaymentForm
                    intentType={checkoutData.intentType}
                    returnUrl={checkoutReturnUrl}
                    submitLabel={submitLabel}
                    helperText="Pagamento seguro processado pela Stripe. Seus dados são protegidos por criptografia SSL."
                    onFallbackCheckout={handleLegacyCheckout}
                    onSuccess={() => {
                      clearCachedCheckout(checkoutData.plan, checkoutData.interval, checkoutData.workspaceId);
                      setSuccessMessage('Pagamento enviado. Seu acesso será liberado assim que a Stripe confirmar a assinatura.');
                    }}
                  />
                </Elements>
              ) : checkoutData && !checkoutData.requiresConfirmation ? (
                <div className="space-y-5 rounded-[1.6rem] border border-emerald-400/20 bg-emerald-500/10 p-6">
                  <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-emerald-200">
                    <CheckCircle2 className="size-3.5" />
                    Assinatura pronta
                  </div>
                  <p className="text-base text-slate-100">
                    Sua assinatura já está pronta. Seu acesso será atualizado automaticamente em instantes.
                  </p>
                  <Link
                    href={subscriptionCenterPath}
                    className="inline-flex items-center justify-center rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-400"
                  >
                    Abrir minha assinatura
                  </Link>
                </div>
              ) : (
                <div className="space-y-4 rounded-[1.6rem] border border-white/10 bg-slate-950/60 p-6">
                  <p className="text-sm text-slate-300">
                    Não foi possível iniciar o Payment Element com a configuração atual.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={handleLegacyCheckout}
                      className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-bold text-slate-900 transition hover:bg-slate-100"
                    >
                      Abrir checkout legado
                    </button>
                    <Link
                      href={subscriptionCenterPath}
                      className="inline-flex items-center justify-center rounded-2xl border border-white/10 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/5"
                    >
                      Abrir minha assinatura
                    </Link>
                  </div>
                </div>
              )}

              {showLegacyFallback ? (
                <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY não está definida. O fallback legado continua disponível enquanto o
                  Payment Element não pode ser renderizado.
                </div>
              ) : null}

              <div className="space-y-3 rounded-[1.6rem] border border-white/10 bg-slate-950/55 p-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Resumo da assinatura</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Plano</p>
                    <p className="mt-2 text-lg font-semibold text-white">
                      {checkoutPlanName}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Valor do plano</p>
                    <div className="mt-2 space-y-1">
                      <p className="text-lg font-semibold text-white">{paymentMethod === 'card' && trialDays > 0 ? 'R$ 0 hoje' : checkoutPriceLabel}</p>
                      {paymentMethod === 'card' && trialDays > 0 ? (
                        <p className="text-sm text-slate-400">{postTrialLabel} depois</p>
                      ) : null}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Workspace</p>
                    <p className="mt-2 text-lg font-semibold text-white">{checkoutWorkspaceName}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-5 border-t border-white/10 pt-5 text-sm text-slate-400">
                <div className="rounded-[1.3rem] border border-white/10 bg-slate-950/45 p-4">
                  <div className="grid gap-3">
                    <div className="flex items-start gap-2 text-slate-300">
                      <LockKeyhole className="mt-0.5 size-4 text-emerald-300" />
                      <span>Pagamento seguro processado pela Stripe.</span>
                    </div>
                    <div className="flex items-start gap-2 border-t border-white/10 pt-3">
                      <ShieldCheck className="mt-0.5 size-4 text-emerald-300" />
                      <span>Seus dados são protegidos por criptografia SSL.</span>
                    </div>
                    <div className="flex items-start gap-2 border-t border-white/10 pt-3">
                      <BadgeCheck className="mt-0.5 size-4 text-emerald-300" />
                      <span>Cancele sua assinatura a qualquer momento.</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="font-semibold text-slate-200">Cote Finance AI</p>
                  <p>By Cote Juros</p>
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
                  <Link href="/termos-de-uso" className="transition hover:text-white">
                    Termos de uso
                  </Link>
                  <Link href="/politica-de-privacidade" className="transition hover:text-white">
                    Política de privacidade
                  </Link>
                  <a href="mailto:suporte@cotejuros.com.br" className="transition hover:text-white">
                    suporte@cotejuros.com.br
                  </a>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <React.Suspense fallback={<CheckoutLoadingShell />}>
      <CheckoutPageContent />
    </React.Suspense>
  );
}






