import 'server-only';

import { prisma } from '@/lib/prisma';
import { mapConventionalStatusToLegacyDebtStatus } from '@/lib/debts';

export type RegisterDebtPaymentToolInput = {
  workspaceId: string;
  amount: number;
  creditorHint?: string | null;
};

export type RegisterDebtPaymentToolResult = {
  debtId: string;
  creditor: string;
  paidAmount: number;
  previousRemainingAmount: number;
  remainingAmount: number;
  status: string;
};

function ensureWorkspaceId(value: string) {
  const workspaceId = String(value || '').trim();
  if (!workspaceId) {
    throw new Error('registerDebtPayment requires a valid workspaceId.');
  }
  return workspaceId;
}

function ensurePositiveAmount(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error('registerDebtPayment requires amount > 0.');
  }
  return Number(value);
}

function normalize(value: string | null | undefined) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export async function registerDebtPaymentTool(
  input: RegisterDebtPaymentToolInput
): Promise<RegisterDebtPaymentToolResult | null> {
  const workspaceId = ensureWorkspaceId(input.workspaceId);
  const amount = ensurePositiveAmount(input.amount);
  const normalizedHint = normalize(input.creditorHint);

  const debts = await prisma.debt.findMany({
    where: {
      workspace_id: workspaceId,
    },
    select: {
      id: true,
      creditor: true,
      remaining_amount: true,
    },
    orderBy: {
      created_at: 'desc',
    },
    take: 25,
  });

  const targetDebt =
    (normalizedHint
      ? debts.find((debt) => normalize(debt.creditor).includes(normalizedHint) && Number(debt.remaining_amount) > 0)
      : null) || debts.find((debt) => Number(debt.remaining_amount) > 0);

  if (!targetDebt) return null;

  const previousRemainingAmount = Number(targetDebt.remaining_amount || 0);
  const remainingAmount = Math.max(0, previousRemainingAmount - amount);
  const status =
    remainingAmount <= 0
      ? mapConventionalStatusToLegacyDebtStatus('Quitada')
      : mapConventionalStatusToLegacyDebtStatus('Em aberto');

  const updated = await prisma.debt.update({
    where: {
      id: targetDebt.id,
      workspace_id: workspaceId,
    },
    data: {
      remaining_amount: remainingAmount,
      status,
    },
    select: {
      id: true,
      creditor: true,
      remaining_amount: true,
      status: true,
    },
  });

  return {
    debtId: updated.id,
    creditor: updated.creditor,
    paidAmount: amount,
    previousRemainingAmount,
    remainingAmount: Number(updated.remaining_amount || 0),
    status: updated.status,
  };
}

