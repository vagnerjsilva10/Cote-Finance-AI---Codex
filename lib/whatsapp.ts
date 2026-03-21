import 'server-only';
import crypto from 'crypto';

const DEFAULT_WHATSAPP_API_VERSION = 'v21.0';

export const WHATSAPP_CONFIG_MISSING_ERROR =
  'WhatsApp não configurado. Defina WHATSAPP_ACCESS_TOKEN e WHATSAPP_PHONE_NUMBER_ID.';
export const WHATSAPP_VERIFY_TOKEN_MISSING_ERROR =
  'WhatsApp não configurado. Defina WHATSAPP_VERIFY_TOKEN.';
export const WHATSAPP_TEST_NUMBER_BLOCKED_ERROR =
  'WhatsApp configurado com o Test Number da Meta. Substitua WHATSAPP_PHONE_NUMBER_ID pelo phone_number_id do numero comercial real.';
export const WHATSAPP_EXPECTED_DISPLAY_PHONE_MISSING_ERROR =
  'WhatsApp nao configurado para producao. Defina WHATSAPP_EXPECTED_DISPLAY_PHONE_NUMBER com o numero comercial.';

export const WHATSAPP_TEMPLATES = {
  CONNECT: {
    name: 'cote_connect_success',
    language: 'pt_BR',
  },
  DIGEST: {
    name: 'cote_daily_digest',
    language: 'pt_BR',
  },
} as const;

export type WhatsAppTemplateKey = keyof typeof WHATSAPP_TEMPLATES;

type WhatsAppConfig = {
  accessToken: string;
  phoneNumberId: string;
  businessAccountId?: string;
  verifyToken: string;
  apiVersion: string;
  appSecret?: string;
  expectedDisplayPhoneNumber?: string;
  expectedVerifiedName?: string;
  allowTestNumber: boolean;
};

type ParsedWhatsAppError = {
  message: string;
  code?: number;
  errorSubcode?: number;
  type?: string;
  fbtraceId?: string;
  rawBody?: unknown;
};

export type WhatsAppRequestContext = {
  source: 'template' | 'text';
  destination: string;
  templateName?: string | null;
  languageCode?: string | null;
};

export type WhatsAppConnectionHealth = {
  displayPhoneNumber: string | null;
  verifiedName: string | null;
  qualityRating: string | null;
};

type WhatsAppSenderIdentity = {
  phoneNumberId: string;
  displayPhoneNumber: string | null;
  verifiedName: string | null;
  qualityRating: string | null;
  codeVerificationStatus: string | null;
  nameStatus: string | null;
  status: string | null;
};

type WhatsAppSenderIdentityCacheEntry = {
  cacheKey: string;
  expiresAt: number;
  value: WhatsAppSenderIdentity;
};

type WhatsAppBusinessPhoneListCacheEntry = {
  cacheKey: string;
  expiresAt: number;
  phoneNumberIds: string[];
};

const WHATSAPP_SENDER_IDENTITY_CACHE_TTL_MS = 5 * 60_000;
let whatsAppSenderIdentityCache: WhatsAppSenderIdentityCacheEntry | null = null;
let whatsAppBusinessPhoneListCache: WhatsAppBusinessPhoneListCacheEntry | null = null;

export class WhatsAppApiError extends Error {
  status: number;
  metaCode?: number;
  metaSubcode?: number;
  metaType?: string;
  fbtraceId?: string;
  templateName?: string | null;
  languageCode?: string | null;
  destination: string;
  phoneNumberId: string;
  endpoint: string;
  category: 'auth' | 'template' | 'rate_limit' | 'temporary' | 'config' | 'unknown';
  rawBody?: unknown;

  constructor(params: {
    message: string;
    status: number;
    destination: string;
    phoneNumberId: string;
    endpoint: string;
    templateName?: string | null;
    languageCode?: string | null;
    metaCode?: number;
    metaSubcode?: number;
    metaType?: string;
    fbtraceId?: string;
    category: WhatsAppApiError['category'];
    rawBody?: unknown;
  }) {
    super(params.message);
    this.name = 'WhatsAppApiError';
    this.status = params.status;
    this.destination = params.destination;
    this.phoneNumberId = params.phoneNumberId;
    this.endpoint = params.endpoint;
    this.templateName = params.templateName;
    this.languageCode = params.languageCode;
    this.metaCode = params.metaCode;
    this.metaSubcode = params.metaSubcode;
    this.metaType = params.metaType;
    this.fbtraceId = params.fbtraceId;
    this.category = params.category;
    this.rawBody = params.rawBody;
  }
}

type WhatsAppTemplateMessageParams = {
  to: string;
  name: string;
  languageCode?: string;
  bodyParameters?: Array<string | number | null | undefined>;
};

export const TEMPLATE_CONFIG = {
  [WHATSAPP_TEMPLATES.CONNECT.name]: 2,
  [WHATSAPP_TEMPLATES.DIGEST.name]: 7,
} as const;

type SupportedTemplateName = keyof typeof TEMPLATE_CONFIG;

type SendWhatsAppTemplateParams = {
  to: string;
  templateName: string;
  languageCode?: string;
  variables?: Array<string | number | null | undefined>;
};

function normalizeTemplateName(templateName: string) {
  return templateName.trim().toLowerCase();
}

function getExpectedTemplateParams(templateName: string): number | null {
  const normalized = normalizeTemplateName(templateName);
  if (Object.prototype.hasOwnProperty.call(TEMPLATE_CONFIG, normalized)) {
    return TEMPLATE_CONFIG[normalized as SupportedTemplateName];
  }
  return null;
}

function normalizeTemplateVariables(variables: Array<string | number | null | undefined> | undefined) {
  if (!Array.isArray(variables)) return [];
  return variables.map((value) => {
    if (value === null || typeof value === 'undefined') return '-';
    const normalized = String(value).trim();
    return normalized.length > 0 ? normalized : '-';
  });
}

function cleanEnvValue(value: string | undefined | null) {
  if (!value) return '';
  return value.trim();
}

function normalizeApiVersion(value: string) {
  const normalized = value.trim();
  if (!normalized) return DEFAULT_WHATSAPP_API_VERSION;
  return normalized.startsWith('v') ? normalized : `v${normalized}`;
}

function parseErrorBody(rawText: string): ParsedWhatsAppError {
  if (!rawText) {
    return {
      message: 'Resposta vazia da API do WhatsApp.',
      rawBody: null,
    };
  }
  try {
    const parsed = JSON.parse(rawText);
    if (typeof parsed?.error?.message === 'string') {
      return {
        message: parsed.error.message,
        code: typeof parsed.error.code === 'number' ? parsed.error.code : undefined,
        errorSubcode:
          typeof parsed.error.error_subcode === 'number' ? parsed.error.error_subcode : undefined,
        type: typeof parsed.error.type === 'string' ? parsed.error.type : undefined,
        fbtraceId: typeof parsed.error.fbtrace_id === 'string' ? parsed.error.fbtrace_id : undefined,
        rawBody: parsed,
      };
    }
    if (typeof parsed?.message === 'string') {
      return {
        message: parsed.message,
        rawBody: parsed,
      };
    }
    return {
      message: rawText,
      rawBody: parsed,
    };
  } catch {
    return {
      message: rawText,
      rawBody: rawText,
    };
  }
}

function categorizeWhatsAppError(params: { status: number; parsedError: ParsedWhatsAppError; context: WhatsAppRequestContext }) {
  const templateErrorCodes = new Set([132000, 132001, 132007, 132012, 131058]);

  if (typeof params.parsedError.code === 'number' && templateErrorCodes.has(params.parsedError.code)) {
    return 'template' as const;
  }

  if (params.status === 401 || params.status === 403) return 'auth' as const;
  if (params.status === 429) return 'rate_limit' as const;
  if (params.status >= 500) return 'temporary' as const;

  if (
    params.status === 404 &&
    params.context.source === 'template' &&
    /template/i.test(params.parsedError.message)
  ) {
    return 'template' as const;
  }

  return 'unknown' as const;
}

export function getFriendlyWhatsAppErrorMessage(error: unknown) {
  if (!(error instanceof WhatsAppApiError)) {
    return error instanceof Error ? error.message : 'Não foi possível enviar a mensagem no WhatsApp.';
  }

  if (error.category === 'auth') {
    return 'Não foi possível autenticar na API do WhatsApp. Revise o token de acesso e as permissões da conta.';
  }

  if (error.category === 'template') {
    return 'Revise o nome do template e o idioma configurado no WhatsApp Manager.';
  }

  if (error.category === 'rate_limit') {
    return 'O WhatsApp atingiu o limite temporário de envio. Aguarde um pouco e tente novamente.';
  }

  if (error.category === 'temporary') {
    return 'O WhatsApp está indisponível no momento. Tente novamente em alguns instantes.';
  }

  if (/24\s*hours/i.test(error.message) || /outside the allowed window/i.test(error.message)) {
    return 'A Meta bloqueou envio fora da janela de 24h. Configure e use um template aprovado para iniciar a conversa.';
  }

  return `Falha ao enviar mensagem no WhatsApp (HTTP ${error.status}). ${error.message}`;
}

type UserFacingWhatsAppErrorCode =
  | 'test_mode_recipient_not_allowed'
  | 'window_24h'
  | 'invalid_number'
  | 'template_internal'
  | 'auth'
  | 'rate_limit'
  | 'temporary'
  | 'generic';

export type UserFacingWhatsAppError = {
  code: UserFacingWhatsAppErrorCode;
  message: string;
  status: number;
  shouldLogInternalDetailsOnly: boolean;
};

export type WhatsAppMessageAcceptance = {
  messageIds: string[];
  contactWaIds: string[];
};

function is24HourWindowError(error: WhatsAppApiError) {
  const message = error.message.toLowerCase();
  return (
    error.metaCode === 131047 ||
    /24\s*hours/.test(message) ||
    /outside the allowed window/.test(message) ||
    /outside the customer care window/.test(message)
  );
}

function isInvalidDestinationNumberError(error: WhatsAppApiError) {
  const message = error.message.toLowerCase();
  return (
    error.metaCode === 131030 ||
    error.metaCode === 131026 ||
    error.metaCode === 132005 ||
    /invalid/.test(message) && /number|phone|recipient|to/.test(message)
  );
}

function isTestModeRecipientNotAllowedError(error: WhatsAppApiError) {
  const message = error.message.toLowerCase();
  return (
    error.metaCode === 131026 &&
    (/allowed list/.test(message) || /test mode/.test(message))
  );
}

export function getUserFacingWhatsAppError(error: unknown): UserFacingWhatsAppError {
  if (!(error instanceof WhatsAppApiError)) {
    return {
      code: 'generic',
      message: 'Não foi possível enviar mensagem no WhatsApp. Tente novamente em alguns segundos.',
      status: 500,
      shouldLogInternalDetailsOnly: false,
    };
  }

  if (is24HourWindowError(error)) {
    return {
      code: 'window_24h',
      message:
        'Não foi possível enviar mensagem. Estamos iniciando a conexão com seu WhatsApp. Tente novamente em alguns segundos.',
      status: 409,
      shouldLogInternalDetailsOnly: false,
    };
  }

  if (isTestModeRecipientNotAllowedError(error)) {
    return {
      code: 'test_mode_recipient_not_allowed',
      message:
        'Este número ainda não está liberado no modo de teste da Meta. Adicione-o na lista de destinatários de teste e tente novamente.',
      status: 409,
      shouldLogInternalDetailsOnly: false,
    };
  }

  if (isInvalidDestinationNumberError(error)) {
    return {
      code: 'invalid_number',
      message: 'Número inválido. Verifique o formato com DDD.',
      status: 400,
      shouldLogInternalDetailsOnly: false,
    };
  }

  if (error.category === 'template') {
    return {
      code: 'template_internal',
      message: 'Não foi possível enviar mensagem no WhatsApp. Tente novamente em alguns segundos.',
      status: 500,
      shouldLogInternalDetailsOnly: true,
    };
  }

  if (error.category === 'config') {
    return {
      code: 'generic',
      message: error.message,
      status: 500,
      shouldLogInternalDetailsOnly: false,
    };
  }

  if (error.category === 'auth') {
    return {
      code: 'auth',
      message: 'Não foi possível autenticar a integração do WhatsApp no momento.',
      status: 503,
      shouldLogInternalDetailsOnly: false,
    };
  }

  if (error.category === 'rate_limit') {
    return {
      code: 'rate_limit',
      message: 'Não foi possível enviar mensagem no WhatsApp. Tente novamente em alguns segundos.',
      status: 429,
      shouldLogInternalDetailsOnly: false,
    };
  }

  if (error.category === 'temporary') {
    return {
      code: 'temporary',
      message: 'Não foi possível enviar mensagem no WhatsApp. Tente novamente em alguns segundos.',
      status: 503,
      shouldLogInternalDetailsOnly: false,
    };
  }

  return {
    code: 'generic',
    message: `Falha ao enviar mensagem no WhatsApp (HTTP ${error.status}).`,
    status: error.status || 500,
    shouldLogInternalDetailsOnly: false,
  };
}

function createWhatsAppConfigError(params: {
  message: string;
  phoneNumberId: string;
  endpoint: string;
  rawBody?: unknown;
}) {
  return new WhatsAppApiError({
    message: params.message,
    status: 500,
    destination: 'config-validation',
    phoneNumberId: params.phoneNumberId,
    endpoint: params.endpoint,
    category: 'config',
    rawBody: params.rawBody,
  });
}

function normalizeExpectedDisplayPhoneNumber(value: string | undefined) {
  const normalized = normalizeWhatsappPhone(cleanEnvValue(value));
  return normalized || '';
}

function isMetaTestNumberSender(identity: WhatsAppSenderIdentity) {
  const verifiedName = cleanEnvValue(identity.verifiedName).toLowerCase();
  const digits = cleanEnvValue(identity.displayPhoneNumber).replace(/\D/g, '');
  return verifiedName === 'test number' || digits.startsWith('1555');
}

async function fetchConfiguredWhatsAppSenderIdentity(config: WhatsAppConfig): Promise<WhatsAppSenderIdentity> {
  const cacheKey = [
    config.apiVersion,
    config.phoneNumberId,
    config.businessAccountId || '',
    config.expectedDisplayPhoneNumber || '',
    config.expectedVerifiedName || '',
    config.allowTestNumber ? 'allow-test' : 'block-test',
  ].join(':');

  if (
    whatsAppSenderIdentityCache &&
    whatsAppSenderIdentityCache.cacheKey === cacheKey &&
    whatsAppSenderIdentityCache.expiresAt > Date.now()
  ) {
    return whatsAppSenderIdentityCache.value;
  }

  const endpoint =
    `https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}` +
    '?fields=id,display_phone_number,verified_name,quality_rating,code_verification_status,name_status,status';

  const response = await fetch(endpoint, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });

  const rawBody = await response.text();

  if (!response.ok) {
    const parsedError = parseErrorBody(rawBody);
    throw new WhatsAppApiError({
      message: parsedError.message,
      status: response.status,
      destination: 'sender-identity',
      phoneNumberId: config.phoneNumberId,
      endpoint,
      metaCode: parsedError.code,
      metaSubcode: parsedError.errorSubcode,
      metaType: parsedError.type,
      fbtraceId: parsedError.fbtraceId,
      category: 'config',
      rawBody: parsedError.rawBody,
    });
  }

  const parsedBody = rawBody ? safeParseBody(rawBody) : {};
  const data = parsedBody && typeof parsedBody === 'object' ? (parsedBody as Record<string, unknown>) : {};
  const identity: WhatsAppSenderIdentity = {
    phoneNumberId: typeof data.id === 'string' ? data.id : config.phoneNumberId,
    displayPhoneNumber: typeof data.display_phone_number === 'string' ? data.display_phone_number : null,
    verifiedName: typeof data.verified_name === 'string' ? data.verified_name : null,
    qualityRating: typeof data.quality_rating === 'string' ? data.quality_rating : null,
    codeVerificationStatus:
      typeof data.code_verification_status === 'string' ? data.code_verification_status : null,
    nameStatus: typeof data.name_status === 'string' ? data.name_status : null,
    status: typeof data.status === 'string' ? data.status : null,
  };

  whatsAppSenderIdentityCache = {
    cacheKey,
    expiresAt: Date.now() + WHATSAPP_SENDER_IDENTITY_CACHE_TTL_MS,
    value: identity,
  };

  return identity;
}

async function fetchConfiguredBusinessPhoneIds(config: WhatsAppConfig): Promise<string[]> {
  if (!config.businessAccountId) {
    return [];
  }

  const cacheKey = [config.apiVersion, config.businessAccountId, config.phoneNumberId].join(':');
  if (
    whatsAppBusinessPhoneListCache &&
    whatsAppBusinessPhoneListCache.cacheKey === cacheKey &&
    whatsAppBusinessPhoneListCache.expiresAt > Date.now()
  ) {
    return whatsAppBusinessPhoneListCache.phoneNumberIds;
  }

  const endpoint =
    `https://graph.facebook.com/${config.apiVersion}/${config.businessAccountId}` +
    '/phone_numbers?fields=id,display_phone_number,verified_name,status';

  const response = await fetch(endpoint, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });

  const rawBody = await response.text();
  if (!response.ok) {
    const parsedError = parseErrorBody(rawBody);
    throw new WhatsAppApiError({
      message: parsedError.message,
      status: response.status,
      destination: 'business-phone-list',
      phoneNumberId: config.phoneNumberId,
      endpoint,
      metaCode: parsedError.code,
      metaSubcode: parsedError.errorSubcode,
      metaType: parsedError.type,
      fbtraceId: parsedError.fbtraceId,
      category: 'config',
      rawBody: parsedError.rawBody,
    });
  }

  const parsedBody = rawBody ? safeParseBody(rawBody) : {};
  const data =
    parsedBody &&
    typeof parsedBody === 'object' &&
    Array.isArray((parsedBody as Record<string, unknown>).data)
      ? ((parsedBody as Record<string, unknown>).data as Array<Record<string, unknown>>)
      : [];
  const phoneNumberIds = data
    .map((item) => (typeof item.id === 'string' ? item.id.trim() : ''))
    .filter(Boolean);

  whatsAppBusinessPhoneListCache = {
    cacheKey,
    expiresAt: Date.now() + WHATSAPP_SENDER_IDENTITY_CACHE_TTL_MS,
    phoneNumberIds,
  };

  return phoneNumberIds;
}

async function assertConfiguredWhatsAppSender(config: WhatsAppConfig) {
  if (process.env.NODE_ENV === 'production' && !config.expectedDisplayPhoneNumber && !config.allowTestNumber) {
    throw createWhatsAppConfigError({
      message: WHATSAPP_EXPECTED_DISPLAY_PHONE_MISSING_ERROR,
      phoneNumberId: config.phoneNumberId,
      endpoint: 'config://expected-display-phone',
    });
  }

  const identity = await fetchConfiguredWhatsAppSenderIdentity(config);

  if (!config.allowTestNumber && isMetaTestNumberSender(identity)) {
    throw createWhatsAppConfigError({
      message: WHATSAPP_TEST_NUMBER_BLOCKED_ERROR,
      phoneNumberId: config.phoneNumberId,
      endpoint: 'config://test-number-guard',
      rawBody: identity,
    });
  }

  if (config.businessAccountId) {
    const businessPhoneIds = await fetchConfiguredBusinessPhoneIds(config);
    if (!businessPhoneIds.includes(config.phoneNumberId)) {
      throw createWhatsAppConfigError({
        message: 'WHATSAPP_PHONE_NUMBER_ID nao pertence a WHATSAPP_BUSINESS_ACCOUNT_ID.',
        phoneNumberId: config.phoneNumberId,
        endpoint: 'config://business-account-binding',
        rawBody: {
          businessAccountId: config.businessAccountId,
          configuredPhoneNumberId: config.phoneNumberId,
          businessPhoneIds,
        },
      });
    }
  }

  if (config.expectedDisplayPhoneNumber) {
    const actualDisplayPhoneNumber = normalizeExpectedDisplayPhoneNumber(identity.displayPhoneNumber || '');
    if (actualDisplayPhoneNumber !== config.expectedDisplayPhoneNumber) {
      throw createWhatsAppConfigError({
        message: 'WHATSAPP_PHONE_NUMBER_ID nao corresponde ao numero comercial esperado.',
        phoneNumberId: config.phoneNumberId,
        endpoint: 'config://display-phone-mismatch',
        rawBody: {
          expectedDisplayPhoneNumber: config.expectedDisplayPhoneNumber,
          actualDisplayPhoneNumber,
          identity,
        },
      });
    }
  }

  if (config.expectedVerifiedName) {
    const expectedVerifiedName = config.expectedVerifiedName.trim().toLowerCase();
    const actualVerifiedName = cleanEnvValue(identity.verifiedName).toLowerCase();
    if (actualVerifiedName !== expectedVerifiedName) {
      throw createWhatsAppConfigError({
        message: 'WHATSAPP_PHONE_NUMBER_ID nao corresponde ao verified_name esperado.',
        phoneNumberId: config.phoneNumberId,
        endpoint: 'config://verified-name-mismatch',
        rawBody: {
          expectedVerifiedName: config.expectedVerifiedName,
          actualVerifiedName: identity.verifiedName,
          identity,
        },
      });
    }
  }

  return identity;
}

async function sendWhatsAppRequest(payload: Record<string, unknown>, context: WhatsAppRequestContext) {
  const config = getWhatsAppConfig();
  await assertConfiguredWhatsAppSender(config);
  const endpoint = `https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}/messages`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });

  const rawBody = await response.text();
  const parsedBody = (() => {
    if (!rawBody) return {};
    try {
      return JSON.parse(rawBody);
    } catch {
      return { raw: rawBody };
    }
  })();

  if (!response.ok) {
    const parsedError = parseErrorBody(rawBody);
    const category = categorizeWhatsAppError({
      status: response.status,
      parsedError,
      context,
    });

    console.error('WhatsApp API send failure', {
      status: response.status,
      template_name: context.templateName ?? null,
      language_code: context.languageCode ?? null,
      phone_number_id: config.phoneNumberId,
      destination: context.destination,
      endpoint,
      meta_error: parsedError.rawBody ?? parsedError.message,
    });

    throw new WhatsAppApiError({
      message: parsedError.message,
      status: response.status,
      metaCode: parsedError.code,
      metaSubcode: parsedError.errorSubcode,
      metaType: parsedError.type,
      fbtraceId: parsedError.fbtraceId,
      templateName: context.templateName ?? null,
      languageCode: context.languageCode ?? null,
      destination: context.destination,
      phoneNumberId: config.phoneNumberId,
      endpoint,
      category,
      rawBody: parsedError.rawBody,
    });
  }

  return parsedBody;
}

export async function verifyWhatsAppConnection(): Promise<WhatsAppConnectionHealth> {
  const config = getWhatsAppConfig();
  const identity = await assertConfiguredWhatsAppSender(config);

  return {
    displayPhoneNumber: identity.displayPhoneNumber,
    verifiedName: identity.verifiedName,
    qualityRating: identity.qualityRating,
  };
}

function safeParseBody(rawBody: string) {
  try {
    return JSON.parse(rawBody);
  } catch {
    return { raw: rawBody };
  }
}

export function extractMetaMessageAcceptance(payload: unknown): WhatsAppMessageAcceptance {
  const result: WhatsAppMessageAcceptance = {
    messageIds: [],
    contactWaIds: [],
  };

  if (!payload || typeof payload !== 'object') return result;
  const value = payload as Record<string, unknown>;
  const messages = Array.isArray(value.messages) ? value.messages : [];
  const contacts = Array.isArray(value.contacts) ? value.contacts : [];

  for (const item of messages) {
    if (!item || typeof item !== 'object') continue;
    const id = (item as Record<string, unknown>).id;
    if (typeof id === 'string' && id.trim()) {
      result.messageIds.push(id.trim());
    }
  }

  for (const item of contacts) {
    if (!item || typeof item !== 'object') continue;
    const waId = (item as Record<string, unknown>).wa_id;
    if (typeof waId === 'string' && waId.trim()) {
      result.contactWaIds.push(waId.trim());
    }
  }

  return result;
}

export function normalizeWhatsappPhone(phone: string) {
  const onlyDigits = phone.replace(/\D/g, '');
  if (!onlyDigits) return '';

  const withoutInternationalPrefix = onlyDigits.startsWith('00')
    ? onlyDigits.slice(2)
    : onlyDigits;

  if (withoutInternationalPrefix.startsWith('55')) {
    return withoutInternationalPrefix;
  }

  // Assume BR local number when country code is omitted.
  if (withoutInternationalPrefix.length >= 10 && withoutInternationalPrefix.length <= 11) {
    return `55${withoutInternationalPrefix}`;
  }

  return withoutInternationalPrefix;
}

export function isValidE164Phone(phone: string) {
  const normalized = normalizeWhatsappPhone(phone);
  return /^\d{10,15}$/.test(normalized);
}

export function getWhatsAppConfig(): WhatsAppConfig {
  const accessToken = cleanEnvValue(process.env.WHATSAPP_ACCESS_TOKEN);
  const phoneNumberId = cleanEnvValue(process.env.WHATSAPP_PHONE_NUMBER_ID);
  const businessAccountId = cleanEnvValue(process.env.WHATSAPP_BUSINESS_ACCOUNT_ID);
  const verifyToken = cleanEnvValue(process.env.WHATSAPP_VERIFY_TOKEN);
  const apiVersion = normalizeApiVersion(
    cleanEnvValue(process.env.WHATSAPP_API_VERSION) || DEFAULT_WHATSAPP_API_VERSION
  );
  const appSecret = cleanEnvValue(process.env.WHATSAPP_APP_SECRET);
  const expectedDisplayPhoneNumber = normalizeExpectedDisplayPhoneNumber(
    process.env.WHATSAPP_EXPECTED_DISPLAY_PHONE_NUMBER
  );
  const expectedVerifiedName = cleanEnvValue(process.env.WHATSAPP_EXPECTED_VERIFIED_NAME);
  const allowTestNumber = cleanEnvValue(process.env.WHATSAPP_ALLOW_TEST_NUMBER).toLowerCase() === 'true';

  if (!accessToken || !phoneNumberId) {
    throw new Error(WHATSAPP_CONFIG_MISSING_ERROR);
  }

  if (!verifyToken) {
    throw new Error(WHATSAPP_VERIFY_TOKEN_MISSING_ERROR);
  }

  return {
    accessToken,
    phoneNumberId,
    businessAccountId: businessAccountId || undefined,
    verifyToken,
    apiVersion,
    appSecret: appSecret || undefined,
    expectedDisplayPhoneNumber: expectedDisplayPhoneNumber || undefined,
    expectedVerifiedName: expectedVerifiedName || undefined,
    allowTestNumber,
  };
}

export function getWhatsAppVerifyToken() {
  const verifyToken = cleanEnvValue(process.env.WHATSAPP_VERIFY_TOKEN);
  if (!verifyToken) {
    throw new Error(WHATSAPP_VERIFY_TOKEN_MISSING_ERROR);
  }
  return verifyToken;
}

export function verifyWhatsAppSignature(rawBody: string, signatureHeader: string | null) {
  const appSecret = cleanEnvValue(process.env.WHATSAPP_APP_SECRET);
  if (!appSecret) return true;
  if (!signatureHeader || !signatureHeader.startsWith('sha256=')) return false;

  const expected = `sha256=${crypto
    .createHmac('sha256', appSecret)
    .update(rawBody, 'utf8')
    .digest('hex')}`;

  const signatureBuffer = Buffer.from(signatureHeader, 'utf8');
  const expectedBuffer = Buffer.from(expected, 'utf8');

  if (signatureBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
}

export async function sendWhatsAppTextMessage(params: { to: string; text: string }) {
  const normalizedPhone = normalizeWhatsappPhone(params.to);

  if (!normalizedPhone) {
    throw new Error('Número de telefone inválido para envio no WhatsApp.');
  }

  return sendWhatsAppRequest(
    {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: normalizedPhone,
      type: 'text',
      text: {
        body: params.text,
      },
    },
    {
      source: 'text',
      destination: normalizedPhone,
    }
  );
}

export async function sendWhatsAppTemplateMessage(params: WhatsAppTemplateMessageParams) {
  return sendWhatsAppTemplate({
    to: params.to,
    templateName: params.name,
    languageCode: params.languageCode,
    variables: params.bodyParameters,
  });
}

export async function sendWhatsAppTemplate(params: SendWhatsAppTemplateParams) {
  const normalizedPhone = normalizeWhatsappPhone(params.to);

  if (!normalizedPhone) {
    throw new Error('Número de telefone inválido para envio no WhatsApp.');
  }

  const templateName = params.templateName.trim();
  const languageCode = (params.languageCode || WHATSAPP_TEMPLATES.CONNECT.language).trim();

  if (!templateName) {
    throw new Error('Nome do template do WhatsApp não configurado.');
  }

  if (!languageCode) {
    throw new Error('Idioma do template do WhatsApp não configurado.');
  }

  const variables = normalizeTemplateVariables(params.variables);
  const expectedParams = getExpectedTemplateParams(templateName);
  const receivedParams = variables.length;

  console.log('WHATSAPP_TEMPLATE_SEND', {
    templateName,
    expectedParams,
    receivedParams,
    to: normalizedPhone,
  });

  if (expectedParams !== null && expectedParams !== receivedParams) {
    const payloadPreview = {
      template: {
        name: templateName,
        language: { code: languageCode },
      },
      components:
        receivedParams > 0
          ? [
              {
                type: 'body',
                parameters: variables.map((text) => ({ type: 'text', text })),
              },
            ]
          : undefined,
    };

    console.error('WHATSAPP_TEMPLATE_ERROR', {
      templateName,
      expectedParams,
      receivedParams,
      to: normalizedPhone,
      error: `Template ${templateName} espera ${expectedParams} parâmetros, mas recebeu ${receivedParams}.`,
      payload: payloadPreview,
    });

    throw new WhatsAppApiError({
      message: `Template ${templateName} espera ${expectedParams} parâmetros, mas recebeu ${receivedParams}.`,
      status: 400,
      destination: normalizedPhone,
      phoneNumberId: 'validation',
      endpoint: 'validation://template',
      templateName,
      languageCode,
      category: 'template',
      rawBody: {
        expectedParams,
        receivedParams,
        templateName,
      },
    });
  }

  const payload: Record<string, unknown> = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: normalizedPhone,
    type: 'template',
    template: {
      name: templateName,
      language: {
        code: languageCode,
      },
      ...(variables.length > 0
        ? {
            components: [
              {
                type: 'body',
                parameters: variables.map((text) => ({
                  type: 'text',
                  text,
                })),
              },
            ],
          }
        : {}),
    },
  };

  try {
    return await sendWhatsAppRequest(payload, {
      source: 'template',
      destination: normalizedPhone,
      templateName,
      languageCode,
    });
  } catch (error) {
    console.error('WHATSAPP_TEMPLATE_ERROR', {
      templateName,
      expectedParams,
      receivedParams,
      to: normalizedPhone,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      payload: payload.template,
    });
    throw error;
  }
}

