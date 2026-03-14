import { NextResponse } from 'next/server';
import { HttpError } from '@/lib/server/multi-tenant';
import { requireSuperadminAccess } from '@/lib/server/platform-access';
import { readTrackingSettings, sanitizeTrackingSettings, saveTrackingSettings, toPublicTrackingSettings } from '@/lib/server/tracking';
import type { TrackingSettings } from '@/lib/tracking/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    await requireSuperadminAccess(req);
    const settings = await readTrackingSettings();

    return NextResponse.json({
      settings,
      publicSettings: toPublicTrackingSettings(settings),
      status: {
        pixelConfigured: Boolean(settings.pixelId),
        utmCaptureActive: settings.utmCaptureEnabled,
        purchaseTrackingActive: settings.purchaseTrackingEnabled,
      },
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Falha ao carregar as configuracoes de tracking.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await requireSuperadminAccess(req);
    const body = (await req.json().catch(() => null)) as TrackingSettings | null;
    if (!body) {
      return NextResponse.json({ error: 'Payload invalido.' }, { status: 400 });
    }

    const settings = await saveTrackingSettings(sanitizeTrackingSettings(body));
    return NextResponse.json({
      settings,
      publicSettings: toPublicTrackingSettings(settings),
      status: {
        pixelConfigured: Boolean(settings.pixelId),
        utmCaptureActive: settings.utmCaptureEnabled,
        purchaseTrackingActive: settings.purchaseTrackingEnabled,
      },
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Falha ao salvar as configuracoes de tracking.' }, { status: 500 });
  }
}
