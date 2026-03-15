import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { isValidE164Phone } from '@/lib/whatsapp';
import { sendWorkspaceWhatsAppDigest } from '@/lib/server/whatsapp-digest';
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

export async function GET(req: Request) {
  try {
    await requireSuperadminAccess(req);
    const { searchParams } = new URL(req.url);
    const query = (searchParams.get('q') || '').trim().toLowerCase();

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

    return json({
      query,
      summary: {
        total: filtered.length,
        connected: filtered.filter((item) => item.whatsappStatus === 'CONNECTED').length,
        withErrors: filtered.filter((item) => item.lastConnectionState === 'error').length,
        pendingConfig: filtered.filter((item) => item.lastConnectionState === 'config_pending').length,
      },
      workspaces: filtered,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return json({ error: error.message }, error.status);
    }

    return json({ error: 'Falha ao carregar o painel de WhatsApp.' }, 500);
  }
}

export async function PATCH(req: Request) {
  try {
    const access = await requireSuperadminAccess(req);
    const body = (await req.json()) as {
      workspaceId?: string;
      action?: 'disconnect' | 'reset' | 'save_config' | 'send_test';
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
        return json({ error: 'Não foi possível enviar o teste do WhatsApp para este workspace.' }, 409);
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
