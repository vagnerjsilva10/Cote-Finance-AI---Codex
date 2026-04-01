import 'server-only';

export type RuntimeAudioEnv = {
  geminiApiKey: string;
  geminiTtsModel: string;
  whatsappAccessToken: string;
  whatsappPhoneNumberId: string;
  whatsappBusinessAccountId: string;
  whatsappVerifyToken: string;
  whatsappAppSecret: string;
};

function readEnv(name: string) {
  return String(process.env[name] || '').trim();
}

export function getRuntimeAudioEnv(): RuntimeAudioEnv {
  return {
    geminiApiKey: readEnv('GEMINI_API_KEY'),
    geminiTtsModel: readEnv('GEMINI_TTS_MODEL'),
    whatsappAccessToken: readEnv('WHATSAPP_ACCESS_TOKEN'),
    whatsappPhoneNumberId: readEnv('WHATSAPP_PHONE_NUMBER_ID'),
    whatsappBusinessAccountId: readEnv('WHATSAPP_BUSINESS_ACCOUNT_ID'),
    whatsappVerifyToken: readEnv('WHATSAPP_VERIFY_TOKEN'),
    whatsappAppSecret: readEnv('WHATSAPP_APP_SECRET'),
  };
}

export function validateRuntimeAudioEnv(env = getRuntimeAudioEnv()) {
  const missing: string[] = [];

  if (!env.geminiApiKey) missing.push('GEMINI_API_KEY');
  if (!env.geminiTtsModel) missing.push('GEMINI_TTS_MODEL');
  if (!env.whatsappAccessToken) missing.push('WHATSAPP_ACCESS_TOKEN');
  if (!env.whatsappPhoneNumberId) missing.push('WHATSAPP_PHONE_NUMBER_ID');
  if (!env.whatsappBusinessAccountId) missing.push('WHATSAPP_BUSINESS_ACCOUNT_ID');
  if (!env.whatsappVerifyToken) missing.push('WHATSAPP_VERIFY_TOKEN');
  if (!env.whatsappAppSecret) missing.push('WHATSAPP_APP_SECRET');

  return {
    ok: missing.length === 0,
    missing,
    env,
  };
}

