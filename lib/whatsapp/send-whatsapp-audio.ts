import 'server-only';

import { getWhatsAppConfig, normalizeWhatsappPhone } from '@/lib/whatsapp';

export type WhatsAppAudioTransportEvent =
  | {
      event: 'WHATSAPP_AUDIO_UPLOAD_START';
      phone: string;
      mimeType: string;
      byteLength: number;
    }
  | {
      event: 'WHATSAPP_AUDIO_UPLOAD_SUCCESS';
      phone: string;
      mediaId: string;
    }
  | {
      event: 'WHATSAPP_AUDIO_UPLOAD_ERROR';
      phone: string;
      error: string;
      status: number | null;
      responseBody: string | null;
    }
  | {
      event: 'WHATSAPP_AUDIO_SEND_START';
      phone: string;
      mediaId: string;
    }
  | {
      event: 'WHATSAPP_AUDIO_SEND_SUCCESS';
      phone: string;
      mediaId: string;
      messageIds: string[];
    }
  | {
      event: 'WHATSAPP_AUDIO_SEND_ERROR';
      phone: string;
      mediaId: string | null;
      error: string;
      status: number | null;
      responseBody: string | null;
    };

export class WhatsAppAudioMessageError extends Error {
  readonly stage: 'upload' | 'send';
  readonly status: number | null;
  readonly responseBody: string | null;
  readonly mediaId: string | null;

  constructor(params: {
    stage: 'upload' | 'send';
    message: string;
    status?: number | null;
    responseBody?: string | null;
    mediaId?: string | null;
  }) {
    super(params.message);
    this.name = 'WhatsAppAudioMessageError';
    this.stage = params.stage;
    this.status = params.status ?? null;
    this.responseBody = params.responseBody ?? null;
    this.mediaId = params.mediaId ?? null;
  }
}

async function emit(
  onEvent: ((event: WhatsAppAudioTransportEvent) => Promise<void> | void) | undefined,
  event: WhatsAppAudioTransportEvent
) {
  if (!onEvent) return;
  await onEvent(event);
}

async function uploadAudioToWhatsApp(params: {
  phone: string;
  audioBuffer: Buffer;
  mimeType: string;
  filename: string;
  onEvent?: (event: WhatsAppAudioTransportEvent) => Promise<void> | void;
}) {
  const config = getWhatsAppConfig();
  const endpoint = `https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}/media`;
  const formData = new FormData();
  const blob = new Blob([Uint8Array.from(params.audioBuffer)], { type: params.mimeType });

  await emit(params.onEvent, {
    event: 'WHATSAPP_AUDIO_UPLOAD_START',
    phone: params.phone,
    mimeType: params.mimeType,
    byteLength: params.audioBuffer.length,
  });

  formData.append('messaging_product', 'whatsapp');
  formData.append('file', blob, params.filename);

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
    },
    body: formData,
    cache: 'no-store',
  });

  if (!response.ok) {
    const body = await response.text();
    const errorMessage = `Falha ao enviar midia de audio para WhatsApp (HTTP ${response.status}): ${body}`;
    await emit(params.onEvent, {
      event: 'WHATSAPP_AUDIO_UPLOAD_ERROR',
      phone: params.phone,
      error: errorMessage,
      status: response.status,
      responseBody: body || null,
    });
    throw new WhatsAppAudioMessageError({
      stage: 'upload',
      message: errorMessage,
      status: response.status,
      responseBody: body || null,
    });
  }

  const payload = (await response.json()) as { id?: string };
  if (!payload.id) {
    const errorMessage = 'WhatsApp nao retornou media_id para o audio.';
    await emit(params.onEvent, {
      event: 'WHATSAPP_AUDIO_UPLOAD_ERROR',
      phone: params.phone,
      error: errorMessage,
      status: response.status,
      responseBody: null,
    });
    throw new WhatsAppAudioMessageError({
      stage: 'upload',
      message: errorMessage,
      status: response.status,
      responseBody: null,
    });
  }

  await emit(params.onEvent, {
    event: 'WHATSAPP_AUDIO_UPLOAD_SUCCESS',
    phone: params.phone,
    mediaId: payload.id,
  });

  return payload.id;
}

export async function sendWhatsAppAudioMessage(params: {
  to: string;
  audioBuffer: Buffer;
  mimeType: string;
  filename?: string;
  onEvent?: (event: WhatsAppAudioTransportEvent) => Promise<void> | void;
}) {
  const normalizedPhone = normalizeWhatsappPhone(params.to);
  if (!normalizedPhone) {
    throw new Error('Numero de telefone invalido para envio de audio no WhatsApp.');
  }

  const mediaId = await uploadAudioToWhatsApp({
    phone: normalizedPhone,
    audioBuffer: params.audioBuffer,
    mimeType: params.mimeType,
    filename: params.filename || 'assistant-reply.ogg',
    onEvent: params.onEvent,
  });

  await emit(params.onEvent, {
    event: 'WHATSAPP_AUDIO_SEND_START',
    phone: normalizedPhone,
    mediaId,
  });

  const config = getWhatsAppConfig();
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
      type: 'audio',
      audio: {
        id: mediaId,
      },
    }),
    cache: 'no-store',
  });

  if (!response.ok) {
    const body = await response.text();
    const errorMessage = `Falha ao enviar mensagem de audio no WhatsApp (HTTP ${response.status}): ${body}`;
    await emit(params.onEvent, {
      event: 'WHATSAPP_AUDIO_SEND_ERROR',
      phone: normalizedPhone,
      mediaId,
      error: errorMessage,
      status: response.status,
      responseBody: body || null,
    });
    throw new WhatsAppAudioMessageError({
      stage: 'send',
      message: errorMessage,
      status: response.status,
      responseBody: body || null,
      mediaId,
    });
  }

  const payload = (await response.json()) as {
    messages?: Array<{ id?: string }>;
  };
  const messageIds = Array.isArray(payload.messages)
    ? payload.messages
        .map((item) => (typeof item?.id === 'string' ? item.id.trim() : ''))
        .filter((value) => Boolean(value))
    : [];

  await emit(params.onEvent, {
    event: 'WHATSAPP_AUDIO_SEND_SUCCESS',
    phone: normalizedPhone,
    mediaId,
    messageIds,
  });

  return payload;
}
