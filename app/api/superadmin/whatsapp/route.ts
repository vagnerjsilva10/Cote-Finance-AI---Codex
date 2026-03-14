import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { HttpError } from '@/lib/server/multi-tenant';
import { requireSuperadminAccess } from '@/lib/server/platform-access';
import { getWorkspaceWhatsAppConfig } from '@/lib/server/whatsapp-config';
import { getWhatsAppConfig, getWhatsAppVerifyToken } from '@/lib/whatsapp';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function toIso(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

function normalizePlan(value: string | null) {
  const normalized = (value || '').trim().toUpperCase();
  return normalized === 'FREE' || normalized === 'PRO' || normalized === 'PREMIUM' ? normalized : 'ALL';
}

function normalizeStatus(value: string | null) {
  const normalized = (value || '').trim().toUpperCase();
  return normalized === 'CONNECTED' || normalized === 'CONNECTING' || normalized === 'DISCONNECTED' ? normalized : 'ALL';
}

function hasPlanAccess(plan: string) {
  return plan === 'PRO' || plan === 'PREMIUM';
}

function classifyEvent(type: string) {
  if (type === 'whatsapp.config.updated') return 'config';
  if (type === 'whatsapp.connected' || type === 'whatsapp.disconnected') return 'connection';
  if (type.startsWith('whatsapp.daily_digest.sent.') || type.startsWith('whatsapp.digest.preview.')) return 'delivery';
  return 'general';
}

function humanizeWhatsAppEvent(type: string) {
  if (type === 'whatsapp.config.updated') return 'Configuração atualizada';
  if (type === 'whatsapp.connected') return 'Canal conectado';
  if (type === 'whatsapp.disconnected') return 'Canal desconectado';
  if (type.startsWith('whatsapp.daily_digest.sent.')) return 'Resumo diário enviado';
  if (type.startsWith('whatsapp.digest.preview.')) return 'Prévia manual enviada';
  return type;
}

function buildTrend(days: number, events: Array<{ type: string; created_at: Date }>) {
  const buckets = new Map<string, { date: string; total: number; config: number; delivery: number; connection: number }>();

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const day = new Date();
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() - offset);
    const key = day.toISOString().slice(0, 10);
    buckets.set(key, { date: key, total: 0, config: 0, delivery: 0, connection: 0 });
  }

  for (const event of events) {
    const key = event.created_at.toISOString().slice(0, 10);
    const bucket = buckets.get(key);
    if (!bucket) continue;
    bucket.total += 1;

    const category = classifyEvent(event.type);
    if (category === 'config') bucket.config += 1;
    if (category === 'delivery') bucket.delivery += 1;
    if (category === 'connection') bucket.connection += 1;
  }

  return Array.from(buckets.values());
}

export async function GET(req: Request) {
  try {
    await requireSuperadminAccess(req);

    const { searchParams } = new URL(req.url);
    const query = (searchParams.get('q') || '').trim();
    const planFilter = normalizePlan(searchParams.get('plan'));
    const statusFilter = normalizeStatus(searchParams.get('status'));

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

    if (statusFilter !== 'ALL') {
      whereClauses.push({ whatsapp_status: statusFilter });
    }

    if (planFilter !== 'ALL') {
      whereClauses.push(
        planFilter === 'FREE'
          ? { OR: [{ subscription: null }, { subscription: { plan: 'FREE' } }] }
          : { subscription: { plan: planFilter } }
      );
    }

    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);
    const last14Days = new Date();
    last14Days.setDate(last14Days.getDate() - 13);
    last14Days.setHours(0, 0, 0, 0);

    const workspaces = await prisma.workspace.findMany({
      where: whereClauses.length > 0 ? { AND: whereClauses } : {},
      orderBy: [{ updated_at: 'desc' }],
      include: {
        subscription: true,
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

    const [configs, recentEvents, last30Events] = await Promise.all([
      Promise.all(workspaceIds.map((workspaceId) => getWorkspaceWhatsAppConfig(workspaceId))),
      workspaceIds.length === 0
        ? Promise.resolve([])
        : prisma.workspaceEvent.findMany({
            where: {
              workspace_id: { in: workspaceIds },
              type: { startsWith: 'whatsapp.' },
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
      workspaceIds.length === 0
        ? Promise.resolve([])
        : prisma.workspaceEvent.findMany({
            where: {
              workspace_id: { in: workspaceIds },
              type: { startsWith: 'whatsapp.' },
              created_at: { gte: last30Days },
            },
            select: {
              workspace_id: true,
              type: true,
              created_at: true,
            },
          }),
    ]);

    const configByWorkspace = new Map(workspaceIds.map((workspaceId, index) => [workspaceId, configs[index]]));
    const lastEventByWorkspace = new Map<string, string | null>();
    for (const event of recentEvents) {
      if (!lastEventByWorkspace.has(event.workspace_id)) {
        lastEventByWorkspace.set(event.workspace_id, toIso(event.created_at));
      }
    }

    const rows = workspaces.map((workspace) => {
      const owner = workspace.members.find((member) => member.role === 'OWNER') || null;
      const plan = workspace.subscription?.plan || 'FREE';
      const config = configByWorkspace.get(workspace.id);

      return {
        workspaceId: workspace.id,
        workspaceName: workspace.name,
        ownerName: owner?.user.name ?? null,
        ownerEmail: owner?.user.email ?? null,
        plan,
        hasPlanAccess: hasPlanAccess(plan),
        whatsappStatus: workspace.whatsapp_status || 'DISCONNECTED',
        whatsappPhoneNumber: workspace.whatsapp_phone_number || null,
        whatsappConnectedAt: toIso(workspace.whatsapp_connected_at),
        configUpdatedAt: config?.updatedAt || null,
        lastEventAt: lastEventByWorkspace.get(workspace.id) || null,
      };
    });

    const summary = rows.reduce(
      (acc, item) => {
        acc.totalWorkspaces += 1;
        if (item.hasPlanAccess) acc.eligibleWorkspaces += 1;
        if (item.whatsappStatus === 'CONNECTED') acc.connectedWorkspaces += 1;
        if (item.whatsappStatus === 'CONNECTING') acc.connectingWorkspaces += 1;
        if (item.whatsappStatus === 'DISCONNECTED') acc.disconnectedWorkspaces += 1;
        return acc;
      },
      {
        totalWorkspaces: 0,
        eligibleWorkspaces: 0,
        connectedWorkspaces: 0,
        connectingWorkspaces: 0,
        disconnectedWorkspaces: 0,
        configUpdatesLast30Days: last30Events.filter((event) => event.type === 'whatsapp.config.updated').length,
        digestsSentLast30Days: last30Events.filter((event) => event.type.startsWith('whatsapp.daily_digest.sent.')).length,
        previewTestsLast30Days: last30Events.filter((event) => event.type.startsWith('whatsapp.digest.preview.')).length,
      }
    );

    const environment = {
      apiConfigured: (() => {
        try {
          getWhatsAppConfig();
          return true;
        } catch {
          return false;
        }
      })(),
      verifyConfigured: (() => {
        try {
          getWhatsAppVerifyToken();
          return true;
        } catch {
          return false;
        }
      })(),
      signatureValidationEnabled: Boolean(process.env.WHATSAPP_APP_SECRET?.trim()),
      connectTemplateConfigured: Boolean(process.env.WHATSAPP_TEMPLATE_CONNECT_NAME?.trim()),
      digestTemplateConfigured: Boolean(process.env.WHATSAPP_TEMPLATE_DIGEST_NAME?.trim()),
      templateLanguage: process.env.WHATSAPP_TEMPLATE_LANGUAGE?.trim() || 'pt_BR',
      phoneNumberIdConfigured: Boolean(process.env.WHATSAPP_PHONE_NUMBER_ID?.trim()),
    };

    return NextResponse.json({
      query,
      filters: {
        plan: planFilter,
        status: statusFilter,
      },
      summary,
      environment,
      trend: buildTrend(14, last30Events.filter((event) => event.created_at >= last14Days)),
      total: rows.length,
      workspaces: rows.sort((a, b) => {
        if (a.whatsappStatus !== b.whatsappStatus) return a.whatsappStatus.localeCompare(b.whatsappStatus);
        return a.workspaceName.localeCompare(b.workspaceName, 'pt-BR');
      }),
      recentEvents: recentEvents.map((event) => ({
        id: event.id,
        type: event.type,
        typeLabel: humanizeWhatsAppEvent(event.type),
        category: classifyEvent(event.type),
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

    return NextResponse.json({ error: 'Falha ao carregar operação de WhatsApp.' }, { status: 500 });
  }
}

