import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  normalizeWhatsappPhone,
  sendWhatsAppTemplateMessage,
  sendWhatsAppTextMessage,
  WHATSAPP_CONFIG_MISSING_ERROR,
  WHATSAPP_VERIFY_TOKEN_MISSING_ERROR,
} from '@/lib/whatsapp';
import { HttpError, logWorkspaceEventSafe, resolveWorkspaceContext } from '@/lib/server/multi-tenant';
import { sendWorkspaceWhatsAppDigest } from '@/lib/server/whatsapp-digest';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const context = await resolveWorkspaceContext(req);

    const { action, phoneNumber } = await req.json();
    if (action !== 'connect' && action !== 'disconnect' && action !== 'send_test') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    if (action === 'connect') {
      if (typeof phoneNumber !== 'string' || !phoneNumber.trim()) {
        return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
      }

      const normalizedPhone = normalizeWhatsappPhone(phoneNumber);
      if (normalizedPhone.length < 12 || normalizedPhone.length > 15) {
        return NextResponse.json({ error: 'Invalid WhatsApp phone number' }, { status: 400 });
      }

      await prisma.workspace.update({
        where: { id: context.workspaceId },
        data: {
          whatsapp_phone_number: normalizedPhone,
          whatsapp_status: 'CONNECTING',
          whatsapp_connected_at: null,
        },
      });

      const connectTemplateName = process.env.WHATSAPP_TEMPLATE_CONNECT_NAME?.trim();

      if (connectTemplateName) {
        await sendWhatsAppTemplateMessage({
          to: normalizedPhone,
          name: connectTemplateName,
          bodyParameters: [context.workspace.name],
        });
      } else {
        await sendWhatsAppTextMessage({
          to: normalizedPhone,
          text: 'Cote Finance AI conectado com sucesso. Voc\u00ea j\u00e1 pode enviar: "gastei 50 mercado".',
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
      });

      return NextResponse.json({
        success: true,
        status: 'CONNECTED',
        phoneNumber: normalizedPhone,
      });
    } else if (action === 'disconnect') {
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

      return NextResponse.json({
        success: true,
        status: 'DISCONNECTED',
      });
    }

    if (action === 'send_test') {
      const result = await sendWorkspaceWhatsAppDigest({
        workspaceId: context.workspaceId,
        force: true,
        source: 'manual',
      });

      if (!result.sent) {
        const status =
          result.reason === 'not_connected'
            ? 400
            : result.reason === 'workspace_not_found'
            ? 404
            : 409;

        return NextResponse.json(
          {
            error:
              result.reason === 'not_connected'
                ? 'Conecte o WhatsApp deste workspace antes de enviar um teste.'
                : result.reason === 'no_content'
                ? 'Ainda n\u00e3o h\u00e1 dados suficientes para montar um resumo de teste.'
                : 'N\u00e3o foi poss\u00edvel enviar o teste agora.',
          },
          { status }
        );
      }

      return NextResponse.json({
        success: true,
        preview: result.preview,
        deliveryMode: result.deliveryMode,
      });
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
  } catch (error: any) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('WhatsApp API Error:', error);

    if (
      error instanceof Error &&
      (error.message === WHATSAPP_CONFIG_MISSING_ERROR ||
        error.message === WHATSAPP_VERIFY_TOKEN_MISSING_ERROR)
    ) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ error: error.message || 'Failed to update WhatsApp status' }, { status: 500 });
  }
}

