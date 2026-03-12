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
import { buildFinancialInsights } from '@/lib/server/financial-insights';
import { getWorkspaceWhatsAppConfig } from '@/lib/server/whatsapp-config';

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
      workspaceWhatsAppConfig,
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
        getWorkspaceWhatsAppConfig(workspaceId),
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
        whatsapp_connect_template_name: workspaceWhatsAppConfig.connectTemplateName,
        whatsapp_digest_template_name: workspaceWhatsAppConfig.digestTemplateName,
        whatsapp_template_language: workspaceWhatsAppConfig.templateLanguage,
        whatsapp_test_phone_number: workspaceWhatsAppConfig.testPhoneNumber,
        created_at: null,
        updated_at: null,
      } as const);

    const workspaceWithConfig = {
      ...safeWorkspace,
      whatsapp_connect_template_name: workspaceWhatsAppConfig.connectTemplateName,
      whatsapp_digest_template_name: workspaceWhatsAppConfig.digestTemplateName,
      whatsapp_template_language: workspaceWhatsAppConfig.templateLanguage,
      whatsapp_test_phone_number: workspaceWhatsAppConfig.testPhoneNumber,
    };

    const totalBalance = wallets.reduce<number>((acc, wallet) => acc + Number(wallet.balance), 0);
    const totalInvested = investments.reduce<number>(
      (acc, item) => acc + Number(item.current_amount),
      0
    );
    const insights = plan === 'FREE' ? [] : buildFinancialInsights(transactions as any, totalBalance);

    return NextResponse.json({
      totalBalance,
      totalInvested,
      wallets,
      transactions,
      goals,
      investments,
      debts,
      workspace: workspaceWithConfig,
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

