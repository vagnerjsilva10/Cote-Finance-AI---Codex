import 'server-only';

import { getWorkspaceFeatureAccess } from '@/lib/billing/feature-access-service';
import { parseFinancialIntentWithGemini } from '@/lib/ai/gemini-parse-financial-intent';
import { transcribeAudioWithGemini } from '@/lib/ai/gemini-transcribe';
import { sendWhatsAppTextMessage } from '@/lib/whatsapp';
import {
  downloadWhatsAppMedia,
  isSupportedIncomingAudioMime,
} from '@/lib/whatsapp/download-whatsapp-media';
import { sendWhatsAppAudioMessage } from '@/lib/whatsapp/send-whatsapp-audio';
import { shouldRequireConfirmation } from '@/lib/finance-assistant/confirmation-policy';
import {
  executeContributeGoal,
  executeCreateDebt,
  executeCreateExpense,
  executeCreateGoal,
  executeCreateIncome,
  executeCreateInvestment,
  executePayDebt,
  executeQuerySummary,
} from '@/lib/finance-assistant/finance-actions';
import { parseIntentHeuristically } from '@/lib/finance-assistant/heuristic-intent';
import { markWhatsAppMessageAsProcessed } from '@/lib/finance-assistant/idempotency';
import { resolveReplyMode, setWorkspaceReplyMode, getWorkspaceReplyMode } from '@/lib/finance-assistant/reply-mode.service';
import { resolveWorkspaceFromWhatsAppSender } from '@/lib/finance-assistant/resolve-user-workspace-from-whatsapp';
import { logWhatsAppAssistantEvent } from '@/lib/finance-assistant/audit-log.service';
import type { NormalizedIncomingWhatsAppMessage } from '@/lib/whatsapp/normalize-incoming-message';
import { synthesizeAssistantAudio } from '@/lib/finance-assistant/tts-adapter';

const PREMIUM_BLOCK_MESSAGE =
  'Essa automação inteligente via WhatsApp faz parte do plano Pro do Cote Finance AI. Quando quiser, posso te orientar a ativar o Pro para lançar despesas, metas, dívidas e investimentos por mensagem.';

const UNKNOWN_COMMAND_HELP =
  'Posso te ajudar com lançamentos, metas, investimentos, dívidas e consultas financeiras. Exemplo: "gastei 60 no iFood".';

const AUDIO_NOT_SUPPORTED_MESSAGE =
  'Recebi seu áudio, mas esse formato não está disponível no momento. Pode enviar por texto?';

function resolveSummaryForReplyMode(mode: 'text' | 'audio' | 'both') {
  if (mode === 'audio') return 'Perfeito. A partir de agora vou priorizar respostas em áudio quando disponível.';
  if (mode === 'both') return 'Combinado. Vou responder com texto e também áudio quando disponível.';
  return 'Combinado. A partir de agora respondo apenas por texto.';
}

export async function orchestrateWhatsAppFinancialMessage(params: {
  message: NormalizedIncomingWhatsAppMessage;
  allowUnknownPassthrough?: boolean;
}) {
  const sender = params.message.from;
  const messageId = params.message.messageId;

  const workspace = await resolveWorkspaceFromWhatsAppSender(sender);
  if (!workspace) {
    await sendWhatsAppTextMessage({
      to: sender,
      text: 'Número não vinculado ao Cote Finance AI. Conecte seu WhatsApp na aba Integrações.',
    });
    return { handled: true };
  }

  await logWhatsAppAssistantEvent({
    workspaceId: workspace.workspaceId,
    event: 'WHATSAPP_MSG_RECEIVED',
    payload: {
      messageId,
      from: sender,
      kind: params.message.kind,
    },
  });

  const idempotency = await markWhatsAppMessageAsProcessed({
    workspaceId: workspace.workspaceId,
    messageId,
    from: sender,
  });
  if (idempotency.alreadyProcessed) {
    await logWhatsAppAssistantEvent({
      workspaceId: workspace.workspaceId,
      event: 'WHATSAPP_IDEMPOTENT_SKIP',
      payload: {
        messageId,
      },
    });
    return { handled: true };
  }

  await logWhatsAppAssistantEvent({
    workspaceId: workspace.workspaceId,
    event: 'WHATSAPP_USER_RESOLVED',
    payload: {
      messageId,
      sender,
      workspaceName: workspace.workspaceName,
    },
  });

  if (params.message.kind === 'text' && params.allowUnknownPassthrough) {
    const previewIntent = parseIntentHeuristically(params.message.text);
    if (previewIntent.intent === 'unknown') {
      return { handled: false as const, reason: 'unknown_passthrough' as const };
    }
  }

  await logWhatsAppAssistantEvent({
    workspaceId: workspace.workspaceId,
    event: 'WHATSAPP_FEATURE_ACCESS_CHECK_START',
    payload: {
      messageId,
      featureKey: 'whatsapp_financial_assistant',
    },
  });

  const access = await getWorkspaceFeatureAccess({
    workspaceId: workspace.workspaceId,
    featureKey: 'whatsapp_financial_assistant',
  });

  if (!access.allowed) {
    await logWhatsAppAssistantEvent({
      workspaceId: workspace.workspaceId,
      event: 'WHATSAPP_FEATURE_ACCESS_DENIED',
      payload: {
        messageId,
        reason: access.reason,
        plan: access.plan,
        status: access.status,
        source: access.source,
        currentPeriodEnd: access.currentPeriodEnd,
      },
    });

    await sendWhatsAppTextMessage({
      to: sender,
      text: PREMIUM_BLOCK_MESSAGE,
    });
    return { handled: true };
  }

  await logWhatsAppAssistantEvent({
    workspaceId: workspace.workspaceId,
    event: 'WHATSAPP_FEATURE_ACCESS_GRANTED',
    payload: {
      messageId,
      plan: access.plan,
      status: access.status,
      source: access.source,
      currentPeriodEnd: access.currentPeriodEnd,
    },
  });

  let canonicalText = params.message.kind === 'text' ? params.message.text : '';
  if (params.message.kind === 'audio') {
    if (!isSupportedIncomingAudioMime(params.message.mimeType)) {
      await sendWhatsAppTextMessage({
        to: sender,
        text: AUDIO_NOT_SUPPORTED_MESSAGE,
      });
      return { handled: true };
    }

    await logWhatsAppAssistantEvent({
      workspaceId: workspace.workspaceId,
      event: 'WHATSAPP_AUDIO_DOWNLOAD_START',
      payload: {
        messageId,
        mimeType: params.message.mimeType,
      },
    });

    const media = await downloadWhatsAppMedia({
      mediaId: params.message.audioId,
      expectedMimeType: params.message.mimeType,
    });

    await logWhatsAppAssistantEvent({
      workspaceId: workspace.workspaceId,
      event: 'WHATSAPP_AUDIO_DOWNLOAD_SUCCESS',
      payload: {
        messageId,
        mimeType: media.mimeType,
        sizeBytes: media.sizeBytes,
      },
    });

    await logWhatsAppAssistantEvent({
      workspaceId: workspace.workspaceId,
      event: 'GEMINI_TRANSCRIPTION_START',
      payload: {
        messageId,
      },
    });

    canonicalText = await transcribeAudioWithGemini({
      audioBuffer: media.data,
      mimeType: media.mimeType,
    });

    await logWhatsAppAssistantEvent({
      workspaceId: workspace.workspaceId,
      event: 'GEMINI_TRANSCRIPTION_SUCCESS',
      payload: {
        messageId,
        transcriptLength: canonicalText.length,
      },
    });
  }

  await logWhatsAppAssistantEvent({
    workspaceId: workspace.workspaceId,
    event: 'GEMINI_INTENT_PARSE_START',
    payload: {
      messageId,
      textLength: canonicalText.length,
    },
  });

  let parsedIntent;
  try {
    parsedIntent = await parseFinancialIntentWithGemini({
      userText: canonicalText,
      todayIsoDate: new Date().toISOString().slice(0, 10),
    });
  } catch {
    parsedIntent = parseIntentHeuristically(canonicalText);
  }

  await logWhatsAppAssistantEvent({
    workspaceId: workspace.workspaceId,
    event: 'GEMINI_INTENT_PARSE_SUCCESS',
    payload: {
      messageId,
      intent: parsedIntent.intent,
      confidence: parsedIntent.confidence,
      needsConfirmation: parsedIntent.needsConfirmation,
    },
  });

  const persistedReplyMode = await getWorkspaceReplyMode(workspace.workspaceId);

  if (parsedIntent.intent === 'set_reply_mode') {
    const nextMode = resolveReplyMode({
      persistedMode: persistedReplyMode,
      requestedMode: parsedIntent.replyModeRequested,
    });
    await setWorkspaceReplyMode({
      workspaceId: workspace.workspaceId,
      mode: nextMode,
    });

    await sendWhatsAppTextMessage({
      to: sender,
      text: resolveSummaryForReplyMode(nextMode),
    });

    await logWhatsAppAssistantEvent({
      workspaceId: workspace.workspaceId,
      event: 'WHATSAPP_REPLY_TEXT_SENT',
      payload: {
        messageId,
        intent: parsedIntent.intent,
      },
    });
    return { handled: true };
  }

  if (shouldRequireConfirmation(parsedIntent)) {
    await sendWhatsAppTextMessage({
      to: sender,
      text: 'Quero evitar erro no seu lançamento. Pode confirmar com mais detalhe de valor, categoria ou data?',
    });
    await logWhatsAppAssistantEvent({
      workspaceId: workspace.workspaceId,
      event: 'WHATSAPP_REPLY_TEXT_SENT',
      payload: {
        messageId,
        reason: 'confirmation_required',
      },
    });
    return { handled: true };
  }

  let resultText = UNKNOWN_COMMAND_HELP;
  let categoryAudit: unknown = null;
  try {
    await logWhatsAppAssistantEvent({
      workspaceId: workspace.workspaceId,
      event: 'ACTION_EXECUTION_START',
      payload: {
        messageId,
        intent: parsedIntent.intent,
      },
    });

    if (parsedIntent.intent === 'create_expense') {
      await logWhatsAppAssistantEvent({
        workspaceId: workspace.workspaceId,
        event: 'CATEGORY_RESOLUTION_START',
        payload: {
          messageId,
          intent: parsedIntent.intent,
          hint: parsedIntent.transaction?.categoryHint || parsedIntent.transaction?.description || canonicalText,
        },
      });

      const execution = await executeCreateExpense({
        ctx: { workspaceId: workspace.workspaceId, messageId, parsedText: canonicalText },
        amount: Number(parsedIntent.transaction?.amount || 0),
        description: parsedIntent.transaction?.description || canonicalText,
        merchant: parsedIntent.transaction?.merchant || null,
        categoryHint: parsedIntent.transaction?.categoryHint || null,
        dateHint: parsedIntent.transaction?.date || null,
      });
      resultText = execution.summaryText;
      categoryAudit = execution.categoryAudit;
    } else if (parsedIntent.intent === 'create_income') {
      await logWhatsAppAssistantEvent({
        workspaceId: workspace.workspaceId,
        event: 'CATEGORY_RESOLUTION_START',
        payload: {
          messageId,
          intent: parsedIntent.intent,
          hint: parsedIntent.transaction?.categoryHint || parsedIntent.transaction?.description || canonicalText,
        },
      });

      const execution = await executeCreateIncome({
        ctx: { workspaceId: workspace.workspaceId, messageId, parsedText: canonicalText },
        amount: Number(parsedIntent.transaction?.amount || 0),
        description: parsedIntent.transaction?.description || canonicalText,
        merchant: parsedIntent.transaction?.merchant || null,
        categoryHint: parsedIntent.transaction?.categoryHint || null,
        dateHint: parsedIntent.transaction?.date || null,
      });
      resultText = execution.summaryText;
      categoryAudit = execution.categoryAudit;
    } else if (parsedIntent.intent === 'create_goal') {
      const execution = await executeCreateGoal({
        ctx: { workspaceId: workspace.workspaceId, messageId, parsedText: canonicalText },
        name: parsedIntent.goal?.name || 'Meta criada via WhatsApp',
        targetAmount: Number(parsedIntent.goal?.targetAmount || 0),
        deadlineHint: parsedIntent.goal?.deadlineHint || null,
      });
      resultText = execution.summaryText;
    } else if (parsedIntent.intent === 'contribute_goal') {
      const execution = await executeContributeGoal({
        ctx: { workspaceId: workspace.workspaceId, messageId, parsedText: canonicalText },
        goalHint: parsedIntent.goal?.name || canonicalText,
        contributionAmount: Number(parsedIntent.goal?.contributionAmount || 0),
      });
      resultText = execution.summaryText;
    } else if (parsedIntent.intent === 'create_investment') {
      const execution = await executeCreateInvestment({
        ctx: { workspaceId: workspace.workspaceId, messageId, parsedText: canonicalText },
        name: parsedIntent.investment?.name || canonicalText,
        amount: Number(parsedIntent.investment?.amount || 0),
        typeHint: parsedIntent.investment?.typeHint || null,
        institutionHint: parsedIntent.investment?.institutionHint || null,
        expectedReturnAnnual: parsedIntent.investment?.expectedReturnAnnual ?? null,
      });
      resultText = execution.summaryText;
    } else if (parsedIntent.intent === 'create_debt') {
      const execution = await executeCreateDebt({
        ctx: { workspaceId: workspace.workspaceId, messageId, parsedText: canonicalText },
        creditor: parsedIntent.debt?.creditor || canonicalText,
        amount: Number(parsedIntent.debt?.amount || 0),
        dueDateHint: parsedIntent.debt?.dueDateHint || null,
        dueDay: parsedIntent.debt?.dueDay ?? null,
        categoryHint: parsedIntent.debt?.categoryHint || null,
      });
      resultText = execution.summaryText;
    } else if (parsedIntent.intent === 'pay_debt') {
      const execution = await executePayDebt({
        ctx: { workspaceId: workspace.workspaceId, messageId, parsedText: canonicalText },
        creditorHint: parsedIntent.debt?.creditor || canonicalText,
        amount: Number(parsedIntent.debt?.amount || 0),
      });
      resultText = execution.summaryText;
    } else if (parsedIntent.intent === 'query_summary') {
      const execution = await executeQuerySummary({
        ctx: { workspaceId: workspace.workspaceId, messageId, parsedText: canonicalText },
        metric: parsedIntent.query?.metric || 'monthly_summary',
        categoryHint: parsedIntent.query?.categoryHint || null,
        goalHint: parsedIntent.query?.goalHint || null,
      });
      resultText = execution.summaryText;
    }

    if (categoryAudit && typeof categoryAudit === 'object') {
      const resolution = categoryAudit as { wasAutoCreated?: boolean; categoryId?: string; categoryName?: string; matchScore?: number; reason?: string };
      await logWhatsAppAssistantEvent({
        workspaceId: workspace.workspaceId,
        event: resolution.wasAutoCreated ? 'CATEGORY_AUTO_CREATED' : 'CATEGORY_MATCH_FOUND',
        payload: {
          messageId,
          intent: parsedIntent.intent,
          categoryId: resolution.categoryId || null,
          categoryName: resolution.categoryName || null,
          matchScore: resolution.matchScore ?? null,
          reason: resolution.reason || null,
        },
      });
    }

    await logWhatsAppAssistantEvent({
      workspaceId: workspace.workspaceId,
      event: 'ACTION_EXECUTION_SUCCESS',
      payload: {
        messageId,
        intent: parsedIntent.intent,
      },
    });
  } catch (error) {
    await logWhatsAppAssistantEvent({
      workspaceId: workspace.workspaceId,
      event: 'ACTION_EXECUTION_ERROR',
      payload: {
        messageId,
        intent: parsedIntent.intent,
        error: error instanceof Error ? error.message : String(error || 'unknown_error'),
      },
    });

    resultText = 'Não consegui concluir essa ação agora. Tente novamente com mais contexto e valor.';
  }

  await sendWhatsAppTextMessage({
    to: sender,
    text: resultText,
  });
  await logWhatsAppAssistantEvent({
    workspaceId: workspace.workspaceId,
    event: 'WHATSAPP_REPLY_TEXT_SENT',
    payload: {
      messageId,
      intent: parsedIntent.intent,
    },
  });

  const resolvedReplyMode = resolveReplyMode({
    persistedMode: persistedReplyMode,
    requestedMode: parsedIntent.replyModeRequested,
  });

  if (resolvedReplyMode === 'audio' || resolvedReplyMode === 'both') {
    const audio = await synthesizeAssistantAudio(resultText);
    if (audio) {
      await sendWhatsAppAudioMessage({
        to: sender,
        audioBuffer: audio.audioBuffer,
        mimeType: audio.mimeType,
        filename: audio.filename,
      });
      await logWhatsAppAssistantEvent({
        workspaceId: workspace.workspaceId,
        event: 'WHATSAPP_REPLY_AUDIO_SENT',
        payload: {
          messageId,
          intent: parsedIntent.intent,
          mode: resolvedReplyMode,
        },
      });
    }
  }

  return { handled: true };
}
