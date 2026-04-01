import 'server-only';

import { prisma } from '@/lib/prisma';

export type AddGoalContributionToolInput = {
  workspaceId: string;
  amount: number;
  goalId?: string | null;
  goalNameHint?: string | null;
};

export type AddGoalContributionToolResult = {
  goalId: string;
  goalName: string;
  contributedAmount: number;
  currentAmount: number;
  targetAmount: number;
  remainingAmount: number;
};

function assertWorkspaceId(value: string) {
  const workspaceId = String(value || '').trim();
  if (!workspaceId) {
    throw new Error('addGoalContribution requires a valid workspaceId.');
  }
  return workspaceId;
}

function assertAmount(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error('addGoalContribution requires amount > 0.');
  }
  return Number(value);
}

function normalizeHint(value: string | null | undefined) {
  return String(value || '').trim().toLowerCase();
}

export async function addGoalContributionTool(
  input: AddGoalContributionToolInput
): Promise<AddGoalContributionToolResult | null> {
  const workspaceId = assertWorkspaceId(input.workspaceId);
  const amount = assertAmount(input.amount);
  const goalId = String(input.goalId || '').trim();
  const goalNameHint = normalizeHint(input.goalNameHint);

  const goals = await prisma.goal.findMany({
    where: {
      workspace_id: workspaceId,
    },
    select: {
      id: true,
      name: true,
      current_amount: true,
      target_amount: true,
      created_at: true,
    },
    orderBy: {
      created_at: 'desc',
    },
    take: 30,
  });

  const goal =
    (goalId ? goals.find((item) => item.id === goalId) : null) ||
    (goalNameHint
      ? goals.find((item) => normalizeHint(item.name).includes(goalNameHint))
      : null) ||
    goals[0];

  if (!goal) return null;

  const updated = await prisma.goal.update({
    where: {
      id: goal.id,
      workspace_id: workspaceId,
    },
    data: {
      current_amount: {
        increment: amount,
      },
    },
    select: {
      id: true,
      name: true,
      current_amount: true,
      target_amount: true,
    },
  });

  const currentAmount = Number(updated.current_amount || 0);
  const targetAmount = Number(updated.target_amount || 0);
  const remainingAmount = Math.max(0, targetAmount - currentAmount);

  return {
    goalId: updated.id,
    goalName: updated.name,
    contributedAmount: amount,
    currentAmount,
    targetAmount,
    remainingAmount,
  };
}
