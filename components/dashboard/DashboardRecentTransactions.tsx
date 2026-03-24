import type { DashboardOverviewRecentTransaction } from '@/lib/dashboard/overview';
import { DashboardSkeletonLine } from '@/components/dashboard/dashboard-primitives';
import { formatCurrency, formatDateShort } from '@/components/dashboard/dashboard-utils';
import { cn } from '@/lib/utils';

type DashboardRecentTransactionsProps = {
  transactions: DashboardOverviewRecentTransaction[];
  loading: boolean;
};

export function DashboardRecentTransactions({ transactions, loading }: DashboardRecentTransactionsProps) {
  return (
    <div className="app-table-shell overflow-hidden rounded-2xl">
      <div className="flex items-center justify-between border-b border-[var(--border-default)] px-6 py-4">
        <h3 className="card-title-premium text-[var(--text-primary)]">Últimas transações</h3>
        <span className="text-xs uppercase tracking-widest text-[var(--text-muted)]">{loading ? '--' : `${transactions.length} registros`}</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] text-left">
          <thead>
            <tr className="border-b border-[var(--border-default)] bg-[var(--bg-surface)]">
              <th className="px-6 py-3 text-xs font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">Categoria</th>
              <th className="px-6 py-3 text-xs font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">Descrição</th>
              <th className="px-6 py-3 text-xs font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">Data</th>
              <th className="px-6 py-3 text-right text-xs font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">Valor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.06]">
            {loading ? (
              Array.from({ length: 4 }, (_, index) => (
                <tr key={`dashboard-transaction-skeleton-${index}`}>
                  <td className="px-6 py-4"><DashboardSkeletonLine className="h-4 w-24" /></td>
                  <td className="px-6 py-4"><DashboardSkeletonLine className="h-4 w-48" /></td>
                  <td className="px-6 py-4"><DashboardSkeletonLine className="h-4 w-24" /></td>
                  <td className="px-6 py-4"><DashboardSkeletonLine className="ml-auto h-4 w-20" /></td>
                </tr>
              ))
            ) : transactions.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-sm text-[var(--text-muted)]">Nenhuma transação encontrada.</td>
              </tr>
            ) : (
              transactions.map((transaction) => (
                <tr key={transaction.id} className="transition-colors hover:bg-[var(--bg-surface-elevated)]/40">
                  <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">{transaction.category || 'Sem categoria'}</td>
                  <td className="px-6 py-4 text-sm font-medium text-[var(--text-primary)]">{transaction.description}</td>
                  <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">{formatDateShort(transaction.date)}</td>
                  <td className={cn('px-6 py-4 text-right text-sm font-bold', transaction.type === 'income' ? 'text-[var(--positive)]' : transaction.type === 'expense' ? 'text-[var(--danger)]' : 'text-[var(--text-primary)]')}>
                    {transaction.type === 'expense' ? '-' : transaction.type === 'income' ? '+' : ''}{formatCurrency(transaction.amount)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
