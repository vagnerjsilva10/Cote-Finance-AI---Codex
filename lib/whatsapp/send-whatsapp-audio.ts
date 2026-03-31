import 'server-only';

import { getWhatsAppConfig, normalizeWhatsappPhone } from '@/lib/whatsapp';

async function uploadAudioToWhatsApp(params: {
  audioBuffer: Buffer;
  mimeType: string;
  filename: string;
}) {
  const config = getWhatsAppConfig();
  const endpoint = `https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}/media`;
  const formData = new FormData();
  const blob = new Blob([Uint8Array.from(params.audioBuffer)], { type: params.mimeType });

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
    throw new Error(`Falha ao enviar midia de audio para WhatsApp (HTTP ${response.status}): ${body}`);
  }

  const payload = (await response.json()) as { id?: string };
  if (!payload.id) {
    throw new Error('WhatsApp nao retornou media_id para o audio.');
  }

  return payload.id;
}

export async function sendWhatsAppAudioMessage(params: {
  to: string;
  audioBuffer: Buffer;
  mimeType: string;
  filename?: string;
}) {
  const normalizedPhone = normalizeWhatsappPhone(params.to);
  if (!normalizedPhone) {
    throw new Error('Numero de telefone invalido para envio de audio no WhatsApp.');
  }

  const mediaId = await uploadAudioToWhatsApp({
    audioBuffer: params.audioBuffer,
    mimeType: params.mimeType,
    filename: params.filename || 'assistant-reply.ogg',
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
    throw new Error(`Falha ao enviar mensagem de audio no WhatsApp (HTTP ${response.status}): ${body}`);
  }

  return response.json();
}
