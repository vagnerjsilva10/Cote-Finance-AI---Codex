import { NextResponse } from 'next/server';
import { readTrackingSettings, toPublicTrackingSettings } from '@/lib/server/tracking';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const settings = await readTrackingSettings();
  return NextResponse.json(toPublicTrackingSettings(settings));
}
