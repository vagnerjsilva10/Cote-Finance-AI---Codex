import { NextResponse } from 'next/server';
import { asPrismaServiceUnavailableError, prisma } from '@/lib/prisma';
import { HttpError, logWorkspaceEventSafe, resolveWorkspaceContext } from '@/lib/server/multi-tenant';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type CreateWalletBody = {
  bank?: string;
  name?: string;
  type?: string;
  initialBalance?: number | string;
};

function parseInitialBalance(value: number | string | undefined) {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new HttpError(400, 'Saldo inicial inválido.');
    }
    return value;
  }

  if (typeof value === 'string') {
    const normalizedValue = value
      .trim()
      .replace(/^R\$\s?/i, '')
      .replace(/\s/g, '')
      .replace(/\u00A0/g, '');
    if (!normalizedValue) {
      return 0;
    }

    const parsed = Number(normalizedValue.replace(/\./g, '').replace(',', '.'));
    if (!Number.isFinite(parsed)) {
      throw new HttpError(400, 'Saldo inicial inválido.');
    }
    return parsed;
  }

  return 0;
}

export async function POST(req: Request) {
  try {
    const context = await resolveWorkspaceContext(req);
    const body = (await req.json().catch(() => null)) as CreateWalletBody | null;

    const bank = body?.bank?.trim() || '';
    const name = body?.name?.trim() || bank;

    if (!name) {
      throw new HttpError(400, 'Selecione um banco ou informe um nome para a carteira.');
    }

    const initialBalance = parseInitialBalance(body?.initialBalance);
    const walletType = body?.type?.trim() || 'BANK';

    const wallet = await prisma.wallet.create({
      data: {
        workspace_id: context.workspaceId,
        name,
        type: walletType,
        balance: initialBalance,
      },
      select: {
        id: true,
        name: true,
        balance: true,
      },
    });

    await logWorkspaceEventSafe({
      workspaceId: context.workspaceId,
      userId: context.userId,
      type: 'wallet.created',
      payload: {
        bank: bank || null,
        walletId: wallet.id,
        walletType,
      },
    });

    return NextResponse.json(
      {
        wallet: {
          id: wallet.id,
          name: wallet.name,
          balance: Number(wallet.balance),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    const prismaError = asPrismaServiceUnavailableError(error);
    if (prismaError) {
      return NextResponse.json({ error: prismaError.message }, { status: 503 });
    }

    console.error('Wallets POST Error:', error);
    return NextResponse.json({ error: 'Failed to create wallet' }, { status: 500 });
  }
}
