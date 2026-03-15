import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { HttpError } from '@/lib/server/multi-tenant';
import { requireSuperadminAccess } from '@/lib/server/platform-access';
import {
  getFeatureFlagGovernance,
  removeFeatureFlagUserOverride,
  removeFeatureFlagWorkspaceOverride,
  saveFeatureFlagGovernance,
  setFeatureFlagUserOverride,
  setFeatureFlagWorkspaceOverride,
  type FeatureFlagCode,
} from '@/lib/server/superadmin-governance';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function normalizeFeatureFlagCode(value: unknown): FeatureFlagCode {
  return value === 'advanced_ai_insights' ||
    value === 'whatsapp_automation' ||
    value === 'pix_checkout' ||
    value === 'meta_tracking' ||
    value === 'beta_superadmin_modules'
    ? value
    : 'advanced_ai_insights';
}

function normalizePlanCode(value: unknown) {
  return value === 'FREE' || value === 'PRO' || value === 'PREMIUM' ? value : 'FREE';
}

async function buildResponse(params?: { workspaceSearch?: string; userSearch?: string }) {
  const governance = await getFeatureFlagGovernance();
  const workspaceSearch = (params?.workspaceSearch || '').trim();
  const userSearch = (params?.userSearch || '').trim();

  const [workspaceRows, userRows] = await Promise.all([
    workspaceSearch
      ? prisma.workspace.findMany({
          where: {
            OR: [{ id: { contains: workspaceSearch } }, { name: { contains: workspaceSearch, mode: 'insensitive' } }],
          },
          select: { id: true, name: true, subscription: { select: { plan: true } } },
          take: 8,
          orderBy: { updated_at: 'desc' },
        })
      : Promise.resolve([]),
    userSearch
      ? prisma.user.findMany({
          where: {
            OR: [
              { id: { contains: userSearch } },
              { email: { contains: userSearch, mode: 'insensitive' } },
              { name: { contains: userSearch, mode: 'insensitive' } },
            ],
          },
          select: {
            id: true,
            email: true,
            name: true,
            subscription: { select: { plan: true } },
          },
          take: 8,
          orderBy: { updated_at: 'desc' },
        })
      : Promise.resolve([]),
  ]);

  const workspaceNameById = new Map<string, string>();
  const userIdentityById = new Map<string, { name: string | null; email: string }>();

  const overrideWorkspaceIds = Array.from(
    new Set(Object.values(governance.workspaceOverrides).flatMap((entries) => Object.keys(entries || {})))
  );
  const overrideUserIds = Array.from(new Set(Object.values(governance.userOverrides).flatMap((entries) => Object.keys(entries || {}))));

  const [overrideWorkspaces, overrideUsers] = await Promise.all([
    overrideWorkspaceIds.length
      ? prisma.workspace.findMany({
          where: { id: { in: overrideWorkspaceIds } },
          select: { id: true, name: true, subscription: { select: { plan: true } } },
        })
      : Promise.resolve([]),
    overrideUserIds.length
      ? prisma.user.findMany({
          where: { id: { in: overrideUserIds } },
          select: { id: true, name: true, email: true, subscription: { select: { plan: true } } },
        })
      : Promise.resolve([]),
  ]);

  overrideWorkspaces.forEach((workspace) => workspaceNameById.set(workspace.id, workspace.name));
  overrideUsers.forEach((user) => userIdentityById.set(user.id, { name: user.name, email: user.email }));

  return {
    flags: governance.flags,
    summary: {
      total: governance.flags.length,
      enabled: governance.flags.filter((flag) => flag.enabled).length,
      disabled: governance.flags.filter((flag) => !flag.enabled).length,
      workspaceOverrides: Object.values(governance.workspaceOverrides).reduce((acc, map) => acc + Object.keys(map || {}).length, 0),
      userOverrides: Object.values(governance.userOverrides).reduce((acc, map) => acc + Object.keys(map || {}).length, 0),
    },
    workspaceOverrides: governance.flags.flatMap((flag) =>
      Object.entries(governance.workspaceOverrides[flag.key] || {}).map(([workspaceId, entry]) => ({
        flagKey: flag.key,
        flagLabel: flag.label,
        workspaceId,
        workspaceName: workspaceNameById.get(workspaceId) || workspaceId,
        enabled: entry.enabled,
        reason: entry.reason,
        updatedAt: entry.updatedAt,
      }))
    ),
    userOverrides: governance.flags.flatMap((flag) =>
      Object.entries(governance.userOverrides[flag.key] || {}).map(([userId, entry]) => ({
        flagKey: flag.key,
        flagLabel: flag.label,
        userId,
        userName: userIdentityById.get(userId)?.name || null,
        userEmail: userIdentityById.get(userId)?.email || userId,
        enabled: entry.enabled,
        reason: entry.reason,
        updatedAt: entry.updatedAt,
      }))
    ),
    search: {
      workspaceQuery: workspaceSearch,
      userQuery: userSearch,
      workspaces: workspaceRows.map((workspace) => ({
        id: workspace.id,
        name: workspace.name,
        plan: normalizePlanCode(workspace.subscription?.plan || 'FREE'),
      })),
      users: userRows.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        plan: normalizePlanCode(user.subscription?.plan || 'FREE'),
      })),
    },
  };
}

export async function GET(req: Request) {
  try {
    await requireSuperadminAccess(req);
    const { searchParams } = new URL(req.url);
    const workspaceSearch = searchParams.get('workspaceSearch') || '';
    const userSearch = searchParams.get('userSearch') || '';

    return NextResponse.json(await buildResponse({ workspaceSearch, userSearch }));
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: 'Falha ao carregar feature flags.' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    await requireSuperadminAccess(req);
    const body = (await req.json()) as {
      flags?: Array<{
        key: FeatureFlagCode;
        label: string;
        description: string;
        scope: string;
        enabled: boolean;
        allowedPlans: Array<'FREE' | 'PRO' | 'PREMIUM'>;
      }>;
    };

    const governance = await getFeatureFlagGovernance();
    const incomingFlags = Array.isArray(body?.flags) ? body.flags : [];
    governance.flags = governance.flags.map((flag) => {
      const next = incomingFlags.find((item) => item.key === flag.key);
      if (!next) return flag;
      return {
        ...flag,
        label: typeof next.label === 'string' && next.label.trim() ? next.label.trim() : flag.label,
        description:
          typeof next.description === 'string' && next.description.trim() ? next.description.trim() : flag.description,
        scope: typeof next.scope === 'string' && next.scope.trim() ? next.scope.trim() : flag.scope,
        enabled: typeof next.enabled === 'boolean' ? next.enabled : flag.enabled,
        allowedPlans: Array.isArray(next.allowedPlans) && next.allowedPlans.length > 0 ? next.allowedPlans : flag.allowedPlans,
      };
    });

    await saveFeatureFlagGovernance(governance);
    return NextResponse.json(await buildResponse());
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: 'Falha ao salvar feature flags.' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    await requireSuperadminAccess(req);
    const body = (await req.json()) as
      | {
          action: 'set-workspace-override';
          flagKey: FeatureFlagCode;
          workspaceId: string;
          enabled: boolean;
          reason?: string | null;
        }
      | {
          action: 'remove-workspace-override';
          flagKey: FeatureFlagCode;
          workspaceId: string;
        }
      | {
          action: 'set-user-override';
          flagKey: FeatureFlagCode;
          userId: string;
          enabled: boolean;
          reason?: string | null;
        }
      | {
          action: 'remove-user-override';
          flagKey: FeatureFlagCode;
          userId: string;
        };

    if (body.action === 'set-workspace-override') {
      await setFeatureFlagWorkspaceOverride(body);
    } else if (body.action === 'remove-workspace-override') {
      await removeFeatureFlagWorkspaceOverride(body);
    } else if (body.action === 'set-user-override') {
      await setFeatureFlagUserOverride(body);
    } else if (body.action === 'remove-user-override') {
      await removeFeatureFlagUserOverride(body);
    } else {
      return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 });
    }

    return NextResponse.json(await buildResponse());
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: 'Falha ao atualizar rollout de feature flags.' }, { status: 500 });
  }
}
