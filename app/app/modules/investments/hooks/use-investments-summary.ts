import * as React from 'react';

type InvestmentSummaryInput = {
  invested: number;
  value: number;
};

export function useInvestmentsSummary(investments: InvestmentSummaryInput[]) {
  return React.useMemo(() => {
    const totalInvested = investments.reduce((acc, inv) => acc + inv.invested, 0);
    const currentValue = investments.reduce((acc, inv) => acc + inv.value, 0);
    const profit = currentValue - totalInvested;
    const profitPercentage = totalInvested > 0 ? (profit / totalInvested) * 100 : 0;

    return {
      totalInvested,
      currentValue,
      profit,
      profitPercentage,
    };
  }, [investments]);
}

