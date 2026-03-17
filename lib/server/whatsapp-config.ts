import 'server-only';

import { prisma } from '@/lib/prisma';
import { normalizeWhatsappPhone } from '@/lib/whatsapp';
import { logWorkspaceEventSafe } from '@/lib/server/multi-tenant';

export const DEFAULT_WHATSAPP_TEMPLATE_LANGUAGE = 'pt_BR';
const WHATSAPP_CONFIG_EVENT_TYPE = 'whatsapp.config.updated';
const WHATSAPP_CONFIG_KEY_PREFIX = 'workspace.whatsapp-config.';
const WHATSAPP_CONFIG_CACHE_TTL_MS = 15_000;

type WorkspaceWhatsAppConfigCacheEntry = {
  expiresAt: number;
  value: WorkspaceWhatsAppConfig;
};

const workspaceWhatsAppConfigCache = new Map<string, WorkspaceWhatsAppConfigCacheEntry>();

export type WorkspaceWhatsAppConfig = {
  connectTemplateName: string | null;
  digestTemplateName: string | null;
  templateLanguage: string;
  testPhoneNumber: string | null;
  lastConnectionState: 'idle' | 'connected' | 'disconnected' | 'error' | 'testing' | 'config_pending';
  lastErrorMessage: string | null;
  lastErrorCategory: string | null;
  lastValidatedAt: string | null;
  lastTestSentAt: string | null;
  pendingConfirmation: {
    action: 'undo_last_transaction' | 'remove_recent_transaction';
    transactionId: string;
    description: string;
    amount: number;
    requestedAt: string;
    expiresAt: string;
  } | null;
  updatedAt: string | null;
};

export type ResolvedWorkspaceWhatsAppConfig = WorkspaceWhatsAppConfig & {
  connectTemplateNameSource: 'workspace' | 'env' | 'unset';
  digestTemplateNameSource: 'workspace' | 'env' | 'unset';
  templateLanguageSource: 'workspace' | 'env' | 'fallback';
  testPhoneNumberSource: 'workspace' | 'connected_phone' | 'unset';
};

function cleanValue(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeTemplateName(value: unknown) {
  const normalized = cleanValue(value);
  return normalized || null;
}

function normalizeTemplateLanguage(value: unknown) {
  const normalized = cleanValue(value);
  return normalized || DEFAULT_WHATSAPP_TEMPLATE_LANGUAGE;
}

function normalizeTestPhoneNumber(value: unknown) {
  const normalized = normalizeWhatsappPhone(cleanValue(value));
  return normalized || null;
}

function normalizeConnectionState(value: unknown): WorkspaceWhatsAppConfig['lastConnectionState'] {
  const normalized = cleanValue(value).toLowerCase();
  if (
    normalized === 'connected' ||
    normalized === 'disconnected' ||
    normalized === 'error' ||
    normalized === 'testing' ||
    normalized === 'config_pending'
  ) {
    return normalized;
  }
  return 'idle';
}

function normalizePendingConfirmation(
  value: unknown
): WorkspaceWhatsAppConfig['pendingConfirmation'] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const source = value as Record<string, unknown>;
  const action = cleanValue(source.action);
  const transactionId = cleanValue(source.transactionId);
  const description = cleanValue(source.description);
  const requestedAt = cleanValue(source.requestedAt);
  const expiresAt = cleanValue(source.expiresAt);
  const amount =
    typeof source.amount === 'number'
      ? source.amount
      : typeof source.amount === 'string'
        ? Number(source.amount)
        : NaN;

  if (
    (action !== 'undo_last_transaction' && action !== 'remove_recent_transaction') ||
    !transactionId ||
    !description ||
    !requestedAt ||
    !expiresAt ||
    !Number.isFinite(amount)
  ) {
    return null;
  }

  return {
    action,
    transactionId,
    description,
    amount,
    requestedAt,
    expiresAt,
  };
}

function readConfigPayload(payload: unknown): WorkspaceWhatsAppConfig {
  const source =
    payload &&
    typeof payload === 'object' &&
    'config' in payload &&
    payload.config &&
    typeof payload.config === 'object'
      ? payload.config
      : payload;
  const sourceRecord = source && typeof source === 'object' ? (source as Record<string, unknown>) : null;

  const updatedAt =
    payload && typeof payload === 'object' && 'updatedAt' in payload && typeof payload.updatedAt === 'string'
      ? payload.updatedAt
      : null;

  return {
    connectTemplateName: sourceRecord ? normalizeTemplateName(sourceRecord.connectTemplateName) : null,
    digestTemplateName: sourceRecord ? normalizeTemplateName(sourceRecord.digestTemplateName) : null,
    templateLanguage: sourceRecord
      ? normalizeTemplateLanguage(sourceRecord.templateLanguage)
      : DEFAULT_WHATSAPP_TEMPLATE_LANGUAGE,
    testPhoneNumber: sourceRecord ? normalizeTestPhoneNumber(sourceRecord.testPhoneNumber) : null,
    lastConnectionState: sourceRecord ? normalizeConnectionState(sourceRecord.lastConnectionState) : 'idle',
    lastErrorMessage: sourceRecord ? normalizeTemplateName(sourceRecord.lastErrorMessage) : null,
    lastErrorCategory: sourceRecord ? normalizeTemplateName(sourceRecord.lastErrorCategory) : null,
    lastValidatedAt:
      sourceRecord && typeof sourceRecord.lastValidatedAt === 'string' ? sourceRecord.lastValidatedAt : null,
    lastTestSentAt:
      sourceRecord && typeof sourceRecord.lastTestSentAt === 'string' ? sourceRecord.lastTestSentAt : null,
    pendingConfirmation: sourceRecord ? normalizePendingConfirmation(sourceRecord.pendingConfirmation) : null,
    updatedAt,
  };
}

function cloneWorkspaceWhatsAppConfig(config: WorkspaceWhatsAppConfig): WorkspaceWhatsAppConfig {
  return {
    ...config,
    pendingConfirmation: config.pendingConfirmation ? { ...config.pendingConfirmation } : null,
  };
}

export async function getWorkspaceWhatsAppConfig(workspaceId: string): Promise<WorkspaceWhatsAppConfig> {
  const cached = workspaceWhatsAppConfigCache.get(workspaceId);
  if (cached && cached.expiresAt > Date.now()) {
    return cloneWorkspaceWhatsAppConfig(cached.value);
  }

  const settingKey = `${WHATSAPP_CONFIG_KEY_PREFIX}${workspaceId}`;
  const configSetting = await prisma.platformSetting.findUnique({
    where: { key: settingKey },
    select: {
      value: true,
      updated_at: true,
    },
  });

  if (configSetting) {
    const parsed = readConfigPayload(configSetting.value);
    const resolved = {
      ...parsed,
      updatedAt: parsed.updatedAt ?? configSetting.updated_at.toISOString(),
    };
    workspaceWhatsAppConfigCache.set(workspaceId, {
      expiresAt: Date.now() + WHATSAPP_CONFIG_CACHE_TTL_MS,
      value: resolved,
    });
    return cloneWorkspaceWhatsAppConfig(resolved);
  }

  const latestConfigEvent = await prisma.workspaceEvent.findFirst({
    where: {
      workspace_id: workspaceId,
      type: WHATSAPP_CONFIG_EVENT_TYPE,
    },
    orderBy: {
      created_at: 'desc',
    },
    select: {
      payload: true,
      created_at: true,
    },
  });

  if (!latestConfigEvent) {
    const resolved: WorkspaceWhatsAppConfig = {
      connectTemplateName: null,
      digestTemplateName: null,
      templateLanguage: DEFAULT_WHATSAPP_TEMPLATE_LANGUAGE,
      testPhoneNumber: null,
      lastConnectionState: 'idle',
      lastErrorMessage: null,
      lastErrorCategory: null,
      lastValidatedAt: null,
      lastTestSentAt: null,
      pendingConfirmation: null,
      updatedAt: null,
    };
    workspaceWhatsAppConfigCache.set(workspaceId, {
      expiresAt: Date.now() + WHATSAPP_CONFIG_CACHE_TTL_MS,
      value: resolved,
    });
    return cloneWorkspaceWhatsAppConfig(resolved);
  }

  const parsed = readConfigPayload(latestConfigEvent.payload);
  const resolved = {
    ...parsed,
    updatedAt: parsed.updatedAt ?? latestConfigEvent.created_at.toISOString(),
  };
  workspaceWhatsAppConfigCache.set(workspaceId, {
    expiresAt: Date.now() + WHATSAPP_CONFIG_CACHE_TTL_MS,
    value: resolved,
  });
  return cloneWorkspaceWhatsAppConfig(resolved);
}

export async function saveWorkspaceWhatsAppConfig(params: {
  workspaceId: string;
  userId: string;
  connectTemplateName?: string | null;
  digestTemplateName?: string | null;
  templateLanguage?: string | null;
  testPhoneNumber?: string | null;
  lastConnectionState?: WorkspaceWhatsAppConfig['lastConnectionState'];
  lastErrorMessage?: string | null;
  lastErrorCategory?: string | null;
  lastValidatedAt?: string | null;
  lastTestSentAt?: string | null;
  pendingConfirmation?: WorkspaceWhatsAppConfig['pendingConfirmation'] | null;
}) {
  const currentConfig = await getWorkspaceWhatsAppConfig(params.workspaceId);
  const normalizedConfig: WorkspaceWhatsAppConfig = {
    connectTemplateName:
      typeof params.connectTemplateName === 'undefined'
        ? currentConfig.connectTemplateName
        : normalizeTemplateName(params.connectTemplateName),
    digestTemplateName:
      typeof params.digestTemplateName === 'undefined'
        ? currentConfig.digestTemplateName
        : normalizeTemplateName(params.digestTemplateName),
    templateLanguage:
      typeof params.templateLanguage === 'undefined'
        ? currentConfig.templateLanguage
        : normalizeTemplateLanguage(params.templateLanguage),
    testPhoneNumber:
      typeof params.testPhoneNumber === 'undefined'
        ? currentConfig.testPhoneNumber
        : normalizeTestPhoneNumber(params.testPhoneNumber),
    lastConnectionState: params.lastConnectionState ?? currentConfig.lastConnectionState,
    lastErrorMessage:
      typeof params.lastErrorMessage === 'undefined'
        ? currentConfig.lastErrorMessage
        : normalizeTemplateName(params.lastErrorMessage),
    lastErrorCategory:
      typeof params.lastErrorCategory === 'undefined'
        ? currentConfig.lastErrorCategory
        : normalizeTemplateName(params.lastErrorCategory),
    lastValidatedAt:
      typeof params.lastValidatedAt === 'undefined' ? currentConfig.lastValidatedAt : params.lastValidatedAt,
    lastTestSentAt:
      typeof params.lastTestSentAt === 'undefined' ? currentConfig.lastTestSentAt : params.lastTestSentAt,
    pendingConfirmation:
      typeof params.pendingConfirmation === 'undefined'
        ? currentConfig.pendingConfirmation
        : params.pendingConfirmation,
    updatedAt: new Date().toISOString(),
  };

  await prisma.platformSetting.upsert({
    where: {
      key: `${WHATSAPP_CONFIG_KEY_PREFIX}${params.workspaceId}`,
    },
    update: {
      value: {
        version: 2,
        updatedAt: normalizedConfig.updatedAt,
        config: normalizedConfig,
      },
    },
    create: {
      key: `${WHATSAPP_CONFIG_KEY_PREFIX}${params.workspaceId}`,
      value: {
        version: 2,
        updatedAt: normalizedConfig.updatedAt,
        config: normalizedConfig,
      },
    },
  });

  await logWorkspaceEventSafe({
    workspaceId: params.workspaceId,
    userId: params.userId,
    type: WHATSAPP_CONFIG_EVENT_TYPE,
    payload: {
      version: 1,
      updatedAt: normalizedConfig.updatedAt,
      config: {
        connectTemplateName: normalizedConfig.connectTemplateName,
        digestTemplateName: normalizedConfig.digestTemplateName,
        templateLanguage: normalizedConfig.templateLanguage,
        testPhoneNumber: normalizedConfig.testPhoneNumber,
        lastConnectionState: normalizedConfig.lastConnectionState,
        lastErrorMessage: normalizedConfig.lastErrorMessage,
        lastErrorCategory: normalizedConfig.lastErrorCategory,
        lastValidatedAt: normalizedConfig.lastValidatedAt,
        lastTestSentAt: normalizedConfig.lastTestSentAt,
        pendingConfirmation: normalizedConfig.pendingConfirmation,
      },
    },
  });

  workspaceWhatsAppConfigCache.set(params.workspaceId, {
    expiresAt: Date.now() + WHATSAPP_CONFIG_CACHE_TTL_MS,
    value: normalizedConfig,
  });

  return normalizedConfig;
}

export function resolveWorkspaceWhatsAppConfig(params: {
  workspaceConfig: WorkspaceWhatsAppConfig;
  connectedPhoneNumber?: string | null;
}): ResolvedWorkspaceWhatsAppConfig {
  const workspaceTemplateLanguageRaw = cleanValue(params.workspaceConfig.templateLanguage);
  const envConnectTemplateName = normalizeTemplateName(process.env.WHATSAPP_TEMPLATE_CONNECT_NAME);
  const envDigestTemplateName = normalizeTemplateName(process.env.WHATSAPP_TEMPLATE_DIGEST_NAME);
  const envTemplateLanguageRaw = cleanValue(process.env.WHATSAPP_TEMPLATE_LANGUAGE);
  const envTemplateLanguage = envTemplateLanguageRaw
    ? normalizeTemplateLanguage(envTemplateLanguageRaw)
    : DEFAULT_WHATSAPP_TEMPLATE_LANGUAGE;
  const connectedPhoneNumber = normalizeTestPhoneNumber(params.connectedPhoneNumber);

  const connectTemplateName = params.workspaceConfig.connectTemplateName || envConnectTemplateName;
  const digestTemplateName = params.workspaceConfig.digestTemplateName || envDigestTemplateName;
  const templateLanguage =
    (workspaceTemplateLanguageRaw ? normalizeTemplateLanguage(workspaceTemplateLanguageRaw) : null) ||
    envTemplateLanguage ||
    DEFAULT_WHATSAPP_TEMPLATE_LANGUAGE;
  const testPhoneNumber = params.workspaceConfig.testPhoneNumber || connectedPhoneNumber;

  return {
    connectTemplateName,
    digestTemplateName,
    templateLanguage,
    testPhoneNumber,
    lastConnectionState: params.workspaceConfig.lastConnectionState,
    lastErrorMessage: params.workspaceConfig.lastErrorMessage,
    lastErrorCategory: params.workspaceConfig.lastErrorCategory,
    lastValidatedAt: params.workspaceConfig.lastValidatedAt,
    lastTestSentAt: params.workspaceConfig.lastTestSentAt,
    pendingConfirmation: params.workspaceConfig.pendingConfirmation,
    updatedAt: params.workspaceConfig.updatedAt,
    connectTemplateNameSource: params.workspaceConfig.connectTemplateName
      ? 'workspace'
      : envConnectTemplateName
      ? 'env'
      : 'unset',
    digestTemplateNameSource: params.workspaceConfig.digestTemplateName
      ? 'workspace'
      : envDigestTemplateName
      ? 'env'
      : 'unset',
    templateLanguageSource: workspaceTemplateLanguageRaw
      ? 'workspace'
      : envTemplateLanguageRaw
      ? 'env'
      : 'fallback',
    testPhoneNumberSource: params.workspaceConfig.testPhoneNumber
      ? 'workspace'
      : connectedPhoneNumber
      ? 'connected_phone'
      : 'unset',
  };
}
