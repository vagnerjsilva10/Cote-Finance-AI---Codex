function normalizeMimeType(value: string | null | undefined) {
  const raw = String(value || '')
    .trim()
    .toLowerCase();

  if (!raw) return '';

  const [mimeOnly] = raw.split(';');
  return (mimeOnly || '').trim();
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
    normalized === 'audio/amr' ||
    normalized === 'audio/3gpp' ||
    normalized === 'audio/3gpp2' ||
    normalized === 'audio/wav' ||
    normalized === 'audio/x-wav' ||
    normalized === 'audio/webm'
  );
}

export function normalizeIncomingMimeType(value: string | null | undefined) {
  return normalizeMimeType(value);
}
