import 'server-only';
import crypto from 'crypto';

const DEFAULT_WHATSAPP_API_VERSION = 'v21.0';

export const WHATSAPP_CONFIG_MISSING_ERROR =
  'WhatsApp não configurado. Defina WHATSAPP_ACCESS_TOKEN e WHATSAPP_PHONE_NUMBER_ID.';
export const WHATSAPP_VERIFY_TOKEN_MISSING_ERROR =
  'WhatsApp não configurado. Defina WHATSAPP_VERIFY_TOKEN.';

type WhatsAppConfig = {
  accessToken: string;
  phoneNumberId: string;
  verifyToken: string;
  apiVersion: string;
  appSecret?: string;
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
  bodyParameters?: string[];
};

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

  return `Falha ao enviar mensagem no WhatsApp (HTTP ${error.status}). ${error.message}`;
}

async function sendWhatsAppRequest(payload: Record<string, unknown>, context: WhatsAppRequestContext) {
  const config = getWhatsAppConfig();
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

export function getWhatsAppConfig(): WhatsAppConfig {
  const accessToken = cleanEnvValue(process.env.WHATSAPP_ACCESS_TOKEN);
  const phoneNumberId = cleanEnvValue(process.env.WHATSAPP_PHONE_NUMBER_ID);
  const verifyToken = cleanEnvValue(process.env.WHATSAPP_VERIFY_TOKEN);
  const apiVersion = normalizeApiVersion(
    cleanEnvValue(process.env.WHATSAPP_API_VERSION) || DEFAULT_WHATSAPP_API_VERSION
  );
  const appSecret = cleanEnvValue(process.env.WHATSAPP_APP_SECRET);

  if (!accessToken || !phoneNumberId) {
    throw new Error(WHATSAPP_CONFIG_MISSING_ERROR);
  }

  if (!verifyToken) {
    throw new Error(WHATSAPP_VERIFY_TOKEN_MISSING_ERROR);
  }

  return {
    accessToken,
    phoneNumberId,
    verifyToken,
    apiVersion,
    appSecret: appSecret || undefined,
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
  const normalizedPhone = normalizeWhatsappPhone(params.to);

  if (!normalizedPhone) {
    throw new Error('Número de telefone inválido para envio no WhatsApp.');
  }

  const templateName = params.name.trim();
  const languageCode = (params.languageCode || process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'pt_BR').trim();

  if (!templateName) {
    throw new Error('Nome do template do WhatsApp não configurado.');
  }

  if (!languageCode) {
    throw new Error('Idioma do template do WhatsApp não configurado.');
  }

  const bodyParameters =
    params.bodyParameters?.filter((value) => typeof value === 'string' && value.trim().length > 0) ?? [];

  return sendWhatsAppRequest(
    {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: normalizedPhone,
      type: 'template',
      template: {
        name: templateName,
        language: {
          code: languageCode,
        },
        ...(bodyParameters.length > 0
          ? {
              components: [
                {
                  type: 'body',
                  parameters: bodyParameters.map((text) => ({
                    type: 'text',
                    text,
                  })),
                },
              ],
            }
          : {}),
      },
    },
    {
      source: 'template',
      destination: normalizedPhone,
      templateName,
      languageCode,
    }
  );
}

