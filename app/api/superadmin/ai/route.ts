import { NextResponse } from 'next/server';

import { PLAN_LIMITS, type WorkspacePlan } from '@/lib/billing/limits';
import { prisma } from '@/lib/prisma';
import { HttpError } from '@/lib/server/multi-tenant';
import { requireSuperadminAccess } from '@/lib/server/platform-access';
import {
  getAiUsageOverrideMap,
  getMonthKeyFromDate,
  setAiUsageResetForWorkspace,
} from '@/lib/server/superadmin-governance';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const AI_EVENT_TYPES = ['ai.chat.used', 'ai.classify.used'] as const;
const PLAN_OPTIONS: WorkspacePlan[] = ['FREE', 'PRO', 'PREMIUM'];

type AiEventType = (typeof AI_EVENT_TYPES)[number];

type WorkspaceUsageAccumulator = {
  chat: number;
  classify: number;
};

function toIso(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

function normalizePlan(value: string | null): WorkspacePlan | 'ALL' {
  if (!value) return 'ALL';
  const normalized = value.trim().toUpperCase();
  return PLAN_OPTIONS.includes(normalized as WorkspacePlan) ? (normalized as WorkspacePlan) : 'ALL';
}

function getUsageRate(usage: number, limit: number | null) {
  if (typeof limit !== 'number' || limit <= 0) return null;
  return Number(((usage / limit) * 100).toFixed(1));
}

function getTypeLabel(type: AiEventType) {
  return type === 'ai.chat.used' ? 'Chat com IA' : 'Classificação automática';
}

function emptyUsageAccumulator(): WorkspaceUsageAccumulator {
  return { chat: 0, classify: 0 };
}

function buildDailyTrend(days: number, events: Array<{ type: string; created_at: Date }>) {
  const buckets = new Map<string, { date: string; total: number; chat: number; classify: number }>();

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const day = new Date();
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() - offset);
    const key = day.toISOString().slice(0, 10);
    buckets.set(key, { date: key, total: 0, chat: 0, classify: 0 });
  }

  for (const event of events) {
    const key = event.created_at.toISOString().slice(0, 10);
    const bucket = buckets.get(key);
    if (!bucket) continue;

    bucket.total += 1;
    if (event.type === 'ai.chat.used') bucket.chat += 1;
    if (event.type === 'ai.classify.used') bucket.classify += 1;
  }

  return Array.from(buckets.values());
}

export async function GET(req: Request) {
  try {
    await requireSuperadminAccess(req);

    const { searchParams } = new URL(req.url);
    const query = (searchParams.get('q') || '').trim();
    const planFilter = normalizePlan(searchParams.get('plan'));

    const whereClauses: Array<Record<string, unknown>> = [];

    if (query) {
      whereClauses.push({
        OR: [
          { id: { contains: query } },
          { name: { contains: query, mode: 'insensitive' } },
          {
            members: {
              some: {
                user: {
                  email: { contains: query, mode: 'insensitive' },
                },
              },
            },
          },
        ],
      });
    }

    if (planFilter !== 'ALL') {
      whereClauses.push(
        planFilter === 'FREE'
          ? { OR: [{ subscription: null }, { subscription: { plan: 'FREE' } }] }
          : { subscription: { plan: planFilter } }
      );
    }

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const last14Days = new Date(now);
    last14Days.setDate(last14Days.getDate() - 13);
    last14Days.setHours(0, 0, 0, 0);

    const workspaces = await prisma.workspace.findMany({
      where: whereClauses.length > 0 ? { AND: whereClauses } : {},
      orderBy: [{ updated_at: 'desc' }],
      include: {
        subscription: true,
        preference: true,
        members: {
          include: {
            user: {
              select: {
                email: true,
                name: true,
              },
            },
          },
        },
      },
    });

    const workspaceIds = workspaces.map((workspace) => workspace.id);

    if (workspaceIds.length === 0) {
      return NextResponse.json({
        query,
        filters: { plan: planFilter },
        summary: {
          totalWorkspaces: 0,
          activeWorkspaces: 0,
          totalInteractionsThisMonth: 0,
          chatInteractionsThisMonth: 0,
          classifyInteractionsThisMonth: 0,
          workspacesNearLimit: 0,
          aiSuggestionsEnabled: 0,
          averageUsagePerActiveWorkspace: 0,
          geminiConfigured: Boolean(process.env.GEMINI_API_KEY?.trim()),
        },
        quotaReference: Object.fromEntries(
          Object.entries(PLAN_LIMITS).map(([plan, limits]) => [plan, { aiInteractionsPerMonth: limits.aiInteractionsPerMonth }])
        ),
        trend: buildDailyTrend(14, []),
        total: 0,
        workspaces: [],
        recentEvents: [],
      });
    }

    const [currentMonthGroups, lastAiEventGroups, recentEvents, trendEvents, aiOverrides] = await Promise.all([
      prisma.workspaceEvent.groupBy({
        by: ['workspace_id', 'type'],
        where: {
          workspace_id: { in: workspaceIds },
          type: { in: [...AI_EVENT_TYPES] },
          created_at: {
            gte: monthStart,
            lt: nextMonthStart,
          },
        },
        _count: {
          _all: true,
        },
      }),
      prisma.workspaceEvent.groupBy({
        by: ['workspace_id'],
        where: {
          workspace_id: { in: workspaceIds },
          type: { in: [...AI_EVENT_TYPES] },
        },
        _max: {
          created_at: true,
        },
      }),
      prisma.workspaceEvent.findMany({
        where: {
          workspace_id: { in: workspaceIds },
          type: { in: [...AI_EVENT_TYPES] },
        },
        orderBy: { created_at: 'desc' },
        take: 24,
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
      }),
      prisma.workspaceEvent.findMany({
        where: {
          workspace_id: { in: workspaceIds },
          type: { in: [...AI_EVENT_TYPES] },
          created_at: {
            gte: last14Days,
          },
        },
        select: {
          type: true,
          created_at: true,
        },
      }),
      getAiUsageOverrideMap(),
    ]);

    const usageByWorkspace = new Map<string, WorkspaceUsageAccumulator>();
    for (const row of currentMonthGroups) {
      const accumulator = usageByWorkspace.get(row.workspace_id) ?? emptyUsageAccumulator();
      if (row.type === 'ai.chat.used') accumulator.chat = row._count._all;
      if (row.type === 'ai.classify.used') accumulator.classify = row._count._all;
      usageByWorkspace.set(row.workspace_id, accumulator);
    }

    const lastEventByWorkspace = new Map<string, string | null>(
      lastAiEventGroups.map((row) => [row.workspace_id, toIso(row._max.created_at)])
    );

    const currentMonthKey = getMonthKeyFromDate(now);
    const workspaceRows = workspaces
      .map((workspace) => {
        const owner = workspace.members.find((member) => member.role === 'OWNER') || null;
        const resolvedPlan = (workspace.subscription?.plan || 'FREE') as WorkspacePlan;
        const usage = usageByWorkspace.get(workspace.id) ?? emptyUsageAccumulator();
        const currentMonthUsage = usage.chat + usage.classify;
        const resetOffset = aiOverrides[`${workspace.id}:${currentMonthKey}`]?.offset || 0;
        const resetReason = aiOverrides[`${workspace.id}:${currentMonthKey}`]?.reason || null;
        const effectiveUsage = Math.max(0, currentMonthUsage + resetOffset);
        const limit = PLAN_LIMITS[resolvedPlan].aiInteractionsPerMonth;
        const usageRate = getUsageRate(effectiveUsage, limit);

        return {
          workspaceId: workspace.id,
          workspaceName: workspace.name,
          ownerName: owner?.user.name ?? null,
          ownerEmail: owner?.user.email ?? null,
          plan: resolvedPlan,
          currentMonthUsage,
          effectiveUsage,
          chatUsage: usage.chat,
          classifyUsage: usage.classify,
          limit,
          usageRate,
          nearLimit: typeof limit === 'number' ? effectiveUsage >= Math.ceil(limit * 0.8) : false,
          aiSuggestionsEnabled: workspace.preference?.ai_suggestions_enabled ?? false,
          resetOffset,
          resetReason,
          lastAiEventAt: lastEventByWorkspace.get(workspace.id) ?? null,
        };
      })
      .sort((a, b) => {
        if (b.currentMonthUsage !== a.currentMonthUsage) return b.currentMonthUsage - a.currentMonthUsage;
        if ((b.lastAiEventAt || '') !== (a.lastAiEventAt || '')) return (b.lastAiEventAt || '').localeCompare(a.lastAiEventAt || '');
        return a.workspaceName.localeCompare(b.workspaceName, 'pt-BR');
      });

    const totalInteractionsThisMonth = workspaceRows.reduce((sum, item) => sum + item.currentMonthUsage, 0);
    const chatInteractionsThisMonth = workspaceRows.reduce((sum, item) => sum + item.chatUsage, 0);
    const classifyInteractionsThisMonth = workspaceRows.reduce((sum, item) => sum + item.classifyUsage, 0);
    const activeWorkspaces = workspaceRows.filter((item) => item.currentMonthUsage > 0).length;
    const workspacesNearLimit = workspaceRows.filter((item) => item.nearLimit).length;
    const aiSuggestionsEnabled = workspaceRows.filter((item) => item.aiSuggestionsEnabled).length;

    return NextResponse.json({
      query,
      filters: {
        plan: planFilter,
      },
      summary: {
        totalWorkspaces: workspaceRows.length,
        activeWorkspaces,
        totalInteractionsThisMonth,
        chatInteractionsThisMonth,
        classifyInteractionsThisMonth,
        workspacesNearLimit,
        aiSuggestionsEnabled,
        averageUsagePerActiveWorkspace: activeWorkspaces > 0 ? Number((totalInteractionsThisMonth / activeWorkspaces).toFixed(1)) : 0,
        geminiConfigured: Boolean(process.env.GEMINI_API_KEY?.trim()),
      },
      quotaReference: Object.fromEntries(
        Object.entries(PLAN_LIMITS).map(([plan, limits]) => [plan, { aiInteractionsPerMonth: limits.aiInteractionsPerMonth }])
      ),
      trend: buildDailyTrend(14, trendEvents),
      total: workspaceRows.length,
      workspaces: workspaceRows,
      recentEvents: recentEvents.map((event) => ({
        id: event.id,
        type: event.type,
        typeLabel: getTypeLabel(event.type as AiEventType),
        createdAt: toIso(event.created_at),
        workspaceId: event.workspace_id,
        workspaceName: event.workspace?.name || 'Sem workspace',
        userId: event.user_id,
        userEmail: event.user?.email ?? null,
        userName: event.user?.name ?? null,
        payload: event.payload,
      })),
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: 'Falha ao carregar métricas de IA.' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const access = await requireSuperadminAccess(req);
    const body = (await req.json()) as {
      workspaceId?: string;
      action?: string;
      reason?: string | null;
    };

    const workspaceId = typeof body.workspaceId === 'string' ? body.workspaceId.trim() : '';
    if (!workspaceId) {
      return NextResponse.json({ error: 'Workspace inválido para a operação de IA.' }, { status: 400 });
    }

    if (body.action !== 'reset-usage') {
      return NextResponse.json({ error: 'Ação de IA não suportada.' }, { status: 400 });
    }

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const actualUsage = await prisma.workspaceEvent.count({
      where: {
        workspace_id: workspaceId,
        type: { in: [...AI_EVENT_TYPES] },
        created_at: { gte: monthStart, lt: nextMonthStart },
      },
    });

    const reset = await setAiUsageResetForWorkspace({
      workspaceId,
      actualUsage,
      reason: body.reason || `Reset administrativo por ${access.email || 'superadmin'}`,
    });

    await prisma.workspaceEvent.create({
      data: {
        workspace_id: workspaceId,
        type: 'superadmin.ai.usage.reset',
        payload: {
          source: 'superadmin',
          resetBy: access.email,
          actualUsage,
          offset: reset.offset,
          reason: reset.reason,
          monthKey: reset.monthKey,
        },
      },
    });

    return NextResponse.json({
      ok: true,
      workspaceId,
      effectiveUsage: 0,
      resetOffset: reset.offset,
      resetReason: reset.reason,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: 'Falha ao executar ação administrativa de IA.' }, { status: 500 });
  }
}
