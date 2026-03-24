export type DashboardOverviewAlertTone = 'danger' | 'warning' | 'info' | 'success';

export type DashboardOverviewAlert = {
  id: string;
  tone: DashboardOverviewAlertTone;
  title: string;
  message: string;
};

export type DashboardOverviewInsightCard = {
  id: string;
  badge: string;
  title: string;
  metric: string;
  description: string;
  action: string;
  tone: 'warning' | 'primary';
};

export type DashboardOverviewForecastPoint = {
  date: string;
  openingBalance: number;
  inflow: number;
  outflow: number;
  closingBalance: number;
};

export type DashboardOverviewForecast = {
  asOfDate: string;
  updatedAt: string;
  currentBalance: number;
  projectedBalance30d: number | null;
  projectedNegativeDate: string | null;
  nextCriticalDate: string | null;
  monthConfirmedIncome: number;
  monthConfirmedExpense: number;
  monthPlannedIncome: number;
  monthPlannedExpense: number;
  daily: DashboardOverviewForecastPoint[];
};

export type DashboardOverviewMonthlySeriesPoint = {
  month: string;
  label: string;
  income: number;
  expense: number;
  net: number;
};

export type DashboardOverviewUpcomingEvent = {
  id: string;
  title: string;
  date: string;
  status: string;
  flow: 'in' | 'out' | 'neutral';
  type: string;
  amount: number | null;
  sourceType: string | null;
  category: string | null;
};

export type DashboardOverviewRecentTransaction = {
  id: string;
  category: string | null;
  description: string;
  date: string;
  amount: number;
  type: 'income' | 'expense' | 'transfer';
};

export type DashboardOverviewInsights = {
  primary: DashboardOverviewInsightCard[];
  automated: string[];
};

export type DashboardOverviewSummary = {
  currentBalance: number;
  projectedBalance30d: number | null;
  inflow: number;
  outflow: number;
  upcomingInflow: number;
  upcomingOutflow: number;
  upcomingInflowCount: number;
  upcomingOutflowCount: number;
};

export type DashboardOverviewPayload = {
  workspaceId: string;
  generatedAt: string;
  summary: DashboardOverviewSummary;
  forecast: DashboardOverviewForecast;
  monthlySeries: DashboardOverviewMonthlySeriesPoint[];
  alerts: DashboardOverviewAlert[];
  insights: DashboardOverviewInsights;
  upcomingEvents: DashboardOverviewUpcomingEvent[];
  recentTransactions: DashboardOverviewRecentTransaction[];
};
