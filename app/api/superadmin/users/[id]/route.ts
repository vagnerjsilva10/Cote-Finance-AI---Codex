import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { getWorkspacePlan, HttpError, normalizePlan } from '@/lib/server/multi-tenant';
import { requireSuperadminAccess, resolvePlatformRoleForEmail } from '@/lib/server/platform-access';
import { getUserLifecycleStatus, setUserLifecycleStatus } from '@/lib/server/superadmin-governance';
import {
  getSupabaseAdminClient,
  getSupabaseAppUrl,
  isSupabaseAdminConfigured,
  SUPABASE_ADMIN_CONFIG_MISSING_ERROR,
} from '@/lib/server/supabase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PLATFORM_ROLE_OVERRIDES_KEY = 'superadmin.platform-role-overrides';
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

function isMissingPlatformSettingError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || '');
  return /does not exist|relation .* does not exist|table .* doesn't exist|column .* does not exist/i.test(message);
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
      return NextResponse.json({ error: 'UsuÃ¡rio nÃ£o encontrado.' }, { status: 404 });
    }

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const profilePlan = normalizePlan(user.profile?.plan);
    const userPlan = user.subscription?.status === 'ACTIVE' ? normalizePlan(user.subscription.plan) : profilePlan;
    const primaryWorkspaceMembership =
      user.workspaces.find((membership) => membership.role === 'OWNER') ?? user.workspaces[0] ?? null;
    const workspacePlan = primaryWorkspaceMembership
      ? normalizePlan(primaryWorkspaceMembership.workspace.subscription?.plan)
      : null;
    const effectiveAppPlan = primaryWorkspaceMembership
      ? await getWorkspacePlan(primaryWorkspaceMembership.workspace.id, user.id)
      : userPlan;

    const [aiUsageLast30Days, eventsLast30Days, resolvedRole, lifecycle] = await Promise.all([
      prisma.workspaceEvent.count({
        where: {
          user_id: user.id,
          created_at: {
            gte: thirtyDaysAgo,
          },
          OR: [{ type: { contains: 'ai' } }, { type: { contains: 'insight' } }],
        },
      }),
      prisma.workspaceEvent.count({
        where: {
          user_id: user.id,
          created_at: {
            gte: thirtyDaysAgo,
          },
        },
      }),
      resolvePlatformRoleForEmail(user.email),
      getUserLifecycleStatus(user.id),
    ]);

    return NextResponse.json({
      capabilities: {
        authAdminConfigured: isSupabaseAdminConfigured(),
      },
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: toIso(user.created_at),
        updatedAt: toIso(user.updated_at),
        lifecycleStatus: lifecycle.status,
        lifecycleReason: lifecycle.reason,
        platformRole: resolvedRole.role,
        platformRoleSource: resolvedRole.source,
        profilePlan,
        userPlan,
        workspacePlan,
        effectiveAppPlan,
        effectiveWorkspaceId: primaryWorkspaceMembership?.workspace.id ?? null,
        effectiveWorkspaceName: primaryWorkspaceMembership?.workspace.name ?? null,
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

    return NextResponse.json({ error: 'Falha ao carregar o detalhe do usuÃ¡rio.' }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSuperadminAccess(req);
    const { id } = await params;

    const body = (await req.json()) as {
      name?: string | null;
      email?: string | null;
      profilePlan?: string;
      entitlementPlan?: string;
      entitlementStatus?: string;
      currentPeriodEnd?: string | null;
      platformRole?: string;
      lifecycleStatus?: string;
      lifecycleReason?: string | null;
      authAction?: 'generate-magic-link' | 'generate-recovery-link' | 'ban-user' | 'unban-user' | 'soft-delete-user';
    };

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        profile: true,
        subscription: true,
        workspaces: {
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
      return NextResponse.json({ error: 'UsuÃ¡rio nÃ£o encontrado.' }, { status: 404 });
    }

    const nextName =
      typeof body.name === 'string' ? body.name.trim() || null : body.name === null ? null : user.name;
    const nextEmail =
      typeof body.email === 'string' ? body.email.trim().toLowerCase() || user.email : user.email;
    const profilePlan = normalizePlan(body.profilePlan || user.profile?.plan);
    const entitlementPlan = normalizePlan(body.entitlementPlan || user.subscription?.plan);
    const entitlementStatus = normalizeStatus(body.entitlementStatus || user.subscription?.status || 'ACTIVE');

    if (!entitlementStatus) {
      return NextResponse.json({ error: 'Status do entitlement invÃ¡lido.' }, { status: 400 });
    }

    const currentPeriodEnd = normalizePeriodEnd(body.currentPeriodEnd);
    if (body.currentPeriodEnd && !currentPeriodEnd) {
      return NextResponse.json({ error: 'PerÃ­odo atual invÃ¡lido.' }, { status: 400 });
    }

    const normalizedRoleInput =
      body.platformRole === 'superadmin' || body.platformRole === 'admin' || body.platformRole === 'user'
        ? body.platformRole
        : null;
    const normalizedLifecycleStatus =
      body.authAction === 'soft-delete-user'
        ? 'BLOCKED'
        : body.lifecycleStatus === 'SUSPENDED' || body.lifecycleStatus === 'BLOCKED'
          ? body.lifecycleStatus
          : 'ACTIVE';
    const normalizedLifecycleReason =
      body.authAction === 'soft-delete-user'
        ? body.lifecycleReason ?? 'Acesso removido pelo Super Admin.'
        : body.lifecycleReason ?? null;

    if ((nextEmail !== user.email || body.authAction) && !isSupabaseAdminConfigured()) {
      return NextResponse.json({ error: SUPABASE_ADMIN_CONFIG_MISSING_ERROR }, { status: 503 });
    }

    if (isSupabaseAdminConfigured()) {
      const supabaseAdmin = getSupabaseAdminClient();

      if (body.authAction === 'soft-delete-user') {
        const deleteResult = await supabaseAdmin.auth.admin.deleteUser(user.id, true);

        if (deleteResult.error) {
          return NextResponse.json({ error: deleteResult.error.message }, { status: 400 });
        }
      } else if (body.authAction === 'ban-user' || body.authAction === 'unban-user') {
        const authControlResult = await supabaseAdmin.auth.admin.updateUserById(user.id, {
          ban_duration: body.authAction === 'ban-user' ? '876000h' : 'none',
        });

        if (authControlResult.error) {
          return NextResponse.json({ error: authControlResult.error.message }, { status: 400 });
        }
      }

      if (body.authAction !== 'soft-delete-user' && (nextEmail !== user.email || nextName !== user.name)) {
        const updateAuthResult = await supabaseAdmin.auth.admin.updateUserById(user.id, {
          email: nextEmail !== user.email ? nextEmail : undefined,
          user_metadata: {
            name: nextName,
            full_name: nextName,
          },
        });

        if (updateAuthResult.error) {
          return NextResponse.json({ error: updateAuthResult.error.message }, { status: 400 });
        }
      }
    }

    const [updatedUser, updatedProfile, updatedSubscription] = await prisma.$transaction([
      prisma.user.update({
        where: { id },
        data: {
          name: nextName,
          email: nextEmail,
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

    const currentResolvedRole = await resolvePlatformRoleForEmail(user.email);
    const primaryWorkspaceMembership =
      user.workspaces.find((membership) => membership.role === 'OWNER') ?? user.workspaces[0] ?? null;
    const userPlan =
      updatedSubscription.status === 'ACTIVE' ? normalizePlan(updatedSubscription.plan) : normalizePlan(updatedProfile.plan);
    const workspacePlan = primaryWorkspaceMembership
      ? normalizePlan(
          (
            await prisma.workspaceSubscription.findUnique({
              where: { workspace_id: primaryWorkspaceMembership.workspace_id },
              select: { plan: true },
            })
          )?.plan
        )
      : null;
    const effectiveAppPlan = primaryWorkspaceMembership
      ? await getWorkspacePlan(primaryWorkspaceMembership.workspace_id, updatedUser.id)
      : userPlan;
    const shouldWriteRoleOverride = Boolean(
      updatedUser.email && normalizedRoleInput && normalizedRoleInput !== currentResolvedRole.role
    );

    if (shouldWriteRoleOverride && updatedUser.email && normalizedRoleInput) {
      try {
        const normalizedEmail = updatedUser.email.trim().toLowerCase();
        const currentSetting = await prisma.platformSetting.findUnique({
          where: { key: PLATFORM_ROLE_OVERRIDES_KEY },
          select: { value: true },
        });
        const currentOverrides =
          currentSetting?.value && typeof currentSetting.value === 'object' && !Array.isArray(currentSetting.value)
            ? { ...(currentSetting.value as Record<string, unknown>) }
            : {};

        if (normalizedRoleInput === 'user') {
          delete currentOverrides[normalizedEmail];
        } else {
          currentOverrides[normalizedEmail] = normalizedRoleInput;
        }

        await prisma.platformSetting.upsert({
          where: { key: PLATFORM_ROLE_OVERRIDES_KEY },
          update: { value: currentOverrides as Prisma.InputJsonValue },
          create: { key: PLATFORM_ROLE_OVERRIDES_KEY, value: currentOverrides as Prisma.InputJsonValue },
        });
      } catch (roleOverrideError) {
        if (!isMissingPlatformSettingError(roleOverrideError)) {
          throw roleOverrideError;
        }
      }
    }

    const currentLifecycle = await getUserLifecycleStatus(user.id);
    const shouldWriteLifecycle =
      currentLifecycle.status !== normalizedLifecycleStatus ||
      (currentLifecycle.reason || null) !== (normalizedLifecycleReason || null);

    const lifecycle = shouldWriteLifecycle
      ? await setUserLifecycleStatus({
          userId: id,
          status: normalizedLifecycleStatus,
          reason: normalizedLifecycleReason,
        })
      : currentLifecycle;

    let supportLink: { type: 'magiclink' | 'recovery'; url: string } | null = null;

    if (
      (body.authAction === 'generate-magic-link' || body.authAction === 'generate-recovery-link') &&
      isSupabaseAdminConfigured()
    ) {
      const supabaseAdmin = getSupabaseAdminClient();
      const redirectTo = (() => {
        const appUrl = getSupabaseAppUrl();
        return appUrl ? `${appUrl.replace(/\/$/, '')}/auth/callback` : undefined;
      })();

      const type = body.authAction === 'generate-recovery-link' ? 'recovery' : 'magiclink';
      const generated = await supabaseAdmin.auth.admin.generateLink({
        type,
        email: updatedUser.email,
        options: {
          redirectTo,
        },
      });

      if (generated.error) {
        return NextResponse.json({ error: generated.error.message }, { status: 400 });
      }

      supportLink = generated.data.properties?.action_link
        ? {
            type,
            url: generated.data.properties.action_link,
          }
        : null;
    }

    await prisma.workspaceEvent
      .createMany({
        data: user.workspaces.map((membership) => ({
          workspace_id: membership.workspace_id,
          user_id: user.id,
          type: 'superadmin.user.updated',
          payload: {
            source: 'superadmin',
            next: {
              name: updatedUser.name,
              email: updatedUser.email,
              profilePlan: updatedProfile.plan,
              entitlementPlan: updatedSubscription.plan,
              entitlementStatus: updatedSubscription.status,
              platformRole: normalizedRoleInput,
              lifecycleStatus: lifecycle.status,
              lifecycleReason: lifecycle.reason,
              authAction: body.authAction || null,
            },
          },
        })),
      })
      .catch(() => undefined);

    const resolvedRole = await resolvePlatformRoleForEmail(updatedUser.email);

    return NextResponse.json({
      ok: true,
      supportLink,
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        profilePlan: updatedProfile.plan,
        userPlan,
        workspacePlan,
        effectiveAppPlan,
        effectiveWorkspaceId: primaryWorkspaceMembership?.workspace_id ?? null,
        effectiveWorkspaceName: primaryWorkspaceMembership?.workspace?.name ?? null,
        lifecycleStatus: lifecycle.status,
        lifecycleReason: lifecycle.reason,
        platformRole: resolvedRole.role,
        platformRoleSource: resolvedRole.source,
        entitlement: {
          plan: updatedSubscription.plan,
          status: updatedSubscription.status,
          currentPeriodEnd: toIso(updatedSubscription.current_period_end),
        },
      },
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Falha ao atualizar o usuÃ¡rio.' },
      { status: 500 }
    );
  }
}






