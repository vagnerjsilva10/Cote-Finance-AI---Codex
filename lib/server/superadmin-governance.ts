import 'server-only';

import { Prisma } from '@prisma/client';

import { BILLING_PLAN_DETAILS } from '@/lib/billing/plans';
import { PLAN_LIMITS, type WorkspacePlan } from '@/lib/billing/limits';
import { asPrismaServiceUnavailableError, prisma } from '@/lib/prisma';

const PLAN_CATALOG_KEY = 'superadmin.plan-catalog';
const WORKSPACE_LIFECYCLE_KEY = 'superadmin.workspace-lifecycle';
const USER_LIFECYCLE_KEY = 'superadmin.user-lifecycle';
const SUBSCRIPTION_METADATA_KEY = 'superadmin.subscription-metadata';
const AI_USAGE_OVERRIDES_KEY = 'superadmin.ai-usage-overrides';
const TRANSACTION_USAGE_OVERRIDES_KEY = 'superadmin.transaction-usage-overrides';
const FEATURE_FLAGS_KEY = 'superadmin.feature-flags';
const PLATFORM_SETTING_CACHE_TTL_MS = 15_000;

const platformSettingCache = new Map<
  string,
  {
    expiresAt: number;
    value: unknown;
  }
>();

export type EditablePlanCode = WorkspacePlan;
export type WorkspaceLifecycleStatus = 'ACTIVE' | 'SUSPENDED';
export type UserLifecycleStatus = 'ACTIVE' | 'SUSPENDED' | 'BLOCKED';
export type FeatureFlagCode =
  | 'advanced_ai_insights'
  | 'whatsapp_automation'
  | 'pix_checkout'
  | 'meta_tracking'
  | 'beta_superadmin_modules';

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

export type UserLifecycleEntry = {
  userId: string;
  status: UserLifecycleStatus;
  reason: string | null;
  updatedAt: string;
};

export type SubscriptionAdminMetadata = {
  workspaceId: string;
  adminNote: string | null;
  updatedAt: string;
};

export type AiUsageOverrideEntry = {
  workspaceId: string;
  monthKey: string;
  offset: number;
  reason: string | null;
  updatedAt: string;
};

export type TransactionUsageOverrideEntry = {
  workspaceId: string;
  monthKey: string;
  offset: number;
  reason: string | null;
  updatedAt: string;
};

export type FeatureFlagConfig = {
  key: FeatureFlagCode;
  label: string;
  description: string;
  scope: string;
  enabled: boolean;
  allowedPlans: EditablePlanCode[];
};

export type FeatureFlagOverrideEntry = {
  enabled: boolean;
  reason: string | null;
  updatedAt: string;
};

export type FeatureFlagGovernance = {
  flags: FeatureFlagConfig[];
  workspaceOverrides: Record<string, Record<string, FeatureFlagOverrideEntry>>;
  userOverrides: Record<string, Record<string, FeatureFlagOverrideEntry>>;
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

function getDefaultFeatureFlags(): FeatureFlagConfig[] {
  return [
    {
      key: 'advanced_ai_insights',
      label: 'Insights avançados de IA',
      description: 'Libera leituras mais profundas e explicações financeiras estendidas na experiência do usuário.',
      scope: 'Produto',
      enabled: true,
      allowedPlans: ['PRO', 'PREMIUM'],
    },
    {
      key: 'whatsapp_automation',
      label: 'Automações no WhatsApp',
      description: 'Controla recursos de resumo, alerta e automação financeira enviados pelo WhatsApp.',
      scope: 'Canal',
      enabled: true,
      allowedPlans: ['PRO', 'PREMIUM'],
    },
    {
      key: 'pix_checkout',
      label: 'Checkout com Pix',
      description: 'Permite exibir e operar o fluxo de Pix no checkout do produto.',
      scope: 'Billing',
      enabled: true,
      allowedPlans: ['FREE', 'PRO', 'PREMIUM'],
    },
    {
      key: 'meta_tracking',
      label: 'Tracking e marketing',
      description: 'Ativa a camada de tracking usada para Meta Ads, UTM e eventos de conversão.',
      scope: 'Marketing',
      enabled: true,
      allowedPlans: ['FREE', 'PRO', 'PREMIUM'],
    },
    {
      key: 'beta_superadmin_modules',
      label: 'Módulos beta do Superadmin',
      description: 'Usado para liberar novas áreas administrativas antes da conclusão total do módulo.',
      scope: 'Interno',
      enabled: false,
      allowedPlans: ['FREE', 'PRO', 'PREMIUM'],
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

function sanitizeFeatureFlagCode(value: unknown): FeatureFlagCode {
  return value === 'advanced_ai_insights' ||
    value === 'whatsapp_automation' ||
    value === 'pix_checkout' ||
    value === 'meta_tracking' ||
    value === 'beta_superadmin_modules'
    ? value
    : 'advanced_ai_insights';
}

function sanitizeReportMode(value: unknown): 'basic' | 'full' {
  return value === 'full' ? 'full' : 'basic';
}

function sanitizeNullableNumber(value: unknown) {
  if (value === null) return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return null;
}

function sanitizeAllowedPlans(value: unknown, fallback: EditablePlanCode[]) {
  if (!Array.isArray(value)) return fallback;
  const plans = value
    .map((item) => sanitizePlanCode(item))
    .filter((plan, index, arr) => arr.indexOf(plan) === index);
  return plans.length > 0 ? plans : fallback;
}

function normalizeFeatureFlagConfig(value: unknown, fallback: FeatureFlagConfig): FeatureFlagConfig {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return fallback;
  }

  const raw = value as Record<string, unknown>;
  return {
    key: sanitizeFeatureFlagCode(raw.key),
    label: typeof raw.label === 'string' && raw.label.trim() ? raw.label.trim() : fallback.label,
    description:
      typeof raw.description === 'string' && raw.description.trim() ? raw.description.trim() : fallback.description,
    scope: typeof raw.scope === 'string' && raw.scope.trim() ? raw.scope.trim() : fallback.scope,
    enabled: typeof raw.enabled === 'boolean' ? raw.enabled : fallback.enabled,
    allowedPlans: sanitizeAllowedPlans(raw.allowedPlans, fallback.allowedPlans),
  };
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
  const cached = platformSettingCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return clonePlatformSettingValue((cached.value as T) ?? fallback);
  }

  try {
    const setting = await prisma.platformSetting.findUnique({
      where: { key },
      select: { value: true },
    });
    const resolvedValue = setting?.value ? (setting.value as T) : fallback;
    platformSettingCache.set(key, {
      expiresAt: Date.now() + PLATFORM_SETTING_CACHE_TTL_MS,
      value: resolvedValue,
    });
    return clonePlatformSettingValue(resolvedValue);
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
  platformSettingCache.set(key, {
    expiresAt: Date.now() + PLATFORM_SETTING_CACHE_TTL_MS,
    value,
  });
}

function clonePlatformSettingValue<T>(value: T): T {
  if (value === null || value === undefined) return value;
  try {
    return JSON.parse(JSON.stringify(value)) as T;
  } catch {
    return value;
  }
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

export async function getEditablePlanConfig(code: EditablePlanCode) {
  const plans = await getEditablePlanCatalog();
  return plans.find((plan) => plan.code === code) || getDefaultPlanCatalog().find((plan) => plan.code === code)!;
}

export async function getRuntimePlanLimits(code: EditablePlanCode) {
  const config = await getEditablePlanConfig(code);
  return config.limits;
}

export async function getRuntimeBillingTrialDays(plan: Extract<WorkspacePlan, 'PRO' | 'PREMIUM'>) {
  const config = await getEditablePlanConfig(plan);
  return config.trialDays;
}

export async function getRuntimeBillingPriceLabel(
  plan: Extract<WorkspacePlan, 'PRO' | 'PREMIUM'>,
  interval: 'MONTHLY' | 'ANNUAL'
) {
  const config = await getEditablePlanConfig(plan);
  const amount = interval === 'ANNUAL' ? config.annualPrice : config.monthlyPrice;
  return `R$ ${amount.toLocaleString('pt-BR')}/${interval === 'ANNUAL' ? 'ano' : 'mês'}`;
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

export async function getUserLifecycleMap(): Promise<Record<string, UserLifecycleEntry>> {
  const stored = await readPlatformSetting<Record<string, UserLifecycleEntry>>(USER_LIFECYCLE_KEY, {});
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return {};

  return Object.entries(stored).reduce<Record<string, UserLifecycleEntry>>((acc, [userId, entry]) => {
    if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
      const raw = entry as Record<string, unknown>;
      acc[userId] = {
        userId,
        status:
          raw.status === 'BLOCKED' ? 'BLOCKED' : raw.status === 'SUSPENDED' ? 'SUSPENDED' : 'ACTIVE',
        reason: typeof raw.reason === 'string' && raw.reason.trim() ? raw.reason.trim() : null,
        updatedAt:
          typeof raw.updatedAt === 'string' && raw.updatedAt.trim() ? raw.updatedAt.trim() : new Date().toISOString(),
      };
    }
    return acc;
  }, {});
}

export async function getUserLifecycleStatus(userId: string): Promise<UserLifecycleEntry> {
  const map = await getUserLifecycleMap();
  return (
    map[userId] || {
      userId,
      status: 'ACTIVE',
      reason: null,
      updatedAt: new Date(0).toISOString(),
    }
  );
}

export async function setUserLifecycleStatus(params: {
  userId: string;
  status: UserLifecycleStatus;
  reason?: string | null;
}) {
  const map = await getUserLifecycleMap();
  map[params.userId] = {
    userId: params.userId,
    status: params.status,
    reason: params.reason?.trim() || null,
    updatedAt: new Date().toISOString(),
  };
  await writePlatformSetting(USER_LIFECYCLE_KEY, map as unknown as Prisma.InputJsonValue);
  return map[params.userId];
}

export async function getSubscriptionMetadataMap(): Promise<Record<string, SubscriptionAdminMetadata>> {
  const stored = await readPlatformSetting<Record<string, SubscriptionAdminMetadata>>(SUBSCRIPTION_METADATA_KEY, {});
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return {};

  return Object.entries(stored).reduce<Record<string, SubscriptionAdminMetadata>>((acc, [workspaceId, entry]) => {
    if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
      const raw = entry as Record<string, unknown>;
      acc[workspaceId] = {
        workspaceId,
        adminNote: typeof raw.adminNote === 'string' && raw.adminNote.trim() ? raw.adminNote.trim() : null,
        updatedAt:
          typeof raw.updatedAt === 'string' && raw.updatedAt.trim() ? raw.updatedAt.trim() : new Date().toISOString(),
      };
    }
    return acc;
  }, {});
}

export async function setSubscriptionMetadata(params: {
  workspaceId: string;
  adminNote?: string | null;
}) {
  const map = await getSubscriptionMetadataMap();
  map[params.workspaceId] = {
    workspaceId: params.workspaceId,
    adminNote: params.adminNote?.trim() || null,
    updatedAt: new Date().toISOString(),
  };
  await writePlatformSetting(SUBSCRIPTION_METADATA_KEY, map as unknown as Prisma.InputJsonValue);
  return map[params.workspaceId];
}

function getAiUsageOverrideStorageKey(workspaceId: string, monthKey: string) {
  return `${workspaceId}:${monthKey}`;
}

export function getMonthKeyFromDate(date = new Date()) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  return `${year}-${month}`;
}

export async function getAiUsageOverrideMap(): Promise<Record<string, AiUsageOverrideEntry>> {
  const stored = await readPlatformSetting<Record<string, AiUsageOverrideEntry>>(AI_USAGE_OVERRIDES_KEY, {});
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return {};

  return Object.entries(stored).reduce<Record<string, AiUsageOverrideEntry>>((acc, [key, entry]) => {
    if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
      const raw = entry as Record<string, unknown>;
      acc[key] = {
        workspaceId: typeof raw.workspaceId === 'string' ? raw.workspaceId : '',
        monthKey: typeof raw.monthKey === 'string' ? raw.monthKey : '',
        offset: typeof raw.offset === 'number' && Number.isFinite(raw.offset) ? raw.offset : 0,
        reason: typeof raw.reason === 'string' && raw.reason.trim() ? raw.reason.trim() : null,
        updatedAt:
          typeof raw.updatedAt === 'string' && raw.updatedAt.trim() ? raw.updatedAt.trim() : new Date().toISOString(),
      };
    }
    return acc;
  }, {});
}

export async function getAiUsageEffectiveOffset(workspaceId: string, monthKey = getMonthKeyFromDate()) {
  const map = await getAiUsageOverrideMap();
  return map[getAiUsageOverrideStorageKey(workspaceId, monthKey)]?.offset || 0;
}

export async function setAiUsageResetForWorkspace(params: {
  workspaceId: string;
  actualUsage: number;
  reason?: string | null;
  monthKey?: string;
}) {
  const monthKey = params.monthKey || getMonthKeyFromDate();
  const map = await getAiUsageOverrideMap();
  const key = getAiUsageOverrideStorageKey(params.workspaceId, monthKey);
  map[key] = {
    workspaceId: params.workspaceId,
    monthKey,
    offset: -Math.max(0, params.actualUsage),
    reason: params.reason?.trim() || null,
    updatedAt: new Date().toISOString(),
  };
  await writePlatformSetting(AI_USAGE_OVERRIDES_KEY, map as unknown as Prisma.InputJsonValue);
  return map[key];
}

function getTransactionUsageOverrideStorageKey(workspaceId: string, monthKey: string) {
  return `${workspaceId}:${monthKey}`;
}

export async function getTransactionUsageOverrideMap(): Promise<Record<string, TransactionUsageOverrideEntry>> {
  const stored = await readPlatformSetting<Record<string, TransactionUsageOverrideEntry>>(
    TRANSACTION_USAGE_OVERRIDES_KEY,
    {}
  );
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return {};

  return Object.entries(stored).reduce<Record<string, TransactionUsageOverrideEntry>>((acc, [key, entry]) => {
    if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
      const raw = entry as Record<string, unknown>;
      acc[key] = {
        workspaceId: typeof raw.workspaceId === 'string' ? raw.workspaceId : '',
        monthKey: typeof raw.monthKey === 'string' ? raw.monthKey : '',
        offset: typeof raw.offset === 'number' && Number.isFinite(raw.offset) ? raw.offset : 0,
        reason: typeof raw.reason === 'string' && raw.reason.trim() ? raw.reason.trim() : null,
        updatedAt:
          typeof raw.updatedAt === 'string' && raw.updatedAt.trim() ? raw.updatedAt.trim() : new Date().toISOString(),
      };
    }
    return acc;
  }, {});
}

export async function getTransactionUsageEffectiveOffset(workspaceId: string, monthKey = getMonthKeyFromDate()) {
  const map = await getTransactionUsageOverrideMap();
  return map[getTransactionUsageOverrideStorageKey(workspaceId, monthKey)]?.offset || 0;
}

export async function setTransactionUsageResetForWorkspace(params: {
  workspaceId: string;
  actualUsage: number;
  reason?: string | null;
  monthKey?: string;
}) {
  const monthKey = params.monthKey || getMonthKeyFromDate();
  const map = await getTransactionUsageOverrideMap();
  const key = getTransactionUsageOverrideStorageKey(params.workspaceId, monthKey);
  map[key] = {
    workspaceId: params.workspaceId,
    monthKey,
    offset: -Math.max(0, params.actualUsage),
    reason: params.reason?.trim() || null,
    updatedAt: new Date().toISOString(),
  };
  await writePlatformSetting(TRANSACTION_USAGE_OVERRIDES_KEY, map as unknown as Prisma.InputJsonValue);
  return map[key];
}

function normalizeFeatureFlagOverrideMap(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {} as Record<string, Record<string, FeatureFlagOverrideEntry>>;

  return Object.entries(value as Record<string, unknown>).reduce<Record<string, Record<string, FeatureFlagOverrideEntry>>>(
    (acc, [flagKey, rawEntries]) => {
      const normalizedKey = sanitizeFeatureFlagCode(flagKey);
      if (!rawEntries || typeof rawEntries !== 'object' || Array.isArray(rawEntries)) return acc;

      acc[normalizedKey] = Object.entries(rawEntries as Record<string, unknown>).reduce<Record<string, FeatureFlagOverrideEntry>>(
        (entryAcc, [entityId, rawEntry]) => {
          if (!rawEntry || typeof rawEntry !== 'object' || Array.isArray(rawEntry)) return entryAcc;
          const record = rawEntry as Record<string, unknown>;
          entryAcc[entityId] = {
            enabled: typeof record.enabled === 'boolean' ? record.enabled : true,
            reason: typeof record.reason === 'string' && record.reason.trim() ? record.reason.trim() : null,
            updatedAt:
              typeof record.updatedAt === 'string' && record.updatedAt.trim()
                ? record.updatedAt.trim()
                : new Date().toISOString(),
          };
          return entryAcc;
        },
        {}
      );

      return acc;
    },
    {}
  );
}

export async function getFeatureFlagGovernance(): Promise<FeatureFlagGovernance> {
  const defaults = getDefaultFeatureFlags();
  const stored = await readPlatformSetting<unknown>(FEATURE_FLAGS_KEY, null);

  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) {
    return {
      flags: defaults,
      workspaceOverrides: {},
      userOverrides: {},
    };
  }

  const raw = stored as Record<string, unknown>;
  const storedFlags = Array.isArray(raw.flags) ? raw.flags : [];
  const byKey = new Map(defaults.map((flag) => [flag.key, flag]));
  const flags = defaults.map((fallback) => {
    const saved = storedFlags.find(
      (item) => item && typeof item === 'object' && (item as Record<string, unknown>).key === fallback.key
    );
    return normalizeFeatureFlagConfig(saved, byKey.get(fallback.key) || fallback);
  });

  return {
    flags,
    workspaceOverrides: normalizeFeatureFlagOverrideMap(raw.workspaceOverrides),
    userOverrides: normalizeFeatureFlagOverrideMap(raw.userOverrides),
  };
}

export async function saveFeatureFlagGovernance(config: FeatureFlagGovernance) {
  const defaults = getDefaultFeatureFlags();
  const byKey = new Map(defaults.map((flag) => [flag.key, flag]));
  const flags = defaults.map((fallback) => {
    const incoming = config.flags.find((item) => item.key === fallback.key);
    return normalizeFeatureFlagConfig(incoming, byKey.get(fallback.key) || fallback);
  });

  const payload = {
    flags,
    workspaceOverrides: config.workspaceOverrides,
    userOverrides: config.userOverrides,
  } as unknown as Prisma.InputJsonValue;

  await writePlatformSetting(FEATURE_FLAGS_KEY, payload);
  return {
    flags,
    workspaceOverrides: config.workspaceOverrides,
    userOverrides: config.userOverrides,
  };
}

export async function setFeatureFlagWorkspaceOverride(params: {
  flagKey: FeatureFlagCode;
  workspaceId: string;
  enabled: boolean;
  reason?: string | null;
}) {
  const governance = await getFeatureFlagGovernance();
  const current = governance.workspaceOverrides[params.flagKey] || {};
  governance.workspaceOverrides[params.flagKey] = {
    ...current,
    [params.workspaceId]: {
      enabled: params.enabled,
      reason: params.reason?.trim() || null,
      updatedAt: new Date().toISOString(),
    },
  };
  return saveFeatureFlagGovernance(governance);
}

export async function removeFeatureFlagWorkspaceOverride(params: { flagKey: FeatureFlagCode; workspaceId: string }) {
  const governance = await getFeatureFlagGovernance();
  const current = { ...(governance.workspaceOverrides[params.flagKey] || {}) };
  delete current[params.workspaceId];
  governance.workspaceOverrides[params.flagKey] = current;
  return saveFeatureFlagGovernance(governance);
}

export async function setFeatureFlagUserOverride(params: {
  flagKey: FeatureFlagCode;
  userId: string;
  enabled: boolean;
  reason?: string | null;
}) {
  const governance = await getFeatureFlagGovernance();
  const current = governance.userOverrides[params.flagKey] || {};
  governance.userOverrides[params.flagKey] = {
    ...current,
    [params.userId]: {
      enabled: params.enabled,
      reason: params.reason?.trim() || null,
      updatedAt: new Date().toISOString(),
    },
  };
  return saveFeatureFlagGovernance(governance);
}

export async function removeFeatureFlagUserOverride(params: { flagKey: FeatureFlagCode; userId: string }) {
  const governance = await getFeatureFlagGovernance();
  const current = { ...(governance.userOverrides[params.flagKey] || {}) };
  delete current[params.userId];
  governance.userOverrides[params.flagKey] = current;
  return saveFeatureFlagGovernance(governance);
}

export async function resolveFeatureFlagState(params: {
  key: FeatureFlagCode;
  plan?: EditablePlanCode;
  workspaceId?: string | null;
  userId?: string | null;
}) {
  const governance = await getFeatureFlagGovernance();
  const flag = governance.flags.find((item) => item.key === params.key) || getDefaultFeatureFlags()[0];

  if (params.userId) {
    const userOverride = governance.userOverrides[params.key]?.[params.userId];
    if (userOverride) {
      return {
        enabled: userOverride.enabled,
        source: 'user' as const,
        reason: userOverride.reason,
        flag,
      };
    }
  }

  if (params.workspaceId) {
    const workspaceOverride = governance.workspaceOverrides[params.key]?.[params.workspaceId];
    if (workspaceOverride) {
      return {
        enabled: workspaceOverride.enabled,
        source: 'workspace' as const,
        reason: workspaceOverride.reason,
        flag,
      };
    }
  }

  if (params.plan && !flag.allowedPlans.includes(params.plan)) {
    return {
      enabled: false,
      source: 'plan' as const,
      reason: null,
      flag,
    };
  }

  return {
    enabled: flag.enabled,
    source: 'global' as const,
    reason: null,
    flag,
  };
}
