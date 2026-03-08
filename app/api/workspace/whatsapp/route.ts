import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  getFriendlyWhatsAppErrorMessage,
  getWhatsAppConfig,
  normalizeWhatsappPhone,
  sendWhatsAppTemplateMessage,
  sendWhatsAppTextMessage,
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
import { HttpError, logWorkspaceEventSafe, resolveWorkspaceContext } from '@/lib/server/multi-tenant';
import { sendWorkspaceWhatsAppDigest } from '@/lib/server/whatsapp-digest';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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
    phoneNumberId: error.phoneNumberId,
  };
}

function classifyHttpStatus(error: unknown) {
  if (!(error instanceof WhatsAppApiError)) return 500;
  if (error.category === 'auth') return 403;
  if (error.category === 'template') return 404;
  if (error.category === 'rate_limit') return 429;
  if (error.category === 'temporary') return 503;
  return error.status || 500;
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

  if (!params.testPhoneNumber && !params.connectedPhoneNumber) {
    issues.push('Número de destino para teste não configurado.');
  }

  return {
    ok: issues.length === 0,
    issues,
  };
}

export async function POST(req: Request) {
  try {
    const context = await resolveWorkspaceContext(req);
    const body = ((await req.json().catch(() => ({}))) || {}) as WorkspaceWhatsAppBody;
    const action = body.action;

    if (!action || !['connect', 'disconnect', 'send_test', 'save_config', 'diagnose'].includes(action)) {
      return jsonResponse({ error: 'Ação do WhatsApp inválida.' }, 400);
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
      phoneNumberId: (() => {
        try {
          return getWhatsAppConfig().phoneNumberId;
        } catch {
          return null;
        }
      })(),
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
      return jsonResponse({
        success: true,
        message: 'Configuração do WhatsApp salva com sucesso.',
        config: workspaceConfig,
        diagnostic: diagnosticBase,
      });
    }

    if (action === 'diagnose') {
      return jsonResponse({
        success: validation.ok,
        message: validation.ok
          ? 'Configuração do WhatsApp validada com sucesso.'
          : 'Revise a configuração do WhatsApp antes de testar o envio.',
        config: workspaceConfig,
        diagnostic: {
          ...diagnosticBase,
          metaResult: null,
        },
      });
    }

    if (action === 'disconnect') {
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
        diagnostic: {
          ...diagnosticBase,
          numeroConectado: null,
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

      if (normalizedPhone.length < 12 || normalizedPhone.length > 15) {
        return jsonResponse(
          {
            error: 'Número de WhatsApp inválido. Use DDI e DDD, por exemplo: 5511999999999.',
            diagnostic: diagnosticBase,
          },
          400
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
        if (resolvedConfig.connectTemplateName) {
          await sendWhatsAppTemplateMessage({
            to: normalizedPhone,
            name: resolvedConfig.connectTemplateName,
            languageCode: resolvedConfig.templateLanguage,
            bodyParameters: [activeWorkspaceName],
          });
        } else {
          await sendWhatsAppTextMessage({
            to: normalizedPhone,
            text: `Atualização da conta: este número foi vinculado à sua conta do Cote Finance AI no workspace ${activeWorkspaceName}.`,
          });
        }

        await prisma.workspace.update({
          where: { id: context.workspaceId },
          data: {
            whatsapp_phone_number: normalizedPhone,
            whatsapp_status: 'CONNECTED',
            whatsapp_connected_at: new Date(),
          },
        });

        await logWorkspaceEventSafe({
          workspaceId: context.workspaceId,
          userId: context.userId,
          type: 'whatsapp.connected',
          payload: {
            phoneNumber: normalizedPhone,
            templateName: resolvedConfig.connectTemplateName,
            languageCode: resolvedConfig.templateLanguage,
          },
        });

        return jsonResponse({
          success: true,
          message: 'WhatsApp conectado com sucesso.',
          status: 'CONNECTED',
          phoneNumber: normalizedPhone,
          diagnostic: {
            ...diagnosticBase,
            numeroConectado: normalizedPhone,
            metaResult: resolvedConfig.connectTemplateName
              ? 'Template de conexão enviado com sucesso.'
              : 'Mensagem de texto de conexão enviada com sucesso.',
          },
        });
      } catch (error) {
        await prisma.workspace.update({
          where: { id: context.workspaceId },
          data: {
            whatsapp_phone_number: normalizedPhone,
            whatsapp_status: 'DISCONNECTED',
            whatsapp_connected_at: null,
          },
        });

        const friendlyMessage = getFriendlyWhatsAppErrorMessage(error);
        return jsonResponse(
          {
            error: friendlyMessage,
            diagnostic: {
              ...diagnosticBase,
              numeroConectado: normalizedPhone,
              metaResult: getMetaSummary(error),
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

      return jsonResponse({
        success: true,
        message: 'Teste do WhatsApp enviado com sucesso.',
        preview: result.preview,
        deliveryMode: result.deliveryMode,
        diagnostic: {
          ...diagnosticBase,
          metaResult:
            result.deliveryMode === 'template'
              ? `Template ${resolvedConfig.digestTemplateName} enviado com sucesso.`
              : 'Mensagem de texto de teste enviada com sucesso.',
        },
      });
    } catch (error) {
      return jsonResponse(
        {
          error: getFriendlyWhatsAppErrorMessage(error),
          diagnostic: {
            ...diagnosticBase,
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
