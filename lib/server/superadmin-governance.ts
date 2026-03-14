import 'server-only';

import { Prisma } from '@prisma/client';

import { BILLING_PLAN_DETAILS } from '@/lib/billing/plans';
import { PLAN_LIMITS, type WorkspacePlan } from '@/lib/billing/limits';
import { asPrismaServiceUnavailableError, prisma } from '@/lib/prisma';

const PLAN_CATALOG_KEY = 'superadmin.plan-catalog';
const WORKSPACE_LIFECYCLE_KEY = 'superadmin.workspace-lifecycle';

export type EditablePlanCode = WorkspacePlan;
export type WorkspaceLifecycleStatus = 'ACTIVE' | 'SUSPENDED';

export type EditablePlanConfig = {
  code: EditablePlanCode;
  name: string;
  active: boolean;
  visible: boolean;
  default: boolean;
  sortOrder: number;
  monthlyPrice: number;
  annualPrice: number;
  trialDays: number;
  description: string;
  features: string[];
  trustBadges: string[];
  limits: {
    transactionsPerMonth: number | null;
    aiInteractionsPerMonth: number | null;
    reports: 'basic' | 'full';
  };
};

export type WorkspaceLifecycleEntry = {
  workspaceId: string;
  status: WorkspaceLifecycleStatus;
  reason: string | null;
  updatedAt: string;
};

function isMissingPlatformSettingError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === 'P2021' || error.code === 'P2022';
  }

  const message = error instanceof Error ? error.message : String(error || '');
  return /does not exist|relation .* does not exist|table .* doesn't exist|column .* does not exist/i.test(message);
}

function getDefaultPlanCatalog(): EditablePlanConfig[] {
  return [
    {
      code: 'FREE',
      name: 'Free',
      active: true,
      visible: true,
      default: true,
      sortOrder: 1,
      monthlyPrice: 0,
      annualPrice: 0,
      trialDays: 0,
      description: 'Ideal para começar a organizar suas finanças e testar o produto.',
      features: [
        'Até 15 lançamentos por mês',
        'Até 15 interações com IA por mês',
        'Dashboard financeiro',
        'Categorias automáticas',
        'Análise básica de despesas',
      ],
      trustBadges: ['Sem cartão para começar', 'Entrada gratuita', 'Sem compromisso'],
      limits: PLAN_LIMITS.FREE,
    },
    {
      code: 'PRO',
      name: BILLING_PLAN_DETAILS.PRO.name,
      active: true,
      visible: true,
      default: false,
      sortOrder: 2,
      monthlyPrice: BILLING_PLAN_DETAILS.PRO.monthlyPrice,
      annualPrice: BILLING_PLAN_DETAILS.PRO.annualPrice,
      trialDays: 3,
      description: BILLING_PLAN_DETAILS.PRO.description,
      features: BILLING_PLAN_DETAILS.PRO.features,
      trustBadges: BILLING_PLAN_DETAILS.PRO.trustBadges,
      limits: PLAN_LIMITS.PRO,
    },
    {
      code: 'PREMIUM',
      name: BILLING_PLAN_DETAILS.PREMIUM.name,
      active: true,
      visible: true,
      default: false,
      sortOrder: 3,
      monthlyPrice: BILLING_PLAN_DETAILS.PREMIUM.monthlyPrice,
      annualPrice: BILLING_PLAN_DETAILS.PREMIUM.annualPrice,
      trialDays: 0,
      description: BILLING_PLAN_DETAILS.PREMIUM.description,
      features: BILLING_PLAN_DETAILS.PREMIUM.features,
      trustBadges: BILLING_PLAN_DETAILS.PREMIUM.trustBadges,
      limits: PLAN_LIMITS.PREMIUM,
    },
  ];
}

function sanitizeStringList(value: unknown) {
  if (!Array.isArray(value)) return [] as string[];
  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean);
}

function sanitizePlanCode(value: unknown): EditablePlanCode {
  return value === 'PRO' || value === 'PREMIUM' ? value : 'FREE';
}

function sanitizeReportMode(value: unknown): 'basic' | 'full' {
  return value === 'full' ? 'full' : 'basic';
}

function sanitizeNullableNumber(value: unknown) {
  if (value === null) return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return null;
}

function normalizePlanConfig(value: unknown, fallback: EditablePlanConfig): EditablePlanConfig {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return fallback;
  }

  const raw = value as Record<string, unknown>;
  return {
    code: sanitizePlanCode(raw.code),
    name: typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim() : fallback.name,
    active: typeof raw.active === 'boolean' ? raw.active : fallback.active,
    visible: typeof raw.visible === 'boolean' ? raw.visible : fallback.visible,
    default: typeof raw.default === 'boolean' ? raw.default : fallback.default,
    sortOrder: typeof raw.sortOrder === 'number' && Number.isFinite(raw.sortOrder) ? raw.sortOrder : fallback.sortOrder,
    monthlyPrice: typeof raw.monthlyPrice === 'number' && Number.isFinite(raw.monthlyPrice) ? raw.monthlyPrice : fallback.monthlyPrice,
    annualPrice: typeof raw.annualPrice === 'number' && Number.isFinite(raw.annualPrice) ? raw.annualPrice : fallback.annualPrice,
    trialDays: typeof raw.trialDays === 'number' && Number.isFinite(raw.trialDays) ? raw.trialDays : fallback.trialDays,
    description:
      typeof raw.description === 'string' && raw.description.trim() ? raw.description.trim() : fallback.description,
    features: sanitizeStringList(raw.features).length ? sanitizeStringList(raw.features) : fallback.features,
    trustBadges: sanitizeStringList(raw.trustBadges).length
      ? sanitizeStringList(raw.trustBadges)
      : fallback.trustBadges,
    limits:
      raw.limits && typeof raw.limits === 'object' && !Array.isArray(raw.limits)
        ? {
            transactionsPerMonth:
              sanitizeNullableNumber((raw.limits as Record<string, unknown>).transactionsPerMonth) ??
              fallback.limits.transactionsPerMonth,
            aiInteractionsPerMonth:
              sanitizeNullableNumber((raw.limits as Record<string, unknown>).aiInteractionsPerMonth) ??
              fallback.limits.aiInteractionsPerMonth,
            reports: sanitizeReportMode((raw.limits as Record<string, unknown>).reports) || fallback.limits.reports,
          }
        : fallback.limits,
  };
}

async function readPlatformSetting<T>(key: string, fallback: T): Promise<T> {
  try {
    const setting = await prisma.platformSetting.findUnique({
      where: { key },
      select: { value: true },
    });
    return setting?.value ? (setting.value as T) : fallback;
  } catch (error) {
    if (asPrismaServiceUnavailableError(error) || isMissingPlatformSettingError(error)) {
      return fallback;
    }
    throw error;
  }
}

async function writePlatformSetting(key: string, value: Prisma.InputJsonValue) {
  await prisma.platformSetting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}

export async function getEditablePlanCatalog(): Promise<EditablePlanConfig[]> {
  const defaults = getDefaultPlanCatalog();
  const stored = await readPlatformSetting<unknown[]>(PLAN_CATALOG_KEY, defaults as unknown[]);
  if (!Array.isArray(stored)) return defaults;

  const byCode = new Map(defaults.map((plan) => [plan.code, plan]));
  const merged = stored.map((item) => {
    const code = sanitizePlanCode(item && typeof item === 'object' ? (item as Record<string, unknown>).code : null);
    return normalizePlanConfig(item, byCode.get(code) || defaults[0]);
  });

  for (const fallback of defaults) {
    if (!merged.some((item) => item.code === fallback.code)) {
      merged.push(fallback);
    }
  }

  const defaultPlan = merged.find((item) => item.default)?.code || 'FREE';
  return merged
    .map((item) => ({ ...item, default: item.code === defaultPlan }))
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function saveEditablePlanCatalog(plans: EditablePlanConfig[]) {
  const normalized = plans
    .map((plan, index) =>
      normalizePlanConfig(plan, {
        ...getDefaultPlanCatalog().find((item) => item.code === plan.code)!,
        sortOrder: index + 1,
      })
    )
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const defaultPlan = normalized.find((item) => item.default)?.code || 'FREE';
  const withSingleDefault = normalized.map((item) => ({ ...item, default: item.code === defaultPlan }));
  await writePlatformSetting(PLAN_CATALOG_KEY, withSingleDefault as unknown as Prisma.InputJsonValue);
  return withSingleDefault;
}

export async function getWorkspaceLifecycleMap(): Promise<Record<string, WorkspaceLifecycleEntry>> {
  const stored = await readPlatformSetting<Record<string, WorkspaceLifecycleEntry>>(WORKSPACE_LIFECYCLE_KEY, {});
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return {};

  return Object.entries(stored).reduce<Record<string, WorkspaceLifecycleEntry>>((acc, [workspaceId, entry]) => {
    if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
      const raw = entry as Record<string, unknown>;
      acc[workspaceId] = {
        workspaceId,
        status: raw.status === 'SUSPENDED' ? 'SUSPENDED' : 'ACTIVE',
        reason: typeof raw.reason === 'string' && raw.reason.trim() ? raw.reason.trim() : null,
        updatedAt:
          typeof raw.updatedAt === 'string' && raw.updatedAt.trim() ? raw.updatedAt.trim() : new Date().toISOString(),
      };
    }
    return acc;
  }, {});
}

export async function getWorkspaceLifecycleStatus(workspaceId: string): Promise<WorkspaceLifecycleEntry> {
  const map = await getWorkspaceLifecycleMap();
  return (
    map[workspaceId] || {
      workspaceId,
      status: 'ACTIVE',
      reason: null,
      updatedAt: new Date(0).toISOString(),
    }
  );
}

export async function setWorkspaceLifecycleStatus(params: {
  workspaceId: string;
  status: WorkspaceLifecycleStatus;
  reason?: string | null;
}) {
  const map = await getWorkspaceLifecycleMap();
  map[params.workspaceId] = {
    workspaceId: params.workspaceId,
    status: params.status,
    reason: params.reason?.trim() || null,
    updatedAt: new Date().toISOString(),
  };
  await writePlatformSetting(WORKSPACE_LIFECYCLE_KEY, map as unknown as Prisma.InputJsonValue);
  return map[params.workspaceId];
}
