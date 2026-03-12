import { NextResponse } from 'next/server';

import { requireSuperadminAccess } from '@/lib/server/platform-access';
import { HttpError } from '@/lib/server/multi-tenant';
import { SUPERADMIN_NAVIGATION } from '@/lib/superadmin/navigation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const access = await requireSuperadminAccess(req);
    return NextResponse.json({
      access,
      navigation: SUPERADMIN_NAVIGATION,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: 'Falha ao carregar o bootstrap do Super Admin.' }, { status: 500 });
  }
}
