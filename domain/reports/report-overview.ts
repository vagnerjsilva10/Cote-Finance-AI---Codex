export type ReportsOverviewSeriesPoint = {
  label: string;
  income: number;
  expense: number;
};

export type ReportsOverviewCategoryPoint = {
  name: string;
  value: number;
  color: string;
};

export type ReportsOverviewBalanceProjection = {
  days: number;
  projectedBalance: number;
};

export type ReportsOverviewAlert = {
  id: string;
  title: string;
  message: string;
  tone: 'error' | 'warning' | 'success' | 'info';
  targetTab: 'reports' | 'goals';
};

export type ReportsOverviewExpenseDeepDive = {
  currentMonthTotal: number;
  previousMonthTotal: number;
  monthOverMonthVariation: number | null;
  topCurrentCategory: { name: string; value: number } | null;
  growingCategories: Array<{
    name: string;
    currentValue: number;
    previousValue: number;
    diff: number;
    variation: number;
  }>;
  recurringHeavyCategories: Array<{
    name: string;
    count: number;
    total: number;
  }>;
  largestExpense: {
    id: string;
    amount: number;
    description: string;
    category: string;
    date: string | null;
  } | null;
};

export type ReportsOverviewBalanceForecast = {
  projections: ReportsOverviewBalanceProjection[];
  dailyNetFlow: number;
  trend: 'positive' | 'negative' | 'stable';
  projectedNegativeInDays: number | null;
  source: 'read-model';
};

export type ReportsOverviewPayload = {
  generatedAt: string;
  summary: {
    totalIncome: number;
    totalExpenses: number;
    balance: number;
  };
  revenueExpense12Months: ReportsOverviewSeriesPoint[];
  savingsRate6Months: Array<ReportsOverviewSeriesPoint & { savingsRate: number }>;
  categoryData: ReportsOverviewCategoryPoint[];
  expenseDeepDive: ReportsOverviewExpenseDeepDive;
  balanceForecast: ReportsOverviewBalanceForecast;
  premiumSmartAlerts: ReportsOverviewAlert[];
};
