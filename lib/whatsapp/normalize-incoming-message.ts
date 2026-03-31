export type NormalizedIncomingWhatsAppMessage =
  | {
      kind: 'text';
      messageId: string;
      from: string;
      timestamp: string | null;
      text: string;
    }
  | {
      kind: 'audio';
      messageId: string;
      from: string;
      timestamp: string | null;
      audioId: string;
      mimeType: string | null;
      sha256: string | null;
    };

function safeTrim(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function parseTextMessage(rawMessage: Record<string, unknown>): NormalizedIncomingWhatsAppMessage | null {
  const from = safeTrim(rawMessage.from);
  const messageId = safeTrim(rawMessage.id);
  const textNode =
    rawMessage.text && typeof rawMessage.text === 'object' ? (rawMessage.text as Record<string, unknown>) : null;
  const body = safeTrim(textNode?.body);
  if (!from || !messageId || !body) return null;

  return {
    kind: 'text',
    from,
    messageId,
    text: body,
    timestamp: safeTrim(rawMessage.timestamp) || null,
  };
}

function parseAudioMessage(rawMessage: Record<string, unknown>): NormalizedIncomingWhatsAppMessage | null {
  const from = safeTrim(rawMessage.from);
  const messageId = safeTrim(rawMessage.id);
  const audioNode =
    rawMessage.audio && typeof rawMessage.audio === 'object'
      ? (rawMessage.audio as Record<string, unknown>)
      : null;
  const audioId = safeTrim(audioNode?.id);
  if (!from || !messageId || !audioId) return null;

  const mimeType = safeTrim(audioNode?.mime_type) || null;
  const sha256 = safeTrim(audioNode?.sha256) || null;

  return {
    kind: 'audio',
    from,
    messageId,
    audioId,
    mimeType,
    sha256,
    timestamp: safeTrim(rawMessage.timestamp) || null,
  };
}

export function normalizeIncomingWhatsAppMessages(payload: unknown): NormalizedIncomingWhatsAppMessage[] {
  const output: NormalizedIncomingWhatsAppMessage[] = [];
  const root = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : null;
  const entries = Array.isArray(root?.entry) ? root.entry : [];

  for (const entry of entries) {
    if (!entry || typeof entry !== 'object') continue;
    const changes = Array.isArray((entry as Record<string, unknown>).changes)
      ? ((entry as Record<string, unknown>).changes as unknown[])
      : [];

    for (const change of changes) {
      if (!change || typeof change !== 'object') continue;
      const value = (change as Record<string, unknown>).value;
      if (!value || typeof value !== 'object') continue;
      const messages = Array.isArray((value as Record<string, unknown>).messages)
        ? ((value as Record<string, unknown>).messages as unknown[])
        : [];

      for (const rawMessage of messages) {
        if (!rawMessage || typeof rawMessage !== 'object') continue;
        const record = rawMessage as Record<string, unknown>;
        const messageType = safeTrim(record.type).toLowerCase();

        if (messageType === 'text') {
          const parsed = parseTextMessage(record);
          if (parsed) output.push(parsed);
          continue;
        }

        if (messageType === 'audio') {
          const parsed = parseAudioMessage(record);
          if (parsed) output.push(parsed);
        }
      }
    }
  }

  return output;
}

