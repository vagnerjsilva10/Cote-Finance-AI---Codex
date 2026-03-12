import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { HttpError } from '@/lib/server/multi-tenant';
import { getPlatformRoleForEmail, requireSuperadminAccess } from '@/lib/server/platform-access';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function toIso(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSuperadminAccess(req);
    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        profile: true,
        subscription: true,
        workspaces: {
          include: {
            workspace: {
              include: {
                subscription: true,
              },
            },
          },
        },
        workspace_events: {
          take: 15,
          orderBy: {
            created_at: 'desc',
          },
          include: {
            workspace: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });
    }

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const aiUsageLast30Days = await prisma.workspaceEvent.count({
      where: {
        user_id: user.id,
        created_at: {
          gte: thirtyDaysAgo,
        },
        OR: [{ type: { contains: 'ai' } }, { type: { contains: 'insight' } }],
      },
    });

    const eventsLast30Days = await prisma.workspaceEvent.count({
      where: {
        user_id: user.id,
        created_at: {
          gte: thirtyDaysAgo,
        },
      },
    });

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: toIso(user.created_at),
        updatedAt: toIso(user.updated_at),
        platformRole: getPlatformRoleForEmail(user.email),
        profilePlan: user.profile?.plan || 'FREE',
        lastAccessAt: toIso(user.workspace_events[0]?.created_at ?? null),
        subscription: user.subscription
          ? {
              plan: user.subscription.plan,
              status: user.subscription.status,
              currentPeriodEnd: toIso(user.subscription.current_period_end),
            }
          : null,
        workspaces: user.workspaces.map((membership) => ({
          id: membership.workspace.id,
          name: membership.workspace.name,
          role: membership.role,
          plan: membership.workspace.subscription?.plan || 'FREE',
          subscriptionStatus: membership.workspace.subscription?.status || null,
          whatsappStatus: membership.workspace.whatsapp_status || null,
        })),
        usage: {
          aiUsageLast30Days,
          eventsLast30Days,
        },
        recentEvents: user.workspace_events.map((event) => ({
          id: event.id,
          type: event.type,
          createdAt: toIso(event.created_at),
          workspaceName: event.workspace.name,
        })),
      },
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: 'Falha ao carregar o detalhe do usuário.' }, { status: 500 });
  }
}
