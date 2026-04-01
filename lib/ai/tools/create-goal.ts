import 'server-only';

import { prisma } from '@/lib/prisma';

export type CreateGoalToolInput = {
  workspaceId: string;
  goalName: string;
  targetAmount: number;
  deadline?: string | Date | null;
};

export type CreateGoalToolResult = {
  goalId: string;
  goalName: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string | null;
};

function ensureWorkspaceId(value: string) {
  const workspaceId = String(value || '').trim();
  if (!workspaceId) {
    throw new Error('createGoal requires a valid workspaceId.');
  }
  return workspaceId;
}

function sanitizeGoalName(value: string) {
  const goalName = String(value || '').replace(/\s+/g, ' ').trim();
  if (!goalName) {
    throw new Error('createGoal requires a non-empty goalName.');
  }
  return goalName.slice(0, 80);
}

function ensurePositiveAmount(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error('createGoal requires targetAmount > 0.');
  }
  return Number(value);
}

function resolveDeadline(value: string | Date | null | undefined) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function createGoalTool(input: CreateGoalToolInput): Promise<CreateGoalToolResult> {
  const workspaceId = ensureWorkspaceId(input.workspaceId);
  const goalName = sanitizeGoalName(input.goalName);
  const targetAmount = ensurePositiveAmount(input.targetAmount);
  const deadline = resolveDeadline(input.deadline);

  const goal = await prisma.goal.create({
    data: {
      workspace_id: workspaceId,
      name: goalName,
      target_amount: targetAmount,
      current_amount: 0,
      deadline,
    },
    select: {
      id: true,
      name: true,
      target_amount: true,
      current_amount: true,
      deadline: true,
    },
  });

  return {
    goalId: goal.id,
    goalName: goal.name,
    targetAmount: Number(goal.target_amount || 0),
    currentAmount: Number(goal.current_amount || 0),
    deadline: goal.deadline ? goal.deadline.toISOString() : null,
  };
}

