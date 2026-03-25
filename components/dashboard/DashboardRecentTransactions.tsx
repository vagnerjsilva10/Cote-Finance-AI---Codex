import type { DashboardOverviewRecentTransaction } from '@/lib/dashboard/overview';
import {
  DASHBOARD_CARD_PANEL_CLASSNAME,
  DASHBOARD_CARD_SHELL_CLASSNAME,
  DashboardSkeletonLine,
} from '@/components/dashboard/dashboard-primitives';
import { formatCurrency, formatDateShort } from '@/components/dashboard/dashboard-utils';
import { cn } from '@/lib/utils';

type DashboardRecentTransactionsProps = {
  transactions: DashboardOverviewRecentTransaction[];
  loading: boolean;
};

function getCategoryLabel(category: string | null) {
  const label = String(category || '').trim();
  return label || 'Sem categoria';
}

function getCategoryBadgeLetter(category: string | null) {
  const label = getCategoryLabel(category);
  return label.charAt(0).toUpperCase();
}

export function DashboardRecentTransactions({ transactions, loading }: DashboardRecentTransactionsProps) {
  const visibleTransactions = transactions.slice(0, 5);

  return (
    <section className={cn(DASHBOARD_CARD_SHELL_CLASSNAME, 'min-h-[260px] space-y-3 !p-4 sm:!p-5')}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-base font-semibold tracking-tight text-[var(--text-primary)]">Transações Recentes</h3>
        <button type="button" className="text-xs font-semibold text-[var(--primary)] hover:text-[var(--primary-hover)]">
          Ver todas
        </button>
      </div>

      <div className={cn(DASHBOARD_CARD_PANEL_CLASSNAME, 'overflow-hidden')}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left">
            <thead>
              <tr className="border-b border-white/10 bg-[rgba(8,15,27,0.55)]">
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">Descrição</th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">Categoria</th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">Data</th>
                <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {loading ? (
                Array.from({ length: 5 }, (_, index) => (
                  <tr key={`dashboard-transaction-skeleton-${index}`}>
                    <td className="px-5 py-3.5">
                      <DashboardSkeletonLine className="h-4 w-40" />
                    </td>
                    <td className="px-5 py-3.5">
                      <DashboardSkeletonLine className="h-4 w-24" />
                    </td>
                    <td className="px-5 py-3.5">
                      <DashboardSkeletonLine className="h-4 w-20" />
                    </td>
                    <td className="px-5 py-3.5">
                      <DashboardSkeletonLine className="ml-auto h-4 w-20" />
                    </td>
                  </tr>
                ))
              ) : visibleTransactions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-sm text-[var(--text-secondary)]">
                    Nenhuma transação encontrada no período atual.
                  </td>
                </tr>
              ) : (
                visibleTransactions.map((transaction) => (
                  <tr key={transaction.id} className="transition-colors hover:bg-[rgba(8,15,27,0.45)]">
                    <td className="px-5 py-3.5 text-sm font-medium text-[var(--text-primary)]">{transaction.description}</td>
                    <td className="px-5 py-3.5 text-sm text-[var(--text-secondary)]">
                      <div className="inline-flex items-center gap-2">
                        <span className="inline-flex size-6 items-center justify-center rounded-full border border-white/10 bg-[rgba(8,15,27,0.6)] text-[10px] font-bold text-[var(--text-primary)]">
                          {getCategoryBadgeLetter(transaction.category)}
                        </span>
                        <span>{getCategoryLabel(transaction.category)}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-[var(--text-secondary)]">{formatDateShort(transaction.date)}</td>
                    <td
                      className={cn(
                        'px-5 py-3.5 text-right text-sm font-bold',
                        transaction.type === 'income'
                          ? 'text-[var(--positive)]'
                          : transaction.type === 'expense'
                            ? 'text-[var(--danger)]'
                            : 'text-[var(--text-primary)]'
                      )}
                    >
                      {transaction.type === 'expense' ? '-' : transaction.type === 'income' ? '+' : ''}
                      {formatCurrency(transaction.amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

