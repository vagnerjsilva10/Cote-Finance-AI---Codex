'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  BadgeCheck,
  CheckCircle2,
  CreditCard,
  Loader2,
  LockKeyhole,
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

type CheckoutIntentType = 'payment' | 'setup' | 'none';

type EmbeddedCheckoutResponse = {
  clientSecret: string | null;
  intentType: CheckoutIntentType;
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

type FormStatus = 'idle' | 'submitting' | 'success';

const stripePromise = getStripeJs();

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

function EmbeddedPaymentForm(props: {
  intentType: CheckoutIntentType;
  returnUrl: string;
  submitLabel: string;
  helperText: string;
  onSuccess: () => void;
  onError: (message: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [status, setStatus] = React.useState<FormStatus>('idle');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!stripe || !elements || status === 'submitting') return;

    setStatus('submitting');

    try {
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
        props.onError(result.error.message || 'Nao foi possivel confirmar o pagamento.');
        setStatus('idle');
        return;
      }

      setStatus('success');
      props.onSuccess();
    } catch (error) {
      props.onError(error instanceof Error ? error.message : 'Falha ao processar pagamento.');
      setStatus('idle');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="rounded-3xl border border-white/10 bg-slate-950/55 p-4">
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
        />
      </div>

      <button
        type="submit"
        disabled={!stripe || !elements || status === 'submitting'}
        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-5 py-4 text-sm font-bold text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === 'submitting' ? <Loader2 className="size-4 animate-spin" /> : <LockKeyhole className="size-4" />}
        {status === 'submitting' ? 'Confirmando pagamento...' : props.submitLabel}
      </button>
      <p className="text-center text-xs text-slate-400">{props.helperText}</p>
    </form>
  );
}

function CheckoutLoadingShell() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_15%_15%,rgba(16,185,129,.16),transparent_32%),radial-gradient(circle_at_85%_12%,rgba(14,165,233,.12),transparent_28%),linear-gradient(180deg,#020617_0%,#020617_45%,#0b1120_100%)]" />
      <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-8 lg:px-10">
        <div className="mb-8 flex items-center justify-between gap-4">
          <Link href="/app" className="inline-flex items-center gap-2 text-sm text-slate-300 transition hover:text-white">
            <ArrowLeft className="size-4" />
            Voltar ao painel
          </Link>
          <Link href="/" className="flex items-center">
            <Image
              src="/brand/cote-finance-ai-logo.svg"
              alt="Cote Finance AI - By Cote Juros"
              width={480}
              height={128}
              priority
              className="h-20 w-auto"
            />
          </Link>
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

  const [checkoutData, setCheckoutData] = React.useState<EmbeddedCheckoutResponse | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isPortalLoading, setIsPortalLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  const authPlanLabel = React.useMemo(() => {
    if (!plan || !interval) return null;
    if (plan === 'PREMIUM') {
      return interval === 'ANNUAL' ? 'Premium Anual' : 'Premium Mensal';
    }
    return interval === 'ANNUAL' ? 'Pro Anual' : 'Pro Mensal';
  }, [interval, plan]);

  const appearance = React.useMemo(
    () => ({
      theme: 'night' as const,
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

  const handleLegacyCheckout = React.useCallback(async () => {
    if (!plan || !interval) return;

    try {
      setError(null);
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
        throw new Error(payload.error || 'Nao foi possivel abrir o checkout legado.');
      }

      window.location.href = payload.url;
    } catch (legacyError) {
      setError(legacyError instanceof Error ? legacyError.message : 'Falha no checkout legado.');
    }
  }, [authPlanLabel, interval, plan, workspaceId]);

  const handleOpenPortal = React.useCallback(async () => {
    try {
      setIsPortalLoading(true);
      setError(null);
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
        throw new Error(payload.error || 'Nao foi possivel abrir o portal do cliente.');
      }

      window.location.href = payload.url;
    } catch (portalError) {
      setError(portalError instanceof Error ? portalError.message : 'Falha ao abrir portal.');
    } finally {
      setIsPortalLoading(false);
    }
  }, [workspaceId]);

  React.useEffect(() => {
    if (!plan || !interval) {
      setError('Selecao de plano invalida. Volte e escolha um plano valido.');
      setIsLoading(false);
      return;
    }

    let isCancelled = false;

    const resolveRedirectResult = async () => {
      const stripe = await stripePromise;
      if (!stripe) {
        throw new Error('Stripe.js indisponivel. Verifique NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.');
      }

      if (paymentIntentClientSecret) {
        const result = await stripe.retrievePaymentIntent(paymentIntentClientSecret);
        if (result.error) {
          throw new Error(result.error.message || 'Nao foi possivel confirmar o pagamento.');
        }

        const status = result.paymentIntent?.status;
        if (status === 'succeeded' || status === 'processing') {
          clearCachedCheckout(plan, interval, workspaceId);
          setSuccessMessage(
            status === 'processing'
              ? 'Pagamento recebido e em processamento. Seu workspace sera atualizado pelo webhook do Stripe.'
              : 'Pagamento confirmado. O plano do workspace sera atualizado em instantes.'
          );
          window.history.replaceState({}, '', getCheckoutPath({ plan, interval, workspaceId }));
          return;
        }

        throw new Error('O pagamento nao foi concluido. Tente novamente.');
      }

      if (setupIntentClientSecret) {
        const result = await stripe.retrieveSetupIntent(setupIntentClientSecret);
        if (result.error) {
          throw new Error(result.error.message || 'Nao foi possivel confirmar o metodo de pagamento.');
        }

        const status = result.setupIntent?.status;
        if (status === 'succeeded' || status === 'processing') {
          clearCachedCheckout(plan, interval, workspaceId);
          setSuccessMessage(
            'Metodo de pagamento confirmado. O Stripe vai ativar a assinatura do workspace via webhook.'
          );
          window.history.replaceState({}, '', getCheckoutPath({ plan, interval, workspaceId }));
          return;
        }

        throw new Error('O metodo de pagamento nao foi confirmado. Tente novamente.');
      }
    };

    const initializeCheckout = async () => {
      try {
        setIsLoading(true);
        setError(null);

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
        } = await supabase.auth.getSession();

        if (!session?.access_token) {
          window.location.href = `/app?auth=signup&plan=${encodeURIComponent(authPlanLabel || 'Pro Mensal')}`;
          return;
        }

        const response = await fetch('/api/stripe/payment-element', {
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

        const payload = (await response.json().catch(() => ({}))) as
          | (EmbeddedCheckoutResponse & { error?: string; code?: string; currentPlan?: string | null })
          | { error?: string; code?: string; currentPlan?: string | null };

        if (!response.ok) {
          if (response.status === 409 && payload.code === 'ACTIVE_SUBSCRIPTION_EXISTS') {
            setError(payload.error || 'Este workspace ja possui uma assinatura ativa.');
            return;
          }

          throw new Error(
            typeof payload?.error === 'string'
              ? payload.error
              : `Falha ao preparar checkout (HTTP ${response.status}).`
          );
        }

        const typedPayload = payload as EmbeddedCheckoutResponse;
        cacheCheckout(typedPayload);

        if (!isCancelled) {
          if (!typedPayload.requiresConfirmation) {
            clearCachedCheckout(plan, interval, typedPayload.workspaceId);
            setSuccessMessage('A assinatura nao exige confirmacao adicional. O workspace sera atualizado em instantes.');
          }
          setCheckoutData(typedPayload);
        }
      } catch (checkoutError) {
        if (!isCancelled) {
          setError(checkoutError instanceof Error ? checkoutError.message : 'Falha ao abrir checkout.');
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
    setupIntentClientSecret,
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
      ? 'Camada avancada de inteligencia financeira para quem quer mais previsibilidade e acompanhamento proativo.'
      : 'Controle financeiro completo com inteligencia artificial.';
  const checkoutBenefits =
    plan === 'PREMIUM'
      ? [
          'Tudo do plano Pro',
          'Insights financeiros mais profundos',
          'Previsoes de saldo e alertas inteligentes',
          'Analises avancadas de despesas',
          'Suporte prioritario com acompanhamento acelerado',
        ]
      : [
          'Lancamentos ilimitados',
          'Relatorios completos e graficos avancados',
          'Analises inteligentes com IA',
          'Metas financeiras ilimitadas',
          'Acompanhamento de dividas',
          'Controle de investimentos',
          'Suporte prioritario por e-mail',
        ];
  const checkoutSecurityItems = [
    'Cobranca recorrente automatica',
    'Cancele quando quiser',
    'Pagamento protegido pela Stripe',
    'Seus dados sao criptografados',
  ];
  const subscriptionCenterPath = '/app?tab=subscription';
  const submitLabel = `Comecar meu plano ${checkoutPlanName}`;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_15%_15%,rgba(16,185,129,.16),transparent_32%),radial-gradient(circle_at_85%_12%,rgba(14,165,233,.12),transparent_28%),linear-gradient(180deg,#020617_0%,#020617_45%,#0b1120_100%)]" />

      <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-8 lg:px-10">
        <div className="mb-8 flex items-center justify-between gap-4">
          <Link href="/app" className="inline-flex items-center gap-2 text-sm text-slate-300 transition hover:text-white">
            <ArrowLeft className="size-4" />
            Voltar ao painel
          </Link>

          <Link href="/" className="flex items-center">
            <Image
              src="/brand/cote-finance-ai-logo.svg"
              alt="Cote Finance AI - By Cote Juros"
              width={480}
              height={128}
              priority
              className="h-20 w-auto"
            />
          </Link>
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
                <h1 className="max-w-xl text-4xl font-black tracking-tight text-white md:text-5xl">
                  Checkout seguro
                </h1>
                <p className="max-w-2xl text-base text-slate-300 md:text-lg">
                  Finalize sua assinatura em poucos segundos. Seu pagamento e processado com seguranca pela Stripe.
                </p>
              </div>

              <div className="grid gap-4 rounded-[1.6rem] border border-white/10 bg-slate-950/55 p-5 md:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Plano selecionado</p>
                  <h2 className="mt-3 text-3xl font-black text-white">
                    {checkoutPlanName}
                  </h2>
                  <p className="mt-2 text-sm text-slate-300">{checkoutPlanDescription}</p>
                  <p className="mt-3 text-base font-semibold text-emerald-200">{checkoutPriceLabel}</p>
                </div>

                <div className="rounded-2xl border border-emerald-400/15 bg-emerald-500/8 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-200">Workspace selecionado</p>
                  <p className="mt-3 text-xl font-semibold text-white">
                    {checkoutWorkspaceName}
                  </p>
                  <p className="mt-2 text-sm text-slate-300">
                    Esta assinatura sera vinculada a este workspace. Voce podera gerenciar tudo depois na sua area de assinatura.
                  </p>
                </div>
              </div>

              {summaryPlan ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/55 p-5">
                    <p className="text-sm font-semibold text-white">O que voce desbloqueia com o {checkoutPlanName}</p>
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
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Pagamento seguro</p>
                <h2 className="text-3xl font-black text-white">Finalize sua assinatura</h2>
                <p className="text-sm text-slate-400">
                  Preencha os dados de pagamento para ativar seu plano {checkoutPlanName} com seguranca.
                </p>
                <p className="text-sm text-slate-300">
                  Comece hoje a ter mais clareza sobre seu dinheiro e acesso a analises mais inteligentes.
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
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-rose-200">Checkout indisponivel</p>
                  <p className="text-base text-slate-100">{error}</p>
                  <div className="flex flex-wrap gap-3">
                    <Link
                      href={subscriptionCenterPath}
                      className="inline-flex items-center justify-center rounded-2xl border border-white/10 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/5"
                    >
                      Abrir minha assinatura
                    </Link>
                    <button
                      type="button"
                      onClick={handleLegacyCheckout}
                      className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-bold text-slate-900 transition hover:bg-slate-100"
                    >
                      Abrir checkout legado
                    </button>
                  </div>
                </div>
              ) : checkoutData?.clientSecret && publishableKey ? (
                <Elements
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
                    helperText="Voce pode cancelar sua assinatura a qualquer momento."
                    onSuccess={() => {
                      clearCachedCheckout(checkoutData.plan, checkoutData.interval, checkoutData.workspaceId);
                      setSuccessMessage('Pagamento enviado. O Stripe esta finalizando a assinatura deste workspace.');
                    }}
                    onError={(message) => setError(message)}
                  />
                </Elements>
              ) : checkoutData && !checkoutData.requiresConfirmation ? (
                <div className="space-y-5 rounded-[1.6rem] border border-emerald-400/20 bg-emerald-500/10 p-6">
                  <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-emerald-200">
                    <CheckCircle2 className="size-3.5" />
                    Assinatura pronta
                  </div>
                  <p className="text-base text-slate-100">
                    A assinatura deste workspace nao exige confirmacao adicional. O webhook do Stripe vai consolidar o
                    plano automaticamente.
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
                    Nao foi possivel iniciar o Payment Element com a configuracao atual.
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
                  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY nao esta definida. O fallback legado continua disponivel enquanto o
                  Payment Element nao pode ser renderizado.
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
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Cobranca</p>
                    <p className="mt-2 text-lg font-semibold text-white">
                      {checkoutPriceLabel}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Workspace</p>
                    <p className="mt-2 text-lg font-semibold text-white">{checkoutWorkspaceName}</p>
                  </div>
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
