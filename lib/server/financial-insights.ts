import { Prisma } from '@prisma/client';

export type InsightTransaction = {
  type: string;
  amount: Prisma.Decimal | number | string;
  date: Date;
  category?: { name: string | null } | null;
};

export function normalizeFinanceTransactionType(rawType: string) {
  const normalized = String(rawType || '').toUpperCase();
  if (normalized === 'PIX_IN') return 'INCOME';
  if (normalized === 'PIX_OUT') return 'EXPENSE';
  return normalized;
}

export function buildFinancialInsights(
  transactions: InsightTransaction[],
  totalBalance: number,
  now = new Date()
) {
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

  const monthTransactions = transactions.filter((tx) => tx.date >= monthStart);
  const prevMonthTransactions = transactions.filter(
    (tx) => tx.date >= prevMonthStart && tx.date <= prevMonthEnd
  );

  const sumByType = (list: InsightTransaction[], type: 'INCOME' | 'EXPENSE') =>
    list
      .filter((tx) => normalizeFinanceTransactionType(tx.type) === type)
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
          ? `Sua entrada cresceu ${delta.toFixed(1)}% em relação ao mês anterior.`
          : `Sua entrada reduziu ${Math.abs(delta).toFixed(1)}% em relação ao mês anterior.`
      );
    }
  }

  const categoryExpenseMap = new Map<string, number>();
  for (const tx of monthTransactions) {
    if (normalizeFinanceTransactionType(tx.type) !== 'EXPENSE') continue;
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
    insights.push(
      'Continue registrando suas transações para receber insights automáticos mais precisos.'
    );
  }

  return insights.slice(0, 4);
}
