import 'server-only';

import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { normalizeWhatsappPhone, WHATSAPP_TEMPLATES } from '@/lib/whatsapp';
import { logWorkspaceEventSafe } from '@/lib/server/multi-tenant';

export const DEFAULT_WHATSAPP_TEMPLATE_LANGUAGE = WHATSAPP_TEMPLATES.CONNECT.language;
const WHATSAPP_CONFIG_EVENT_TYPE = 'whatsapp.config.updated';
const WHATSAPP_CONFIG_KEY_PREFIX = 'workspace.whatsapp-config.';
const WHATSAPP_CONFIG_CACHE_TTL_MS = 15_000;

type WorkspaceWhatsAppConfigCacheEntry = {
  expiresAt: number;
  value: WorkspaceWhatsAppConfig;
};

const workspaceWhatsAppConfigCache = new Map<string, WorkspaceWhatsAppConfigCacheEntry>();

type PendingWhatsAppDelivery = {
  messageId: string | null;
  phoneNumber: string;
  templateName: string | null;
  languageCode: string | null;
  deliveryMode: 'template' | 'text';
  requestedAt: string;
};

export type WorkspaceWhatsAppConfig = {
  connectTemplateName: string | null;
  digestTemplateName: string | null;
  templateLanguage: string;
  testPhoneNumber: string | null;
  lastConnectionState:
    | 'idle'
    | 'connecting'
    | 'connected'
    | 'disconnected'
    | 'failed'
    | 'error'
    | 'testing'
    | 'config_pending';
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
  pendingConnection: {
    messageId: string | null;
    phoneNumber: string;
    templateName: string | null;
    languageCode: string | null;
    deliveryMode: 'template' | 'text';
    requestedAt: string;
  } | null;
  pendingTest: {
    messageId: string | null;
    phoneNumber: string;
    templateName: string | null;
    languageCode: string | null;
    deliveryMode: 'template' | 'text';
    requestedAt: string;
  } | null;
  updatedAt: string | null;
};

export type ResolvedWorkspaceWhatsAppConfig = WorkspaceWhatsAppConfig & {
  connectTemplateNameSource: 'system';
  digestTemplateNameSource: 'system';
  templateLanguageSource: 'system';
  testPhoneNumberSource: 'workspace' | 'connected_phone' | 'unset';
};

function isMissingPlatformSettingError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === 'P2021' || error.code === 'P2022';
  }

  const message = error instanceof Error ? error.message : String(error || '');
  return /PlatformSetting|does not exist|relation .* does not exist|table .* doesn't exist|column .* does not exist/i.test(message);
}

function cleanValue(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeTemplateName(value: unknown) {
  const normalized = cleanValue(value);
  return normalized || null;
}

function normalizeTestPhoneNumber(value: unknown) {
  const normalized = normalizeWhatsappPhone(cleanValue(value));
  return normalized || null;
}

function normalizeConnectionState(value: unknown): WorkspaceWhatsAppConfig['lastConnectionState'] {
  const normalized = cleanValue(value).toLowerCase();
  if (normalized === 'connected') return 'connected';
  if (normalized === 'disconnected' || normalized === 'config_pending') return 'disconnected';
  if (normalized === 'failed' || normalized === 'error') return 'failed';
  if (normalized === 'connecting' || normalized === 'testing') return 'connecting';
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

function normalizePendingDelivery(value: unknown): PendingWhatsAppDelivery | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const source = value as Record<string, unknown>;
  const messageIdRaw = cleanValue(source.messageId);
  const phoneNumber = normalizeWhatsappPhone(cleanValue(source.phoneNumber));
  const templateName = normalizeTemplateName(source.templateName);
  const languageCode = normalizeTemplateName(source.languageCode);
  const requestedAt = cleanValue(source.requestedAt);
  const deliveryMode = cleanValue(source.deliveryMode).toLowerCase();

  if (!phoneNumber || !requestedAt || (deliveryMode !== 'template' && deliveryMode !== 'text')) {
    return null;
  }

  return {
    messageId: messageIdRaw || null,
    phoneNumber,
    templateName,
    languageCode,
    deliveryMode: deliveryMode as 'template' | 'text',
    requestedAt,
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
    connectTemplateName: WHATSAPP_TEMPLATES.CONNECT.name,
    digestTemplateName: WHATSAPP_TEMPLATES.DIGEST.name,
    templateLanguage: WHATSAPP_TEMPLATES.CONNECT.language,
    testPhoneNumber: sourceRecord ? normalizeTestPhoneNumber(sourceRecord.testPhoneNumber) : null,
    lastConnectionState: sourceRecord ? normalizeConnectionState(sourceRecord.lastConnectionState) : 'idle',
    lastErrorMessage: sourceRecord ? normalizeTemplateName(sourceRecord.lastErrorMessage) : null,
    lastErrorCategory: sourceRecord ? normalizeTemplateName(sourceRecord.lastErrorCategory) : null,
    lastValidatedAt:
      sourceRecord && typeof sourceRecord.lastValidatedAt === 'string' ? sourceRecord.lastValidatedAt : null,
    lastTestSentAt:
      sourceRecord && typeof sourceRecord.lastTestSentAt === 'string' ? sourceRecord.lastTestSentAt : null,
    pendingConfirmation: sourceRecord ? normalizePendingConfirmation(sourceRecord.pendingConfirmation) : null,
    pendingConnection: sourceRecord ? normalizePendingDelivery(sourceRecord.pendingConnection) : null,
    pendingTest: sourceRecord ? normalizePendingDelivery(sourceRecord.pendingTest) : null,
    updatedAt,
  };
}

function cloneWorkspaceWhatsAppConfig(config: WorkspaceWhatsAppConfig): WorkspaceWhatsAppConfig {
  return {
    ...config,
    pendingConfirmation: config.pendingConfirmation ? { ...config.pendingConfirmation } : null,
    pendingConnection: config.pendingConnection ? { ...config.pendingConnection } : null,
    pendingTest: config.pendingTest ? { ...config.pendingTest } : null,
  };
}

export async function getWorkspaceWhatsAppConfig(workspaceId: string): Promise<WorkspaceWhatsAppConfig> {
  const cached = workspaceWhatsAppConfigCache.get(workspaceId);
  if (cached && cached.expiresAt > Date.now()) {
    return cloneWorkspaceWhatsAppConfig(cached.value);
  }

  const settingKey = `${WHATSAPP_CONFIG_KEY_PREFIX}${workspaceId}`;
  let configSetting: { value: unknown; updated_at: Date } | null = null;
  try {
    configSetting = await prisma.platformSetting.findUnique({
      where: { key: settingKey },
      select: {
        value: true,
        updated_at: true,
      },
    });
  } catch (error) {
    if (!isMissingPlatformSettingError(error)) {
      throw error;
    }
  }

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
      connectTemplateName: WHATSAPP_TEMPLATES.CONNECT.name,
      digestTemplateName: WHATSAPP_TEMPLATES.DIGEST.name,
      templateLanguage: WHATSAPP_TEMPLATES.CONNECT.language,
      testPhoneNumber: null,
      lastConnectionState: 'idle',
      lastErrorMessage: null,
      lastErrorCategory: null,
      lastValidatedAt: null,
      lastTestSentAt: null,
      pendingConfirmation: null,
      pendingConnection: null,
      pendingTest: null,
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
  userId?: string | null;
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
  pendingConnection?: WorkspaceWhatsAppConfig['pendingConnection'] | null;
  pendingTest?: WorkspaceWhatsAppConfig['pendingTest'] | null;
}) {
  const currentConfig = await getWorkspaceWhatsAppConfig(params.workspaceId);
  const normalizedConfig: WorkspaceWhatsAppConfig = {
    // Templates e idioma são controlados internamente pelo sistema (SaaS).
    connectTemplateName: WHATSAPP_TEMPLATES.CONNECT.name,
    digestTemplateName: WHATSAPP_TEMPLATES.DIGEST.name,
    templateLanguage: WHATSAPP_TEMPLATES.CONNECT.language,
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
    pendingConnection:
      typeof params.pendingConnection === 'undefined' ? currentConfig.pendingConnection : params.pendingConnection,
    pendingTest: typeof params.pendingTest === 'undefined' ? currentConfig.pendingTest : params.pendingTest,
    updatedAt: new Date().toISOString(),
  };

  try {
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
  } catch (error) {
    if (!isMissingPlatformSettingError(error)) {
      throw error;
    }
  }

  await logWorkspaceEventSafe({
    workspaceId: params.workspaceId,
    userId: params.userId ?? null,
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
        pendingConnection: normalizedConfig.pendingConnection,
        pendingTest: normalizedConfig.pendingTest,
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
  const connectedPhoneNumber = normalizeTestPhoneNumber(params.connectedPhoneNumber);

  const connectTemplateName = WHATSAPP_TEMPLATES.CONNECT.name;
  const digestTemplateName = WHATSAPP_TEMPLATES.DIGEST.name;
  const templateLanguage = WHATSAPP_TEMPLATES.CONNECT.language;
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
    pendingConnection: params.workspaceConfig.pendingConnection,
    pendingTest: params.workspaceConfig.pendingTest,
    updatedAt: params.workspaceConfig.updatedAt,
    connectTemplateNameSource: 'system',
    digestTemplateNameSource: 'system',
    templateLanguageSource: 'system',
    testPhoneNumberSource: params.workspaceConfig.testPhoneNumber
      ? 'workspace'
      : connectedPhoneNumber
      ? 'connected_phone'
      : 'unset',
  };
}
