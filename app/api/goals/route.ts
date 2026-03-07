import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  HttpError,
  logWorkspaceEventSafe,
  resolveWorkspaceContext,
} from '@/lib/server/multi-tenant';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type GoalBody = {
  id?: string;
  title?: string;
  target?: number | string;
  accumulated?: number | string;
  deadline?: string | null;
};

const parseAmount = (value: unknown) => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'string') {
    const parsed = Number(value.replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const parseDeadline = (value: unknown) => {
  if (!value) return null;
  if (typeof value !== 'string') return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export async function GET(req: Request) {
  try {
    const context = await resolveWorkspaceContext(req);
    const goals = await prisma.goal.findMany({
      where: { workspace_id: context.workspaceId },
      orderBy: { created_at: 'desc' },
    });
    return NextResponse.json(goals);
  } catch (error: any) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Goals GET Error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to fetch goals' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const context = await resolveWorkspaceContext(req);
    const body = (await req.json().catch(() => null)) as GoalBody | null;
    if (!body) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const name = (body.title || '').trim();
    const targetAmount = parseAmount(body.target);
    const currentAmount = parseAmount(body.accumulated);
    const deadline = parseDeadline(body.deadline);

    if (!name) {
      return NextResponse.json({ error: 'Goal title is required' }, { status: 400 });
    }
    if (!targetAmount || targetAmount <= 0) {
      return NextResponse.json({ error: 'Invalid target amount' }, { status: 400 });
    }

    const goal = await prisma.goal.create({
      data: {
        workspace_id: context.workspaceId,
        name,
        target_amount: targetAmount,
        current_amount: currentAmount && currentAmount > 0 ? currentAmount : 0,
        deadline: deadline ?? null,
      },
    });

    await logWorkspaceEventSafe({
      workspaceId: context.workspaceId,
      userId: context.userId,
      type: 'goal.created',
      payload: {
        goalId: goal.id,
      },
    });

    return NextResponse.json(goal, { status: 201 });
  } catch (error: any) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Goals POST Error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to create goal' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const context = await resolveWorkspaceContext(req);
    const body = (await req.json().catch(() => null)) as GoalBody | null;
    if (!body?.id) {
      return NextResponse.json({ error: 'Goal id is required' }, { status: 400 });
    }

    const existingGoal = await prisma.goal.findFirst({
      where: {
        id: body.id,
        workspace_id: context.workspaceId,
      },
      select: { id: true },
    });

    if (!existingGoal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    const name = body.title?.trim();
    const targetAmount = parseAmount(body.target);
    const currentAmount = parseAmount(body.accumulated);
    const deadline = body.deadline === '' ? null : parseDeadline(body.deadline);

    const goal = await prisma.goal.update({
      where: { id: existingGoal.id },
      data: {
        name: name || undefined,
        target_amount: targetAmount && targetAmount > 0 ? targetAmount : undefined,
        current_amount: currentAmount && currentAmount >= 0 ? currentAmount : undefined,
        deadline: body.deadline !== undefined ? deadline : undefined,
      },
    });

    await logWorkspaceEventSafe({
      workspaceId: context.workspaceId,
      userId: context.userId,
      type: 'goal.updated',
      payload: {
        goalId: goal.id,
      },
    });

    return NextResponse.json(goal);
  } catch (error: any) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Goals PATCH Error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to update goal' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const context = await resolveWorkspaceContext(req);
    const body = (await req.json().catch(() => null)) as GoalBody | null;
    if (!body?.id) {
      return NextResponse.json({ error: 'Goal id is required' }, { status: 400 });
    }

    const existingGoal = await prisma.goal.findFirst({
      where: {
        id: body.id,
        workspace_id: context.workspaceId,
      },
      select: { id: true },
    });

    if (!existingGoal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    await prisma.goal.delete({
      where: { id: existingGoal.id },
    });

    await logWorkspaceEventSafe({
      workspaceId: context.workspaceId,
      userId: context.userId,
      type: 'goal.deleted',
      payload: {
        goalId: existingGoal.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Goals DELETE Error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to delete goal' }, { status: 500 });
  }
}
