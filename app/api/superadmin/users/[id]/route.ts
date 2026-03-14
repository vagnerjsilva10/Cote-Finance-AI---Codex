import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { HttpError, normalizePlan } from '@/lib/server/multi-tenant';
import { getPlatformRoleForEmail, requireSuperadminAccess } from '@/lib/server/platform-access';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED_STATUSES = new Set(['ACTIVE', 'PENDING', 'CANCELED']);

function toIso(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

function normalizeStatus(value: unknown) {
  const normalized = typeof value === 'string' ? value.trim().toUpperCase() : '';
  return ALLOWED_STATUSES.has(normalized) ? normalized : null;
}

function normalizePeriodEnd(value: unknown) {
  if (value === null || value === '' || typeof value === 'undefined') return null;
  if (typeof value !== 'string') return null;
  const nextDate = new Date(value);
  return Number.isNaN(nextDate.getTime()) ? null : nextDate;
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

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSuperadminAccess(req);
    const { id } = await params;

    const body = (await req.json()) as {
      name?: string | null;
      profilePlan?: string;
      entitlementPlan?: string;
      entitlementStatus?: string;
      currentPeriodEnd?: string | null;
    };

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        profile: true,
        subscription: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });
    }

    const nextName =
      typeof body.name === 'string' ? body.name.trim() || null : body.name === null ? null : user.name;
    const profilePlan = normalizePlan(body.profilePlan || user.profile?.plan);
    const entitlementPlan = normalizePlan(body.entitlementPlan || user.subscription?.plan);
    const entitlementStatus = normalizeStatus(body.entitlementStatus || user.subscription?.status || 'ACTIVE');
    if (!entitlementStatus) {
      return NextResponse.json({ error: 'Status do entitlement inválido.' }, { status: 400 });
    }

    const currentPeriodEnd = normalizePeriodEnd(body.currentPeriodEnd);
    if (body.currentPeriodEnd && !currentPeriodEnd) {
      return NextResponse.json({ error: 'Período atual inválido.' }, { status: 400 });
    }

    const [updatedUser, updatedProfile, updatedSubscription] = await prisma.$transaction([
      prisma.user.update({
        where: { id },
        data: {
          name: nextName,
        },
      }),
      prisma.profile.upsert({
        where: { user_id: id },
        update: { plan: profilePlan },
        create: {
          user_id: id,
          plan: profilePlan,
        },
      }),
      prisma.subscriptionEntitlement.upsert({
        where: { user_id: id },
        update: {
          plan: entitlementPlan,
          status: entitlementStatus,
          current_period_end: currentPeriodEnd,
        },
        create: {
          user_id: id,
          plan: entitlementPlan,
          status: entitlementStatus,
          current_period_end: currentPeriodEnd,
        },
      }),
    ]);

    return NextResponse.json({
      ok: true,
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        profilePlan: updatedProfile.plan,
        entitlement: {
          plan: updatedSubscription.plan,
          status: updatedSubscription.status,
          currentPeriodEnd: toIso(updatedSubscription.current_period_end),
        },
        platformRole: getPlatformRoleForEmail(updatedUser.email),
      },
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: 'Falha ao atualizar o usuário.' }, { status: 500 });
  }
}
