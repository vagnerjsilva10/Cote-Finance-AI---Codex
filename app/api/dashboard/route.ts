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
import { logWorkspaceFinancialConsistencySnapshot } from '@/lib/server/financial-observability';
import { buildFinancialInsights } from '@/lib/server/financial-insights';
import { findWorkspaceConventionalDebts, findWorkspaceRecurringDebts } from '@/lib/server/debts';
import { getWorkspaceWhatsAppConfig } from '@/lib/server/whatsapp-config';
import { resolveFeatureFlagState } from '@/lib/server/superadmin-governance';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const DASHBOARD_TRANSACTION_LIMIT = 120;
const DASHBOARD_INVESTMENT_LIMIT = 40;
const DASHBOARD_DEBT_LIMIT = 40;
const DASHBOARD_RECURRING_DEBT_LIMIT = 40;
const DASHBOARD_EVENT_LIMIT = 8;

const isMissingTableError = (error: unknown) => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === 'P2021' || error.code === 'P2022';
  }
  if (error instanceof Prisma.PrismaClientValidationError) {
    return error.message.includes('Unknown argument');
  }
  return false;
};

async function findWorkspaceTransactions(workspaceId: string) {
  try {
    return await prisma.transaction.findMany({
      where: { workspace_id: workspaceId },
      orderBy: { date: 'desc' },
      take: DASHBOARD_TRANSACTION_LIMIT,
      select: {
        id: true,
        workspace_id: true,
        wallet_id: true,
        destination_wallet_id: true,
        category_id: true,
        type: true,
        payment_method: true,
        amount: true,
        date: true,
        description: true,
        status: true,
        receipt_url: true,
        created_at: true,
        category: { select: { name: true } },
        wallet: { select: { name: true } },
        destination_wallet: { select: { name: true } },
      },
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
      WHERE "workspace_id" = ${workspaceId}
      ORDER BY "date" DESC
      LIMIT ${DASHBOARD_TRANSACTION_LIMIT}
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

async function findWorkspaceInsightTransactions(workspaceId: string, fromDate: Date) {
  try {
    return await prisma.transaction.findMany({
      where: {
        workspace_id: workspaceId,
        status: 'CONFIRMED',
        date: { gte: fromDate },
      },
      select: {
        type: true,
        amount: true,
        date: true,
        category: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { date: 'desc' },
    });
  } catch (error) {
    if (isMissingTableError(error)) return [];
    throw error;
  }
}

async function findWorkspaceWallets(workspaceId: string) {
  try {
    return await prisma.wallet.findMany({
      where: { workspace_id: workspaceId },
      select: { id: true, name: true, balance: true },
    });
  } catch (error) {
    if (isMissingTableError(error)) return [];
    throw error;
  }
}

async function findWorkspaceGoals(workspaceId: string) {
  try {
    return await prisma.goal.findMany({
      where: { workspace_id: workspaceId },
      select: {
        id: true,
        name: true,
        target_amount: true,
        current_amount: true,
        deadline: true,
      },
    });
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
      take: DASHBOARD_INVESTMENT_LIMIT,
      select: {
        id: true,
        name: true,
        type: true,
        institution: true,
        invested_amount: true,
        current_amount: true,
        expected_return_annual: true,
      },
    });
  } catch (error) {
    if (isMissingTableError(error)) return [];
    throw error;
  }
}

async function findWorkspaceDebts(workspaceId: string) {
  try {
    const debts = await findWorkspaceConventionalDebts(workspaceId);
    return debts.slice(0, DASHBOARD_DEBT_LIMIT);
  } catch (error) {
    if (isMissingTableError(error)) return [];
    throw error;
  }
}

async function findWorkspaceRecurringDebtItems(workspaceId: string) {
  try {
    const recurringDebts = await findWorkspaceRecurringDebts(workspaceId);
    return recurringDebts.slice(0, DASHBOARD_RECURRING_DEBT_LIMIT);
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
        take: DASHBOARD_EVENT_LIMIT,
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

async function findWorkspaceDashboardReadModel(workspaceId: string) {
  try {
    return await prisma.dashboardReadModel.findUnique({
      where: { workspace_id: workspaceId },
      select: {
        as_of_date: true,
        current_balance: true,
        projected_balance_30d: true,
        projected_negative_date: true,
        month_confirmed_income: true,
        month_confirmed_expense: true,
        month_planned_income: true,
        month_planned_expense: true,
        upcoming_events_count_14d: true,
        next_critical_date: true,
        updated_at: true,
      },
    });
  } catch (error) {
    if (isMissingTableError(error)) return null;
    throw error;
  }
}

async function findWorkspaceDailyCashProjection(params: {
  workspaceId: string;
  fromDate: Date;
  toDate: Date;
}) {
  try {
    return await prisma.dailyCashProjection.findMany({
      where: {
        workspace_id: params.workspaceId,
        date: {
          gte: params.fromDate,
          lte: params.toDate,
        },
      },
      orderBy: { date: 'asc' },
      select: {
        date: true,
        opening_balance: true,
        inflow_confirmed: true,
        outflow_confirmed: true,
        inflow_planned: true,
        outflow_planned: true,
        closing_balance: true,
      },
    });
  } catch (error) {
    if (isMissingTableError(error)) return [];
    throw error;
  }
}

export async function GET(req: Request) {
  try {
    const context = await resolveWorkspaceContext(req);
    const requestUrl = new URL(req.url);
    const scope = requestUrl.searchParams.get('scope') === 'transactions' ? 'transactions' : 'full';
    const isLiteTransactionsScope =
      scope === 'transactions' && requestUrl.searchParams.get('lite') === '1';
    const workspaceId = context.workspaceId;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const projectionEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 30, 23, 59, 59, 999);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const workspace = await findWorkspaceSnapshot(workspaceId);
    const workspaceWhatsAppConfig = await getWorkspaceWhatsAppConfig(workspaceId);

    const [plan, preference] = await Promise.all([
      getWorkspacePlan(workspaceId, context.userId),
      getWorkspacePreference(workspaceId, context.userId),
    ]);

    const [dashboardReadModelFlag, projectionEngineFlag] = isLiteTransactionsScope
      ? [
          { enabled: false, source: 'lite_scope', reason: 'Skipped for lightweight transaction refresh' },
          { enabled: false, source: 'lite_scope', reason: 'Skipped for lightweight transaction refresh' },
        ]
      : await Promise.all([
          resolveFeatureFlagState({
            key: 'dashboard_read_model_v2',
            plan,
            workspaceId,
            userId: context.userId,
          }),
          resolveFeatureFlagState({
            key: 'financial_projection_engine_v2',
            plan,
            workspaceId,
            userId: context.userId,
          }),
        ]);
    const shouldUseDashboardReadModel = dashboardReadModelFlag.enabled;
    const shouldUseProjectionEngine = projectionEngineFlag.enabled;

    const [wallets, currentMonthTransactionCount, eventSnapshot, dashboardReadModel, dailyCashProjection] = await Promise.all([
      findWorkspaceWallets(workspaceId),
      countWorkspaceTransactions(workspaceId, monthStart, nextMonthStart),
      getWorkspaceEventSnapshot(workspaceId),
      shouldUseDashboardReadModel ? findWorkspaceDashboardReadModel(workspaceId) : Promise.resolve(null),
      shouldUseDashboardReadModel && shouldUseProjectionEngine
        ? findWorkspaceDailyCashProjection({
            workspaceId,
            fromDate: todayStart,
            toDate: projectionEnd,
          })
        : Promise.resolve([]),
    ]);

    const [transactions, insightTransactions] = await Promise.all([
      findWorkspaceTransactions(workspaceId),
      isLiteTransactionsScope
        ? Promise.resolve([] as Awaited<ReturnType<typeof findWorkspaceInsightTransactions>>)
        : findWorkspaceInsightTransactions(workspaceId, previousMonthStart),
    ]);
    const [goals, investments, debts, recurringDebts] =
      scope === 'transactions'
        ? [undefined, undefined, undefined, undefined]
        : await Promise.all([
            findWorkspaceGoals(workspaceId),
            findWorkspaceInvestments(workspaceId),
            findWorkspaceDebts(workspaceId),
            findWorkspaceRecurringDebtItems(workspaceId),
          ]);

    const safeWorkspace =
      workspace ||
      ({
        id: workspaceId,
        name: context.workspaces.find((item) => item.id === workspaceId)?.name || 'Minha Conta',
        whatsapp_status: null,
        whatsapp_phone_number: null,
        whatsapp_last_connection_state: workspaceWhatsAppConfig.lastConnectionState,
        whatsapp_last_error_message: workspaceWhatsAppConfig.lastErrorMessage,
        whatsapp_last_validated_at: workspaceWhatsAppConfig.lastValidatedAt,
        whatsapp_last_test_sent_at: workspaceWhatsAppConfig.lastTestSentAt,
        created_at: null,
        updated_at: null,
      } as const);

    const workspaceWithConfig = {
      ...safeWorkspace,
      whatsapp_last_connection_state: workspaceWhatsAppConfig.lastConnectionState,
      whatsapp_last_error_message: workspaceWhatsAppConfig.lastErrorMessage,
      whatsapp_last_validated_at: workspaceWhatsAppConfig.lastValidatedAt,
      whatsapp_last_test_sent_at: workspaceWhatsAppConfig.lastTestSentAt,
    };

    const fallbackBalance = wallets.reduce<number>((acc, wallet) => acc + Number(wallet.balance), 0);
    const totalBalance = dashboardReadModel ? Number(dashboardReadModel.current_balance || 0) : fallbackBalance;
    const totalInvested = (investments ?? []).reduce<number>((acc, item) => acc + Number(item.current_amount), 0);
    const insightsBase = insightTransactions.length > 0 ? insightTransactions : transactions;
    const insights =
      plan === 'FREE' || isLiteTransactionsScope
        ? []
        : buildFinancialInsights(insightsBase as any, totalBalance);
    if (!isLiteTransactionsScope) {
      void logWorkspaceFinancialConsistencySnapshot(workspaceId);
    }

    return NextResponse.json({
      totalBalance,
      totalInvested,
      wallets,
      transactions,
      ...(scope === 'full'
        ? {
            goals,
            investments,
            debts,
            recurringDebts,
          }
        : {}),
      workspace: workspaceWithConfig,
      plan,
      limits: PLAN_LIMITS[plan],
      currentMonthTransactionCount,
      currentMonthAiUsage: eventSnapshot.currentMonthAiUsage,
      activeWorkspaceId: workspaceId,
      workspaces: context.workspaces,
      recentEvents: eventSnapshot.recentEvents,
      insights,
      runtimeFlags: {
        dashboardReadModelV2: {
          enabled: shouldUseDashboardReadModel,
          source: dashboardReadModelFlag.source,
          reason: dashboardReadModelFlag.reason,
        },
        financialProjectionEngineV2: {
          enabled: shouldUseProjectionEngine,
          source: projectionEngineFlag.source,
          reason: projectionEngineFlag.reason,
        },
      },
      projection: shouldUseDashboardReadModel && dashboardReadModel
        ? {
            asOfDate: dashboardReadModel.as_of_date,
            currentBalance: Number(dashboardReadModel.current_balance || 0),
            projectedBalance30d: Number(dashboardReadModel.projected_balance_30d || 0),
            projectedNegativeDate: dashboardReadModel.projected_negative_date,
            monthConfirmedIncome: Number(dashboardReadModel.month_confirmed_income || 0),
            monthConfirmedExpense: Number(dashboardReadModel.month_confirmed_expense || 0),
            monthPlannedIncome: Number(dashboardReadModel.month_planned_income || 0),
            monthPlannedExpense: Number(dashboardReadModel.month_planned_expense || 0),
            upcomingEventsCount14d: dashboardReadModel.upcoming_events_count_14d,
            nextCriticalDate: dashboardReadModel.next_critical_date,
            updatedAt: dashboardReadModel.updated_at,
            daily: shouldUseProjectionEngine
              ? dailyCashProjection.map((row) => ({
                  date: row.date,
                  openingBalance: Number(row.opening_balance || 0),
                  inflowConfirmed: Number(row.inflow_confirmed || 0),
                  outflowConfirmed: Number(row.outflow_confirmed || 0),
                  inflowPlanned: Number(row.inflow_planned || 0),
                  outflowPlanned: Number(row.outflow_planned || 0),
                  closingBalance: Number(row.closing_balance || 0),
                }))
              : [],
          }
        : null,
      onboarding: {
        completed: Boolean(preference.onboarding_completed),
        dismissed: Boolean(preference.onboarding_dismissed),
        shouldShow: !preference.onboarding_completed && !preference.onboarding_dismissed,
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

