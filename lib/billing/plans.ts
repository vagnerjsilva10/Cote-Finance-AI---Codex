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
    description: 'Para quem quer análises mais profundas, IA útil no dia a dia e gestão sem limite artificial.',
    features: [
      'Lançamentos ilimitados',
      'Relatórios completos e gráficos avançados',
      'Análises inteligentes com IA',
      'Metas financeiras ilimitadas',
      'Acompanhamento de dívidas',
      'Controle de investimentos',
      'Suporte prioritário por e-mail',
    ],
    trustBadges: ['Cobrança recorrente automática', 'Cancele quando quiser', 'Pagamento protegido pela Stripe'],
  },
  PREMIUM: {
    name: 'Premium',
    monthlyPrice: 49,
    annualPrice: 490,
    description:
      'Para operações que querem previsões, alertas automáticos e uma camada mais estratégica de inteligência financeira.',
    features: [
      'Tudo do Pro',
      'Insights financeiros mais avançados',
      'Previsão de saldo e alertas inteligentes',
      'Análises profundas de despesas',
      'Suporte prioritário com SLA mais rápido',
    ],
    trustBadges: ['Checkout PCI via Stripe', 'Cancele quando quiser', 'Cobrança protegida por SSL'],
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
  return `R$ ${amount.toLocaleString('pt-BR')}/${interval === 'ANNUAL' ? 'ano' : 'mês'}`;
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
