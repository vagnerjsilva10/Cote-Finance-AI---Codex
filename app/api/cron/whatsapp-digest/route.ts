import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { sendWorkspaceWhatsAppDigest } from '@/lib/server/whatsapp-digest';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function isAuthorized(req: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  const authorization = req.headers.get('authorization')?.trim();

  if (cronSecret) {
    return authorization === `Bearer ${cronSecret}`;
  }

  return process.env.NODE_ENV !== 'production';
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const workspaces = await prisma.workspace.findMany({
      where: {
        whatsapp_status: 'CONNECTED',
        whatsapp_phone_number: {
          not: null,
        },
      },
      select: {
        id: true,
      },
      take: 250,
    });

    const results = [];

    for (const workspace of workspaces) {
      const result = await sendWorkspaceWhatsAppDigest({
        workspaceId: workspace.id,
        source: 'cron',
      });
      results.push(result);
    }

    const sent = results.filter((item) => item.sent).length;
    const skipped = results.length - sent;

    return NextResponse.json({
      success: true,
      scanned: results.length,
      sent,
      skipped,
      results,
    });
  } catch (error: any) {
    console.error('WhatsApp digest cron error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to process WhatsApp digests' },
      { status: 500 }
    );
  }
}
