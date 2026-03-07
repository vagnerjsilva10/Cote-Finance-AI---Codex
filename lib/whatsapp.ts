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

function cleanEnvValue(value: string | undefined | null) {
  if (!value) return '';
  return value.trim();
}

function normalizeApiVersion(value: string) {
  const normalized = value.trim();
  if (!normalized) return DEFAULT_WHATSAPP_API_VERSION;
  return normalized.startsWith('v') ? normalized : `v${normalized}`;
}

function parseErrorBody(rawText: string) {
  if (!rawText) return '';
  try {
    const parsed = JSON.parse(rawText);
    if (typeof parsed?.error?.message === 'string') {
      return parsed.error.message;
    }
    if (typeof parsed?.message === 'string') {
      return parsed.message;
    }
    return rawText;
  } catch {
    return rawText;
  }
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
  const config = getWhatsAppConfig();
  const normalizedPhone = normalizeWhatsappPhone(params.to);

  if (!normalizedPhone) {
    throw new Error('Número de telefone inválido para envio no WhatsApp.');
  }

  const endpoint = `https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}/messages`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: normalizedPhone,
      type: 'text',
      text: {
        body: params.text,
      },
    }),
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
    const parsedMessage = parseErrorBody(rawBody);
    throw new Error(
      `Falha ao enviar mensagem no WhatsApp (HTTP ${response.status}). ${parsedMessage}`
    );
  }

  return parsedBody;
}
