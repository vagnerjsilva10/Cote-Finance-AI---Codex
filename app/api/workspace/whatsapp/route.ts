import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  getUserFacingWhatsAppError,
  getWhatsAppConfig,
  isValidE164Phone,
  normalizeWhatsappPhone,
  sendWhatsAppTemplate,
  verifyWhatsAppConnection,
  WhatsAppApiError,
  WHATSAPP_CONFIG_MISSING_ERROR,
  WHATSAPP_TEMPLATES,
  WHATSAPP_VERIFY_TOKEN_MISSING_ERROR,
} from '@/lib/whatsapp';
import {
  getWorkspaceWhatsAppConfig,
  resolveWorkspaceWhatsAppConfig,
  saveWorkspaceWhatsAppConfig,
} from '@/lib/server/whatsapp-config';
import {
  getWhatsAppCapabilityPolicy,
  hasWhatsAppCapability,
  type WhatsAppCapability,
} from '@/lib/server/whatsapp-capabilities';
import { HttpError, getWorkspacePlan, logWorkspaceEventSafe, resolveWorkspaceContext } from '@/lib/server/multi-tenant';
import { sendWorkspaceWhatsAppDigest } from '@/lib/server/whatsapp-digest';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type WorkspaceWhatsAppAction = 'connect' | 'disconnect' | 'send_test';

type WorkspaceWhatsAppBody = {
  action?: WorkspaceWhatsAppAction;
  phoneNumber?: string;
};

const REQUIRED_CAPABILITY_BY_ACTION: Partial<Record<WorkspaceWhatsAppAction, WhatsAppCapability>> = {
  connect: 'connect',
  send_test: 'manual_test_send',
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
}

function getMetaSummary(error: unknown) {
  if (!(error instanceof WhatsAppApiError)) return null;
  return {
    status: error.status,
    category: error.category,
    message: error.message,
    metaCode: error.metaCode ?? null,
    metaSubcode: error.metaSubcode ?? null,
    fbtraceId: error.fbtraceId ?? null,
    templateName: error.templateName ?? null,
    languageCode: error.languageCode ?? null,
    destination: error.destination,
  };
}

function extractMetaMessageAcceptance(payload: unknown) {
  const result = {
    messageIds: [] as string[],
    contactWaIds: [] as string[],
  };

  if (!payload || typeof payload !== 'object') return result;
  const value = payload as Record<string, unknown>;
  const messages = Array.isArray(value.messages) ? value.messages : [];
  const contacts = Array.isArray(value.contacts) ? value.contacts : [];

  for (const item of messages) {
    if (!item || typeof item !== 'object') continue;
    const id = (item as Record<string, unknown>).id;
    if (typeof id === 'string' && id.trim()) {
      result.messageIds.push(id.trim());
    }
  }

  for (const item of contacts) {
    if (!item || typeof item !== 'object') continue;
    const waId = (item as Record<string, unknown>).wa_id;
    if (typeof waId === 'string' && waId.trim()) {
      result.contactWaIds.push(waId.trim());
    }
  }

  return result;
}

function normalizeWorkspaceConnectionState(params: {
  workspaceStatus: string | null;
  lastConnectionState: string | null;
}) {
  if (params.workspaceStatus === 'CONNECTING') return 'connecting';
  if (params.workspaceStatus === 'CONNECTED') return 'connected';
  if (params.lastConnectionState === 'failed' || params.lastConnectionState === 'error') return 'failed';
  if (params.workspaceStatus === 'DISCONNECTED') return 'disconnected';
  return 'idle';
}

export async function POST(req: Request) {
  try {
    const context = await resolveWorkspaceContext(req);
    const body = ((await req.json().catch(() => ({}))) || {}) as WorkspaceWhatsAppBody;
    const action = body.action;

    if (!action || !['connect', 'disconnect', 'send_test'].includes(action)) {
      return jsonResponse({ error: 'Ação do WhatsApp inválida.' }, 400);
    }

    const workspacePlan = await getWorkspacePlan(context.workspaceId, context.userId);
    const requiredCapability = REQUIRED_CAPABILITY_BY_ACTION[action];

    if (requiredCapability && !hasWhatsAppCapability(workspacePlan, requiredCapability)) {
      const policy = getWhatsAppCapabilityPolicy(requiredCapability);
      return jsonResponse(
        {
          error: policy.message,
          currentPlan: workspacePlan,
          requiredPlan: policy.requiredPlan,
          code: policy.code,
        },
        403
      );
    }

    const currentWorkspace = await prisma.workspace.findUnique({
      where: { id: context.workspaceId },
      select: {
        whatsapp_phone_number: true,
        whatsapp_status: true,
      },
    });

    const persistedConfig = await getWorkspaceWhatsAppConfig(context.workspaceId);

    const normalizedPhone =
      typeof body.phoneNumber === 'string' && body.phoneNumber.trim()
        ? normalizeWhatsappPhone(body.phoneNumber)
        : currentWorkspace?.whatsapp_phone_number ?? null;

    const resolvedConfig = resolveWorkspaceWhatsAppConfig({
      workspaceConfig: persistedConfig,
      connectedPhoneNumber: normalizedPhone,
    });

    const diagnosticBase = {
      numeroConectado: normalizedPhone,
      connectionState: normalizeWorkspaceConnectionState({
        workspaceStatus: currentWorkspace?.whatsapp_status ?? null,
        lastConnectionState: resolvedConfig.lastConnectionState,
      }),
      lastValidatedAt: resolvedConfig.lastValidatedAt,
      lastTestSentAt: resolvedConfig.lastTestSentAt,
      lastErrorMessage: resolvedConfig.lastErrorMessage,
    };

    if (action === 'disconnect') {
      const updatedConfig = await saveWorkspaceWhatsAppConfig({
        workspaceId: context.workspaceId,
        userId: context.userId,
        lastConnectionState: 'disconnected',
        lastErrorMessage: null,
        lastErrorCategory: null,
        pendingConnection: null,
      });

      await prisma.workspace.update({
        where: { id: context.workspaceId },
        data: {
          whatsapp_phone_number: null,
          whatsapp_status: 'DISCONNECTED',
          whatsapp_connected_at: null,
        },
      });

      await logWorkspaceEventSafe({
        workspaceId: context.workspaceId,
        userId: context.userId,
        type: 'whatsapp.disconnected',
      });

      return jsonResponse({
        success: true,
        message: 'WhatsApp desconectado com sucesso.',
        status: 'DISCONNECTED',
        config: updatedConfig,
        phoneNumber: null,
        diagnostic: {
          ...diagnosticBase,
          numeroConectado: null,
          connectionState: 'disconnected',
          lastErrorMessage: null,
        },
      });
    }

    if (action === 'connect') {
      if (!normalizedPhone) {
        return jsonResponse(
          {
            error: 'Informe um número válido para conectar o WhatsApp.',
            diagnostic: diagnosticBase,
          },
          400
        );
      }

      if (!isValidE164Phone(normalizedPhone)) {
        return jsonResponse(
          {
            error: 'Número inválido. Verifique o formato com DDD.',
            diagnostic: diagnosticBase,
          },
          400
        );
      }

      let phoneNumberId: string | null = null;
      try {
        phoneNumberId = getWhatsAppConfig().phoneNumberId;
      } catch {
        phoneNumberId = null;
      }

      if (phoneNumberId && normalizedPhone === phoneNumberId) {
        return jsonResponse(
          {
            error: 'Número inválido. Verifique o formato com DDD.',
            diagnostic: {
              ...diagnosticBase,
              numeroConectado: normalizedPhone,
            },
          },
          400
        );
      }

      // Idempotência: evita novo envio/template quando já está conectado no mesmo número.
      if (
        currentWorkspace?.whatsapp_status === 'CONNECTED' &&
        currentWorkspace?.whatsapp_phone_number === normalizedPhone
      ) {
        const updatedConfig = await saveWorkspaceWhatsAppConfig({
          workspaceId: context.workspaceId,
          userId: context.userId,
          lastConnectionState: 'connected',
          lastErrorMessage: null,
          lastErrorCategory: null,
          lastValidatedAt: new Date().toISOString(),
        });

        return jsonResponse({
          success: true,
          message: 'WhatsApp já está conectado neste número.',
          status: 'CONNECTED',
          phoneNumber: normalizedPhone,
          config: updatedConfig,
          diagnostic: {
            ...diagnosticBase,
            numeroConectado: normalizedPhone,
            connectionState: 'connected',
            lastValidatedAt: updatedConfig.lastValidatedAt,
            lastErrorMessage: null,
            metaResult: null,
          },
        });
      }

      try {
        await verifyWhatsAppConnection();
      } catch (error) {
        const userError = getUserFacingWhatsAppError(error);
        const updatedConfig = await saveWorkspaceWhatsAppConfig({
          workspaceId: context.workspaceId,
          userId: context.userId,
          lastConnectionState: 'failed',
          lastErrorMessage: userError.message,
          lastErrorCategory: error instanceof WhatsAppApiError ? error.category : 'unknown',
          lastValidatedAt: new Date().toISOString(),
          pendingConnection: null,
        });

        return jsonResponse(
          {
            error: userError.message,
            config: updatedConfig,
            diagnostic: {
              ...diagnosticBase,
              numeroConectado: normalizedPhone,
              connectionState: 'failed',
              lastValidatedAt: updatedConfig.lastValidatedAt,
              lastErrorMessage: updatedConfig.lastErrorMessage,
              metaResult: null,
            },
          },
          userError.status
        );
      }

      await prisma.workspace.update({
        where: { id: context.workspaceId },
        data: {
          whatsapp_phone_number: normalizedPhone,
          whatsapp_status: 'CONNECTED',
          whatsapp_connected_at: new Date(),
        },
      });

      await saveWorkspaceWhatsAppConfig({
        workspaceId: context.workspaceId,
        userId: context.userId,
        lastConnectionState: 'connected',
        lastErrorMessage: null,
        lastErrorCategory: null,
        lastValidatedAt: new Date().toISOString(),
        pendingConnection: null,
      });

      const activeWorkspaceName =
        context.workspaces.find((workspace) => workspace.id === context.workspaceId)?.name || 'Meu Workspace';

      try {
        const metaResponse = await sendWhatsAppTemplate({
          to: normalizedPhone,
          templateName: WHATSAPP_TEMPLATES.CONNECT.name,
          languageCode: WHATSAPP_TEMPLATES.CONNECT.language,
          variables: [activeWorkspaceName],
        });

        const acceptance = extractMetaMessageAcceptance(metaResponse);
        const connectMessageId = acceptance.messageIds[0] ?? null;

        await logWorkspaceEventSafe({
          workspaceId: context.workspaceId,
          userId: context.userId,
          type: 'whatsapp.connect.requested',
          payload: {
            phoneNumber: normalizedPhone,
            templateName: WHATSAPP_TEMPLATES.CONNECT.name,
            languageCode: WHATSAPP_TEMPLATES.CONNECT.language,
            deliveryMode: 'template',
            metaAccepted: true,
            messageId: connectMessageId,
            messageIds: acceptance.messageIds,
            contactWaIds: acceptance.contactWaIds,
          },
        });

        const updatedConfig = await saveWorkspaceWhatsAppConfig({
          workspaceId: context.workspaceId,
          userId: context.userId,
          lastConnectionState: 'connected',
          lastErrorMessage: null,
          lastErrorCategory: null,
          lastValidatedAt: new Date().toISOString(),
          pendingConnection: null,
        });

        return jsonResponse({
          success: true,
          message: 'WhatsApp conectado com sucesso.',
          status: 'CONNECTED',
          phoneNumber: normalizedPhone,
          config: updatedConfig,
          diagnostic: {
            ...diagnosticBase,
            numeroConectado: normalizedPhone,
            connectionState: 'connected',
            lastValidatedAt: updatedConfig.lastValidatedAt,
            lastErrorMessage: null,
            metaResult: {
              accepted: true,
              httpStatus: 200,
              messageId: connectMessageId,
              messageIds: acceptance.messageIds,
              to: normalizedPhone,
              phoneNumberId,
            },
          },
        });
      } catch (error) {
        const userError = getUserFacingWhatsAppError(error);
        const metaSummary = getMetaSummary(error);
        const warningMessage =
          'WhatsApp conectado com sucesso, mas nao foi possivel enviar a mensagem de confirmacao agora.';

        if (userError.shouldLogInternalDetailsOnly) {
          console.error('WHATSAPP_TEMPLATE_INTERNAL_ERROR', {
            workspaceId: context.workspaceId,
            to: normalizedPhone,
            phoneNumberId,
            meta: metaSummary,
          });
        }

        console.error('WHATSAPP_CONNECT_FAILED', {
          workspaceId: context.workspaceId,
          stage: 'send_message',
          to: normalizedPhone,
          phoneNumberId,
          error: userError.message,
          meta: metaSummary,
        });

        await logWorkspaceEventSafe({
          workspaceId: context.workspaceId,
          userId: context.userId,
          type: 'whatsapp.connect.welcome_failed',
          payload: {
            phoneNumber: normalizedPhone,
            templateName: WHATSAPP_TEMPLATES.CONNECT.name,
            languageCode: WHATSAPP_TEMPLATES.CONNECT.language,
            userFacingCode: userError.code,
            userFacingStatus: userError.status,
            shouldLogInternalDetailsOnly: userError.shouldLogInternalDetailsOnly,
            meta: metaSummary,
          },
        });

        const updatedConfig = await saveWorkspaceWhatsAppConfig({
          workspaceId: context.workspaceId,
          userId: context.userId,
          lastConnectionState: 'connected',
          lastErrorMessage: userError.message,
          lastErrorCategory: error instanceof WhatsAppApiError ? error.category : 'unknown',
          lastValidatedAt: new Date().toISOString(),
          pendingConnection: null,
        });

        return jsonResponse({
          success: true,
          warning: warningMessage,
          warningDetails: userError.message,
          status: 'CONNECTED',
          phoneNumber: normalizedPhone,
          config: updatedConfig,
          diagnostic: {
            ...diagnosticBase,
            numeroConectado: normalizedPhone,
            connectionState: 'connected',
            lastValidatedAt: updatedConfig.lastValidatedAt,
            lastErrorMessage: updatedConfig.lastErrorMessage,
            metaResult: userError.shouldLogInternalDetailsOnly ? null : metaSummary,
          },
        });
      }
    }

    if (!normalizedPhone) {
      return jsonResponse(
        {
          error: 'Conecte o WhatsApp antes de enviar um teste.',
          diagnostic: diagnosticBase,
        },
        400
      );
    }

    try {
      const result = await sendWorkspaceWhatsAppDigest({
        workspaceId: context.workspaceId,
        force: true,
        source: 'manual',
        destinationOverride: normalizedPhone,
        resolvedConfig,
      });

      if (!result.sent) {
        const status =
          result.reason === 'plan_not_eligible'
            ? 403
            : result.reason === 'not_connected'
              ? 400
              : result.reason === 'workspace_not_found'
                ? 404
                : 409;

        const policy = getWhatsAppCapabilityPolicy('manual_test_send');
        const errorMessage =
          result.reason === 'plan_not_eligible'
            ? policy.message
            : result.reason === 'not_connected'
              ? 'Conecte o WhatsApp antes de enviar um teste.'
              : result.reason === 'no_content'
                ? 'Ainda não há dados suficientes para montar um resumo de teste.'
                : 'Não foi possível enviar o teste agora.';

        return jsonResponse(
          {
            error: errorMessage,
            code: result.reason === 'plan_not_eligible' ? policy.code : undefined,
            requiredPlan: result.reason === 'plan_not_eligible' ? policy.requiredPlan : undefined,
            diagnostic: {
              ...diagnosticBase,
              metaResult: null,
            },
          },
          status
        );
      }

      const updatedConfig = await saveWorkspaceWhatsAppConfig({
        workspaceId: context.workspaceId,
        userId: context.userId,
        lastConnectionState: 'connected',
        lastErrorMessage: null,
        lastErrorCategory: null,
        lastTestSentAt: new Date().toISOString(),
      });

      return jsonResponse({
        success: true,
        message: 'Teste do WhatsApp enviado com sucesso.',
        config: updatedConfig,
        preview: result.preview,
        deliveryMode: result.deliveryMode,
        diagnostic: {
          ...diagnosticBase,
          connectionState: 'connected',
          lastTestSentAt: updatedConfig.lastTestSentAt,
          lastErrorMessage: null,
          metaResult:
            result.deliveryMode === 'template'
              ? 'Mensagem de teste enviada com sucesso.'
              : 'Mensagem de texto de teste enviada com sucesso.',
        },
      });
    } catch (error) {
      const userError = getUserFacingWhatsAppError(error);
      const keepConnectedState = currentWorkspace?.whatsapp_status === 'CONNECTED';
      const nextConnectionState = keepConnectedState ? 'connected' : 'failed';
      const updatedConfig = await saveWorkspaceWhatsAppConfig({
        workspaceId: context.workspaceId,
        userId: context.userId,
        lastConnectionState: nextConnectionState,
        lastErrorMessage: userError.message,
        lastErrorCategory: error instanceof WhatsAppApiError ? error.category : 'unknown',
      });

      return jsonResponse(
        {
          error: userError.message,
          config: updatedConfig,
          diagnostic: {
            ...diagnosticBase,
            connectionState: nextConnectionState,
            lastErrorMessage: updatedConfig.lastErrorMessage,
            metaResult: null,
          },
        },
        userError.status
      );
    }
  } catch (error: unknown) {
    if (error instanceof HttpError) {
      return jsonResponse({ error: error.message }, error.status);
    }

    console.error('WhatsApp workspace route error:', error);

    if (
      error instanceof Error &&
      (error.message === WHATSAPP_CONFIG_MISSING_ERROR ||
        error.message === WHATSAPP_VERIFY_TOKEN_MISSING_ERROR)
    ) {
      return jsonResponse({ error: error.message }, 500);
    }

    return jsonResponse(
      {
        error: error instanceof Error ? error.message : 'Falha ao processar a integração do WhatsApp.',
      },
      500
    );
  }
}
