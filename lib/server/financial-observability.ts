import 'server-only';

import { Prisma } from '@prisma/client';

import { asPrismaServiceUnavailableError, prisma } from '@/lib/prisma';

const FINANCIAL_CONSISTENCY_EVENT = 'FINANCIAL_CONSISTENCY_SNAPSHOT';
const FINANCIAL_CONSISTENCY_FAILED_EVENT = 'FINANCIAL_CONSISTENCY_SNAPSHOT_FAILED';
const LOG_THROTTLE_MS = 5 * 60 * 1000;
const DRIFT_ABSOLUTE_WARN_THRESHOLD = 1;
const DRIFT_RATIO_WARN_THRESHOLD = 0.01;

const consistencyLogThrottleMap = new Map<string, number>();

function isMissingFinancialTableError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === 'P2021' || error.code === 'P2022';
  }

  const message = error instanceof Error ? error.message : String(error || '');
  return /does not exist|relation .* does not exist|table .* doesn't exist|unknown arg/i.test(message);
}

function shouldSkipConsistencyLog(workspaceId: string) {
  const now = Date.now();
  const lastLoggedAt = consistencyLogThrottleMap.get(workspaceId);
  if (lastLoggedAt && now - lastLoggedAt < LOG_THROTTLE_MS) {
    return true;
  }

  consistencyLogThrottleMap.set(workspaceId, now);
  return false;
}

export async function logWorkspaceFinancialConsistencySnapshot(workspaceId: string) {
  if (!workspaceId || shouldSkipConsistencyLog(workspaceId)) {
    return;
  }

  try {
    const [walletAggregate, confirmedTransactionAggregate] = await Promise.all([
      prisma.wallet.aggregate({
        where: { workspace_id: workspaceId },
        _sum: { balance: true },
        _count: { _all: true },
      }),
      prisma.transaction.groupBy({
        by: ['type'],
        where: {
          workspace_id: workspaceId,
          status: 'CONFIRMED',
        },
        _sum: { amount: true },
        _count: { _all: true },
      }),
    ]);

    const amountByType = new Map(
      confirmedTransactionAggregate.map((row) => [String(row.type || '').toUpperCase(), Number(row._sum.amount || 0)])
    );
    const confirmedIncome = amountByType.get('INCOME') || 0;
    const confirmedExpense = amountByType.get('EXPENSE') || 0;
    const confirmedTransfer = amountByType.get('TRANSFER') || 0;

    const walletBalanceTotal = Number(walletAggregate._sum.balance || 0);
    const confirmedNet = confirmedIncome - confirmedExpense;
    const drift = walletBalanceTotal - confirmedNet;
    const absoluteDrift = Math.abs(drift);
    const denominator = Math.max(Math.abs(walletBalanceTotal), Math.abs(confirmedNet), 1);
    const driftRatio = absoluteDrift / denominator;
    const confirmedTransactionCount = confirmedTransactionAggregate.reduce((acc, row) => acc + row._count._all, 0);
    const severity =
      absoluteDrift >= DRIFT_ABSOLUTE_WARN_THRESHOLD || driftRatio >= DRIFT_RATIO_WARN_THRESHOLD ? 'WARN' : 'OK';

    const payload = {
      workspaceId,
      capturedAt: new Date().toISOString(),
      walletCount: walletAggregate._count._all,
      confirmedTransactionCount,
      walletBalanceTotal,
      confirmedIncome,
      confirmedExpense,
      confirmedTransfer,
      confirmedNet,
      drift: Number(drift.toFixed(2)),
      driftPercentage: Number((driftRatio * 100).toFixed(4)),
      severity,
    };

    if (severity === 'WARN') {
      console.warn(FINANCIAL_CONSISTENCY_EVENT, payload);
      return;
    }

    console.info(FINANCIAL_CONSISTENCY_EVENT, payload);
  } catch (error) {
    if (asPrismaServiceUnavailableError(error) || isMissingFinancialTableError(error)) {
      return;
    }

    const message = error instanceof Error ? error.message : String(error || 'Unknown error');
    console.warn(FINANCIAL_CONSISTENCY_FAILED_EVENT, {
      workspaceId,
      message,
    });
  }
}
