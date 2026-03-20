import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  getFriendlyWhatsAppErrorMessage,
  getWhatsAppConfig,
  isValidE164Phone,
  normalizeWhatsappPhone,
  sendWhatsAppTemplate,
  sendWhatsAppTextMessage,
  verifyWhatsAppConnection,
  WhatsAppApiError,
  WHATSAPP_CONFIG_MISSING_ERROR,
  WHATSAPP_VERIFY_TOKEN_MISSING_ERROR,
} from '@/lib/whatsapp';
import {
  DEFAULT_WHATSAPP_TEMPLATE_LANGUAGE,
  getWorkspaceWhatsAppConfig,
  resolveWorkspaceWhatsAppConfig,
  saveWorkspaceWhatsAppConfig,
} from '@/lib/server/whatsapp-config';
import { HttpError, getWorkspacePlan, logWorkspaceEventSafe, resolveWorkspaceContext } from '@/lib/server/multi-tenant';
import { sendWorkspaceWhatsAppDigest } from '@/lib/server/whatsapp-digest';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function hasWhatsAppPlanAccess(plan: string) {
  return plan === 'PRO' || plan === 'PREMIUM';
}

type WorkspaceWhatsAppAction = 'connect' | 'disconnect' | 'send_test' | 'save_config' | 'diagnose';

type WorkspaceWhatsAppBody = {
  action?: WorkspaceWhatsAppAction;
  phoneNumber?: string;
  testPhoneNumber?: string;
  connectTemplateName?: string;
  digestTemplateName?: string;
  templateLanguage?: string;
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
}

function normalizeOptionalString(value: unknown) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function getMetaSummary(error: unknown) {
  if (!(error instanceof WhatsAppApiError)) return null;
  return {
    status: error.status,
    category: error.category,
    message: error.message,
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

function classifyHttpStatus(error: unknown) {
  if (!(error instanceof WhatsAppApiError)) return 500;
  if (error.category === 'auth') return 403;
  if (error.category === 'template') return 404;
  if (error.category === 'rate_limit') return 429;
  if (error.category === 'temporary') return 503;
  return error.status || 500;
}

function shouldFallbackToText(error: unknown) {
  if (!(error instanceof WhatsAppApiError)) return false;

  if (error.category === 'template') return true;
  if (/template/i.test(error.message)) return true;

  return [131058, 132000, 132001, 132007, 132012].includes(error.metaCode ?? -1);
}

function buildValidationSummary(params: {
  connectTemplateName: string | null;
  digestTemplateName: string | null;
  templateLanguage: string;
  connectedPhoneNumber: string | null;
  testPhoneNumber: string | null;
}) {
  const issues: string[] = [];

  try {
    getWhatsAppConfig();
  } catch (error) {
    issues.push(error instanceof Error ? error.message : 'Credenciais do WhatsApp não configuradas.');
  }

  if (!params.templateLanguage) {
    issues.push('Idioma do template não configurado.');
  }

  if (!params.connectTemplateName) {
    issues.push('Nome do template de conexão não configurado.');
  }

  if (!params.digestTemplateName) {
    issues.push('Nome do template de resumo não configurado.');
  }

  if (!params.connectedPhoneNumber) {
    issues.push('Número conectado do WhatsApp não configurado para este workspace.');
  }

  if (params.connectedPhoneNumber && !isValidE164Phone(params.connectedPhoneNumber)) {
    issues.push('Número principal inválido. Use o formato internacional E.164.');
  }

  if (params.testPhoneNumber && !isValidE164Phone(params.testPhoneNumber)) {
    issues.push('Número de teste inválido. Use o formato internacional E.164.');
  }

  if (!params.testPhoneNumber && !params.connectedPhoneNumber) {
    issues.push('Número de destino para teste não configurado.');
  }

  return {
    ok: issues.length === 0,
    issues,
  };
}

function getWorkspaceConnectionState(params: {
  validationOk: boolean;
  workspaceStatus: string | null;
  lastConnectionState: string | null;
}) {
  if (!params.validationOk) return 'config_pending';
  if (params.workspaceStatus === 'CONNECTED') return 'connected';
  if (params.workspaceStatus === 'CONNECTING') return 'testing';
  if (params.lastConnectionState === 'error') return 'error';
  if (params.workspaceStatus === 'DISCONNECTED') return 'disconnected';
  return 'idle';
}

export async function POST(req: Request) {
  try {
    const context = await resolveWorkspaceContext(req);
    const body = ((await req.json().catch(() => ({}))) || {}) as WorkspaceWhatsAppBody;
    const action = body.action;

    if (!action || !['connect', 'disconnect', 'send_test', 'save_config', 'diagnose'].includes(action)) {
      return jsonResponse({ error: 'Ação do WhatsApp inválida.' }, 400);
    }

    const workspacePlan = await getWorkspacePlan(context.workspaceId, context.userId);
    const requiresPaidPlan = action !== 'disconnect';

    if (requiresPaidPlan && !hasWhatsAppPlanAccess(workspacePlan)) {
      return jsonResponse(
        {
          error: 'O WhatsApp está disponível apenas nos planos Pro e Premium.',
          currentPlan: workspacePlan,
          code: 'WHATSAPP_REQUIRES_PRO',
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

    const hasConfigFields =
      Object.prototype.hasOwnProperty.call(body, 'connectTemplateName') ||
      Object.prototype.hasOwnProperty.call(body, 'digestTemplateName') ||
      Object.prototype.hasOwnProperty.call(body, 'templateLanguage') ||
      Object.prototype.hasOwnProperty.call(body, 'testPhoneNumber');

    const workspaceConfig = hasConfigFields
      ? await saveWorkspaceWhatsAppConfig({
          workspaceId: context.workspaceId,
          userId: context.userId,
          connectTemplateName: normalizeOptionalString(body.connectTemplateName),
          digestTemplateName: normalizeOptionalString(body.digestTemplateName),
          templateLanguage: normalizeOptionalString(body.templateLanguage) ?? DEFAULT_WHATSAPP_TEMPLATE_LANGUAGE,
          testPhoneNumber: normalizeOptionalString(body.testPhoneNumber),
        })
      : persistedConfig;

    const normalizedPhone =
      typeof body.phoneNumber === 'string' && body.phoneNumber.trim()
        ? normalizeWhatsappPhone(body.phoneNumber)
        : currentWorkspace?.whatsapp_phone_number ?? null;

    const resolvedConfig = resolveWorkspaceWhatsAppConfig({
      workspaceConfig,
      connectedPhoneNumber: normalizedPhone,
    });

    const validation = buildValidationSummary({
      connectTemplateName: resolvedConfig.connectTemplateName,
      digestTemplateName: resolvedConfig.digestTemplateName,
      templateLanguage: resolvedConfig.templateLanguage,
      connectedPhoneNumber: normalizedPhone,
      testPhoneNumber: resolvedConfig.testPhoneNumber,
    });

    const diagnosticBase = {
      templateConfigured: resolvedConfig.digestTemplateName,
      connectTemplateConfigured: resolvedConfig.connectTemplateName,
      idiomaConfigurado: resolvedConfig.templateLanguage,
      destinoTeste: resolvedConfig.testPhoneNumber,
      numeroConectado: normalizedPhone,
      connectionState: getWorkspaceConnectionState({
        validationOk: validation.ok,
        workspaceStatus: currentWorkspace?.whatsapp_status ?? null,
        lastConnectionState: resolvedConfig.lastConnectionState,
      }),
      lastValidatedAt: resolvedConfig.lastValidatedAt,
      lastTestSentAt: resolvedConfig.lastTestSentAt,
      lastErrorMessage: resolvedConfig.lastErrorMessage,
      validationResult: validation.ok ? 'OK' : 'ERRO',
      validationIssues: validation.issues,
      configSources: {
        connectTemplateName: resolvedConfig.connectTemplateNameSource,
        digestTemplateName: resolvedConfig.digestTemplateNameSource,
        templateLanguage: resolvedConfig.templateLanguageSource,
        testPhoneNumber: resolvedConfig.testPhoneNumberSource,
      },
    };

    if (action === 'save_config') {
      if (body.phoneNumber && !isValidE164Phone(body.phoneNumber)) {
        return jsonResponse(
          {
            error: 'Número inválido. Use o formato internacional E.164, por exemplo: +5511999999999.',
            diagnostic: diagnosticBase,
          },
          400
        );
      }

      if (body.testPhoneNumber && !isValidE164Phone(body.testPhoneNumber)) {
        return jsonResponse(
          {
            error: 'Número de teste inválido. Use o formato internacional E.164, por exemplo: +5511999999999.',
            diagnostic: diagnosticBase,
          },
          400
        );
      }

      const updatedConfig = await saveWorkspaceWhatsAppConfig({
        workspaceId: context.workspaceId,
        userId: context.userId,
        lastConnectionState: validation.ok ? 'disconnected' : 'config_pending',
        lastErrorMessage: validation.ok ? null : validation.issues[0] ?? null,
        lastErrorCategory: validation.ok ? null : 'validation',
        pendingConnection: null,
      });

      return jsonResponse({
        success: true,
        message: 'Configuração do WhatsApp salva com sucesso.',
        config: updatedConfig,
        diagnostic: diagnosticBase,
      });
    }

    if (action === 'diagnose') {
      try {
        const metaHealth = await verifyWhatsAppConnection();
        const updatedConfig = await saveWorkspaceWhatsAppConfig({
          workspaceId: context.workspaceId,
          userId: context.userId,
          lastConnectionState: validation.ok ? 'disconnected' : 'config_pending',
          lastErrorMessage: validation.ok ? null : validation.issues[0] ?? null,
          lastErrorCategory: validation.ok ? null : 'validation',
          lastValidatedAt: new Date().toISOString(),
        });

        return jsonResponse({
          success: validation.ok,
          message: validation.ok
            ? 'Configuração validada e autenticação com a Meta confirmada.'
            : 'A autenticação com a Meta foi validada, mas ainda há ajustes pendentes neste workspace.',
          config: updatedConfig,
          diagnostic: {
            ...diagnosticBase,
            lastValidatedAt: updatedConfig.lastValidatedAt,
            metaResult: metaHealth.verifiedName
              ? `Conta autenticada com sucesso na Meta (${metaHealth.verifiedName}).`
              : 'Conta autenticada com sucesso na Meta.',
          },
        });
      } catch (error) {
        const friendlyMessage = getFriendlyWhatsAppErrorMessage(error);
        console.error('WHATSAPP_CONNECT_FAILED', {
          workspaceId: context.workspaceId,
          stage: 'health_check',
          to: normalizedPhone,
          phoneNumberId,
          error: friendlyMessage,
          meta: getMetaSummary(error),
        });
        const updatedConfig = await saveWorkspaceWhatsAppConfig({
          workspaceId: context.workspaceId,
          userId: context.userId,
          lastConnectionState: 'error',
          lastErrorMessage: friendlyMessage,
          lastErrorCategory: error instanceof WhatsAppApiError ? error.category : 'unknown',
          lastValidatedAt: new Date().toISOString(),
        });

        return jsonResponse(
          {
            error: friendlyMessage,
            config: updatedConfig,
            diagnostic: {
              ...diagnosticBase,
              connectionState: 'error',
              lastValidatedAt: updatedConfig.lastValidatedAt,
              lastErrorMessage: updatedConfig.lastErrorMessage,
              metaResult: getMetaSummary(error),
            },
          },
          classifyHttpStatus(error)
        );
      }
    }

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
            error: 'Número de WhatsApp inválido. Use o formato internacional E.164, por exemplo: +5511999999999.',
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
            error: 'O número de destino informado é igual ao phone_number_id da Meta. Informe o telefone do usuário em formato E.164.',
            diagnostic: {
              ...diagnosticBase,
              numeroConectado: normalizedPhone,
            },
          },
          400
        );
      }

      console.log('WHATSAPP_CONNECT_START', {
        workspaceId: context.workspaceId,
        userId: context.userId,
        to: normalizedPhone,
        templateName: resolvedConfig.connectTemplateName,
        languageCode: resolvedConfig.templateLanguage,
        phoneNumberId,
      });

      try {
        await verifyWhatsAppConnection();
      } catch (error) {
        const friendlyMessage = getFriendlyWhatsAppErrorMessage(error);
        const updatedConfig = await saveWorkspaceWhatsAppConfig({
          workspaceId: context.workspaceId,
          userId: context.userId,
          lastConnectionState: 'error',
          lastErrorMessage: friendlyMessage,
          lastErrorCategory: error instanceof WhatsAppApiError ? error.category : 'unknown',
          lastValidatedAt: new Date().toISOString(),
          pendingConnection: null,
        });

        await prisma.workspace.update({
          where: { id: context.workspaceId },
          data: {
            whatsapp_status: 'DISCONNECTED',
          },
        });

        return jsonResponse(
          {
            error: friendlyMessage,
            config: updatedConfig,
            diagnostic: {
              ...diagnosticBase,
              connectionState: 'error',
              lastValidatedAt: updatedConfig.lastValidatedAt,
              lastErrorMessage: updatedConfig.lastErrorMessage,
              metaResult: getMetaSummary(error),
            },
          },
          classifyHttpStatus(error)
        );
      }

      await prisma.workspace.update({
        where: { id: context.workspaceId },
        data: {
          whatsapp_phone_number: normalizedPhone,
          whatsapp_status: 'CONNECTING',
          whatsapp_connected_at: null,
        },
      });

      const activeWorkspaceName =
        context.workspaces.find((workspace) => workspace.id === context.workspaceId)?.name || 'Meu Workspace';

      try {
        let deliveryMode: 'template' | 'text' = 'text';
        let sentTemplateName: string | null = null;
        let metaResponse: unknown = null;

        if (resolvedConfig.connectTemplateName) {
          try {
            console.log('WHATSAPP_CONNECT_PAYLOAD_READY', {
              workspaceId: context.workspaceId,
              source: 'template',
              to: normalizedPhone,
              phoneNumberId,
              templateName: resolvedConfig.connectTemplateName,
              languageCode: resolvedConfig.templateLanguage,
              parameterCount: 1,
            });
            metaResponse = await sendWhatsAppTemplate({
              to: normalizedPhone,
              templateName: resolvedConfig.connectTemplateName,
              languageCode: resolvedConfig.templateLanguage,
              variables: [activeWorkspaceName],
            });
            deliveryMode = 'template';
            sentTemplateName = resolvedConfig.connectTemplateName;
          } catch (error) {
            if (!shouldFallbackToText(error)) {
              throw error;
            }

            console.log('WHATSAPP_CONNECT_PAYLOAD_READY', {
              workspaceId: context.workspaceId,
              source: 'text-fallback',
              to: normalizedPhone,
              phoneNumberId,
              templateName: resolvedConfig.connectTemplateName,
              languageCode: resolvedConfig.templateLanguage,
            });
            metaResponse = await sendWhatsAppTextMessage({
              to: normalizedPhone,
              text: `Atualização da conta: este número foi vinculado à sua conta do Cote Finance AI no workspace ${activeWorkspaceName}.`,
            });
            deliveryMode = 'text';
            sentTemplateName = null;
          }
        } else {
          console.log('WHATSAPP_CONNECT_PAYLOAD_READY', {
            workspaceId: context.workspaceId,
            source: 'text',
            to: normalizedPhone,
            phoneNumberId,
            templateName: null,
            languageCode: null,
          });
          metaResponse = await sendWhatsAppTextMessage({
            to: normalizedPhone,
            text: `Atualização da conta: este número foi vinculado à sua conta do Cote Finance AI no workspace ${activeWorkspaceName}.`,
          });
        }

        const acceptance = extractMetaMessageAcceptance(metaResponse);
        const connectMessageId = acceptance.messageIds[0] ?? null;

        console.log('WHATSAPP_CONNECT_META_RESPONSE', {
          workspaceId: context.workspaceId,
          accepted: true,
          httpStatus: 200,
          to: normalizedPhone,
          phoneNumberId,
          templateName: sentTemplateName,
          languageCode: sentTemplateName ? resolvedConfig.templateLanguage : null,
          deliveryMode,
          messageId: connectMessageId,
          messageIds: acceptance.messageIds,
        });

        await logWorkspaceEventSafe({
          workspaceId: context.workspaceId,
          userId: context.userId,
          type: 'whatsapp.connect.requested',
          payload: {
            phoneNumber: normalizedPhone,
            templateName: sentTemplateName,
            languageCode: sentTemplateName ? resolvedConfig.templateLanguage : null,
            deliveryMode,
            metaAccepted: true,
            messageId: connectMessageId,
            messageIds: acceptance.messageIds,
            contactWaIds: acceptance.contactWaIds,
          },
        });

        const updatedConfig = await saveWorkspaceWhatsAppConfig({
          workspaceId: context.workspaceId,
          userId: context.userId,
          lastConnectionState: 'testing',
          lastErrorMessage: null,
          lastErrorCategory: null,
          lastValidatedAt: new Date().toISOString(),
          pendingConnection: {
            messageId: connectMessageId,
            phoneNumber: normalizedPhone,
            templateName: sentTemplateName,
            languageCode: sentTemplateName ? resolvedConfig.templateLanguage : null,
            deliveryMode,
            requestedAt: new Date().toISOString(),
          },
        });

        return jsonResponse({
          success: true,
          message: 'Solicitação enviada. A conexão será confirmada quando a Meta retornar delivered/read no webhook.',
          status: 'CONNECTING',
          phoneNumber: normalizedPhone,
          config: updatedConfig,
          diagnostic: {
            ...diagnosticBase,
            numeroConectado: normalizedPhone,
            connectionState: 'testing',
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
        const friendlyMessage = getFriendlyWhatsAppErrorMessage(error);
        const metaSummary = getMetaSummary(error);
        console.error('WHATSAPP_CONNECT_META_RESPONSE', {
          workspaceId: context.workspaceId,
          accepted: false,
          httpStatus: metaSummary?.status ?? null,
          to: normalizedPhone,
          phoneNumberId,
          templateName: resolvedConfig.connectTemplateName,
          languageCode: resolvedConfig.templateLanguage,
          error: metaSummary?.message || friendlyMessage,
          meta: metaSummary,
        });
        console.error('WHATSAPP_CONNECT_FAILED', {
          workspaceId: context.workspaceId,
          stage: 'send_message',
          to: normalizedPhone,
          phoneNumberId,
          error: friendlyMessage,
          meta: metaSummary,
        });

        const updatedConfig = await saveWorkspaceWhatsAppConfig({
          workspaceId: context.workspaceId,
          userId: context.userId,
          lastConnectionState: 'error',
          lastErrorMessage: friendlyMessage,
          lastErrorCategory: error instanceof WhatsAppApiError ? error.category : 'unknown',
          lastValidatedAt: new Date().toISOString(),
          pendingConnection: null,
        });

        await prisma.workspace.update({
          where: { id: context.workspaceId },
          data: {
            whatsapp_phone_number: normalizedPhone,
            whatsapp_status: 'DISCONNECTED',
            whatsapp_connected_at: null,
          },
        });

        return jsonResponse(
          {
            error: friendlyMessage,
            config: updatedConfig,
            diagnostic: {
              ...diagnosticBase,
              numeroConectado: normalizedPhone,
              connectionState: 'error',
              lastValidatedAt: updatedConfig.lastValidatedAt,
              lastErrorMessage: updatedConfig.lastErrorMessage,
              metaResult: metaSummary,
            },
          },
          classifyHttpStatus(error)
        );
      }
    }

    if (!normalizedPhone) {
      return jsonResponse(
        {
          error: 'Conecte o WhatsApp do workspace antes de enviar um teste.',
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
        destinationOverride: resolvedConfig.testPhoneNumber || normalizedPhone,
        resolvedConfig,
      });

      if (!result.sent) {
        const status =
          result.reason === 'not_connected'
            ? 400
            : result.reason === 'workspace_not_found'
            ? 404
            : 409;

        return jsonResponse(
          {
            error:
              result.reason === 'not_connected'
                ? 'Conecte o WhatsApp deste workspace antes de enviar um teste.'
                : result.reason === 'no_content'
                ? 'Ainda não há dados suficientes para montar um resumo de teste.'
                : 'Não foi possível enviar o teste agora.',
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
              ? `Template ${resolvedConfig.digestTemplateName} enviado com sucesso.`
              : 'Mensagem de texto de teste enviada com sucesso.',
        },
      });
    } catch (error) {
      const friendlyMessage = getFriendlyWhatsAppErrorMessage(error);
      const updatedConfig = await saveWorkspaceWhatsAppConfig({
        workspaceId: context.workspaceId,
        userId: context.userId,
        lastConnectionState: 'error',
        lastErrorMessage: friendlyMessage,
        lastErrorCategory: error instanceof WhatsAppApiError ? error.category : 'unknown',
      });

      return jsonResponse(
        {
          error: friendlyMessage,
          config: updatedConfig,
          diagnostic: {
            ...diagnosticBase,
            connectionState: 'error',
            lastErrorMessage: updatedConfig.lastErrorMessage,
            metaResult: getMetaSummary(error),
          },
        },
        classifyHttpStatus(error)
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

