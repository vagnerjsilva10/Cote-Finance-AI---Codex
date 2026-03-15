import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { HttpError } from '@/lib/server/multi-tenant';
import { requireSuperadminAccess } from '@/lib/server/platform-access';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function toIso(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

function classifyEventType(type: string) {
  if (type.startsWith('superadmin.')) return 'admin';
  if (type.startsWith('stripe.')) return 'billing';
  if (type.startsWith('tracking.')) return 'tracking';
  if (type.startsWith('whatsapp.')) return 'whatsapp';
  if (type.startsWith('ai.')) return 'ai';
  if (type.startsWith('transaction.') || type.startsWith('wallet.') || type.startsWith('goal.') || type.startsWith('debt.') || type.startsWith('investment.')) return 'produto';
  return 'geral';
}

export async function GET(req: Request) {
  try {
    await requireSuperadminAccess(req);

    const { searchParams } = new URL(req.url);
    const query = (searchParams.get('q') || '').trim();
    const category = (searchParams.get('category') || '').trim().toLowerCase();

    const events = await prisma.workspaceEvent.findMany({
      where: {
        ...(query
          ? {
              OR: [
                { id: { contains: query } },
                { type: { contains: query, mode: 'insensitive' } },
                { workspace: { name: { contains: query, mode: 'insensitive' } } },
                { user: { email: { contains: query, mode: 'insensitive' } } },
              ],
            }
          : {}),
      },
      orderBy: { created_at: 'desc' },
      take: 120,
      include: {
        workspace: {
          select: {
            id: true,
            name: true,
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    const normalized = events
      .map((event) => ({
        id: event.id,
        type: event.type,
        category: classifyEventType(event.type),
        createdAt: toIso(event.created_at),
        workspaceId: event.workspace_id,
        workspaceName: event.workspace?.name || 'Sem workspace',
        userId: event.user_id,
        userEmail: event.user?.email ?? null,
        userName: event.user?.name ?? null,
        payload: event.payload,
      }))
      .filter((event) => (category && category !== 'all' ? event.category === category : true));

    const summary = normalized.reduce(
      (acc, item) => {
        acc.total += 1;
        acc[item.category] = (acc[item.category] || 0) + 1;
        return acc;
      },
      {
        total: 0,
        admin: 0,
        billing: 0,
        tracking: 0,
        whatsapp: 0,
        ai: 0,
        produto: 0,
        geral: 0,
      } as Record<string, number>
    );

    return NextResponse.json({
      query,
      filters: {
        category: category || 'all',
      },
      summary,
      total: normalized.length,
      events: normalized,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: 'Falha ao carregar logs de auditoria.' }, { status: 500 });
  }
}
