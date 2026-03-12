import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { HttpError } from '@/lib/server/multi-tenant';
import { requireSuperadminAccess } from '@/lib/server/platform-access';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function toIso(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

export async function GET(req: Request) {
  try {
    await requireSuperadminAccess(req);
    const { searchParams } = new URL(req.url);
    const query = (searchParams.get('q') || '').trim();

    const workspaces = await prisma.workspace.findMany({
      where: query
        ? {
            OR: [{ id: { contains: query } }, { name: { contains: query, mode: 'insensitive' } }],
          }
        : undefined,
      orderBy: {
        created_at: 'desc',
      },
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
        _count: {
          select: {
            members: true,
            wallets: true,
            transactions: true,
            investments: true,
            debts: true,
          },
        },
      },
    });

    return NextResponse.json({
      query,
      total: workspaces.length,
      workspaces: workspaces.map((workspace) => {
        const owner = workspace.members.find((member) => member.role === 'OWNER') || null;
        return {
          id: workspace.id,
          name: workspace.name,
          createdAt: toIso(workspace.created_at),
          ownerName: owner?.user.name ?? null,
          ownerEmail: owner?.user.email ?? null,
          memberCount: workspace._count.members,
          plan: workspace.subscription?.plan || 'FREE',
          subscriptionStatus: workspace.subscription?.status || null,
          whatsappStatus: workspace.whatsapp_status || null,
          transactionsCount: workspace._count.transactions,
          walletsCount: workspace._count.wallets,
          investmentsCount: workspace._count.investments,
          debtsCount: workspace._count.debts,
        };
      }),
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: 'Falha ao carregar workspaces do Super Admin.' }, { status: 500 });
  }
}
