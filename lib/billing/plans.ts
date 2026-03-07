export type BillingPlanCode = 'PRO' | 'PREMIUM';
export type BillingIntervalCode = 'MONTHLY' | 'ANNUAL';
export type CheckoutPlanLabel = 'Pro Mensal' | 'Pro Anual' | 'Premium Mensal' | 'Premium Anual';

type BillingPlanDetails = {
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  description: string;
  features: string[];
  trustBadges: string[];
};

export const BILLING_PLAN_DETAILS: Record<BillingPlanCode, BillingPlanDetails> = {
  PRO: {
    name: 'Pro',
    monthlyPrice: 29,
    annualPrice: 290,
    description: 'Para quem quer analises mais profundas, IA util no dia a dia e gestao sem limite artificial.',
    features: [
      'Lancamentos ilimitados',
      'Relatorios completos e graficos avancados',
      'Analises inteligentes com IA',
      'Metas financeiras ilimitadas',
      'Acompanhamento de dividas',
      'Controle de investimentos',
      'Suporte prioritario por e-mail',
    ],
    trustBadges: ['Cobranca recorrente automatica', 'Cancele quando quiser', 'Pagamento protegido pela Stripe'],
  },
  PREMIUM: {
    name: 'Premium',
    monthlyPrice: 49,
    annualPrice: 490,
    description:
      'Para operacoes que querem previsoes, alertas automaticos e uma camada mais estrategica de inteligencia financeira.',
    features: [
      'Tudo do Pro',
      'Insights financeiros mais avancados',
      'Previsao de saldo e alertas inteligentes',
      'Analises profundas de despesas',
      'Suporte prioritario com SLA mais rapido',
    ],
    trustBadges: ['Checkout PCI via Stripe', 'Cancele quando quiser', 'Cobranca protegida por SSL'],
  },
};

export function normalizeBillingPlan(value?: string | null): BillingPlanCode | null {
  if (!value) return null;
  const normalized = value.trim().toUpperCase();
  if (normalized === 'PRO' || normalized === 'PREMIUM') {
    return normalized;
  }
  return null;
}

export function normalizeBillingInterval(value?: string | null): BillingIntervalCode | null {
  if (!value) return null;
  const normalized = value.trim().toUpperCase();
  if (normalized === 'MONTHLY' || normalized === 'ANNUAL') {
    return normalized;
  }
  return null;
}

export function getCheckoutPlanLabel(
  plan: BillingPlanCode,
  interval: BillingIntervalCode
): CheckoutPlanLabel {
  if (plan === 'PREMIUM') {
    return interval === 'ANNUAL' ? 'Premium Anual' : 'Premium Mensal';
  }
  return interval === 'ANNUAL' ? 'Pro Anual' : 'Pro Mensal';
}

export function parseCheckoutPlanLabel(label?: string | null): {
  plan: BillingPlanCode;
  interval: BillingIntervalCode;
} | null {
  if (!label) return null;
  const normalized = label.trim().toLowerCase();

  if (normalized === 'pro mensal') {
    return { plan: 'PRO', interval: 'MONTHLY' };
  }
  if (normalized === 'pro anual') {
    return { plan: 'PRO', interval: 'ANNUAL' };
  }
  if (normalized === 'premium mensal') {
    return { plan: 'PREMIUM', interval: 'MONTHLY' };
  }
  if (normalized === 'premium anual') {
    return { plan: 'PREMIUM', interval: 'ANNUAL' };
  }

  return null;
}

export function formatBillingPrice(plan: BillingPlanCode, interval: BillingIntervalCode) {
  const amount =
    interval === 'ANNUAL'
      ? BILLING_PLAN_DETAILS[plan].annualPrice
      : BILLING_PLAN_DETAILS[plan].monthlyPrice;
  return `R$ ${amount.toLocaleString('pt-BR')}/${interval === 'ANNUAL' ? 'ano' : 'mes'}`;
}

export function getCheckoutPath(params: {
  plan: BillingPlanCode;
  interval: BillingIntervalCode;
  workspaceId?: string | null;
}) {
  const searchParams = new URLSearchParams({
    plan: params.plan,
    interval: params.interval,
  });

  if (params.workspaceId) {
    searchParams.set('workspaceId', params.workspaceId);
  }

  return `/app/checkout?${searchParams.toString()}`;
}
