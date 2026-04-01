import 'server-only';

import { logWhatsAppAssistantEvent } from '@/lib/finance-assistant/audit-log.service';
import {
  GeminiTtsError,
  synthesizeSpeechWithGemini,
} from '@/lib/ai/gemini-tts';
import {
  getRuntimeAudioEnv,
  type RuntimeAudioEnv,
  validateRuntimeAudioEnv,
  validateTtsEnv,
} from '@/lib/config/env';
import {
  sendWhatsAppAudioMessage,
  WhatsAppAudioMessageError,
  type WhatsAppAudioTransportEvent,
} from '@/lib/whatsapp/send-whatsapp-audio';

type ReplyMode = 'text' | 'audio' | 'both';

type SynthesizedAudio = {
  audioBuffer: Buffer;
  mimeType: string;
  filename?: string;
  model?: string;
};

type AudioReplyDeps = {
  synthesizeAudio: (text: string) => Promise<SynthesizedAudio>;
  sendAudioMessage: (params: {
    to: string;
    audioBuffer: Buffer;
    mimeType: string;
    filename?: string;
    onEvent?: (event: WhatsAppAudioTransportEvent) => Promise<void> | void;
  }) => Promise<unknown>;
  logEvent: typeof logWhatsAppAssistantEvent;
  readEnv: () => RuntimeAudioEnv;
};

const defaultDeps: AudioReplyDeps = {
  synthesizeAudio: synthesizeSpeechWithGemini,
  sendAudioMessage: sendWhatsAppAudioMessage,
  logEvent: logWhatsAppAssistantEvent,
  readEnv: getRuntimeAudioEnv,
};

export async function trySendWhatsAppAudioReply(params: {
  workspaceId: string;
  userId?: string | null;
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
  const env = deps.readEnv();
  const envValidation = validateRuntimeAudioEnv(env);
  const ttsEnvValidation = validateTtsEnv(env);
  const ttsModel = env.geminiTtsModel || null;

  if (!ttsEnvValidation.ok) {
    const missing = ttsEnvValidation.missing.filter(
      (item) => item === 'GEMINI_API_KEY' || item === 'GEMINI_TTS_MODEL'
    );
    const envName = missing.includes('GEMINI_TTS_MODEL')
      ? 'GEMINI_TTS_MODEL'
      : missing.includes('GEMINI_API_KEY')
      ? 'GEMINI_API_KEY'
      : null;
    await deps.logEvent({
      workspaceId: params.workspaceId,
      userId: params.userId ?? null,
      event: 'WHATSAPP_TTS_MODEL_ERROR',
      payload: {
        messageId: params.messageId,
        intent: params.intent,
        phone: params.to,
        replyMode: params.mode,
        ttsModel,
        reason: 'missing_env',
        envName,
        missingEnv: missing,
        providerStatus: 'not_attempted',
      },
    });
    await deps.logEvent({
      workspaceId: params.workspaceId,
      userId: params.userId ?? null,
      event: 'WHATSAPP_AUDIO_REPLY_ERROR',
      payload: {
        messageId: params.messageId,
        intent: params.intent,
        phone: params.to,
        replyMode: params.mode,
        ttsModel,
        reason: 'tts_env_missing',
        envName,
        missingEnv: missing,
      },
    });
    return { attempted: false, sent: false, reason: 'tts_env_missing' } as const;
  }

  await deps.logEvent({
    workspaceId: params.workspaceId,
    userId: params.userId ?? null,
    event: 'WHATSAPP_AUDIO_REPLY_START',
    payload: {
      messageId: params.messageId,
      intent: params.intent,
      phone: params.to,
      replyMode: params.mode,
      ttsModel,
      missingEnv: envValidation.missing,
      providerStatus: 'start',
    },
  });

  let stage: 'tts' | 'whatsapp_send' = 'tts';
  try {
    const audio = await deps.synthesizeAudio(params.textForSpeech);
    const byteLength = audio.audioBuffer?.length || 0;
    if (byteLength <= 0) {
      await deps.logEvent({
        workspaceId: params.workspaceId,
        userId: params.userId ?? null,
        event: 'WHATSAPP_TTS_EMPTY_AUDIO',
        payload: {
          messageId: params.messageId,
          intent: params.intent,
          phone: params.to,
          replyMode: params.mode,
          ttsModel: audio.model || ttsModel,
          providerStatus: 'empty_audio',
          audioByteLength: 0,
        },
      });
      await deps.logEvent({
        workspaceId: params.workspaceId,
        userId: params.userId ?? null,
        event: 'WHATSAPP_AUDIO_REPLY_ERROR',
        payload: {
          messageId: params.messageId,
          intent: params.intent,
          phone: params.to,
          replyMode: params.mode,
          ttsModel: audio.model || ttsModel,
          reason: 'tts_empty_audio',
        },
      });
      return { attempted: true, sent: false, reason: 'tts_empty_audio' } as const;
    }

    stage = 'whatsapp_send';
    const logTransportEvent = async (transportEvent: WhatsAppAudioTransportEvent) => {
      if (transportEvent.event === 'WHATSAPP_AUDIO_UPLOAD_START') {
        await deps.logEvent({
          workspaceId: params.workspaceId,
          userId: params.userId ?? null,
          event: 'WHATSAPP_AUDIO_UPLOAD_START',
          payload: {
            messageId: params.messageId,
            intent: params.intent,
            phone: transportEvent.phone,
            replyMode: params.mode,
            ttsModel: audio.model || ttsModel,
            mimeType: transportEvent.mimeType,
            byteLength: transportEvent.byteLength,
          },
        });
        return;
      }

      if (transportEvent.event === 'WHATSAPP_AUDIO_UPLOAD_SUCCESS') {
        await deps.logEvent({
          workspaceId: params.workspaceId,
          userId: params.userId ?? null,
          event: 'WHATSAPP_AUDIO_UPLOAD_SUCCESS',
          payload: {
            messageId: params.messageId,
            intent: params.intent,
            phone: transportEvent.phone,
            replyMode: params.mode,
            ttsModel: audio.model || ttsModel,
            mediaId: transportEvent.mediaId,
          },
        });
        return;
      }

      if (transportEvent.event === 'WHATSAPP_AUDIO_UPLOAD_ERROR') {
        await deps.logEvent({
          workspaceId: params.workspaceId,
          userId: params.userId ?? null,
          event: 'WHATSAPP_AUDIO_UPLOAD_ERROR',
          payload: {
            messageId: params.messageId,
            intent: params.intent,
            phone: transportEvent.phone,
            replyMode: params.mode,
            ttsModel: audio.model || ttsModel,
            error: transportEvent.error,
            status: transportEvent.status,
            providerResponse: transportEvent.responseBody,
          },
        });
        return;
      }

      if (transportEvent.event === 'WHATSAPP_AUDIO_SEND_START') {
        await deps.logEvent({
          workspaceId: params.workspaceId,
          userId: params.userId ?? null,
          event: 'WHATSAPP_AUDIO_SEND_START',
          payload: {
            messageId: params.messageId,
            intent: params.intent,
            phone: transportEvent.phone,
            replyMode: params.mode,
            ttsModel: audio.model || ttsModel,
            mediaId: transportEvent.mediaId,
          },
        });
        return;
      }

      if (transportEvent.event === 'WHATSAPP_AUDIO_SEND_SUCCESS') {
        await deps.logEvent({
          workspaceId: params.workspaceId,
          userId: params.userId ?? null,
          event: 'WHATSAPP_AUDIO_SEND_SUCCESS',
          payload: {
            messageId: params.messageId,
            intent: params.intent,
            phone: transportEvent.phone,
            replyMode: params.mode,
            ttsModel: audio.model || ttsModel,
            mediaId: transportEvent.mediaId,
            messageIds: transportEvent.messageIds,
          },
        });
        return;
      }

      if (transportEvent.event === 'WHATSAPP_AUDIO_SEND_ERROR') {
        await deps.logEvent({
          workspaceId: params.workspaceId,
          userId: params.userId ?? null,
          event: 'WHATSAPP_AUDIO_SEND_ERROR',
          payload: {
            messageId: params.messageId,
            intent: params.intent,
            phone: transportEvent.phone,
            replyMode: params.mode,
            ttsModel: audio.model || ttsModel,
            mediaId: transportEvent.mediaId,
            error: transportEvent.error,
            status: transportEvent.status,
            providerResponse: transportEvent.responseBody,
          },
        });
      }
    };

    await deps.sendAudioMessage({
      to: params.to,
      audioBuffer: audio.audioBuffer,
      mimeType: audio.mimeType,
      filename: audio.filename,
      onEvent: logTransportEvent,
    });

    await deps.logEvent({
      workspaceId: params.workspaceId,
      userId: params.userId ?? null,
      event: 'WHATSAPP_REPLY_AUDIO_SENT',
      payload: {
        messageId: params.messageId,
        intent: params.intent,
        phone: params.to,
        replyMode: params.mode,
        mimeType: audio.mimeType,
        sizeBytes: audio.audioBuffer.length,
        ttsModel: audio.model || ttsModel,
        whatsappSendStatus: 'sent',
      },
    });
    await deps.logEvent({
      workspaceId: params.workspaceId,
      userId: params.userId ?? null,
      event: 'WHATSAPP_AUDIO_REPLY_SUCCESS',
      payload: {
        messageId: params.messageId,
        intent: params.intent,
        phone: params.to,
        replyMode: params.mode,
        ttsModel: audio.model || ttsModel,
        mimeType: audio.mimeType,
        audioByteLength: audio.audioBuffer.length,
        providerStatus: 'success',
        whatsappSendStatus: 'sent',
      },
    });

    return { attempted: true, sent: true } as const;
  } catch (error) {
    if (error instanceof GeminiTtsError) {
      if (
        error.code === 'MISSING_GEMINI_API_KEY' ||
        error.code === 'MISSING_GEMINI_TTS_MODEL' ||
        error.code === 'GEMINI_TTS_MODEL_ERROR'
      ) {
        await deps.logEvent({
          workspaceId: params.workspaceId,
          userId: params.userId ?? null,
          event: 'WHATSAPP_TTS_MODEL_ERROR',
          payload: {
            messageId: params.messageId,
            intent: params.intent,
            phone: params.to,
            replyMode: params.mode,
            ttsModel: error.model || ttsModel,
            providerStatus: 'model_error',
            providerError: error.providerMessage || error.message,
          },
        });
      }

      if (error.code === 'GEMINI_TTS_EMPTY_AUDIO') {
        await deps.logEvent({
          workspaceId: params.workspaceId,
          userId: params.userId ?? null,
          event: 'WHATSAPP_TTS_EMPTY_AUDIO',
          payload: {
            messageId: params.messageId,
            intent: params.intent,
            phone: params.to,
            replyMode: params.mode,
            ttsModel: error.model || ttsModel,
            providerStatus: 'empty_audio',
            providerError: error.providerMessage || error.message,
          },
        });
      }
    }

    await deps.logEvent({
      workspaceId: params.workspaceId,
      userId: params.userId ?? null,
      event: 'WHATSAPP_REPLY_AUDIO_SKIPPED',
      payload: {
        messageId: params.messageId,
        intent: params.intent,
        phone: params.to,
        replyMode: params.mode,
        ttsModel,
        reason: stage === 'whatsapp_send' ? 'audio_send_failed' : 'tts_generation_failed',
        stage,
        error: error instanceof Error ? error.message : String(error || 'unknown_error'),
        whatsappStatus:
          error instanceof WhatsAppAudioMessageError ? error.status : null,
        providerResponse:
          error instanceof WhatsAppAudioMessageError ? error.responseBody : null,
      },
    });
    await deps.logEvent({
      workspaceId: params.workspaceId,
      userId: params.userId ?? null,
      event: 'WHATSAPP_AUDIO_REPLY_ERROR',
      payload: {
        messageId: params.messageId,
        intent: params.intent,
        phone: params.to,
        replyMode: params.mode,
        ttsModel,
        reason: stage === 'whatsapp_send' ? 'audio_send_failed' : 'tts_generation_failed',
        stage,
        error: error instanceof Error ? error.message : String(error || 'unknown_error'),
        whatsappStatus:
          error instanceof WhatsAppAudioMessageError ? error.status : null,
        providerResponse:
          error instanceof WhatsAppAudioMessageError ? error.responseBody : null,
      },
    });

    return {
      attempted: true,
      sent: false,
      reason: stage === 'whatsapp_send' ? 'audio_send_failed' : 'tts_generation_failed',
    } as const;
  }
}
