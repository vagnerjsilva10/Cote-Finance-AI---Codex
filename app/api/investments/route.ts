import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  HttpError,
  logWorkspaceEventSafe,
  resolveWorkspaceContext,
} from '@/lib/server/multi-tenant';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type InvestmentBody = {
  id?: string;
  name?: string;
  type?: string;
  institution?: string;
  walletId?: string;
  invested?: number | string;
  current?: number | string;
  expectedReturnAnnual?: number | string;
};

const parseAmount = (value: unknown) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const parsed = Number(value.replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const isMissingTableError = (error: unknown) => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === 'P2021';
  }
  return false;
};

const resolveInvestmentWallet = async (workspaceId: string, walletId?: string) => {
  const normalizedWalletId = (walletId || '').trim();
  if (!normalizedWalletId) return null;

  return prisma.wallet.findFirst({
    where: {
      id: normalizedWalletId,
      workspace_id: workspaceId,
    },
    select: {
      id: true,
      name: true,
    },
  });
};

const buildMissingTableResponse = () =>
  NextResponse.json(
    {
      error:
        'Tabela de investimentos indisponível. Execute `npx prisma db push` para aplicar o schema atual.',
    },
    { status: 503 }
  );

export async function GET(req: Request) {
  try {
    const context = await resolveWorkspaceContext(req);
    const investments = await prisma.investment.findMany({
      where: { workspace_id: context.workspaceId },
      orderBy: { created_at: 'desc' },
    });
    return NextResponse.json(investments);
  } catch (error: any) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (isMissingTableError(error)) {
      return NextResponse.json([]);
    }
    console.error('Investments GET Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch investments' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const context = await resolveWorkspaceContext(req);
    const body = (await req.json().catch(() => null)) as InvestmentBody | null;
    if (!body) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const name = (body.name || '').trim();
    const type = (body.type || '').trim() || 'Outros';
    const wallet = await resolveInvestmentWallet(context.workspaceId, body.walletId);
    const investedAmount = parseAmount(body.invested);
    const currentAmount = parseAmount(body.current);
    const expectedReturnAnnual = parseAmount(body.expectedReturnAnnual) ?? 0;

    if (!name) {
      return NextResponse.json({ error: 'Investment name is required' }, { status: 400 });
    }
    if (!wallet) {
      return NextResponse.json(
        { error: 'Selecione uma carteira válida para vincular o investimento.' },
        { status: 400 }
      );
    }
    if (!investedAmount || investedAmount < 0) {
      return NextResponse.json({ error: 'Invalid invested amount' }, { status: 400 });
    }
    if (currentAmount === null || currentAmount < 0) {
      return NextResponse.json({ error: 'Invalid current amount' }, { status: 400 });
    }

    const investment = await prisma.investment.create({
      data: {
        workspace_id: context.workspaceId,
        name,
        type,
        institution: wallet.name,
        invested_amount: investedAmount,
        current_amount: currentAmount,
        expected_return_annual: expectedReturnAnnual,
      },
    });

    await logWorkspaceEventSafe({
      workspaceId: context.workspaceId,
      userId: context.userId,
      type: 'investment.created',
      payload: {
        investmentId: investment.id,
      },
    });

    return NextResponse.json(investment, { status: 201 });
  } catch (error: any) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (isMissingTableError(error)) {
      return buildMissingTableResponse();
    }
    console.error('Investments POST Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to create investment' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const context = await resolveWorkspaceContext(req);
    const body = (await req.json().catch(() => null)) as InvestmentBody | null;
    if (!body?.id) {
      return NextResponse.json({ error: 'Investment id is required' }, { status: 400 });
    }

    const existing = await prisma.investment.findFirst({
      where: {
        id: body.id,
        workspace_id: context.workspaceId,
      },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Investment not found' }, { status: 404 });
    }

    const name = body.name?.trim();
    const type = body.type?.trim();
    const wallet = body.walletId ? await resolveInvestmentWallet(context.workspaceId, body.walletId) : null;
    const investedAmount = parseAmount(body.invested);
    const currentAmount = parseAmount(body.current);
    const expectedReturnAnnual = parseAmount(body.expectedReturnAnnual);

    if (body.walletId && !wallet) {
      return NextResponse.json(
        { error: 'Selecione uma carteira válida para vincular o investimento.' },
        { status: 400 }
      );
    }

    const investment = await prisma.investment.update({
      where: { id: existing.id },
      data: {
        name: name || undefined,
        type: type || undefined,
        institution: wallet?.name || undefined,
        invested_amount: investedAmount !== null && investedAmount >= 0 ? investedAmount : undefined,
        current_amount: currentAmount !== null && currentAmount >= 0 ? currentAmount : undefined,
        expected_return_annual:
          expectedReturnAnnual !== null && expectedReturnAnnual >= 0 ? expectedReturnAnnual : undefined,
      },
    });

    await logWorkspaceEventSafe({
      workspaceId: context.workspaceId,
      userId: context.userId,
      type: 'investment.updated',
      payload: {
        investmentId: investment.id,
      },
    });

    return NextResponse.json(investment);
  } catch (error: any) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (isMissingTableError(error)) {
      return buildMissingTableResponse();
    }
    console.error('Investments PATCH Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to update investment' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const context = await resolveWorkspaceContext(req);
    const body = (await req.json().catch(() => null)) as InvestmentBody | null;
    if (!body?.id) {
      return NextResponse.json({ error: 'Investment id is required' }, { status: 400 });
    }

    const existing = await prisma.investment.findFirst({
      where: {
        id: body.id,
        workspace_id: context.workspaceId,
      },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Investment not found' }, { status: 404 });
    }

    await prisma.investment.delete({
      where: { id: existing.id },
    });

    await logWorkspaceEventSafe({
      workspaceId: context.workspaceId,
      userId: context.userId,
      type: 'investment.deleted',
      payload: {
        investmentId: existing.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (isMissingTableError(error)) {
      return buildMissingTableResponse();
    }
    console.error('Investments DELETE Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to delete investment' },
      { status: 500 }
    );
  }
}

