import 'server-only';

import { prisma } from '@/lib/prisma';
import { mapConventionalStatusToLegacyDebtStatus } from '@/lib/debts';
import { resolveCategoryForWorkspace, type CategoryResolutionResult } from '@/lib/finance-assistant/category-resolver.service';

type ExecutionContext = {
  workspaceId: string;
  messageId: string;
  parsedText: string;
};

type FinanceExecutionResult = {
  summaryText: string;
  categoryAudit?: CategoryResolutionResult | null;
};

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function parseAmount(value: unknown) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const normalized = value.replace(/\./g, '').replace(',', '.');
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function parseDateHint(value: string | null | undefined) {
  const token = String(value || '').trim();
  if (!token) return null;

  const direct = new Date(token);
  if (!Number.isNaN(direct.getTime())) return direct;

  const match = token.match(/(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]) - 1;
  const year = match[3] ? Number(match[3].length === 2 ? `20${match[3]}` : match[3]) : new Date().getFullYear();
  const date = new Date(year, month, day);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function getPrimaryWallet(workspaceId: string) {
  let wallet = await prisma.wallet.findFirst({
    where: { workspace_id: workspaceId },
    orderBy: { id: 'asc' },
    select: {
      id: true,
      name: true,
      balance: true,
    },
  });

  if (!wallet) {
    wallet = await prisma.wallet.create({
      data: {
        workspace_id: workspaceId,
        name: 'Carteira Principal',
        type: 'CASH',
        balance: 0,
      },
      select: {
        id: true,
        name: true,
        balance: true,
      },
    });
  }

  return wallet;
}

export async function executeCreateExpense(params: {
  ctx: ExecutionContext;
  amount: number;
  description: string;
  merchant?: string | null;
  categoryHint?: string | null;
  dateHint?: string | null;
}) {
  const wallet = await getPrimaryWallet(params.ctx.workspaceId);
  const category = await resolveCategoryForWorkspace({
    workspaceId: params.ctx.workspaceId,
    flowType: 'expense',
    categoryHint: params.categoryHint || params.merchant || params.description,
  });

  const existing = await prisma.transaction.findFirst({
    where: {
      workspace_id: params.ctx.workspaceId,
      origin_type: 'SYSTEM',
      origin_id: `whatsapp:${params.ctx.messageId}`,
    },
    select: { id: true },
  });
  if (existing) {
    return {
      summaryText: 'Essa mensagem já foi processada e o lançamento já está registrado.',
      categoryAudit: category,
    } satisfies FinanceExecutionResult;
  }

  const date = parseDateHint(params.dateHint) || new Date();

  await prisma.$transaction(async (tx) => {
    await tx.transaction.create({
      data: {
        workspace_id: params.ctx.workspaceId,
        wallet_id: wallet.id,
        category_id: category.categoryId,
        type: 'EXPENSE',
        payment_method: 'OTHER',
        amount: params.amount,
        date,
        description: params.description,
        status: 'CONFIRMED',
        origin_type: 'SYSTEM',
        origin_id: `whatsapp:${params.ctx.messageId}`,
      },
    });

    await tx.wallet.update({
      where: { id: wallet.id },
      data: {
        balance: {
          increment: -params.amount,
        },
      },
    });
  });

  const updatedWallet = await prisma.wallet.findUnique({
    where: { id: wallet.id },
    select: { balance: true },
  });

  return {
    summaryText: `Despesa lançada: ${formatCurrency(params.amount)} em ${category.categoryName}. Saldo atual: ${formatCurrency(Number(updatedWallet?.balance || 0))}.`,
    categoryAudit: category,
  } satisfies FinanceExecutionResult;
}

export async function executeCreateIncome(params: {
  ctx: ExecutionContext;
  amount: number;
  description: string;
  merchant?: string | null;
  categoryHint?: string | null;
  dateHint?: string | null;
}) {
  const wallet = await getPrimaryWallet(params.ctx.workspaceId);
  const category = await resolveCategoryForWorkspace({
    workspaceId: params.ctx.workspaceId,
    flowType: 'income',
    categoryHint: params.categoryHint || params.merchant || params.description,
  });

  const existing = await prisma.transaction.findFirst({
    where: {
      workspace_id: params.ctx.workspaceId,
      origin_type: 'SYSTEM',
      origin_id: `whatsapp:${params.ctx.messageId}`,
    },
    select: { id: true },
  });
  if (existing) {
    return {
      summaryText: 'Essa mensagem já foi processada e o lançamento já está registrado.',
      categoryAudit: category,
    } satisfies FinanceExecutionResult;
  }

  const date = parseDateHint(params.dateHint) || new Date();

  await prisma.$transaction(async (tx) => {
    await tx.transaction.create({
      data: {
        workspace_id: params.ctx.workspaceId,
        wallet_id: wallet.id,
        category_id: category.categoryId,
        type: 'INCOME',
        payment_method: 'OTHER',
        amount: params.amount,
        date,
        description: params.description,
        status: 'CONFIRMED',
        origin_type: 'SYSTEM',
        origin_id: `whatsapp:${params.ctx.messageId}`,
      },
    });

    await tx.wallet.update({
      where: { id: wallet.id },
      data: {
        balance: {
          increment: params.amount,
        },
      },
    });
  });

  const updatedWallet = await prisma.wallet.findUnique({
    where: { id: wallet.id },
    select: { balance: true },
  });

  return {
    summaryText: `Receita lançada: ${formatCurrency(params.amount)} em ${category.categoryName}. Saldo atual: ${formatCurrency(Number(updatedWallet?.balance || 0))}.`,
    categoryAudit: category,
  } satisfies FinanceExecutionResult;
}

export async function executeCreateGoal(params: {
  ctx: ExecutionContext;
  name: string;
  targetAmount: number;
  deadlineHint?: string | null;
}) {
  const deadline = parseDateHint(params.deadlineHint);

  const goal = await prisma.goal.create({
    data: {
      workspace_id: params.ctx.workspaceId,
      name: params.name,
      target_amount: params.targetAmount,
      current_amount: 0,
      deadline: deadline ?? null,
    },
    select: {
      id: true,
      name: true,
      target_amount: true,
    },
  });

  return {
    summaryText: `Meta criada: ${goal.name} com alvo de ${formatCurrency(Number(goal.target_amount))}.`,
  } satisfies FinanceExecutionResult;
}

export async function executeContributeGoal(params: {
  ctx: ExecutionContext;
  goalHint: string;
  contributionAmount: number;
}) {
  const goals = await prisma.goal.findMany({
    where: { workspace_id: params.ctx.workspaceId },
    select: {
      id: true,
      name: true,
      target_amount: true,
      current_amount: true,
    },
    orderBy: { created_at: 'desc' },
    take: 20,
  });

  const hint = params.goalHint.toLowerCase();
  const goal = goals.find((item) => item.name.toLowerCase().includes(hint)) || goals[0];
  if (!goal) {
    return {
      summaryText: 'Não encontrei nenhuma meta para adicionar valor. Você pode criar uma nova meta primeiro.',
    } satisfies FinanceExecutionResult;
  }

  const updated = await prisma.goal.update({
    where: { id: goal.id },
    data: {
      current_amount: {
        increment: params.contributionAmount,
      },
    },
    select: {
      name: true,
      current_amount: true,
      target_amount: true,
    },
  });

  const remaining = Math.max(0, Number(updated.target_amount) - Number(updated.current_amount));

  return {
    summaryText: `Contribuição registrada na meta ${updated.name}: +${formatCurrency(params.contributionAmount)}. Falta ${formatCurrency(remaining)} para concluir.`,
  } satisfies FinanceExecutionResult;
}

export async function executeCreateInvestment(params: {
  ctx: ExecutionContext;
  name: string;
  amount: number;
  typeHint?: string | null;
  institutionHint?: string | null;
  expectedReturnAnnual?: number | null;
}) {
  const created = await prisma.investment.create({
    data: {
      workspace_id: params.ctx.workspaceId,
      name: params.name,
      type: params.typeHint || 'Outros',
      institution: params.institutionHint || 'Carteira Principal',
      invested_amount: params.amount,
      current_amount: params.amount,
      expected_return_annual: params.expectedReturnAnnual && params.expectedReturnAnnual > 0 ? params.expectedReturnAnnual : 0,
    },
    select: {
      name: true,
      current_amount: true,
    },
  });

  return {
    summaryText: `Investimento registrado: ${created.name} no valor de ${formatCurrency(Number(created.current_amount))}.`,
  } satisfies FinanceExecutionResult;
}

export async function executeCreateDebt(params: {
  ctx: ExecutionContext;
  creditor: string;
  amount: number;
  dueDateHint?: string | null;
  dueDay?: number | null;
  categoryHint?: string | null;
}) {
  const dueDate = parseDateHint(params.dueDateHint);
  const dueDay = dueDate ? dueDate.getDate() : params.dueDay && params.dueDay >= 1 && params.dueDay <= 31 ? params.dueDay : 10;
  const category = params.categoryHint || 'Dívidas';

  const created = await prisma.debt.create({
    data: {
      workspace_id: params.ctx.workspaceId,
      creditor: params.creditor,
      original_amount: params.amount,
      remaining_amount: params.amount,
      interest_rate_monthly: 0,
      due_day: dueDay,
      due_date: dueDate ?? null,
      category,
      status: mapConventionalStatusToLegacyDebtStatus('Em aberto'),
    },
    select: {
      creditor: true,
      remaining_amount: true,
    },
  });

  return {
    summaryText: `Dívida criada para ${created.creditor} no valor de ${formatCurrency(Number(created.remaining_amount))}.`,
  } satisfies FinanceExecutionResult;
}

export async function executePayDebt(params: {
  ctx: ExecutionContext;
  creditorHint: string;
  amount: number;
}) {
  const debts = await prisma.debt.findMany({
    where: {
      workspace_id: params.ctx.workspaceId,
    },
    select: {
      id: true,
      creditor: true,
      remaining_amount: true,
      status: true,
    },
    orderBy: { created_at: 'desc' },
    take: 20,
  });

  const hint = params.creditorHint.toLowerCase();
  const targetDebt =
    debts.find((debt) => debt.creditor.toLowerCase().includes(hint) && Number(debt.remaining_amount) > 0) ||
    debts.find((debt) => Number(debt.remaining_amount) > 0);

  if (!targetDebt) {
    return {
      summaryText: 'Não encontrei dívida em aberto para registrar pagamento.',
    } satisfies FinanceExecutionResult;
  }

  const remaining = Math.max(0, Number(targetDebt.remaining_amount) - params.amount);
  const status = remaining <= 0 ? mapConventionalStatusToLegacyDebtStatus('Quitada') : mapConventionalStatusToLegacyDebtStatus('Em aberto');

  const updated = await prisma.debt.update({
    where: { id: targetDebt.id },
    data: {
      remaining_amount: remaining,
      status,
    },
    select: {
      creditor: true,
      remaining_amount: true,
      status: true,
    },
  });

  return {
    summaryText: `Pagamento da dívida registrado para ${updated.creditor}: ${formatCurrency(params.amount)}. Saldo devedor atual: ${formatCurrency(Number(updated.remaining_amount))}.`,
  } satisfies FinanceExecutionResult;
}

export async function executeQuerySummary(params: {
  ctx: ExecutionContext;
  metric: 'category_spend_month' | 'goal_remaining' | 'investment_total' | 'monthly_summary' | 'debt_total' | 'unknown';
  categoryHint?: string | null;
  goalHint?: string | null;
}) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  if (params.metric === 'category_spend_month') {
    const categoryHint = String(params.categoryHint || '').trim().toLowerCase();
    const transactions = await prisma.transaction.findMany({
      where: {
        workspace_id: params.ctx.workspaceId,
        type: 'EXPENSE',
        date: {
          gte: monthStart,
          lt: monthEnd,
        },
      },
      select: {
        amount: true,
        category: {
          select: { name: true },
        },
      },
      take: 500,
    });

    const total = transactions
      .filter((item) => !categoryHint || item.category?.name.toLowerCase().includes(categoryHint))
      .reduce((acc, item) => acc + Number(item.amount), 0);

    const label = categoryHint || 'a categoria informada';
    return {
      summaryText: `Neste mês, você gastou ${formatCurrency(total)} com ${label}.`,
    } satisfies FinanceExecutionResult;
  }

  if (params.metric === 'goal_remaining') {
    const goals = await prisma.goal.findMany({
      where: { workspace_id: params.ctx.workspaceId },
      select: {
        name: true,
        target_amount: true,
        current_amount: true,
      },
      orderBy: { created_at: 'desc' },
      take: 20,
    });
    const goalHint = String(params.goalHint || '').trim().toLowerCase();
    const goal = goals.find((item) => item.name.toLowerCase().includes(goalHint)) || goals[0];
    if (!goal) {
      return { summaryText: 'Ainda não há metas cadastradas no seu workspace.' } satisfies FinanceExecutionResult;
    }
    const remaining = Math.max(0, Number(goal.target_amount) - Number(goal.current_amount));
    return {
      summaryText: `Na meta ${goal.name}, faltam ${formatCurrency(remaining)} para concluir.`,
    } satisfies FinanceExecutionResult;
  }

  if (params.metric === 'investment_total') {
    const investments = await prisma.investment.findMany({
      where: { workspace_id: params.ctx.workspaceId },
      select: { current_amount: true },
    });
    const total = investments.reduce((acc, item) => acc + Number(item.current_amount), 0);
    return {
      summaryText: `Seu total atual em investimentos é ${formatCurrency(total)}.`,
    } satisfies FinanceExecutionResult;
  }

  if (params.metric === 'debt_total') {
    const debts = await prisma.debt.findMany({
      where: { workspace_id: params.ctx.workspaceId },
      select: {
        remaining_amount: true,
      },
    });
    const total = debts.reduce((acc, item) => acc + Number(item.remaining_amount), 0);
    return {
      summaryText: `Seu total em dívidas abertas é ${formatCurrency(total)}.`,
    } satisfies FinanceExecutionResult;
  }

  const [income, expense] = await Promise.all([
    prisma.transaction.aggregate({
      where: {
        workspace_id: params.ctx.workspaceId,
        type: 'INCOME',
        date: { gte: monthStart, lt: monthEnd },
      },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: {
        workspace_id: params.ctx.workspaceId,
        type: 'EXPENSE',
        date: { gte: monthStart, lt: monthEnd },
      },
      _sum: { amount: true },
    }),
  ]);

  const totalIncome = Number(income._sum.amount || 0);
  const totalExpense = Number(expense._sum.amount || 0);
  const balance = totalIncome - totalExpense;

  return {
    summaryText: `Resumo do mês: receitas ${formatCurrency(totalIncome)}, despesas ${formatCurrency(totalExpense)} e saldo ${formatCurrency(balance)}.`,
  } satisfies FinanceExecutionResult;
}

