import 'server-only';

import { prisma } from '@/lib/prisma';
import { getRuntimePlanLimits } from '@/lib/server/superadmin-governance';
import {
  getWorkspacePlan,
  getWorkspacePreference,
  type WorkspaceContext,
} from '@/lib/server/multi-tenant';
import { findWorkspaceConventionalDebts, findWorkspaceRecurringDebts } from '@/lib/server/debts';
import type { WorkspaceShellPayload } from '@/lib/workspace/shell';

async function getCurrentMonthAiUsage(workspaceId: string) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  return prisma.workspaceEvent.count({
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
  });
}

async function getCurrentMonthTransactionCount(workspaceId: string) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  return prisma.transaction.count({
    where: {
      workspace_id: workspaceId,
      date: {
        gte: monthStart,
        lt: nextMonthStart,
      },
    },
  });
}

export async function buildWorkspaceShell(
  context: WorkspaceContext,
  options?: { scope?: 'full' | 'transactions' }
): Promise<WorkspaceShellPayload> {
  const scope = options?.scope === 'transactions' ? 'transactions' : 'full';
  const plan = await getWorkspacePlan(context.workspaceId, context.userId);
  const [limits, preference, workspace, wallets, recentEvents, currentMonthTransactionCount, currentMonthAiUsage] =
    await Promise.all([
      getRuntimePlanLimits(plan),
      getWorkspacePreference(context.workspaceId, context.userId),
      prisma.workspace.findUnique({
        where: { id: context.workspaceId },
        select: {
          id: true,
          name: true,
          whatsapp_status: true,
          whatsapp_phone_number: true,
        },
      }),
      prisma.wallet.findMany({
        where: { workspace_id: context.workspaceId },
        orderBy: [{ name: 'asc' }],
        select: {
          id: true,
          name: true,
          balance: true,
        },
      }),
      prisma.workspaceEvent.findMany({
        where: { workspace_id: context.workspaceId },
        orderBy: { created_at: 'desc' },
        take: 20,
        select: {
          id: true,
          type: true,
          created_at: true,
          user_id: true,
          payload: true,
        },
      }),
      getCurrentMonthTransactionCount(context.workspaceId),
      getCurrentMonthAiUsage(context.workspaceId),
    ]);

  const payload: WorkspaceShellPayload = {
    activeWorkspaceId: context.workspaceId,
    plan,
    limits: {
      reports: limits.reports === 'basic' ? 'basic' : 'full',
      transactionsPerMonth:
        typeof limits.transactionsPerMonth === 'number' ? limits.transactionsPerMonth : null,
      aiInteractionsPerMonth:
        typeof limits.aiInteractionsPerMonth === 'number' ? limits.aiInteractionsPerMonth : null,
    },
    currentMonthTransactionCount,
    currentMonthAiUsage,
    workspaces: context.workspaces.map((item) => ({
      id: item.id,
      name: item.name,
      role: item.role,
    })),
    onboarding: {
      completed: Boolean(preference.onboarding_completed),
      dismissed: Boolean(preference.onboarding_dismissed),
      shouldShow: !preference.onboarding_completed && !preference.onboarding_dismissed,
      objective: preference.objective,
      financialProfile: preference.financial_profile,
      aiSuggestionsEnabled: preference.ai_suggestions_enabled,
    },
    workspace: workspace
      ? {
          ...workspace,
          whatsapp_last_connection_state: null,
          whatsapp_last_validated_at: null,
          whatsapp_last_test_sent_at: null,
          whatsapp_last_error_message: null,
        }
      : null,
    wallets: wallets.map((wallet) => ({
      id: wallet.id,
      name: wallet.name,
      balance: Number(wallet.balance),
    })),
    recentEvents: recentEvents.map((event) => ({
      id: event.id,
      type: event.type,
      created_at: event.created_at.toISOString(),
      user_id: event.user_id,
      payload:
        event.payload && typeof event.payload === 'object'
          ? (event.payload as Record<string, unknown>)
          : null,
    })),
  };

  const [transactions, goals, investments, debts, recurringDebts] = await Promise.all([
    prisma.transaction.findMany({
      where: { workspace_id: context.workspaceId },
      orderBy: [{ date: 'desc' }, { id: 'desc' }],
      take: 200,
      include: {
        category: true,
        wallet: true,
        destination_wallet: true,
      },
    }),
    scope === 'full'
      ? prisma.goal.findMany({
          where: { workspace_id: context.workspaceId },
          orderBy: { created_at: 'desc' },
        })
      : Promise.resolve(undefined),
    scope === 'full'
      ? prisma.investment.findMany({
          where: { workspace_id: context.workspaceId },
          orderBy: { created_at: 'desc' },
        })
      : Promise.resolve(undefined),
    scope === 'full' ? findWorkspaceConventionalDebts(context.workspaceId) : Promise.resolve(undefined),
    scope === 'full' ? findWorkspaceRecurringDebts(context.workspaceId) : Promise.resolve(undefined),
  ]);

  payload.transactions = transactions;
  if (scope === 'full') {
    payload.goals = goals;
    payload.investments = investments;
    payload.debts = debts;
    payload.recurringDebts = recurringDebts;
  }

  return payload;
}
