import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { PLAN_LIMITS, normalizePlan, HttpError } from '@/lib/server/multi-tenant';
import { requireSuperadminAccess } from '@/lib/server/platform-access';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED_WHATSAPP_STATUSES = new Set(['CONNECTED', 'CONNECTING', 'DISCONNECTED']);

function toIso(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

function normalizeWhatsappStatus(value: unknown) {
  const normalized = typeof value === 'string' ? value.trim().toUpperCase() : '';
  return ALLOWED_WHATSAPP_STATUSES.has(normalized) ? normalized : null;
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

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSuperadminAccess(req);
    const { id } = await params;

    const body = (await req.json()) as {
      name?: string;
      whatsappStatus?: string;
      whatsappPhoneNumber?: string | null;
      onboardingCompleted?: boolean;
      aiSuggestionsEnabled?: boolean;
      objective?: string | null;
      financialProfile?: string | null;
    };

    const workspace = await prisma.workspace.findUnique({
      where: { id },
      include: { preference: true },
    });

    if (!workspace) {
      return NextResponse.json({ error: 'Workspace não encontrado.' }, { status: 404 });
    }

    const nextName = typeof body.name === 'string' && body.name.trim() ? body.name.trim() : workspace.name;
    const nextWhatsappStatus = normalizeWhatsappStatus(body.whatsappStatus) || workspace.whatsapp_status || 'DISCONNECTED';
    const nextWhatsappPhoneNumber =
      typeof body.whatsappPhoneNumber === 'string'
        ? body.whatsappPhoneNumber.trim() || null
        : body.whatsappPhoneNumber === null
          ? null
          : workspace.whatsapp_phone_number || null;

    const nextPreference = {
      onboarding_completed:
        typeof body.onboardingCompleted === 'boolean'
          ? body.onboardingCompleted
          : workspace.preference?.onboarding_completed ?? false,
      ai_suggestions_enabled:
        typeof body.aiSuggestionsEnabled === 'boolean'
          ? body.aiSuggestionsEnabled
          : workspace.preference?.ai_suggestions_enabled ?? true,
      objective:
        typeof body.objective === 'string'
          ? body.objective.trim() || null
          : body.objective === null
            ? null
            : workspace.preference?.objective || null,
      financial_profile:
        typeof body.financialProfile === 'string'
          ? body.financialProfile.trim() || null
          : body.financialProfile === null
            ? null
            : workspace.preference?.financial_profile || null,
    };

    const [updatedWorkspace, updatedPreference] = await prisma.$transaction([
      prisma.workspace.update({
        where: { id },
        data: {
          name: nextName,
          whatsapp_status: nextWhatsappStatus,
          whatsapp_phone_number: nextWhatsappPhoneNumber,
          whatsapp_connected_at:
            nextWhatsappStatus === 'CONNECTED'
              ? workspace.whatsapp_connected_at || new Date()
              : nextWhatsappStatus === 'DISCONNECTED'
                ? null
                : workspace.whatsapp_connected_at,
        },
      }),
      prisma.workspacePreference.upsert({
        where: { workspace_id: id },
        update: nextPreference,
        create: {
          workspace_id: id,
          ...nextPreference,
        },
      }),
    ]);

    await prisma.workspaceEvent.create({
      data: {
        workspace_id: id,
        type: 'superadmin.workspace.updated',
        payload: {
          source: 'superadmin',
          previous: {
            name: workspace.name,
            whatsappStatus: workspace.whatsapp_status,
            whatsappPhoneNumber: workspace.whatsapp_phone_number,
            preference: workspace.preference
              ? {
                  onboardingCompleted: workspace.preference.onboarding_completed,
                  aiSuggestionsEnabled: workspace.preference.ai_suggestions_enabled,
                  objective: workspace.preference.objective,
                  financialProfile: workspace.preference.financial_profile,
                }
              : null,
          },
          next: {
            name: updatedWorkspace.name,
            whatsappStatus: updatedWorkspace.whatsapp_status,
            whatsappPhoneNumber: updatedWorkspace.whatsapp_phone_number,
            preference: {
              onboardingCompleted: updatedPreference.onboarding_completed,
              aiSuggestionsEnabled: updatedPreference.ai_suggestions_enabled,
              objective: updatedPreference.objective,
              financialProfile: updatedPreference.financial_profile,
            },
          },
        },
      },
    });

    return NextResponse.json({
      ok: true,
      workspace: {
        id: updatedWorkspace.id,
        name: updatedWorkspace.name,
        whatsappStatus: updatedWorkspace.whatsapp_status || null,
        whatsappPhoneNumber: updatedWorkspace.whatsapp_phone_number || null,
        preference: {
          onboardingCompleted: updatedPreference.onboarding_completed,
          aiSuggestionsEnabled: updatedPreference.ai_suggestions_enabled,
          objective: updatedPreference.objective,
          financialProfile: updatedPreference.financial_profile,
        },
      },
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: 'Falha ao atualizar workspace.' }, { status: 500 });
  }
}
