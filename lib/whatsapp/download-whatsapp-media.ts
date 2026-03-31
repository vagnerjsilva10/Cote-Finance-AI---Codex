import 'server-only';

import { getWhatsAppConfig } from '@/lib/whatsapp';

export const WHATSAPP_MEDIA_MAX_SIZE_BYTES = 12 * 1024 * 1024;

export type DownloadedWhatsAppMedia = {
  mediaId: string;
  mimeType: string;
  sizeBytes: number;
  data: Buffer;
};

function normalizeMimeType(value: string | null | undefined) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

export function isSupportedIncomingAudioMime(mimeType: string | null | undefined) {
  const normalized = normalizeMimeType(mimeType);
  if (!normalized) return false;

  return (
    normalized === 'audio/ogg' ||
    normalized === 'audio/opus' ||
    normalized === 'audio/mpeg' ||
    normalized === 'audio/mp4' ||
    normalized === 'audio/aac' ||
    normalized === 'audio/wav' ||
    normalized === 'audio/x-wav'
  );
}

export async function downloadWhatsAppMedia(params: {
  mediaId: string;
  expectedMimeType?: string | null;
  maxSizeBytes?: number;
}) {
  const config = getWhatsAppConfig();
  const mediaId = params.mediaId.trim();
  if (!mediaId) {
    throw new Error('WhatsApp media id inválido.');
  }

  const maxSizeBytes = params.maxSizeBytes ?? WHATSAPP_MEDIA_MAX_SIZE_BYTES;
  const mediaInfoUrl = `https://graph.facebook.com/${config.apiVersion}/${mediaId}`;
  const infoResponse = await fetch(mediaInfoUrl, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
    },
    cache: 'no-store',
  });

  if (!infoResponse.ok) {
    throw new Error(`Falha ao consultar mídia do WhatsApp (HTTP ${infoResponse.status}).`);
  }

  const mediaInfo = (await infoResponse.json()) as {
    url?: string;
    mime_type?: string;
    file_size?: number;
  };

  const mediaUrl = String(mediaInfo.url || '').trim();
  if (!mediaUrl) {
    throw new Error('Mídia do WhatsApp sem URL de download.');
  }

  const mimeType = normalizeMimeType(mediaInfo.mime_type || params.expectedMimeType || '');
  if (!mimeType) {
    throw new Error('Não foi possível determinar o tipo de mídia do WhatsApp.');
  }

  if (params.expectedMimeType && !mimeType.startsWith(normalizeMimeType(params.expectedMimeType))) {
    throw new Error('O tipo de mídia recebido não corresponde ao esperado.');
  }

  const mediaResponse = await fetch(mediaUrl, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
    },
    cache: 'no-store',
  });

  if (!mediaResponse.ok) {
    throw new Error(`Falha ao baixar mídia do WhatsApp (HTTP ${mediaResponse.status}).`);
  }

  const contentLength = Number(mediaResponse.headers.get('content-length') || 0);
  if (contentLength > maxSizeBytes) {
    throw new Error('Arquivo de áudio excede o limite permitido.');
  }

  const arrayBuffer = await mediaResponse.arrayBuffer();
  const data = Buffer.from(arrayBuffer);
  if (!data.length) {
    throw new Error('Áudio do WhatsApp está vazio.');
  }
  if (data.length > maxSizeBytes) {
    throw new Error('Arquivo de áudio excede o limite permitido.');
  }

  return {
    mediaId,
    mimeType,
    sizeBytes: data.length,
    data,
  } satisfies DownloadedWhatsAppMedia;
}

