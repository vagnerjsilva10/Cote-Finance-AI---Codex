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

export function normalizeIncomingMimeType(value: string | null | undefined) {
  return normalizeMimeType(value);
}

