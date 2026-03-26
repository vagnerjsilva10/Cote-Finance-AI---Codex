import { Plus, Pencil, Trash2 } from 'lucide-react';

import { cn } from '@/lib/utils';
import { useInvestmentsSummary } from '@/app/app/modules/investments/hooks/use-investments-summary';
import { EmptyState, PrimaryButton, StatCard } from '@/design-system/components';

type InvestmentItem = {
  id: string | number;
  label: string;
  type: string;
  walletName: string;
  invested: number;
  value: number;
  expectedReturnAnnual: number;
};

type InvestmentsViewProps = {
  investments: InvestmentItem[];
  onAddInvestment: () => void;
  onEditInvestment: (id: string | number) => void;
  onDeleteInvestment: (id: string | number) => void;
  formatCurrency: (value: number) => string;
};

export const InvestmentsView = ({
  investments,
  onAddInvestment,
  onEditInvestment,
  onDeleteInvestment,
  formatCurrency,
}: InvestmentsViewProps) => {
  const { totalInvested, currentValue, profit, profitPercentage } = useInvestmentsSummary(investments);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="page-title-premium text-[var(--text-primary)]">Investimentos</h3>
        <PrimaryButton onClick={onAddInvestment} className="flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-bold sm:w-auto">
          <Plus size={18} /> Novo Investimento
        </PrimaryButton>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total investido" value={formatCurrency(totalInvested)} semantic="neutral" />
        <StatCard label="Valor atual" value={formatCurrency(currentValue)} semantic="info" />
        <StatCard
          label="Rendimento"
          value={`${profit >= 0 ? '+' : ''}${formatCurrency(profit)}`}
          semantic={profit >= 0 ? 'success' : 'danger'}
        />
        <StatCard
          label="Rentabilidade %"
          value={`${profitPercentage.toFixed(2)}%`}
          semantic={profitPercentage >= 0 ? 'success' : 'danger'}
        />
      </div>

      <div className="table-premium overflow-hidden rounded-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[var(--border-default)] bg-[var(--bg-tertiary)]">
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Nome</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Tipo</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Carteira</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Investido</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Valor atual</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Rendimento</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Rentab. %</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Ret. esp. % a.a.</th>
                <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-soft)]">
              {investments.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-6 py-8">
                    <EmptyState
                      title="Nenhum investimento cadastrado"
                      description="Adicione ativos para acompanhar rentabilidade, alocação e evolução patrimonial."
                      ctaLabel="Criar investimento"
                      onCtaClick={onAddInvestment}
                      className="p-6"
                    />
                  </td>
                </tr>
              )}

              {investments.map((item) => {
                const itemProfit = item.value - item.invested;
                const itemProfitPct = item.invested > 0 ? (itemProfit / item.invested) * 100 : 0;

                return (
                  <tr key={item.id} className="group transition-colors hover:bg-[color:color-mix(in_srgb,var(--bg-hover)_50%,transparent)]">
                    <td className="px-6 py-4 text-sm font-semibold text-[var(--text-primary)]">{item.label}</td>
                    <td className="px-6 py-4">
                      <span className="badge-premium badge-neutral">{item.type}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">{item.walletName}</td>
                    <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">{formatCurrency(item.invested)}</td>
                    <td className="px-6 py-4 text-sm text-[var(--text-primary)]">{formatCurrency(item.value)}</td>
                    <td className={cn('px-6 py-4 text-sm font-bold', itemProfit >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]')}>
                      {itemProfit >= 0 ? '+' : ''}
                      {formatCurrency(itemProfit)}
                    </td>
                    <td className={cn('px-6 py-4 text-sm font-bold', itemProfitPct >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]')}>
                      {itemProfitPct.toFixed(2)}%
                    </td>
                    <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">{item.expectedReturnAnnual.toFixed(2)}%</td>
                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          onClick={() => onEditInvestment(item.id)}
                          className="p-2 text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => onDeleteInvestment(item.id)}
                          className="p-2 text-[var(--text-muted)] transition-colors hover:text-[var(--danger)]"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};