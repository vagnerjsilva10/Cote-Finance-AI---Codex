import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  normalizeWhatsappPhone,
  sendWhatsAppTextMessage,
  WHATSAPP_CONFIG_MISSING_ERROR,
  WHATSAPP_VERIFY_TOKEN_MISSING_ERROR,
} from '@/lib/whatsapp';
import { HttpError, logWorkspaceEventSafe, resolveWorkspaceContext } from '@/lib/server/multi-tenant';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const context = await resolveWorkspaceContext(req);

    const { action, phoneNumber } = await req.json();
    if (action !== 'connect' && action !== 'disconnect') {
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

      await sendWhatsAppTextMessage({
        to: normalizedPhone,
        text: 'Cote Finance AI conectado com sucesso. Voce ja pode enviar: "gastei 50 mercado".',
      });

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
