import { type AssistantReplyMode } from '@/lib/ai/schemas/financial-intent.schema';

export type PersistedReplyMode = 'text' | 'audio' | 'both';

export function resolveReplyMode(params: {
  persistedMode: PersistedReplyMode;
  requestedMode: AssistantReplyMode;
}): PersistedReplyMode {
  if (params.requestedMode === 'unchanged') {
    return params.persistedMode;
  }
  return params.requestedMode;
}

