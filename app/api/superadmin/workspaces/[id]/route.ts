import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { PLAN_LIMITS, normalizePlan, HttpError } from '@/lib/server/multi-tenant';
import { requireSuperadminAccess } from '@/lib/server/platform-access';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function toIso(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSuperadminAccess(req);
    const { id } = await params;

    const workspace = await prisma.workspace.findUnique({
      where: { id },
      include: {
        subscription: true,
        preference: true,
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        _count: {
          select: {
            wallets: true,
            transactions: true,
            goals: true,
            debts: true,
            investments: true,
            events: true,
          },
        },
        events: {
          take: 12,
          orderBy: {
            created_at: 'desc',
          },
          include: {
            user: {
              select: {
                email: true,
              },
            },
          },
        },
      },
    });

    if (!workspace) {
      return NextResponse.json({ error: 'Workspace não encontrado.' }, { status: 404 });
    }

    const owner = workspace.members.find((member) => member.role === 'OWNER') || null;
    const plan = normalizePlan(workspace.subscription?.plan);

    return NextResponse.json({
      workspace: {
        id: workspace.id,
        name: workspace.name,
        createdAt: toIso(workspace.created_at),
        updatedAt: toIso(workspace.updated_at),
        whatsappStatus: workspace.whatsapp_status || null,
        whatsappPhoneNumber: workspace.whatsapp_phone_number || null,
        plan,
        subscriptionStatus: workspace.subscription?.status || null,
        currentPeriodEnd: toIso(workspace.subscription?.current_period_end),
        owner: owner
          ? {
              name: owner.user.name,
              email: owner.user.email,
            }
          : null,
        members: workspace.members.map((member) => ({
          id: member.id,
          userId: member.user_id,
          name: member.user.name,
          email: member.user.email,
          role: member.role,
        })),
        resourceCounts: {
          wallets: workspace._count.wallets,
          transactions: workspace._count.transactions,
          goals: workspace._count.goals,
          debts: workspace._count.debts,
          investments: workspace._count.investments,
          events: workspace._count.events,
        },
        limits: PLAN_LIMITS[plan],
        preference: workspace.preference
          ? {
              onboardingCompleted: workspace.preference.onboarding_completed,
              objective: workspace.preference.objective,
              financialProfile: workspace.preference.financial_profile,
              aiSuggestionsEnabled: workspace.preference.ai_suggestions_enabled,
            }
          : null,
        recentEvents: workspace.events.map((event) => ({
          id: event.id,
          type: event.type,
          createdAt: toIso(event.created_at),
          userEmail: event.user?.email ?? null,
        })),
      },
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: 'Falha ao carregar o detalhe do workspace.' }, { status: 500 });
  }
}
