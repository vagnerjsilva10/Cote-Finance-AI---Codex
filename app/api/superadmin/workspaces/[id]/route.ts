import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { normalizePlan, HttpError } from '@/lib/server/multi-tenant';
import { requireSuperadminAccess } from '@/lib/server/platform-access';
import {
  getAiUsageEffectiveOffset,
  getMonthKeyFromDate,
  getRuntimePlanLimits,
  getTransactionUsageEffectiveOffset,
  getWorkspaceLifecycleStatus,
  setAiUsageResetForWorkspace,
  setTransactionUsageResetForWorkspace,
  setWorkspaceLifecycleStatus,
} from '@/lib/server/superadmin-governance';

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

async function getCurrentMonthUsage(workspaceId: string) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const monthKey = getMonthKeyFromDate(now);

  const [transactionsActual, aiActual, transactionOffset, aiOffset] = await Promise.all([
    prisma.transaction.count({
      where: {
        workspace_id: workspaceId,
        date: {
          gte: monthStart,
          lt: nextMonthStart,
        },
      },
    }),
    prisma.workspaceEvent.count({
      where: {
        workspace_id: workspaceId,
        type: {
          in: ['ai.chat.used', 'ai.classify.used'],
        },
        created_at: {
          gte: monthStart,
          lt: nextMonthStart,
        },
      },
    }),
    getTransactionUsageEffectiveOffset(workspaceId, monthKey),
    getAiUsageEffectiveOffset(workspaceId, monthKey),
  ]);

  return {
    monthKey,
    transactionsActual,
    transactionsEffective: Math.max(0, transactionsActual + transactionOffset),
    aiActual,
    aiEffective: Math.max(0, aiActual + aiOffset),
  };
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSuperadminAccess(req);
    const { id } = await params;

    const [workspace, lifecycle, usage] = await Promise.all([
      prisma.workspace.findUnique({
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
      }),
      getWorkspaceLifecycleStatus(id),
      getCurrentMonthUsage(id),
    ]);

    if (!workspace) {
      return NextResponse.json({ error: 'Workspace não encontrado.' }, { status: 404 });
    }

    const owner = workspace.members.find((member) => member.role === 'OWNER') || null;
    const plan = normalizePlan(workspace.subscription?.plan);
    const runtimeLimits = await getRuntimePlanLimits(plan);

    return NextResponse.json({
      workspace: {
        id: workspace.id,
        name: workspace.name,
        createdAt: toIso(workspace.created_at),
        updatedAt: toIso(workspace.updated_at),
        whatsappStatus: workspace.whatsapp_status || null,
        whatsappPhoneNumber: workspace.whatsapp_phone_number || null,
        lifecycleStatus: lifecycle.status,
        lifecycleReason: lifecycle.reason,
        plan,
        subscriptionStatus: workspace.subscription?.status || null,
        currentPeriodEnd: toIso(workspace.subscription?.current_period_end),
        owner: owner
          ? {
              userId: owner.user_id,
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
        limits: runtimeLimits,
        monthlyUsage: {
          transactionsActual: usage.transactionsActual,
          transactionsEffective: usage.transactionsEffective,
          transactionResetReason: null,
          aiActual: usage.aiActual,
          aiEffective: usage.aiEffective,
          aiResetReason: null,
        },
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
      action?: string;
      memberId?: string | null;
      memberRole?: string | null;
      name?: string;
      whatsappStatus?: string;
      whatsappPhoneNumber?: string | null;
      onboardingCompleted?: boolean;
      aiSuggestionsEnabled?: boolean;
      objective?: string | null;
      financialProfile?: string | null;
      lifecycleStatus?: 'ACTIVE' | 'SUSPENDED';
      lifecycleReason?: string | null;
      ownerUserId?: string | null;
      reason?: string | null;
    };

    if (body.action === 'reset-transaction-usage') {
      const workspace = await prisma.workspace.findUnique({
        where: { id },
        select: {
          id: true,
        },
      });

      if (!workspace) {
        return NextResponse.json({ error: 'Workspace não encontrado.' }, { status: 404 });
      }

      const usage = await getCurrentMonthUsage(id);
      const reset = await setTransactionUsageResetForWorkspace({
        workspaceId: id,
        actualUsage: usage.transactionsActual,
        reason: body.reason ?? null,
        monthKey: usage.monthKey,
      });

      await prisma.workspaceEvent.create({
        data: {
          workspace_id: id,
          type: 'superadmin.workspace.transaction-usage.reset',
          payload: {
            source: 'superadmin',
            actualUsage: usage.transactionsActual,
            offset: reset.offset,
            reason: reset.reason,
            monthKey: reset.monthKey,
          },
        },
      });

      return NextResponse.json({
        ok: true,
        monthlyUsage: {
          transactionsActual: usage.transactionsActual,
          transactionsEffective: 0,
          transactionResetReason: reset.reason,
          aiActual: usage.aiActual,
          aiEffective: usage.aiEffective,
          aiResetReason: null,
        },
        workspace: {
          id,
          name: '',
          whatsappStatus: null,
          whatsappPhoneNumber: null,
          lifecycleStatus: 'ACTIVE',
          lifecycleReason: null,
          ownerUserId: null,
          preference: {
            onboardingCompleted: false,
            aiSuggestionsEnabled: true,
            objective: null,
            financialProfile: null,
          },
        },
      });
    }

    if (body.action === 'reset-ai-usage') {
      const workspace = await prisma.workspace.findUnique({
        where: { id },
        select: {
          id: true,
        },
      });

      if (!workspace) {
        return NextResponse.json({ error: 'Workspace não encontrado.' }, { status: 404 });
      }

      const usage = await getCurrentMonthUsage(id);
      const reset = await setAiUsageResetForWorkspace({
        workspaceId: id,
        actualUsage: usage.aiActual,
        reason: body.reason ?? null,
        monthKey: usage.monthKey,
      });

      await prisma.workspaceEvent.create({
        data: {
          workspace_id: id,
          type: 'superadmin.workspace.ai-usage.reset',
          payload: {
            source: 'superadmin',
            actualUsage: usage.aiActual,
            offset: reset.offset,
            reason: reset.reason,
            monthKey: reset.monthKey,
          },
        },
      });

      return NextResponse.json({
        ok: true,
        monthlyUsage: {
          transactionsActual: usage.transactionsActual,
          transactionsEffective: usage.transactionsEffective,
          transactionResetReason: null,
          aiActual: usage.aiActual,
          aiEffective: 0,
          aiResetReason: reset.reason,
        },
        workspace: {
          id,
          name: '',
          whatsappStatus: null,
          whatsappPhoneNumber: null,
          lifecycleStatus: 'ACTIVE',
          lifecycleReason: null,
          ownerUserId: null,
          preference: {
            onboardingCompleted: false,
            aiSuggestionsEnabled: true,
            objective: null,
            financialProfile: null,
          },
        },
      });
    }

    if (body.action === 'update-member-role') {
      const memberId = typeof body.memberId === 'string' ? body.memberId.trim() : '';
      const memberRole =
        body.memberRole === 'OWNER' || body.memberRole === 'ADMIN' || body.memberRole === 'MEMBER'
          ? body.memberRole
          : null;

      if (!memberId || !memberRole) {
        return NextResponse.json({ error: 'Membro ou papel inválido para atualização.' }, { status: 400 });
      }

      const workspaceWithMembers = await prisma.workspace.findUnique({
        where: { id },
        include: {
          members: true,
          preference: true,
        },
      });

      if (!workspaceWithMembers) {
        return NextResponse.json({ error: 'Workspace não encontrado.' }, { status: 404 });
      }

      const targetMember = workspaceWithMembers.members.find((member) => member.id === memberId);
      if (!targetMember) {
        return NextResponse.json({ error: 'Membro não encontrado neste workspace.' }, { status: 404 });
      }

      await prisma.$transaction(async (tx) => {
        if (memberRole === 'OWNER') {
          await tx.workspaceMember.updateMany({
            where: {
              workspace_id: id,
              role: 'OWNER',
            },
            data: {
              role: 'ADMIN',
            },
          });
        }

        await tx.workspaceMember.update({
          where: { id: memberId },
          data: {
            role: memberRole,
          },
        });
      });

      await prisma.workspaceEvent.create({
        data: {
          workspace_id: id,
          user_id: targetMember.user_id,
          type: 'superadmin.workspace.member.updated',
          payload: {
            source: 'superadmin',
            memberId,
            memberRole,
          },
        },
      });

      return NextResponse.json({
        ok: true,
        member: {
          id: memberId,
          role: memberRole,
        },
      });
    }

    if (body.action === 'add-member') {
      const email = typeof body.ownerUserId === 'string' ? '' : '';
      const memberEmail = typeof (body as { memberEmail?: string | null }).memberEmail === 'string'
        ? (body as { memberEmail?: string | null }).memberEmail!.trim().toLowerCase()
        : '';
      const memberRole =
        (body as { memberRole?: string | null }).memberRole === 'ADMIN' || (body as { memberRole?: string | null }).memberRole === 'OWNER'
          ? ((body as { memberRole?: string | null }).memberRole as 'ADMIN' | 'OWNER')
          : 'MEMBER';

      if (!memberEmail) {
        return NextResponse.json({ error: 'Informe um e-mail válido para adicionar o membro.' }, { status: 400 });
      }

      const [workspaceWithMembers, targetUser] = await Promise.all([
        prisma.workspace.findUnique({
          where: { id },
          include: {
            members: true,
          },
        }),
        prisma.user.findUnique({
          where: { email: memberEmail },
          select: {
            id: true,
            email: true,
            name: true,
          },
        }),
      ]);

      if (!workspaceWithMembers) {
        return NextResponse.json({ error: 'Workspace não encontrado.' }, { status: 404 });
      }

      if (!targetUser) {
        return NextResponse.json({ error: 'Usuário não encontrado para este e-mail.' }, { status: 404 });
      }

      const existingMember = workspaceWithMembers.members.find((member) => member.user_id === targetUser.id);
      if (existingMember) {
        return NextResponse.json({ error: 'Este usuário já faz parte do workspace.' }, { status: 409 });
      }

      const createdMember = await prisma.$transaction(async (tx) => {
        if (memberRole === 'OWNER') {
          await tx.workspaceMember.updateMany({
            where: {
              workspace_id: id,
              role: 'OWNER',
            },
            data: {
              role: 'ADMIN',
            },
          });
        }

        return tx.workspaceMember.create({
          data: {
            workspace_id: id,
            user_id: targetUser.id,
            role: memberRole,
          },
        });
      });

      await prisma.workspaceEvent.create({
        data: {
          workspace_id: id,
          user_id: targetUser.id,
          type: 'superadmin.workspace.member.added',
          payload: {
            source: 'superadmin',
            memberId: createdMember.id,
            memberRole,
            memberEmail,
          },
        },
      });

      return NextResponse.json({
        ok: true,
        member: {
          id: createdMember.id,
          userId: targetUser.id,
          name: targetUser.name,
          email: targetUser.email,
          role: memberRole,
        },
      });
    }

    if (body.action === 'remove-member') {
      const memberId = typeof body.memberId === 'string' ? body.memberId.trim() : '';
      if (!memberId) {
        return NextResponse.json({ error: 'Membro inválido para remoção.' }, { status: 400 });
      }

      const workspaceWithMembers = await prisma.workspace.findUnique({
        where: { id },
        include: {
          members: true,
        },
      });

      if (!workspaceWithMembers) {
        return NextResponse.json({ error: 'Workspace não encontrado.' }, { status: 404 });
      }

      const targetMember = workspaceWithMembers.members.find((member) => member.id === memberId);
      if (!targetMember) {
        return NextResponse.json({ error: 'Membro não encontrado neste workspace.' }, { status: 404 });
      }

      if (targetMember.role === 'OWNER') {
        return NextResponse.json({ error: 'Transfira o owner antes de remover este membro.' }, { status: 409 });
      }

      await prisma.workspaceMember.delete({
        where: { id: memberId },
      });

      await prisma.workspaceEvent.create({
        data: {
          workspace_id: id,
          user_id: targetMember.user_id,
          type: 'superadmin.workspace.member.removed',
          payload: {
            source: 'superadmin',
            memberId,
          },
        },
      });

      return NextResponse.json({
        ok: true,
        member: {
          id: memberId,
        },
      });
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id },
      include: {
        preference: true,
        members: true,
      },
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

    const requestedOwnerUserId =
      typeof body.ownerUserId === 'string' && body.ownerUserId.trim() ? body.ownerUserId.trim() : null;
    const ownerMember = requestedOwnerUserId
      ? workspace.members.find((member) => member.user_id === requestedOwnerUserId)
      : workspace.members.find((member) => member.role === 'OWNER') || null;

    if (requestedOwnerUserId && !ownerMember) {
      return NextResponse.json({ error: 'O novo owner precisa já fazer parte do workspace.' }, { status: 400 });
    }

    const requestedLifecycleStatus = body.lifecycleStatus === 'SUSPENDED' ? 'SUSPENDED' : 'ACTIVE';
    const [updatedWorkspace, updatedPreference] = await prisma.$transaction(async (tx) => {
      const nextWorkspace = await tx.workspace.update({
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
      });

      const nextPref = await tx.workspacePreference.upsert({
        where: { workspace_id: id },
        update: nextPreference,
        create: {
          workspace_id: id,
          ...nextPreference,
        },
      });

      if (requestedOwnerUserId && ownerMember) {
        await tx.workspaceMember.updateMany({
          where: {
            workspace_id: id,
            role: 'OWNER',
          },
          data: {
            role: 'ADMIN',
          },
        });
        await tx.workspaceMember.update({
          where: { id: ownerMember.id },
          data: { role: 'OWNER' },
        });
      }

      return [nextWorkspace, nextPref] as const;
    });

    const lifecycle = await setWorkspaceLifecycleStatus({
      workspaceId: id,
      status: requestedLifecycleStatus,
      reason: body.lifecycleReason ?? null,
    });

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
            lifecycleStatus: lifecycle.status,
            lifecycleReason: lifecycle.reason,
            ownerUserId: requestedOwnerUserId,
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

    const usage = await getCurrentMonthUsage(id);

    return NextResponse.json({
      ok: true,
      monthlyUsage: {
        transactionsActual: usage.transactionsActual,
        transactionsEffective: usage.transactionsEffective,
        transactionResetReason: null,
        aiActual: usage.aiActual,
        aiEffective: usage.aiEffective,
        aiResetReason: null,
      },
      workspace: {
        id: updatedWorkspace.id,
        name: updatedWorkspace.name,
        whatsappStatus: updatedWorkspace.whatsapp_status || null,
        whatsappPhoneNumber: updatedWorkspace.whatsapp_phone_number || null,
        lifecycleStatus: lifecycle.status,
        lifecycleReason: lifecycle.reason,
        ownerUserId: requestedOwnerUserId,
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
