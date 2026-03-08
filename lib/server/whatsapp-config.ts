import 'server-only';

import { prisma } from '@/lib/prisma';
import { normalizeWhatsappPhone } from '@/lib/whatsapp';
import { logWorkspaceEventSafe } from '@/lib/server/multi-tenant';

export const DEFAULT_WHATSAPP_TEMPLATE_LANGUAGE = 'pt_BR';
const WHATSAPP_CONFIG_EVENT_TYPE = 'whatsapp.config.updated';

export type WorkspaceWhatsAppConfig = {
  connectTemplateName: string | null;
  digestTemplateName: string | null;
  templateLanguage: string;
  testPhoneNumber: string | null;
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
    updatedAt,
  };
}

export async function getWorkspaceWhatsAppConfig(workspaceId: string): Promise<WorkspaceWhatsAppConfig> {
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
    return {
      connectTemplateName: null,
      digestTemplateName: null,
      templateLanguage: DEFAULT_WHATSAPP_TEMPLATE_LANGUAGE,
      testPhoneNumber: null,
      updatedAt: null,
    };
  }

  const parsed = readConfigPayload(latestConfigEvent.payload);
  return {
    ...parsed,
    updatedAt: parsed.updatedAt ?? latestConfigEvent.created_at.toISOString(),
  };
}

export async function saveWorkspaceWhatsAppConfig(params: {
  workspaceId: string;
  userId: string;
  connectTemplateName?: string | null;
  digestTemplateName?: string | null;
  templateLanguage?: string | null;
  testPhoneNumber?: string | null;
}) {
  const normalizedConfig: WorkspaceWhatsAppConfig = {
    connectTemplateName: normalizeTemplateName(params.connectTemplateName),
    digestTemplateName: normalizeTemplateName(params.digestTemplateName),
    templateLanguage: normalizeTemplateLanguage(params.templateLanguage),
    testPhoneNumber: normalizeTestPhoneNumber(params.testPhoneNumber),
    updatedAt: new Date().toISOString(),
  };

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
      },
    },
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
