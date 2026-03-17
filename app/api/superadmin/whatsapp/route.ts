import { NextResponse } from 'next/server';

import { asPrismaServiceUnavailableError, prisma } from '@/lib/prisma';
import { getFriendlyWhatsAppErrorMessage, isValidE164Phone, verifyWhatsAppConnection, WhatsAppApiError } from '@/lib/whatsapp';
import { sendWorkspaceWhatsAppDigest } from '@/lib/server/whatsapp-digest';
import { sendWorkspaceWhatsAppAlerts } from '@/lib/server/whatsapp-alerts';
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
    issues.push('NÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Âºmero do workspace nÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â£o configurado.');
  } else if (!isValidE164Phone(params.phoneNumber)) {
    issues.push('NÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Âºmero do workspace fora do formato E.164.');
  }

  if (!params.testPhoneNumber) {
    issues.push('NÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Âºmero de teste nÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â£o configurado.');
  } else if (!isValidE164Phone(params.testPhoneNumber)) {
    issues.push('NÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Âºmero de teste fora do formato E.164.');
  }

  if (!params.connectTemplateName) {
    issues.push('Template de conexÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â£o ausente.');
  }

  if (!params.digestTemplateName) {
    issues.push('Template de resumo ausente.');
  }

  if (!params.templateLanguage) {
    issues.push('Idioma do template nÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â£o configurado.');
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
  const verifyTokenConfigured = Boolean(process.env.WHATSAPP_VERIFY_TOKEN);
  const appSecretConfigured = Boolean(process.env.WHATSAPP_APP_SECRET);
  const apiVersionConfigured = Boolean(process.env.WHATSAPP_API_VERSION);

  return {
    ready:
      accessTokenConfigured &&
      phoneNumberIdConfigured &&
      verifyTokenConfigured &&
      appSecretConfigured &&
      apiVersionConfigured,
    accessTokenConfigured,
    phoneNumberIdConfigured,
    verifyTokenConfigured,
    appSecretConfigured,
    apiVersionConfigured,
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

    const items = await Promise.all(
      workspaces.map(async (workspace) => {
        const owner = workspace.members.find((member) => member.role === 'OWNER') || null;
        const config = await getWorkspaceWhatsAppConfig(workspace.id);

        const readiness = buildWorkspaceReadiness({
          phoneNumber: workspace.whatsapp_phone_number || null,
          testPhoneNumber: config.testPhoneNumber,
          connectTemplateName: config.connectTemplateName,
          digestTemplateName: config.digestTemplateName,
          templateLanguage: config.templateLanguage,
        });

        const [
          lastInboundEvent,
          lastOperationalEvent,
          lastAiEvent,
          inboundLast24h,
          transactionsLast24h,
          alertsLast24h,
          aiLast24h,
        ] = await Promise.all([
          prisma.workspaceEvent.findFirst({
            where: {
              workspace_id: workspace.id,
              type: 'whatsapp.message.received',
            },
            orderBy: { created_at: 'desc' },
            select: { created_at: true },
          }),
          prisma.workspaceEvent.findFirst({
            where: {
              workspace_id: workspace.id,
              OR: [{ type: { startsWith: 'whatsapp.' } }, { type: { startsWith: 'superadmin.whatsapp.' } }],
            },
            orderBy: { created_at: 'desc' },
            select: { created_at: true, type: true },
          }),
          prisma.workspaceEvent.findFirst({
            where: {
              workspace_id: workspace.id,
              type: 'ai.chat.used',
              payload: {
                path: ['channel'],
                equals: 'whatsapp',
              },
            },
            orderBy: { created_at: 'desc' },
            select: { created_at: true, payload: true },
          }),
          prisma.workspaceEvent.count({
            where: {
              workspace_id: workspace.id,
              type: 'whatsapp.message.received',
              created_at: { gte: last24HoursAgo },
            },
          }),
          prisma.workspaceEvent.count({
            where: {
              workspace_id: workspace.id,
              type: {
                in: ['whatsapp.transaction.created', 'whatsapp.transaction.edited', 'whatsapp.transaction.removed', 'whatsapp.transaction.undone'],
              },
              created_at: { gte: last24HoursAgo },
            },
          }),
          prisma.workspaceEvent.count({
            where: {
              workspace_id: workspace.id,
              type: {
                startsWith: 'whatsapp.alert.sent.',
              },
              created_at: { gte: last24HoursAgo },
            },
          }),
          prisma.workspaceEvent.count({
            where: {
              workspace_id: workspace.id,
              type: 'ai.chat.used',
              payload: {
                path: ['channel'],
                equals: 'whatsapp',
              },
              created_at: { gte: last24HoursAgo },
            },
          }),
        ]);

        const aiMode =
          lastAiEvent?.payload &&
          typeof lastAiEvent.payload === 'object' &&
          !Array.isArray(lastAiEvent.payload) &&
          typeof (lastAiEvent.payload as Record<string, unknown>).mode === 'string'
            ? String((lastAiEvent.payload as Record<string, unknown>).mode)
            : null;

        return {
          workspaceId: workspace.id,
          workspaceName: workspace.name,
          ownerName: owner?.user.name ?? null,
          ownerEmail: owner?.user.email ?? null,
          plan: workspace.subscription?.plan || 'FREE',
          whatsappStatus: workspace.whatsapp_status || null,
          phoneNumber: workspace.whatsapp_phone_number || null,
          testPhoneNumber: config.testPhoneNumber,
          lastConnectionState: config.lastConnectionState,
          lastErrorMessage: config.lastErrorMessage,
          lastErrorCategory: config.lastErrorCategory,
          lastValidatedAt: config.lastValidatedAt,
          lastTestSentAt: config.lastTestSentAt,
          updatedAt: config.updatedAt ?? toIso(workspace.updated_at),
          readiness,
          activity: {
            lastInboundAt: toIso(lastInboundEvent?.created_at),
            lastOperationalAt: toIso(lastOperationalEvent?.created_at),
            lastOperationalType: lastOperationalEvent?.type ?? null,
            lastAiAt: toIso(lastAiEvent?.created_at),
            lastAiMode: aiMode,
            inboundLast24h,
            transactionsLast24h,
            alertsLast24h,
            aiLast24h,
          },
        };
      })
    );

    const filtered = query
      ? items.filter((item) =>
          [item.workspaceId, item.workspaceName, item.ownerEmail || '', item.ownerName || '', item.phoneNumber || '']
            .join(' ')
            .toLowerCase()
            .includes(query)
        )
      : items;

    const [
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
    ] =
      await Promise.all([
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

    return json({
      query,
      summary: {
        total: filtered.length,
        connected: filtered.filter((item) => item.whatsappStatus === 'CONNECTED').length,
        withErrors: filtered.filter((item) => item.lastConnectionState === 'error').length,
        pendingConfig: filtered.filter((item) => item.lastConnectionState === 'config_pending').length,
        messagesLast30Days,
        transactionsViaWhatsappLast30Days,
        transactionsEditedViaWhatsappLast30Days,
        transactionsRemovedViaWhatsappLast30Days,
        aiViaWhatsappLast30Days,
        aiViaWhatsappGeminiLast30Days,
        aiViaWhatsappDeterministicLast30Days: Math.max(
          0,
          aiViaWhatsappLast30Days - aiViaWhatsappGeminiLast30Days
        ),
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
          typeof (event.payload as Record<string, unknown>).mode === 'string'
            ? String((event.payload as Record<string, unknown>).mode)
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
          error: 'O painel de WhatsApp nao conseguiu acessar o banco agora. Tente novamente em instantes.',
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
      return json({ error: 'Workspace invÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡lido.' }, 400);
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
      return json({ error: 'Workspace nÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â£o encontrado.' }, 404);
    }

    if (body.action === 'save_config') {
      const nextPhone =
        typeof body.phoneNumber === 'string' && body.phoneNumber.trim()
          ? body.phoneNumber.trim()
          : workspace.whatsapp_phone_number || null;
      const nextTestPhone =
        typeof body.testPhoneNumber === 'string' && body.testPhoneNumber.trim() ? body.testPhoneNumber.trim() : null;

      if (nextPhone && !isValidE164Phone(nextPhone)) {
        return json({ error: 'NÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Âºmero principal invÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡lido. Use o formato E.164.' }, 400);
      }

      if (nextTestPhone && !isValidE164Phone(nextTestPhone)) {
        return json({ error: 'NÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Âºmero de teste invÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡lido. Use o formato E.164.' }, 400);
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
          digestTemplateName: config.digestTemplateName,
          templateLanguage: config.templateLanguage,
          testPhoneNumber: config.testPhoneNumber,
        },
      });

      if (!result.sent) {
        return json({ error: 'NÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â£o foi possÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â­vel enviar o teste do WhatsApp para este workspace.' }, 409);
      }

      const updatedConfig = await saveWorkspaceWhatsAppConfig({
        workspaceId,
        userId: access.userId,
        lastConnectionState: 'connected',
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
        return json({ error: 'NÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â£o hÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ alertas elegÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â­veis para enviar neste workspace agora.' }, 409);
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

    return json({ error: 'AÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â£o administrativa invÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡lida.' }, 400);
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
