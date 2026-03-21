import type { WorkspacePlan } from '@/lib/billing/limits';
import { normalizeBillingPlan } from '@/lib/server/billing-status';

export type WhatsAppCapability =
  | 'connect'
  | 'manual_test_send'
  | 'auto_daily_digest'
  | 'auto_basic_alerts'
  | 'auto_advanced_alerts'
  | 'ai_assistant'
  | 'admin_actions'
  | 'gemini_transaction_parser';

export type WhatsAppCapabilityPolicy = {
  requiredPlan: 'PRO' | 'PREMIUM';
  code: 'WHATSAPP_REQUIRES_PRO' | 'WHATSAPP_REQUIRES_PREMIUM';
  message: string;
};

export type WhatsAppPlanCapabilities = Record<WhatsAppCapability, boolean>;

export const WHATSAPP_CAPABILITY_MATRIX: Record<WorkspacePlan, WhatsAppPlanCapabilities> = {
  FREE: {
    connect: false,
    manual_test_send: false,
    auto_daily_digest: false,
    auto_basic_alerts: false,
    auto_advanced_alerts: false,
    ai_assistant: false,
    admin_actions: false,
    gemini_transaction_parser: false,
  },
  PRO: {
    connect: true,
    manual_test_send: true,
    auto_daily_digest: true,
    auto_basic_alerts: true,
    auto_advanced_alerts: false,
    ai_assistant: false,
    admin_actions: false,
    gemini_transaction_parser: false,
  },
  PREMIUM: {
    connect: true,
    manual_test_send: true,
    auto_daily_digest: true,
    auto_basic_alerts: true,
    auto_advanced_alerts: true,
    ai_assistant: true,
    admin_actions: true,
    gemini_transaction_parser: true,
  },
};

const CAPABILITY_POLICY: Record<WhatsAppCapability, WhatsAppCapabilityPolicy> = {
  connect: {
    requiredPlan: 'PRO',
    code: 'WHATSAPP_REQUIRES_PRO',
    message: 'O WhatsApp esta disponivel apenas nos planos Pro e Premium.',
  },
  manual_test_send: {
    requiredPlan: 'PRO',
    code: 'WHATSAPP_REQUIRES_PRO',
    message: 'O WhatsApp esta disponivel apenas nos planos Pro e Premium.',
  },
  auto_daily_digest: {
    requiredPlan: 'PRO',
    code: 'WHATSAPP_REQUIRES_PRO',
    message: 'A automacao de resumo no WhatsApp esta disponivel apenas nos planos Pro e Premium.',
  },
  auto_basic_alerts: {
    requiredPlan: 'PRO',
    code: 'WHATSAPP_REQUIRES_PRO',
    message: 'A automacao de alertas no WhatsApp esta disponivel apenas nos planos Pro e Premium.',
  },
  auto_advanced_alerts: {
    requiredPlan: 'PREMIUM',
    code: 'WHATSAPP_REQUIRES_PREMIUM',
    message: 'Os alertas avancados de WhatsApp estao disponiveis no plano Premium.',
  },
  ai_assistant: {
    requiredPlan: 'PREMIUM',
    code: 'WHATSAPP_REQUIRES_PREMIUM',
    message: 'As consultas com IA no WhatsApp estao disponiveis no plano Premium.',
  },
  admin_actions: {
    requiredPlan: 'PREMIUM',
    code: 'WHATSAPP_REQUIRES_PREMIUM',
    message: 'As acoes administrativas pelo WhatsApp estao disponiveis no plano Premium.',
  },
  gemini_transaction_parser: {
    requiredPlan: 'PREMIUM',
    code: 'WHATSAPP_REQUIRES_PREMIUM',
    message: 'O parser avancado de transacoes via WhatsApp esta disponivel no plano Premium.',
  },
};

export const WHATSAPP_AUTOMATION_ELIGIBLE_PLANS: ReadonlyArray<'PRO' | 'PREMIUM'> = ['PRO', 'PREMIUM'];

export function resolveWhatsAppWorkspacePlan(value: string | null | undefined): WorkspacePlan {
  return normalizeBillingPlan(value);
}

export function getWhatsAppCapabilityPolicy(capability: WhatsAppCapability): WhatsAppCapabilityPolicy {
  return CAPABILITY_POLICY[capability];
}

export function getWhatsAppCapabilities(plan: string | null | undefined): WhatsAppPlanCapabilities {
  const resolvedPlan = resolveWhatsAppWorkspacePlan(plan);
  return { ...WHATSAPP_CAPABILITY_MATRIX[resolvedPlan] };
}

export function hasWhatsAppCapability(plan: string | null | undefined, capability: WhatsAppCapability) {
  const resolvedPlan = resolveWhatsAppWorkspacePlan(plan);
  return WHATSAPP_CAPABILITY_MATRIX[resolvedPlan][capability];
}

export function hasWhatsAppCapabilityForSubscription(params: {
  plan: string | null | undefined;
  status: string | null | undefined;
  capability: WhatsAppCapability;
}) {
  const status = String(params.status || '').toUpperCase();
  if (status !== 'ACTIVE') return false;
  return hasWhatsAppCapability(params.plan, params.capability);
}
