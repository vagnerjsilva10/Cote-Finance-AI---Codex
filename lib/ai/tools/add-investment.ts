import 'server-only';

import { prisma } from '@/lib/prisma';

export type AddInvestmentToolInput = {
  workspaceId: string;
  amount: number;
  name?: string | null;
  investmentType?: string | null;
  institution?: string | null;
};

export type AddInvestmentToolResult = {
  investmentId: string;
  name: string;
  amount: number;
  type: string;
  institution: string;
};

function ensureWorkspaceId(value: string) {
  const workspaceId = String(value || '').trim();
  if (!workspaceId) {
    throw new Error('addInvestment requires a valid workspaceId.');
  }
  return workspaceId;
}

function ensurePositiveAmount(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error('addInvestment requires amount > 0.');
  }
  return Number(value);
}

function sanitizeText(value: string | null | undefined, maxLength: number) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (!text) return null;
  return text.slice(0, maxLength);
}

export async function addInvestmentTool(input: AddInvestmentToolInput): Promise<AddInvestmentToolResult> {
  const workspaceId = ensureWorkspaceId(input.workspaceId);
  const amount = ensurePositiveAmount(input.amount);
  const now = new Date().toLocaleDateString('pt-BR');
  const name = sanitizeText(input.name, 48) || `Aporte ${now}`;
  const type = sanitizeText(input.investmentType, 24) || 'Outros';
  const institution = sanitizeText(input.institution, 32) || 'Carteira Principal';

  const investment = await prisma.investment.create({
    data: {
      workspace_id: workspaceId,
      name,
      type,
      institution,
      invested_amount: amount,
      current_amount: amount,
      expected_return_annual: 0,
    },
    select: {
      id: true,
      name: true,
      type: true,
      institution: true,
      current_amount: true,
    },
  });

  return {
    investmentId: investment.id,
    name: investment.name,
    amount: Number(investment.current_amount || 0),
    type: investment.type,
    institution: investment.institution,
  };
}

