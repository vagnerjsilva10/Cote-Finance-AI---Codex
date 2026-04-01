import 'server-only';

import { logWhatsAppAssistantEvent } from '@/lib/finance-assistant/audit-log.service';
import { synthesizeAssistantAudio } from '@/lib/finance-assistant/tts-adapter';
import { sendWhatsAppAudioMessage } from '@/lib/whatsapp/send-whatsapp-audio';

type ReplyMode = 'text' | 'audio' | 'both';

type SynthesizedAudio = {
  audioBuffer: Buffer;
  mimeType: string;
  filename?: string;
};

type AudioReplyDeps = {
  synthesizeAudio: (text: string) => Promise<SynthesizedAudio | null>;
  sendAudioMessage: (params: {
    to: string;
    audioBuffer: Buffer;
    mimeType: string;
    filename?: string;
  }) => Promise<unknown>;
  logEvent: typeof logWhatsAppAssistantEvent;
};

const defaultDeps: AudioReplyDeps = {
  synthesizeAudio: synthesizeAssistantAudio,
  sendAudioMessage: sendWhatsAppAudioMessage,
  logEvent: logWhatsAppAssistantEvent,
};

export async function trySendWhatsAppAudioReply(params: {
  workspaceId: string;
  messageId: string;
  intent: string;
  mode: ReplyMode;
  to: string;
  textForSpeech: string;
  deps?: AudioReplyDeps;
}) {
  if (params.mode !== 'audio' && params.mode !== 'both') {
    return { attempted: false, sent: false, reason: 'mode_disabled' } as const;
  }

  const deps = params.deps || defaultDeps;

  await deps.logEvent({
    workspaceId: params.workspaceId,
    event: 'WHATSAPP_AUDIO_REPLY_START',
    payload: {
      messageId: params.messageId,
      intent: params.intent,
      mode: params.mode,
    },
  });

  try {
    const audio = await deps.synthesizeAudio(params.textForSpeech);
    if (!audio) {
      await deps.logEvent({
        workspaceId: params.workspaceId,
        event: 'WHATSAPP_REPLY_AUDIO_SKIPPED',
        payload: {
          messageId: params.messageId,
          intent: params.intent,
          mode: params.mode,
          reason: 'tts_unavailable_or_failed',
        },
      });
      await deps.logEvent({
        workspaceId: params.workspaceId,
        event: 'WHATSAPP_AUDIO_REPLY_ERROR',
        payload: {
          messageId: params.messageId,
          intent: params.intent,
          mode: params.mode,
          reason: 'tts_unavailable_or_failed',
        },
      });

      return { attempted: true, sent: false, reason: 'tts_unavailable_or_failed' } as const;
    }

    await deps.sendAudioMessage({
      to: params.to,
      audioBuffer: audio.audioBuffer,
      mimeType: audio.mimeType,
      filename: audio.filename,
    });

    await deps.logEvent({
      workspaceId: params.workspaceId,
      event: 'WHATSAPP_REPLY_AUDIO_SENT',
      payload: {
        messageId: params.messageId,
        intent: params.intent,
        mode: params.mode,
        mimeType: audio.mimeType,
        sizeBytes: audio.audioBuffer.length,
      },
    });
    await deps.logEvent({
      workspaceId: params.workspaceId,
      event: 'WHATSAPP_AUDIO_REPLY_SUCCESS',
      payload: {
        messageId: params.messageId,
        intent: params.intent,
        mode: params.mode,
        mimeType: audio.mimeType,
        sizeBytes: audio.audioBuffer.length,
      },
    });

    return { attempted: true, sent: true } as const;
  } catch (error) {
    await deps.logEvent({
      workspaceId: params.workspaceId,
      event: 'WHATSAPP_REPLY_AUDIO_SKIPPED',
      payload: {
        messageId: params.messageId,
        intent: params.intent,
        mode: params.mode,
        reason: 'audio_send_failed',
        error: error instanceof Error ? error.message : String(error || 'unknown_error'),
      },
    });
    await deps.logEvent({
      workspaceId: params.workspaceId,
      event: 'WHATSAPP_AUDIO_REPLY_ERROR',
      payload: {
        messageId: params.messageId,
        intent: params.intent,
        mode: params.mode,
        reason: 'audio_send_failed',
        error: error instanceof Error ? error.message : String(error || 'unknown_error'),
      },
    });

    return { attempted: true, sent: false, reason: 'audio_send_failed' } as const;
  }
}
