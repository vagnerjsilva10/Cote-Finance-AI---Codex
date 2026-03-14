import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { HttpError } from '@/lib/server/multi-tenant';
import { requireSuperadminAccess } from '@/lib/server/platform-access';
import {
  getWorkspaceLifecycleMap,
  type WorkspaceLifecycleStatus,
} from '@/lib/server/superadmin-governance';

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

    const [workspaces, lifecycleMap] = await Promise.all([
      prisma.workspace.findMany({
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
    }),
      getWorkspaceLifecycleMap(),
    ]);

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
          lifecycleStatus: lifecycleMap[workspace.id]?.status || 'ACTIVE',
          lifecycleReason: lifecycleMap[workspace.id]?.reason || null,
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

export async function POST(req: Request) {
  try {
    const access = await requireSuperadminAccess(req);
    const body = (await req.json()) as {
      name?: string;
      ownerUserId?: string;
      ownerEmail?: string;
      initialPlan?: string;
    };

    const name = typeof body.name === 'string' && body.name.trim() ? body.name.trim() : 'Novo workspace';
    const ownerUserId = typeof body.ownerUserId === 'string' && body.ownerUserId.trim() ? body.ownerUserId.trim() : '';
    const ownerEmail = typeof body.ownerEmail === 'string' && body.ownerEmail.trim() ? body.ownerEmail.trim().toLowerCase() : '';
    const initialPlan: 'FREE' | 'PRO' | 'PREMIUM' =
      body.initialPlan === 'PRO' || body.initialPlan === 'PREMIUM' ? body.initialPlan : 'FREE';

    const owner = ownerUserId
      ? await prisma.user.findUnique({ where: { id: ownerUserId }, select: { id: true, email: true, name: true } })
      : ownerEmail
        ? await prisma.user.findUnique({ where: { email: ownerEmail }, select: { id: true, email: true, name: true } })
        : null;

    if (!owner) {
      return NextResponse.json({ error: 'Selecione um owner válido para o workspace.' }, { status: 400 });
    }

    const created = await prisma.$transaction(async (tx) => {
      const workspace = await tx.workspace.create({
        data: { name },
      });

      await tx.workspaceMember.create({
        data: {
          workspace_id: workspace.id,
          user_id: owner.id,
          role: 'OWNER',
        },
      });

      await tx.workspacePreference.create({
        data: {
          workspace_id: workspace.id,
          onboarding_completed: false,
          ai_suggestions_enabled: true,
        },
      });

      await tx.workspaceSubscription.create({
        data: {
          workspace_id: workspace.id,
          plan: initialPlan,
          status: 'ACTIVE',
        },
      });

      await tx.wallet.create({
        data: {
          workspace_id: workspace.id,
          name: 'Carteira Principal',
          type: 'CASH',
          balance: 0,
        },
      });

      await tx.workspaceEvent.create({
        data: {
          workspace_id: workspace.id,
          user_id: owner.id,
          type: 'superadmin.workspace.created',
          payload: {
            source: 'superadmin',
            createdBy: access.email,
            initialPlan,
          },
        },
      });

      return workspace;
    });

    return NextResponse.json(
      {
        ok: true,
        workspace: {
          id: created.id,
          name: created.name,
          ownerName: owner.name,
          ownerEmail: owner.email,
          plan: initialPlan,
          subscriptionStatus: 'ACTIVE',
          lifecycleStatus: 'ACTIVE' as WorkspaceLifecycleStatus,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: 'Falha ao criar workspace pelo Super Admin.' }, { status: 500 });
  }
}
