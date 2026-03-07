import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { asPrismaServiceUnavailableError, prisma } from '@/lib/prisma';
import {
  HttpError,
  PLAN_LIMITS,
  getWorkspacePlan,
  getWorkspacePreference,
  resolveWorkspaceContext,
} from '@/lib/server/multi-tenant';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const isMissingTableError = (error: unknown) => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === 'P2021' || error.code === 'P2022';
  }
  const message = error instanceof Error ? error.message : String(error || '');
  return /does not exist|Unknown arg|destination_wallet_id|payment_method|receipt_url/i.test(message);
};

async function findWorkspaceTransactions(workspaceId: string) {
  try {
    return await prisma.transaction.findMany({
      where: { workspace_id: workspaceId },
      orderBy: { date: 'desc' },
      take: 200,
      include: { category: true, wallet: true, destination_wallet: true },
    });
  } catch (error) {
    if (!isMissingTableError(error)) throw error;
    type LegacyTransactionRow = {
      id: string;
      workspace_id: string;
      wallet_id: string;
      category_id: string | null;
      type: string;
      amount: Prisma.Decimal | number | string;
      date: Date;
      description: string;
      status: string | null;
      created_at: Date | null;
    };

    const rows = await prisma.$queryRaw<LegacyTransactionRow[]>`
      SELECT
        "id",
        "workspace_id",
        "wallet_id",
        "category_id",
        "type",
        "amount",
        "date",
        "description",
        "status",
        "created_at"
      FROM "Transaction"
      WHERE "workspace_id" = CAST(${workspaceId} AS uuid)
      ORDER BY "date" DESC
      LIMIT 200
    `;

    const walletIds = [...new Set(rows.map((row) => row.wallet_id).filter(Boolean))];
    const categoryIds = [
      ...new Set(
        rows
          .map((row) => row.category_id)
          .filter((value): value is string => typeof value === 'string' && value.length > 0)
      ),
    ];

    let wallets: Array<{ id: string; name: string }> = [];
    let categories: Array<{ id: string; name: string }> = [];

    try {
      [wallets, categories] = await Promise.all([
        prisma.wallet.findMany({
          where: {
            workspace_id: workspaceId,
            id: { in: walletIds.length ? walletIds : ['__none__'] },
          },
          select: { id: true, name: true },
        }),
        categoryIds.length
          ? prisma.category.findMany({
              where: { id: { in: categoryIds } },
              select: { id: true, name: true },
            })
          : Promise.resolve([] as Array<{ id: string; name: string }>),
      ]);
    } catch (lookupError) {
      if (!isMissingTableError(lookupError)) throw lookupError;
    }

    const walletMap = new Map(wallets.map((wallet) => [wallet.id, wallet]));
    const categoryMap = new Map(categories.map((category) => [category.id, category]));

    return rows.map((row) => ({
      id: row.id,
      workspace_id: row.workspace_id,
      wallet_id: row.wallet_id,
      category_id: row.category_id,
      type: row.type,
      amount: row.amount,
      date: row.date,
      description: row.description,
      status: row.status || 'CONFIRMED',
      created_at: row.created_at || row.date,
      payment_method: 'OTHER',
      receipt_url: null,
      destination_wallet_id: null,
      category: row.category_id ? categoryMap.get(row.category_id) ?? null : null,
      wallet: walletMap.get(row.wallet_id) ?? null,
      destination_wallet: null,
    }));
  }
}

async function findWorkspaceWallets(workspaceId: string) {
  try {
    return await prisma.wallet.findMany({ where: { workspace_id: workspaceId } });
  } catch (error) {
    if (isMissingTableError(error)) return [];
    throw error;
  }
}

async function findWorkspaceGoals(workspaceId: string) {
  try {
    return await prisma.goal.findMany({ where: { workspace_id: workspaceId } });
  } catch (error) {
    if (isMissingTableError(error)) return [];
    throw error;
  }
}

async function countWorkspaceTransactions(workspaceId: string, monthStart: Date, nextMonthStart: Date) {
  try {
    return await prisma.transaction.count({
      where: {
        workspace_id: workspaceId,
        date: {
          gte: monthStart,
          lt: nextMonthStart,
        },
      },
    });
  } catch (error) {
    if (isMissingTableError(error)) return 0;
    throw error;
  }
}

async function findWorkspaceSnapshot(workspaceId: string) {
  try {
    return await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        id: true,
        name: true,
        whatsapp_status: true,
        whatsapp_phone_number: true,
        created_at: true,
        updated_at: true,
      },
    });
  } catch (error) {
    if (!isMissingTableError(error)) throw error;

    const fallback = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        id: true,
        name: true,
      },
    });

    if (!fallback) return null;
    return {
      ...fallback,
      whatsapp_status: null as string | null,
      whatsapp_phone_number: null as string | null,
      created_at: null as Date | null,
      updated_at: null as Date | null,
    };
  }
}

function buildFinancialInsights(
  transactions: Array<{
    type: string;
    amount: Prisma.Decimal | number;
    date: Date;
    category?: { name: string | null } | null;
  }>,
  totalBalance: number
) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

  const normalizeType = (rawType: string) => {
    const normalized = String(rawType || '').toUpperCase();
    if (normalized === 'PIX_IN') return 'INCOME';
    if (normalized === 'PIX_OUT') return 'EXPENSE';
    return normalized;
  };

  const monthTransactions = transactions.filter((tx) => tx.date >= monthStart);
  const prevMonthTransactions = transactions.filter(
    (tx) => tx.date >= prevMonthStart && tx.date <= prevMonthEnd
  );

  const sumByType = (list: typeof monthTransactions, type: 'INCOME' | 'EXPENSE') =>
    list
      .filter((tx) => normalizeType(tx.type) === type)
      .reduce((acc, tx) => acc + Number(tx.amount), 0);

  const currentIncome = sumByType(monthTransactions, 'INCOME');
  const currentExpense = sumByType(monthTransactions, 'EXPENSE');
  const prevIncome = sumByType(prevMonthTransactions, 'INCOME');
  const prevExpense = sumByType(prevMonthTransactions, 'EXPENSE');

  const insights: string[] = [];

  if (prevExpense > 0) {
    const delta = ((currentExpense - prevExpense) / prevExpense) * 100;
    if (Math.abs(delta) >= 10) {
      insights.push(
        delta > 0
          ? `Seus gastos aumentaram ${delta.toFixed(1)}% em relação ao mês anterior.`
          : `Seus gastos caíram ${Math.abs(delta).toFixed(1)}% em relação ao mês anterior.`
      );
    }
  }

  if (prevIncome > 0) {
    const delta = ((currentIncome - prevIncome) / prevIncome) * 100;
    if (Math.abs(delta) >= 10) {
      insights.push(
        delta > 0
          ? `Sua receita cresceu ${delta.toFixed(1)}% em relação ao mês anterior.`
          : `Sua receita reduziu ${Math.abs(delta).toFixed(1)}% em relação ao mês anterior.`
      );
    }
  }

  const categoryExpenseMap = new Map<string, number>();
  for (const tx of monthTransactions) {
    if (normalizeType(tx.type) !== 'EXPENSE') continue;
    const category = tx.category?.name || 'Outros';
    categoryExpenseMap.set(category, (categoryExpenseMap.get(category) || 0) + Number(tx.amount));
  }
  const topCategory = [...categoryExpenseMap.entries()].sort((a, b) => b[1] - a[1])[0];
  if (topCategory) {
    insights.push(
      `Maior gasto do mês: ${topCategory[0]} (${topCategory[1].toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      })}).`
    );
  }

  const monthBalance = currentIncome - currentExpense;
  if (monthBalance < 0) {
    const dayOfMonth = Math.max(1, now.getDate());
    const dailyDeficit = Math.abs(monthBalance) / dayOfMonth;
    if (dailyDeficit > 0 && totalBalance > 0) {
      const projectedDays = Math.floor(totalBalance / dailyDeficit);
      insights.push(`No ritmo atual, seu saldo pode ficar negativo em cerca de ${projectedDays} dias.`);
    }
  }

  if (insights.length === 0) {
    insights.push('Continue registrando suas transações para receber insights automáticos mais precisos.');
  }

  return insights.slice(0, 4);
}

async function findWorkspaceInvestments(workspaceId: string) {
  try {
    return await prisma.investment.findMany({
      where: { workspace_id: workspaceId },
      orderBy: { created_at: 'desc' },
    });
  } catch (error) {
    if (isMissingTableError(error)) return [];
    throw error;
  }
}

async function findWorkspaceDebts(workspaceId: string) {
  try {
    return await prisma.debt.findMany({
      where: { workspace_id: workspaceId },
      orderBy: { created_at: 'desc' },
    });
  } catch (error) {
    if (isMissingTableError(error)) return [];
    throw error;
  }
}

async function getWorkspaceEventSnapshot(workspaceId: string) {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const [recentEvents, currentMonthAiUsage] = await Promise.all([
      prisma.workspaceEvent.findMany({
        where: { workspace_id: workspaceId },
        orderBy: { created_at: 'desc' },
        take: 12,
        select: {
          id: true,
          type: true,
          created_at: true,
          user_id: true,
          payload: true,
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
    ]);

    return {
      recentEvents,
      currentMonthAiUsage,
    };
  } catch {
    return {
      recentEvents: [],
      currentMonthAiUsage: 0,
    };
  }
}

export async function GET(req: Request) {
  try {
    const context = await resolveWorkspaceContext(req);
    const workspaceId = context.workspaceId;

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const [
      wallets,
      transactions,
      goals,
      workspace,
      plan,
      preference,
      currentMonthTransactionCount,
      investments,
      debts,
      eventSnapshot,
    ] =
      await Promise.all([
        findWorkspaceWallets(workspaceId),
        findWorkspaceTransactions(workspaceId),
        findWorkspaceGoals(workspaceId),
        findWorkspaceSnapshot(workspaceId),
        getWorkspacePlan(workspaceId, context.userId),
        getWorkspacePreference(workspaceId, context.userId),
        countWorkspaceTransactions(workspaceId, monthStart, nextMonthStart),
        findWorkspaceInvestments(workspaceId),
        findWorkspaceDebts(workspaceId),
        getWorkspaceEventSnapshot(workspaceId),
      ]);

    const safeWorkspace =
      workspace ||
      ({
        id: workspaceId,
        name: context.workspaces.find((item) => item.id === workspaceId)?.name || 'Minha Conta',
        whatsapp_status: null,
        whatsapp_phone_number: null,
        created_at: null,
        updated_at: null,
      } as const);

    const totalBalance = wallets.reduce<number>((acc, wallet) => acc + Number(wallet.balance), 0);
    const totalInvested = investments.reduce<number>(
      (acc, item) => acc + Number(item.current_amount),
      0
    );
    const insights = buildFinancialInsights(transactions as any, totalBalance);

    return NextResponse.json({
      totalBalance,
      totalInvested,
      wallets,
      transactions,
      goals,
      investments,
      debts,
      workspace: safeWorkspace,
      plan,
      limits: PLAN_LIMITS[plan],
      currentMonthTransactionCount,
      currentMonthAiUsage: eventSnapshot.currentMonthAiUsage,
      activeWorkspaceId: workspaceId,
      workspaces: context.workspaces,
      recentEvents: eventSnapshot.recentEvents,
      insights,
      onboarding: {
        completed: Boolean(preference.onboarding_completed),
        objective: preference.objective,
        financialProfile: preference.financial_profile,
        aiSuggestionsEnabled: preference.ai_suggestions_enabled,
      },
    });
  } catch (error: any) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    const prismaError = asPrismaServiceUnavailableError(error);
    if (prismaError) {
      return NextResponse.json({ error: prismaError.message }, { status: 503 });
    }

    console.error('Dashboard API Error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to load dashboard' }, { status: 500 });
  }
}
