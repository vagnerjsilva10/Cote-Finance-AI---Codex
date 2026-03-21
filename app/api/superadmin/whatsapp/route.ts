import { NextResponse } from 'next/server';

import { asPrismaServiceUnavailableError, prisma } from '@/lib/prisma';
import { getFriendlyWhatsAppErrorMessage, isValidE164Phone, verifyWhatsAppConnection, WhatsAppApiError } from '@/lib/whatsapp';
import { sendWorkspaceWhatsAppDigest } from '@/lib/server/whatsapp-digest';
import { sendWorkspaceWhatsAppAlerts } from '@/lib/server/whatsapp-alerts';
import { getWhatsAppCapabilityPolicy } from '@/lib/server/whatsapp-capabilities';
import { getWorkspaceWhatsAppConfig, saveWorkspaceWhatsAppConfig } from '@/lib/server/whatsapp-config';
import { HttpError, logWorkspaceEventSafe } from '@/lib/server/multi-tenant';
import { requireSuperadminAccess } from '@/lib/server/platform-access';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function toIso(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status });
}

function buildWorkspaceReadiness(params: {
  phoneNumber: string | null;
  testPhoneNumber: string | null;
  connectTemplateName: string | null;
  digestTemplateName: string | null;
  templateLanguage: string | null;
}) {
  const issues: string[] = [];

  if (!params.phoneNumber) {
    issues.push('Número do workspace não configurado.');
  } else if (!isValidE164Phone(params.phoneNumber)) {
    issues.push('Número do workspace fora do formato E.164.');
  }

  if (!params.testPhoneNumber) {
    issues.push('Número de teste não configurado.');
  } else if (!isValidE164Phone(params.testPhoneNumber)) {
    issues.push('Número de teste fora do formato E.164.');
  }

  if (!params.connectTemplateName) {
    issues.push('Template de conexão ausente.');
  }

  if (!params.digestTemplateName) {
    issues.push('Template de resumo ausente.');
  }

  if (!params.templateLanguage) {
    issues.push('Idioma do template não configurado.');
  }

  return {
    ready: issues.length === 0,
    issues,
    connectTemplateConfigured: Boolean(params.connectTemplateName),
    digestTemplateConfigured: Boolean(params.digestTemplateName),
    workspacePhoneConfigured: Boolean(params.phoneNumber),
    testDestinationConfigured: Boolean(params.testPhoneNumber),
    templateLanguage: params.templateLanguage,
  };
}

function getEnvironmentReadiness() {
  const accessTokenConfigured = Boolean(process.env.WHATSAPP_ACCESS_TOKEN);
  const phoneNumberIdConfigured = Boolean(process.env.WHATSAPP_PHONE_NUMBER_ID);
  const businessAccountIdConfigured = Boolean(process.env.WHATSAPP_BUSINESS_ACCOUNT_ID);
  const verifyTokenConfigured = Boolean(process.env.WHATSAPP_VERIFY_TOKEN);
  const appSecretConfigured = Boolean(process.env.WHATSAPP_APP_SECRET);
  const apiVersionConfigured = Boolean(process.env.WHATSAPP_API_VERSION || 'v21.0');
  const expectedDisplayPhoneConfigured = Boolean(process.env.WHATSAPP_EXPECTED_DISPLAY_PHONE_NUMBER);
  const expectedVerifiedNameConfigured = Boolean(process.env.WHATSAPP_EXPECTED_VERIFIED_NAME);
  const allowTestNumber = String(process.env.WHATSAPP_ALLOW_TEST_NUMBER || '').trim().toLowerCase() === 'true';

  return {
    ready:
      accessTokenConfigured &&
      phoneNumberIdConfigured &&
      businessAccountIdConfigured &&
      verifyTokenConfigured &&
      appSecretConfigured &&
      apiVersionConfigured &&
      expectedDisplayPhoneConfigured,
    accessTokenConfigured,
    phoneNumberIdConfigured,
    businessAccountIdConfigured,
    verifyTokenConfigured,
    appSecretConfigured,
    apiVersionConfigured,
    expectedDisplayPhoneConfigured,
    expectedVerifiedNameConfigured,
    allowTestNumber,
  };
}
export async function GET(req: Request) {
  try {
    await requireSuperadminAccess(req);
    const { searchParams } = new URL(req.url);
    const query = (searchParams.get('q') || '').trim().toLowerCase();
    const now = Date.now();
    const last24HoursAgo = new Date(now - 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

    const workspaces = await prisma.workspace.findMany({
      orderBy: { updated_at: 'desc' },
      include: {
        subscription: true,
        members: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    const workspaceIds = workspaces.map((workspace) => workspace.id);
    const emptyActivity: {
      lastInboundAt: string | null;
      lastOperationalAt: string | null;
      lastOperationalType: string | null;
      lastAiAt: string | null;
      lastAiMode: string | null;
      inboundLast24h: number;
      transactionsLast24h: number;
      alertsLast24h: number;
      aiLast24h: number;
    } = {
      lastInboundAt: null,
      lastOperationalAt: null,
      lastOperationalType: null,
      lastAiAt: null,
      lastAiMode: null,
      inboundLast24h: 0,
      transactionsLast24h: 0,
      alertsLast24h: 0,
      aiLast24h: 0,
    };

    const [
      configResults,
      inboundEvents,
      operationalEvents,
      aiEvents,
      recentEvents,
      messagesLast30Days,
      transactionsViaWhatsappLast30Days,
      transactionsEditedViaWhatsappLast30Days,
      transactionsRemovedViaWhatsappLast30Days,
      aiViaWhatsappLast30Days,
      aiViaWhatsappGeminiLast30Days,
      alertsSentLast30Days,
      overdueGoalAlertsLast30Days,
      recurringHeavyAlertsLast30Days,
    ] = await Promise.all([
      Promise.allSettled(workspaceIds.map((workspaceId) => getWorkspaceWhatsAppConfig(workspaceId))),
      workspaceIds.length
        ? prisma.workspaceEvent.findMany({
            where: {
              workspace_id: { in: workspaceIds },
              type: 'whatsapp.message.received',
            },
            orderBy: { created_at: 'desc' },
            select: {
              workspace_id: true,
              created_at: true,
            },
          })
        : Promise.resolve([]),
      workspaceIds.length
        ? prisma.workspaceEvent.findMany({
            where: {
              workspace_id: { in: workspaceIds },
              OR: [{ type: { startsWith: 'whatsapp.' } }, { type: { startsWith: 'superadmin.whatsapp.' } }],
            },
            orderBy: { created_at: 'desc' },
            select: {
              workspace_id: true,
              created_at: true,
              type: true,
            },
          })
        : Promise.resolve([]),
      workspaceIds.length
        ? prisma.workspaceEvent.findMany({
            where: {
              workspace_id: { in: workspaceIds },
              type: 'ai.chat.used',
              payload: {
                path: ['channel'],
                equals: 'whatsapp',
              },
            },
            orderBy: { created_at: 'desc' },
            select: {
              workspace_id: true,
              created_at: true,
              payload: true,
            },
          })
        : Promise.resolve([]),
      prisma.workspaceEvent.findMany({
        where: {
          OR: [
            {
              type: {
                startsWith: 'whatsapp.',
              },
            },
            {
              type: 'ai.chat.used',
              payload: {
                path: ['channel'],
                equals: 'whatsapp',
              },
            },
          ],
        },
        orderBy: { created_at: 'desc' },
        take: 12,
        select: {
          id: true,
          workspace_id: true,
          type: true,
          created_at: true,
          workspace: {
            select: {
              name: true,
            },
          },
          user: {
            select: {
              email: true,
            },
          },
          payload: true,
        },
      }),
      prisma.workspaceEvent.count({
        where: {
          type: 'whatsapp.message.received',
          created_at: {
            gte: thirtyDaysAgo,
          },
        },
      }),
      prisma.workspaceEvent.count({
        where: {
          type: 'whatsapp.transaction.created',
          created_at: {
            gte: thirtyDaysAgo,
          },
        },
      }),
      prisma.workspaceEvent.count({
        where: {
          type: 'whatsapp.transaction.edited',
          created_at: {
            gte: thirtyDaysAgo,
          },
        },
      }),
      prisma.workspaceEvent.count({
        where: {
          type: {
            in: ['whatsapp.transaction.removed', 'whatsapp.transaction.undone'],
          },
          created_at: {
            gte: thirtyDaysAgo,
          },
        },
      }),
      prisma.workspaceEvent.count({
        where: {
          type: 'ai.chat.used',
          payload: {
            path: ['channel'],
            equals: 'whatsapp',
          },
          created_at: {
            gte: thirtyDaysAgo,
          },
        },
      }),
      prisma.workspaceEvent.count({
        where: {
          type: 'ai.chat.used',
          payload: {
            path: ['channel'],
            equals: 'whatsapp',
          },
          AND: [
            {
              payload: {
                path: ['mode'],
                equals: 'gemini',
              },
            },
          ],
          created_at: {
            gte: thirtyDaysAgo,
          },
        },
      }),
      prisma.workspaceEvent.count({
        where: {
          type: {
            startsWith: 'whatsapp.alert.sent.',
          },
          created_at: {
            gte: thirtyDaysAgo,
          },
        },
      }),
      prisma.workspaceEvent.count({
        where: {
          type: {
            startsWith: 'whatsapp.alert.sent.goal_overdue.',
          },
          created_at: {
            gte: thirtyDaysAgo,
          },
        },
      }),
      prisma.workspaceEvent.count({
        where: {
          type: {
            startsWith: 'whatsapp.alert.sent.recurring_heavy.',
          },
          created_at: {
            gte: thirtyDaysAgo,
          },
        },
      }),
    ]);

    const configByWorkspace = new Map();
    for (let index = 0; index < workspaceIds.length; index += 1) {
      const workspaceId = workspaceIds[index];
      const configResult = configResults[index];
      if (configResult && configResult.status === 'fulfilled') {
        configByWorkspace.set(workspaceId, configResult.value);
        continue;
      }

      console.error('Superadmin WhatsApp config load failed:', {
        workspaceId,
        error: configResult && configResult.status === 'rejected' ? configResult.reason : 'unknown',
      });

      configByWorkspace.set(workspaceId, {
        connectTemplateName: null,
        digestTemplateName: null,
        templateLanguage: 'pt_BR',
        testPhoneNumber: null,
        lastConnectionState: 'error',
        lastErrorMessage: 'Não foi possível ler a configuração deste workspace agora.',
        lastErrorCategory: 'config',
        lastValidatedAt: null,
        lastTestSentAt: null,
        pendingConfirmation: null,
        updatedAt: null,
      });
    }

    const activityByWorkspace = new Map(workspaceIds.map((workspaceId) => [workspaceId, { ...emptyActivity }]));

    for (const event of inboundEvents) {
      const activity = activityByWorkspace.get(event.workspace_id);
      if (!activity) continue;
      if (!activity.lastInboundAt) {
        activity.lastInboundAt = toIso(event.created_at);
      }
      if (event.created_at >= last24HoursAgo) {
        activity.inboundLast24h += 1;
      }
    }

    for (const event of operationalEvents) {
      const activity = activityByWorkspace.get(event.workspace_id);
      if (!activity) continue;
      if (!activity.lastOperationalAt) {
        activity.lastOperationalAt = toIso(event.created_at);
        activity.lastOperationalType = event.type;
      }
      if (event.created_at >= last24HoursAgo) {
        if (event.type.startsWith('whatsapp.alert.sent.')) {
          activity.alertsLast24h += 1;
        }
        if (
          event.type === 'whatsapp.transaction.created' ||
          event.type === 'whatsapp.transaction.edited' ||
          event.type === 'whatsapp.transaction.removed' ||
          event.type === 'whatsapp.transaction.undone'
        ) {
          activity.transactionsLast24h += 1;
        }
      }
    }

    for (const event of aiEvents) {
      const activity = activityByWorkspace.get(event.workspace_id);
      if (!activity) continue;
      if (!activity.lastAiAt) {
        activity.lastAiAt = toIso(event.created_at);
        activity.lastAiMode =
          event.payload &&
          typeof event.payload === 'object' &&
          !Array.isArray(event.payload) &&
          typeof event.payload.mode === 'string'
            ? event.payload.mode
            : null;
      }
      if (event.created_at >= last24HoursAgo) {
        activity.aiLast24h += 1;
      }
    }

    const items = workspaces.map((workspace) => {
      const owner = workspace.members.find((member) => member.role === 'OWNER') || null;
      const config = configByWorkspace.get(workspace.id);
      const readiness = buildWorkspaceReadiness({
        phoneNumber: workspace.whatsapp_phone_number || null,
        testPhoneNumber: config?.testPhoneNumber || null,
        connectTemplateName: config?.connectTemplateName || null,
        digestTemplateName: config?.digestTemplateName || null,
        templateLanguage: config?.templateLanguage || null,
      });

      return {
        workspaceId: workspace.id,
        workspaceName: workspace.name,
        ownerName: owner?.user.name ?? null,
        ownerEmail: owner?.user.email ?? null,
        plan: workspace.subscription?.plan || 'FREE',
        whatsappStatus: workspace.whatsapp_status || null,
        phoneNumber: workspace.whatsapp_phone_number || null,
        testPhoneNumber: config?.testPhoneNumber || null,
        lastConnectionState: config?.lastConnectionState || 'idle',
        lastErrorMessage: config?.lastErrorMessage || null,
        lastErrorCategory: config?.lastErrorCategory || null,
        lastValidatedAt: config?.lastValidatedAt || null,
        lastTestSentAt: config?.lastTestSentAt || null,
        updatedAt: config?.updatedAt ?? toIso(workspace.updated_at),
        readiness,
        activity: activityByWorkspace.get(workspace.id) || { ...emptyActivity },
      };
    });

    const filtered = query
      ? items.filter((item) =>
          [item.workspaceId, item.workspaceName, item.ownerEmail || '', item.ownerName || '', item.phoneNumber || '']
            .join(' ')
            .toLowerCase()
            .includes(query)
        )
      : items;

    return json({
      query,
      environment: getEnvironmentReadiness(),
      summary: {
        total: filtered.length,
        connected: filtered.filter((item) => item.whatsappStatus === 'CONNECTED').length,
        withErrors: filtered.filter((item) => item.lastConnectionState === 'error' || item.lastConnectionState === 'failed').length,
        pendingConfig: filtered.filter((item) => item.lastConnectionState === 'config_pending').length,
        messagesLast30Days,
        transactionsViaWhatsappLast30Days,
        transactionsEditedViaWhatsappLast30Days,
        transactionsRemovedViaWhatsappLast30Days,
        aiViaWhatsappLast30Days,
        aiViaWhatsappGeminiLast30Days,
        aiViaWhatsappDeterministicLast30Days: Math.max(0, aiViaWhatsappLast30Days - aiViaWhatsappGeminiLast30Days),
        alertsSentLast30Days,
        overdueGoalAlertsLast30Days,
        recurringHeavyAlertsLast30Days,
      },
      recentEvents: recentEvents.map((event) => ({
        id: event.id,
        workspaceId: event.workspace_id,
        workspaceName: event.workspace.name,
        type: event.type,
        createdAt: event.created_at.toISOString(),
        userEmail: event.user?.email ?? null,
        aiMode:
          event.type === 'ai.chat.used' &&
          event.payload &&
          typeof event.payload === 'object' &&
          !Array.isArray(event.payload) &&
          typeof event.payload.mode === 'string'
            ? event.payload.mode
            : null,
      })),
      workspaces: filtered,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return json({ error: error.message }, error.status);
    }

    const prismaUnavailable = asPrismaServiceUnavailableError(error);
    if (prismaUnavailable) {
      return json(
        {
          error: 'O painel de WhatsApp não conseguiu acessar o banco agora. Tente novamente em instantes.',
          detail: prismaUnavailable.detail ?? null,
        },
        503
      );
    }

    console.error('Superadmin WhatsApp GET failed:', error);
    return json({ error: error instanceof Error ? error.message : 'Falha ao carregar o painel de WhatsApp.' }, 500);
  }
}


export async function PATCH(req: Request) {
  try {
    const access = await requireSuperadminAccess(req);
    const body = (await req.json()) as {
      workspaceId?: string;
      action?: 'disconnect' | 'reset' | 'save_config' | 'diagnose' | 'send_test' | 'send_alerts';
      phoneNumber?: string | null;
      testPhoneNumber?: string | null;
    };

    const workspaceId = typeof body.workspaceId === 'string' ? body.workspaceId.trim() : '';
    if (!workspaceId) {
      return json({ error: 'Workspace inválido.' }, 400);
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        id: true,
        name: true,
        whatsapp_phone_number: true,
      },
    });

    if (!workspace) {
      return json({ error: 'Workspace não encontrado.' }, 404);
    }

    if (body.action === 'save_config') {
      const nextPhone =
        typeof body.phoneNumber === 'string' && body.phoneNumber.trim()
          ? body.phoneNumber.trim()
          : workspace.whatsapp_phone_number || null;
      const nextTestPhone =
        typeof body.testPhoneNumber === 'string' && body.testPhoneNumber.trim() ? body.testPhoneNumber.trim() : null;

      if (nextPhone && !isValidE164Phone(nextPhone)) {
        return json({ error: 'Número principal inválido. Use o formato E.164.' }, 400);
      }

      if (nextTestPhone && !isValidE164Phone(nextTestPhone)) {
        return json({ error: 'Número de teste inválido. Use o formato E.164.' }, 400);
      }

      const normalizedPhone = nextPhone ? nextPhone.replace(/\D/g, '') : null;
      await prisma.workspace.update({
        where: { id: workspaceId },
        data: {
          whatsapp_phone_number: normalizedPhone,
        },
      });

      const config = await saveWorkspaceWhatsAppConfig({
        workspaceId,
        userId: access.userId,
        testPhoneNumber: nextTestPhone,
        lastConnectionState: normalizedPhone ? 'disconnected' : 'config_pending',
        lastErrorMessage: null,
        lastErrorCategory: null,
      });

      await logWorkspaceEventSafe({
        workspaceId,
        userId: access.userId,
        type: 'superadmin.whatsapp.config.updated',
        payload: {
          phoneNumber: normalizedPhone,
          testPhoneNumber: config.testPhoneNumber,
        },
      });

      return json({ ok: true, config });
    }

    if (body.action === 'disconnect' || body.action === 'reset') {
      await prisma.workspace.update({
        where: { id: workspaceId },
        data: {
          whatsapp_phone_number: null,
          whatsapp_status: 'DISCONNECTED',
          whatsapp_connected_at: null,
        },
      });

      const config = await saveWorkspaceWhatsAppConfig({
        workspaceId,
        userId: access.userId,
        testPhoneNumber: body.action === 'reset' ? null : undefined,
        connectTemplateName: body.action === 'reset' ? null : undefined,
        digestTemplateName: body.action === 'reset' ? null : undefined,
        lastConnectionState: 'disconnected',
        lastErrorMessage: null,
        lastErrorCategory: null,
      });

      await logWorkspaceEventSafe({
        workspaceId,
        userId: access.userId,
        type: body.action === 'reset' ? 'superadmin.whatsapp.reset' : 'superadmin.whatsapp.disconnected',
        payload: {
          action: body.action,
        },
      });

      return json({ ok: true, config });
    }

    if (body.action === 'diagnose') {
      try {
        const health = await verifyWhatsAppConnection();
        const config = await saveWorkspaceWhatsAppConfig({
          workspaceId,
          userId: access.userId,
          lastConnectionState: workspace.whatsapp_phone_number ? 'disconnected' : 'config_pending',
          lastErrorMessage: null,
          lastErrorCategory: null,
          lastValidatedAt: new Date().toISOString(),
        });

        await logWorkspaceEventSafe({
          workspaceId,
          userId: access.userId,
          type: 'superadmin.whatsapp.diagnosed',
          payload: {
            verifiedName: health.verifiedName,
            displayPhoneNumber: health.displayPhoneNumber,
            qualityRating: health.qualityRating,
          },
        });

        return json({
          ok: true,
          config,
          health,
        });
      } catch (error) {
        const friendlyMessage = getFriendlyWhatsAppErrorMessage(error);
        const config = await saveWorkspaceWhatsAppConfig({
          workspaceId,
          userId: access.userId,
          lastConnectionState: 'error',
          lastErrorMessage: friendlyMessage,
          lastErrorCategory: error instanceof WhatsAppApiError ? error.category : 'unknown',
          lastValidatedAt: new Date().toISOString(),
        });

        return json(
          {
            error: friendlyMessage,
            config,
          },
          error instanceof WhatsAppApiError ? error.status || 500 : 500
        );
      }
    }

    if (body.action === 'send_test') {
      const config = await getWorkspaceWhatsAppConfig(workspaceId);
      const result = await sendWorkspaceWhatsAppDigest({
        workspaceId,
        force: true,
        source: 'manual',
        destinationOverride: typeof body.testPhoneNumber === 'string' ? body.testPhoneNumber.trim() || null : null,
        resolvedConfig: {
          testPhoneNumber: config.testPhoneNumber,
        },
      });

      if (!result.sent) {
        if (result.reason === 'plan_not_eligible') {
          const policy = getWhatsAppCapabilityPolicy('manual_test_send');
          return json(
            {
              error: policy.message,
              code: policy.code,
              requiredPlan: policy.requiredPlan,
            },
            403
          );
        }
        return json({ error: 'Nao foi possivel enviar o teste do WhatsApp para este workspace.' }, 409);
      }

      const updatedConfig = await saveWorkspaceWhatsAppConfig({
        workspaceId,
        userId: access.userId,
        lastConnectionState: 'testing',
        lastErrorMessage: null,
        lastErrorCategory: null,
        lastTestSentAt: new Date().toISOString(),
      });

      await logWorkspaceEventSafe({
        workspaceId,
        userId: access.userId,
        type: 'superadmin.whatsapp.test.sent',
        payload: {
          phoneNumber: result.phoneNumber,
          deliveryMode: result.deliveryMode,
        },
      });

      return json({
        ok: true,
        preview: result.preview,
        deliveryMode: result.deliveryMode,
        config: updatedConfig,
      });
    }
    if (body.action === 'send_alerts') {
      const result = await sendWorkspaceWhatsAppAlerts({
        workspaceId,
        force: true,
        source: 'manual',
      });

      if (!result.sent) {
        if (result.reason === 'plan_not_eligible') {
          const policy = getWhatsAppCapabilityPolicy('auto_basic_alerts');
          return json(
            {
              error: policy.message,
              code: policy.code,
              requiredPlan: policy.requiredPlan,
            },
            403
          );
        }
        return json({ error: 'Nao ha alertas elegiveis para enviar neste workspace agora.' }, 409);
      }

      await logWorkspaceEventSafe({
        workspaceId,
        userId: access.userId,
        type: 'superadmin.whatsapp.alerts.sent',
        payload: {
          count: result.alerts.length,
          alerts: result.alerts.map((alert) => alert.kind),
        },
      });

      return json({
        ok: true,
        count: result.alerts.length,
        alerts: result.alerts,
      });
    }

    return json({ error: 'Ação administrativa inválida.' }, 400);
  } catch (error) {
    if (error instanceof HttpError) {
      return json({ error: error.message }, error.status);
    }

    return json(
      { error: error instanceof Error ? error.message : 'Falha ao processar o painel de WhatsApp.' },
      500
    );
  }
}
