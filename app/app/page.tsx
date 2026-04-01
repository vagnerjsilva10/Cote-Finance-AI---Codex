'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  LayoutDashboard,
  ReceiptText,
  Target,
  Gauge,
  TrendingUp,
  TrendingDown,
  PieChart,
  Sparkles,
  Settings,
  Calendar,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Cloud,
  Home,
  Send,
  Bell,
  AlertTriangle,
  Search,
  ExternalLink,
  CheckCircle2,
  MessageSquare,
  Plus,
  LogOut,
  Smartphone,
  X,
  Menu,
  Mic,
  StopCircle,
  Trash2,
  Pencil,
  Download,
  FileText,
  CreditCard,
  User as UserIcon,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Lock,
  Workflow,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Cell,
} from 'recharts';
import { cn } from '@/lib/utils';
import { FinancialCalendarView } from '@/components/financial-calendar/financial-calendar-view';
import { PremiumDatePicker } from '@/components/ui/premium-date-picker';
import { FormContainer, FormField, FormGrid } from '@/components/ui/form-system';
import { DashboardContainer as DashboardPageContainer } from '@/app/app/modules/dashboard/components/dashboard-container';
import { DashboardContainer as DashboardOverview } from '@/components/dashboard/DashboardContainer';
import { TransactionsContainer } from '@/app/app/modules/transactions/components/transactions-container';
import { DebtsContainer } from '@/app/app/modules/debts/components/debts-container';
import { GoalsContainer } from '@/app/app/modules/goals/components/goals-container';
import { GoalsView } from '@/app/app/modules/goals/components/goals-view';
import { CalendarContainer } from '@/app/app/modules/calendar/components/calendar-container';
import { InvestmentsContainer } from '@/app/app/modules/investments/components/investments-container';
import { InvestmentsView } from '@/app/app/modules/investments/components/investments-view';
import { OnboardingContainer } from '@/app/app/modules/settings/components/onboarding-container';
import { SettingsContainer } from '@/app/app/modules/settings/components/settings-container';
import { supabase } from '@/lib/supabase';
import { getCheckoutPath, parseCheckoutPlanLabel } from '@/lib/billing/plans';
import { fetchDashboardOverviewResource } from '@/app/app/modules/dashboard/data-client';
import { fetchTransactionsContext } from '@/app/app/modules/transactions/data-client';
import { fetchGoalsContext } from '@/app/app/modules/goals/data-client';
import { fetchInvestmentsContext } from '@/app/app/modules/investments/data-client';
import { fetchDebtsContext, fetchRecurringDebtsContext } from '@/app/app/modules/debts/data-client';
import { fetchWorkspaceShellResource } from '@/app/app/modules/workspace-shell/data-client';
import { fetchReportsOverviewResource } from '@/app/app/modules/reports/data-client';
import { ResourceClientError } from '@/app/app/modules/shared/resource-client';
import type { DashboardOverviewPayload, DashboardOverviewRecentTransaction } from '@/lib/dashboard/overview';
import {
  applyDashboardPeriodSelectionToSearchParams,
  parseDashboardPeriodSelectionFromSearchParams,
  resolveDashboardDateRange,
  type DashboardPeriodSelection,
} from '@/lib/dashboard/date-range';
import type { ReportsOverviewPayload } from '@/domain/reports/report-overview';
import {
  CONVENTIONAL_DEBT_CATEGORIES,
  RECURRING_DEBT_FREQUENCIES,
  RECURRING_DEBT_PRESETS,
  computeConventionalDebtNextDueDate,
  getRecurringDebtFrequencyLabel,
  isRecurringDebtCategory,
  mapLegacyDebtStatusToLabel,
} from '@/lib/debts';

// --- Types ---

type LucideIcon = React.ComponentType<{ size?: number; className?: string }>;

type Tab =
  | 'dashboard'
  | 'transactions'
  | 'goals'
  | 'debts'
  | 'investments'
  | 'portfolio'
  | 'reports'
  | 'assistant'
  | 'integrations'
  | 'subscription'
  | 'settings'
  | 'agenda';

const APP_TAB_QUERY_PARAM = 'tab';
const APP_TABS: Tab[] = [
  'dashboard',
  'transactions',
  'goals',
  'debts',
  'investments',
  'portfolio',
  'reports',
  'assistant',
  'integrations',
  'subscription',
  'settings',
  'agenda',
];

const TAB_LABELS: Record<Tab, string> = {
  dashboard: 'Dashboard',
  transactions: 'Transações',
  goals: 'Metas',
  debts: 'Dívidas',
  investments: 'Investimentos',
  portfolio: 'Carteira',
  reports: 'Relatórios',
  assistant: 'Assistente IA',
  integrations: 'WhatsApp',
  subscription: 'Minha assinatura',
  settings: 'Configurações',
  agenda: 'Calendário financeiro',
};

type NavigationSearchItem = {
  tab: Tab;
  label: string;
  description: string;
  keywords: string[];
};

type UiFeedbackTone = 'success' | 'error' | 'info';

const MAIN_NAV_ITEMS: Array<{ tab: Tab; label: string; icon: LucideIcon }> = [
  { tab: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { tab: 'transactions', label: 'Transações', icon: ReceiptText },
  { tab: 'agenda', label: 'Calendário', icon: Calendar },
  { tab: 'debts', label: 'Dívidas', icon: CreditCard },
  { tab: 'goals', label: 'Metas', icon: Target },
  { tab: 'investments', label: 'Investimentos', icon: TrendingUp },
  { tab: 'portfolio', label: 'Carteira', icon: Wallet },
  { tab: 'reports', label: 'Relatórios', icon: PieChart },
];

const SECONDARY_NAV_ITEMS: Array<{ tab: Tab; label: string; icon: LucideIcon }> = [
  { tab: 'assistant', label: 'Assistente IA', icon: MessageSquare },
  { tab: 'integrations', label: 'WhatsApp', icon: Smartphone },
  { tab: 'settings', label: 'Configurações', icon: Settings },
];

const NAVIGATION_SEARCH_ITEMS: NavigationSearchItem[] = [
  {
    tab: 'dashboard',
    label: 'Dashboard',
    description: 'Saldo atual, previsão e alertas principais.',
    keywords: ['início', 'resumo', 'saldo', 'visão geral', 'painel'],
  },
  {
    tab: 'transactions',
    label: 'Transações',
    description: 'Entradas, saídas e histórico de movimentações.',
    keywords: ['movimentações', 'entradas', 'saidas', 'lançamentos'],
  },
  {
    tab: 'agenda',
    label: 'Calendário financeiro',
    description: 'Próximos compromissos e recebimentos.',
    keywords: ['agenda', 'calendário', 'vencimentos', 'próximos dias'],
  },
  {
    tab: 'debts',
    label: 'Dívidas',
    description: 'Controle de contas a pagar e parcelamentos.',
    keywords: ['parcelas', 'contas a pagar', 'juros', 'dívidas'],
  },
  {
    tab: 'goals',
    label: 'Metas',
    description: 'Objetivos financeiros e progresso acumulado.',
    keywords: ['objetivos', 'planejamento', 'reserva', 'metas'],
  },
  {
    tab: 'investments',
    label: 'Investimentos',
    description: 'Ativos, rendimento e evolução da carteira.',
    keywords: ['ativos', 'rentabilidade', 'aportes', 'investimentos'],
  },
  {
    tab: 'portfolio',
    label: 'Carteira',
    description: 'Contas, saldo consolidado e distribuição.',
    keywords: ['contas', 'bancos', 'caixa'],
  },
  {
    tab: 'reports',
    label: 'Relatórios',
    description: 'Análise mensal e tendências.',
    keywords: ['gráficos', 'análise', 'comparativos', 'relatórios'],
  },
  {
    tab: 'assistant',
    label: 'Assistente IA',
    description: 'Perguntas e orientacoes financeiras.',
    keywords: ['chat', 'ia', 'assistente'],
  },
  {
    tab: 'integrations',
    label: 'WhatsApp',
    description: 'Conecte o WhatsApp e configure o assistente conversacional.',
    keywords: ['whatsapp', 'integracao', 'resumos', 'alertas', 'mensagens'],
  },
  {
    tab: 'settings',
    label: 'Configurações',
    description: 'Perfil e preferências da conta.',
    keywords: ['perfil', 'ajustes', 'configuração', 'preferências'],
  },
];

const isTabValue = (value: unknown): value is Tab =>
  typeof value === 'string' && (APP_TABS as string[]).includes(value);

const getBrowserTimeZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo';
  } catch {
    return 'America/Sao_Paulo';
  }
};

const readDashboardPeriodSelectionFromSearch = (
  search: string
): DashboardPeriodSelection => {
  const searchParams = new URLSearchParams(search);
  const selection = parseDashboardPeriodSelectionFromSearchParams(searchParams);
  const hasExplicitTimeZone = Boolean(searchParams.get('tz'));
  return {
    ...selection,
    timeZone: hasExplicitTimeZone ? selection.timeZone : getBrowserTimeZone(),
  };
};

const writeDashboardPeriodSelectionToUrl = (
  selection: DashboardPeriodSelection,
  historyMode: 'push' | 'replace' = 'push'
) => {
  if (typeof window === 'undefined') return;

  const url = new URL(window.location.href);
  applyDashboardPeriodSelectionToSearchParams(url.searchParams, {
    ...selection,
    timeZone: selection.timeZone || getBrowserTimeZone(),
  });

  const nextUrl = `${url.pathname}${url.search}${url.hash}`;
  if (historyMode === 'replace') {
    window.history.replaceState({ tab: url.searchParams.get(APP_TAB_QUERY_PARAM) }, '', nextUrl);
    return;
  }

  window.history.pushState({ tab: url.searchParams.get(APP_TAB_QUERY_PARAM) }, '', nextUrl);
};

type TransactionFlowType = 'Entrada' | 'Saida' | 'Transferência' | 'Receita' | 'Despesa';
type IncomeScheduleMode = 'SINGLE' | 'RECURRING';
type IncomeRecurrenceFrequency = 'WEEKLY' | 'MONTHLY' | 'YEARLY';
type PaymentMethodLabel =
  | 'PIX'
  | 'Cartão'
  | 'Dinheiro'
  | 'Transferência bancária'
  | 'Boleto'
  | 'Débito'
  | 'Outro';

type TransactionFormData = {
  description: string;
  amount: string;
  flowType: TransactionFlowType;
  incomeScheduleMode: IncomeScheduleMode;
  recurrenceFrequency: IncomeRecurrenceFrequency;
  recurrenceEndDate: string;
  category: string;
  paymentMethod: PaymentMethodLabel;
  wallet: string;
  destinationWallet: string;
  receiptUrl: string | null;
  date: string;
};

type GoalFormData = {
  title: string;
  target: string;
  accumulated: string;
  category: string;
  deadline: string;
};

type DebtFormData = {
  creditor: string;
  originalAmount: string;
  paidAmount: string;
  remainingAmount: string;
  hasInterest: boolean;
  interestRateMonthly: string;
  dueDate: string;
  category: string;
  status: 'Em aberto' | 'Quitada' | 'Atrasada' | 'Parcelada';
};

type RecurringDebtFormData = {
  creditor: string;
  amount: string;
  category: string;
  frequency: 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  interval: string;
  startDate: string;
  weekday: string;
  endDate: string;
  notes: string;
  source?: 'recurring_debt' | 'legacy_debt';
  legacyDebtId?: string | null;
};

type InvestmentFormData = {
  name: string;
  type: string;
  walletId: string;
  invested: string;
  current: string;
  expectedReturnAnnual: string;
};

type Transaction = {
  id: string | number;
  date: string;
  rawDate?: string | null;
  rawDueDate?: string | null;
  desc: string;
  cat: string;
  amount: string; // "-R$ 2.500,00" / "+R$ 8.500,00"
  rawAmount?: number;
  type: 'income' | 'expense' | 'transfer';
  flowType: TransactionFlowType;
  status?: string;
  originType?: string | null;
  originId?: string | null;
  paymentMethod: PaymentMethodLabel;
  wallet: string;
  destinationWallet?: string | null;
  receiptUrl?: string | null;
};

type Goal = {
  id: string | number;
  name: string;
  target: number;
  current: number;
  category: string;
  deadline?: string | null;
  icon: LucideIcon;
  color: string; // className ex: 'text-[var(--positive)]'
};

type Investment = {
  id: string | number;
  label: string;
  type: string;
  walletId?: string | null;
  walletName: string;
  institution: string;
  value: number; // valor atual
  invested: number; // valor total investido
  expectedReturnAnnual: number;
  color: string; // className ex: 'bg-[var(--primary)]'
};

type WalletAccount = {
  id: string;
  name: string;
  balance: number;
};

type Debt = {
  id: string | number;
  creditor: string;
  originalAmount: number;
  remainingAmount: number;
  interestRateMonthly: number;
  dueDay: number;
  dueDate?: string | null;
  category: string;
  status: 'Em aberto' | 'Quitada' | 'Atrasada' | 'Parcelada';
};

type RecurringDebt = {
  id: string | number;
  creditor: string;
  amount: number;
  category: string;
  frequency: 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  interval: number;
  startDate: string;
  endDate?: string | null;
  dueDay?: number | null;
  nextDueDate: string;
  status: 'Ativa' | 'Pausada' | 'Encerrada';
  notes?: string | null;
  source: 'recurring_debt' | 'legacy_debt';
  legacyDebtId?: string | null;
};

type Bill = {
  id: string | number;
  label: string;
  date: string;
  isoDate?: string;
  amount: number;
  icon: LucideIcon;
  color: string;
  bg: string;
  status: 'pending' | 'paid' | 'overdue';
  kind?: 'debt' | 'goal';
  helperText?: string;
  daysUntil?: number;
};

type Message = {
  role: 'user' | 'model';
  text: string;
  time: string;
  clientNonce?: string;
  audioUrl?: string | null;
  audioMimeType?: string | null;
};

type SubscriptionPlan = 'FREE' | 'PRO' | 'PREMIUM';
type ReportAccessLevel = 'basic' | 'full';

type WorkspaceOption = {
  id: string;
  name: string;
  role?: string;
};

type WorkspaceEventItem = {
  id: string;
  type: string;
  created_at: string;
  user_id?: string | null;
  payload?: Record<string, unknown> | null;
};

type DashboardProjectionDaily = {
  date: string;
  openingBalance: number;
  inflowConfirmed: number;
  outflowConfirmed: number;
  inflowPlanned: number;
  outflowPlanned: number;
  closingBalance: number;
};

type DashboardProjection = {
  asOfDate: string;
  currentBalance: number;
  projectedBalance30d: number;
  projectedNegativeDate: string | null;
  monthConfirmedIncome: number;
  monthConfirmedExpense: number;
  monthPlannedIncome: number;
  monthPlannedExpense: number;
  upcomingEventsCount14d: number;
  nextCriticalDate: string | null;
  updatedAt: string;
  daily: DashboardProjectionDaily[];
};

type DashboardCalendarUpcomingItem = {
  id: string;
  title: string;
  date: string;
  status: 'PENDING' | 'OVERDUE' | 'PAID' | 'RECEIVED' | 'CANCELED' | string;
  flow: 'in' | 'out' | 'neutral';
  type: string;
  amount: number | null;
  sourceType: string | null;
};

type DashboardCalendarReadModel = {
  periodFocusDate: string | null;
  openingBalance: number;
  totalExpectedInflow: number;
  totalExpectedOutflow: number;
  projectedBalance: number;
  overdueCount: number;
  criticalDaysCount: number;
  upcomingEvents: DashboardCalendarUpcomingItem[];
};

type WorkspaceDashboardSnapshot = {
  totalBalance: number;
  currentPlan: SubscriptionPlan;
  reportAccessLevel: ReportAccessLevel;
  currentMonthTransactionCount: number;
  aiUsageCount: number;
  transactions: Transaction[];
  goals: Goal[];
  investments: Investment[];
  debts: Debt[];
  recurringDebts: RecurringDebt[];
  workspaceEvents: WorkspaceEventItem[];
  dashboardOverview: DashboardOverviewPayload | null;
  reportsOverview?: ReportsOverviewPayload | null;
  dashboardInsights: string[];
  isWhatsAppConnected: boolean;
  workspaceWhatsAppPhoneNumber: string;
  dashboardProjection: DashboardProjection | null;
  dashboardCalendarReadModel?: DashboardCalendarReadModel | null;
};

type TransactionsResourceRefreshOptions = {
  syncTransactions?: boolean;
  syncWallets?: boolean;
  syncWorkspaceEvents?: boolean;
  syncInsights?: boolean;
  syncProjection?: boolean;
  syncCalendarReadModel?: boolean;
  syncTotalsAndPlan?: boolean;
  syncUsageAndLimits?: boolean;
  syncWhatsAppState?: boolean;
};

type CustomTransactionCategoryBuckets = {
  income: string[];
  expense: string[];
};

const DASHBOARD_SNAPSHOT_STORAGE_VERSION = 2;
const ACTIVE_WORKSPACE_STORAGE_VERSION = 1;
const CUSTOM_TRANSACTION_CATEGORIES_STORAGE_VERSION = 1;

function getCustomTransactionCategoriesStorageKey(userId: string, workspaceId: string) {
  return `cote-custom-transaction-categories:v${CUSTOM_TRANSACTION_CATEGORIES_STORAGE_VERSION}:${userId}:${workspaceId}`;
}

function normalizeCustomCategoryLabel(value: string) {
  return value
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 40);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function toArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function isDashboardOverviewPayloadCompatible(value: unknown): value is DashboardOverviewPayload {
  if (!isRecord(value)) return false;

  const forecast = value.forecast;
  const insights = value.insights;
  const period = value.period;
  const summary = value.summary;

  if (!isRecord(period) || !isRecord(summary) || !isRecord(forecast) || !isRecord(insights)) {
    return false;
  }

  return (
    Array.isArray(forecast.daily) &&
    Array.isArray(value.monthlySeries) &&
    Array.isArray(value.alerts) &&
    Array.isArray(value.upcomingEvents) &&
    Array.isArray(value.recentTransactions) &&
    Array.isArray(insights.primary) &&
    Array.isArray(insights.automated)
  );
}

function mergeTransactionCategoryLists(base: string[], custom: string[]) {
  const baseSet = new Set(base.map((item) => item.toLocaleLowerCase('pt-BR')));
  const customNormalized = custom
    .map((item) => normalizeCustomCategoryLabel(item))
    .filter((item) => item.length > 0 && !baseSet.has(item.toLocaleLowerCase('pt-BR')));

  const othersIndex = base.findIndex((item) => item === 'Outros');
  if (othersIndex < 0) {
    return [...base, ...customNormalized];
  }

  return [...base.slice(0, othersIndex), ...customNormalized, ...base.slice(othersIndex)];
}

function readCustomTransactionCategories(userId: string, workspaceId: string): CustomTransactionCategoryBuckets {
  if (typeof window === 'undefined') {
    return { income: [], expense: [] };
  }

  try {
    const raw = window.localStorage.getItem(getCustomTransactionCategoriesStorageKey(userId, workspaceId));
    if (!raw) return { income: [], expense: [] };
    const parsed = JSON.parse(raw) as Partial<CustomTransactionCategoryBuckets> | null;
    const income = Array.isArray(parsed?.income)
      ? parsed!.income
          .map((item) => normalizeCustomCategoryLabel(String(item || '')))
          .filter((item, index, array) => item.length > 0 && array.indexOf(item) === index)
      : [];
    const expense = Array.isArray(parsed?.expense)
      ? parsed!.expense
          .map((item) => normalizeCustomCategoryLabel(String(item || '')))
          .filter((item, index, array) => item.length > 0 && array.indexOf(item) === index)
      : [];
    return { income, expense };
  } catch {
    return { income: [], expense: [] };
  }
}

function writeCustomTransactionCategories(
  userId: string,
  workspaceId: string,
  value: CustomTransactionCategoryBuckets
) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(getCustomTransactionCategoriesStorageKey(userId, workspaceId), JSON.stringify(value));
  } catch {
    // Ignore storage failures.
  }
}

function getDashboardSnapshotStorageKey(userId: string, workspaceId: string) {
  return `cote-dashboard-snapshot:v${DASHBOARD_SNAPSHOT_STORAGE_VERSION}:${userId}:${workspaceId}`;
}

function readDashboardSnapshot(userId: string, workspaceId: string): WorkspaceDashboardSnapshot | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const rawSnapshot = window.sessionStorage.getItem(
      getDashboardSnapshotStorageKey(userId, workspaceId)
    );

    if (!rawSnapshot) {
      return null;
    }

    const parsed = JSON.parse(rawSnapshot);
    return isRecord(parsed) ? (parsed as WorkspaceDashboardSnapshot) : null;
  } catch {
    return null;
  }
}

function writeDashboardSnapshot(
  userId: string,
  workspaceId: string,
  snapshot: WorkspaceDashboardSnapshot
) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.sessionStorage.setItem(
      getDashboardSnapshotStorageKey(userId, workspaceId),
      JSON.stringify(snapshot)
    );
  } catch {
    // Ignore storage failures. The in-memory cache still handles the fast path.
  }
}

function getActiveWorkspaceStorageKey(userId: string) {
  return `cote-active-workspace:v${ACTIVE_WORKSPACE_STORAGE_VERSION}:${userId}`;
}

function readActiveWorkspacePreference(userId: string): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage.getItem(getActiveWorkspaceStorageKey(userId));
  } catch {
    return null;
  }
}

function writeActiveWorkspacePreference(userId: string, workspaceId: string) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(getActiveWorkspaceStorageKey(userId), workspaceId);
  } catch {
    // Ignore storage failures.
  }
}

type SubscriptionOverview = {
  workspaceId: string;
  workspaceName: string;
  plan: SubscriptionPlan;
  planLabel: string;
  interval?: 'MONTHLY' | 'ANNUAL' | null;
  billingLabel: string;
  status: 'FREE' | 'ACTIVE' | 'TRIALING' | 'CANCELED' | 'PENDING';
  statusLabel: string;
  statusMessage: string;
  nextBillingDate: string | null;
  cancelAtPeriodEnd: boolean;
  features: string[];
  stripeConfigured: boolean;
  hasStripeCustomer: boolean;
  hasStripeSubscription: boolean;
  recommendedAction?: 'checkout' | 'regularize' | 'change_plan';
  primaryActionLabel?: string;
  canCancel: boolean;
  canReactivate: boolean;
  canManageBilling: boolean;
  canOpenCheckout?: boolean;
};

type WhatsAppFeedback = {
  tone: 'success' | 'error' | 'info';
  title: string;
  message: string;
} | null;

type AppNotification = {
  id: string;
  title: string;
  message: string;
  tone: 'info' | 'warning' | 'error' | 'success';
  timestamp?: string;
  targetTab?: Tab;
};

type NotificationPreferenceState = {
  readIds: string[];
  deletedIds: string[];
};

type PremiumSmartAlertOptions = {
  includeOkState?: boolean;
};

type WhatsAppMetaDiagnostic = {
  status?: number;
  category?: string;
  message?: string;
  templateName?: string | null;
  languageCode?: string | null;
  destination?: string | null;
};

type WhatsAppDiagnostic = {
  numeroConectado: string | null;
  connectionState?: 'idle' | 'connecting' | 'connected' | 'disconnected' | 'failed';
  lastValidatedAt?: string | null;
  lastTestSentAt?: string | null;
  lastErrorMessage?: string | null;
  metaResult?: string | WhatsAppMetaDiagnostic | null;
};

const FREE_TRANSACTION_LIMIT_PER_MONTH = 10;
const FREE_AI_LIMIT_PER_MONTH = 10;
const AVATAR_MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const AVATAR_OUTPUT_SIZE = 256;

// --- Helpers ---

const parseCurrency = (val: string) => {
  if (typeof val !== 'string') return 0;
  const cleaned = val.replace(/[R$\s.]/g, '').replace(',', '.');
  return Math.abs(parseFloat(cleaned)) || 0;
};

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(val);
};

const formatAgendaDate = (date: Date) =>
  date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  });

const getWhatsAppConnectionLabel = (
  state: WhatsAppDiagnostic['connectionState'],
  isConnected: boolean,
  isConnecting: boolean
) => {
  if (isConnecting) {
    return 'Conectando...';
  }

  switch (state) {
    case 'connecting':
      return 'Conectando...';
    case 'connected':
      return 'Conectado';
    case 'failed':
      return 'Falha ao conectar';
    case 'disconnected':
      return 'Desconectado';
    default:
      return isConnected ? 'Conectado' : 'Desconectado';
  }
};

const getWhatsAppPrimaryActionLabel = (
  state: WhatsAppDiagnostic['connectionState'],
  isConnected: boolean,
  isConnecting: boolean
) => {
  if (isConnecting || state === 'connecting') {
    return 'Conectando...';
  }

  switch (state) {
    case 'connected':
      return 'Conectado';
    case 'failed':
      return 'Tentar novamente';
    case 'disconnected':
    case 'idle':
    default:
      return isConnected ? 'Conectado' : 'Conectar';
  }
};

const getWhatsAppConnectionTone = (
  state: WhatsAppDiagnostic['connectionState'],
  isConnected: boolean,
  isConnecting: boolean
) => {
  if (isConnecting || state === 'connecting') {
    return 'warning';
  }
  if (state === 'failed') {
    return 'error';
  }
  if (state === 'connected' || isConnected) {
    return 'success';
  }
  return 'neutral';
};

const getWhatsAppConnectionDescription = (
  state: WhatsAppDiagnostic['connectionState'],
  isConnected: boolean,
  lastErrorMessage?: string | null
) => {
  if (state === 'failed') {
    return lastErrorMessage || 'Não foi possível confirmar a entrega da mensagem. Revise o número e tente novamente.';
  }
  if (state === 'connecting') {
    return 'A Meta aceitou a solicitação. Estamos aguardando a confirmação real de entrega.';
  }
  if (state === 'connected' || isConnected) {
    return 'Entrega confirmada. O WhatsApp está pronto para testes e resumos.';
  }
  return 'Informe o número e clique em Conectar.';
};

const normalizeWhatsAppConnectionState = (value: unknown): WhatsAppDiagnostic['connectionState'] => {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'connected') return 'connected';
  if (normalized === 'connecting' || normalized === 'testing') return 'connecting';
  if (normalized === 'failed' || normalized === 'error') return 'failed';
  if (normalized === 'disconnected' || normalized === 'config_pending') return 'disconnected';
  return 'idle';
};

const resolveWhatsAppConnectionState = (params: {
  statusValue?: unknown;
  diagnosticValue?: unknown;
}): WhatsAppDiagnostic['connectionState'] => {
  const statusState = normalizeWhatsAppConnectionState(params.statusValue);
  const diagnosticState = normalizeWhatsAppConnectionState(params.diagnosticValue);

  if (statusState === 'connected' || statusState === 'connecting' || statusState === 'failed') {
    return statusState;
  }

  if (diagnosticState === 'failed') {
    return 'failed';
  }

  if (statusState === 'disconnected') {
    return 'disconnected';
  }

  if (diagnosticState === 'connected' || diagnosticState === 'connecting' || diagnosticState === 'disconnected') {
    return diagnosticState;
  }

  return 'idle';
};

const normalizePhoneDigits = (value?: string | null) => String(value || '').replace(/\D/g, '');

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const getAgendaDayDiff = (date: Date, reference = new Date()) =>
  Math.round((startOfDay(date).getTime() - startOfDay(reference).getTime()) / 86_400_000);

const buildPremiumSmartAlerts = ({
  transactions,
  totalBalance,
  goals,
  now,
  includeOkState = false,
}: {
  transactions: Transaction[];
  totalBalance: number;
  goals: Goal[];
  now: Date;
} & PremiumSmartAlertOptions): AppNotification[] => {
  const alerts: AppNotification[] = [];
  const forecastWindowDays = 60;
  const windowStart = new Date(now.getTime() - forecastWindowDays * 24 * 60 * 60 * 1000);
  const enrichedTransactions = transactions.map((tx) => ({ ...tx, parsedDate: parseTransactionDate(tx.date) }));
  const recentTransactions = enrichedTransactions.filter(
    (tx) => tx.parsedDate && tx.parsedDate >= windowStart
  );

  const recentNetFlow = recentTransactions.reduce((acc, tx) => {
    const amount = parseCurrency(tx.amount);
    return acc + (tx.type === 'income' ? amount : -amount);
  }, 0);
  const dailyNetFlow = recentTransactions.length > 0 ? recentNetFlow / forecastWindowDays : 0;
  const projectedNegativeInDays =
    dailyNetFlow < 0 && totalBalance > 0 ? Math.max(1, Math.floor(totalBalance / Math.abs(dailyNetFlow))) : null;

  if (projectedNegativeInDays !== null && projectedNegativeInDays <= 30) {
    alerts.push({
      id: 'premium-balance-risk',
      title: 'Alerta inteligente: risco de saldo',
      message: `No ritmo atual, seu saldo pode ficar negativo em cerca de ${projectedNegativeInDays} dias.`,
      tone: 'error',
      targetTab: 'reports',
    });
  }

  const currentMonthExpenses = enrichedTransactions
    .filter((tx) => tx.type === 'expense' && isInCurrentMonth(tx.parsedDate ?? null))
    .reduce((acc, tx) => acc + parseCurrency(tx.amount), 0);

  const previousMonthReference = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previousMonthExpenses = enrichedTransactions
    .filter(
      (tx) =>
        tx.type === 'expense' &&
        tx.parsedDate &&
        tx.parsedDate.getFullYear() === previousMonthReference.getFullYear() &&
        tx.parsedDate.getMonth() === previousMonthReference.getMonth()
    )
    .reduce((acc, tx) => acc + parseCurrency(tx.amount), 0);

  if (previousMonthExpenses > 0 && currentMonthExpenses > previousMonthExpenses * 1.18) {
    const variation = Math.round(((currentMonthExpenses - previousMonthExpenses) / previousMonthExpenses) * 100);
    alerts.push({
      id: 'premium-expense-spike',
      title: 'Alerta inteligente: gasto acima do padrão',
      message: `Suas saidas subiram ${variation}% em relação ao mês anterior. Vale revisar onde o caixa acelerou.`,
      tone: 'warning',
      targetTab: 'reports',
    });
  }

  const riskyGoal = goals
    .filter((goal) => goal.deadline && goal.current < goal.target)
    .map((goal) => {
      const deadline = new Date(goal.deadline as string);
      const daysUntilDeadline = Math.ceil((deadline.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
      const remaining = Math.max(0, goal.target - goal.current);
      return {
        goal,
        daysUntilDeadline,
        remaining,
      };
    })
    .filter((item) => item.daysUntilDeadline >= 0 && item.daysUntilDeadline <= 30)
    .sort((a, b) => a.daysUntilDeadline - b.daysUntilDeadline)[0];

  if (riskyGoal) {
    alerts.push({
      id: `premium-goal-risk-${riskyGoal.goal.id}`,
      title: 'Alerta inteligente: meta em risco',
      message: `A meta ${riskyGoal.goal.name} vence em ${riskyGoal.daysUntilDeadline} dias e ainda faltam ${formatCurrency(riskyGoal.remaining)}.`,
      tone: 'warning',
      targetTab: 'goals',
    });
  }

  if (alerts.length === 0 && includeOkState) {
    alerts.push({
      id: 'premium-smart-alerts-ok',
      title: 'Alertas inteligentes monitorando seu caixa',
      message: 'Nenhum sinal crítico foi detectado agora. Seu fluxo está estável e dentro do esperado.',
      tone: 'success',
      targetTab: 'reports',
    });
  }

  return alerts;
};

const getNextMonthDueDate = (dueDay: number, reference = new Date()) => {
  const year = reference.getFullYear();
  const month = reference.getMonth();
  const currentMonthLastDay = new Date(year, month + 1, 0).getDate();
  const currentCandidate = new Date(year, month, Math.min(dueDay, currentMonthLastDay));

  if (startOfDay(currentCandidate) >= startOfDay(reference)) {
    return currentCandidate;
  }

  const nextMonthBase = new Date(year, month + 1, 1);
  const nextMonthLastDay = new Date(nextMonthBase.getFullYear(), nextMonthBase.getMonth() + 1, 0).getDate();
  return new Date(
    nextMonthBase.getFullYear(),
    nextMonthBase.getMonth(),
    Math.min(dueDay, nextMonthLastDay)
  );
};

const toInputDateValue = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const parseInputDateValue = (value: string | null | undefined) => {
  const token = String(value || '').trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(token);
  if (!match) return null;
  const parsed = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const WEEKDAY_LABELS: Record<number, string> = {
  0: 'Domingo',
  1: 'Segunda-feira',
  2: 'Terça-feira',
  3: 'Quarta-feira',
  4: 'Quinta-feira',
  5: 'Sexta-feira',
  6: 'Sábado',
};

const parseWeekdayValue = (value: string) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 6) return null;
  return parsed;
};

const alignDateToWeekday = (startDateInput: string, weekdayInput: string) => {
  const startDate = parseInputDateValue(startDateInput);
  const targetWeekday = parseWeekdayValue(weekdayInput);
  if (!startDate || targetWeekday === null) return startDateInput;

  const offset = (targetWeekday - startDate.getDay() + 7) % 7;
  const aligned = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + offset);
  return toInputDateValue(aligned);
};

const getDefaultDebtDueDateInput = (reference = new Date(), fallbackDueDay = 10) =>
  toInputDateValue(getNextMonthDueDate(fallbackDueDay, reference));

const getDebtDueDateValue = (debt: Pick<Debt, 'dueDate' | 'dueDay'>, reference = new Date()) => {
  const explicitDate = parseInputDateValue(debt.dueDate ?? null);
  if (explicitDate) return explicitDate;
  return computeConventionalDebtNextDueDate({ dueDay: debt.dueDay, now: reference });
};

const formatDebtDueDateLabel = (debt: Pick<Debt, 'dueDate' | 'dueDay'>, reference = new Date()) =>
  new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(getDebtDueDateValue(debt, reference));

const shouldShowWorkspaceOnboarding = (payload: unknown) => {
  if (!payload || typeof payload !== 'object') return false;
  const onboarding = payload as {
    shouldShow?: boolean;
    completed?: boolean;
    dismissed?: boolean;
  };
  if (typeof onboarding.shouldShow === 'boolean') return onboarding.shouldShow;
  const completed = Boolean(onboarding.completed);
  const dismissed = Boolean(onboarding.dismissed);
  return !completed && !dismissed;
};

const parseMoneyInput = (val: string) => parseCurrency(val);

const formatMoneyInput = (val: number | string) => {
  if (typeof val === 'number') return formatCurrency(val);
  return formatCurrency(parseMoneyInput(val));
};

const getUserDisplayName = (user: any) => {
  const metadata = user?.user_metadata;
  const nameCandidates = [
    metadata?.full_name,
    metadata?.name,
    [metadata?.first_name, metadata?.last_name].filter(Boolean).join(' '),
  ];

  const resolvedName = nameCandidates.find((value) => typeof value === 'string' && value.trim());
  if (typeof resolvedName === 'string' && resolvedName.trim()) {
    return resolvedName.trim();
  }

  return user?.email?.split('@')[0] || 'Usuário';
};

const getUserAvatarUrl = (user: any) => {
  const avatarUrl = user?.user_metadata?.avatar_url;
  if (typeof avatarUrl === 'string' && avatarUrl.trim()) {
    return avatarUrl.trim();
  }

  return null;
};

const getInitialsFromName = (name: string) => {
  const parts = name
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
  }

  return (parts[0] || '').slice(0, 2).toUpperCase() || 'U';
};

const getUserInitials = (user: any) => getInitialsFromName(getUserDisplayName(user));

const isDataImageUrl = (value: string) => /^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(value);

const isValidAvatarUrl = (value: string) => {
  if (!value) return true;
  if (isDataImageUrl(value)) return true;

  try {
    const parsedAvatarUrl = new URL(value);
    return parsedAvatarUrl.protocol === 'http:' || parsedAvatarUrl.protocol === 'https:';
  } catch {
    return false;
  }
};

const optimizeAvatarFile = (file: File) =>
  new Promise<string>((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Selecione um arquivo de imagem válido.'));
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const image = new window.Image();

    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = AVATAR_OUTPUT_SIZE;
        canvas.height = AVATAR_OUTPUT_SIZE;

        const context = canvas.getContext('2d');
        if (!context) {
          throw new Error('Não foi possível processar a imagem.');
        }

        const cropSize = Math.min(image.naturalWidth, image.naturalHeight);
        const offsetX = (image.naturalWidth - cropSize) / 2;
        const offsetY = (image.naturalHeight - cropSize) / 2;

        context.fillStyle = 'var(--bg-surface)';
        context.fillRect(0, 0, AVATAR_OUTPUT_SIZE, AVATAR_OUTPUT_SIZE);
        context.drawImage(
          image,
          offsetX,
          offsetY,
          cropSize,
          cropSize,
          0,
          0,
          AVATAR_OUTPUT_SIZE,
          AVATAR_OUTPUT_SIZE
        );

        resolve(canvas.toDataURL('image/jpeg', 0.82));
      } catch (error) {
        reject(error instanceof Error ? error : new Error('Falha ao processar a imagem.'));
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Não foi possível ler a imagem selecionada.'));
    };

    image.src = objectUrl;
  });

const maskMoneyInput = (rawValue: string) => {
  const digits = rawValue.replace(/\D/g, '');
  if (!digits) return '';
  return formatCurrency(Number(digits) / 100);
};

const TRANSACTION_FLOW_TYPES: TransactionFlowType[] = [
  'Entrada',
  'Saida',
  'Transferência',
];

const PAYMENT_METHODS: PaymentMethodLabel[] = [
  'PIX',
  'Cartão',
  'Dinheiro',
  'Transferência bancária',
  'Boleto',
  'Débito',
  'Outro',
];

const TRANSACTION_CATEGORIES = [
  'Alimentação',
  'Transporte',
  'Saúde',
  'Educação',
  'Lazer',
  'Moradia',
  'Salário',
  'Freelance',
  'Comissão',
  'Reembolso',
  'Vendas',
  'Marketing',
  'Investimentos',
  'PIX',
  'Outros',
  'Auto (IA)',
];

const REVENUE_TRANSACTION_CATEGORIES: readonly string[] = [
  'Salário',
  'Freelance',
  'Comissão',
  'Reembolso',
  'Vendas',
  'Investimentos',
  'PIX',
  'Outros',
] as const;
const EXPENSE_TRANSACTION_CATEGORIES: readonly string[] = [
  'Alimentação',
  'Transporte',
  'Saúde',
  'Educação',
  'Lazer',
  'Moradia',
  'Marketing',
  'Outros',
] as const;
const TRANSFER_TRANSACTION_CATEGORIES: readonly string[] = ['Outros'];

const DEFAULT_TRANSACTION_WALLET = 'Carteira principal';

const MAIN_BANK_OPTIONS = [
  'Nubank',
  'Banco do Brasil',
  'Caixa',
  'Itaú',
  'Bradesco',
  'Santander',
  'Inter',
  'C6 Bank',
  'BTG Pactual',
  'XP',
  'PicPay',
  'Mercado Pago',
  'Outro banco',
] as const;

const GOAL_CATEGORIES = [
  'Reserva de emergência',
  'Viagem',
  'Casa',
  'Carro',
  'Investimentos',
  'Educação',
  'Aposentadoria',
  'Outros',
];

const DEBT_CATEGORIES: readonly string[] = [...CONVENTIONAL_DEBT_CATEGORIES];
const RECURRING_DEBT_CATEGORY_DESCRIPTION_DEFAULTS: Record<string, string> = {
  agua: 'Conta de agua',
  luz: 'Conta de energia',
  internet: 'Conta de internet',
  aluguel: 'Conta de aluguel',
  telefone: 'Conta de telefone',
  condominio: 'Conta de condominio',
  assinatura: 'Assinatura recorrente',
};

const normalizeRecurringDebtCategory = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

const getRecurringDebtDescriptionDefault = (category: string) =>
  RECURRING_DEBT_CATEGORY_DESCRIPTION_DEFAULTS[normalizeRecurringDebtCategory(category)] ||
  `Conta de ${category || 'saida recorrente'}`;

const INVESTMENT_TYPES = [
  'Renda fixa',
  'Renda variável',
  'Tesouro',
  'CDB',
  'LCI/LCA',
  'Ações',
  'Fundos',
  'Cripto',
  'Outros',
];

const ASSISTANT_SUGGESTIONS = [
  'Onde eu mais gasto',
  'Qual meu saldo este mês',
  'Me dê dicas para economizar',
  'Quais são meus maiores gastos',
  'Como estão meus investimentos',
  'Quais dívidas devo priorizar',
];

const ONBOARDING_OBJECTIVES = [
  'Organizar meus gastos',
  'Economizar mais dinheiro',
  'Sair das dívidas',
  'Acompanhar investimentos',
  'Ter mais controle financeiro',
];

const ONBOARDING_USAGE_LEVELS = [
  'Até 20 lançamentos',
  '20 a 50 lançamentos',
  '50 a 100 lançamentos',
  'Mais de 100 lançamentos',
];

const createInitialOnboardingTransaction = (): TransactionFormData => ({
  description: '',
  amount: '',
  flowType: 'Saida',
  incomeScheduleMode: 'SINGLE',
  recurrenceFrequency: 'MONTHLY',
  recurrenceEndDate: '',
  category: 'Alimentação',
  paymentMethod: 'PIX',
  wallet: DEFAULT_TRANSACTION_WALLET,
  destinationWallet: '',
  receiptUrl: null,
  date: new Date().toISOString().split('T')[0],
});

const getInvestmentColor = (type: string) => {
  const colorMap: Record<string, string> = {
    'Renda fixa': 'bg-[var(--primary)]',
    'Renda variável': 'bg-[var(--primary)]',
    Tesouro: 'bg-[var(--primary)]',
    CDB: 'bg-[var(--primary)]',
    'LCI/LCA': 'bg-[var(--primary)]',
    'Ações': 'bg-[color:var(--danger-soft)]',
    Fundos: 'bg-[var(--primary)]',
    Cripto: 'bg-[color:var(--danger-soft)]',
    Outros: 'bg-[var(--bg-surface-elevated)]',
  };

  return colorMap[type] || 'bg-[var(--bg-surface-elevated)]';
};

const mapFlowTypeToBaseType = (flowType: TransactionFlowType): 'income' | 'expense' | 'transfer' => {
  if (flowType === 'Entrada') return 'income';
  if (flowType === 'Saida') return 'expense';
  return 'transfer';
};

const mapFlowTypeToBackendType = (flowType: TransactionFlowType) => {
  if (flowType === 'Entrada') return 'INCOME';
  if (flowType === 'Saida') return 'EXPENSE';
  return 'TRANSFER';
};

const mapBackendTypeToFlowType = (rawType: string): TransactionFlowType => {
  if (rawType === 'INCOME' || rawType === 'PIX_IN') return 'Entrada';
  if (rawType === 'EXPENSE' || rawType === 'PIX_OUT') return 'Saida';
  if (rawType === 'TRANSFER') return 'Transferência';
  if (rawType === 'income') return 'Entrada';
  if (rawType === 'expense') return 'Saida';
  return 'Saida';
};

const isTransientDashboardOverviewError = (error: unknown) => {
  if (error instanceof ResourceClientError) {
    if (error.path.startsWith('/api/dashboard/overview') && [408, 429, 502, 503, 504].includes(error.status)) {
      return true;
    }
  }

  const message = error instanceof Error ? error.message : String(error || '');
  return /tempo limite|timeout|failed to fetch|fetch failed|network|temporarily unavailable|upstream request timeout/i.test(
    message
  );
};

const normalizePaymentMethodLabel = (rawMethod: unknown): PaymentMethodLabel => {
  const normalized = String(rawMethod || '')
    .trim()
    .toUpperCase();

  if (normalized === 'PIX') return 'PIX';
  if (normalized === 'CARD' || normalized === 'CARTAO' || normalized === 'CARTÃO') return 'Cartão';
  if (normalized === 'CASH' || normalized === 'DINHEIRO') return 'Dinheiro';
  if (
    normalized === 'BANK_TRANSFER' ||
    normalized === 'TRANSFERENCIA_BANCARIA' ||
    normalized === 'TRANSFERENCIA BANCARIA'
  ) {
    return 'Transferência bancária';
  }
  if (normalized === 'BOLETO') return 'Boleto';
  if (normalized === 'DEBIT' || normalized === 'DEBITO') return 'Débito';
  return 'Outro';
};

const mapPaymentMethodToBackend = (method: PaymentMethodLabel) => {
  if (method === 'PIX') return 'PIX';
  if (method === 'Cartão') return 'CARD';
  if (method === 'Dinheiro') return 'CASH';
  if (method === 'Transferência bancária') return 'BANK_TRANSFER';
  if (method === 'Boleto') return 'BOLETO';
  if (method === 'Débito') return 'DEBIT';
  return 'OTHER';
};

const getDefaultPaymentMethodForFlow = (flowType: TransactionFlowType): PaymentMethodLabel => {
  if (flowType === 'Transferência') return 'Transferência bancária';
  return 'PIX';
};

const getDefaultCategoryForFlow = (flowType: TransactionFlowType) => {
  if (flowType === 'Entrada') return 'Salário';
  if (flowType === 'Transferência') return 'Outros';
  return 'Alimentação';
};

const getAvailableCategoriesForFlow = (flowType: TransactionFlowType): string[] => {
  if (flowType === 'Entrada') return [...REVENUE_TRANSACTION_CATEGORIES];
  if (flowType === 'Transferência') return [...TRANSFER_TRANSACTION_CATEGORIES];
  return [...EXPENSE_TRANSACTION_CATEGORIES];
};

const getTransactionAmountSignal = (baseType: 'income' | 'expense' | 'transfer') => {
  if (baseType === 'expense') return '-';
  if (baseType === 'income') return '+';
  return '';
};

const getPaymentMethodIconLabel = (method: PaymentMethodLabel) => {
  if (method === 'PIX') return 'PIX';
  if (method === 'Cartão') return 'CARD';
  if (method === 'Dinheiro') return 'CASH';
  if (method === 'Transferência bancária') return 'TED';
  if (method === 'Boleto') return 'BOL';
  if (method === 'Débito') return 'DEB';
  return 'OUT';
};

const getFlowTypeIcon = (flowType: TransactionFlowType) => {
  if (flowType === 'Entrada') return ArrowUpRight;
  if (flowType === 'Transferência') return Workflow;
  return ArrowDownRight;
};

const getBaseTypeColorClass = (baseType: 'income' | 'expense' | 'transfer') => {
  if (baseType === 'income') return 'text-[var(--positive)]';
  if (baseType === 'expense') return 'text-[var(--danger)]';
  return 'text-[var(--primary)]';
};

const getFlowTypeBadgeClass = (flowType: TransactionFlowType) => {
  const baseType = mapFlowTypeToBaseType(flowType);
  if (baseType === 'income') {
    return 'border-[color:color-mix(in_srgb,var(--positive)_35%,transparent)] bg-[var(--positive-soft)] text-[var(--positive)]';
  }
  if (baseType === 'expense') {
    return 'border-[color:color-mix(in_srgb,var(--danger)_35%,transparent)] bg-[var(--danger-soft)] text-[var(--danger)]';
  }
  return 'border-[color:color-mix(in_srgb,var(--primary)_35%,transparent)] bg-[var(--primary-soft)] text-[var(--primary)]';
};

const extractInsightMetric = (text: string): string | null => {
  const currencyMatch = text.match(/R\$\s?\d{1,3}(?:\.\d{3})*(?:,\d{2})?/);
  if (currencyMatch) return currencyMatch[0];
  const percentMatch = text.match(/\d+(?:[.,]\d+)?%/);
  if (percentMatch) return percentMatch[0];
  return null;
};

const getInsightActionHint = (insight: string) => {
  const normalized = insight.toLowerCase();
  if (normalized.includes('dívida') || normalized.includes('divida')) {
    return 'Ação sugerida: priorize redução de dívidas com maior juros.';
  }
  if (normalized.includes('gasto') || normalized.includes('saida') || normalized.includes('despesa')) {
    return 'Ação sugerida: revise categorias que mais pressionam o caixa.';
  }
  if (normalized.includes('entrada') || normalized.includes('receita')) {
    return 'Acao sugerida: use esse ganho para reforcar reserva e metas prioritarias.';
  }
  if (normalized.includes('saldo') || normalized.includes('caixa')) {
    return 'Ação sugerida: ajuste saídas recorrentes para proteger o saldo.';
  }
  if (normalized.includes('invest')) {
    return 'Ação sugerida: rebalanceie os ativos de maior concentração.';
  }
  return 'Ação sugerida: valide este ponto e defina o próximo passo.';
};

const normalizePlan = (rawPlan: unknown): SubscriptionPlan => {
  const normalized = String(rawPlan || '')
    .trim()
    .toUpperCase();
  if (normalized === 'PRO' || normalized === 'PREMIUM') return normalized;
  return 'FREE';
};

const getPlanLabel = (plan: SubscriptionPlan) => {
  if (plan === 'PREMIUM') return 'Premium';
  if (plan === 'PRO') return 'Pro';
  return 'Free';
};

const getWorkspaceEventLabel = (eventType: string) => {
  const labels: Record<string, string> = {
    'transaction.created': 'Transação criada',
    'transaction.updated': 'Transação atualizada',
    'transaction.deleted': 'Transação removida',
    'workspace.created': 'Conta criada',
    'onboarding.completed': 'Onboarding concluído',
    'workspace.whatsapp.connected': 'WhatsApp conectado',
    'workspace.whatsapp.disconnected': 'WhatsApp desconectado',
    'whatsapp.connect.requested': 'Conexão de WhatsApp iniciada',
    'whatsapp.connect.delivered': 'Conexão de WhatsApp confirmada',
    'whatsapp.connect.failed': 'Falha na conexão do WhatsApp',
    'whatsapp.connect.welcome_failed': 'Falha no envio de conexão do WhatsApp',
    'whatsapp.test.requested': 'Teste de WhatsApp iniciado',
    'whatsapp.test.delivered': 'Teste de WhatsApp entregue',
    'whatsapp.test.failed': 'Falha no teste de WhatsApp',
    'whatsapp.connect.status_webhook': 'Atualização da conexão no WhatsApp',
    'whatsapp.test.status_webhook': 'Atualização do teste no WhatsApp',
    'whatsapp.status_webhook': 'Atualização de status no WhatsApp',
    'whatsapp.disconnected': 'WhatsApp desconectado',
    'stripe.checkout.created': 'Checkout iniciado',
    'stripe.portal.created': 'Portal de assinatura aberto',
    'stripe.customer.subscription.created': 'Assinatura criada',
    'stripe.customer.subscription.updated': 'Assinatura atualizada',
    'stripe.customer.subscription.deleted': 'Assinatura encerrada',
    'stripe.invoice.paid': 'Pagamento confirmado',
    'stripe.invoice.payment_failed': 'Falha na cobrança',
    'ai.chat.used': 'Assistente IA utilizado',
    'ai.classify.used': 'Classificação automática usada',
  };

  return labels[eventType] || eventType.replace(/\./g, ' • ');
};

const getWorkspaceEventMessage = (event: WorkspaceEventItem) => {
  const messages: Record<string, string> = {
    'transaction.created': 'Uma nova movimentação foi registrada e já apareceu no seu painel.',
    'transaction.updated': 'Uma movimentação foi atualizada com os dados mais recentes.',
    'transaction.deleted': 'Uma movimentação foi removida do histórico desta conta.',
    'workspace.created': 'Seu espaço financeiro foi criado e está pronto para uso.',
    'onboarding.completed': 'Sua configuração inicial foi concluída com sucesso.',
    'workspace.whatsapp.connected': 'Os alertas no WhatsApp desta conta foram ativados.',
    'workspace.whatsapp.disconnected': 'O envio de alertas no WhatsApp foi desativado.',
    'whatsapp.connect.requested': 'A solicitação de conexão foi aceita e aguarda confirmação real de entrega.',
    'whatsapp.connect.delivered': 'A mensagem de conexão foi entregue e o WhatsApp está validado.',
    'whatsapp.connect.failed': 'A conexão não foi confirmada pela Meta e precisa de uma nova tentativa.',
    'whatsapp.connect.welcome_failed': 'A mensagem inicial de conexão não foi aceita pela Meta.',
    'whatsapp.test.requested': 'Um teste foi enviado para validação e aguarda confirmação de entrega.',
    'whatsapp.test.delivered': 'O teste foi entregue com sucesso no número conectado.',
    'whatsapp.test.failed': 'O teste falhou após a aceitação inicial da Meta.',
    'whatsapp.connect.status_webhook': 'Recebemos uma atualização de status da tentativa de conexão.',
    'whatsapp.test.status_webhook': 'Recebemos uma atualização de status do teste enviado.',
    'whatsapp.status_webhook': 'Recebemos uma atualização de status do WhatsApp.',
    'whatsapp.disconnected': 'A integração do WhatsApp foi desconectada desta conta.',
    'stripe.checkout.created': 'O fluxo de assinatura foi iniciado e aguarda a sua confirmação.',
    'stripe.portal.created': 'A área de gerenciamento da assinatura foi aberta.',
    'stripe.customer.subscription.created': 'Sua assinatura foi criada e está sendo preparada para uso.',
    'stripe.customer.subscription.updated': 'Houve uma atualização recente na sua assinatura.',
    'stripe.customer.subscription.deleted': 'Sua assinatura foi encerrada nesta conta.',
    'stripe.invoice.paid': 'Recebemos a confirmação do pagamento da sua assinatura.',
    'stripe.invoice.payment_failed': 'A última tentativa de cobrança não foi concluída.',
    'ai.chat.used': 'Uma análise com IA foi gerada para esta conta.',
    'ai.classify.used': 'Uma classificação automática foi aplicada em uma movimentação.',
  };

  return messages[event.type] || 'Uma atualização recente foi registrada nesta conta.';
};

const getNotificationStorageKey = (userId: string, workspaceId: string) =>
  `cote-notifications:${userId}:${workspaceId}`;

const SIDEBAR_PREFERENCE_STORAGE_KEY = 'cote-sidebar-collapsed';

const formatEventTimestamp = (isoString: string) => {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return 'Agora';
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatSubscriptionDate = (isoString?: string | null) => {
  if (!isoString) return 'Sem cobrança futura definida';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return 'Sem cobrança futura definida';
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
};

const formatIsoDateShort = (isoString?: string | null) => {
  if (!isoString) return 'Sem data';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return 'Sem data';
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  });
};

const normalizePublicAppUrl = (value?: string | null) =>
  String(value || '')
    .trim()
    .replace(/\/+$/, '');

const getClientAppUrl = () => {
  const envUrl = normalizePublicAppUrl(process.env.NEXT_PUBLIC_APP_URL);
  if (envUrl) return envUrl;
  if (typeof window !== 'undefined') {
    return normalizePublicAppUrl(window.location.origin);
  }
  return '';
};

const buildClientRedirectUrl = (path: string) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const baseUrl = getClientAppUrl();
  return baseUrl ? `${baseUrl}${normalizedPath}` : normalizedPath;
};

const getCurrentMonthKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const isInCurrentMonth = (date: Date | null) => {
  if (!date) return false;
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
};

const normalizeCategoryLabel = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const mapAiCategoryToCategory = (rawCategory: string) => {
  const normalized = normalizeCategoryLabel(rawCategory);
  const normalizedMap = new Map(
    TRANSACTION_CATEGORIES.filter((category) => category !== 'Auto (IA)').map((category) => [
      normalizeCategoryLabel(category),
      category,
    ])
  );

  if (normalizedMap.has(normalized)) {
    return normalizedMap.get(normalized) as string;
  }

  if (normalized.includes('mercado') || normalized.includes('aliment')) return 'Alimentação';
  if (normalized.includes('transp')) return 'Transporte';
  if (normalized.includes('saud')) return 'Saúde';
  if (normalized.includes('educ')) return 'Educação';
  if (normalized.includes('lazer')) return 'Lazer';
  if (normalized.includes('morad') || normalized.includes('aluguel')) return 'Moradia';
  if (normalized.includes('salario')) return 'Salário';
  if (normalized.includes('freela')) return 'Freelance';
  if (normalized.includes('comiss')) return 'Comissão';
  if (normalized.includes('reemb')) return 'Reembolso';
  if (normalized.includes('vend')) return 'Vendas';
  if (normalized.includes('ads') || normalized.includes('marketing') || normalized.includes('trafego')) return 'Marketing';
  if (normalized.includes('invest')) return 'Investimentos';
  if (normalized.includes('pix')) return 'PIX';

  return 'Outros';
};

const parseTransactionDate = (value: string): Date | null => {
  if (!value) return null;

  const normalized = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

  const numericMatch = normalized.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);
  if (numericMatch) {
    const day = Number(numericMatch[1]);
    const monthIndex = Number(numericMatch[2]) - 1;
    const yearRaw = Number(numericMatch[3]);
    const year = yearRaw < 100 ? 2000 + yearRaw : yearRaw;
    const parsed = new Date(year, monthIndex, day);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const direct = new Date(value);
  if (!Number.isNaN(direct.getTime())) {
    return direct;
  }

  const cleanedText = normalized
    .replace(/\./g, ' ')
    .replace(/,/g, ' ')
    .replace(/\bde\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const match = cleanedText.match(/^(\d{1,2})\s+([a-z]{3,})\s+(\d{2,4})$/);
  if (!match) return null;

  const day = Number(match[1]);
  const monthKey = match[2].slice(0, 3);
  const yearRaw = Number(match[3]);

  const monthMap: Record<string, number> = {
    jan: 0,
    fev: 1,
    mar: 2,
    abr: 3,
    mai: 4,
    jun: 5,
    jul: 6,
    ago: 7,
    set: 8,
    out: 9,
    nov: 10,
    dez: 11,
  };

  if (!(monthKey in monthMap)) return null;

  const year = yearRaw < 100 ? 2000 + yearRaw : yearRaw;
  const parsed = new Date(year, monthMap[monthKey], day);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatTransactionDisplayDate = (value: unknown) => {
  const direct = new Date(String(value || ''));
  const parsed = Number.isNaN(direct.getTime()) ? parseTransactionDate(String(value || '')) : direct;
  if (!parsed) return '';
  return parsed.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' });
};

const formatTransactionDisplayAmount = (flowType: TransactionFlowType, amount: number) => {
  return `${getTransactionAmountSignal(mapFlowTypeToBaseType(flowType))}${formatCurrency(amount)}`;
};

const mapApiTransactionToClientTransaction = (tx: any): Transaction => {
  const flowType = mapBackendTypeToFlowType(String(tx?.type || ''));
  return {
    flowType,
    id: tx.id,
    date: formatTransactionDisplayDate(tx.date),
    rawDate: typeof tx?.date === 'string' ? tx.date : null,
    rawDueDate: typeof tx?.due_date === 'string' ? tx.due_date : null,
    desc: String(tx.description || ''),
    cat: tx.category?.name || 'Geral',
    amount: formatTransactionDisplayAmount(flowType, Number(tx.amount || 0)),
    rawAmount: Number(tx.amount || 0),
    type: mapFlowTypeToBaseType(flowType),
    status: String(tx?.status || 'CONFIRMED').toUpperCase(),
    originType: typeof tx?.origin_type === 'string' ? String(tx.origin_type).toUpperCase() : null,
    originId: typeof tx?.origin_id === 'string' ? tx.origin_id : null,
    paymentMethod: normalizePaymentMethodLabel(
      tx.payment_method || (tx.type === 'PIX_IN' || tx.type === 'PIX_OUT' ? 'PIX' : undefined)
    ),
    wallet: tx.wallet?.name || 'Carteira',
    destinationWallet: tx.destination_wallet?.name || null,
    receiptUrl: tx.receipt_url || null,
  };
};

const mapApiGoalToClientGoal = (g: any): Goal => ({
  id: g.id,
  name: g.name,
  target: Number(g.target_amount),
  current: Number(g.current_amount),
  category: g.category || 'Outros',
  deadline: g.deadline || null,
  icon: Wallet,
  color: 'text-[var(--positive)]',
});

const mapApiInvestmentToClientInvestment = (item: any): Investment => ({
  id: item.id,
  label: item.name,
  type: item.type || 'Outros',
  walletId: null,
  walletName: item.institution || 'Não informado',
  institution: item.institution || 'Não informado',
  invested: Number(item.invested_amount || 0),
  value: Number(item.current_amount || 0),
  expectedReturnAnnual: Number(item.expected_return_annual || 0),
  color: getInvestmentColor(item.type || 'Outros'),
});

const mapApiDebtToClientDebt = (item: any): Debt => ({
  id: item.id,
  creditor: item.creditor,
  originalAmount: Number(item.original_amount || 0),
  remainingAmount: Number(item.remaining_amount || 0),
  interestRateMonthly: Number(item.interest_rate_monthly || 0),
  dueDay: Number(item.due_day || 1),
  dueDate: item.due_date || null,
  category: item.category || 'Outros',
  status: mapLegacyDebtStatusToLabel(item.status) as Debt['status'],
});

const mapApiRecurringDebtToClientRecurringDebt = (item: any): RecurringDebt => ({
  id: item.id,
  creditor: item.creditor,
  amount: Number(item.amount || 0),
  category: item.category || 'Outros',
  frequency: String(item.frequency || 'MONTHLY').toUpperCase() as RecurringDebt['frequency'],
  interval: Number(item.interval || 1),
  startDate: item.start_date || new Date().toISOString(),
  endDate: item.end_date || null,
  dueDay: item.due_day === null || item.due_day === undefined ? null : Number(item.due_day),
  nextDueDate: item.next_due_date || new Date().toISOString(),
  status:
    String(item.status || '').toUpperCase() === 'PAUSED'
      ? 'Pausada'
      : String(item.status || '').toUpperCase() === 'ENDED'
        ? 'Encerrada'
        : 'Ativa',
  notes: item.notes || null,
  source: item.source === 'legacy_debt' ? 'legacy_debt' : 'recurring_debt',
  legacyDebtId: item.legacy_debt_id || null,
});

const mapApiProjectionToClientProjection = (projection: any): DashboardProjection | null => {
  if (!projection || typeof projection !== 'object') return null;
  return {
    asOfDate: String(projection.asOfDate || ''),
    currentBalance: Number(projection.currentBalance || 0),
    projectedBalance30d: Number(projection.projectedBalance30d || 0),
    projectedNegativeDate:
      typeof projection.projectedNegativeDate === 'string' ? projection.projectedNegativeDate : null,
    monthConfirmedIncome: Number(projection.monthConfirmedIncome || 0),
    monthConfirmedExpense: Number(projection.monthConfirmedExpense || 0),
    monthPlannedIncome: Number(projection.monthPlannedIncome || 0),
    monthPlannedExpense: Number(projection.monthPlannedExpense || 0),
    upcomingEventsCount14d: Number(projection.upcomingEventsCount14d || 0),
    nextCriticalDate: typeof projection.nextCriticalDate === 'string' ? projection.nextCriticalDate : null,
    updatedAt: String(projection.updatedAt || ''),
    daily: Array.isArray(projection.daily)
      ? projection.daily.map((row: any) => ({
          date: String(row.date || ''),
          openingBalance: Number(row.openingBalance || 0),
          inflowConfirmed: Number(row.inflowConfirmed || 0),
          outflowConfirmed: Number(row.outflowConfirmed || 0),
          inflowPlanned: Number(row.inflowPlanned || 0),
          outflowPlanned: Number(row.outflowPlanned || 0),
          closingBalance: Number(row.closingBalance || 0),
        }))
      : [],
  };
};

const mapApiDashboardCalendarReadModel = (payload: any): DashboardCalendarReadModel | null => {
  if (!payload || typeof payload !== 'object') return null;

  const upcomingPayload =
    payload.upcoming && typeof payload.upcoming === 'object' ? payload.upcoming : null;
  const summaryPayload =
    payload.summary && typeof payload.summary === 'object' ? payload.summary : null;
  const summaryCore =
    summaryPayload?.summary && typeof summaryPayload.summary === 'object'
      ? summaryPayload.summary
      : null;

  if (!upcomingPayload && !summaryPayload) return null;

  const upcomingEvents = Array.isArray(upcomingPayload?.items)
    ? upcomingPayload.items
        .map((item: any) => ({
          id: String(item?.id || item?.occurrenceKey || ''),
          title: String(item?.title || 'Evento financeiro'),
          date: String(item?.date || ''),
          status: String(item?.status || 'PENDING'),
          flow:
            item?.flow === 'in' || item?.flow === 'out' || item?.flow === 'neutral'
              ? item.flow
              : 'neutral',
          type: String(item?.type || ''),
          amount:
            item?.amount === null || item?.amount === undefined ? null : Number(item.amount || 0),
          sourceType:
            typeof item?.sourceType === 'string'
              ? item.sourceType
              : typeof item?.source_type === 'string'
                ? item.source_type
                : null,
        }))
        .filter((item: DashboardCalendarUpcomingItem) => item.id.length > 0)
    : [];

  return {
    periodFocusDate:
      typeof summaryPayload?.period?.focusDate === 'string' ? summaryPayload.period.focusDate : null,
    openingBalance: Number(summaryPayload?.openingBalance || 0),
    totalExpectedInflow: Number(summaryCore?.totalExpectedInflow || 0),
    totalExpectedOutflow: Number(summaryCore?.totalExpectedOutflow || 0),
    projectedBalance: Number(summaryCore?.projectedBalance || 0),
    overdueCount: Number(summaryCore?.overdueCount || 0),
    criticalDaysCount: Array.isArray(summaryPayload?.criticalDays)
      ? summaryPayload.criticalDays.length
      : 0,
    upcomingEvents,
  };
};

const sortTransactionsByNewest = (items: Transaction[]) =>
  [...items].sort((left, right) => {
    const leftTime = parseTransactionDate(left.date)?.getTime() || 0;
    const rightTime = parseTransactionDate(right.date)?.getTime() || 0;
    return rightTime - leftTime;
  });

const getTransactionBalanceDelta = (transaction: Pick<Transaction, 'type' | 'amount'>) => {
  const amount = parseCurrency(transaction.amount);
  if (transaction.type === 'income') return amount;
  if (transaction.type === 'expense') return -amount;
  return 0;
};

const isTransactionInCurrentMonth = (transaction: Pick<Transaction, 'date'>) =>
  isInCurrentMonth(parseTransactionDate(transaction.date));

const buildOptimisticTransaction = (
  formData: TransactionFormData,
  category: string,
  id: string | number
): Transaction => ({
  id,
  date: formatTransactionDisplayDate(formData.date),
  desc: formData.description.trim(),
  cat: category,
  amount: formatTransactionDisplayAmount(formData.flowType, parseMoneyInput(formData.amount)),
  type: mapFlowTypeToBaseType(formData.flowType),
  flowType: formData.flowType,
  paymentMethod: formData.paymentMethod,
  wallet: formData.wallet,
  destinationWallet: formData.flowType === 'Transferência' ? formData.destinationWallet || null : null,
  receiptUrl: formData.receiptUrl || null,
});

const renderInlineAssistantText = (text: string) => {
  return text
    .split(/(\*\*[^*]+\*\*)/g)
    .filter(Boolean)
    .map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={`assistant-strong-${index}`} className="font-semibold text-[var(--text-primary)]">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return <React.Fragment key={`assistant-text-${index}`}>{part}</React.Fragment>;
    });
};

const renderAssistantMessageText = (rawText: string) => {
  const normalizedText = rawText
    .replace(/\r\n?/g, '\n')
    .replace(/(\S)\s+(\d+\.\s)/g, '$1\n$2')
    .replace(/\s+\*\*Dica extra:\*\*/g, '\n\n**Dica extra:**');

  const lines = normalizedText.split('\n');

  return (
    <div className="space-y-1.5">
      {lines.map((line, lineIndex) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={`assistant-spacer-${lineIndex}`} className="h-1.5" />;
        }

        const orderedItem = trimmed.match(/^(\d+)\.\s+(.*)$/);
        if (orderedItem) {
          return (
            <div key={`assistant-item-${lineIndex}`} className="flex items-start gap-2">
              <span className="text-[var(--text-secondary)] font-bold">{orderedItem[1]}.</span>
              <p className="text-sm text-[var(--text-primary)] leading-relaxed break-words">
                {renderInlineAssistantText(orderedItem[2])}
              </p>
            </div>
          );
        }

        return (
          <p key={`assistant-line-${lineIndex}`} className="text-sm text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap break-words">
            {renderInlineAssistantText(trimmed)}
          </p>
        );
      })}
    </div>
  );
};

function decodeBase64ToBlob(base64: string, mimeType: string) {
  try {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return new Blob([bytes], { type: mimeType });
  } catch {
    return null;
  }
}

function blobToBase64(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Falha ao ler áudio gravado.'));
    reader.onloadend = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const [, base64] = result.split(',');
      if (!base64) {
        reject(new Error('Falha ao converter áudio.'));
        return;
      }
      resolve(base64);
    };
    reader.readAsDataURL(blob);
  });
}

function pickSupportedRecorderMimeType() {
  if (typeof MediaRecorder === 'undefined') return '';
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/ogg',
  ];

  for (const candidate of candidates) {
    if (MediaRecorder.isTypeSupported(candidate)) {
      return candidate;
    }
  }

  return '';
}

// --- Components ---

type AppErrorBoundaryState = {
  hasError: boolean;
};

class AppErrorBoundary extends React.Component<{ children: React.ReactNode }, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error('UI render error:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[var(--bg-app)] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-2xl p-6 text-center">
            <h2 className="page-title-premium mb-2 text-[var(--text-primary)]">Erro na interface</h2>
            <p className="text-sm text-[var(--text-secondary)] mb-5">
              Ocorreu uma falha inesperada de renderização. Recarregue a página para continuar.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-lg bg-[var(--primary)] text-[var(--text-primary)] text-sm font-bold hover:bg-[var(--primary-hover)] transition-colors"
            >
              Recarregar página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

type MoneyInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

type UserAvatarProps = {
  user?: any;
  displayName?: string | null;
  avatarUrl?: string | null;
  className?: string;
  fallbackClassName?: string;
  textClassName?: string;
};

const MoneyInput = ({
  value,
  onChange,
  placeholder = 'R$ 0,00',
  disabled = false,
  className = '',
}: MoneyInputProps) => {
  return (
    <input
      type="text"
      inputMode="numeric"
      value={value}
      onChange={(e) => onChange(maskMoneyInput(e.target.value))}
      placeholder={placeholder}
      disabled={disabled}
      className={className}
    />
  );
};

const UserAvatar = ({
  user,
  displayName,
  avatarUrl,
  className,
  fallbackClassName,
  textClassName,
}: UserAvatarProps) => {
  const resolvedDisplayName = displayName?.trim() || getUserDisplayName(user);
  const resolvedAvatarUrl = avatarUrl?.trim() || getUserAvatarUrl(user);
  const initials = resolvedDisplayName ? getInitialsFromName(resolvedDisplayName) : getUserInitials(user);
  const [imageFailed, setImageFailed] = React.useState(false);

  React.useEffect(() => {
    setImageFailed(false);
  }, [resolvedAvatarUrl]);

  return (
    <div className={cn('relative flex shrink-0 items-center justify-center overflow-hidden rounded-full', className)}>
      {resolvedAvatarUrl && !imageFailed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={resolvedAvatarUrl}
          alt={`Foto de perfil de ${resolvedDisplayName}`}
          className="h-full w-full object-cover"
          referrerPolicy="no-referrer"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <div
          className={cn(
            'flex h-full w-full items-center justify-center bg-[color:var(--primary-soft)] font-bold text-[var(--text-secondary)]',
            fallbackClassName,
            textClassName
          )}
        >
          {initials}
        </div>
      )}
    </div>
  );
};

type SidebarItemProps = {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  onClick?: () => void;
  collapsed?: boolean;
  badgeText?: string | null;
  locked?: boolean;
};

const SidebarItem = ({
  icon: Icon,
  label,
  active = false,
  onClick,
  collapsed = false,
  badgeText = null,
  locked = false,
}: SidebarItemProps) => (
  <button
    onClick={onClick}
    title={collapsed ? label : undefined}
    className={cn(
      'group flex w-full items-center gap-2 rounded-xl border border-transparent px-2.5 py-1.5 text-left transition-all duration-200',
      collapsed && 'justify-center px-2',
      active
        ? 'border-[color:var(--border-default)] bg-[color:var(--primary-soft)] text-[var(--text-primary)] shadow-[0_10px_24px_color-mix(in_srgb,var(--accent)_20%,transparent)]'
        : 'text-[var(--text-secondary)] hover:border-[var(--border-default)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]'
    )}
  >
    <Icon
      size={16}
      className={cn(active ? 'text-[var(--primary-hover)]' : 'text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]')}
    />
    {!collapsed && (
      <>
        <span className="text-[13px] font-medium">{label}</span>
        <span className="ml-auto flex items-center gap-1">
          {badgeText ? (
            <span className="rounded-full border border-[var(--border-default)] bg-[var(--bg-app)] px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-muted)]">
              {badgeText}
            </span>
          ) : null}
          {locked ? <Lock size={12} className="text-[var(--text-muted)]" /> : null}
        </span>
      </>
    )}
  </button>
);

type StatCardProps = {
  label: string;
  value: string;
  trend: string;
  trendValue: string;
  icon: LucideIcon;
  trendType?: 'up' | 'down';
};

const StatCard = ({
  label,
  value,
  trend,
  trendValue,
  icon: Icon,
  trendType = 'up',
}: StatCardProps) => {
  return (
    <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 sm:p-8 shadow-[var(--shadow-soft)]">
    <div className="mb-6 flex items-center justify-between">
      <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">{label}</span>
      <div className="rounded-full border border-[color:color-mix(in_srgb,var(--primary)_35%,transparent)] bg-[var(--primary-soft)] p-2.5 text-[var(--primary)] shadow-[var(--shadow-soft)]">
        <Icon size={17} />
      </div>
    </div>
    <div className="flex flex-col gap-3.5">
      <p className="text-[clamp(1.95rem,6.2vw,2.25rem)] font-bold tracking-[-0.03em] leading-none text-[var(--text-primary)]">{value}</p>
      <div className={cn('flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[13px] font-semibold', trendType === 'up' ? 'status-positive-premium' : 'status-negative-premium')}>
        {trendType === 'up' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
        <span>{trendValue}</span>
        <span className="ml-1 text-[12px] font-normal leading-5 text-[var(--text-secondary)]/90">{trend}</span>
      </div>
    </div>
  </div>
  );
};

// --- Views ---

type SubscriptionViewProps = {
  summary: SubscriptionOverview | null;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  onChangePlan: () => void;
  onCancel: () => void;
  onReactivate: () => void;
  onOpenPaymentMethod: () => void;
  onOpenBillingHistory: () => void;
  actionLoading: 'cancel' | 'reactivate' | 'payment' | 'history' | null;
};

const SubscriptionView = ({
  summary,
  isLoading,
  error,
  onRetry,
  onChangePlan,
  onCancel,
  onReactivate,
  onOpenPaymentMethod,
  onOpenBillingHistory,
  actionLoading,
}: SubscriptionViewProps) => {
  const statusTone =
    summary?.status === 'PENDING'
      ? 'border-[var(--border-default)] bg-[color:var(--danger-soft)] text-[var(--text-secondary)]'
      : summary?.status === 'CANCELED'
        ? 'border-[var(--border-default)] bg-[var(--bg-app)] text-[var(--danger)]'
        : summary?.status === 'TRIALING'
          ? 'border-[var(--border-default)] bg-[color:var(--primary-soft)] text-[var(--text-secondary)]'
          : 'border-[color:var(--border-default)] bg-[color:var(--primary-soft)] text-[var(--text-secondary)]';

  return (
    <div className="max-w-6xl space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[color:var(--border-default)] bg-[color:var(--primary-soft)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-[var(--text-secondary)]">
            <Sparkles size={14} />
            Billing interno
          </span>
          <div>
            <h3 className="text-2xl font-black text-[var(--text-primary)]">Minha assinatura</h3>
            <p className="text-sm text-[var(--text-secondary)]">
              Gerencie seu plano, cobrança e status da assinatura sem sair do Cote Finance AI.
            </p>
          </div>
        </div>
        <button
          onClick={onChangePlan}
          className="app-button-primary inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold"
        >
          <ArrowUpRight size={16} />
          {summary?.primaryActionLabel || 'Alterar plano'}
        </button>
      </div>

      {isLoading ? (
        <div className="app-surface-card rounded-[1.75rem] p-8 text-center">
          <p className="text-base font-semibold text-[var(--text-primary)]">Carregando assinatura...</p>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Estamos sincronizando o status da conta e a cobrança atual.
          </p>
        </div>
      ) : error ? (
        <div className="rounded-[1.75rem] border border-[var(--border-default)] bg-[var(--bg-app)] p-6">
          <p className="text-sm font-bold uppercase tracking-[0.24em] text-[var(--danger)]">Falha ao carregar</p>
          <p className="mt-3 text-sm text-[var(--text-primary)]">{error}</p>
          <button
            onClick={onRetry}
            className="mt-4 inline-flex items-center justify-center rounded-xl border border-[var(--border-default)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] transition hover:border-[var(--border-strong)] hover:bg-[var(--bg-surface)]/5"
          >
            Tentar novamente
          </button>
        </div>
      ) : summary ? (
        <>
          <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="app-surface-card space-y-4 rounded-[1.9rem] p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                  <span className={cn('inline-flex w-fit rounded-full border px-3 py-1 text-xs font-bold', statusTone)}>
                    {summary.statusLabel}
                  </span>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--text-muted)]">Plano atual</p>
                    <h4 className="mt-2 text-3xl font-black text-[var(--text-primary)]">{summary.planLabel}</h4>
                    <p className="mt-2 max-w-2xl text-sm text-[var(--text-secondary)]">{summary.statusMessage}</p>
                  </div>
                </div>
                <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-app)] px-4 py-3">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Próxima cobrança</p>
                  <p className="mt-2 text-lg font-semibold text-[var(--text-primary)]">{formatSubscriptionDate(summary.nextBillingDate)}</p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-app)] p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-[var(--text-muted)]">Status da assinatura</p>
                  <p className="mt-2 text-lg font-semibold text-[var(--text-primary)]">{summary.statusLabel}</p>
                </div>
                <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-app)] p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-[var(--text-muted)]">Cobrança</p>
                  <p className="mt-2 text-lg font-semibold text-[var(--text-primary)]">{summary.billingLabel}</p>
                </div>
                <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-app)] p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-[var(--text-muted)]">Conta vinculada</p>
                  <p className="mt-2 text-lg font-semibold text-[var(--text-primary)]">{summary.workspaceName}</p>
                </div>
              </div>
            </div>

            <div className="app-surface-card space-y-4 rounded-[1.9rem] p-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--text-muted)]">Resumo rápido</p>
                <h4 className="mt-2 text-xl font-black text-[var(--text-primary)]">Central de assinatura</h4>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  Tudo o que importa para esta conta fica visível aqui. Quando uma ação exigir a Stripe,
                  abrimos apenas a etapa necessária.
                </p>
              </div>

              <div className="space-y-3 rounded-[1.4rem] border border-[color:var(--border-default)] bg-[color:var(--primary-soft)] p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 size={18} className="mt-0.5 text-[var(--text-secondary)]" />
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">Pagamento seguro</p>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">
                      Seus dados continuam protegidos pela Stripe e sincronizados com a cobrança da conta.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CreditCard size={18} className="mt-0.5 text-[var(--text-secondary)]" />
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">Gestão sem sair do app</p>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">
                      Status, plano e próximas cobranças aparecem dentro do SaaS. Portal externo só quando preciso.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="app-surface-card rounded-[1.75rem] p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--text-muted)]">Recursos do plano</p>
                  <h4 className="mt-2 text-xl font-black text-[var(--text-primary)]">Benefícios ativos</h4>
                </div>
                <span className="rounded-full border border-[var(--border-default)] px-3 py-1 text-xs font-semibold text-[var(--text-secondary)]">
                  {summary.planLabel}
                </span>
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {summary.features.map((feature) => (
                  <div key={feature} className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-app)] p-4 text-sm text-[var(--text-primary)]">
                    {feature}
                  </div>
                ))}
              </div>
            </div>

            <div className="app-surface-card rounded-[1.75rem] p-6">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--text-muted)]">Ações disponíveis</p>
              <h4 className="mt-2 text-xl font-black text-[var(--text-primary)]">Gerenciar assinatura</h4>
              <div className="mt-5 space-y-3">
                <button
                  onClick={onChangePlan}
                  className="inline-flex w-full items-center justify-between rounded-2xl border border-[var(--border-default)] bg-[var(--bg-app)] px-4 py-3 text-left text-sm font-semibold text-[var(--text-primary)] transition hover:border-[color:var(--border-default)] hover:bg-[var(--bg-surface)]"
                >
                  <span>{summary.primaryActionLabel || 'Alterar plano'}</span>
                  <ArrowUpRight size={16} className="text-[var(--text-secondary)]" />
                </button>
                <button
                  onClick={onCancel}
                  disabled={!summary.canCancel || actionLoading !== null}
                  className="inline-flex w-full items-center justify-between rounded-2xl border border-[var(--border-default)] bg-[var(--bg-app)] px-4 py-3 text-left text-sm font-semibold text-[var(--text-primary)] transition hover:border-[var(--border-strong)] hover:bg-[var(--bg-surface)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span>{actionLoading === 'cancel' ? 'Cancelando...' : 'Cancelar assinatura'}</span>
                </button>
                <button
                  onClick={onReactivate}
                  disabled={!summary.canReactivate || actionLoading !== null}
                  className="inline-flex w-full items-center justify-between rounded-2xl border border-[var(--border-default)] bg-[var(--bg-app)] px-4 py-3 text-left text-sm font-semibold text-[var(--text-primary)] transition hover:border-[color:var(--border-default)] hover:bg-[var(--bg-surface)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span>{actionLoading === 'reactivate' ? 'Reativando...' : 'Reativar assinatura'}</span>
                </button>
                <button
                  onClick={onOpenPaymentMethod}
                  disabled={!summary.canManageBilling || actionLoading !== null}
                  className="inline-flex w-full items-center justify-between rounded-2xl border border-[var(--border-default)] bg-[var(--bg-app)] px-4 py-3 text-left text-sm font-semibold text-[var(--text-primary)] transition hover:border-[var(--border-strong)] hover:bg-[var(--bg-surface)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span>{actionLoading === 'payment' ? 'Abrindo...' : 'Atualizar forma de pagamento'}</span>
                  <ExternalLink size={16} className="text-[var(--text-secondary)]" />
                </button>
                <button
                  onClick={onOpenBillingHistory}
                  disabled={!summary.canManageBilling || actionLoading !== null}
                  className="inline-flex w-full items-center justify-between rounded-2xl border border-[var(--border-default)] bg-[var(--bg-app)] px-4 py-3 text-left text-sm font-semibold text-[var(--text-primary)] transition hover:border-[var(--border-strong)] hover:bg-[var(--bg-surface)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span>{actionLoading === 'history' ? 'Abrindo...' : 'Ver histórico de cobrança'}</span>
                  <ExternalLink size={16} className="text-[var(--text-secondary)]" />
                </button>
              </div>

              {summary.cancelAtPeriodEnd ? (
                <p className="mt-4 text-sm text-[var(--text-secondary)]">
                  O cancelamento está agendado para o fim do ciclo atual. Se quiser continuar com o plano, reative antes
                  da data de encerramento.
                </p>
              ) : null}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};

type DashboardViewProps = {
  overview: DashboardOverviewPayload | null;
  loading: boolean;
  error: string | null;
  currentPlan: SubscriptionPlan;
  goals: Goal[];
  wallets: WalletAccount[];
  investments: Investment[];
  onAddTransaction: () => void;
  onUpgrade: () => void;
  onOpenSummaryTarget: (target: 'balance' | 'income' | 'expense' | 'net') => void;
  onPeriodChange: (selection: DashboardPeriodSelection) => void;
  onOpenGoals: () => void;
  onOpenPortfolio: () => void;
  onOpenCreateGoal: () => void;
  onOpenCreateWallet: () => void;
  onOpenTransactions: () => void;
  onOpenTransactionDetail: (transaction: DashboardOverviewRecentTransaction) => void;
  onOpenAssistant: () => void;
  onSendAssistantPrompt: (prompt: string) => void;
};

const DashboardView = ({
  overview,
  loading,
  error,
  currentPlan,
  goals,
  wallets,
  investments,
  onAddTransaction,
  onUpgrade,
  onOpenSummaryTarget,
  onPeriodChange,
  onOpenGoals,
  onOpenPortfolio,
  onOpenCreateGoal,
  onOpenCreateWallet,
  onOpenTransactions,
  onOpenTransactionDetail,
  onOpenAssistant,
  onSendAssistantPrompt,
}: DashboardViewProps) => {
  return (
    <div className="space-y-4">
      {!loading && error ? (
        <div className="rounded-2xl border border-[color:color-mix(in_srgb,var(--danger)_40%,transparent)] bg-[color:color-mix(in_srgb,var(--danger)_10%,transparent)] px-4 py-3 text-sm text-[var(--text-primary)]">
          {error}
        </div>
      ) : null}
      <DashboardOverview
        overview={overview}
        loading={loading}
        currentPlan={currentPlan}
        goals={goals}
        wallets={wallets}
        investments={investments}
        onAddTransaction={onAddTransaction}
        onUpgrade={onUpgrade}
        period={overview?.period ?? null}
        onPeriodChange={onPeriodChange}
        onOpenSummaryTarget={onOpenSummaryTarget}
        onOpenGoals={onOpenGoals}
        onOpenPortfolio={onOpenPortfolio}
        onOpenCreateGoal={onOpenCreateGoal}
        onOpenCreateWallet={onOpenCreateWallet}
        onOpenTransactions={onOpenTransactions}
        onOpenTransactionDetail={onOpenTransactionDetail}
        onOpenAssistant={onOpenAssistant}
        onSendAssistantPrompt={onSendAssistantPrompt}
      />
    </div>
  );
};

type TransactionsViewProps = {
  transactions: Transaction[];
  onAddTransaction: () => void;
  onEditTransaction: (id: string | number) => void;
  onDeleteTransaction: (id: string | number) => void;
  initialFlowFilter?: TransactionFlowType | null;
};

const TransactionsView = ({
  transactions,
  onAddTransaction,
  onEditTransaction,
  onDeleteTransaction,
  initialFlowFilter = null,
}: TransactionsViewProps) => {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [typeFilter, setTypeFilter] = React.useState<'Todos' | TransactionFlowType>('Todos');

  React.useEffect(() => {
    if (!initialFlowFilter) return;
    setTypeFilter(initialFlowFilter);
  }, [initialFlowFilter]);

  const filteredTransactions = React.useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return transactions.filter((tx) => {
      const matchesSearch =
        !normalizedSearch ||
        tx.desc.toLowerCase().includes(normalizedSearch) ||
        tx.cat.toLowerCase().includes(normalizedSearch);

      const matchesType = typeFilter === 'Todos' || tx.flowType === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [transactions, searchTerm, typeFilter]);

  const totalIncome = transactions
    .filter((tx) => mapFlowTypeToBaseType(tx.flowType) === 'income')
    .reduce((acc, tx) => acc + parseCurrency(tx.amount), 0);

  const totalExpenses = transactions
    .filter((tx) => mapFlowTypeToBaseType(tx.flowType) === 'expense')
    .reduce((acc, tx) => acc + parseCurrency(tx.amount), 0);

  const balance = totalIncome - totalExpenses;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h3 className="page-title-premium text-[var(--text-primary)]">Transações</h3>
        <button
          onClick={onAddTransaction}
          className="app-button-primary inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-bold"
        >
          <Plus size={18} /> Nova Transação
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="app-surface-card rounded-2xl p-5">
          <p className="label-premium mb-2 text-[var(--text-muted)]">Entradas totais</p>
          <p className="text-2xl font-black text-[var(--positive)]">{formatCurrency(totalIncome)}</p>
        </div>
        <div className="app-surface-card rounded-2xl p-5">
          <p className="label-premium mb-2 text-[var(--text-muted)]">Saídas totais</p>
          <p className="text-2xl font-black text-[var(--danger)]">{formatCurrency(totalExpenses)}</p>
        </div>
        <div className="app-surface-card rounded-2xl p-5">
          <p className="label-premium mb-2 text-[var(--text-muted)]">Saldo</p>
          <p className={cn('text-2xl font-black', balance >= 0 ? 'text-[var(--positive)]' : 'text-[var(--danger)]')}>
            {formatCurrency(balance)}
          </p>
        </div>
      </div>

      <div className="app-surface-card rounded-2xl p-4 lg:p-5">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="lg:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por descrição"
              className="app-field w-full rounded-xl py-2 pl-10 pr-4 text-sm"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as 'Todos' | TransactionFlowType)}
            className="app-field w-full rounded-xl py-2 px-4 text-sm"
          >
            <option value="Todos">Todos os tipos</option>
            {TRANSACTION_FLOW_TYPES.map((flowType) => (
              <option key={flowType} value={flowType}>
                {flowType}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="lg:hidden space-y-4">
        {filteredTransactions.length === 0 && (
          <div className="app-surface-card rounded-2xl p-6 text-center text-[var(--text-muted)] text-sm">
            Nenhuma transação encontrada para os filtros atuais.
          </div>
        )}

        {filteredTransactions.map((tx) => {
          const baseType = mapFlowTypeToBaseType(tx.flowType);

          return (
            <div key={tx.id} className="app-surface-card rounded-2xl p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{tx.desc}</p>
                  <p className="text-xs text-[var(--text-muted)]">{tx.date}</p>
                </div>
                <p
                  className={cn(
                    'text-sm font-bold',
                    getBaseTypeColorClass(baseType)
                  )}
                >
                  {tx.amount}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    'px-2 py-1 rounded-md border text-[10px] font-bold uppercase tracking-wider',
                    getFlowTypeBadgeClass(tx.flowType)
                  )}
                >
                  {tx.flowType}
                </span>
                <span className="px-2 py-1 rounded-md bg-[var(--bg-surface-elevated)] text-[var(--text-secondary)] text-[10px] font-bold uppercase tracking-wider">
                  {tx.cat || 'Sem categoria'}
                </span>
                <span className="px-2 py-1 rounded-md bg-[var(--bg-surface-elevated)] text-[var(--text-secondary)] text-[10px] font-bold uppercase tracking-wider">
                  {getPaymentMethodIconLabel(tx.paymentMethod)}
                </span>
                <span className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-widest flex items-center gap-1">
                  <Wallet size={10} /> {tx.wallet}
                </span>
                {tx.flowType === 'Transferência' && tx.destinationWallet && (
                  <span className="text-[10px] text-[var(--text-secondary)]/80 font-bold uppercase tracking-widest">
                    ? {tx.destinationWallet}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => onEditTransaction(tx.id)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-[var(--bg-surface-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                >
                  <Pencil size={12} /> Editar
                </button>
                <button
                  onClick={() => onDeleteTransaction(tx.id)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-[var(--bg-app)] text-[var(--danger)] hover:bg-[var(--bg-surface)] transition-colors"
                >
                  <Trash2 size={12} /> Excluir
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="app-table-shell hidden lg:block rounded-2xl overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-[var(--border-default)] bg-[var(--bg-surface-elevated)]/30">
              <th className="px-6 py-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">Data</th>
              <th className="px-6 py-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">Descrição</th>
              <th className="px-6 py-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">Tipo</th>
              <th className="px-6 py-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">Categoria</th>
              <th className="px-6 py-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">Método</th>
              <th className="px-6 py-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">Carteira</th>
              <th className="px-6 py-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest text-right">Valor</th>
              <th className="px-6 py-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {filteredTransactions.length === 0 && (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-sm text-[var(--text-muted)]">
                  Nenhuma transação encontrada para os filtros atuais.
                </td>
              </tr>
            )}

            {filteredTransactions.map((tx) => {
              const baseType = mapFlowTypeToBaseType(tx.flowType);

              return (
                <tr key={tx.id} className="hover:bg-[var(--bg-surface-elevated)]/30 transition-colors group">
                  <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">{tx.date}</td>
                  <td className="px-6 py-4 text-sm font-medium text-[var(--text-primary)]">{tx.desc}</td>
                  <td className="px-6 py-4">
                    <span
                      className={cn(
                        'px-2 py-1 rounded-md border text-[10px] font-bold uppercase tracking-wider',
                        getFlowTypeBadgeClass(tx.flowType)
                      )}
                    >
                      {tx.flowType}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">{tx.cat || 'Sem categoria'}</td>
                  <td className="px-6 py-4 text-xs text-[var(--text-secondary)]">{tx.paymentMethod}</td>
                  <td className="px-6 py-4 text-xs text-[var(--text-secondary)]">
                    {tx.wallet}
                    {tx.flowType === 'Transferência' && tx.destinationWallet ? ` -> ${tx.destinationWallet}` : ''}
                  </td>
                  <td
                    className={cn(
                      'px-6 py-4 text-sm font-bold text-right',
                      getBaseTypeColorClass(baseType)
                    )}
                  >
                    {tx.amount}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => onEditTransaction(tx.id)}
                        className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                        title="Editar"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => onDeleteTransaction(tx.id)}
                        className="p-2 text-[var(--text-muted)] hover:text-[var(--danger)] transition-colors"
                        title="Excluir"
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
  );
};

type IntegrationsViewProps = {
  onUpgrade: (plan: string) => void;
  currentPlan: SubscriptionPlan;
  isWhatsAppConnected: boolean;
  isConnectingWhatsApp: boolean;
  isDisconnectingWhatsApp: boolean;
  isSendingWhatsAppTest: boolean;
  whatsAppPhoneNumber: string;
  whatsAppFeedback: WhatsAppFeedback;
  whatsAppDiagnostic: WhatsAppDiagnostic | null;
  onWhatsAppPhoneNumberChange: (value: string) => void;
  onConnectWhatsApp: () => void;
  onDisconnectWhatsApp: () => void;
  onSendWhatsAppTest: () => void;
};

const IntegrationsView = ({
  onUpgrade,
  currentPlan,
  isWhatsAppConnected,
  isConnectingWhatsApp,
  isDisconnectingWhatsApp,
  isSendingWhatsAppTest,
  whatsAppPhoneNumber,
  whatsAppFeedback,
  whatsAppDiagnostic,
  onWhatsAppPhoneNumberChange,
  onConnectWhatsApp,
  onDisconnectWhatsApp,
  onSendWhatsAppTest,
}: IntegrationsViewProps) => {
  const [billingCycle, setBillingCycle] = React.useState<'monthly' | 'annually'>('monthly');
  const hasWhatsAppAccess = currentPlan === 'PRO' || currentPlan === 'PREMIUM';
  const connectionState = whatsAppDiagnostic?.connectionState;
  const connectionLabel = getWhatsAppConnectionLabel(connectionState, isWhatsAppConnected, isConnectingWhatsApp);
  const primaryActionLabel = getWhatsAppPrimaryActionLabel(connectionState, isWhatsAppConnected, isConnectingWhatsApp);
  const connectionTone = getWhatsAppConnectionTone(connectionState, isWhatsAppConnected, isConnectingWhatsApp);
  const connectionDescription = getWhatsAppConnectionDescription(connectionState, isWhatsAppConnected, whatsAppDiagnostic?.lastErrorMessage);
  const linkedPhoneNumber = whatsAppDiagnostic?.numeroConectado || (whatsAppPhoneNumber.trim() ? whatsAppPhoneNumber : null);
  const normalizedLinkedPhone = normalizePhoneDigits(linkedPhoneNumber);
  const normalizedInputPhone = normalizePhoneDigits(whatsAppPhoneNumber);
  const isEditingAnotherNumber =
    Boolean(normalizedInputPhone) &&
    Boolean(normalizedLinkedPhone) &&
    normalizedInputPhone !== normalizedLinkedPhone;
  const isConnectionConfirmed = connectionState === 'connected' || isWhatsAppConnected;
  const canDisconnectWhatsApp =
    !isDisconnectingWhatsApp &&
    !isConnectingWhatsApp &&
    (connectionState === 'connected' ||
      connectionState === 'connecting' ||
      connectionState === 'failed' ||
      Boolean(normalizedLinkedPhone));
  const canSendWhatsAppTest =
    isConnectionConfirmed &&
    Boolean(whatsAppPhoneNumber.trim()) &&
    !isSendingWhatsAppTest &&
    !isDisconnectingWhatsApp &&
    !isConnectingWhatsApp;
  const canConnectWhatsApp =
    Boolean(whatsAppPhoneNumber.trim()) &&
    !isConnectingWhatsApp &&
    !isDisconnectingWhatsApp &&
    connectionState !== 'connecting' &&
    (connectionState !== 'connected' || isEditingAnotherNumber);
  const nextActionLabel =
    connectionState === 'connected' && !isEditingAnotherNumber
      ? 'Testar envio'
      : connectionState === 'connecting'
        ? 'Aguardar confirmação'
        : connectionState === 'failed'
          ? 'Revisar número e tentar novamente'
          : 'Informar número e conectar';
  const lastAttemptLabel = whatsAppDiagnostic?.lastValidatedAt
    ? formatEventTimestamp(whatsAppDiagnostic.lastValidatedAt)
    : 'Ainda não registrada';
  const lastTestLabel = whatsAppDiagnostic?.lastTestSentAt
    ? formatEventTimestamp(whatsAppDiagnostic.lastTestSentAt)
    : 'Nenhum teste confirmado';
  const lastErrorLabel =
    whatsAppDiagnostic?.lastErrorMessage ||
    (connectionState === 'failed' ? connectionDescription : 'Nenhum erro registrado');

  const plans = [
    {
      name: 'Pro',
      monthlyPrice: 29,
      annualPrice: 290,
      features: [
        'Lançamentos ilimitados',
        'Relatórios completos e gráficos avançados',
        'Até 500 interações com IA por mês',
        'Insights financeiros automáticos',
        'Metas ilimitadas',
        'Investimentos',
        'Alertas e resumos no WhatsApp',
        'Suporte por e-mail',
      ],
    },
    {
      name: 'Premium',
      monthlyPrice: 49,
      annualPrice: 490,
      features: [
        'Tudo do Pro',
        'IA financeira sem limite mensal',
        'Insights financeiros avançados',
        'Previsões de saldo e alertas inteligentes',
        'Planejamento estratégico',
        'Automação financeira no WhatsApp',
        'Suporte por e-mail',
      ],
    },
  ];

  const feedbackToneClass =
    whatsAppFeedback?.tone === 'success'
      ? 'border-[color:var(--border-default)] bg-[var(--whatsapp-soft)] text-[var(--whatsapp)]'
      : whatsAppFeedback?.tone === 'info'
      ? 'border-[color:var(--border-default)] bg-[color:var(--primary-soft)] text-[var(--text-primary)]'
      : whatsAppFeedback?.tone === 'error'
      ? 'border-[var(--border-default)] bg-[var(--bg-app)] text-[var(--danger)]'
      : 'border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)]';

  return (
    <div
      className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500"
      id="whatsapp-integration"
    >
      {!hasWhatsAppAccess ? (
      <div className="flex flex-col items-center space-y-6">
        <div className="app-surface-subtle flex items-center rounded-xl p-1">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={cn(
              'rounded-lg px-6 py-2 text-sm font-bold transition-all',
              billingCycle === 'monthly' ? 'bg-[var(--primary)] text-[var(--text-primary)] shadow-lg shadow-[color:var(--primary-soft)]' : 'text-[var(--text-secondary)]'
            )}
          >
            Mensal
          </button>
          <button
            onClick={() => setBillingCycle('annually')}
            className={cn(
              'rounded-lg px-6 py-2 text-sm font-bold transition-all',
              billingCycle === 'annually' ? 'bg-[var(--primary)] text-[var(--text-primary)] shadow-lg shadow-[color:var(--primary-soft)]' : 'text-[var(--text-secondary)]'
            )}
          >
            Anual <span className="ml-1 text-[10px] opacity-70">(2 meses grátis)</span>
          </button>
        </div>

        <div className="grid w-full max-w-4xl grid-cols-1 gap-6 md:grid-cols-2">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className="app-surface-card relative rounded-3xl p-8 transition-all duration-300 hover:border-[var(--border-default)]"
            >
              <h3 className="mb-2 page-title-premium text-[var(--text-primary)]">{plan.name}</h3>
              <div className="mb-6 flex items-baseline gap-1">
                <span className="text-4xl font-black text-[var(--text-primary)]">
                  R$ {billingCycle === 'monthly' ? plan.monthlyPrice : plan.annualPrice}
                </span>
                <span className="text-sm text-[var(--text-muted)]">/{billingCycle === 'monthly' ? 'mês' : 'ano'}</span>
              </div>
              <button
                onClick={() => onUpgrade(`${plan.name} ${billingCycle === 'monthly' ? 'Mensal' : 'Anual'}`)}
                className="app-button-primary mb-8 w-full rounded-2xl py-4 font-bold"
              >
                Escolher {plan.name}
              </button>
              <ul className="space-y-4">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-3 text-sm text-[var(--text-secondary)]">
                    <CheckCircle2 size={16} className="text-[var(--text-secondary)]" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      ) : null}

      <div className="app-surface-card rounded-3xl p-6 lg:p-8">
        <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-[var(--whatsapp-soft)] p-3 text-[var(--whatsapp)]">
              <MessageSquare size={24} />
            </div>
            <div>
              <h3 className="page-title-premium text-[var(--text-primary)]">WhatsApp</h3>
              <p className="text-sm text-[var(--text-muted)]">Conecte um número e acompanhe a entrega real das mensagens</p>
            </div>
          </div>
          <div
            className={cn(
              'flex items-center gap-2 self-start rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest lg:self-center',
              hasWhatsAppAccess
                ? connectionTone === 'success'
                  ? 'bg-[var(--whatsapp-soft)] text-[var(--whatsapp)]'
                  : connectionTone === 'warning'
                    ? 'bg-[color:var(--primary-soft)] text-[var(--primary)]'
                    : connectionTone === 'error'
                      ? 'bg-[var(--bg-app)] text-[var(--danger)]'
                      : 'bg-[var(--bg-surface-elevated)] text-[var(--text-secondary)]'
                : 'bg-[color:var(--danger-soft)] text-[var(--text-secondary)]'
            )}
          >
            <div
              className={cn(
                'size-1.5 rounded-full animate-pulse',
                hasWhatsAppAccess
                  ? connectionTone === 'success'
                    ? 'bg-[var(--whatsapp)]'
                    : connectionTone === 'warning'
                      ? 'bg-[var(--primary)]'
                      : connectionTone === 'error'
                        ? 'bg-[var(--danger)]'
                        : 'bg-[var(--bg-surface-elevated)]'
                  : 'bg-[color:var(--danger-soft)]'
              )}
            />
            {hasWhatsAppAccess ? connectionLabel : 'Disponível no Pro'}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
          <div className="space-y-6">
            {!hasWhatsAppAccess ? (
              <div className="app-surface-subtle space-y-5 rounded-3xl p-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border-default)] bg-[color:var(--primary-soft)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                  Recurso Pro
                </div>
                <p className="leading-relaxed text-[var(--text-secondary)]">
                  Alertas e resumos no WhatsApp ficam disponíveis a partir do plano Pro. Use esse canal para receber
                  lembretes financeiros e acompanhar o que merece atenção sem abrir o app.
                </p>
                <ul className="space-y-3 text-sm text-[var(--text-secondary)]">
                  {[
                    'Resumo diário com saldo, entradas e saídas',
                    'Alertas de vencimentos e compromissos próximos',
                    'Teste de envio e configuração por conta',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <CheckCircle2 size={16} className="mt-0.5 text-[var(--text-secondary)]" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => onUpgrade(`Pro ${billingCycle === 'monthly' ? 'Mensal' : 'Anual'}`)}
                  className="app-button-primary inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-bold"
                >
                  Liberar WhatsApp no Pro
                </button>
              </div>
            ) : (
              <>
                <p className="leading-relaxed text-[var(--text-secondary)]">
                  Informe seu número, valide a conexão e libere o teste apenas após a confirmação real de entrega.
                </p>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">
                      Número do WhatsApp
                    </label>
                    <input
                      type="tel"
                      value={whatsAppPhoneNumber}
                      onChange={(e) => onWhatsAppPhoneNumberChange(e.target.value)}
                      placeholder="+55 (11) 99999-9999"
                      className="app-field w-full rounded-xl px-4 py-3"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">
                      Status da conexão
                    </label>
                    <div className="flex min-h-[52px] items-center rounded-xl border border-[var(--border-default)] bg-[var(--bg-app)] px-4 text-sm text-[var(--text-secondary)]">
                      {connectionDescription}
                    </div>
                  </div>
                </div>

                {whatsAppFeedback && (
                  <div className={cn('rounded-2xl border px-4 py-3', feedbackToneClass)}>
                    <p className="text-sm font-bold">{whatsAppFeedback.title}</p>
                    <p className="mt-1 text-sm leading-relaxed opacity-90">{whatsAppFeedback.message}</p>
                  </div>
                )}

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {[
                    { label: 'Número vinculado', value: linkedPhoneNumber || 'Nenhum número salvo' },
                    { label: 'Status atual', value: connectionLabel },
                    { label: 'Última tentativa', value: lastAttemptLabel },
                    { label: 'Último teste', value: lastTestLabel },
                    { label: 'Último erro', value: lastErrorLabel },
                    { label: 'Ação disponível', value: nextActionLabel },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="app-surface-subtle rounded-2xl border border-[var(--border-default)] px-4 py-3"
                    >
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-muted)]">
                        {item.label}
                      </p>
                      <p className="mt-2 text-sm leading-relaxed text-[var(--text-primary)]">{item.value}</p>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col gap-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <button
                      onClick={onConnectWhatsApp}
                      disabled={!canConnectWhatsApp}
                      className={cn(
                        'flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold transition-all shadow-lg',
                        !canConnectWhatsApp
                          ? 'cursor-not-allowed bg-[var(--bg-surface-elevated)] text-[var(--text-muted)]'
                          : 'bg-[var(--primary)] text-[var(--text-primary)] shadow-[color:var(--primary-soft)] hover:bg-[var(--primary-hover)] active:bg-[var(--primary-active)]'
                      )}
                    >
                      {connectionState === 'connected' && isEditingAnotherNumber ? 'Conectar' : primaryActionLabel}
                    </button>

                    {connectionState === 'disconnected' || connectionState === 'idle' ? (
                      <div className="flex items-center justify-center rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] px-5 py-3 text-sm font-bold text-[var(--text-muted)]">
                        Desconectado
                      </div>
                    ) : (
                      <button
                        onClick={onDisconnectWhatsApp}
                        disabled={!canDisconnectWhatsApp}
                        className={cn(
                          'flex items-center justify-center gap-2 rounded-xl border px-5 py-3 text-sm font-bold transition-all',
                          !canDisconnectWhatsApp
                            ? 'cursor-not-allowed border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-muted)]'
                            : 'border-[color:var(--danger-soft)] bg-[var(--bg-app)] text-[var(--danger)] hover:border-[var(--danger)]'
                        )}
                      >
                        {isDisconnectingWhatsApp ? 'Desconectando...' : 'Desconectar'}
                      </button>
                    )}

                    <button
                      onClick={onSendWhatsAppTest}
                      disabled={!canSendWhatsAppTest}
                      className={cn(
                        'flex items-center justify-center gap-2 rounded-xl border px-5 py-3 text-sm font-bold transition-all',
                        !canSendWhatsAppTest
                          ? 'cursor-not-allowed border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-muted)]'
                          : 'border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:border-[color:var(--border-default)] hover:text-[var(--text-primary)]'
                      )}
                    >
                      {isSendingWhatsAppTest ? 'Enviando teste...' : 'Testar envio'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="app-surface-card rounded-3xl p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-[var(--text-muted)]">WhatsApp</p>
                <h4 className="mt-2 card-title-premium text-[var(--text-primary)]">Como o resumo aparece no celular</h4>
              </div>
              <span
                className={cn(
                  'rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em]',
                  connectionTone === 'success'
                    ? 'bg-[var(--whatsapp-soft)] text-[var(--whatsapp)]'
                    : connectionTone === 'warning'
                    ? 'bg-[color:var(--primary-soft)] text-[var(--primary)]'
                    : connectionTone === 'error'
                    ? 'bg-[var(--bg-app)] text-[var(--danger)]'
                    : 'bg-[var(--bg-surface-elevated)] text-[var(--text-secondary)]'
                )}
              >
                {connectionLabel}
              </span>
            </div>

            <div className="app-surface-subtle space-y-4 rounded-3xl p-4">
              <div className="ml-auto max-w-[90%] rounded-2xl bg-[var(--primary)] px-4 py-3 text-sm leading-relaxed text-[var(--text-primary)] shadow-lg shadow-black/10">
                Quais alertas vou receber no WhatsApp?
              </div>
              <div className="max-w-[90%] rounded-2xl bg-[var(--bg-surface-elevated)] px-4 py-3 text-sm leading-relaxed text-[var(--text-primary)] shadow-lg shadow-black/10">
                Resumo diário com saldo, entradas, saídas, próximos vencimentos e insights práticos para agir mais rápido.
              </div>
              <div className="max-w-[90%] rounded-2xl bg-[var(--bg-surface-elevated)] px-4 py-3 text-sm leading-relaxed text-[var(--text-primary)] shadow-lg shadow-black/10">
                Exemplo: <span className="font-semibold text-[var(--text-primary)]">Maior gasto do mês</span>, contas próximas do vencimento e um resumo do que merece atenção no caixa.
              </div>
            </div>

            <p className="mt-4 text-xs leading-relaxed text-[var(--text-muted)]">
              Depois da confirmação de entrega, a conta passa a receber um resumo automático diário, e o teste manual fica liberado.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

type AgendaViewProps = {
  bills: Bill[];
};

const AgendaView = ({ bills }: AgendaViewProps) => {
  const upcomingBills = bills.filter((bill) => bill.status !== 'paid');
  const overdueCount = upcomingBills.filter((bill) => bill.status === 'overdue').length;
  const nextSevenDays = upcomingBills.filter((bill) => (bill.daysUntil ?? 99) <= 7);
  const totalScheduled = upcomingBills.reduce((acc, bill) => acc + bill.amount, 0);

  const groupedBills = [
    {
      key: 'urgent',
      title: 'Mais próximos',
      items: upcomingBills.filter((bill) => (bill.daysUntil ?? 99) <= 7),
    },
    {
      key: 'later',
      title: 'Próximos 30 dias',
      items: upcomingBills.filter((bill) => (bill.daysUntil ?? 99) > 7),
    },
  ].filter((group) => group.items.length > 0);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-black uppercase tracking-[0.28em] text-[var(--text-secondary)]/80">
            Agenda financeira
          </p>
          <h3 className="text-2xl font-black text-[var(--text-primary)]">Próximos compromissos do seu caixa</h3>
          <p className="max-w-2xl text-sm leading-relaxed text-[var(--text-secondary)]">
            Veja o que vence primeiro, o que merece atenção nesta semana e quanto do seu
            caixa já está comprometido nos próximos 30 dias.
          </p>
        </div>
        <div className="app-surface-subtle inline-flex items-center gap-2 self-start rounded-2xl px-4 py-2 text-sm font-semibold text-[var(--text-secondary)]">
          <Calendar size={16} className="text-[var(--text-secondary)]" />
          Próximos 30 dias
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          {
            label: 'Itens em aberto',
            value: upcomingBills.length,
            helper: overdueCount > 0 ? `${overdueCount} em atraso` : 'Tudo dentro do prazo',
          },
          {
            label: 'Próximos 7 dias',
            value: nextSevenDays.length,
            helper:
              nextSevenDays.length > 0
                ? formatCurrency(nextSevenDays.reduce((acc, bill) => acc + bill.amount, 0))
                : 'Nenhum vencimento crítico',
          },
          {
            label: 'Total programado',
            value: formatCurrency(totalScheduled),
            helper: 'Valores previstos na agenda',
          },
        ].map((card) => (
          <div
            key={card.label}
            className="app-surface-card rounded-3xl p-5"
          >
            <p className="text-xs font-black uppercase tracking-[0.24em] text-[var(--text-muted)]">{card.label}</p>
            <p className="mt-3 text-2xl font-black text-[var(--text-primary)]">{card.value}</p>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">{card.helper}</p>
          </div>
        ))}
      </div>

      {upcomingBills.length === 0 ? (
        <div className="app-surface-card rounded-3xl border-dashed border-[var(--border-default)] p-10 text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-[color:var(--primary-soft)] text-[var(--text-secondary)]">
            <Calendar size={26} />
          </div>
          <h4 className="card-title-premium text-[var(--text-primary)]">Sua agenda está limpa por enquanto</h4>
          <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
            Adicione dívidas com vencimento ou metas com prazo para acompanhar compromissos sem
            perder o timing do seu caixa.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {groupedBills.map((group) => (
            <section key={group.key} className="app-surface-card rounded-3xl p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h4 className="card-title-premium text-[var(--text-primary)]">{group.title}</h4>
                  <p className="text-sm text-[var(--text-secondary)]">
                    {group.items.length} {group.items.length === 1 ? 'item' : 'itens'} programados
                  </p>
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                {group.items.map((bill) => (
                  <article
                    key={bill.id}
                    className="app-surface-subtle rounded-2xl p-4 transition-all hover:border-[var(--border-default)] hover:bg-[var(--bg-surface)]"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div
                          className={cn(
                            'mt-0.5 flex size-11 items-center justify-center rounded-2xl',
                            bill.bg,
                            bill.color
                          )}
                        >
                          <bill.icon size={18} />
                        </div>
                        <div className="space-y-1">
                          <p className="text-base font-bold text-[var(--text-primary)]">{bill.label}</p>
                          <p className="text-sm text-[var(--text-secondary)]">{bill.helperText}</p>
                          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs font-semibold text-[var(--text-secondary)]">
                            <span className="rounded-full border border-[var(--border-default)] px-2.5 py-1">
                              {bill.date}
                            </span>
                            <span
                              className={cn(
                                'rounded-full px-2.5 py-1 font-black uppercase tracking-[0.14em]',
                                bill.status === 'overdue'
                                  ? 'bg-[var(--bg-app)] text-[var(--danger)]'
                                  : 'bg-[color:var(--danger-soft)] text-[var(--text-secondary)]'
                              )}
                            >
                              {bill.status === 'overdue'
                                ? 'Atrasado'
                                : (bill.daysUntil ?? 0) === 0
                                ? 'Hoje'
                                : `${bill.daysUntil}d`}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="card-title-premium text-[var(--text-primary)]">{formatCurrency(bill.amount)}</p>
                        <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                          {bill.kind === 'goal' ? 'Meta' : 'Conta'}
                        </p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
};

type DebtsViewProps = {
  debts: Debt[];
  recurringDebts: RecurringDebt[];
  transactions: Transaction[];
  dashboardProjection: DashboardProjection | null;
  onAddDebt: () => void;
  onAddRecurringDebt: (category?: string) => void;
  onDuplicateRecurringDebt: (id: string | number) => void;
  onEditDebt: (id: string | number) => void;
  onRegisterDebtPayment: (id: string | number, amount: number, paymentDate: string) => Promise<void> | void;
  onSettleDebt: (id: string | number) => Promise<void> | void;
  onReopenDebt: (id: string | number) => Promise<void> | void;
  onDeleteDebt: (id: string | number) => void;
  onEditRecurringDebt: (id: string | number) => void;
  onToggleRecurringDebtStatus: (id: string | number) => Promise<void> | void;
  onDeleteRecurringDebt: (id: string | number) => void;
  feedbackMessage?: string | null;
  onDismissFeedback?: () => void;
};
const DebtsView = ({
  debts,
  recurringDebts,
  transactions,
  dashboardProjection,
  onAddDebt,
  onAddRecurringDebt,
  onDuplicateRecurringDebt,
  onEditDebt,
  onRegisterDebtPayment,
  onSettleDebt,
  onReopenDebt,
  onDeleteDebt,
  onEditRecurringDebt,
  onToggleRecurringDebtStatus,
  onDeleteRecurringDebt,
  feedbackMessage = null,
  onDismissFeedback,
}: DebtsViewProps) => {
  type DebtGroupKey = 'overdue' | 'today' | 'next7' | 'thisMonth' | 'future' | 'settled';
  type DebtFilterKey = 'all' | DebtGroupKey;
  type DebtViewMode = 'list' | 'timeline' | 'calendar';
  type RecurringFilterKey = 'all' | 'active' | 'paused' | 'next7' | 'next30';
  const [activeDebtTab, setActiveDebtTab] = React.useState<'single' | 'recurring'>(() =>
    debts.length === 0 && recurringDebts.length > 0 ? 'recurring' : 'single'
  );
  const [debtFilter, setDebtFilter] = React.useState<DebtFilterKey>('all');
  const [debtViewMode, setDebtViewMode] = React.useState<DebtViewMode>('timeline');
  const [recurringFilter, setRecurringFilter] = React.useState<RecurringFilterKey>('all');
  const [isCreateChooserOpen, setIsCreateChooserOpen] = React.useState(false);
  const [paymentTargetDebtId, setPaymentTargetDebtId] = React.useState<string | number | null>(null);
  const [paymentAmount, setPaymentAmount] = React.useState('');
  const [paymentDate, setPaymentDate] = React.useState(toInputDateValue(new Date()));
  const [isSubmittingPayment, setIsSubmittingPayment] = React.useState(false);
  const [paymentError, setPaymentError] = React.useState<string | null>(null);
  const [debtDetailId, setDebtDetailId] = React.useState<string | number | null>(null);
  const now = startOfDay(new Date());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const totalOriginal = debts.reduce((acc, debt) => acc + debt.originalAmount, 0);
  const totalRemaining = debts.reduce((acc, debt) => acc + debt.remainingAmount, 0);
  const totalPaid = Math.max(0, totalOriginal - totalRemaining);
  const progress = totalOriginal > 0 ? (totalPaid / totalOriginal) * 100 : 0;
  const openDebts = debts.filter((debt) => debt.remainingAmount > 0);
  const overdueDebts = openDebts.filter((debt) => getAgendaDayDiff(getDebtDueDateValue(debt, now), now) < 0);
  const activeRecurringDebts = recurringDebts.filter((debt) => debt.status === 'Ativa');
  const getRecurringMonthlyEquivalent = (debt: RecurringDebt) => {
    const interval = Math.max(1, debt.interval || 1);
    if (debt.frequency === 'WEEKLY') return (debt.amount * 52) / 12 / interval;
    if (debt.frequency === 'YEARLY') return debt.amount / (12 * interval);
    if (debt.frequency === 'QUARTERLY') return debt.amount / (3 * interval);
    return debt.amount / interval;
  };
  const recurringMonthlyTotal = activeRecurringDebts.reduce((acc, debt) => acc + getRecurringMonthlyEquivalent(debt), 0);
  const nextRecurringCharge = [...activeRecurringDebts].sort(
    (left, right) => new Date(left.nextDueDate).getTime() - new Date(right.nextDueDate).getTime()
  )[0] ?? null;
  const recurringImpact30d = activeRecurringDebts.reduce((acc, debt) => {
    const nextDue = parseInputDateValue(String(debt.nextDueDate || '').slice(0, 10));
    if (!nextDue) return acc;
    const daysUntil = getAgendaDayDiff(nextDue, now);
    if (debt.frequency === 'WEEKLY') {
      if (daysUntil > 30) return acc;
      const everyDays = Math.max(1, debt.interval || 1) * 7;
      const occurrences = 1 + Math.floor(Math.max(0, 30 - Math.max(0, daysUntil)) / everyDays);
      return acc + debt.amount * Math.max(1, occurrences);
    }
    if (nextDue <= new Date(now.getFullYear(), now.getMonth(), now.getDate() + 30)) {
      return acc + debt.amount;
    }
    return acc;
  }, 0);
  const debtPaymentTransactions = transactions.filter(
    (tx) =>
      tx.originType === 'DEBT' &&
      tx.originId?.startsWith('debt-payment:') &&
      (tx.status || 'CONFIRMED') === 'CONFIRMED'
  );
  const paidThisMonth = debtPaymentTransactions.reduce((acc, tx) => {
    const paymentDateValue = tx.rawDate ? new Date(tx.rawDate) : null;
    if (!paymentDateValue || Number.isNaN(paymentDateValue.getTime())) return acc;
    if (paymentDateValue >= monthStart && paymentDateValue < nextMonthStart) {
      return acc + Math.max(0, Number(tx.rawAmount || 0));
    }
    return acc;
  }, 0);
  const nextDebtDue = [...openDebts].sort((left, right) => {
    const leftDue = parseInputDateValue(left.dueDate ?? null) ?? getDebtDueDateValue(left, now);
    const rightDue = parseInputDateValue(right.dueDate ?? null) ?? getDebtDueDateValue(right, now);
    return leftDue.getTime() - rightDue.getTime();
  })[0] ?? null;
  const totalOverdueAmount = overdueDebts.reduce((acc, debt) => acc + Math.max(0, debt.remainingAmount), 0);
  const monthlyExpenseBase = Math.max(
    1,
    Number(dashboardProjection?.monthConfirmedExpense || 0) + Number(dashboardProjection?.monthPlannedExpense || 0)
  );
  const overallProgress =
    openDebts.length > 0
      ? openDebts.reduce((acc, debt) => acc + Math.max(0, Math.min(100, ((debt.originalAmount - debt.remainingAmount) / Math.max(1, debt.originalAmount)) * 100)), 0) / openDebts.length
      : progress;
  const paymentTargetDebt = paymentTargetDebtId === null ? null : debts.find((debt) => debt.id === paymentTargetDebtId) ?? null;
  const parsedPaymentAmount = parseMoneyInput(paymentAmount);
  const paymentAmountInvalid =
    parsedPaymentAmount <= 0 ||
    (paymentTargetDebt ? parsedPaymentAmount > Math.max(0, paymentTargetDebt.remainingAmount) : false);
  const debtPaymentTransactionsByDebt = React.useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const tx of debtPaymentTransactions) {
      const match = /^debt-payment:([^:]+):/.exec(String(tx.originId || ''));
      if (!match) continue;
      const key = String(match[1]);
      const current = map.get(key);
      if (current) current.push(tx);
      else map.set(key, [tx]);
    }
    return map;
  }, [debtPaymentTransactions]);
  const getDebtPayments = (debtId: string | number) => debtPaymentTransactionsByDebt.get(String(debtId)) ?? [];
  const getDebtPriority = (debt: Debt) => {
    const dueDate = parseInputDateValue(debt.dueDate ?? null) ?? getDebtDueDateValue(debt, now);
    const daysUntil = getAgendaDayDiff(dueDate, now);
    const isOverdue = debt.remainingAmount > 0 && daysUntil < 0;
    const weight = (Math.max(0, debt.remainingAmount) / Math.max(1, monthlyExpenseBase)) * 100;
    const hasNoPaymentHistory = getDebtPayments(debt.id).length === 0;
    const overduePenalty = isOverdue ? Math.min(45, Math.abs(daysUntil) * 4) : 0;
    const score =
      (isOverdue ? 90 : 0) +
      overduePenalty +
      (daysUntil <= 3 && debt.remainingAmount > 0 ? 60 : 0) +
      (weight >= 25 ? 45 : weight >= 15 ? 25 : 0) +
      ((debt.interestRateMonthly || 0) >= 4 ? 20 : 0) +
      (hasNoPaymentHistory && debt.remainingAmount > 0 ? 15 : 0);
    if (score >= 130) return 'Crítica' as const;
    if (score >= 80) return 'Alta' as const;
    if (score >= 45) return 'Média' as const;
    return 'Controlada' as const;
  };
  const getDebtPriorityTone = (priority: 'Crítica' | 'Alta' | 'Média' | 'Controlada') => {
    if (priority === 'Crítica') return 'badge-danger';
    if (priority === 'Alta') return 'badge-warning';
    if (priority === 'Média') return 'badge-info';
    return 'badge-neutral';
  };
  const getDebtStatusMeta = (debt: Debt) => {
    const dueDate = parseInputDateValue(debt.dueDate ?? null) ?? getDebtDueDateValue(debt, now);
    const daysUntil = getAgendaDayDiff(dueDate, now);
    const paidAmount = Math.max(0, debt.originalAmount - debt.remainingAmount);
    const progressPercent = debt.originalAmount > 0 ? (paidAmount / Math.max(1, debt.originalAmount)) * 100 : 0;
    if (debt.remainingAmount <= 0) {
      return {
        label: 'Quitada',
        badgeTone: 'badge-success',
        accentTone: 'bg-[var(--positive)]',
        progressTone: 'bg-[var(--positive)]',
      };
    }
    if (daysUntil < 0) {
      return {
        label: 'Vencida',
        badgeTone: 'badge-danger',
        accentTone: 'bg-[var(--danger)]',
        progressTone: 'bg-[var(--danger)]',
      };
    }
    if (daysUntil <= 3) {
      return {
        label: 'Vence em breve',
        badgeTone: 'badge-warning',
        accentTone: 'bg-[var(--warning)]',
        progressTone: 'bg-[var(--warning)]',
      };
    }
    if (progressPercent > 0) {
      return {
        label: 'Parcialmente controlada',
        badgeTone: 'badge-goal',
        accentTone: 'bg-[var(--goal)]',
        progressTone: 'bg-[var(--goal)]',
      };
    }
    return {
      label: 'Ativa em dia',
      badgeTone: 'badge-info',
      accentTone: 'bg-[var(--info)]',
      progressTone: 'bg-[var(--info)]',
    };
  };
  const getDebtMiniSummary = (debt: Debt) => {
    const debtPayments = getDebtPayments(debt.id);
    if (debtPayments.length === 0 && debt.remainingAmount > 0) return 'Você ainda não registrou nenhum pagamento.';
    const lastPayment = debtPayments
      .map((tx) => (tx.rawDate ? new Date(tx.rawDate) : null))
      .filter((date): date is Date => Boolean(date) && !Number.isNaN(date!.getTime()))
      .sort((left, right) => right.getTime() - left.getTime())[0];
    if (lastPayment) {
      return `Último pagamento há ${Math.max(0, getAgendaDayDiff(now, startOfDay(lastPayment)))} dias.`;
    }
    if (debt.status === 'Parcelada' && debtPayments.length > 0) {
      const averagePayment = Math.max(1, debtPayments.reduce((acc, tx) => acc + Number(tx.rawAmount || 0), 0) / debtPayments.length);
      const estimatedInstallments = Math.max(1, Math.ceil(Math.max(0, debt.remainingAmount) / averagePayment));
      return `Estimativa: faltam ${estimatedInstallments} parcelas no ritmo atual.`;
    }
    const share = (Math.max(0, debt.remainingAmount) / Math.max(1, monthlyExpenseBase)) * 100;
    return `Essa dívida representa ${share.toFixed(0)}% das saidas previstas do mês.`;
  };
  const getDebtStatusTone = (status: Debt['status']) => {
    if (status === 'Quitada') return 'badge-success';
    if (status === 'Atrasada') return 'badge-danger';
    if (status === 'Parcelada') return 'badge-goal';
    return 'badge-info';
  };
  const getRecurringStatusTone = (status: RecurringDebt['status']) => {
    if (status === 'Ativa') return 'badge-info';
    if (status === 'Pausada') return 'badge-warning';
    return 'badge-neutral';
  };
  const getDebtGroupKey = (debt: Debt): DebtGroupKey => {
    if (debt.remainingAmount <= 0) return 'settled';
    const dueDate = getDebtDueDateValue(debt, now);
    const daysUntil = getAgendaDayDiff(dueDate, now);
    if (daysUntil < 0) return 'overdue';
    if (daysUntil === 0) return 'today';
    if (daysUntil <= 7) return 'next7';
    if (dueDate.getMonth() === now.getMonth() && dueDate.getFullYear() === now.getFullYear()) return 'thisMonth';
    return 'future';
  };
  const debtGroupOrder: DebtGroupKey[] = ['overdue', 'today', 'next7', 'thisMonth', 'future', 'settled'];
  const debtGroupLabels: Record<DebtGroupKey, string> = {
    overdue: 'Atrasadas',
    today: 'Vencem hoje',
    next7: 'Próximos 7 dias',
    thisMonth: 'Este mês',
    future: 'Futuras',
    settled: 'Quitadas',
  };
  const debtGroupTones: Record<DebtGroupKey, string> = {
    overdue: 'badge-danger',
    today: 'badge-warning',
    next7: 'badge-warning',
    thisMonth: 'badge-info',
    future: 'badge-neutral',
    settled: 'badge-success',
  };
  const sortedDebtsByPriority = [...debts].sort((left, right) => {
    const leftPriority = getDebtPriority(left);
    const rightPriority = getDebtPriority(right);
    const priorityWeight: Record<string, number> = { Crítica: 4, Alta: 3, Média: 2, Controlada: 1 };
    const diff = (priorityWeight[rightPriority] || 0) - (priorityWeight[leftPriority] || 0);
    if (diff !== 0) return diff;
    return getDebtDueDateValue(left, now).getTime() - getDebtDueDateValue(right, now).getTime();
  });
  const debtsByGroup = sortedDebtsByPriority.reduce<Record<DebtGroupKey, Debt[]>>(
    (acc, debt) => {
      const key = getDebtGroupKey(debt);
      acc[key].push(debt);
      return acc;
    },
    {
      overdue: [],
      today: [],
      next7: [],
      thisMonth: [],
      future: [],
      settled: [],
    }
  );
  const debtFilterOptions: Array<{ key: DebtFilterKey; label: string; count: number }> = [
    { key: 'all', label: 'Todas', count: sortedDebtsByPriority.length },
    ...debtGroupOrder.map((key) => ({ key, label: debtGroupLabels[key], count: debtsByGroup[key].length })),
  ];
  const visibleDebtGroups =
    debtFilter === 'all'
      ? debtGroupOrder.filter((key) => debtsByGroup[key].length > 0)
      : debtsByGroup[debtFilter].length > 0
        ? [debtFilter]
        : [];
  const parseRecurringDueDate = (value: string) => parseInputDateValue(String(value || '').slice(0, 10)) ?? new Date(value);
  const shiftRecurringDate = (baseDate: Date, debt: RecurringDebt, direction: 1 | -1) => {
    const interval = Math.max(1, debt.interval || 1) * direction;
    if (debt.frequency === 'WEEKLY') return new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + interval * 7);
    if (debt.frequency === 'MONTHLY') return new Date(baseDate.getFullYear(), baseDate.getMonth() + interval, baseDate.getDate());
    if (debt.frequency === 'QUARTERLY') return new Date(baseDate.getFullYear(), baseDate.getMonth() + interval * 3, baseDate.getDate());
    return new Date(baseDate.getFullYear() + interval, baseDate.getMonth(), baseDate.getDate());
  };
  const recurringTransactions = transactions
    .filter((tx) => String(tx.originType || '').toUpperCase() === 'RECURRING_DEBT')
    .sort((left, right) => new Date(String(right.rawDate || '')).getTime() - new Date(String(left.rawDate || '')).getTime());
  const sortedRecurringDebts = [...recurringDebts].sort(
    (left, right) => parseRecurringDueDate(left.nextDueDate).getTime() - parseRecurringDueDate(right.nextDueDate).getTime()
  );
  const recurringFilterOptions: Array<{ key: RecurringFilterKey; label: string; count: number }> = [
    { key: 'all', label: 'Todas', count: sortedRecurringDebts.length },
    { key: 'active', label: 'Ativas', count: sortedRecurringDebts.filter((debt) => debt.status === 'Ativa').length },
    { key: 'next7', label: 'Próximos 7 dias', count: sortedRecurringDebts.filter((debt) => debt.status === 'Ativa' && getAgendaDayDiff(parseRecurringDueDate(debt.nextDueDate), now) <= 7).length },
    { key: 'next30', label: 'Próximos 30 dias', count: sortedRecurringDebts.filter((debt) => debt.status === 'Ativa' && getAgendaDayDiff(parseRecurringDueDate(debt.nextDueDate), now) <= 30).length },
    { key: 'paused', label: 'Pausadas', count: sortedRecurringDebts.filter((debt) => debt.status === 'Pausada').length },
  ];
  const filteredRecurringDebts = sortedRecurringDebts.filter((debt) => {
    const daysUntil = getAgendaDayDiff(parseRecurringDueDate(debt.nextDueDate), now);
    if (recurringFilter === 'active') return debt.status === 'Ativa';
    if (recurringFilter === 'paused') return debt.status === 'Pausada';
    if (recurringFilter === 'next7') return debt.status === 'Ativa' && daysUntil <= 7;
    if (recurringFilter === 'next30') return debt.status === 'Ativa' && daysUntil <= 30;
    return true;
  });
  const summaryCards =
    activeDebtTab === 'single'
      ? [
          {
            label: 'Total em aberto',
            value: formatCurrency(totalRemaining),
            helper: `${openDebts.length} dívida(s) ativa(s)`,
            valueTone: 'text-[var(--text-primary)]',
            dotTone: 'bg-[var(--accent)]',
          },
          {
            label: 'Total vencido',
            value: formatCurrency(totalOverdueAmount),
            helper: overdueDebts.length > 0 ? `${overdueDebts.length} em atraso` : 'Sem atraso no momento',
            valueTone: 'text-[var(--danger)]',
            dotTone: 'bg-[var(--danger)]',
          },
          {
            label: 'Próximo vencimento',
            value: nextDebtDue ? formatDebtDueDateLabel(nextDebtDue) : 'Sem vencimento',
            helper: nextDebtDue ? `${nextDebtDue.creditor} - ${formatCurrency(nextDebtDue.remainingAmount)}` : 'Nenhuma dívida em aberto',
            valueTone: 'text-[var(--warning)]',
            dotTone: 'bg-[var(--warning)]',
          },
          {
            label: 'Quitado no mês',
            value: formatCurrency(paidThisMonth),
            helper: 'Pagamentos confirmados no ledger',
            valueTone: 'text-[var(--success)]',
            dotTone: 'bg-[var(--success)]',
          },
        ]
      : [
          {
            label: 'Compromisso mensal',
            value: formatCurrency(recurringMonthlyTotal),
            helper: `${activeRecurringDebts.length} recorrência(s) ativa(s)`,
            valueTone: 'text-[var(--text-primary)]',
            dotTone: 'bg-[var(--accent)]',
          },
          {
            label: 'Próxima cobrança',
            value: nextRecurringCharge ? new Date(nextRecurringCharge.nextDueDate).toLocaleDateString('pt-BR') : 'Sem cobrança',
            helper: nextRecurringCharge ? `${nextRecurringCharge.creditor} • ${formatCurrency(nextRecurringCharge.amount)}` : 'Nenhuma recorrência ativa',
            valueTone: 'text-[var(--warning)]',
            dotTone: 'bg-[var(--warning)]',
          },
          {
            label: 'Recorrências ativas',
            value: String(activeRecurringDebts.length),
            helper: `${sortedRecurringDebts.filter((debt) => debt.status === 'Pausada').length} pausada(s)`,
            valueTone: 'text-[var(--info)]',
            dotTone: 'bg-[var(--info)]',
          },
          {
            label: 'Impacto 30 dias',
            value: formatCurrency(recurringImpact30d),
            helper: 'Cobranças previstas no próximo ciclo',
            valueTone: 'text-[var(--goal)]',
            dotTone: 'bg-[var(--goal)]',
          },
        ];
  const openSingleDebtFlow = () => {
    setIsCreateChooserOpen(false);
    onAddDebt();
  };
  const openRecurringDebtFlow = (category?: string) => {
    setIsCreateChooserOpen(false);
    onAddRecurringDebt(category);
  };
  const openPaymentFlow = (debtId: string | number, remainingAmount: number) => {
    setPaymentTargetDebtId(debtId);
    setPaymentAmount(formatMoneyInput(Math.max(0, remainingAmount)));
    setPaymentDate(toInputDateValue(new Date()));
    setPaymentError(null);
  };
  const closePaymentFlow = () => {
    if (isSubmittingPayment) return;
    setPaymentTargetDebtId(null);
    setPaymentAmount('');
    setPaymentError(null);
  };
  const handleSubmitPayment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!paymentTargetDebt || isSubmittingPayment || paymentAmountInvalid) return;
    setIsSubmittingPayment(true);
    setPaymentError(null);
    try {
      await onRegisterDebtPayment(paymentTargetDebt.id, parsedPaymentAmount, paymentDate);
      closePaymentFlow();
    } catch (error) {
      setPaymentError(error instanceof Error ? error.message : 'Falha ao registrar pagamento.');
    } finally {
      setIsSubmittingPayment(false);
    }
  };
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <section className="rounded-3xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 shadow-[var(--shadow-card)] lg:p-7">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.28em] text-[var(--text-secondary)]/80">Centro de obrigações</p>
              <h3 className="mt-2 text-3xl font-black tracking-tight text-[var(--text-primary)]">
                {activeDebtTab === 'single' ? 'Controle de dívidas' : 'Controle de contas fixas'}
              </h3>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">
                Leitura rápida do que está vencido, do que vence primeiro e do impacto real no seu orçamento.
              </p>
            </div>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row xl:flex-col">
            <button
              onClick={() => setIsCreateChooserOpen(true)}
              className="app-button-primary inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-black sm:w-auto"
            >
              <Plus size={16} /> Nova obrigação
            </button>
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => (
            <div key={card.label} className="app-surface-subtle rounded-2xl p-4">
              <div className="flex items-center gap-2">
                <span className={cn('inline-flex size-2 rounded-full', card.dotTone)} />
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--text-muted)]">{card.label}</p>
              </div>
              <p className={cn('mt-2 text-2xl font-black tracking-tight', card.valueTone)}>{card.value}</p>
              <p className="mt-2 text-xs leading-6 text-[var(--text-secondary)]">{card.helper}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-[var(--text-muted)]">
          Pagamentos e recorrências desta tela alimentam transações, dashboard, gráfico e saldo projetado.
        </p>
      </section>
      {feedbackMessage ? (
        <div className="flex items-start justify-between gap-3 rounded-2xl border border-[color:var(--border-default)] bg-[color:var(--primary-soft)] px-4 py-3 text-sm text-[var(--text-secondary)]">
          <div>
            <p className="font-bold">{feedbackMessage}</p>
            <p className="mt-1 text-[var(--text-secondary)]/80">Sua área de dívidas foi atualizada com sucesso.</p>
          </div>
          {onDismissFeedback ? (
            <button onClick={onDismissFeedback} className="text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]">
              <X size={16} />
            </button>
          ) : null}
        </div>
      ) : null}
      <div className="inline-flex w-full rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-1 sm:w-auto">
        <button
          type="button"
          onClick={() => setActiveDebtTab('single')}
          className={cn(
            'flex-1 rounded-xl px-4 py-3 text-sm font-bold transition-all sm:flex-none',
            activeDebtTab === 'single'
              ? 'bg-[var(--primary)] text-[var(--text-primary)] shadow-[0_10px_24px_color-mix(in_srgb,var(--accent)_24%,transparent)]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          )}
        >
          Dívidas
        </button>
        <button
          type="button"
          onClick={() => setActiveDebtTab('recurring')}
          className={cn(
            'flex-1 rounded-xl px-4 py-3 text-sm font-bold transition-all sm:flex-none',
            activeDebtTab === 'recurring'
              ? 'bg-[var(--primary)] text-[var(--text-primary)] shadow-[0_10px_24px_color-mix(in_srgb,var(--accent)_24%,transparent)]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          )}
        >
          Contas fixas
        </button>
      </div>
      {activeDebtTab === 'single' ? (
        <section className="space-y-5 rounded-3xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 shadow-[var(--shadow-card)]">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[var(--text-muted)]">Dívidas</p>
              <h4 className="mt-2 text-2xl font-black text-[var(--text-primary)]">Obrigações com começo, meio e fim</h4>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">
                Ordenadas por prioridade automática para você agir primeiro no que mais ameaça seu orçamento.
              </p>
            </div>
            <div className="inline-flex rounded-xl border border-[var(--border-default)] bg-[var(--bg-app)] p-1">
              {([
                { key: 'timeline', label: 'Timeline' },
                { key: 'list', label: 'Lista' },
                { key: 'calendar', label: 'Calendário' },
              ] as Array<{ key: DebtViewMode; label: string }>).map((view) => (
                <button
                  key={view.key}
                  type="button"
                  onClick={() => setDebtViewMode(view.key)}
                  className={cn(
                    'rounded-lg px-3 py-2 text-xs font-bold transition-colors',
                    debtViewMode === view.key
                      ? 'bg-[var(--primary)] text-[var(--text-primary)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  )}
                >
                  {view.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {debtFilterOptions.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setDebtFilter(item.key)}
                className={cn(
                  'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] transition-colors',
                  debtFilter === item.key
                    ? 'border-[color:var(--accent)] bg-[color:var(--accent-soft)] text-[var(--accent)]'
                    : 'border-[var(--border-default)] bg-[var(--bg-app)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                )}
              >
                {item.label}
                <span className="rounded-full bg-[var(--bg-surface)] px-1.5 py-0.5 text-[10px] font-black text-[var(--text-secondary)]">
                  {item.count}
                </span>
              </button>
            ))}
          </div>
          {debts.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-[var(--border-default)] bg-[var(--bg-app)] p-10 text-center">
              <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-[color:var(--primary-soft)] text-[var(--text-secondary)]">
                <Wallet size={26} />
              </div>
              <h5 className="text-xl font-black text-[var(--text-primary)]">Você ainda não cadastrou nenhuma dívida.</h5>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-[var(--text-secondary)]">
                Adicione uma dívida para começar a ter controle completo do seu dinheiro. Sem cadastrar suas dívidas, você não consegue ver para onde seu dinheiro está indo.
              </p>
              <button
                onClick={openSingleDebtFlow}
                className="app-button-primary mt-5 inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-black"
              >
                <Plus size={16} /> Adicionar primeira dívida
              </button>
            </div>
          ) : debtViewMode === 'calendar' ? (
            <div className="rounded-3xl border border-dashed border-[var(--border-default)] bg-[var(--bg-app)] p-8 text-center">
              <p className="text-lg font-black text-[var(--text-primary)]">Visão calendário em evolução</p>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                Enquanto isso, use Lista ou Timeline para priorizar pagamentos por vencimento.
              </p>
            </div>
          ) : visibleDebtGroups.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-[var(--border-default)] bg-[var(--bg-app)] p-8 text-center">
              <p className="text-lg font-black text-[var(--text-primary)]">Nenhuma dívida neste filtro</p>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">Ajuste o agrupamento para continuar a leitura.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {visibleDebtGroups.map((group) => (
                <div key={group} className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn('rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em]', debtGroupTones[group])}>
                      {debtGroupLabels[group]}
                    </span>
                    <p className="text-xs text-[var(--text-secondary)]">
                      {debtsByGroup[group].length} item(ns) - {formatCurrency(debtsByGroup[group].reduce((acc, debt) => acc + Math.max(0, debt.remainingAmount), 0))}
                    </p>
                  </div>
                  <div className={cn('grid gap-4', debtViewMode === 'list' ? 'xl:grid-cols-2' : 'grid-cols-1')}>
                    {debtsByGroup[group].map((debt) => {
                      const paidAmount = Math.max(0, debt.originalAmount - debt.remainingAmount);
                      const debtProgress =
                        debt.originalAmount > 0 ? Math.max(0, Math.min(100, (paidAmount / debt.originalAmount) * 100)) : 0;
                      const isDebtSettled = debt.remainingAmount <= 0;
                      const statusMeta = getDebtStatusMeta(debt);
                      const monthlyImpactPercent = ((Math.max(0, debt.remainingAmount) / Math.max(1, monthlyExpenseBase)) * 100).toFixed(0);
                      return (
                        <article
                          key={debt.id}
                          className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-app)] p-5 transition-colors hover:border-[var(--border-strong)]"
                        >
                          <div className="space-y-4">
                            <div className="flex flex-wrap items-center gap-2">
                              <h5 className="card-title-premium text-[var(--text-primary)]">{debt.creditor}</h5>
                              <span className={cn('rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em]', statusMeta.badgeTone)}>
                                {statusMeta.label}
                              </span>
                              <span className={cn('rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em]', getDebtPriorityTone(getDebtPriority(debt)))}>
                                Prioridade {getDebtPriority(debt)}
                              </span>
                            </div>
                            <p className="text-sm text-[var(--text-secondary)]">{debt.category}</p>
                            <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Próximo vencimento: {formatDebtDueDateLabel(debt)}</p>
                            <div className="grid gap-3 sm:grid-cols-3">
                              <div>
                                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--text-muted)]">Valor total</p>
                                <p className="mt-1 text-base font-bold text-[var(--text-primary)]">{formatCurrency(debt.originalAmount)}</p>
                              </div>
                              <div>
                                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--text-muted)]">Quitado</p>
                                <p className="mt-1 text-base font-bold text-[var(--text-secondary)]">{formatCurrency(paidAmount)}</p>
                              </div>
                              <div>
                                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--text-muted)]">Restante</p>
                                <p className="mt-1 text-base font-bold text-[var(--text-primary)]">{formatCurrency(debt.remainingAmount)}</p>
                              </div>
                            </div>
                            {debt.originalAmount > 0 ? (
                              <div>
                                <div className="mb-2 flex items-center justify-between text-xs text-[var(--text-secondary)]">
                                  <span>{debtProgress.toFixed(1)}% quitado</span>
                                  <span>{formatCurrency(paidAmount)} / {formatCurrency(debt.originalAmount)}</span>
                                </div>
                                <div className="h-2 rounded-full bg-[var(--bg-surface-elevated)]">
                                  <div className={cn('h-2 rounded-full transition-all', statusMeta.progressTone)} style={{ width: `${Math.min(debtProgress, 100)}%` }} />
                                </div>
                              </div>
                            ) : (
                              <p className="text-xs text-[var(--text-muted)]">Aguardando definição do valor total.</p>
                            )}
                            <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)]/70 p-3">
                              <p className="text-xs font-semibold text-[var(--text-primary)]">{getDebtMiniSummary(debt)}</p>
                              <p className="mt-2 text-xs text-[var(--text-secondary)]">Esta obrigação representa {monthlyImpactPercent}% das obrigações do mês.</p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              {!isDebtSettled ? (
                                <button onClick={() => openPaymentFlow(debt.id, debt.remainingAmount)} className="app-button-primary inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-bold">
                                  Registrar pagamento
                                </button>
                              ) : null}
                              <button onClick={() => onEditDebt(debt.id)} className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-2 text-xs font-bold text-[var(--text-primary)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]">
                                <Pencil size={12} /> Editar
                              </button>
                              {!isDebtSettled ? (
                                <button onClick={() => void onSettleDebt(debt.id)} className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-default)] bg-[color:var(--primary-soft)] px-3 py-2 text-xs font-bold text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)]">
                                  Quitar
                                </button>
                              ) : (
                                <button onClick={() => void onReopenDebt(debt.id)} className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-2 text-xs font-bold text-[var(--text-primary)] transition-colors hover:border-[var(--border-strong)]">
                                  Reabrir
                                </button>
                              )}
                              <button onClick={() => setDebtDetailId(debt.id)} className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-2 text-xs font-bold text-[var(--text-primary)] transition-colors hover:border-[var(--border-strong)]">
                                Ver histórico
                              </button>
                              <button onClick={() => onDeleteDebt(debt.id)} className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-default)] bg-[var(--bg-app)] px-3 py-2 text-xs font-bold text-[var(--danger)] transition-colors hover:bg-[var(--bg-surface)]">
                                <Trash2 size={12} /> Excluir
                              </button>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : (
        <section className="space-y-5 rounded-3xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 shadow-[var(--shadow-card)]">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[var(--text-muted)]">Contas fixas</p>
              <h4 className="mt-2 text-2xl font-black text-[var(--text-primary)]">Contas que se repetem automaticamente</h4>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">
                Use para mensalidades, aluguel, assinaturas e qualquer compromisso fixo com frequência definida.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {recurringFilterOptions.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setRecurringFilter(item.key)}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] transition-colors',
                    recurringFilter === item.key
                      ? 'border-[color:var(--accent)] bg-[color:var(--accent-soft)] text-[var(--accent)]'
                      : 'border-[var(--border-default)] bg-[var(--bg-app)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  )}
                >
                  {item.label}
                  <span className="rounded-full bg-[var(--bg-surface)] px-1.5 py-0.5 text-[10px] font-black text-[var(--text-secondary)]">
                    {item.count}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--text-muted)]">Atalhos rápidos</p>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">Escolha uma conta fixa comum e acelere seu cadastro.</p>
              </div>
              <button
                onClick={() => openRecurringDebtFlow()}
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-app)] px-4 py-2 text-xs font-black text-[var(--text-primary)] transition-colors hover:border-[var(--border-strong)]"
              >
                <Plus size={14} /> Nova conta fixa
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {RECURRING_DEBT_PRESETS.map((preset) => (
                <button
                  key={preset.category}
                  type="button"
                  onClick={() => openRecurringDebtFlow(preset.category)}
                  className="app-surface-subtle rounded-2xl p-4 text-left transition-all hover:border-[color:var(--border-default)] hover:bg-[var(--bg-surface)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-[var(--text-primary)]">{preset.title}</p>
                      <p className="mt-2 text-xs leading-6 text-[var(--text-secondary)]">{preset.description}</p>
                    </div>
                    <span className="rounded-full bg-[color:var(--primary-soft)] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                      Sugestão
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
          {recurringDebts.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-[var(--border-default)] bg-[var(--bg-app)] p-10 text-center">
              <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-[color:var(--primary-soft)] text-[var(--text-secondary)]">
                <Calendar size={26} />
              </div>
              <h5 className="text-xl font-black text-[var(--text-primary)]">Você ainda não cadastrou contas fixas.</h5>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-[var(--text-secondary)]">
                Cadastre contas fixas para enxergar seu compromisso mensal e saber o que vence primeiro.
              </p>
              <button
                onClick={() => openRecurringDebtFlow()}
                className="app-button-primary mt-5 inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-black"
              >
                <Plus size={16} /> Adicionar primeira conta fixa
              </button>
            </div>
          ) : filteredRecurringDebts.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-[var(--border-default)] bg-[var(--bg-app)] p-8 text-center">
              <p className="text-lg font-black text-[var(--text-primary)]">Nenhuma recorrência nesse filtro</p>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">Ajuste os filtros para continuar a leitura operacional.</p>
            </div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {filteredRecurringDebts.map((debt) => {
                const nextDue = parseRecurringDueDate(debt.nextDueDate);
                const previousCycle = shiftRecurringDate(nextDue, debt, -1);
                const nextCycle = shiftRecurringDate(nextDue, debt, 1);
                const monthlyImpact = getRecurringMonthlyEquivalent(debt);
                const monthlyImpactShare = ((monthlyImpact / Math.max(1, monthlyExpenseBase)) * 100).toFixed(0);
                const relatedLedger = recurringTransactions.filter(
                  (tx) =>
                    String(tx.originId || '').includes(String(debt.id)) ||
                    String(tx.desc || '').toLowerCase().includes(debt.creditor.toLowerCase())
                );
                const lastGeneratedAt = relatedLedger[0]?.rawDate ? new Date(relatedLedger[0].rawDate) : null;
                return (
                  <article key={debt.id} className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-app)] p-5 transition-colors hover:border-[var(--border-default)]">
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <h5 className="card-title-premium text-[var(--text-primary)]">{debt.creditor}</h5>
                        <span className="rounded-full border border-[var(--border-default)] bg-[var(--bg-surface-elevated)]/70 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-primary)]">
                          {debt.category}
                        </span>
                        <span className="rounded-full border border-[color:var(--border-default)] bg-[color:var(--primary-soft)] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                          {getRecurringDebtFrequencyLabel(debt.frequency)}
                        </span>
                        <span className={cn('rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em]', getRecurringStatusTone(debt.status))}>
                          {debt.status}
                        </span>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-4">
                        <div>
                          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--text-muted)]">Valor</p>
                          <p className="mt-1 text-base font-bold text-[var(--text-primary)]">{formatCurrency(debt.amount)}</p>
                        </div>
                        <div>
                          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--text-muted)]">Próxima cobrança</p>
                          <p className="mt-1 text-base font-bold text-[var(--text-primary)]">{nextDue.toLocaleDateString('pt-BR')}</p>
                        </div>
                        <div>
                          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--text-muted)]">Impacto mensal</p>
                          <p className="mt-1 text-base font-bold text-[var(--text-primary)]">{formatCurrency(monthlyImpact)}</p>
                        </div>
                        <div>
                          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--text-muted)]">% nas saidas</p>
                          <p className="mt-1 text-base font-bold text-[var(--text-primary)]">{monthlyImpactShare}%</p>
                        </div>
                      </div>
                      <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)]/70 p-3 text-xs text-[var(--text-secondary)]">
                        <p>Última geração: {lastGeneratedAt ? lastGeneratedAt.toLocaleDateString('pt-BR') : `${previousCycle.toLocaleDateString('pt-BR')} (estimada)`}</p>
                        <p className="mt-1">Próxima geração prevista: {nextCycle.toLocaleDateString('pt-BR')}</p>
                      </div>
                      {debt.notes ? <p className="text-sm leading-7 text-[var(--text-secondary)]">{debt.notes}</p> : null}
                      {debt.source === 'legacy_debt' ? (
                        <p className="text-[11px] leading-5 text-[var(--text-secondary)]">
                          Registro anterior mantido para preservar seu histórico. Você pode editar normalmente.
                        </p>
                      ) : null}
                      <div className="flex items-center gap-2 sm:flex-wrap">
                        <button onClick={() => onEditRecurringDebt(debt.id)} className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-2 text-xs font-bold text-[var(--text-primary)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]">
                          <Pencil size={12} /> Editar
                        </button>
                        {debt.source === 'recurring_debt' ? (
                          <button onClick={() => void onToggleRecurringDebtStatus(debt.id)} className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-2 text-xs font-bold text-[var(--text-primary)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]">
                            {debt.status === 'Ativa' ? 'Pausar' : 'Ativar'}
                          </button>
                        ) : null}
                        <button onClick={() => onDuplicateRecurringDebt(debt.id)} className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-2 text-xs font-bold text-[var(--text-primary)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]">
                          Duplicar
                        </button>
                        <button onClick={() => onDeleteRecurringDebt(debt.id)} className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-default)] bg-[var(--bg-app)] px-3 py-2 text-xs font-bold text-[var(--danger)] transition-colors hover:bg-[var(--bg-surface)]">
                          <Trash2 size={12} /> Excluir
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}
      {debtDetailId !== null ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Fechar detalhe da dívida"
            onClick={() => setDebtDetailId(null)}
            className="absolute inset-0 bg-[var(--bg-app)]/85 backdrop-blur-sm"
          />
          <div className="relative z-10 w-full max-w-3xl rounded-3xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 shadow-2xl">
            {(() => {
              const debt = debts.find((item) => item.id === debtDetailId);
              if (!debt) {
                return (
                  <div className="text-sm text-[var(--text-secondary)]">
                    Dívida não encontrada.
                  </div>
                );
              }
              const history = debtPaymentTransactions
                .filter((tx) => String(tx.originId || '').startsWith(`debt-payment:${debt.id}:`))
                .sort((left, right) => new Date(String(right.rawDate || '')).getTime() - new Date(String(left.rawDate || '')).getTime());
              const paidAmount = Math.max(0, debt.originalAmount - debt.remainingAmount);
              const progressPercent = debt.originalAmount > 0 ? Math.max(0, Math.min(100, (paidAmount / debt.originalAmount) * 100)) : 0;
              return (
                <>
                  <div className="mb-5 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)]">Detalhe da dívida</p>
                      <h4 className="mt-2 text-2xl font-black text-[var(--text-primary)]">{debt.creditor}</h4>
                      <p className="mt-2 text-sm text-[var(--text-secondary)]">
                        {debt.category} ⬢ Juros {debt.interestRateMonthly.toFixed(2)}% a.m.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDebtDetailId(null)}
                      className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface-elevated)] px-3 py-1.5 text-xs font-bold text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
                    >
                      Fechar
                    </button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-4">
                    <div className="app-surface-subtle rounded-2xl p-3">
                      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--text-muted)]">Valor total</p>
                      <p className="mt-1 text-sm font-black text-[var(--text-primary)]">{formatCurrency(debt.originalAmount)}</p>
                    </div>
                    <div className="app-surface-subtle rounded-2xl p-3">
                      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--text-muted)]">Quitado</p>
                      <p className="mt-1 text-sm font-black text-[var(--text-primary)]">{formatCurrency(paidAmount)}</p>
                    </div>
                    <div className="app-surface-subtle rounded-2xl p-3">
                      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--text-muted)]">Restante</p>
                      <p className="mt-1 text-sm font-black text-[var(--text-primary)]">{formatCurrency(debt.remainingAmount)}</p>
                    </div>
                    <div className="app-surface-subtle rounded-2xl p-3">
                      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--text-muted)]">Impacto mensal</p>
                      <p className="mt-1 text-sm font-black text-[var(--text-primary)]">
                        {((Math.max(0, debt.remainingAmount) / Math.max(1, monthlyExpenseBase)) * 100).toFixed(0)}%
                      </p>
                    </div>
                  </div>
                  <div className="mt-5 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-app)] p-4">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--text-muted)]">Evolução do saldo</p>
                    <div className="mt-3 h-2 rounded-full bg-[var(--bg-surface-elevated)]">
                      <div className="h-2 rounded-full bg-[var(--primary)] transition-all" style={{ width: `${Math.min(progressPercent, 100)}%` }} />
                    </div>
                  </div>
                  <div className="mt-5 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-app)] p-4">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--text-muted)]">Histórico de pagamentos</p>
                    {history.length === 0 ? (
                      <p className="mt-3 text-sm text-[var(--text-secondary)]">Nenhum pagamento registrado.</p>
                    ) : (
                      <div className="mt-3 space-y-2">
                        {history.map((tx) => (
                          <div key={String(tx.id)} className="flex items-center justify-between rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-2">
                            <p className="text-sm font-semibold text-[var(--text-primary)]">{tx.desc}</p>
                            <div className="text-right">
                              <p className="text-sm font-black text-[var(--text-primary)]">{formatCurrency(Number(tx.rawAmount || 0))}</p>
                              <p className="text-[11px] text-[var(--text-muted)]">{tx.rawDate ? formatIsoDateShort(tx.rawDate) : tx.date}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      ) : null}
      {paymentTargetDebt ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Fechar registro de pagamento"
            onClick={closePaymentFlow}
            className="absolute inset-0 bg-[var(--bg-app)]/85 backdrop-blur-sm"
          />
          <div className="relative z-10 w-full max-w-lg rounded-3xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)]">Registrar pagamento</p>
                <h4 className="mt-2 text-2xl font-black text-[var(--text-primary)]">{paymentTargetDebt.creditor}</h4>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  Restante atual: {formatCurrency(paymentTargetDebt.remainingAmount)}
                </p>
              </div>
              <button
                type="button"
                onClick={closePaymentFlow}
                className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface-elevated)] px-3 py-1.5 text-xs font-bold text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
              >
                Fechar
              </button>
            </div>
            <form className="space-y-4" onSubmit={handleSubmitPayment}>
              <FormField
                label="Valor pago"
                required
                error={paymentAmountInvalid ? 'Informe um valor válido dentro do saldo restante.' : null}
              >
                <MoneyInput
                  value={paymentAmount}
                  onChange={setPaymentAmount}
                  placeholder="R$ 0,00"
                  className={cn('app-field w-full rounded-xl px-4 py-2 text-sm', paymentAmountInvalid && 'app-field-error')}
                />
              </FormField>
              <FormField label="Data do pagamento">
                <PremiumDatePicker
                  value={paymentDate}
                  onChange={setPaymentDate}
                  placeholder="Selecione a data"
                />
              </FormField>
              {paymentError ? (
                <p className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-app)] px-3 py-2 text-xs text-[var(--danger)]">
                  {paymentError}
                </p>
              ) : null}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closePaymentFlow}
                  disabled={isSubmittingPayment}
                  className="app-button-secondary rounded-xl px-4 py-2 text-sm font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPayment || paymentAmountInvalid}
                  className="app-button-primary rounded-xl px-4 py-2 text-sm font-bold"
                >
                  {isSubmittingPayment ? 'Salvando...' : 'Registrar pagamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
      {isCreateChooserOpen ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Fechar escolha de tipo de dívida"
            onClick={() => setIsCreateChooserOpen(false)}
            className="absolute inset-0 bg-[var(--bg-app)]/85 backdrop-blur-sm"
          />
          <div className="relative z-10 w-full max-w-2xl rounded-3xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 shadow-2xl">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)]">Nova dívida</p>
                <h4 className="mt-2 text-2xl font-black text-[var(--text-primary)]">Como essa dívida funciona?</h4>
                <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                  Escolha o tipo para organizar melhor suas finanças.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateChooserOpen(false)}
                className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface-elevated)] px-3 py-1.5 text-xs font-bold text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
              >
                Fechar
              </button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <button
                type="button"
                onClick={openSingleDebtFlow}
                className="rounded-3xl border border-[var(--border-default)] bg-[var(--bg-app)] p-6 text-left transition-all hover:border-[color:var(--border-default)] hover:bg-[var(--bg-app)]"
              >
                <div className="flex size-12 items-center justify-center rounded-2xl bg-[color:var(--primary-soft)] text-[var(--text-secondary)]">
                  <Wallet size={22} />
                </div>
                <h5 className="mt-5 text-xl font-black text-[var(--text-primary)]">Dívida única</h5>
                <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                  Tem valor total definido e termina quando for quitada.
                </p>
              </button>
              <button
                type="button"
                onClick={() => openRecurringDebtFlow()}
                className="rounded-3xl border border-[var(--border-default)] bg-[var(--bg-app)] p-6 text-left transition-all hover:border-[color:var(--border-default)] hover:bg-[var(--bg-app)]"
              >
                <div className="flex size-12 items-center justify-center rounded-2xl bg-[color:var(--primary-soft)] text-[var(--text-secondary)]">
                  <Calendar size={22} />
                </div>
                <h5 className="mt-5 text-xl font-black text-[var(--text-primary)]">Conta recorrente</h5>
                <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                  Se repete automaticamente todo mês.
                </p>
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

type PortfolioViewProps = {
  wallets: WalletAccount[];
  investments: Investment[];
  debts: Debt[];
  recurringDebts: RecurringDebt[];
  transactions: Transaction[];
  totalBalance: number;
  currentPlan: SubscriptionPlan;
  onAddWallet: () => void;
  onTransferBalance: (walletName?: string) => void;
  onAddInvestment: () => void;
  onAddDebt: () => void;
  onViewWalletHistory: (walletName?: string) => void;
  onAdjustWalletBalance: (walletName?: string) => void;
  onDeleteWallet: (wallet: WalletAccount) => void;
  onOpenInvestments: () => void;
  onOpenDebts: () => void;
  onOpenReports: () => void;
  onUpgrade: () => void;
  actionFeedback?: {
    tone: 'success' | 'error';
    message: string;
  } | null;
  onDismissFeedback?: () => void;
};

const buildPortfolioInsights = ({
  wallets,
  totalBalance,
  totalInvested,
  totalDebt,
  netWorth,
}: {
  wallets: WalletAccount[];
  totalBalance: number;
  totalInvested: number;
  totalDebt: number;
  netWorth: number;
}) => {
  const insights: string[] = [];
  const totalAssets = totalBalance + totalInvested;
  const topWallet = [...wallets].sort((a, b) => b.balance - a.balance)[0] ?? null;

  if (totalAssets <= 0 && totalDebt <= 0) {
    return ['Você ainda não consolidou patrimônio suficiente para gerar insights da carteira.'];
  }

  if (totalAssets > 0 && totalInvested === 0) {
    insights.push('Seu patrimônio ainda está concentrado em caixa. Registrar investimentos pode melhorar sua diversificação.');
  }

  if (topWallet && totalBalance > 0) {
    const share = (topWallet.balance / totalBalance) * 100;
    if (share >= 70) {
      insights.push(`${topWallet.name} concentra ${share.toFixed(0)}% do seu saldo em contas.`);
    }
  }

  if (totalDebt > 0 && totalAssets > 0) {
    const debtShare = (totalDebt / totalAssets) * 100;
    insights.push(`Suas dívidas representam ${debtShare.toFixed(0)}% dos seus ativos atuais.`);
  }

  if (netWorth < 0) {
    insights.push('Seu patrimônio líquido está negativo. Priorize reduzir dívidas e reforçar o saldo em contas.');
  }

  if (insights.length === 0 && totalAssets > 0) {
    insights.push('Sua carteira está equilibrada neste momento. Continue acompanhando a distribuição entre caixa, investimentos e dívidas.');
  }

  return insights.slice(0, 3);
};

const PortfolioView = ({
  wallets,
  investments,
  debts,
  recurringDebts,
  transactions,
  totalBalance,
  currentPlan,
  onAddWallet,
  onTransferBalance,
  onAddInvestment,
  onAddDebt,
  onViewWalletHistory,
  onAdjustWalletBalance,
  onDeleteWallet,
  onOpenInvestments,
  onOpenDebts,
  onOpenReports,
  onUpgrade,
  actionFeedback,
  onDismissFeedback,
}: PortfolioViewProps) => {
  const totalInvested = investments.reduce((acc, investment) => acc + investment.value, 0);
  const activeDebts = debts.filter((debt) => debt.status !== 'Quitada');
  const activeRecurringObligations = recurringDebts.filter((debt) => debt.status === 'Ativa');
  const totalDebt =
    activeDebts.reduce((acc, debt) => acc + debt.remainingAmount, 0) +
    activeRecurringObligations.reduce((acc, debt) => acc + debt.amount, 0);
  const netWorth = totalBalance + totalInvested - totalDebt;
  const [showAllWallets, setShowAllWallets] = React.useState(false);
  const hasAnyPortfolioData = wallets.length > 0 || investments.length > 0 || activeDebts.length > 0 || activeRecurringObligations.length > 0 || transactions.length > 0;
  const hasPortfolioAiInsights = currentPlan !== 'FREE';

  const assetMix = React.useMemo(
    () =>
      [
        { name: 'Caixa', value: Math.max(totalBalance, 0), color: 'var(--positive)' },
        { name: 'Investimentos', value: Math.max(totalInvested, 0), color: 'var(--primary)' },
        { name: 'Dívidas', value: Math.max(totalDebt, 0), color: 'var(--danger)' },
      ],
    [totalBalance, totalInvested, totalDebt]
  );

  const walletAllocation = React.useMemo(() => {
    const totalWalletBalance = wallets.reduce((acc, wallet) => acc + wallet.balance, 0);
    return [...wallets]
      .sort((a, b) => b.balance - a.balance)
      .map((wallet) => ({
        ...wallet,
        share: totalWalletBalance > 0 ? (wallet.balance / totalWalletBalance) * 100 : 0,
      }));
  }, [wallets]);
  const visibleWallets = showAllWallets ? walletAllocation : walletAllocation.slice(0, 4);

  const topInvestments = React.useMemo(
    () =>
      [...investments]
        .sort((a, b) => b.value - a.value)
        .slice(0, 3)
        .map((investment) => ({
          ...investment,
          profit: investment.value - investment.invested,
          profitPct: investment.invested > 0 ? ((investment.value - investment.invested) / investment.invested) * 100 : 0,
          portfolioShare: netWorth > 0 ? (investment.value / netWorth) * 100 : 0,
        })),
    [investments, netWorth]
  );

  const topDebts = React.useMemo(
    () =>
      [...activeDebts]
        .sort((a, b) => b.remainingAmount - a.remainingAmount)
        .slice(0, 3)
        .map((debt) => ({
          ...debt,
          portfolioShare: netWorth > 0 ? (debt.remainingAmount / netWorth) * 100 : 0,
        })),
    [activeDebts, netWorth]
  );

  const portfolioInsights = React.useMemo(
    () => {
      if (!hasPortfolioAiInsights) {
        return [];
      }

      return buildPortfolioInsights({
        wallets,
        totalBalance,
        totalInvested,
        totalDebt,
        netWorth,
      });
    },
    [wallets, totalBalance, totalInvested, totalDebt, netWorth, hasPortfolioAiInsights]
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <h3 className="page-title-premium text-[var(--text-primary)]">Carteira</h3>
            <p className="max-w-3xl text-sm leading-relaxed text-[var(--text-secondary)]">
              Veja seu patrimônio total e onde seu dinheiro está distribuído.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:flex lg:flex-wrap lg:justify-end">
            <button
              type="button"
              onClick={onAddWallet}
              className="app-button-primary inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold"
            >
              <Plus size={16} />
              Criar carteira
            </button>
            <button
              type="button"
              onClick={() => onTransferBalance()}
              className="app-button-secondary inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold"
            >
              <Workflow size={16} className="text-[var(--primary)]" />
              Transferir saldo
            </button>
            <button
              type="button"
              onClick={onAddInvestment}
              className="app-button-secondary inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold"
            >
              <TrendingUp size={16} className="text-[var(--primary)]" />
              Registrar investimento
            </button>
            <button
              type="button"
              onClick={onAddDebt}
              className="app-button-secondary inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold"
            >
              <CreditCard size={16} className="text-[var(--primary)]" />
              Registrar dívida
            </button>
          </div>
        </div>

        {!hasAnyPortfolioData && (
          <div className="rounded-3xl border border-dashed border-[var(--border-default)] bg-[var(--bg-surface)]/40 px-6 py-8 text-center">
            <h4 className="card-title-premium text-[var(--text-primary)]">Crie sua primeira carteira</h4>
            <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-[var(--text-secondary)]">
              Adicione contas bancárias, dinheiro em espécie ou carteiras digitais para começar a organizar suas finanças.
            </p>
            <button
              type="button"
              onClick={onAddWallet}
              className="app-button-primary mt-5 inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold"
            >
              <Plus size={16} />
              Criar primeira carteira
            </button>
          </div>
        )}
      </div>

      {actionFeedback && (
        <div
          className={cn(
            'flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm',
            actionFeedback.tone === 'success'
              ? 'border-[color:var(--border-default)] bg-[color:var(--success-soft)] text-[var(--text-primary)]'
              : 'border-[color:var(--border-default)] bg-[color:var(--danger-soft)] text-[var(--text-primary)]'
          )}
        >
          <p className="font-medium leading-relaxed">{actionFeedback.message}</p>
          {onDismissFeedback && (
            <button
              type="button"
              onClick={onDismissFeedback}
              className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-2.5 py-1 text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
            >
              Ok
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <button
          type="button"
          onClick={onOpenReports}
          className="app-surface-card rounded-2xl p-5 text-left transition-colors hover:border-[var(--border-strong)]"
        >
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Patrimônio líquido</p>
          <p className={cn('text-2xl font-black', netWorth >= 0 ? 'text-[var(--text-primary)]' : 'text-[var(--danger)]')}>
            {formatCurrency(netWorth)}
          </p>
          <p className="mt-3 text-xs text-[var(--text-muted)]">Saldo em contas + investimentos - dívidas</p>
        </button>
        <button
          type="button"
          onClick={() => onViewWalletHistory()}
          className="app-surface-card rounded-2xl p-5 text-left transition-colors hover:border-[var(--border-strong)]"
        >
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Saldo em contas</p>
          <p className="text-2xl font-black text-[var(--positive)]">{formatCurrency(totalBalance)}</p>
          <p className="mt-3 text-xs text-[var(--text-muted)]">Veja o histórico e movimente saldo entre carteiras</p>
        </button>
        <button
          type="button"
          onClick={onOpenInvestments}
          className="app-surface-card rounded-2xl p-5 text-left transition-colors hover:border-[var(--border-strong)]"
        >
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Investimentos</p>
          <p className="text-2xl font-black text-[var(--text-secondary)]">{formatCurrency(totalInvested)}</p>
          <p className="mt-3 text-xs text-[var(--text-muted)]">Abra a área de investimentos e registre novas posições</p>
        </button>
        <button
          type="button"
          onClick={onOpenDebts}
          className="app-surface-card rounded-2xl p-5 text-left transition-colors hover:border-[var(--border-strong)]"
        >
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Dívidas</p>
          <p className="text-2xl font-black text-[var(--text-secondary)]">{formatCurrency(totalDebt)}</p>
          <p className="mt-3 text-xs text-[var(--text-muted)]">Acompanhe o valor em aberto e os próximos vencimentos</p>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="app-surface-card rounded-2xl p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h4 className="card-title-premium text-[var(--text-primary)]">Distribuição do patrimônio</h4>
              <p className="text-sm text-[var(--text-muted)]">Entenda rapidamente quanto do seu patrimônio está em contas, investimentos e dívidas.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_0.9fr]">
            <div className="h-64 sm:h-72">
              {assetMix.some((item) => item.value > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                    <Pie
                      data={assetMix}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={70}
                      outerRadius={96}
                      paddingAngle={3}
                      stroke="none"
                    >
                      {assetMix.map((entry) => (
                        <Cell key={`portfolio-pie-${entry.name}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => formatCurrency(Number(value ?? 0))}
                      contentStyle={{
                        backgroundColor: 'var(--bg-surface)',
                        border: '1px solid var(--border-default)',
                        borderRadius: 12,
                        boxShadow: 'var(--shadow-soft)',
                        padding: '10px 12px',
                        color: 'var(--text-primary)',
                      }}
                      labelStyle={{
                        color: 'var(--text-primary)',
                        fontWeight: 600,
                      }}
                      itemStyle={{
                        color: 'var(--text-primary)',
                      }}
                    />
                  </RePieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-[var(--border-default)] text-sm text-[var(--text-muted)]">
                  Assim que você registrar contas, investimentos ou dívidas, a distribuição aparecerá aqui.
                </div>
              )}
            </div>

            <div className="space-y-3">
              {assetMix.map((entry) => {
                const portfolioBase = assetMix.reduce((acc, item) => acc + item.value, 0);
                const share = portfolioBase > 0
                  ? (entry.value / portfolioBase) * 100
                  : 0;
                return (
                  <div key={entry.name} className="app-surface-subtle rounded-2xl p-4">
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: entry.color }} />
                        <span className="text-sm font-semibold text-[var(--text-primary)]">{entry.name}</span>
                      </div>
                      <span className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">
                        {share.toFixed(1)}%
                      </span>
                    </div>
                    <p className="text-base font-bold text-[var(--text-primary)]">{formatCurrency(entry.value)}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="app-surface-card rounded-2xl p-6">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h4 className="card-title-premium text-[var(--text-primary)]">Onde está meu dinheiro</h4>
              <p className="text-sm text-[var(--text-muted)]">Veja as principais carteiras, participação no saldo total e ações rápidas.</p>
            </div>
            {walletAllocation.length > 4 && (
              <button
                type="button"
                onClick={() => setShowAllWallets((current) => !current)}
                className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
              >
                {showAllWallets ? 'Mostrar menos' : 'Ver todas as carteiras'}
              </button>
            )}
          </div>

          <div className="space-y-3">
            {walletAllocation.length === 0 && (
              <div className="rounded-2xl border border-dashed border-[var(--border-default)] px-4 py-6 text-sm text-[var(--text-muted)]">
                Nenhuma carteira cadastrada ainda. Crie uma conta financeira para começar a organizar seu saldo.
              </div>
            )}

            {visibleWallets.map((wallet) => (
              <div key={wallet.id} className="app-surface-subtle rounded-2xl p-4">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <span className="text-sm font-semibold text-[var(--text-primary)]">{wallet.name}</span>
                  <span className="text-sm font-bold text-[var(--text-secondary)]">{formatCurrency(wallet.balance)}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--bg-surface-elevated)]">
                  <div className="h-full rounded-full bg-[var(--primary)]" style={{ width: `${wallet.share}%` }} />
                </div>
                <p className="mt-2 text-xs text-[var(--text-muted)]">{wallet.share.toFixed(1)}% do saldo em contas</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onViewWalletHistory(wallet.name)}
                    className="app-button-secondary inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold"
                  >
                    <ReceiptText size={14} className="text-[var(--primary)]" />
                    Ver histórico
                  </button>
                  <button
                    type="button"
                    onClick={() => onTransferBalance(wallet.name)}
                    className="app-button-secondary inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold"
                  >
                    <Workflow size={14} className="text-[var(--primary)]" />
                    Transferir
                  </button>
                  <button
                    type="button"
                    onClick={() => onAdjustWalletBalance(wallet.name)}
                    className="app-button-secondary inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold"
                  >
                    <Pencil size={14} className="text-[var(--primary)]" />
                    Ajustar saldo
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteWallet(wallet)}
                    className="app-button-danger inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold"
                  >
                    <Trash2 size={14} />
                    Excluir
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="app-surface-card rounded-2xl p-6">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h4 className="card-title-premium text-[var(--text-primary)]">Resumo de investimentos</h4>
              <p className="text-sm text-[var(--text-muted)]">Veja os ativos que mais representam seu patrimônio.</p>
            </div>
            {topInvestments.length > 0 && (
              <button
                type="button"
                onClick={onOpenInvestments}
                className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
              >
                Abrir investimentos
              </button>
            )}
          </div>

          <div className="space-y-3">
            {topInvestments.length === 0 && (
              <div className="rounded-2xl border border-dashed border-[var(--border-default)] px-4 py-6">
                <p className="text-sm font-semibold text-[var(--text-primary)]">Você ainda não registrou investimentos.</p>
                <p className="mt-2 text-sm text-[var(--text-muted)]">
                  Adicione seus principais ativos para ver a participação deles no patrimônio total.
                </p>
                <button
                  type="button"
                  onClick={onAddInvestment}
                  className="app-button-secondary mt-4 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold"
                >
                  <Plus size={14} className="text-[var(--primary)]" />
                  Adicionar investimento
                </button>
              </div>
            )}

            {topInvestments.map((investment) => (
              <div key={investment.id} className="app-surface-subtle rounded-2xl p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{investment.label}</p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {investment.type} · {investment.walletName}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-[var(--text-secondary)]">{formatCurrency(investment.value)}</p>
                    <p className="text-[11px] uppercase tracking-widest text-[var(--text-muted)]">
                      {investment.portfolioShare.toFixed(1)}% do patrimônio
                    </p>
                    <p
                      className={cn(
                        'text-xs font-semibold',
                        investment.profit >= 0 ? 'text-[var(--text-secondary)]' : 'text-[var(--danger)]'
                      )}
                    >
                      {investment.profit >= 0 ? '+' : ''}
                      {investment.profitPct.toFixed(2)}%
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="app-surface-card rounded-2xl p-6">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h4 className="card-title-premium text-[var(--text-primary)]">Resumo de dívidas</h4>
              <p className="text-sm text-[var(--text-muted)]">Entenda o que está em aberto e o peso disso no seu patrimônio.</p>
            </div>
            {topDebts.length > 0 && (
              <button
                type="button"
                onClick={onOpenDebts}
                className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
              >
                Abrir dívidas
              </button>
            )}
          </div>

          <div className="space-y-3">
            {topDebts.length === 0 && (
              <div className="rounded-2xl border border-dashed border-[var(--border-default)] px-4 py-6">
                <p className="text-sm font-semibold text-[var(--text-primary)]">Você não possui dívidas registradas.</p>
                <p className="mt-2 text-sm text-[var(--text-muted)]">
                  Registre dívidas para acompanhar o valor em aberto e o impacto delas no seu patrimônio.
                </p>
                <button
                  type="button"
                  onClick={onAddDebt}
                  className="app-button-secondary mt-4 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold"
                >
                  <Plus size={14} className="text-[var(--primary)]" />
                  Registrar dívida
                </button>
              </div>
            )}

            {topDebts.map((debt) => (
              <div key={debt.id} className="app-surface-subtle rounded-2xl p-4">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{debt.creditor}</p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">{debt.category}</p>
                  </div>
                  <span className="text-sm font-bold text-[var(--danger)]">{formatCurrency(debt.remainingAmount)}</span>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--text-muted)]">
                  <span>Vence em {formatDebtDueDateLabel(debt)}</span>
                  <span>{Math.max(debt.portfolioShare, 0).toFixed(1)}% do patrimônio</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="app-surface-card rounded-2xl p-6">
        <div className="mb-4">
          <h4 className="card-title-premium text-[var(--text-primary)]">Insights da IA</h4>
          <p className="text-sm text-[var(--text-muted)]">
            {hasPortfolioAiInsights
              ? 'Mensagens rápidas para ajudar você a entender a composição da sua carteira.'
              : 'Descubra para onde seu dinheiro está indo com os Insights automáticos da IA.'}
          </p>
        </div>

        {hasPortfolioAiInsights ? (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            {portfolioInsights.map((insight, index) => (
              <div key={`${index}-${insight}`} className="rounded-2xl border border-[color:color-mix(in_srgb,var(--primary)_35%,transparent)] bg-[color:var(--primary-soft)] p-4">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[color:color-mix(in_srgb,var(--primary)_35%,transparent)] bg-[color:var(--primary-soft)] px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-[var(--primary)]">
                  <Sparkles size={12} />
                  Insight
                </div>
                <p className="text-sm font-semibold text-[var(--text-muted)]">Leitura principal</p>
                <p className="mt-2 text-lg font-black text-[var(--text-primary)]">{extractInsightMetric(insight) ?? 'Sem métrica numérica'}</p>
                <p className="mt-2 text-sm leading-relaxed text-[var(--text-primary)]">{insight}</p>
                <p className="mt-3 text-xs font-semibold text-[var(--primary)]">{getInsightActionHint(insight)}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-[color:var(--border-default)] bg-gradient-to-br from-[var(--bg-app)]/90 via-[var(--bg-surface)]/70 to-[var(--bg-surface-elevated)]/60 p-5">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[color:var(--border-default)] bg-[color:var(--primary-soft)] px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">
                  <Lock size={12} />
                  Disponível no plano Pro
                </div>
                <p className="text-sm leading-relaxed text-[var(--text-primary)]">
                  Receba análises automáticas da sua vida financeira com inteligência artificial e veja rapidamente onde seu
                  patrimônio está concentrado, quais pontos exigem atenção e quais oportunidades merecem prioridade.
                </p>
              </div>
              <button
                type="button"
                onClick={onUpgrade}
                className="app-button-primary inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold"
              >
                <Sparkles size={16} />
                Ativar plano Pro
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

type ReportsViewProps = {
  transactions: Transaction[];
  totalBalance: number;
  projection: DashboardProjection | null;
  reportOverview: ReportsOverviewPayload | null;
  goals: Goal[];
  onExportPDF: () => void;
  onExportCSV: () => void;
  onBeforeUseAI?: () => boolean;
  getApiHeaders: (withJsonContentType?: boolean) => Promise<Record<string, string>>;
  accessLevel: ReportAccessLevel;
  currentPlan: SubscriptionPlan;
  onUpgrade: () => void;
  onNavigateTab?: (tab: Tab) => void;
};

const ReportsView = ({
  transactions,
  totalBalance,
  projection,
  reportOverview,
  goals,
  onExportPDF,
  onExportCSV,
  onBeforeUseAI,
  getApiHeaders,
  accessLevel,
  currentPlan,
  onUpgrade,
  onNavigateTab,
}: ReportsViewProps) => {
  const [isGeneratingInsight, setIsGeneratingInsight] = React.useState(false);
  const [aiInsight, setAiInsight] = React.useState<string | null>(null);
  const now = React.useMemo(() => new Date(), []);

  const enrichedTransactions = React.useMemo(
    () => transactions.map((tx) => ({ ...tx, parsedDate: parseTransactionDate(tx.date) })),
    [transactions]
  );

  const totalIncome =
    reportOverview?.summary.totalIncome ??
    transactions.filter((tx) => tx.type === 'income').reduce((acc, tx) => acc + parseCurrency(tx.amount), 0);

  const totalExpenses =
    reportOverview?.summary.totalExpenses ??
    transactions.filter((tx) => tx.type === 'expense').reduce((acc, tx) => acc + parseCurrency(tx.amount), 0);

  const balance = reportOverview?.summary.balance ?? totalIncome - totalExpenses;

  const revenueExpense12Months = React.useMemo(() => {
    if (reportOverview) {
      return reportOverview.revenueExpense12Months.map((item) => ({
        name: item.label,
        income: item.income,
        expense: item.expense,
      }));
    }
    const months = Array.from({ length: 12 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (11 - index), 1);
      const label = date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
      return {
        key: `${date.getFullYear()}-${date.getMonth()}`,
        name: `${label.charAt(0).toUpperCase()}${label.slice(1)}`,
        income: 0,
        expense: 0,
      };
    });

    const monthMap = new Map(months.map((month) => [month.key, month]));

    for (const tx of enrichedTransactions) {
      if (!tx.parsedDate) continue;
      const key = `${tx.parsedDate.getFullYear()}-${tx.parsedDate.getMonth()}`;
      const bucket = monthMap.get(key);
      if (!bucket) continue;
      const amount = parseCurrency(tx.amount);
      if (tx.type === 'income') {
        bucket.income += amount;
      } else {
        bucket.expense += amount;
      }
    }

    return months;
  }, [enrichedTransactions, now, reportOverview]);

  const savingsRate6Months = React.useMemo(() => {
    if (reportOverview) {
      return reportOverview.savingsRate6Months.map((item) => ({
        key: item.label,
        name: item.label,
        income: item.income,
        expense: item.expense,
        savingsRate: item.savingsRate,
      }));
    }
    const months = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
      const label = date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
      return {
        key: `${date.getFullYear()}-${date.getMonth()}`,
        name: `${label.charAt(0).toUpperCase()}${label.slice(1)}`,
        income: 0,
        expense: 0,
        savingsRate: 0,
      };
    });

    const monthMap = new Map(months.map((month) => [month.key, month]));

    for (const tx of enrichedTransactions) {
      if (!tx.parsedDate) continue;
      const key = `${tx.parsedDate.getFullYear()}-${tx.parsedDate.getMonth()}`;
      const bucket = monthMap.get(key);
      if (!bucket) continue;
      const amount = parseCurrency(tx.amount);
      if (tx.type === 'income') {
        bucket.income += amount;
      } else {
        bucket.expense += amount;
      }
    }

    for (const month of months) {
      month.savingsRate =
        month.income > 0 ? ((month.income - month.expense) / month.income) * 100 : 0;
    }

    return months;
  }, [enrichedTransactions, now, reportOverview]);

  const categoryData = React.useMemo(() => {
    if (reportOverview) {
      return reportOverview.categoryData;
    }
    const expenseByCategory = new Map<string, number>();
    for (const tx of transactions) {
      if (tx.type !== 'expense') continue;
      const key = tx.cat || 'Outros';
      expenseByCategory.set(key, (expenseByCategory.get(key) || 0) + parseCurrency(tx.amount));
    }

    const palette = ['var(--primary)', 'var(--text-secondary)', 'var(--positive)', 'var(--danger)', 'var(--text-muted)'];
    return Array.from(expenseByCategory.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, value], index) => ({
        name,
        value,
        color: palette[index % palette.length],
      }));
  }, [reportOverview, transactions]);

  const pieData = categoryData.length > 0 ? categoryData : [{ name: 'Sem dados', value: 1, color: 'var(--text-muted)' }];

  const expenseDeepDive = React.useMemo(() => {
    if (reportOverview) {
      return reportOverview.expenseDeepDive;
    }
    const currentMonthReference = new Date(now.getFullYear(), now.getMonth(), 1);
    const previousMonthReference = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const currentMonthExpenses = enrichedTransactions.filter(
      (tx) =>
        tx.type === 'expense' &&
        tx.parsedDate &&
        tx.parsedDate.getFullYear() === currentMonthReference.getFullYear() &&
        tx.parsedDate.getMonth() === currentMonthReference.getMonth()
    );

    const previousMonthExpenses = enrichedTransactions.filter(
      (tx) =>
        tx.type === 'expense' &&
        tx.parsedDate &&
        tx.parsedDate.getFullYear() === previousMonthReference.getFullYear() &&
        tx.parsedDate.getMonth() === previousMonthReference.getMonth()
    );

    const buildCategoryMap = (items: Array<typeof enrichedTransactions[number]>) => {
      const map = new Map<string, number>();
      for (const item of items) {
        const key = item.cat || 'Outros';
        map.set(key, (map.get(key) || 0) + parseCurrency(item.amount));
      }
      return map;
    };

    const currentCategoryMap = buildCategoryMap(currentMonthExpenses);
    const previousCategoryMap = buildCategoryMap(previousMonthExpenses);
    const currentMonthTotal = currentMonthExpenses.reduce((acc, tx) => acc + parseCurrency(tx.amount), 0);
    const previousMonthTotal = previousMonthExpenses.reduce((acc, tx) => acc + parseCurrency(tx.amount), 0);
    const monthOverMonthVariation =
      previousMonthTotal > 0 ? ((currentMonthTotal - previousMonthTotal) / previousMonthTotal) * 100 : null;

    const topCurrentCategory = Array.from(currentCategoryMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }))[0] ?? null;

    const growingCategories = Array.from(currentCategoryMap.entries())
      .map(([name, currentValue]) => {
        const previousValue = previousCategoryMap.get(name) ?? 0;
        const diff = currentValue - previousValue;
        const variation = previousValue > 0 ? (diff / previousValue) * 100 : currentValue > 0 ? 100 : 0;
        return {
          name,
          currentValue,
          previousValue,
          diff,
          variation,
        };
      })
      .filter((item) => item.currentValue > 0 && item.diff > 0)
      .sort((a, b) => b.diff - a.diff)
      .slice(0, 3);

    const recurringHeavyCategories = Array.from(
      currentMonthExpenses.reduce((acc, tx) => {
        const key = tx.cat || 'Outros';
        const current = acc.get(key) || { name: key, count: 0, total: 0 };
        current.count += 1;
        current.total += parseCurrency(tx.amount);
        acc.set(key, current);
        return acc;
      }, new Map<string, { name: string; count: number; total: number }>())
    )
      .map(([, value]) => value)
      .filter((item) => item.count >= 2)
      .sort((a, b) => b.total - a.total)
      .slice(0, 3);

    const largestExpense = currentMonthExpenses
      .map((tx) => ({
        id: tx.id,
        amount: parseCurrency(tx.amount),
        description: tx.desc || tx.cat || 'Saida sem descrição',
        category: tx.cat || 'Outros',
        date: tx.parsedDate,
      }))
      .sort((a, b) => b.amount - a.amount)[0] ?? null;

    return {
      currentMonthTotal,
      previousMonthTotal,
      monthOverMonthVariation,
      topCurrentCategory,
      growingCategories,
      recurringHeavyCategories,
      largestExpense,
    };
  }, [enrichedTransactions, now, reportOverview]);

  const balanceForecast = React.useMemo(() => {
    if (reportOverview) {
      return reportOverview.balanceForecast;
    }
    const horizonDays = [7, 15, 30];
    if (projection && projection.daily.length > 0) {
      const firstDailyPoint = projection.daily[0];
      const lastDailyPoint = projection.daily[projection.daily.length - 1];
      const dailyNetFlow =
        projection.daily.length > 0
          ? (lastDailyPoint.closingBalance - firstDailyPoint.openingBalance) / projection.daily.length
          : 0;
      const projections = horizonDays.map((days) => {
        const targetIndex = Math.max(0, Math.min(days - 1, projection.daily.length - 1));
        const targetPoint = projection.daily[targetIndex] ?? lastDailyPoint;
        return {
          days,
          projectedBalance:
            days === 30 && targetPoint === undefined
              ? projection.projectedBalance30d
              : (targetPoint?.closingBalance ?? projection.projectedBalance30d),
        };
      });
      const trend = dailyNetFlow > 5 ? 'positive' : dailyNetFlow < -5 ? 'negative' : 'stable';
      const projectedNegativeInDays = projection.projectedNegativeDate
        ? Math.max(
            0,
            Math.ceil(
              (new Date(projection.projectedNegativeDate).getTime() - now.getTime()) /
                (24 * 60 * 60 * 1000)
            )
          )
        : null;
      return {
        projections,
        dailyNetFlow,
        trend,
        projectedNegativeInDays,
        source: 'read-model' as const,
      };
    }

    const forecastWindowDays = 60;
    const windowStart = new Date(now.getTime() - forecastWindowDays * 24 * 60 * 60 * 1000);
    const recentTransactions = enrichedTransactions.filter(
      (tx) => tx.parsedDate && tx.parsedDate >= windowStart
    );

    const recentNetFlow = recentTransactions.reduce((acc, tx) => {
      const amount = parseCurrency(tx.amount);
      return acc + (tx.type === 'income' ? amount : -amount);
    }, 0);

    const dailyNetFlow = recentTransactions.length > 0 ? recentNetFlow / forecastWindowDays : 0;
    const projections = horizonDays.map((days) => ({
      days,
      projectedBalance: totalBalance + dailyNetFlow * days,
    }));

    const trend =
      dailyNetFlow > 5 ? 'positive' : dailyNetFlow < -5 ? 'negative' : 'stable';

    const projectedNegativeInDays =
      dailyNetFlow < 0 && totalBalance > 0
        ? Math.max(1, Math.floor(totalBalance / Math.abs(dailyNetFlow)))
        : null;

    return {
      projections,
      dailyNetFlow,
      trend,
      projectedNegativeInDays,
      source: 'legacy' as const,
    };
  }, [enrichedTransactions, now, projection, reportOverview, totalBalance]);

  const premiumSmartAlerts = React.useMemo(
    () =>
      reportOverview?.premiumSmartAlerts ??
      buildPremiumSmartAlerts({
        transactions,
        totalBalance,
        goals,
        now,
        includeOkState: true,
      }),
    [goals, now, reportOverview, totalBalance, transactions]
  );

  const trendDirectionLabel =
    balanceForecast.trend === 'positive'
      ? 'Direção de alta'
      : balanceForecast.trend === 'negative'
        ? 'Direção de queda'
        : 'Direção estável';
  const trendMetricValue = `${balanceForecast.dailyNetFlow >= 0 ? '+' : '-'}${formatCurrency(Math.abs(balanceForecast.dailyNetFlow))}/dia`;
  const trendBasisLabel = balanceForecast.source === 'read-model' ? 'base da projeção diária' : 'base dos últimos 60 dias';
  const trendActionHint =
    balanceForecast.trend === 'positive'
      ? 'Ação sugerida: manter a cadência atual e ampliar reserva de segurança.'
      : balanceForecast.trend === 'negative'
        ? 'Ação sugerida: revisar saidas recorrentes e reduzir saídas nas próximas 2 semanas.'
        : 'Ação sugerida: acompanhar os próximos 7 dias para confirmar estabilidade.';

  const getAlertActionLabel = (tone: AppNotification['tone']) => {
    if (tone === 'error') return 'Corrigir agora';
    if (tone === 'warning') return 'Revisar agora';
    if (tone === 'success') return 'Ver oportunidade';
    return 'Ver detalhes';
  };

  const generateAIInsight = async () => {
    if (onBeforeUseAI && !onBeforeUseAI()) {
      return;
    }

    setIsGeneratingInsight(true);
    try {
      const prompt = `Analise estes dados financeiros e gere 3 insights curtos e acionáveis:
Entradas: ${formatCurrency(totalIncome)}
Saidas: ${formatCurrency(totalExpenses)}
Saldo: ${formatCurrency(balance)}
Maiores gastos: ${categoryData.slice(0, 3).map((c) => `${c.name}: ${formatCurrency(c.value)}`).join(', ')}
`;
      const response: any = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: await getApiHeaders(true),
        body: JSON.stringify({
          message: prompt,
          history: [],
          context: { activeTab: 'reports' },
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(typeof data?.error === 'string' ? data.error : 'Falha ao gerar insights.');
      }
      setAiInsight(typeof data?.text === 'string' ? data.text : 'Não foi possível gerar insights no momento.');
    } catch (error) {
      console.error('AI Insight error:', error);
      setAiInsight('Não foi possível gerar insights no momento.');
    } finally {
      setIsGeneratingInsight(false);
    }
  };

  if (accessLevel === 'basic') {
    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="page-title-premium text-[var(--text-primary)]">Relatórios</h3>
            <p className="text-sm text-[var(--text-secondary)]">
              Visão básica da sua movimentação financeira atual.
            </p>
          </div>
          {currentPlan === 'FREE' && (
            <button
              onClick={onUpgrade}
              className="app-button-primary inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold"
            >
              <Sparkles size={16} /> Liberar relatórios completos
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="app-surface-card rounded-2xl p-6">
            <p className="label-premium mb-1 text-[var(--text-muted)]">Entradas</p>
            <p className="text-2xl font-black text-[var(--positive)]">{formatCurrency(totalIncome)}</p>
          </div>
          <div className="app-surface-card rounded-2xl p-6">
            <p className="label-premium mb-1 text-[var(--text-muted)]">Saidas</p>
            <p className="text-2xl font-black text-[var(--danger)]">{formatCurrency(totalExpenses)}</p>
          </div>
          <div className="app-surface-card rounded-2xl p-6">
            <p className="label-premium mb-1 text-[var(--text-muted)]">Saldo líquido</p>
            <p className="text-2xl font-black text-[var(--text-primary)]">{formatCurrency(balance)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="app-surface-card rounded-2xl p-6">
            <h4 className="label-premium text-[var(--text-primary)] mb-4">Resumo por categoria</h4>
            <div className="space-y-3">
              {categoryData.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)]">Registre saidas para visualizar um resumo por categoria.</p>
              ) : (
                categoryData.slice(0, 5).map((item) => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between gap-3 app-surface-subtle rounded-xl px-4 py-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="size-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-sm text-[var(--text-primary)] truncate">{item.name}</span>
                    </div>
                    <span className="text-sm font-bold text-[var(--text-primary)]">{formatCurrency(item.value)}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="app-surface-card rounded-2xl p-6">
            <h4 className="label-premium text-[var(--text-primary)] mb-4">Disponível no Pro</h4>
            <div className="space-y-3">
              {[
                'Gráficos comparativos completos',
                'Insights automáticos com IA',
                'Exportação em PDF e CSV',
                'Comparativos avançados de entrada, saida e economia',
              ].map((feature) => (
                <div
                  key={feature}
                  className="rounded-xl border border-[color:var(--border-default)] bg-[color:var(--primary-soft)] px-4 py-3 text-sm text-[var(--text-secondary)]/90"
                >
                  {feature}
                </div>
              ))}
            </div>
            {currentPlan === 'FREE' && (
              <button
                onClick={onUpgrade}
                className="app-button-primary mt-5 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-bold"
              >
                <Sparkles size={16} /> Fazer upgrade para Pro
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h3 className="page-title-premium text-[var(--text-primary)]">Relatórios e Insights</h3>
        <div className="flex gap-2">
          <button
            onClick={onExportPDF}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--bg-surface-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors text-sm font-bold"
          >
            <Download size={18} /> PDF
          </button>
          <button
            onClick={onExportCSV}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--bg-surface-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors text-sm font-bold"
          >
            <FileText size={18} /> CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="app-surface-card rounded-2xl p-6">
          <p className="label-premium mb-1 text-[var(--text-muted)]">Entradas</p>
          <p className="text-2xl font-black text-[var(--positive)]">{formatCurrency(totalIncome)}</p>
        </div>
        <div className="app-surface-card rounded-2xl p-6">
          <p className="label-premium mb-1 text-[var(--text-muted)]">Saidas</p>
          <p className="text-2xl font-black text-[var(--danger)]">{formatCurrency(totalExpenses)}</p>
        </div>
        <div className="app-surface-card rounded-2xl p-6">
          <p className="label-premium mb-1 text-[var(--text-muted)]">Saldo líquido</p>
          <p className="text-2xl font-black text-[var(--text-primary)]">{formatCurrency(balance)}</p>
        </div>
      </div>

      {currentPlan === 'PREMIUM' ? (
        <div className="space-y-6">
          <div className="app-surface-card rounded-2xl p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between mb-6">
              <div>
                <h4 className="label-premium text-[var(--text-primary)]">Previsão de saldo</h4>
                <p className="text-sm text-[var(--text-secondary)] mt-2">
                  {balanceForecast.source === 'read-model'
                    ? 'Projeção baseada no histórico diário (confirmado + planejado).'
                    : 'Projeção baseada no ritmo médio das suas movimentações dos últimos 60 dias.'}
                </p>
              </div>
              <div className="rounded-2xl border border-[color:color-mix(in_srgb,var(--primary)_35%,transparent)] bg-[color:var(--primary-soft)] px-4 py-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--primary)]">Tendência</p>
                <p className="mt-1 text-sm font-black text-[var(--text-primary)]">{trendMetricValue}</p>
                <p className="mt-1 text-xs font-semibold text-[var(--text-secondary)]">{`${trendDirectionLabel} · ${trendBasisLabel}`}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {balanceForecast.projections.map((item) => (
                <div
                  key={item.days}
                  className="rounded-2xl border border-[color:color-mix(in_srgb,var(--primary)_35%,transparent)] bg-[color:var(--primary-soft)] p-5"
                >
                  <p className="text-[10px] font-black uppercase tracking-widest text-[var(--primary)]">Tendência</p>
                  <p className="mt-2 label-premium text-[var(--text-muted)]">Projeção em {item.days} dias</p>
                  <p
                    className={`mt-2 text-2xl font-black ${
                      item.projectedBalance >= 0 ? 'text-[var(--text-primary)]' : 'text-[var(--danger)]'
                    }`}
                  >
                    {formatCurrency(item.projectedBalance)}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)] mt-2">
                    {item.projectedBalance >= 0
                      ? 'Mantendo o ritmo atual, seu caixa permanece saudável.'
                      : 'Se nada mudar, o saldo projetado fica negativo.'}
                  </p>
                  <p className="mt-3 text-xs font-semibold text-[var(--primary)]">{trendActionHint}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 app-surface-subtle rounded-2xl p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">
                  Alertas inteligentes
                </p>
                <span className="rounded-full border border-[var(--border-default)] bg-[var(--bg-surface)] px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">
                  Premium
                </span>
              </div>
              <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
                {premiumSmartAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={cn(
                      'rounded-2xl border p-4',
                      alert.tone === 'error'
                        ? 'border-[color:color-mix(in_srgb,var(--danger)_36%,transparent)] bg-[var(--danger-soft)]'
                        : alert.tone === 'warning'
                          ? 'border-[color:color-mix(in_srgb,var(--warning)_26%,transparent)] bg-[var(--warning-soft)]'
                          : 'border-[color:color-mix(in_srgb,var(--primary)_35%,transparent)] bg-[color:var(--primary-soft)]'
                    )}
                  >
                    <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Alerta</p>
                    <p
                      className={cn(
                        'mt-2 text-xs font-bold uppercase tracking-widest',
                        alert.tone === 'error'
                          ? 'text-[var(--danger)]'
                          : alert.tone === 'warning'
                            ? 'text-[var(--warning)]'
                            : 'text-[var(--primary)]'
                      )}
                    >
                      {alert.title}
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-[var(--text-primary)]">{alert.message}</p>
                    <div className="mt-3">
                      {onNavigateTab && alert.targetTab ? (
                        <button
                          type="button"
                          onClick={() => onNavigateTab(alert.targetTab!)}
                          className={cn(
                            'text-xs font-semibold underline-offset-4 hover:underline',
                            alert.tone === 'error'
                              ? 'text-[var(--danger)]'
                              : alert.tone === 'warning'
                                ? 'text-[var(--warning)]'
                                : 'text-[var(--primary)]'
                          )}
                        >
                          {getAlertActionLabel(alert.tone)}
                        </button>
                      ) : (
                        <p className="text-xs font-semibold text-[var(--primary)]">{getAlertActionLabel(alert.tone)}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="app-surface-card rounded-2xl p-6">
            <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h4 className="label-premium text-[var(--text-primary)]">Análises profundas de saidas</h4>
                <p className="mt-2 max-w-3xl text-sm text-[var(--text-secondary)]">
                  Veja quais categorias mais cresceram, onde estão os gastos recorrentes mais pesados e qual saida individual mais pressiona seu caixa neste mês.
                </p>
              </div>
              <span className="rounded-full border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">
                Premium
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="app-surface-subtle rounded-2xl p-5">
                <p className="label-premium mb-2 text-[var(--text-muted)]">Saidas do mês</p>
                <p className="text-2xl font-black text-[var(--text-primary)]">{formatCurrency(expenseDeepDive.currentMonthTotal)}</p>
                <p className="mt-2 text-xs text-[var(--text-secondary)]">
                  {expenseDeepDive.previousMonthTotal > 0
                    ? `Mês anterior: ${formatCurrency(expenseDeepDive.previousMonthTotal)}`
                    : 'Sem comparação válida com o mês anterior.'}
                </p>
              </div>

              <div className="app-surface-subtle rounded-2xl p-5">
                <p className="label-premium mb-2 text-[var(--text-muted)]">Variação mensal</p>
                <p
                  className={cn(
                    'text-2xl font-black',
                    expenseDeepDive.monthOverMonthVariation === null
                      ? 'text-[var(--text-primary)]'
                      : expenseDeepDive.monthOverMonthVariation > 0
                        ? 'text-[var(--text-secondary)]'
                        : 'text-[var(--text-secondary)]'
                  )}
                >
                  {expenseDeepDive.monthOverMonthVariation === null
                    ? 'Sem base'
                    : `${expenseDeepDive.monthOverMonthVariation > 0 ? '+' : ''}${expenseDeepDive.monthOverMonthVariation.toFixed(1)}%`}
                </p>
                <p className="mt-2 text-xs text-[var(--text-secondary)]">
                  Comparação entre as saidas do mês atual e do mês anterior.
                </p>
              </div>

              <div className="app-surface-subtle rounded-2xl p-5">
                <p className="label-premium mb-2 text-[var(--text-muted)]">Categoria mais pesada</p>
                <p className="card-title-premium text-[var(--text-primary)]">
                  {expenseDeepDive.topCurrentCategory?.name || 'Sem dados'}
                </p>
                <p className="mt-2 text-xs text-[var(--text-secondary)]">
                  {expenseDeepDive.topCurrentCategory
                    ? formatCurrency(expenseDeepDive.topCurrentCategory.value)
                    : 'Registre mais saidas para gerar a análise.'}
                </p>
              </div>

              <div className="app-surface-subtle rounded-2xl p-5">
                <p className="label-premium mb-2 text-[var(--text-muted)]">Maior saida individual</p>
                <p className="card-title-premium text-[var(--text-primary)]">
                  {expenseDeepDive.largestExpense?.description || 'Sem dados'}
                </p>
                <p className="mt-2 text-xs text-[var(--text-secondary)]">
                  {expenseDeepDive.largestExpense
                    ? `${formatCurrency(expenseDeepDive.largestExpense.amount)} em ${expenseDeepDive.largestExpense.category}`
                    : 'Ainda não há lançamentos suficientes neste mês.'}
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-2">
              <div className="app-surface-subtle rounded-2xl p-5">
                <p className="label-premium mb-4 text-[var(--text-muted)]">Categorias que mais cresceram</p>
                <div className="space-y-3">
                  {expenseDeepDive.growingCategories.length === 0 ? (
                    <p className="text-sm text-[var(--text-secondary)]">
                      Nenhuma categoria apresentou crescimento relevante em relação ao mês anterior.
                    </p>
                  ) : (
                    expenseDeepDive.growingCategories.map((item) => (
                      <div key={item.name} className="app-surface-subtle rounded-2xl p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-bold text-[var(--text-primary)]">{item.name}</p>
                          <span className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)]">
                            +{item.variation.toFixed(0)}%
                          </span>
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-3 text-xs text-[var(--text-secondary)]">
                          <span>Mês atual: {formatCurrency(item.currentValue)}</span>
                          <span>Mês anterior: {formatCurrency(item.previousValue)}</span>
                        </div>
                        <p className="mt-2 text-xs text-[var(--text-muted)]">
                          Crescimento absoluto de {formatCurrency(item.diff)} nesta categoria.
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="app-surface-subtle rounded-2xl p-5">
                <p className="label-premium mb-4 text-[var(--text-muted)]">Categorias recorrentes que mais pesam</p>
                <div className="space-y-3">
                  {expenseDeepDive.recurringHeavyCategories.length === 0 ? (
                    <p className="text-sm text-[var(--text-secondary)]">
                      Ainda não há categorias recorrentes suficientes neste mês para uma análise mais profunda.
                    </p>
                  ) : (
                    expenseDeepDive.recurringHeavyCategories.map((item) => (
                      <div key={item.name} className="app-surface-subtle rounded-2xl p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-bold text-[var(--text-primary)]">{item.name}</p>
                          <span className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)]">
                            {item.count} lançamentos
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-[var(--text-secondary)]">{formatCurrency(item.total)}</p>
                        <p className="mt-2 text-xs text-[var(--text-muted)]">
                          Vale revisar frequência, assinatura recorrente ou padrão de consumo nesta categoria.
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="app-surface-card rounded-2xl p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h4 className="label-premium text-[var(--text-primary)]">Disponível no Premium</h4>
              <p className="text-sm text-[var(--text-secondary)] mt-2 max-w-2xl">
                Desbloqueie previsões de saldo em 7, 15 e 30 dias, alertas inteligentes e análises profundas de saidas para identificar crescimento por categoria e padrões que pressionam seu caixa.
              </p>
            </div>
            <button
              onClick={onUpgrade}
              className="app-button-primary inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-bold"
            >
              <Sparkles size={16} /> Conhecer Premium
            </button>
          </div>
        </div>
      )}

      <div className="app-surface-card rounded-2xl p-6">
        <div className="mb-5">
          <h4 className="label-premium text-[var(--text-primary)]">Entradas x Saidas (12 meses)</h4>
        </div>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={revenueExpense12Months}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-strong)" vertical={false} />
              <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis
                stroke="var(--text-muted)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => formatCurrency(Number(value || 0))}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-strong)',
                  borderRadius: '12px',
                }}
                formatter={(value, name) => [
                  formatCurrency(Number(value || 0)),
                  name === 'income' ? 'Entradas' : 'Saidas',
                ]}
              />
              <Line type="monotone" dataKey="income" name="income" stroke="var(--positive)" strokeWidth={3} dot={{ r: 2 }} />
              <Line type="monotone" dataKey="expense" name="expense" stroke="var(--danger)" strokeWidth={3} dot={{ r: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="app-surface-card rounded-2xl p-6">
          <h4 className="label-premium text-[var(--text-primary)] mb-6">Gastos por categoria</h4>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RePieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={62}
                  outerRadius={88}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`report-pie-cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-strong)',
                    borderRadius: '12px',
                  }}
                  formatter={(value: number | string | undefined) =>
                    formatCurrency(Number(value || 0))
                  }
                />
              </RePieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
            {categoryData.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)]">Sem saidas para exibir por categoria.</p>
            ) : (
              categoryData.map((item) => (
                <div key={item.name} className="flex items-center gap-2 text-xs">
                  <div className="size-2 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-[var(--text-secondary)]">{item.name}:</span>
                  <span className="text-[var(--text-primary)] font-bold">{formatCurrency(item.value)}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="app-surface-card rounded-2xl p-6">
          <h4 className="label-premium text-[var(--text-primary)] mb-6">Taxa de economia (6 meses)</h4>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={savingsRate6Months}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-strong)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis
                  stroke="var(--text-muted)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${Number(value || 0).toFixed(0)}%`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-strong)',
                    borderRadius: '12px',
                  }}
                  formatter={(value) => [`${Number(value || 0).toFixed(2)}%`, 'Taxa de economia']}
                />
                <Line
                  type="monotone"
                  dataKey="savingsRate"
                  stroke="var(--primary)"
                  strokeWidth={3}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="app-surface-card rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h4 className="label-premium text-[var(--text-primary)]">Insights da IA</h4>
          <button
            onClick={generateAIInsight}
            disabled={isGeneratingInsight}
            className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest hover:underline disabled:opacity-50"
          >
            {isGeneratingInsight ? 'Gerando...' : 'Atualizar Insights'}
          </button>
        </div>
        <div className="space-y-4">
          {aiInsight ? (
            <div className="rounded-2xl border border-[color:color-mix(in_srgb,var(--primary)_35%,transparent)] bg-[color:var(--primary-soft)] p-5">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={16} className="text-[var(--primary)]" />
                <span className="text-xs font-bold text-[var(--primary)] uppercase tracking-widest">Insight IA</span>
              </div>
              <p className="text-sm font-semibold text-[var(--text-muted)]">Análise personalizada</p>
              <p className="mt-2 text-xl font-black text-[var(--text-primary)]">{extractInsightMetric(aiInsight) ?? 'Sem métrica numérica'}</p>
              <div className="mt-2 text-sm text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap">
                {aiInsight}
              </div>
              <p className="mt-3 text-xs font-semibold text-[var(--primary)]">{getInsightActionHint(aiInsight)}</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-[color:color-mix(in_srgb,var(--primary)_35%,transparent)] bg-[color:var(--primary-soft)] p-8 text-center">
              <Sparkles size={32} className="mx-auto mb-4 text-[var(--primary)]" />
              <p className="text-xs font-bold uppercase tracking-widest text-[var(--primary)] mb-2">Insight IA</p>
              <p className="text-sm text-[var(--text-muted)]">
                Clique em &quot;Atualizar Insights&quot; para a IA analisar seus dados financeiros.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

type AssistantTabViewProps = {
  onOpenAssistant: () => void;
};

const AssistantTabView = ({ onOpenAssistant }: AssistantTabViewProps) => (
  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
    <div className="app-surface-card rounded-2xl p-6">
      <h3 className="page-title-premium text-[var(--text-primary)] mb-2">Assistente IA</h3>
      <p className="text-[var(--text-secondary)] text-sm mb-6">
        Converse com o Cote para analisar gastos, metas e investimentos com base nos seus dados atuais.
      </p>
      <button
        onClick={onOpenAssistant}
        className="app-button-primary inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold"
      >
        <MessageSquare size={16} /> Abrir Assistente
      </button>
    </div>
  </div>
);

// --- Modals ---

type GoalModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (goal: GoalFormData) => Promise<void> | void;
  initialData?: Goal | null;
};

const GoalModal = ({ isOpen, onClose, onSubmit, initialData = null }: GoalModalProps) => {
  const getInitialFormData = React.useCallback((): GoalFormData => {
    if (!initialData) {
      return {
        title: '',
        target: '',
        accumulated: formatMoneyInput(0),
        category: GOAL_CATEGORIES[0],
        deadline: '',
      };
    }

    const normalizedDeadline = initialData.deadline
      ? new Date(initialData.deadline).toISOString().split('T')[0]
      : '';

    return {
      title: initialData.name,
      target: formatMoneyInput(initialData.target),
      accumulated: formatMoneyInput(initialData.current),
      category: initialData.category || GOAL_CATEGORIES[0],
      deadline: normalizedDeadline,
    };
  }, [initialData]);

  const [formData, setFormData] = React.useState<GoalFormData>(getInitialFormData);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const titleId = React.useId();
  const categoryId = React.useId();
  const deadlineId = React.useId();

  React.useEffect(() => {
    if (!isOpen) return;
    setFormData(getInitialFormData());
    setIsSubmitting(false);
    setHasAttemptedSubmit(false);
    setSubmitError(null);
  }, [isOpen, getInitialFormData]);

  if (!isOpen) return null;

  const titleInvalid = hasAttemptedSubmit && formData.title.trim().length === 0;
  const targetInvalid = hasAttemptedSubmit && parseMoneyInput(formData.target) <= 0;
  const accumulatedInvalid = hasAttemptedSubmit && parseMoneyInput(formData.accumulated) < 0;
  const categoryInvalid = hasAttemptedSubmit && formData.category.trim().length === 0;

  const isValid = !titleInvalid && !targetInvalid && !accumulatedInvalid && !categoryInvalid;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    setHasAttemptedSubmit(true);
    setSubmitError(null);
    if (!isValid) return;

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Falha ao salvar meta.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="theme-modal-backdrop fixed inset-0 z-[110] flex items-center justify-center bg-[var(--bg-app)] p-4 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="theme-modal-surface w-full max-w-lg rounded-3xl p-5 shadow-2xl sm:p-6"
      >
        <FormContainer
          title={initialData ? 'Editar meta' : 'Nova meta'}
          onClose={onClose}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          error={submitError}
          actions={
            <>
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="app-button-secondary rounded-xl px-4 py-2 text-sm font-bold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!isValid || isSubmitting}
                className="app-button-primary rounded-xl px-4 py-2 text-sm font-bold"
              >
                {isSubmitting ? 'Salvando...' : initialData ? 'Salvar alterações' : 'Criar meta'}
              </button>
            </>
          }
        >
          <FormField label="Título" htmlFor={titleId} required error={titleInvalid ? 'Informe o título da meta.' : null}>
            <input
              id={titleId}
              type="text"
              value={formData.title}
              onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Ex.: Reserva de emergência"
              className={cn('app-field w-full rounded-xl px-4 py-2 text-sm', titleInvalid && 'app-field-error')}
            />
          </FormField>

          <FormGrid>
            <FormField label="Meta (R$)" required error={targetInvalid ? 'Informe um valor maior que zero.' : null}>
              <MoneyInput
                value={formData.target}
                onChange={(value) => setFormData((prev) => ({ ...prev, target: value }))}
                placeholder="R$ 0,00"
                className={cn('app-field w-full rounded-xl px-4 py-2 text-sm', targetInvalid && 'app-field-error')}
              />
            </FormField>

            <FormField label="Acumulado (R$)" error={accumulatedInvalid ? 'O acumulado não pode ser negativo.' : null}>
              <MoneyInput
                value={formData.accumulated}
                onChange={(value) => setFormData((prev) => ({ ...prev, accumulated: value }))}
                placeholder="R$ 0,00"
                className={cn('app-field w-full rounded-xl px-4 py-2 text-sm', accumulatedInvalid && 'app-field-error')}
              />
            </FormField>

            <FormField label="Categoria" htmlFor={categoryId} required error={categoryInvalid ? 'Selecione uma categoria.' : null}>
              <select
                id={categoryId}
                value={formData.category}
                onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
                className={cn('app-field w-full rounded-xl px-4 py-2 text-sm', categoryInvalid && 'app-field-error')}
              >
                {GOAL_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Prazo" htmlFor={deadlineId} hint="Opcional">
              <PremiumDatePicker
                id={deadlineId}
                value={formData.deadline}
                onChange={(value) => setFormData((prev) => ({ ...prev, deadline: value }))}
                placeholder="Selecione a data"
              />
            </FormField>
          </FormGrid>
        </FormContainer>
      </motion.div>
    </div>
  );
};

type InvestmentModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (inv: InvestmentFormData) => Promise<void> | void;
  wallets: WalletAccount[];
  initialData?: Investment | null;
};

const InvestmentModal = ({ isOpen, onClose, onSubmit, wallets, initialData = null }: InvestmentModalProps) => {
  const getInitialFormData = React.useCallback((): InvestmentFormData => {
    if (!initialData) {
      return {
        name: '',
        type: INVESTMENT_TYPES[0],
        walletId: wallets[0]?.id || '',
        invested: '',
        current: '',
        expectedReturnAnnual: '',
      };
    }

    const matchedWalletId =
      initialData.walletId ||
      wallets.find((wallet) => wallet.name === initialData.walletName || wallet.name === initialData.institution)?.id ||
      '';

    return {
      name: initialData.label,
      type: initialData.type,
      walletId: matchedWalletId,
      invested: formatMoneyInput(initialData.invested),
      current: formatMoneyInput(initialData.value),
      expectedReturnAnnual: String(initialData.expectedReturnAnnual),
    };
  }, [initialData, wallets]);

  const [formData, setFormData] = React.useState<InvestmentFormData>(getInitialFormData);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const nameId = React.useId();
  const typeId = React.useId();
  const walletId = React.useId();
  const returnId = React.useId();

  React.useEffect(() => {
    if (!isOpen) return;
    setFormData(getInitialFormData());
    setIsSubmitting(false);
    setHasAttemptedSubmit(false);
    setSubmitError(null);
  }, [isOpen, getInitialFormData]);

  if (!isOpen) return null;

  const nameInvalid = hasAttemptedSubmit && formData.name.trim().length === 0;
  const walletInvalid = hasAttemptedSubmit && formData.walletId.trim().length === 0;
  const investedInvalid = hasAttemptedSubmit && parseMoneyInput(formData.invested) < 0;
  const currentInvalid = hasAttemptedSubmit && parseMoneyInput(formData.current) < 0;
  const returnInvalid = hasAttemptedSubmit && Number(formData.expectedReturnAnnual) < 0;

  const isValid = !nameInvalid && !walletInvalid && !investedInvalid && !currentInvalid && !returnInvalid;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    setHasAttemptedSubmit(true);
    setSubmitError(null);
    if (!isValid) return;

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Falha ao salvar investimento.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="theme-modal-backdrop fixed inset-0 z-[110] flex items-center justify-center bg-[var(--bg-app)] p-4 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="theme-modal-surface w-full max-w-lg rounded-3xl p-5 shadow-2xl sm:p-6"
      >
        <FormContainer
          title={initialData ? 'Editar investimento' : 'Novo investimento'}
          onClose={onClose}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          error={submitError}
          actions={
            <>
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="app-button-secondary rounded-xl px-4 py-2 text-sm font-bold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!isValid || isSubmitting}
                className="app-button-primary rounded-xl px-4 py-2 text-sm font-bold"
              >
                {isSubmitting ? 'Salvando...' : initialData ? 'Salvar alterações' : 'Adicionar investimento'}
              </button>
            </>
          }
        >
          <FormField label="Nome" htmlFor={nameId} required error={nameInvalid ? 'Informe o nome do investimento.' : null}>
            <input
              id={nameId}
              type="text"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Ex: Tesouro Selic 2029"
              className={cn('app-field w-full rounded-xl px-4 py-2 text-sm', nameInvalid && 'app-field-error')}
            />
          </FormField>

          <FormGrid>
            <FormField label="Tipo" htmlFor={typeId}>
              <select
                id={typeId}
                value={formData.type}
                onChange={(e) => setFormData((prev) => ({ ...prev, type: e.target.value }))}
                className="app-field w-full rounded-xl px-4 py-2 text-sm"
              >
                {INVESTMENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Carteira" htmlFor={walletId} required error={walletInvalid ? 'Selecione uma carteira.' : null}>
              <select
                id={walletId}
                value={formData.walletId}
                onChange={(e) => setFormData((prev) => ({ ...prev, walletId: e.target.value }))}
                className={cn('app-field w-full rounded-xl px-4 py-2 text-sm', walletInvalid && 'app-field-error')}
              >
                <option value="">Selecione uma carteira</option>
                {wallets.map((wallet) => (
                  <option key={wallet.id} value={wallet.id}>
                    {wallet.name}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Valor investido (R$)" error={investedInvalid ? 'O valor investido não pode ser negativo.' : null}>
              <MoneyInput
                value={formData.invested}
                onChange={(value) => setFormData((prev) => ({ ...prev, invested: value }))}
                placeholder="R$ 0,00"
                className={cn('app-field w-full rounded-xl px-4 py-2 text-sm', investedInvalid && 'app-field-error')}
              />
            </FormField>

            <FormField label="Valor atual (R$)" error={currentInvalid ? 'O valor atual não pode ser negativo.' : null}>
              <MoneyInput
                value={formData.current}
                onChange={(value) => setFormData((prev) => ({ ...prev, current: value }))}
                placeholder="R$ 0,00"
                className={cn('app-field w-full rounded-xl px-4 py-2 text-sm', currentInvalid && 'app-field-error')}
              />
            </FormField>

            <FormField
              label="Retorno esperado (% a.a.)"
              htmlFor={returnId}
              className="sm:col-span-2"
              error={returnInvalid ? 'O retorno esperado deve ser zero ou positivo.' : null}
            >
              <input
                id={returnId}
                type="number"
                min="0"
                step="0.01"
                value={formData.expectedReturnAnnual}
                onChange={(e) => setFormData((prev) => ({ ...prev, expectedReturnAnnual: e.target.value }))}
                placeholder="0.00"
                className={cn('app-field w-full rounded-xl px-4 py-2 text-sm', returnInvalid && 'app-field-error')}
              />
            </FormField>
          </FormGrid>
        </FormContainer>
      </motion.div>
    </div>
  );
};

type DebtModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (debt: DebtFormData) => Promise<void> | void;
  initialData?: Debt | null;
  initialDraft?: Partial<DebtFormData> | null;
};

const DebtModal = ({ isOpen, onClose, onSubmit, initialData = null, initialDraft = null }: DebtModalProps) => {
  const getInitialFormData = React.useCallback((): DebtFormData => {
    if (!initialData) {
      const draftCategory =
        typeof initialDraft?.category === 'string' && DEBT_CATEGORIES.includes(initialDraft.category)
          ? initialDraft.category
          : DEBT_CATEGORIES[0];

      return {
        creditor: initialDraft?.creditor ?? '',
        originalAmount: initialDraft?.originalAmount ?? '',
        paidAmount: initialDraft?.paidAmount ?? '0',
        remainingAmount: initialDraft?.remainingAmount ?? '',
        hasInterest: initialDraft?.hasInterest ?? Number(initialDraft?.interestRateMonthly ?? 0) > 0,
        interestRateMonthly: initialDraft?.interestRateMonthly ?? '0',
        dueDate: initialDraft?.dueDate ?? getDefaultDebtDueDateInput(),
        category: draftCategory,
        status: initialDraft?.status ?? 'Em aberto',
      };
    }

    return {
      creditor: initialData.creditor,
      originalAmount: formatMoneyInput(initialData.originalAmount),
      paidAmount: formatMoneyInput(Math.max(0, initialData.originalAmount - initialData.remainingAmount)),
      remainingAmount: formatMoneyInput(initialData.remainingAmount),
      hasInterest: initialData.interestRateMonthly > 0,
      interestRateMonthly: String(initialData.interestRateMonthly),
      dueDate: initialData.dueDate ?? toInputDateValue(getDebtDueDateValue(initialData)),
      category: initialData.category,
      status: initialData.status,
    };
  }, [initialData, initialDraft]);

  const [formData, setFormData] = React.useState<DebtFormData>(getInitialFormData);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const creditorId = React.useId();
  const paidId = React.useId();
  const hasInterestId = React.useId();
  const interestId = React.useId();
  const dueDateId = React.useId();
  const categoryId = React.useId();

  React.useEffect(() => {
    if (!isOpen) return;
    setFormData(getInitialFormData());
    setIsSubmitting(false);
    setHasAttemptedSubmit(false);
    setSubmitError(null);
  }, [isOpen, getInitialFormData]);

  if (!isOpen) return null;

  const originalAmountValue = parseMoneyInput(formData.originalAmount);
  const paidAmountValue = parseMoneyInput(formData.paidAmount);
  const creditorInvalid = hasAttemptedSubmit && formData.creditor.trim().length === 0;
  const originalInvalid = hasAttemptedSubmit && originalAmountValue <= 0;
  const paidInvalid =
    hasAttemptedSubmit && (paidAmountValue < 0 || (originalAmountValue > 0 && paidAmountValue > originalAmountValue));
  const interestInvalid = hasAttemptedSubmit && formData.hasInterest && Number(formData.interestRateMonthly) < 0;
  const dueDateInvalid = hasAttemptedSubmit && !Boolean(parseInputDateValue(formData.dueDate));

  const isValid =
    !creditorInvalid &&
    !originalInvalid &&
    !paidInvalid &&
    !interestInvalid &&
    !dueDateInvalid;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    setHasAttemptedSubmit(true);
    setSubmitError(null);
    if (!isValid) return;

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Falha ao salvar dívida.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="theme-modal-backdrop fixed inset-0 z-[110] flex items-center justify-center bg-[var(--bg-app)] p-4 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="theme-modal-surface w-full max-w-lg rounded-3xl p-5 shadow-2xl sm:p-6"
      >
        <FormContainer
          title={initialData ? 'Editar dívida avulsa' : 'Nova dívida avulsa'}
          subtitle="Use para obrigações específicas com valor total definido."
          onClose={onClose}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          error={submitError}
          actions={
            <>
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="app-button-secondary rounded-xl px-4 py-2 text-sm font-bold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!isValid || isSubmitting}
                className="app-button-primary rounded-xl px-4 py-2 text-sm font-bold"
              >
                {isSubmitting ? 'Salvando...' : initialData ? 'Salvar alterações' : 'Criar dívida avulsa'}
              </button>
            </>
          }
        >
          <FormField label="Descrição" htmlFor={creditorId} required error={creditorInvalid ? 'Informe a descrição da dívida.' : null}>
            <input
              id={creditorId}
              type="text"
              value={formData.creditor}
              onChange={(e) => setFormData((prev) => ({ ...prev, creditor: e.target.value }))}
              className={cn('app-field w-full rounded-xl px-4 py-2 text-sm', creditorInvalid && 'app-field-error')}
              placeholder="Ex: Banco X"
            />
          </FormField>

          <FormGrid>
            <FormField label="Valor total" required error={originalInvalid ? 'Informe um valor total maior que zero.' : null}>
              <MoneyInput
                value={formData.originalAmount}
                onChange={(value) => setFormData((prev) => ({ ...prev, originalAmount: value }))}
                placeholder="R$ 0,00"
                className={cn('app-field w-full rounded-xl px-4 py-2 text-sm', originalInvalid && 'app-field-error')}
              />
            </FormField>

            <FormField
              label="Valor já pago"
              htmlFor={paidId}
              error={paidInvalid ? 'Informe um valor entre zero e o valor total.' : null}
            >
              <MoneyInput
                value={formData.paidAmount}
                onChange={(value) => setFormData((prev) => ({ ...prev, paidAmount: value }))}
                placeholder="R$ 0,00"
                className={cn('app-field w-full rounded-xl px-4 py-2 text-sm', paidInvalid && 'app-field-error')}
              />
            </FormField>

            <FormField label="Data do vencimento" htmlFor={dueDateId} required error={dueDateInvalid ? 'Selecione uma data válida.' : null}>
              <PremiumDatePicker
                id={dueDateId}
                value={formData.dueDate}
                onChange={(value) => setFormData((prev) => ({ ...prev, dueDate: value }))}
                placeholder="Selecione a data"
                invalid={dueDateInvalid}
              />
            </FormField>

            <FormField label="Categoria" htmlFor={categoryId} className="sm:col-span-1">
              <select
                id={categoryId}
                value={formData.category}
                onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
                className="app-field w-full rounded-xl px-4 py-2 text-sm"
              >
                {DEBT_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Possui juros?" htmlFor={hasInterestId}>
              <label className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                <input
                  id={hasInterestId}
                  type="checkbox"
                  checked={formData.hasInterest}
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      hasInterest: event.target.checked,
                      interestRateMonthly: event.target.checked ? prev.interestRateMonthly : '0',
                    }))
                  }
                  className="size-4 rounded border-[var(--border-default)] bg-[var(--bg-app)]"
                />
                Aplicar taxa de juros mensal
              </label>
            </FormField>
            {formData.hasInterest ? (
              <FormField label="Juros (% ao mês) (opcional)" htmlFor={interestId} error={interestInvalid ? 'A taxa de juros não pode ser negativa.' : null}>
                <input
                  id={interestId}
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.interestRateMonthly}
                  onChange={(e) => setFormData((prev) => ({ ...prev, interestRateMonthly: e.target.value }))}
                  className={cn('app-field w-full rounded-xl px-4 py-2 text-sm', interestInvalid && 'app-field-error')}
                />
              </FormField>
            ) : null}
          </FormGrid>
        </FormContainer>
      </motion.div>
    </div>
  );
};

type RecurringDebtModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (debt: RecurringDebtFormData) => Promise<void> | void;
  initialData?: RecurringDebt | null;
  initialDraft?: Partial<RecurringDebtFormData> | null;
};

const RecurringDebtModal = ({
  isOpen,
  onClose,
  onSubmit,
  initialData = null,
  initialDraft = null,
}: RecurringDebtModalProps) => {
  const getInitialFormData = React.useCallback((): RecurringDebtFormData => {
    if (!initialData) {
      const category =
        typeof initialDraft?.category === 'string' && initialDraft.category.trim().length > 0
          ? initialDraft.category
          : RECURRING_DEBT_PRESETS[0]?.category ?? 'Água';
      return {
        creditor: initialDraft?.creditor ?? getRecurringDebtDescriptionDefault(category),
        amount: initialDraft?.amount ?? '',
        category,
        frequency: initialDraft?.frequency ?? 'MONTHLY',
        interval: initialDraft?.interval ?? '1',
        startDate: initialDraft?.startDate ?? new Date().toISOString().slice(0, 10),
        weekday: initialDraft?.weekday ?? String(parseInputDateValue(initialDraft?.startDate || '')?.getDay() ?? new Date().getDay()),
        endDate: initialDraft?.endDate ?? '',
        notes: initialDraft?.notes ?? '',
        source: initialDraft?.source,
        legacyDebtId: initialDraft?.legacyDebtId ?? null,
      };
    }

    return {
      creditor: initialData.creditor,
      amount: formatMoneyInput(initialData.amount),
      category: initialData.category,
      frequency: initialData.frequency,
      interval: String(initialData.interval),
      startDate: initialData.startDate ? String(initialData.startDate).slice(0, 10) : new Date().toISOString().slice(0, 10),
      weekday: String(parseInputDateValue(initialData.startDate ? String(initialData.startDate).slice(0, 10) : '')?.getDay() ?? new Date().getDay()),
      endDate: initialData.endDate ? String(initialData.endDate).slice(0, 10) : '',
      notes: initialData.notes ?? '',
      source: initialData.source,
      legacyDebtId: initialData.legacyDebtId ?? null,
    };
  }, [initialData, initialDraft]);

  const [formData, setFormData] = React.useState<RecurringDebtFormData>(getInitialFormData);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [isDescriptionManuallyEdited, setIsDescriptionManuallyEdited] = React.useState(false);
  const descriptionId = React.useId();
  const frequencyId = React.useId();
  const intervalId = React.useId();
  const startDateId = React.useId();
  const weekdayId = React.useId();
  const endDateId = React.useId();

  React.useEffect(() => {
    if (!isOpen) return;
    const initialFormData = getInitialFormData();
    setFormData(initialFormData);
    setIsDescriptionManuallyEdited(initialFormData.creditor.trim() !== getRecurringDebtDescriptionDefault(initialFormData.category));
    setIsSubmitting(false);
    setHasAttemptedSubmit(false);
    setSubmitError(null);
  }, [isOpen, getInitialFormData]);

  if (!isOpen) return null;

  const isWeekly = formData.frequency === 'WEEKLY';
  const isMonthly = formData.frequency === 'MONTHLY';
  const frequencyIntervalUnit =
    formData.frequency === 'MONTHLY'
      ? 'mês(es)'
      : formData.frequency === 'WEEKLY'
        ? 'semana(s)'
        : formData.frequency === 'YEARLY'
          ? 'ano(s)'
          : 'trimestre(s)';
  const availableFrequencyOptions =
    formData.frequency === 'QUARTERLY'
      ? [
          { value: 'WEEKLY', label: 'Semanal' },
          { value: 'MONTHLY', label: 'Mensal' },
          { value: 'YEARLY', label: 'Anual' },
          { value: 'QUARTERLY', label: 'Trimestral (legado)' },
        ]
      : RECURRING_DEBT_FREQUENCIES.filter((item) => item.value !== 'QUARTERLY');

  const descriptionInvalid = hasAttemptedSubmit && formData.creditor.trim().length === 0;
  const amountInvalid = hasAttemptedSubmit && parseMoneyInput(formData.amount) <= 0;
  const categoryInvalid = hasAttemptedSubmit && formData.category.trim().length === 0;
  const intervalInvalid = hasAttemptedSubmit && !isMonthly && Number(formData.interval) < 1;
  const startDateInvalid = hasAttemptedSubmit && formData.startDate.trim().length === 0;

  const isValid =
    !descriptionInvalid &&
    !amountInvalid &&
    !categoryInvalid &&
    !intervalInvalid &&
    !startDateInvalid;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    setHasAttemptedSubmit(true);
    setSubmitError(null);
    if (!isValid) return;

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Falha ao salvar recorrência.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="theme-modal-backdrop fixed inset-0 z-[110] flex items-center justify-center bg-[var(--bg-app)] p-4 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="theme-modal-surface w-full max-w-2xl rounded-3xl p-5 shadow-2xl sm:p-6"
      >
        <FormContainer
          title={initialData ? 'Editar recorrência' : 'Nova dívida recorrente'}
          subtitle="Use para cobranças recorrentes com frequência e primeira cobrança definidas."
          onClose={onClose}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          error={submitError}
          actions={
            <>
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="app-button-secondary rounded-xl px-4 py-2 text-sm font-bold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!isValid || isSubmitting}
                className="app-button-primary rounded-xl px-4 py-2 text-sm font-bold"
              >
                {isSubmitting ? 'Salvando...' : initialData ? 'Salvar recorrência' : 'Criar recorrência'}
              </button>
            </>
          }
        >
          <FormGrid>
            <FormField
              label="Descrição"
              htmlFor={descriptionId}
              required
              error={descriptionInvalid ? 'Informe a descrição da cobrança.' : null}
            >
              <input
                id={descriptionId}
                type="text"
                value={formData.creditor}
                onChange={(e) => {
                  const nextValue = e.target.value;
                  setFormData((prev) => ({ ...prev, creditor: nextValue }));
                  setIsDescriptionManuallyEdited(nextValue.trim() !== getRecurringDebtDescriptionDefault(formData.category));
                }}
                className={cn('app-field w-full rounded-xl px-4 py-2 text-sm', descriptionInvalid && 'app-field-error')}
                placeholder="Ex: Aluguel"
              />
            </FormField>

            <FormField label="Valor da cobrança" required error={amountInvalid ? 'Informe um valor maior que zero.' : null}>
              <MoneyInput
                value={formData.amount}
                onChange={(value) => setFormData((prev) => ({ ...prev, amount: value }))}
                placeholder="R$ 0,00"
                className={cn('app-field w-full rounded-xl px-4 py-2 text-sm', amountInvalid && 'app-field-error')}
              />
            </FormField>

            <FormField label="Categoria" required error={categoryInvalid ? 'Selecione uma categoria.' : null}>
              <select
                value={formData.category}
                onChange={(e) =>
                  setFormData((prev) => {
                    const nextCategory = e.target.value;
                    const nextDescription = isDescriptionManuallyEdited
                      ? prev.creditor
                      : getRecurringDebtDescriptionDefault(nextCategory);
                    return {
                      ...prev,
                      category: nextCategory,
                      creditor: nextDescription,
                    };
                  })
                }
                className={cn('app-field w-full rounded-xl px-4 py-2 text-sm', categoryInvalid && 'app-field-error')}
              >
                {[...RECURRING_DEBT_PRESETS.map((item) => item.category), 'Outros']
                  .filter((value, index, array) => array.indexOf(value) === index)
                  .map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
              </select>
            </FormField>

            <FormField label="Frequência" htmlFor={frequencyId}>
              <select
                id={frequencyId}
                value={formData.frequency}
                onChange={(e) =>
                  setFormData((prev) => {
                    const nextFrequency = e.target.value as RecurringDebtFormData['frequency'];
                    const nextStartDate =
                      nextFrequency === 'WEEKLY' ? alignDateToWeekday(prev.startDate, prev.weekday) : prev.startDate;

                    return {
                      ...prev,
                      frequency: nextFrequency,
                      interval: nextFrequency === 'MONTHLY' ? '1' : prev.interval,
                      startDate: nextStartDate,
                    };
                  })
                }
                className="app-field w-full rounded-xl px-4 py-2 text-sm"
              >
                {availableFrequencyOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </FormField>

            {!isMonthly ? (
              <FormField label="A cada" htmlFor={intervalId} required error={intervalInvalid ? 'Use um intervalo mínimo de 1.' : null}>
                <div className="flex items-center gap-2">
                  <input
                    id={intervalId}
                    type="number"
                    min={1}
                    value={formData.interval}
                    onChange={(e) => setFormData((prev) => ({ ...prev, interval: e.target.value }))}
                    className={cn('app-field w-24 rounded-xl px-4 py-2 text-sm', intervalInvalid && 'app-field-error')}
                  />
                  <span className="text-sm font-semibold text-[var(--text-secondary)]">{frequencyIntervalUnit}</span>
                </div>
              </FormField>
            ) : null}

            <FormField label="Primeira cobrança" htmlFor={startDateId} required error={startDateInvalid ? 'Informe a primeira cobrança.' : null}>
              <PremiumDatePicker
                id={startDateId}
                value={formData.startDate}
                onChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    startDate: value,
                    weekday: String(parseInputDateValue(value)?.getDay() ?? prev.weekday),
                  }))
                }
                placeholder="Selecione a data"
                invalid={startDateInvalid}
              />
            </FormField>

            <FormField label="Data final (opcional)" htmlFor={endDateId}>
              <PremiumDatePicker
                id={endDateId}
                value={formData.endDate}
                onChange={(value) => setFormData((prev) => ({ ...prev, endDate: value }))}
                placeholder="Selecione a data"
              />
            </FormField>

            {isWeekly ? (
              <FormField label="Dia da semana" htmlFor={weekdayId} className="sm:col-span-2">
                <select
                  id={weekdayId}
                  value={formData.weekday}
                  onChange={(event) =>
                    setFormData((prev) => {
                      const weekday = event.target.value;
                      return {
                        ...prev,
                        weekday,
                        startDate: alignDateToWeekday(prev.startDate, weekday),
                      };
                    })
                  }
                  className="app-field w-full rounded-xl px-4 py-2 text-sm"
                >
                  {Object.entries(WEEKDAY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </FormField>
            ) : null}

            <FormField label="Observações" className="sm:col-span-2" hint="Opcional">
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                rows={3}
                className="app-field w-full resize-none rounded-xl px-4 py-2 text-sm"
                placeholder="Ex.: cobrança obrigatória do condomínio"
              />
            </FormField>
          </FormGrid>
        </FormContainer>
      </motion.div>
    </div>
  );
};

type TransactionModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (tx: TransactionFormData) => Promise<boolean | void> | boolean | void;
  onSuggestCategory?: (description: string) => Promise<string | null>;
  onParseReceipt?: (
    file: File
  ) => Promise<
    | {
        amount?: number | null;
        date?: string | null;
        description?: string | null;
        receiptUrl?: string | null;
      }
    | null
  >;
  walletOptions: WalletAccount[];
  customCategories?: CustomTransactionCategoryBuckets;
  onCreateCategory?: (flowType: 'Entrada' | 'Saida', categoryName: string) => void;
  initialData?: Transaction | null;
  initialDraft?: Partial<TransactionFormData> | null;
};

const TransactionModal = ({
  isOpen,
  onClose,
  onSubmit,
  onSuggestCategory,
  onParseReceipt,
  walletOptions,
  customCategories = { income: [], expense: [] },
  onCreateCategory,
  initialData = null,
  initialDraft = null,
}: TransactionModalProps) => {
  const fallbackWalletChoices = React.useMemo(() => ['Carteira principal'], []);

  const walletChoices = React.useMemo(() => {
    const names = walletOptions
      .map((wallet) => wallet.name.trim())
      .filter((name, index, array) => name.length > 0 && array.indexOf(name) === index);

    return names.length > 0 ? names : fallbackWalletChoices;
  }, [fallbackWalletChoices, walletOptions]);

  const normalizeWalletSelection = React.useCallback(
    (value?: string | null) => {
      if (value && walletChoices.includes(value)) {
        return value;
      }

      return walletChoices[0] || fallbackWalletChoices[0];
    },
    [fallbackWalletChoices, walletChoices]
  );

  const normalizeDestinationWalletSelection = React.useCallback(
    (value?: string | null, sourceWallet?: string | null) => {
      const alternatives = walletChoices.filter((wallet) => wallet !== sourceWallet);
      if (value && alternatives.includes(value)) {
        return value;
      }

      return alternatives[0] || '';
    },
    [walletChoices]
  );

  const getInitialFormData = React.useCallback((): TransactionFormData => {
    if (!initialData) {
      const draftFlowType = initialDraft?.flowType || 'Saida';
      const draftWallet = normalizeWalletSelection(initialDraft?.wallet);
      const normalizedPaymentMethod =
        initialDraft?.paymentMethod ||
        (draftFlowType === 'Transferência' ? 'Transferência bancária' : 'PIX');

      return {
        description: '',
        amount: '',
        flowType: draftFlowType,
        incomeScheduleMode: initialDraft?.incomeScheduleMode ?? 'SINGLE',
        recurrenceFrequency: initialDraft?.recurrenceFrequency ?? 'MONTHLY',
        recurrenceEndDate: initialDraft?.recurrenceEndDate ?? '',
        category: getDefaultCategoryForFlow(draftFlowType),
        receiptUrl: null,
        date: new Date().toISOString().split('T')[0],
        ...initialDraft,
        wallet: draftWallet,
        destinationWallet:
          draftFlowType === 'Transferência'
            ? normalizeDestinationWalletSelection(initialDraft?.destinationWallet, draftWallet)
            : '',
        paymentMethod: normalizedPaymentMethod,
      };
    }

    const parsedDate = parseTransactionDate(initialData.date) ?? new Date();
    const normalizedDate = new Date(parsedDate.getTime() - parsedDate.getTimezoneOffset() * 60000)
      .toISOString()
      .split('T')[0];

    return {
      description: initialData.desc,
      amount: formatMoneyInput(parseCurrency(initialData.amount)),
      flowType: initialData.flowType,
      incomeScheduleMode: 'SINGLE',
      recurrenceFrequency: 'MONTHLY',
      recurrenceEndDate: '',
      category: initialData.cat || 'Outros',
      paymentMethod: initialData.paymentMethod || getDefaultPaymentMethodForFlow(initialData.flowType),
      wallet: normalizeWalletSelection(initialData.wallet),
      destinationWallet:
        initialData.flowType === 'Transferência'
          ? normalizeDestinationWalletSelection(initialData.destinationWallet, initialData.wallet)
          : '',
      receiptUrl: initialData.receiptUrl || null,
      date: normalizedDate,
    };
  }, [initialData, initialDraft, normalizeDestinationWalletSelection, normalizeWalletSelection]);

  const [formData, setFormData] = React.useState<TransactionFormData>(getInitialFormData);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [suggestedCategory, setSuggestedCategory] = React.useState<string | null>(null);
  const [isLoadingSuggestion, setIsLoadingSuggestion] = React.useState(false);
  const [isParsingReceipt, setIsParsingReceipt] = React.useState(false);
  const [receiptStatus, setReceiptStatus] = React.useState<string | null>(null);
  const [selectedReceiptName, setSelectedReceiptName] = React.useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = React.useState('');
  const [newCategoryError, setNewCategoryError] = React.useState<string | null>(null);
  const receiptInputRef = React.useRef<HTMLInputElement | null>(null);
  const descriptionId = React.useId();
  const dateId = React.useId();
  const categoryId = React.useId();
  const paymentMethodId = React.useId();
  const recurrenceFrequencyId = React.useId();
  const recurrenceEndDateId = React.useId();
  const walletId = React.useId();
  const destinationWalletId = React.useId();
  const recurrenceFrequencyOptions = React.useMemo(
    () =>
      [
        { value: 'MONTHLY' as const, label: 'Mensal' },
        { value: 'WEEKLY' as const, label: 'Semanal' },
        { value: 'YEARLY' as const, label: 'Anual' },
      ] satisfies Array<{ value: IncomeRecurrenceFrequency; label: string }>,
    []
  );

  const availableCategories = React.useMemo(() => {
    const base = getAvailableCategoriesForFlow(formData.flowType);
    if (formData.flowType === 'Entrada') {
      return mergeTransactionCategoryLists(base, customCategories.income);
    }
    if (formData.flowType === 'Saida') {
      return mergeTransactionCategoryLists(base, customCategories.expense);
    }
    return base;
  }, [customCategories.expense, customCategories.income, formData.flowType]);

  React.useEffect(() => {
    if (!isOpen) return;
    setFormData(getInitialFormData());
    setIsSubmitting(false);
    setHasAttemptedSubmit(false);
    setSubmitError(null);
    setSuggestedCategory(null);
    setIsLoadingSuggestion(false);
    setIsParsingReceipt(false);
    setReceiptStatus(null);
    setSelectedReceiptName(null);
    setNewCategoryName('');
    setNewCategoryError(null);
  }, [isOpen, getInitialFormData]);

  React.useEffect(() => {
    if (!availableCategories.includes(formData.category)) {
      setFormData((prev) => ({
        ...prev,
        category: getDefaultCategoryForFlow(prev.flowType),
      }));
    }
  }, [availableCategories, formData.category]);

  React.useEffect(() => {
    if (!isOpen) return;

    setFormData((prev) => {
      const nextWallet = normalizeWalletSelection(prev.wallet);
      const nextDestinationWallet =
        prev.flowType === 'Transferência'
          ? normalizeDestinationWalletSelection(prev.destinationWallet, nextWallet)
          : '';

      if (nextWallet === prev.wallet && nextDestinationWallet === prev.destinationWallet) {
        return prev;
      }

      return {
        ...prev,
        wallet: nextWallet,
        destinationWallet: nextDestinationWallet,
      };
    });
  }, [isOpen, normalizeDestinationWalletSelection, normalizeWalletSelection]);

  React.useEffect(() => {
    if (!isOpen || !onSuggestCategory) return;
    const description = formData.description.trim();
    if (description.length < 3) {
      setSuggestedCategory(null);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setIsLoadingSuggestion(true);
      try {
        const suggestion = await onSuggestCategory(description);
        if (!cancelled) {
          setSuggestedCategory(suggestion);
        }
      } catch {
        if (!cancelled) {
          setSuggestedCategory(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingSuggestion(false);
        }
      }
    }, 320);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [formData.description, isOpen, onSuggestCategory]);

  const handleReceiptUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !onParseReceipt) return;

    setSubmitError(null);
    setSelectedReceiptName(file.name);
    setIsParsingReceipt(true);
    setReceiptStatus('Analisando comprovante...');
    try {
      const parsed = await onParseReceipt(file);
      if (parsed) {
        setFormData((prev) => ({
          ...prev,
          amount:
            typeof parsed.amount === 'number' && parsed.amount > 0
              ? formatMoneyInput(parsed.amount)
              : prev.amount,
          date: parsed.date || prev.date,
          description: parsed.description || prev.description,
          receiptUrl: parsed.receiptUrl || prev.receiptUrl,
        }));
        setReceiptStatus('Dados detectados automaticamente. Revise antes de salvar.');
      } else {
        setReceiptStatus('N?o foi poss?vel extrair dados do comprovante.');
      }
    } catch {
      setReceiptStatus('Falha ao processar comprovante.');
    } finally {
      setIsParsingReceipt(false);
      event.target.value = '';
    }
  };

  if (!isOpen) return null;

  const parsedAmount = parseMoneyInput(formData.amount);
  const isIncomeFlow = formData.flowType === 'Entrada';
  const isTransferFlow = mapFlowTypeToBaseType(formData.flowType) === 'transfer';
  const canUseRecurringIncome = isIncomeFlow && !initialData;
  const isRecurringIncome = canUseRecurringIncome && formData.incomeScheduleMode === 'RECURRING';
  const hasDescription = formData.description.trim().length > 0;
  const hasCategory = formData.category.trim().length > 0;
  const hasWallet = formData.wallet.trim().length > 0;
  const hasDate = formData.date.trim().length > 0;
  const hasValidRecurrenceEndDate =
    !isRecurringIncome ||
    !formData.recurrenceEndDate.trim() ||
    new Date(`${formData.recurrenceEndDate}T00:00:00`).getTime() >=
      new Date(`${formData.date}T00:00:00`).getTime();
  const hasValidDestinationWallet =
    !isTransferFlow ||
    (formData.destinationWallet.trim().length > 0 && formData.destinationWallet !== formData.wallet);

  const isValid =
    hasDescription &&
    parsedAmount > 0 &&
    hasCategory &&
    hasWallet &&
    hasValidDestinationWallet &&
    hasDate &&
    hasValidRecurrenceEndDate;

  const amountInvalid = hasAttemptedSubmit && parsedAmount <= 0;
  const descriptionInvalid = hasAttemptedSubmit && !hasDescription;
  const categoryInvalid = hasAttemptedSubmit && !hasCategory;
  const walletInvalid = hasAttemptedSubmit && !hasWallet;
  const dateInvalid = hasAttemptedSubmit && !hasDate;
  const recurrenceEndDateInvalid = hasAttemptedSubmit && !hasValidRecurrenceEndDate;
  const destinationWalletInvalid = hasAttemptedSubmit && isTransferFlow && !hasValidDestinationWallet;
  const canCreateInlineCategory = (formData.flowType === 'Entrada' || formData.flowType === 'Saida') && formData.category === 'Outros';

  const handleCreateCategory = () => {
    if (!canCreateInlineCategory || !onCreateCategory) return;
    if (formData.flowType !== 'Entrada' && formData.flowType !== 'Saida') return;

    const normalizedLabel = normalizeCustomCategoryLabel(newCategoryName);
    if (normalizedLabel.length < 2) {
      setNewCategoryError('Informe pelo menos 2 caracteres.');
      return;
    }

    const alreadyExists = availableCategories.some(
      (category) => category.toLocaleLowerCase('pt-BR') === normalizedLabel.toLocaleLowerCase('pt-BR')
    );
    if (alreadyExists) {
      setNewCategoryError('Essa categoria já existe.');
      return;
    }

    onCreateCategory(formData.flowType, normalizedLabel);
    setFormData((prev) => ({ ...prev, category: normalizedLabel }));
    setNewCategoryName('');
    setNewCategoryError(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    setHasAttemptedSubmit(true);
    setSubmitError(null);
    if (!isValid) return;

    setIsSubmitting(true);
    try {
      const shouldClose = await onSubmit(formData);
      if (shouldClose !== false) {
        onClose();
      }
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Falha ao salvar transação.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="theme-modal-backdrop fixed inset-0 z-[110] flex items-end justify-center overflow-x-hidden overflow-y-hidden bg-[var(--bg-app)] p-0 sm:items-center sm:p-4">
      <motion.div
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="theme-modal-surface hide-scrollbar box-border w-[calc(100vw-0.75rem)] max-w-[calc(100vw-0.75rem)] max-h-[92dvh] overflow-x-hidden overflow-y-auto overscroll-contain rounded-t-[1.75rem] px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 shadow-2xl sm:my-6 sm:w-full sm:max-w-lg sm:max-h-[calc(100dvh-3rem)] sm:rounded-3xl sm:p-6"
        style={{
          WebkitOverflowScrolling: 'touch',
          msOverflowStyle: 'none',
          scrollbarWidth: 'none',
        }}
      >
        <div className="mb-4 flex justify-center sm:hidden">
          <div className="h-1.5 w-12 rounded-full bg-[var(--bg-surface-elevated)]" />
        </div>

        <FormContainer
          title={initialData ? 'Editar transação' : 'Nova transação'}
          subtitle="Padrão único para entradas, saidas e transferências em fluxo compacto."
          onClose={onClose}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          error={submitError}
          bodyClassName="space-y-3.5"
          actions={
            <>
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="app-button-secondary rounded-xl px-4 py-2 text-sm font-bold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="app-button-primary rounded-xl px-4 py-2 text-sm font-bold"
              >
                {isSubmitting ? 'Salvando...' : initialData ? 'Salvar transação' : 'Criar transação'}
              </button>
            </>
          }
        >
          <FormGrid>
            <FormField label="Tipo da transação" className="sm:col-span-2">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {TRANSACTION_FLOW_TYPES.map((flowType) => (
                  <button
                    key={flowType}
                    type="button"
                    aria-pressed={formData.flowType === flowType}
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        flowType,
                        incomeScheduleMode:
                          flowType === 'Entrada' ? prev.incomeScheduleMode : 'SINGLE',
                        category: getAvailableCategoriesForFlow(flowType).includes(prev.category)
                          ? prev.category
                          : getDefaultCategoryForFlow(flowType),
                        paymentMethod:
                          flowType === 'Transferência'
                            ? 'Transferência bancária'
                            : prev.paymentMethod === 'Transferência bancária'
                              ? 'PIX'
                              : prev.paymentMethod,
                        destinationWallet:
                          flowType === 'Transferência'
                            ? normalizeDestinationWalletSelection(prev.destinationWallet, prev.wallet)
                            : '',
                      }))
                    }
                    className={cn(
                      'app-selection-chip flex min-w-0 items-center justify-between gap-2 rounded-2xl px-3 py-3 text-sm font-bold sm:px-4 sm:py-3.5',
                      formData.flowType === flowType && 'is-selected'
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      {React.createElement(getFlowTypeIcon(flowType), { size: 16 })}
                      <span className="truncate">{flowType}</span>
                    </span>
                    <span className="app-selection-chip-check" aria-hidden="true">
                      <CheckCircle2 size={12} />
                    </span>
                  </button>
                ))}
              </div>
            </FormField>

            {canUseRecurringIncome ? (
              <FormField label="Tipo de entrada" className="sm:col-span-2">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    aria-pressed={formData.incomeScheduleMode === 'SINGLE'}
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        incomeScheduleMode: 'SINGLE',
                      }))
                    }
                    className={cn(
                      'app-selection-chip flex items-center justify-between gap-2 rounded-2xl px-3 py-3 text-sm font-bold sm:px-4 sm:py-3.5',
                      formData.incomeScheduleMode === 'SINGLE' && 'is-selected'
                    )}
                  >
                    <span className="truncate">Entrada única</span>
                    <span className="app-selection-chip-check" aria-hidden="true">
                      <CheckCircle2 size={12} />
                    </span>
                  </button>
                  <button
                    type="button"
                    aria-pressed={formData.incomeScheduleMode === 'RECURRING'}
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        incomeScheduleMode: 'RECURRING',
                      }))
                    }
                    className={cn(
                      'app-selection-chip flex items-center justify-between gap-2 rounded-2xl px-3 py-3 text-sm font-bold sm:px-4 sm:py-3.5',
                      formData.incomeScheduleMode === 'RECURRING' && 'is-selected'
                    )}
                  >
                    <span className="truncate">Entrada recorrente</span>
                    <span className="app-selection-chip-check" aria-hidden="true">
                      <CheckCircle2 size={12} />
                    </span>
                  </button>
                </div>
              </FormField>
            ) : null}

            <FormField
              label="Valor (R$)"
              required
              error={amountInvalid ? 'Informe um valor maior que zero.' : null}
            >
              <MoneyInput
                value={formData.amount}
                onChange={(value) => setFormData((prev) => ({ ...prev, amount: value }))}
                placeholder="R$ 0,00"
                className={cn(
                  'app-field h-11 w-full rounded-xl px-4 text-sm',
                  parsedAmount > 0 && 'app-field-filled',
                  amountInvalid && 'app-field-error'
                )}
              />
            </FormField>

            <FormField
              label="Descrição"
              htmlFor={descriptionId}
              required
              error={descriptionInvalid ? 'Informe a descrição da transação.' : null}
            >
              <input
                id={descriptionId}
                type="text"
                value={formData.description}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, description: event.target.value }))
                }
                placeholder="Ex: Supermercado"
                className={cn(
                  'app-field h-11 w-full rounded-xl px-4 text-sm',
                  hasDescription && 'app-field-filled',
                  descriptionInvalid && 'app-field-error'
                )}
              />
            </FormField>

            {(isLoadingSuggestion || suggestedCategory) && (
              <div className="app-surface-subtle rounded-xl p-3 text-xs text-[var(--text-secondary)] sm:col-span-2">
                {isLoadingSuggestion ? (
                  <span>Buscando sugestão de categoria...</span>
                ) : suggestedCategory ? (
                  <div className="flex items-center justify-between gap-2">
                    <span>
                      Sugestão: <span className="font-bold">{suggestedCategory}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, category: suggestedCategory }))}
                      className="rounded-md bg-[color:var(--primary-soft)] px-2 py-1 text-[var(--text-primary)] transition-colors hover:opacity-90"
                    >
                      Usar sugestão
                    </button>
                  </div>
                ) : null}
              </div>
            )}

            <FormField
              label={isRecurringIncome ? 'Data de recebimento' : 'Data'}
              htmlFor={dateId}
              required
              error={dateInvalid ? 'Selecione uma data válida.' : null}
            >
              <PremiumDatePicker
                id={dateId}
                value={formData.date}
                onChange={(value) => setFormData((prev) => ({ ...prev, date: value }))}
                placeholder="Selecione a data"
                invalid={dateInvalid}
              />
            </FormField>

            {isRecurringIncome ? (
              <>
                <FormField label="Frequência" htmlFor={recurrenceFrequencyId} required>
                  <select
                    id={recurrenceFrequencyId}
                    value={formData.recurrenceFrequency}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        recurrenceFrequency: event.target.value as IncomeRecurrenceFrequency,
                      }))
                    }
                    className="app-field app-field-filled h-11 w-full rounded-xl px-4 text-sm"
                  >
                    {recurrenceFrequencyOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </FormField>

                <FormField
                  label="Data de término"
                  htmlFor={recurrenceEndDateId}
                  hint="Opcional"
                  error={
                    recurrenceEndDateInvalid
                      ? 'A data de término precisa ser igual ou posterior à data de recebimento.'
                      : null
                  }
                >
                  <PremiumDatePicker
                    id={recurrenceEndDateId}
                    value={formData.recurrenceEndDate}
                    onChange={(value) =>
                      setFormData((prev) => ({
                        ...prev,
                        recurrenceEndDate: value,
                      }))
                    }
                    placeholder="Sem data final"
                    min={formData.date}
                    invalid={recurrenceEndDateInvalid}
                  />
                </FormField>
              </>
            ) : null}

            <FormField
              label="Categoria"
              htmlFor={categoryId}
              required
              error={categoryInvalid ? 'Selecione uma categoria.' : null}
            >
              <select
                id={categoryId}
                value={formData.category}
                onChange={(event) => setFormData((prev) => ({ ...prev, category: event.target.value }))}
                className={cn(
                  'app-field h-11 w-full rounded-xl px-4 text-sm',
                  hasCategory && 'app-field-filled',
                  categoryInvalid && 'app-field-error'
                )}
              >
                {availableCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </FormField>

            {canCreateInlineCategory ? (
              <div className="sm:col-span-2">
                <div className="app-surface-subtle space-y-2 rounded-xl border border-[var(--border-default)] p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                    Nova categoria
                  </p>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(event) => {
                        setNewCategoryName(event.target.value);
                        if (newCategoryError) setNewCategoryError(null);
                      }}
                      placeholder={formData.flowType === 'Entrada' ? 'Ex: Bônus' : 'Ex: Pets'}
                      className="app-field h-11 flex-1 rounded-xl px-4 text-sm"
                    />
                    <button
                      type="button"
                      onClick={handleCreateCategory}
                      className="app-button-secondary h-11 rounded-xl px-4 text-sm font-bold"
                    >
                      Adicionar categoria
                    </button>
                  </div>
                  <p className="text-xs text-[var(--text-muted)]">
                    A categoria ficará disponível para {formData.flowType === 'Entrada' ? 'entradas' : 'saidas'} nesta conta.
                  </p>
                  {newCategoryError ? <p className="text-xs font-semibold text-[var(--danger)]">{newCategoryError}</p> : null}
                </div>
              </div>
            ) : null}

            <FormField label="Método de pagamento" htmlFor={paymentMethodId}>
              <select
                id={paymentMethodId}
                value={formData.paymentMethod}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    paymentMethod: event.target.value as PaymentMethodLabel,
                  }))
                }
                className="app-field app-field-filled h-11 w-full rounded-xl px-4 text-sm"
              >
                {PAYMENT_METHODS.map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </select>
            </FormField>

            {isTransferFlow ? (
              <>
                <FormField
                  label="Conta origem"
                  htmlFor={walletId}
                  required
                  error={walletInvalid ? 'Selecione a conta de origem.' : null}
                >
                  <select
                    id={walletId}
                    value={formData.wallet}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        wallet: event.target.value,
                        destinationWallet: normalizeDestinationWalletSelection(
                          prev.destinationWallet,
                          event.target.value
                        ),
                      }))
                    }
                    className={cn(
                      'app-field h-11 w-full rounded-xl px-4 text-sm',
                      hasWallet && 'app-field-filled',
                      walletInvalid && 'app-field-error'
                    )}
                  >
                    {walletChoices.map((wallet) => (
                      <option key={wallet} value={wallet}>
                        {wallet}
                      </option>
                    ))}
                  </select>
                </FormField>

                <FormField
                  label="Conta destino"
                  htmlFor={destinationWalletId}
                  required
                  error={
                    destinationWalletInvalid
                      ? !formData.destinationWallet.trim()
                        ? 'Selecione a conta de destino.'
                        : 'Conta origem e destino não podem ser iguais.'
                      : null
                  }
                >
                  <select
                    id={destinationWalletId}
                    value={formData.destinationWallet}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        destinationWallet: event.target.value,
                      }))
                    }
                    className={cn(
                      'app-field h-11 w-full rounded-xl px-4 text-sm',
                      formData.destinationWallet.trim().length > 0 && 'app-field-filled',
                      destinationWalletInvalid && 'app-field-error'
                    )}
                  >
                    <option value="">Selecione</option>
                    {walletChoices
                      .filter((wallet) => wallet !== formData.wallet)
                      .map((wallet) => (
                        <option key={wallet} value={wallet}>
                          {wallet}
                        </option>
                      ))}
                  </select>
                </FormField>
              </>
            ) : (
              <FormField
                label="Conta / Carteira"
                htmlFor={walletId}
                required
                error={walletInvalid ? 'Selecione uma conta.' : null}
              >
                <select
                  id={walletId}
                  value={formData.wallet}
                  onChange={(event) =>
                    setFormData((prev) => ({ ...prev, wallet: event.target.value }))
                  }
                  className={cn(
                    'app-field h-11 w-full rounded-xl px-4 text-sm',
                    hasWallet && 'app-field-filled',
                    walletInvalid && 'app-field-error'
                  )}
                >
                  {walletChoices.map((wallet) => (
                    <option key={wallet} value={wallet}>
                      {wallet}
                    </option>
                  ))}
                </select>
              </FormField>
            )}

            {!isRecurringIncome ? (
              <FormField
                label="Comprovante"
                hint="JPG, PNG ou PDF. Opcional."
                className="sm:col-span-2"
              >
                <div className="app-surface-subtle flex flex-col gap-3 rounded-xl border border-[var(--border-default)] p-3 sm:flex-row sm:items-center">
                  <button
                    type="button"
                    onClick={() => receiptInputRef.current?.click()}
                    disabled={isParsingReceipt || isSubmitting}
                    className="app-button-secondary rounded-lg px-3 py-2 text-xs font-bold"
                  >
                    {selectedReceiptName ? 'Trocar arquivo' : 'Escolher arquivo'}
                  </button>
                  <span className="min-w-0 flex-1 truncate text-sm text-[var(--text-secondary)]">
                    {selectedReceiptName ?? 'Nenhum arquivo selecionado'}
                  </span>
                  <input
                    ref={receiptInputRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf"
                    onChange={handleReceiptUpload}
                    disabled={isParsingReceipt || isSubmitting}
                    className="hidden"
                  />
                </div>
                {receiptStatus ? <p className="text-xs text-[var(--text-secondary)]">{receiptStatus}</p> : null}
              </FormField>
            ) : (
              <div className="rounded-xl border border-[var(--border-default)] bg-[color:var(--primary-soft)] px-3 py-2 text-xs text-[var(--text-secondary)] sm:col-span-2">
                Entrada recorrente cria próximas entradas automaticamente no calendário e na projeção de saldo.
              </div>
            )}

            {formData.category === 'Auto (IA)' ? (
              <div className="rounded-xl border border-[var(--border-default)] bg-[color:var(--primary-soft)] px-3 py-2 text-xs text-[var(--text-secondary)] sm:col-span-2">
                A categoria será classificada automaticamente com base na descrição.
              </div>
            ) : null}

            {hasAttemptedSubmit && !isValid ? (
              <p className="text-xs text-[var(--danger)] sm:col-span-2">
                Revise os campos obrigatórios para continuar.
              </p>
            ) : null}
          </FormGrid>
        </FormContainer>
      </motion.div>
    </div>
  );
};

// --- Onboarding Tutorial ---

type OnboardingTutorialProps = { onComplete: () => void };

const OnboardingTutorial = ({ onComplete }: OnboardingTutorialProps) => {
  const [step, setStep] = React.useState(0);

  const steps = [
    {
      title: 'Bem-vindo ao Cote Finance AI!',
      description: 'Seu assistente financeiro inteligente que organiza, analisa, prevê e orienta automaticamente.',
      target: 'sidebar-logo',
    },
    {
      title: 'Visão Geral do Painel',
      description: 'Aqui você acompanha seu saldo consolidado, entradas e saídas em tempo real.',
      target: 'dashboard-stats',
    },
    {
      title: 'Previsões de IA',
      description: 'Nossa IA analisa seus padrões e prevê seu saldo futuro, ajudando você a se planejar.',
      target: 'ai-forecast',
    },
    {
      title: 'Assistente Cote',
      description: 'Converse com nossa IA para tirar dúvidas sobre seus gastos e receber dicas personalizadas.',
      target: 'ai-assistant',
    },
    {
      title: 'Integração WhatsApp',
      description: 'Registre gastos e receba alertas diretamente pelo WhatsApp. Praticidade total.',
      target: 'whatsapp-integration',
    },
    {
      title: 'Tudo Pronto!',
      description: 'Agora você está pronto para dominar suas finanças. Vamos começar?',
      target: 'sidebar-logo',
    },
  ];

  const nextStep = () => {
    if (step < steps.length - 1) setStep(step + 1);
    else onComplete();
  };

  const prevStep = () => {
    if (step > 0) setStep(step - 1);
  };

  return (
    <div className="theme-modal-backdrop fixed inset-0 z-[100] flex items-center justify-center bg-[var(--bg-app)] backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="theme-modal-surface p-8 rounded-3xl max-w-md w-full shadow-2xl"
      >
        <div className="flex items-center justify-between mb-6">
          <span className="text-xs font-black text-[var(--text-secondary)] uppercase tracking-widest">
            Passo {step + 1} de {steps.length}
          </span>
          <div className="flex gap-1">
            {steps.map((_, i) => (
              <div
                key={i}
                className={cn('h-1 w-4 rounded-full transition-all', i === step ? 'bg-[var(--primary)]' : 'bg-[var(--bg-surface-elevated)]')}
              />
            ))}
          </div>
        </div>

        <h3 className="text-2xl font-bold text-[var(--text-primary)] mb-3">{steps[step].title}</h3>
        <p className="text-[var(--text-secondary)] mb-8 leading-relaxed">{steps[step].description}</p>

        <div className="flex items-center justify-between">
          <button onClick={onComplete} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-sm font-bold transition-colors">
            Pular Tutorial
          </button>

          <div className="flex gap-3">
            {step > 0 && (
              <button
                onClick={prevStep}
                className="px-4 py-2 rounded-xl border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all"
              >
                Voltar
              </button>
            )}
            <button
              onClick={nextStep}
              className="px-6 py-2 rounded-xl bg-[var(--primary)] text-[var(--text-primary)] font-bold hover:bg-[var(--primary-hover)] transition-all shadow-lg shadow-[color:var(--primary-soft)]"
            >
              {step === steps.length - 1 ? 'Começar agora' : 'Próximo'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// --- Auth Components ---

const LoginView = ({
  onLoginSuccess,
  initialMode = 'login',
}: {
  onLoginSuccess: (user: any) => void;
  initialMode?: 'login' | 'signup';
}) => {
  const brandLogo = '/brand/cote-finance-ai-logo.svg';
  const [loginMethod, setLoginMethod] = React.useState<'password' | 'otp'>('password');
  const [firstName, setFirstName] = React.useState('');
  const [lastName, setLastName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [otpCode, setOtpCode] = React.useState('');
  const [otpRequestedEmail, setOtpRequestedEmail] = React.useState('');
  const [acceptedTerms, setAcceptedTerms] = React.useState(false);
  const [isLogin, setIsLogin] = React.useState(initialMode !== 'signup');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [pendingConfirmationEmail, setPendingConfirmationEmail] = React.useState('');
  const AUTH_REQUEST_TIMEOUT_MS = 10000;
  const AUTH_RETRY_ATTEMPTS = 2;

  React.useEffect(() => {
    setIsLogin(initialMode !== 'signup');
    setLoginMethod('password');
    setOtpCode('');
    setOtpRequestedEmail('');
  }, [initialMode]);

  const passwordChecks = React.useMemo(
    () => [
      { label: 'Pelo menos 8 caracteres', valid: password.length >= 8 },
      { label: 'Pelo menos 1 letra', valid: /[A-Za-z]/.test(password) },
      { label: 'Pelo menos 1 número', valid: /\d/.test(password) },
    ],
    [password]
  );

  const validateSignup = () => {
    if (!firstName.trim()) return 'Informe seu nome.';
    if (!lastName.trim()) return 'Informe seu sobrenome.';
    if (!email.trim()) return 'Informe seu e-mail.';
    if (password.length < 8) return 'A senha deve ter no mínimo 8 caracteres.';
    if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      return 'A senha deve conter letras e números.';
    }
    if (!acceptedTerms) return 'Você precisa aceitar os termos para continuar.';
    return null;
  };

  const authDebug = React.useCallback((event: string, payload?: Record<string, unknown>) => {
    console.log('AUTH DEBUG:', {
      event,
      timestamp: new Date().toISOString(),
      ...(payload || {}),
    });
  }, []);

  const shouldRetryAuthError = React.useCallback((message: string) => {
    return /timeout|upstream request timeout|failed to fetch|network|fetch failed|temporarily unavailable/i.test(
      message
    );
  }, []);

  const runWithTimeout = React.useCallback(
    async <T,>(operation: Promise<T>, timeoutMessage: string): Promise<T> => {
      let timeoutId: ReturnType<typeof setTimeout> | undefined;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error(timeoutMessage));
        }, AUTH_REQUEST_TIMEOUT_MS);
      });

      try {
        return (await Promise.race([operation, timeoutPromise])) as T;
      } finally {
        if (timeoutId !== undefined) {
          clearTimeout(timeoutId);
        }
      }
    },
    [AUTH_REQUEST_TIMEOUT_MS]
  );

  const runWithRetry = React.useCallback(
    async <T,>(operationName: string, operationFactory: () => Promise<T>, timeoutMessage: string): Promise<T> => {
      let attempt = 0;
      let lastError: unknown = null;

      while (attempt < AUTH_RETRY_ATTEMPTS) {
        attempt += 1;
        try {
          authDebug(`${operationName}:start`, { attempt });
          const result = await runWithTimeout(operationFactory(), timeoutMessage);
          authDebug(`${operationName}:success`, { attempt });
          return result;
        } catch (error) {
          lastError = error;
          const message = error instanceof Error ? error.message : String(error || 'Erro desconhecido');
          const retryable = shouldRetryAuthError(message);
          authDebug(`${operationName}:error`, { attempt, retryable, message });

          if (!retryable || attempt >= AUTH_RETRY_ATTEMPTS) {
            break;
          }

          await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
        }
      }

      throw lastError instanceof Error ? lastError : new Error(timeoutMessage);
    },
    [AUTH_RETRY_ATTEMPTS, authDebug, runWithTimeout, shouldRetryAuthError]
  );

  const runSetupForToken = async (accessToken: string) => {
    const setupRes = await runWithRetry(
      'setup_user',
      async () => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), AUTH_REQUEST_TIMEOUT_MS);
        return fetch('/api/setup-user', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          signal: controller.signal,
        }).finally(() => {
          clearTimeout(timeoutId);
        });
      },
      'Não foi possível finalizar sua sessão no servidor. Tente novamente.'
    );
    const setupData = await setupRes.json().catch(() => ({}));
    if (!setupRes.ok && setupData.error) throw new Error(setupData.error);
  };

  const handleResendConfirmation = async () => {
    if (!pendingConfirmationEmail || loading) return;

    setLoading(true);
    setError(null);
    setNotice(null);

    try {
      authDebug('resend_confirmation:start', { email: pendingConfirmationEmail });
      const { error: resendError } = await runWithRetry(
        'resend_confirmation',
        () =>
          supabase.auth.resend({
            type: 'signup',
            email: pendingConfirmationEmail,
            options: {
              emailRedirectTo: buildClientRedirectUrl('/auth/confirm'),
            },
          }),
        'O reenvio do e-mail demorou demais. Verifique sua conexão e tente novamente.'
      );

      if (resendError) throw resendError;

      authDebug('resend_confirmation:done', { email: pendingConfirmationEmail });
      setNotice('Enviamos um novo e-mail de confirmação. Verifique sua caixa de entrada e spam.');
    } catch (err: any) {
      authDebug('resend_confirmation:failed', { message: String(err?.message || err || 'erro inesperado') });
      setError(err?.message || 'Não foi possível reenviar o e-mail de confirmação.');
    } finally {
      setLoading(false);
    }
  };

  const requestEmailCode = async (normalizedEmail: string) => {
    if (!normalizedEmail) {
      throw new Error('Informe seu e-mail para receber o código.');
    }

    authDebug('otp_request:start', { email: normalizedEmail });
    const { error: otpError } = await runWithRetry(
      'otp_send_code',
      () =>
        supabase.auth.signInWithOtp({
          email: normalizedEmail,
          options: {
            shouldCreateUser: false,
          },
        }),
      'O envio do código demorou demais. Verifique sua conexão e tente novamente.'
    );

    if (otpError) {
      throw otpError;
    }

    authDebug('otp_request:done', { email: normalizedEmail });
    setOtpRequestedEmail(normalizedEmail);
    setOtpCode('');
    setNotice('Enviamos um código de acesso para o seu e-mail. Digite esse código para entrar.');
  };

  const verifyEmailCode = async (normalizedEmail: string) => {
    const token = otpCode.trim();

    if (!normalizedEmail) {
      throw new Error('Informe seu e-mail para validar o código.');
    }

    if (token.length < 6) {
      throw new Error('Digite o código recebido no e-mail para continuar.');
    }

    authDebug('otp_verify:start', { email: normalizedEmail, tokenLength: token.length });
    const { data, error: verifyError } = await runWithRetry(
      'otp_verify_code',
      () =>
        supabase.auth.verifyOtp({
          email: normalizedEmail,
          token,
          type: 'email',
        }),
      'A validação do código demorou demais. Tente novamente.'
    );

    if (verifyError) {
      throw verifyError;
    }

    const accessToken =
      data.session?.access_token || (await supabase.auth.getSession()).data.session?.access_token;
    const resolvedUser = data.user || (await supabase.auth.getUser()).data.user;

    if (!accessToken || !resolvedUser) {
      throw new Error('Não foi possível validar o código. Solicite um novo e tente novamente.');
    }

    authDebug('otp_verify:done', { hasSession: Boolean(accessToken), hasUser: Boolean(resolvedUser) });
    await runSetupForToken(accessToken);
    onLoginSuccess(resolvedUser);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setNotice(null);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      authDebug('auth_submit:start', {
        mode: isLogin ? 'login' : 'signup',
        method: loginMethod,
        otpStage: otpRequestedEmail ? 'verify' : 'send',
        email: normalizedEmail,
      });

      if (isLogin && loginMethod === 'otp') {
        if (otpRequestedEmail) {
          await verifyEmailCode(otpRequestedEmail || normalizedEmail);
        } else {
          await requestEmailCode(normalizedEmail);
        }
        return;
      }

      if (!isLogin) {
        const validationError = validateSignup();
        if (validationError) {
          setError(validationError);
          setLoading(false);
          return;
        }
      }

      let result: any;
      if (isLogin) {
        result = await runWithRetry(
          'password_login',
          () => supabase.auth.signInWithPassword({ email: normalizedEmail, password }),
          'O login demorou demais. Verifique sua conexão e tente novamente.'
        );
      } else {
        result = await runWithRetry(
          'signup',
          () =>
            supabase.auth.signUp({
              email: normalizedEmail,
              password,
              options: {
                emailRedirectTo: buildClientRedirectUrl('/auth/confirm'),
                data: {
                  first_name: firstName.trim(),
                  last_name: lastName.trim(),
                  full_name: `${firstName.trim()} ${lastName.trim()}`.trim(),
                },
              },
            }),
          'A criação da conta demorou demais. Verifique sua conexão e tente novamente.'
        );
      }

      if (result.error) throw result.error;

      const accessToken =
        result.data.session?.access_token ||
        (await supabase.auth.getSession()).data.session?.access_token;

      if (accessToken && result.data.user) {
        await runSetupForToken(accessToken);
        onLoginSuccess(result.data.user);
        return;
      }

      if (!isLogin) {
        setPendingConfirmationEmail(normalizedEmail);
        setNotice(
          'Conta criada com sucesso. Enviamos um e-mail de confirmação para continuar seu acesso.'
        );
        setIsLogin(true);
        setPassword('');
        return;
      }

      throw new Error('Não foi possível iniciar sessão. Tente novamente.');
    } catch (err: any) {
      const errorMessage = String(err?.message || 'Não foi possível fazer login. Tente novamente.');
      authDebug('auth_submit:failed', { message: errorMessage });
      setError(errorMessage);
    } finally {
      authDebug('auth_submit:finally', { loading: false });
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setNotice(null);
    setLoading(true);
    try {
      const callbackUrl = buildClientRedirectUrl('/auth/callback');
      authDebug('oauth_google:start', { callbackUrl, origin: window.location.origin });
      const { error } = await runWithRetry(
        'oauth_google',
        () =>
          supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
              redirectTo: callbackUrl,
              queryParams: {
                access_type: 'offline',
                prompt: 'consent',
              },
            },
          }),
        'O login com Google demorou demais. Tente novamente.'
      );
      if (error) throw error;
      authDebug('oauth_google:redirecting', { callbackUrl });
    } catch (err: any) {
      const rawMessage = String(err?.message || '');
      authDebug('oauth_google:failed', { message: rawMessage || 'erro inesperado' });
      if (/unsupported provider|provider is not enabled|oauth/i.test(rawMessage)) {
        setError(
          'Google OAuth não está habilitado no Supabase. Ative o provider Google e configure a Redirect URL /auth/callback.'
        );
      } else if (/redirect|callback|redirect_uri_mismatch/i.test(rawMessage)) {
        setError(
          `Redirect URI inválida. Configure ${buildClientRedirectUrl('/auth/callback')} nas URLs permitidas do Supabase.`
        );
      } else {
        setError(rawMessage || 'Falha ao iniciar login com Google.');
      }
      setLoading(false);
    }
  };

  return (
    <div className="theme-app-shell min-h-screen px-4 py-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-5xl items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="theme-modal-surface w-full max-w-[420px] rounded-[2rem] p-7 shadow-[var(--shadow-elevated)]"
      >
        <div className="mb-8">
          <div className="flex flex-col items-center">
          <Image
            src={brandLogo}
            alt="Cote Finance AI - By Cote Juros"
            width={480}
            height={128}
            priority
            className="mb-3 h-auto w-full max-w-[380px]"
          />
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-black text-[var(--text-primary)]">
              {isLogin ? 'Entre na sua conta' : 'Crie sua conta gratuita'}
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              {isLogin
                ? loginMethod === 'otp'
                  ? 'Receba um código no e-mail e valide sua entrada sem depender da senha.'
                  : 'Acesse sua conta com segurança e continue de onde parou.'
                : 'Comece a organizar suas finanças em minutos.'}
            </p>
          </div>
        </div>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          {isLogin ? (
            <div className="grid grid-cols-2 gap-2 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-app)] p-1">
              <button
                type="button"
                onClick={() => {
                  setLoginMethod('password');
                  setOtpCode('');
                  setOtpRequestedEmail('');
                  setError(null);
                  setNotice(null);
                }}
                className={cn(
                  'rounded-xl px-4 py-2 text-sm font-semibold transition-colors',
                  loginMethod === 'password'
                    ? 'bg-[var(--primary)] text-[var(--text-primary)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                )}
              >
                Senha
              </button>
              <button
                type="button"
                onClick={() => {
                  setLoginMethod('otp');
                  setPassword('');
                  setError(null);
                  setNotice(null);
                }}
                className={cn(
                  'rounded-xl px-4 py-2 text-sm font-semibold transition-colors',
                  loginMethod === 'otp'
                    ? 'bg-[var(--primary)] text-[var(--text-primary)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                )}
              >
                Código por e-mail
              </button>
            </div>
          ) : null}

          {!isLogin && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="label-premium text-[var(--text-muted)]">Nome</label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface-elevated)] py-3 px-4 text-[var(--text-primary)] transition-all focus:outline-none focus:border-[var(--primary)]"
                  placeholder="Seu nome"
                />
              </div>
              <div className="space-y-2">
                <label className="label-premium text-[var(--text-muted)]">Sobrenome</label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface-elevated)] py-3 px-4 text-[var(--text-primary)] transition-all focus:outline-none focus:border-[var(--primary)]"
                  placeholder="Seu sobrenome"
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="label-premium text-[var(--text-muted)]">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface-elevated)] py-3 px-4 text-[var(--text-primary)] transition-all focus:outline-none focus:border-[var(--primary)]"
              placeholder="seuemail@exemplo.com"
            />
          </div>
          {!isLogin || loginMethod === 'password' ? (
            <div className="space-y-2">
              <label className="label-premium text-[var(--text-muted)]">Senha</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface-elevated)] py-3 px-4 text-[var(--text-primary)] transition-all focus:outline-none focus:border-[var(--primary)]"
                placeholder={isLogin ? 'Digite sua senha' : 'Crie uma senha segura'}
              />
              {isLogin ? (
                <p className="text-xs leading-relaxed text-[var(--text-muted)]">
                  Entre com a senha que você criou para acessar sua conta.
                </p>
              ) : (
                <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface-elevated)]/30 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">
                    Critérios da senha
                  </p>
                  <ul className="mt-3 space-y-2 text-sm text-[var(--text-secondary)]">
                    {passwordChecks.map((rule) => (
                      <li key={rule.label} className="flex items-center gap-2">
                        <span
                          className={cn(
                            'inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold',
                            rule.valid
                              ? 'bg-[color:var(--primary-soft)] text-[var(--text-secondary)]'
                              : 'bg-[var(--bg-surface-elevated)] text-[var(--text-secondary)]'
                          )}
                        >
                          {rule.valid ? 'OK' : '?'}
                        </span>
                        <span>{rule.label}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface-elevated)]/30 p-4">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  {otpRequestedEmail ? 'Digite o código recebido' : 'Receba um código de acesso'}
                </p>
                <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
                  {otpRequestedEmail
                    ? `Enviamos o código para ${otpRequestedEmail}. Digite esse código abaixo para entrar.`
                    : 'Vamos enviar um código real para o seu e-mail para validar sua entrada no app.'}
                </p>
              </div>

              {otpRequestedEmail ? (
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">
                    Código
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\s+/g, ''))}
                    className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface-elevated)] py-3 px-4 text-[var(--text-primary)] transition-all focus:outline-none focus:border-[var(--primary)]"
                    placeholder="Digite o código recebido"
                  />
                </div>
              ) : null}
            </div>
          )}

          {!isLogin && (
            <>
              <p className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface-elevated)]/40 px-4 py-3 text-xs text-[var(--text-secondary)]">
                Empresa, telefone, segmento, quantidade de contas e objetivo financeiro podem ser definidos depois, no onboarding.
              </p>

              <div className="flex items-start gap-3 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface-elevated)]/30 px-4 py-3 text-xs text-[var(--text-secondary)]">
                <input
                  id="accepted-terms"
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-0.5 rounded border-[var(--border-strong)] bg-[var(--bg-surface)]"
                />
                <div className="leading-relaxed">
                  <label htmlFor="accepted-terms" className="cursor-pointer">
                    Aceito os{' '}
                  </label>
                  <Link href="/termos-de-uso" target="_blank" rel="noreferrer" className="font-semibold text-[var(--text-secondary)] hover:text-[var(--text-secondary)]">
                    termos de uso
                  </Link>
                  <span>{' '}e{' '}</span>
                  <Link
                    href="/politica-de-privacidade"
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-[var(--text-secondary)] hover:text-[var(--text-secondary)]"
                  >
                    política de privacidade
                  </Link>
                  <span>.</span>
                </div>
              </div>
            </>
          )}

          {notice && <p className="text-[var(--text-secondary)] text-xs font-bold leading-relaxed">{notice}</p>}
          {error && <p className="text-[var(--danger)] text-xs font-bold leading-relaxed">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[var(--primary)] py-3 text-sm font-bold text-[var(--text-primary)] transition-all hover:bg-[var(--primary-hover)] shadow-lg shadow-[color:var(--primary-soft)] disabled:opacity-50"
          >
            {loading
              ? 'Processando...'
              : !isLogin
                ? 'Criar conta gratuita'
                : loginMethod === 'otp'
                  ? otpRequestedEmail
                    ? 'Validar código e entrar'
                    : 'Receber código por e-mail'
                  : 'Entrar'}
          </button>

          {pendingConfirmationEmail ? (
            <button
              type="button"
              onClick={handleResendConfirmation}
              disabled={loading}
              className="w-full text-center text-xs font-semibold text-[var(--text-secondary)] transition hover:text-[var(--text-primary)] disabled:opacity-50"
            >
              Não recebeu o e-mail? Reenviar confirmação
            </button>
          ) : null}

          {isLogin && loginMethod === 'otp' && otpRequestedEmail ? (
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={async () => {
                  if (loading) return;
                  setLoading(true);
                  setError(null);
                  setNotice(null);
                  try {
                    await requestEmailCode(otpRequestedEmail);
                  } catch (err: any) {
                    setError(err?.message || 'Não foi possível reenviar o código.');
                  } finally {
                    setLoading(false);
                  }
                }}
                className="text-xs font-semibold text-[var(--text-secondary)] transition hover:text-[var(--text-primary)] disabled:opacity-50"
              >
                Reenviar código
              </button>
              <button
                type="button"
                onClick={() => {
                  setOtpRequestedEmail('');
                  setOtpCode('');
                  setError(null);
                  setNotice(null);
                }}
                className="text-xs font-semibold text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
              >
                Alterar e-mail
              </button>
            </div>
          ) : null}
        </form>

        <div className="relative my-7">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[var(--border-default)]"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-[var(--bg-surface)] px-3 text-[var(--text-muted)] font-bold">Ou continue com</span>
          </div>
        </div>

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="flex w-full items-center justify-center gap-3 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface-elevated)] py-3 text-sm font-bold text-[var(--text-primary)] transition-all hover:bg-[var(--bg-surface-elevated)] disabled:opacity-50"
        >
          <svg className="size-5" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continuar com Google
        </button>

        <p className="mt-7 text-center text-sm text-[var(--text-muted)]">
          {isLogin ? 'Não tem uma conta?' : 'Já tem uma conta?'}
          <button
            onClick={() => {
              setError(null);
              setNotice(null);
              setIsLogin(!isLogin);
              setLoginMethod('password');
              setOtpCode('');
              setOtpRequestedEmail('');
              setPassword('');
            }}
            className="ml-1 font-bold text-[var(--text-secondary)] hover:underline"
          >
            {isLogin ? 'Criar conta gratuita' : 'Entrar'}
          </button>
        </p>
      </motion.div>
      </div>
    </div>
  );
};

// --- Main Layout ---

export default function App() {
  const brandLogo = '/brand/cote-finance-ai-logo.svg';
  const sidebarCollapsedLogo = '/brand/cote-favicon.svg';
  const [user, setUser] = React.useState<any>(null);
  const [authLoading, setAuthLoading] = React.useState(true);
  const setupTokenRef = React.useRef<string | null>(null);
  const setupPromiseRef = React.useRef<{
    token: string | null;
    promise: Promise<void> | null;
  }>({
    token: null,
    promise: null,
  });

  const setupUserOnServer = React.useCallback(async (accessToken?: string | null, userId?: string | null) => {
    if (!accessToken) return;
    if (setupTokenRef.current === accessToken) return;
    if (setupPromiseRef.current.token === accessToken && setupPromiseRef.current.promise) {
      return setupPromiseRef.current.promise;
    }

    const request = (async () => {
      try {
        const response = await fetch('/api/setup-user', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
        const payload = await response.json().catch(() => ({}));
        if (response.ok) {
          setupTokenRef.current = accessToken;
          const preferredWorkspaceId = userId ? readActiveWorkspacePreference(userId) : null;
          if (Array.isArray(payload?.workspaces)) {
            setWorkspaces(
              payload.workspaces.map((workspace: any) => ({
                id: workspace.id,
                name: workspace.name,
                role: workspace.role,
              }))
            );
          }
          const workspaceList = Array.isArray(payload?.workspaces) ? payload.workspaces : [];
          const preferredWorkspaceStillExists =
            typeof preferredWorkspaceId === 'string' &&
            workspaceList.some((workspace: any) => workspace?.id === preferredWorkspaceId);
          if (preferredWorkspaceStillExists) {
            setActiveWorkspaceId(preferredWorkspaceId);
          } else if (typeof payload?.activeWorkspaceId === 'string') {
            setActiveWorkspaceId((current) => current || payload.activeWorkspaceId);
          }
          if (payload?.onboarding) {
            setIsWorkspaceOnboardingOpen(shouldShowWorkspaceOnboarding(payload.onboarding));
          }
        } else {
          setupTokenRef.current = null;
        }
      } catch (error) {
        console.error('Setup user error:', error);
        setupTokenRef.current = null;
      } finally {
        if (setupPromiseRef.current.token === accessToken) {
          setupPromiseRef.current = {
            token: null,
            promise: null,
          };
        }
      }
    })();

    setupPromiseRef.current = {
      token: accessToken,
      promise: request,
    };

    return request;
  }, []);

  React.useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          const preferredWorkspaceId = readActiveWorkspacePreference(session.user.id);
          if (preferredWorkspaceId) {
            setActiveWorkspaceId(preferredWorkspaceId);
          }
          void setupUserOnServer(session.access_token, session.user.id);
        }
      } catch (error) {
        console.error('Auth bootstrap error:', error);
      } finally {
        setAuthLoading(false);
      }
    };

    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user?.id) {
        const preferredWorkspaceId = readActiveWorkspacePreference(session.user.id);
        if (preferredWorkspaceId) {
          setActiveWorkspaceId(preferredWorkspaceId);
        }
      }
      if (session?.access_token) {
        void setupUserOnServer(session.access_token, session.user?.id);
      }
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [setupUserOnServer]);

  React.useEffect(() => {
    const authTimeout = window.setTimeout(() => {
      setAuthLoading((prev) => (prev ? false : prev));
    }, 8000);

    return () => window.clearTimeout(authTimeout);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setupTokenRef.current = null;
    setupPromiseRef.current = {
      token: null,
      promise: null,
    };
    setUser(null);
    setActiveTab('dashboard');
    setCurrentPlan('FREE');
    setReportAccessLevel('basic');
  };

  const [activeTab, setActiveTab] = React.useState<Tab>('dashboard');
  const [transactionsInitialFlowFilter, setTransactionsInitialFlowFilter] = React.useState<TransactionFlowType | null>(null);
  const [dashboardOverviewLoading, setDashboardOverviewLoading] = React.useState(false);
  const [dashboardOverviewError, setDashboardOverviewError] = React.useState<string | null>(null);
  const [dashboardOverview, setDashboardOverview] = React.useState<DashboardOverviewPayload | null>(null);
  const [reportsOverview, setReportsOverview] = React.useState<ReportsOverviewPayload | null>(null);
  const dashboardOverviewRef = React.useRef<DashboardOverviewPayload | null>(null);
  const reportsOverviewRef = React.useRef<ReportsOverviewPayload | null>(null);
  const [totalBalance, setTotalBalance] = React.useState(0);
  const [dashboardInsights, setDashboardInsights] = React.useState<string[]>([]);
  const [dashboardProjection, setDashboardProjection] = React.useState<DashboardProjection | null>(null);
  const [dashboardCalendarReadModel, setDashboardCalendarReadModel] = React.useState<DashboardCalendarReadModel | null>(null);
  const [currentPlan, setCurrentPlan] = React.useState<SubscriptionPlan>('FREE');
  const [reportAccessLevel, setReportAccessLevel] = React.useState<ReportAccessLevel>('basic');
  const [currentMonthTransactionCount, setCurrentMonthTransactionCount] = React.useState(0);
  const [aiUsageCount, setAiUsageCount] = React.useState(0);
  const [isUpgradeLimitModalOpen, setIsUpgradeLimitModalOpen] = React.useState(false);
  const [upgradeLimitReason, setUpgradeLimitReason] = React.useState<'transactions' | 'ai'>(
    'transactions'
  );
  const [workspaces, setWorkspaces] = React.useState<WorkspaceOption[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = React.useState<string | null>(null);
  const [isWorkspaceOnboardingOpen, setIsWorkspaceOnboardingOpen] = React.useState(false);
  const [isCreateWorkspaceModalOpen, setIsCreateWorkspaceModalOpen] = React.useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = React.useState('');
  const [createWorkspaceError, setCreateWorkspaceError] = React.useState<string | null>(null);
  const [isCreatingWorkspace, setIsCreatingWorkspace] = React.useState(false);
  const [isCreateWalletModalOpen, setIsCreateWalletModalOpen] = React.useState(false);
  const [newWalletBank, setNewWalletBank] = React.useState('');
  const [newWalletName, setNewWalletName] = React.useState('');
  const [newWalletInitialBalance, setNewWalletInitialBalance] = React.useState('');
  const [createWalletError, setCreateWalletError] = React.useState<string | null>(null);
  const [isCreatingWallet, setIsCreatingWallet] = React.useState(false);
  const [walletPendingDelete, setWalletPendingDelete] = React.useState<WalletAccount | null>(null);
  const [deleteWalletError, setDeleteWalletError] = React.useState<string | null>(null);
  const [isDeletingWallet, setIsDeletingWallet] = React.useState(false);
  const [portfolioFeedback, setPortfolioFeedback] = React.useState<{
    tone: 'success' | 'error';
    message: string;
  } | null>(null);
  const [isDeleteWorkspaceModalOpen, setIsDeleteWorkspaceModalOpen] = React.useState(false);
  const [deleteWorkspaceConfirmationName, setDeleteWorkspaceConfirmationName] = React.useState('');
  const [deleteWorkspaceError, setDeleteWorkspaceError] = React.useState<string | null>(null);
  const [isDeletingWorkspace, setIsDeletingWorkspace] = React.useState(false);
  const [loginModeFromQuery, setLoginModeFromQuery] = React.useState<'login' | 'signup'>('login');
  const [pendingPlanFromQuery, setPendingPlanFromQuery] = React.useState<string | null>(null);
  const [pendingPlanHandled, setPendingPlanHandled] = React.useState(false);
  const [headerSearchTerm, setHeaderSearchTerm] = React.useState('');
  const [isHeaderSearchOpen, setIsHeaderSearchOpen] = React.useState(false);
  const [uiFeedback, setUiFeedback] = React.useState<{
    id: number;
    tone: UiFeedbackTone;
    message: string;
  } | null>(null);
  const tabHistoryInitializedRef = React.useRef(false);
  const suppressNextTabHistorySyncRef = React.useRef(false);

  React.useEffect(() => {
    dashboardOverviewRef.current = dashboardOverview;
  }, [dashboardOverview]);

  React.useEffect(() => {
    reportsOverviewRef.current = reportsOverview;
  }, [reportsOverview]);

  React.useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const authMode = searchParams.get('auth');
    const pendingPlan = searchParams.get('plan');
    const requestedTab = searchParams.get(APP_TAB_QUERY_PARAM);
    if (authMode === 'signup' || authMode === 'login') {
      setLoginModeFromQuery(authMode);
    }
    if (pendingPlan) {
      setPendingPlanFromQuery(pendingPlan);
      setPendingPlanHandled(false);
    }
    if (isTabValue(requestedTab)) {
      setActiveTab(requestedTab);
    }

    if (!searchParams.get('period')) {
      const defaultSelection = readDashboardPeriodSelectionFromSearch(window.location.search);
      writeDashboardPeriodSelectionToUrl(defaultSelection, 'replace');
    }
  }, []);

  React.useEffect(() => {
    const url = new URL(window.location.href);
    const urlTabParam = url.searchParams.get(APP_TAB_QUERY_PARAM);
    const urlTab = isTabValue(urlTabParam) ? urlTabParam : 'dashboard';

    if (!tabHistoryInitializedRef.current) {
      tabHistoryInitializedRef.current = true;
      if (urlTab !== activeTab || !urlTabParam) {
        url.searchParams.set(APP_TAB_QUERY_PARAM, activeTab);
        window.history.replaceState(
          { tab: activeTab },
          '',
          `${url.pathname}${url.search}${url.hash}`
        );
      }
      return;
    }

    if (suppressNextTabHistorySyncRef.current) {
      suppressNextTabHistorySyncRef.current = false;
      return;
    }

    if (urlTab === activeTab) return;

    url.searchParams.set(APP_TAB_QUERY_PARAM, activeTab);
    window.history.pushState({ tab: activeTab }, '', `${url.pathname}${url.search}${url.hash}`);
  }, [activeTab]);

  const getAuthHeaders = React.useCallback(
    async (withJsonContentType = false, workspaceIdOverride?: string | null) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Sessão expirada. Faça login novamente.');
      }

      const headers: Record<string, string> = {
        Authorization: `Bearer ${session.access_token}`,
      };
      if (withJsonContentType) {
        headers['Content-Type'] = 'application/json';
      }
      const workspaceHeader = workspaceIdOverride || activeWorkspaceId;
      if (workspaceHeader) {
        headers['x-workspace-id'] = workspaceHeader;
      }
      return headers;
    },
    [activeWorkspaceId]
  );

  const fetchDashboardData = React.useCallback(async (options?: { silent?: boolean; scope?: 'full' | 'transactions' }) => {
    if (!user) return;
    const silent = Boolean(options?.silent);
    const scope = options?.scope === 'transactions' ? 'transactions' : 'full';

    const preferredWorkspaceId = !activeWorkspaceId && user?.id ? readActiveWorkspacePreference(user.id) : null;
    const workspaceIdForRequest = activeWorkspaceId || preferredWorkspaceId || null;
    if (preferredWorkspaceId && preferredWorkspaceId !== activeWorkspaceId) {
      setActiveWorkspaceId(preferredWorkspaceId);
    }

    const usageStorageKey = user?.id ? `cote-ai-usage-${user.id}-${getCurrentMonthKey()}` : null;
    try {
      let data;
      try {
        data = await fetchWorkspaceShellResource({
          getAuthHeaders,
          scope,
          workspaceIdOverride: workspaceIdForRequest,
        });
      } catch (error) {
        if (error instanceof ResourceClientError && error.status === 404) {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (!session?.access_token) {
            throw error;
          }
          await setupUserOnServer(session.access_token, session.user?.id);
          data = await fetchWorkspaceShellResource({
            getAuthHeaders,
            scope,
            workspaceIdOverride: workspaceIdForRequest,
          });
        } else {
          throw error;
        }
      }

      const mappedTransactions = Array.isArray(data.transactions)
        ? data.transactions.map((tx: any) => mapApiTransactionToClientTransaction(tx))
        : null;
      const mappedGoals = Array.isArray(data.goals) ? data.goals.map((goal: any) => mapApiGoalToClientGoal(goal)) : null;
      const mappedInvestments = Array.isArray(data.investments)
        ? data.investments.map((item: any) => mapApiInvestmentToClientInvestment(item))
        : null;
      const mappedDebts = Array.isArray(data.debts) ? data.debts.map((item: any) => mapApiDebtToClientDebt(item)) : null;
      const mappedRecurringDebts = Array.isArray(data.recurringDebts)
        ? data.recurringDebts.map((item: any) => mapApiRecurringDebtToClientRecurringDebt(item))
        : null;
      const mappedWorkspaceEvents = Array.isArray(data.recentEvents)
        ? data.recentEvents.map((event: any) => ({
            id: String(event.id),
            type: String(event.type || 'workspace.event'),
            created_at: String(event.created_at || new Date().toISOString()),
            user_id: typeof event.user_id === 'string' ? event.user_id : null,
            payload:
              event.payload && typeof event.payload === 'object'
                ? (event.payload as Record<string, unknown>)
                : null,
          }))
        : null;

      if (Array.isArray(data.wallets)) {
        setWallets(
          data.wallets.map((wallet: any) => ({
            id: String(wallet.id),
            name: String(wallet.name || 'Conta'),
            balance: Number(wallet.balance || 0),
          }))
        );
      } else if (scope === 'full') {
        setWallets([]);
      }

      setCurrentPlan(normalizePlan(data.plan));
      setReportAccessLevel(data.limits?.reports === 'basic' ? 'basic' : 'full');
      setCurrentMonthTransactionCount(Math.max(0, Number(data.currentMonthTransactionCount || 0)));

      const normalizedUsage = Math.max(0, Number(data.currentMonthAiUsage || 0));
      setAiUsageCount(normalizedUsage);
      if (usageStorageKey) {
        window.localStorage.setItem(usageStorageKey, String(normalizedUsage));
      }

      setWorkspaces(
        Array.isArray(data.workspaces)
          ? data.workspaces.map((workspace: any) => ({
              id: workspace.id,
              name: workspace.name,
              role: workspace.role,
            }))
          : []
      );

      if (typeof data.activeWorkspaceId === 'string') {
        setActiveWorkspaceId((current) => current || data.activeWorkspaceId);
      }
      if (data.onboarding) {
        setIsWorkspaceOnboardingOpen(shouldShowWorkspaceOnboarding(data.onboarding));
      }
      if (mappedWorkspaceEvents) {
        setWorkspaceEvents(mappedWorkspaceEvents);
      } else if (scope === 'full') {
        setWorkspaceEvents([]);
      }

      if (data.workspace) {
        const workspacePayload = data.workspace;
        const workspaceStatus = String(data.workspace.whatsapp_status || '').toUpperCase();
        setIsWhatsAppConnected(workspaceStatus === 'CONNECTED');
        setWorkspaceWhatsAppPhoneNumber(
          typeof workspacePayload.whatsapp_phone_number === 'string' && workspacePayload.whatsapp_phone_number
            ? `+${workspacePayload.whatsapp_phone_number}`
            : ''
        );
        setWhatsAppDiagnostic((current) => ({
          numeroConectado:
            typeof workspacePayload.whatsapp_phone_number === 'string' && workspacePayload.whatsapp_phone_number
              ? `+${workspacePayload.whatsapp_phone_number}`
              : null,
          connectionState: resolveWhatsAppConnectionState({
            statusValue: workspaceStatus,
            diagnosticValue: workspacePayload.whatsapp_last_connection_state,
          }),
          lastValidatedAt:
            typeof workspacePayload.whatsapp_last_validated_at === 'string'
              ? workspacePayload.whatsapp_last_validated_at
              : null,
          lastTestSentAt:
            typeof workspacePayload.whatsapp_last_test_sent_at === 'string'
              ? workspacePayload.whatsapp_last_test_sent_at
              : null,
          lastErrorMessage:
            typeof workspacePayload.whatsapp_last_error_message === 'string'
              ? workspacePayload.whatsapp_last_error_message
              : null,
          metaResult: current?.metaResult ?? null,
        }));
      }

      const nextTotalBalance = Array.isArray(data.wallets)
        ? data.wallets.reduce((acc: number, wallet: any) => acc + Number(wallet.balance || 0), 0)
        : 0;
      setTotalBalance(nextTotalBalance);

      if (mappedTransactions) {
        setTransactions(mappedTransactions);
      } else if (scope === 'full') {
        setTransactions([]);
      }
      if (mappedGoals) {
        setGoals(mappedGoals);
      } else if (scope === 'full') {
        setGoals([]);
      }
      if (mappedInvestments) {
        setInvestments(mappedInvestments);
      } else if (scope === 'full') {
        setInvestments([]);
      }
      if (mappedDebts) {
        setDebts(mappedDebts);
      } else if (scope === 'full') {
        setDebts([]);
      }
      if (mappedRecurringDebts) {
        setRecurringDebts(mappedRecurringDebts);
      } else if (scope === 'full') {
        setRecurringDebts([]);
      }

      const resolvedWorkspaceId =
        typeof data.activeWorkspaceId === 'string' ? data.activeWorkspaceId : workspaceIdForRequest || activeWorkspaceId;
      if (resolvedWorkspaceId) {
        const baseSnapshot =
          workspaceDashboardCacheRef.current[resolvedWorkspaceId] ??
          (user?.id ? readDashboardSnapshot(user.id, resolvedWorkspaceId) : null);
        const workspaceSnapshot: WorkspaceDashboardSnapshot = {
          totalBalance: nextTotalBalance,
          currentPlan: normalizePlan(data.plan),
          reportAccessLevel: data.limits?.reports === 'basic' ? 'basic' : 'full',
          currentMonthTransactionCount: Math.max(0, Number(data.currentMonthTransactionCount || 0)),
          aiUsageCount: normalizedUsage,
          transactions: mappedTransactions ?? baseSnapshot?.transactions ?? [],
          goals: mappedGoals ?? baseSnapshot?.goals ?? [],
          investments: mappedInvestments ?? baseSnapshot?.investments ?? [],
          debts: mappedDebts ?? baseSnapshot?.debts ?? [],
          recurringDebts: mappedRecurringDebts ?? baseSnapshot?.recurringDebts ?? [],
          workspaceEvents: mappedWorkspaceEvents ?? baseSnapshot?.workspaceEvents ?? [],
          dashboardOverview: baseSnapshot?.dashboardOverview ?? dashboardOverviewRef.current ?? null,
          reportsOverview: baseSnapshot?.reportsOverview ?? reportsOverviewRef.current ?? null,
          dashboardInsights: baseSnapshot?.dashboardInsights ?? [],
          isWhatsAppConnected: Boolean(
            data.workspace && String(data.workspace.whatsapp_status || '').toUpperCase() === 'CONNECTED'
          ),
          workspaceWhatsAppPhoneNumber:
            data.workspace && typeof data.workspace.whatsapp_phone_number === 'string' && data.workspace.whatsapp_phone_number
              ? `+${data.workspace.whatsapp_phone_number}`
              : baseSnapshot?.workspaceWhatsAppPhoneNumber ?? '',
          dashboardProjection: baseSnapshot?.dashboardProjection ?? null,
          dashboardCalendarReadModel: baseSnapshot?.dashboardCalendarReadModel ?? null,
        };
        workspaceDashboardCacheRef.current[resolvedWorkspaceId] = workspaceSnapshot;
        if (user?.id) {
          writeDashboardSnapshot(user.id, resolvedWorkspaceId, workspaceSnapshot);
        }
      }

      hasFetchedDashboardRef.current = true;
    } catch (error) {
      console.error('Workspace shell fetch error:', error);
    }
  }, [activeWorkspaceId, getAuthHeaders, setupUserOnServer, user]);

  const [isAssistantOpen, setIsAssistantOpen] = React.useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);
  const [showTutorial, setShowTutorial] = React.useState(false);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = React.useState(false);
  const [editingTransactionId, setEditingTransactionId] = React.useState<string | number | null>(null);
  const [isGoalModalOpen, setIsGoalModalOpen] = React.useState(false);
  const [editingGoalId, setEditingGoalId] = React.useState<string | number | null>(null);
  const [isInvestmentModalOpen, setIsInvestmentModalOpen] = React.useState(false);
  const [editingInvestmentId, setEditingInvestmentId] = React.useState<string | number | null>(null);
  const [isDebtModalOpen, setIsDebtModalOpen] = React.useState(false);
  const [editingDebtId, setEditingDebtId] = React.useState<string | number | null>(null);
  const [debtDraft, setDebtDraft] = React.useState<Partial<DebtFormData> | null>(null);
  const [debtFeedbackMessage, setDebtFeedbackMessage] = React.useState<string | null>(null);
  const [isRecurringDebtModalOpen, setIsRecurringDebtModalOpen] = React.useState(false);
  const [editingRecurringDebtId, setEditingRecurringDebtId] = React.useState<string | number | null>(null);
  const [recurringDebtDraft, setRecurringDebtDraft] = React.useState<Partial<RecurringDebtFormData> | null>(null);
  const [isWhatsAppConnected, setIsWhatsAppConnected] = React.useState(false);
  const [isConnectingWhatsApp, setIsConnectingWhatsApp] = React.useState(false);
  const [isDisconnectingWhatsApp, setIsDisconnectingWhatsApp] = React.useState(false);
  const [isSendingWhatsAppTest, setIsSendingWhatsAppTest] = React.useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = React.useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = React.useState(false);
  const [isQuickCreateOpen, setIsQuickCreateOpen] = React.useState(false);
  const [notificationPreferences, setNotificationPreferences] = React.useState<NotificationPreferenceState>({
    readIds: [],
    deletedIds: [],
  });
  const [settingsName, setSettingsName] = React.useState('');
  const [settingsEmail, setSettingsEmail] = React.useState('');
  const [settingsAvatarUrl, setSettingsAvatarUrl] = React.useState('');
  const [isAvatarProcessing, setIsAvatarProcessing] = React.useState(false);
  const [workspaceWhatsAppPhoneNumber, setWorkspaceWhatsAppPhoneNumber] = React.useState('');
  const [whatsAppFeedback, setWhatsAppFeedback] = React.useState<WhatsAppFeedback>(null);
  const [whatsAppDiagnostic, setWhatsAppDiagnostic] = React.useState<WhatsAppDiagnostic | null>(null);
  const [settingsSavedAt, setSettingsSavedAt] = React.useState<string | null>(null);
  const [workspaceEvents, setWorkspaceEvents] = React.useState<WorkspaceEventItem[]>([]);
  const [subscriptionSummary, setSubscriptionSummary] = React.useState<SubscriptionOverview | null>(null);
  const [subscriptionError, setSubscriptionError] = React.useState<string | null>(null);
  const [isSubscriptionLoading, setIsSubscriptionLoading] = React.useState(false);
  const [subscriptionActionLoading, setSubscriptionActionLoading] = React.useState<
    'cancel' | 'reactivate' | 'payment' | 'history' | null
  >(null);
  const [onboardingWorkspaceName, setOnboardingWorkspaceName] = React.useState('Minha Conta');
  const [onboardingObjective, setOnboardingObjective] = React.useState(ONBOARDING_OBJECTIVES[0]);
  const [onboardingProfile, setOnboardingProfile] = React.useState(ONBOARDING_USAGE_LEVELS[1]);
  const [onboardingDesiredPlan, setOnboardingDesiredPlan] = React.useState<'FREE' | 'PRO' | 'PREMIUM'>('FREE');
  const [onboardingAiSuggestionsEnabled, setOnboardingAiSuggestionsEnabled] = React.useState(true);
  const [onboardingStep, setOnboardingStep] = React.useState(0);
  const [onboardingFirstRecord, setOnboardingFirstRecord] = React.useState<TransactionFormData>(
    createInitialOnboardingTransaction()
  );
  const [onboardingFirstRecordAdded, setOnboardingFirstRecordAdded] = React.useState(false);
  const [onboardingInsightViewed, setOnboardingInsightViewed] = React.useState(false);
  const [isSavingOnboardingRecord, setIsSavingOnboardingRecord] = React.useState(false);
  const [isSavingOnboarding, setIsSavingOnboarding] = React.useState(false);
  const [isDismissingOnboarding, setIsDismissingOnboarding] = React.useState(false);
  const [transactionModalDraft, setTransactionModalDraft] = React.useState<Partial<TransactionFormData> | null>(
    null
  );
  const [customTransactionCategories, setCustomTransactionCategories] =
    React.useState<CustomTransactionCategoryBuckets>({
      income: [],
      expense: [],
    });

  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [goals, setGoals] = React.useState<Goal[]>([]);
  const [investments, setInvestments] = React.useState<Investment[]>([]);
  const [wallets, setWallets] = React.useState<WalletAccount[]>([]);
  const [bills, setBills] = React.useState<Bill[]>([]);
  const [debts, setDebts] = React.useState<Debt[]>([]);
  const [recurringDebts, setRecurringDebts] = React.useState<RecurringDebt[]>([]);

  const [messages, setMessages] = React.useState<Message[]>([
    {
      role: 'model',
      text: 'Sou seu assistente financeiro com IA.\nPosso analisar seus gastos,\nmetas e investimentos.',
      time: 'Agora',
    },
  ]);

  const [input, setInput] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [isRecordingAudio, setIsRecordingAudio] = React.useState(false);
  const [isSubmittingAudio, setIsSubmittingAudio] = React.useState(false);
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const mediaStreamRef = React.useRef<MediaStream | null>(null);
  const audioChunksRef = React.useRef<Blob[]>([]);
  const responseAudioUrlsRef = React.useRef<string[]>([]);
  const notificationStorageKey = React.useMemo(() => {
    if (!user?.id || !activeWorkspaceId) return null;
    return getNotificationStorageKey(user.id, activeWorkspaceId);
  }, [activeWorkspaceId, user?.id]);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      setIsSidebarCollapsed(window.localStorage.getItem(SIDEBAR_PREFERENCE_STORAGE_KEY) === 'true');
    } catch {
      setIsSidebarCollapsed(false);
    }
  }, []);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(SIDEBAR_PREFERENCE_STORAGE_KEY, String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  React.useEffect(() => {
    return () => {
      for (const url of responseAudioUrlsRef.current) {
        try {
          URL.revokeObjectURL(url);
        } catch {
          // noop
        }
      }
      responseAudioUrlsRef.current = [];

      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      mediaRecorderRef.current = null;

      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }
    };
  }, []);

  React.useEffect(() => {
    if (!notificationStorageKey || typeof window === 'undefined') {
      setNotificationPreferences({ readIds: [], deletedIds: [] });
      return;
    }

    try {
      const raw = window.localStorage.getItem(notificationStorageKey);
      if (!raw) {
        setNotificationPreferences({ readIds: [], deletedIds: [] });
        return;
      }

      const parsed = JSON.parse(raw) as Partial<NotificationPreferenceState>;
      setNotificationPreferences({
        readIds: Array.isArray(parsed.readIds) ? parsed.readIds.map(String) : [],
        deletedIds: Array.isArray(parsed.deletedIds) ? parsed.deletedIds.map(String) : [],
      });
    } catch {
      setNotificationPreferences({ readIds: [], deletedIds: [] });
    }
  }, [notificationStorageKey]);

  React.useEffect(() => {
    if (!notificationStorageKey || typeof window === 'undefined') return;
    window.localStorage.setItem(notificationStorageKey, JSON.stringify(notificationPreferences));
  }, [notificationPreferences, notificationStorageKey]);

  React.useEffect(() => {
    if (!uiFeedback) return;

    if (uiFeedbackTimeoutRef.current) {
      window.clearTimeout(uiFeedbackTimeoutRef.current);
    }
    uiFeedbackTimeoutRef.current = window.setTimeout(() => {
      setUiFeedback(null);
    }, 4200);

    return () => {
      if (uiFeedbackTimeoutRef.current) {
        window.clearTimeout(uiFeedbackTimeoutRef.current);
      }
    };
  }, [uiFeedback]);

  const hasUserMessages = React.useMemo(
    () => messages.some((message) => message.role === 'user'),
    [messages]
  );
  const aiUsageStorageKey = React.useMemo(() => {
    if (!user?.id) return null;
    return `cote-ai-usage-${user.id}-${getCurrentMonthKey()}`;
  }, [user?.id]);
  const isFreePlan = currentPlan === 'FREE';
  const transactionLimitReached =
    isFreePlan && currentMonthTransactionCount >= FREE_TRANSACTION_LIMIT_PER_MONTH;
  const aiLimitReached = isFreePlan && aiUsageCount >= FREE_AI_LIMIT_PER_MONTH;
  const planLabel = getPlanLabel(currentPlan);
  const activeTabTitle = TAB_LABELS[activeTab];
  const normalizedHeaderSearchTerm = headerSearchTerm.trim().toLowerCase();
  const headerSearchResults = React.useMemo(() => {
    const baseItems =
      normalizedHeaderSearchTerm.length === 0
        ? NAVIGATION_SEARCH_ITEMS
        : NAVIGATION_SEARCH_ITEMS.filter((item) => {
            const normalizedLabel = item.label.toLowerCase();
            const normalizedDescription = item.description.toLowerCase();
            const keywordMatch = item.keywords.some((keyword) => keyword.toLowerCase().includes(normalizedHeaderSearchTerm));
            return (
              normalizedLabel.includes(normalizedHeaderSearchTerm) ||
              normalizedDescription.includes(normalizedHeaderSearchTerm) ||
              keywordMatch
            );
          });

    return baseItems.slice(0, 6);
  }, [normalizedHeaderSearchTerm]);
  const editingTransaction = React.useMemo(
    () => transactions.find((tx) => tx.id === editingTransactionId) ?? null,
    [transactions, editingTransactionId]
  );
  const editingGoal = React.useMemo(
    () => goals.find((goal) => goal.id === editingGoalId) ?? null,
    [goals, editingGoalId]
  );
  const editingInvestment = React.useMemo(
    () => investments.find((inv) => inv.id === editingInvestmentId) ?? null,
    [investments, editingInvestmentId]
  );
  const editingDebt = React.useMemo(
    () => debts.find((debt) => debt.id === editingDebtId) ?? null,
    [debts, editingDebtId]
  );
  const editingRecurringDebt = React.useMemo(
    () => recurringDebts.find((debt) => debt.id === editingRecurringDebtId) ?? null,
    [recurringDebts, editingRecurringDebtId]
  );
  const lastUserIdRef = React.useRef<string | null>(null);
  const lastWorkspaceIdRef = React.useRef<string | null>(null);
  const hasFetchedDashboardRef = React.useRef(false);
  const hasFetchedDashboardOverviewRef = React.useRef(false);
  const hasFetchedReportsOverviewRef = React.useRef(false);
  const uiFeedbackTimeoutRef = React.useRef<number | null>(null);
  const headerSearchRef = React.useRef<HTMLDivElement | null>(null);
  const quickCreateMenuRef = React.useRef<HTMLDivElement | null>(null);
  const avatarInputRef = React.useRef<HTMLInputElement | null>(null);
  const workspaceDashboardCacheRef = React.useRef<Record<string, WorkspaceDashboardSnapshot>>({});

  const showUiFeedback = React.useCallback((message: string, tone: UiFeedbackTone = 'error') => {
    setUiFeedback({
      id: Date.now(),
      tone,
      message,
    });
  }, []);

  const dismissUiFeedback = React.useCallback(() => {
    setUiFeedback(null);
  }, []);

  const navigateToTab = React.useCallback(
    (tab: Tab, options?: { openAssistant?: boolean }) => {
      if (!isTabValue(tab)) return;
      setActiveTab(tab);
      if (tab !== 'transactions') setTransactionsInitialFlowFilter(null);
      if (options?.openAssistant || tab === 'assistant') {
        setIsAssistantOpen(true);
      }
      setIsSidebarOpen(false);
      setIsQuickCreateOpen(false);
      setIsProfileMenuOpen(false);
      setIsNotificationsOpen(false);
      setIsHeaderSearchOpen(false);
      setHeaderSearchTerm('');
    },
    []
  );

  const openAssistantWithPrompt = React.useCallback(
    (prompt?: string) => {
      if (prompt) {
        setInput(prompt);
      }
      navigateToTab('assistant', { openAssistant: true });
    },
    [navigateToTab]
  );

  const handleDashboardOpenSummaryTarget = React.useCallback(
    (target: 'balance' | 'income' | 'expense' | 'net') => {
      if (target === 'income') {
        setTransactionsInitialFlowFilter('Entrada');
      } else if (target === 'expense') {
        setTransactionsInitialFlowFilter('Saida');
      } else {
        setTransactionsInitialFlowFilter(null);
      }
      navigateToTab('transactions');
    },
    [navigateToTab]
  );

  const handleDashboardOpenTransactions = React.useCallback(() => {
    setTransactionsInitialFlowFilter(null);
    navigateToTab('transactions');
  }, [navigateToTab]);

  const handleDashboardOpenTransactionDetail = React.useCallback(
    (overviewTransaction: DashboardOverviewRecentTransaction) => {
      const transactionToEdit =
        transactions.find((transaction) => String(transaction.id) === String(overviewTransaction.id)) ?? null;

      setTransactionsInitialFlowFilter(null);
      navigateToTab('transactions');

      if (transactionToEdit) {
        setTransactionModalDraft(null);
        setEditingTransactionId(transactionToEdit.id);
        setIsTransactionModalOpen(true);
      }
    },
    [navigateToTab, transactions]
  );

  const applyDashboardSnapshot = React.useCallback((snapshot: WorkspaceDashboardSnapshot) => {
    const safeOverview = isDashboardOverviewPayloadCompatible(snapshot.dashboardOverview)
      ? snapshot.dashboardOverview
      : null;
    const safeCurrentPlan = normalizePlan(snapshot.currentPlan);
    const safeReportAccessLevel: ReportAccessLevel =
      snapshot.reportAccessLevel === 'full' ? 'full' : 'basic';

    setIsDisconnectingWhatsApp(false);
    setTotalBalance(Number(snapshot.totalBalance) || 0);
    setCurrentPlan(safeCurrentPlan);
    setReportAccessLevel(safeReportAccessLevel);
    setCurrentMonthTransactionCount(Math.max(0, Number(snapshot.currentMonthTransactionCount) || 0));
    setAiUsageCount(Math.max(0, Number(snapshot.aiUsageCount) || 0));
    setTransactions(toArray<Transaction>(snapshot.transactions));
    setGoals(toArray<Goal>(snapshot.goals));
    setInvestments(toArray<Investment>(snapshot.investments));
    setDebts(toArray<Debt>(snapshot.debts));
    setRecurringDebts(toArray<RecurringDebt>(snapshot.recurringDebts));
    setWorkspaceEvents(toArray<WorkspaceEventItem>(snapshot.workspaceEvents));
    setDashboardOverview(safeOverview);
    setReportsOverview(snapshot.reportsOverview ?? null);
    setDashboardInsights(toArray<string>(snapshot.dashboardInsights).map((value) => String(value)));
    setDashboardProjection(snapshot.dashboardProjection ?? null);
    setDashboardCalendarReadModel(snapshot.dashboardCalendarReadModel ?? null);
    setIsWhatsAppConnected(Boolean(snapshot.isWhatsAppConnected));
    setWorkspaceWhatsAppPhoneNumber(
      typeof snapshot.workspaceWhatsAppPhoneNumber === 'string' ? snapshot.workspaceWhatsAppPhoneNumber : ''
    );
  }, []);

  const resolveWorkspaceIdForResourceRequest = React.useCallback(() => {
    const preferredWorkspaceId = !activeWorkspaceId && user?.id ? readActiveWorkspacePreference(user.id) : null;
    const workspaceIdForRequest = activeWorkspaceId || preferredWorkspaceId || null;
    if (preferredWorkspaceId && preferredWorkspaceId !== activeWorkspaceId) {
      setActiveWorkspaceId(preferredWorkspaceId);
    }
    return workspaceIdForRequest;
  }, [activeWorkspaceId, user?.id]);

  const upsertWorkspaceSnapshot = React.useCallback(
    (workspaceId: string, patch: Partial<WorkspaceDashboardSnapshot>) => {
      const baseSnapshot =
        workspaceDashboardCacheRef.current[workspaceId] ??
        (user?.id ? readDashboardSnapshot(user.id, workspaceId) : null);

      const nextSnapshot: WorkspaceDashboardSnapshot = {
        totalBalance: baseSnapshot?.totalBalance ?? totalBalance,
        currentPlan: baseSnapshot?.currentPlan ?? currentPlan,
        reportAccessLevel: baseSnapshot?.reportAccessLevel ?? reportAccessLevel,
        currentMonthTransactionCount: baseSnapshot?.currentMonthTransactionCount ?? currentMonthTransactionCount,
        aiUsageCount: baseSnapshot?.aiUsageCount ?? aiUsageCount,
        transactions: baseSnapshot?.transactions ?? transactions,
        goals: baseSnapshot?.goals ?? goals,
        investments: baseSnapshot?.investments ?? investments,
        debts: baseSnapshot?.debts ?? debts,
        recurringDebts: baseSnapshot?.recurringDebts ?? recurringDebts,
        workspaceEvents: baseSnapshot?.workspaceEvents ?? workspaceEvents,
        dashboardOverview: baseSnapshot?.dashboardOverview ?? dashboardOverviewRef.current ?? null,
        reportsOverview: baseSnapshot?.reportsOverview ?? reportsOverviewRef.current ?? null,
        dashboardInsights: baseSnapshot?.dashboardInsights ?? dashboardInsights,
        isWhatsAppConnected: baseSnapshot?.isWhatsAppConnected ?? isWhatsAppConnected,
        workspaceWhatsAppPhoneNumber: baseSnapshot?.workspaceWhatsAppPhoneNumber ?? workspaceWhatsAppPhoneNumber,
        dashboardProjection: baseSnapshot?.dashboardProjection ?? dashboardProjection,
        dashboardCalendarReadModel: baseSnapshot?.dashboardCalendarReadModel ?? dashboardCalendarReadModel,
        ...patch,
      };

      workspaceDashboardCacheRef.current[workspaceId] = nextSnapshot;
      if (user?.id) {
        writeDashboardSnapshot(user.id, workspaceId, nextSnapshot);
      }
    },
    [
      aiUsageCount,
      currentMonthTransactionCount,
      currentPlan,
      dashboardInsights,
      dashboardCalendarReadModel,
      dashboardProjection,
      debts,
      goals,
      investments,
      isWhatsAppConnected,
      recurringDebts,
      reportAccessLevel,
      totalBalance,
      transactions,
      user?.id,
      workspaceEvents,
      workspaceWhatsAppPhoneNumber,
    ]
  );

  const fetchDashboardOverviewData = React.useCallback(async (options?: { silent?: boolean; periodSelection?: DashboardPeriodSelection }) => {
    if (!user) return;

    const silent = Boolean(options?.silent);
    if (!silent) {
      setDashboardOverviewError(null);
    }
    if (!silent) {
      setDashboardOverviewLoading(true);
    }

    const selectionFromUrl =
      typeof window !== 'undefined'
        ? readDashboardPeriodSelectionFromSearch(window.location.search)
        : {
            period: 'this_month' as const,
            startDate: null,
            endDate: null,
            timeZone: getBrowserTimeZone(),
          };
    const periodSelection: DashboardPeriodSelection = {
      ...selectionFromUrl,
      ...(options?.periodSelection || {}),
      timeZone:
        options?.periodSelection?.timeZone ||
        selectionFromUrl.timeZone ||
        getBrowserTimeZone(),
    };

    const fallbackRange = resolveDashboardDateRange({
      period: periodSelection.period,
      startDate: periodSelection.startDate,
      endDate: periodSelection.endDate,
      timeZone: periodSelection.timeZone,
      now: new Date(),
    });

    const workspaceIdForRequest = resolveWorkspaceIdForResourceRequest();

    try {
      let payload: DashboardOverviewPayload;
      try {
        payload = await fetchDashboardOverviewResource({
          getAuthHeaders,
          workspaceIdOverride: workspaceIdForRequest,
          periodSelection,
        });
      } catch (error) {
        if (error instanceof ResourceClientError && error.status === 404) {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (!session?.access_token) {
            throw error;
          }
          await setupUserOnServer(session.access_token, session.user?.id);
          payload = await fetchDashboardOverviewResource({
            getAuthHeaders,
            workspaceIdOverride: workspaceIdForRequest,
            periodSelection,
          });
        } else {
          throw error;
        }
      }

      if (!isDashboardOverviewPayloadCompatible(payload)) {
        throw new Error('Resposta da dashboard em formato inesperado.');
      }

      setDashboardOverview(payload);
      setDashboardOverviewError(null);
      const resolvedWorkspaceId = payload.workspaceId || workspaceIdForRequest || activeWorkspaceId;
      if (resolvedWorkspaceId) {
        upsertWorkspaceSnapshot(resolvedWorkspaceId, { dashboardOverview: payload });
      }
      hasFetchedDashboardOverviewRef.current = true;
    } catch (error) {
      console.error('Dashboard overview fetch error:', error);
      if (isTransientDashboardOverviewError(error)) {
        setDashboardOverviewError(null);
        return;
      }
      const friendlyMessage =
        error instanceof Error
          ? error.message
          : 'Nao foi possivel carregar a dashboard agora. Tente novamente em instantes.';
      setDashboardOverviewError(friendlyMessage);
      setDashboardOverview((current) =>
        current ?? {
          workspaceId: workspaceIdForRequest || activeWorkspaceId || 'unknown',
          generatedAt: new Date().toISOString(),
          period: {
            preset: fallbackRange.period,
            label: fallbackRange.label,
            startDate: fallbackRange.startDate,
            endDate: fallbackRange.endDate,
            timeZone: fallbackRange.timeZone,
            granularity: fallbackRange.granularity,
            comparisonLabel: 'Comparado ao periodo anterior equivalente',
          },
          summary: {
            currentBalance: 0,
            projectedBalance30d: 0,
            inflow: 0,
            outflow: 0,
            periodNet: 0,
            upcomingInflow: 0,
            upcomingOutflow: 0,
            upcomingInflowCount: 0,
            upcomingOutflowCount: 0,
            comparison: {
              label: 'Sem comparacao disponivel',
              inflow: 0,
              outflow: 0,
              periodNet: 0,
              inflowDeltaPercent: null,
              outflowDeltaPercent: null,
              periodNetDeltaPercent: null,
            },
          },
          forecast: {
            asOfDate: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            granularity: fallbackRange.granularity,
            currentBalance: 0,
            projectedBalance30d: 0,
            projectedNegativeDate: null,
            nextCriticalDate: null,
            monthConfirmedIncome: 0,
            monthConfirmedExpense: 0,
            monthPlannedIncome: 0,
            monthPlannedExpense: 0,
            daily: [],
          },
          monthlySeries: [],
          alerts: [
            {
              id: 'dashboard-overview-error',
              tone: 'warning',
              title: 'Visao geral indisponivel',
              message: friendlyMessage,
            },
          ],
          insights: {
            primary: [],
            automated: [],
          },
          upcomingEvents: [],
          recentTransactions: [],
        }
      );
    } finally {
      if (!silent) {
        setDashboardOverviewLoading(false);
      }
    }
  }, [activeWorkspaceId, getAuthHeaders, resolveWorkspaceIdForResourceRequest, setupUserOnServer, upsertWorkspaceSnapshot, user]);

  const handleDashboardPeriodChange = React.useCallback(
    (selection: DashboardPeriodSelection) => {
      const normalizedSelection: DashboardPeriodSelection = {
        ...selection,
        timeZone: selection.timeZone || getBrowserTimeZone(),
      };
      writeDashboardPeriodSelectionToUrl(normalizedSelection, 'push');
      void fetchDashboardOverviewData({
        periodSelection: normalizedSelection,
      });
    },
    [fetchDashboardOverviewData]
  );

  const fetchReportsOverviewData = React.useCallback(async (options?: { silent?: boolean }) => {
    if (!user) return;

    const workspaceIdForRequest = resolveWorkspaceIdForResourceRequest();
    try {
      let payload: ReportsOverviewPayload;
      try {
        payload = await fetchReportsOverviewResource({
          getAuthHeaders,
          workspaceIdOverride: workspaceIdForRequest,
        });
      } catch (error) {
        if (error instanceof ResourceClientError && error.status === 404) {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (!session?.access_token) {
            throw error;
          }
          await setupUserOnServer(session.access_token, session.user?.id);
          payload = await fetchReportsOverviewResource({
            getAuthHeaders,
            workspaceIdOverride: workspaceIdForRequest,
          });
        } else {
          throw error;
        }
      }

      setReportsOverview(payload);
      hasFetchedReportsOverviewRef.current = true;
      const resolvedWorkspaceId = workspaceIdForRequest || activeWorkspaceId;
      if (resolvedWorkspaceId) {
        upsertWorkspaceSnapshot(resolvedWorkspaceId, { reportsOverview: payload });
      }
    } catch (error) {
      console.error('Reports overview fetch error:', error);
    }
  }, [activeWorkspaceId, getAuthHeaders, resolveWorkspaceIdForResourceRequest, setupUserOnServer, upsertWorkspaceSnapshot, user]);

  const fetchDashboardDataRef = React.useRef(fetchDashboardData);
  const fetchDashboardOverviewDataRef = React.useRef(fetchDashboardOverviewData);
  const fetchReportsOverviewDataRef = React.useRef(fetchReportsOverviewData);

  React.useEffect(() => {
    fetchDashboardDataRef.current = fetchDashboardData;
  }, [fetchDashboardData]);

  React.useEffect(() => {
    fetchDashboardOverviewDataRef.current = fetchDashboardOverviewData;
  }, [fetchDashboardOverviewData]);

  React.useEffect(() => {
    fetchReportsOverviewDataRef.current = fetchReportsOverviewData;
  }, [fetchReportsOverviewData]);

  React.useEffect(() => {
    if (!user) return;

    const scope = activeTab === 'dashboard' ? 'transactions' : 'full';
    const delayMs = scope === 'transactions' && !hasFetchedDashboardRef.current ? 900 : 0;
    const timeoutId = window.setTimeout(() => {
      void fetchDashboardDataRef.current({
        silent: hasFetchedDashboardRef.current,
        scope,
      });
    }, delayMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [activeTab, activeWorkspaceId, user]);

  React.useEffect(() => {
    if (user) {
      void fetchDashboardOverviewDataRef.current({ silent: hasFetchedDashboardOverviewRef.current });
    }
  }, [activeWorkspaceId, user]);

  React.useEffect(() => {
    if (user && activeTab === 'reports') {
      void fetchReportsOverviewDataRef.current({ silent: hasFetchedReportsOverviewRef.current });
    }
  }, [activeTab, activeWorkspaceId, user]);

  const refreshTransactionsResource = React.useCallback(
    async (options?: TransactionsResourceRefreshOptions) => {
      if (!user) return;

      const {
        syncTransactions = true,
        syncWallets = true,
        syncWorkspaceEvents = true,
        syncInsights = true,
        syncProjection = true,
        syncCalendarReadModel = true,
        syncTotalsAndPlan = true,
        syncUsageAndLimits = true,
        syncWhatsAppState = true,
      } = options ?? {};

      const workspaceIdForRequest = resolveWorkspaceIdForResourceRequest();
      const data = await fetchTransactionsContext({
        getAuthHeaders,
        workspaceIdOverride: workspaceIdForRequest,
      });

      const shouldMapTransactions =
        syncTransactions || (syncUsageAndLimits && typeof data?.currentMonthTransactionCount !== 'number');
      const mappedTransactions = shouldMapTransactions
        ? Array.isArray(data?.transactions)
          ? data.transactions.map((tx: any) => mapApiTransactionToClientTransaction(tx))
          : []
        : null;
      const mappedWallets = syncWallets
        ? Array.isArray(data?.wallets)
          ? data.wallets.map((wallet: any) => ({
              id: String(wallet.id),
              name: String(wallet.name || 'Conta'),
              balance: Number(wallet.balance || 0),
            }))
          : []
        : null;
      const mappedWorkspaceEvents = syncWorkspaceEvents
        ? Array.isArray(data?.recentEvents)
          ? data.recentEvents.map((event: any) => ({
              id: String(event.id),
              type: String(event.type || 'workspace.event'),
              created_at: String(event.created_at || new Date().toISOString()),
              user_id: typeof event.user_id === 'string' ? event.user_id : null,
              payload:
                event.payload && typeof event.payload === 'object'
                  ? (event.payload as Record<string, unknown>)
                  : null,
            }))
          : []
        : null;
      const mappedInsights = syncInsights
        ? []
        : null;
      const mappedProjection = null;

      const mappedCalendarReadModel: DashboardCalendarReadModel | null = null;

      const workspaceSnapshotPatch: Partial<WorkspaceDashboardSnapshot> = {};

      if (syncTransactions && mappedTransactions) {
        setTransactions(mappedTransactions);
        workspaceSnapshotPatch.transactions = mappedTransactions;
      }

      if (syncWallets && mappedWallets) {
        setWallets(mappedWallets);
      }

      if (syncWorkspaceEvents && mappedWorkspaceEvents) {
        setWorkspaceEvents(mappedWorkspaceEvents);
        workspaceSnapshotPatch.workspaceEvents = mappedWorkspaceEvents;
      }

      if (syncInsights && mappedInsights) {
        setDashboardInsights(mappedInsights);
        workspaceSnapshotPatch.dashboardInsights = mappedInsights;
      }

      if (syncProjection) {
        setDashboardProjection(mappedProjection);
        workspaceSnapshotPatch.dashboardProjection = mappedProjection;
      }

      if (syncCalendarReadModel && mappedCalendarReadModel) {
        setDashboardCalendarReadModel(mappedCalendarReadModel);
        workspaceSnapshotPatch.dashboardCalendarReadModel = mappedCalendarReadModel;
      }

      if (syncTotalsAndPlan) {
        const nextTotalBalance =
          mappedWallets?.reduce((acc, wallet) => acc + Number(wallet.balance || 0), 0) ?? null;
        if (nextTotalBalance !== null) {
          setTotalBalance((current) => (current === nextTotalBalance ? current : nextTotalBalance));
          workspaceSnapshotPatch.totalBalance = nextTotalBalance;
        }

        if (data?.plan) {
          const nextPlan = normalizePlan(data.plan);
          setCurrentPlan((current) => (current === nextPlan ? current : nextPlan));
          workspaceSnapshotPatch.currentPlan = nextPlan;
        }

        if (data?.limits?.reports === 'basic' || data?.limits?.reports === 'full') {
          const nextReportAccess = data.limits.reports;
          setReportAccessLevel((current) => (current === nextReportAccess ? current : nextReportAccess));
          workspaceSnapshotPatch.reportAccessLevel = nextReportAccess;
        } else if (data?.plan === 'FREE') {
          setReportAccessLevel((current) => (current === 'basic' ? current : 'basic'));
          workspaceSnapshotPatch.reportAccessLevel = 'basic';
        } else if (data?.plan) {
          setReportAccessLevel((current) => (current === 'full' ? current : 'full'));
          workspaceSnapshotPatch.reportAccessLevel = 'full';
        }
      }

      if (syncUsageAndLimits) {
        let nextMonthTransactionCount: number | null = null;
        if (typeof data?.currentMonthTransactionCount === 'number') {
          nextMonthTransactionCount = Math.max(0, data.currentMonthTransactionCount);
        } else if (mappedTransactions) {
          nextMonthTransactionCount = mappedTransactions.filter((tx: Transaction) =>
            isInCurrentMonth(parseTransactionDate(tx.date))
          ).length;
        }

        if (nextMonthTransactionCount !== null) {
          setCurrentMonthTransactionCount((current) =>
            current === nextMonthTransactionCount ? current : nextMonthTransactionCount
          );
          workspaceSnapshotPatch.currentMonthTransactionCount = nextMonthTransactionCount;
        }

        if (typeof data?.currentMonthAiUsage === 'number') {
          const normalizedUsage = Math.max(0, data.currentMonthAiUsage);
          setAiUsageCount((current) => (current === normalizedUsage ? current : normalizedUsage));
          workspaceSnapshotPatch.aiUsageCount = normalizedUsage;
          if (user.id) {
            const usageStorageKey = `cote-ai-usage-${user.id}-${getCurrentMonthKey()}`;
            window.localStorage.setItem(usageStorageKey, String(normalizedUsage));
          }
        }
      }

      if (syncWhatsAppState && data?.workspace) {
        const workspaceStatus = String(data.workspace.whatsapp_status || '').toUpperCase();
        const isConnected = workspaceStatus === 'CONNECTED';
        const phoneNumber =
          typeof data.workspace.whatsapp_phone_number === 'string' && data.workspace.whatsapp_phone_number
            ? `+${data.workspace.whatsapp_phone_number}`
            : '';
        setIsWhatsAppConnected((current) => (current === isConnected ? current : isConnected));
        setWorkspaceWhatsAppPhoneNumber((current) => (current === phoneNumber ? current : phoneNumber));
        workspaceSnapshotPatch.isWhatsAppConnected = isConnected;
        workspaceSnapshotPatch.workspaceWhatsAppPhoneNumber = phoneNumber;
      }

      const resolvedWorkspaceId =
        typeof data?.activeWorkspaceId === 'string' ? data.activeWorkspaceId : workspaceIdForRequest || activeWorkspaceId;
      if (resolvedWorkspaceId && Object.keys(workspaceSnapshotPatch).length > 0) {
        upsertWorkspaceSnapshot(resolvedWorkspaceId, workspaceSnapshotPatch);
      }
    },
    [activeWorkspaceId, getAuthHeaders, resolveWorkspaceIdForResourceRequest, upsertWorkspaceSnapshot, user]
  );

  const refreshGoalsResource = React.useCallback(async () => {
    if (!user) return;
    const workspaceIdForRequest = resolveWorkspaceIdForResourceRequest();
    const payload = await fetchGoalsContext({
      getAuthHeaders,
      workspaceIdOverride: workspaceIdForRequest,
    });
    const mappedGoals = Array.isArray(payload) ? payload.map((goal: any) => mapApiGoalToClientGoal(goal)) : [];
    setGoals(mappedGoals);
    const resolvedWorkspaceId = workspaceIdForRequest || activeWorkspaceId;
    if (resolvedWorkspaceId) {
      upsertWorkspaceSnapshot(resolvedWorkspaceId, { goals: mappedGoals });
    }
    void fetchReportsOverviewData({ silent: true });
  }, [activeWorkspaceId, fetchReportsOverviewData, getAuthHeaders, resolveWorkspaceIdForResourceRequest, upsertWorkspaceSnapshot, user]);

  const refreshInvestmentsResource = React.useCallback(async () => {
    if (!user) return;
    const workspaceIdForRequest = resolveWorkspaceIdForResourceRequest();
    const payload = await fetchInvestmentsContext({
      getAuthHeaders,
      workspaceIdOverride: workspaceIdForRequest,
    });
    const mappedInvestments = Array.isArray(payload)
      ? payload.map((investment: any) => mapApiInvestmentToClientInvestment(investment))
      : [];
    setInvestments(mappedInvestments);
    const resolvedWorkspaceId = workspaceIdForRequest || activeWorkspaceId;
    if (resolvedWorkspaceId) {
      upsertWorkspaceSnapshot(resolvedWorkspaceId, { investments: mappedInvestments });
    }
  }, [activeWorkspaceId, getAuthHeaders, resolveWorkspaceIdForResourceRequest, upsertWorkspaceSnapshot, user]);

  const refreshDebtsResource = React.useCallback(async () => {
    if (!user) return;
    const workspaceIdForRequest = resolveWorkspaceIdForResourceRequest();
    const payload = await fetchDebtsContext({
      getAuthHeaders,
      workspaceIdOverride: workspaceIdForRequest,
    });
    const mappedDebts = Array.isArray(payload) ? payload.map((debt: any) => mapApiDebtToClientDebt(debt)) : [];
    setDebts(mappedDebts);
    const resolvedWorkspaceId = workspaceIdForRequest || activeWorkspaceId;
    if (resolvedWorkspaceId) {
      upsertWorkspaceSnapshot(resolvedWorkspaceId, { debts: mappedDebts });
    }
  }, [activeWorkspaceId, getAuthHeaders, resolveWorkspaceIdForResourceRequest, upsertWorkspaceSnapshot, user]);

  const refreshRecurringDebtsResource = React.useCallback(async () => {
    if (!user) return;
    const workspaceIdForRequest = resolveWorkspaceIdForResourceRequest();
    const payload = await fetchRecurringDebtsContext({
      getAuthHeaders,
      workspaceIdOverride: workspaceIdForRequest,
    });
    const mappedRecurringDebts = Array.isArray(payload)
      ? payload.map((debt: any) => mapApiRecurringDebtToClientRecurringDebt(debt))
      : [];
    setRecurringDebts(mappedRecurringDebts);
    const resolvedWorkspaceId = workspaceIdForRequest || activeWorkspaceId;
    if (resolvedWorkspaceId) {
      upsertWorkspaceSnapshot(resolvedWorkspaceId, { recurringDebts: mappedRecurringDebts });
    }
  }, [activeWorkspaceId, getAuthHeaders, resolveWorkspaceIdForResourceRequest, upsertWorkspaceSnapshot, user]);

  const refreshProjectionAndCalendarResource = React.useCallback(async () => {
    await refreshTransactionsResource({
      syncTransactions: false,
      syncWallets: false,
      syncWorkspaceEvents: false,
      syncInsights: false,
      syncProjection: true,
      syncCalendarReadModel: false,
      syncTotalsAndPlan: false,
      syncUsageAndLimits: false,
      syncWhatsAppState: false,
    });
  }, [refreshTransactionsResource]);

    const triggerDeferredProjectionRefresh = React.useCallback(
      (delayMs = 500) => {
        if (typeof window === 'undefined') {
          void refreshProjectionAndCalendarResource();
          void fetchDashboardOverviewData({ silent: true });
          if (activeTab === 'reports' || hasFetchedReportsOverviewRef.current) {
            void fetchReportsOverviewData({ silent: true });
          }
          return;
        }
        window.setTimeout(() => {
          void fetchDashboardOverviewData({ silent: true });
          if (activeTab === 'reports' || hasFetchedReportsOverviewRef.current) {
            void fetchReportsOverviewData({ silent: true });
          }
        }, Math.max(0, delayMs));
      },
    [activeTab, fetchDashboardOverviewData, fetchReportsOverviewData, refreshProjectionAndCalendarResource]
    );

  const refreshTransactionsAfterMutation = React.useCallback(() => {
    void refreshTransactionsResource({
      syncTransactions: true,
      syncWallets: true,
      syncWorkspaceEvents: true,
      syncInsights: false,
      syncProjection: false,
      syncCalendarReadModel: false,
      syncTotalsAndPlan: true,
      syncUsageAndLimits: true,
      syncWhatsAppState: false,
    });
    triggerDeferredProjectionRefresh(700);
  }, [refreshTransactionsResource, triggerDeferredProjectionRefresh]);

  React.useEffect(() => {
    const nextUserId = user?.id ?? null;
    if (lastUserIdRef.current !== nextUserId) {
      workspaceDashboardCacheRef.current = {};
      setTransactions([]);
      setGoals([]);
      setInvestments([]);
      setDebts([]);
      setRecurringDebts([]);
      setBills([]);
      setWorkspaceEvents([]);
      setDashboardOverview(null);
      setDashboardOverviewError(null);
      setSubscriptionSummary(null);
      setSubscriptionError(null);
      setIsSubscriptionLoading(false);
      setSubscriptionActionLoading(null);
      setDashboardInsights([]);
      setDashboardProjection(null);
      setDashboardCalendarReadModel(null);
      setTotalBalance(0);
      setCurrentPlan('FREE');
      setReportAccessLevel('basic');
      setCurrentMonthTransactionCount(0);
      setAiUsageCount(0);
      setIsWhatsAppConnected(false);
      setIsDisconnectingWhatsApp(false);
      setWorkspaceWhatsAppPhoneNumber('');
      setWhatsAppFeedback(null);
      setWhatsAppDiagnostic(null);
      setMessages([
        {
          role: 'model',
          text: 'Sou seu assistente financeiro com IA.\nPosso analisar seus gastos,\nmetas e investimentos.',
          time: 'Agora',
        },
      ]);
      if (!nextUserId) {
        setWorkspaces([]);
        setActiveWorkspaceId(null);
      }
      hasFetchedDashboardRef.current = false;
      hasFetchedDashboardOverviewRef.current = false;
      hasFetchedReportsOverviewRef.current = false;
      lastWorkspaceIdRef.current = null;
      lastUserIdRef.current = nextUserId;
    }
  }, [user?.id]);

React.useEffect(() => {
  if (!user?.id) return;
  if (lastWorkspaceIdRef.current === activeWorkspaceId) return;
  lastWorkspaceIdRef.current = activeWorkspaceId;
  if (!activeWorkspaceId) return;
  const cachedWorkspaceData =
    workspaceDashboardCacheRef.current[activeWorkspaceId] ?? readDashboardSnapshot(user.id, activeWorkspaceId);
  if (!cachedWorkspaceData) return;
  workspaceDashboardCacheRef.current[activeWorkspaceId] = cachedWorkspaceData;
  applyDashboardSnapshot(cachedWorkspaceData);
}, [activeWorkspaceId, applyDashboardSnapshot, user?.id]);

  React.useEffect(() => {
    if (!user?.id || !activeWorkspaceId) return;
    writeActiveWorkspacePreference(user.id, activeWorkspaceId);
  }, [activeWorkspaceId, user?.id]);

  React.useEffect(() => {
    if (!user?.id || !activeWorkspaceId) {
      setCustomTransactionCategories({ income: [], expense: [] });
      return;
    }
    setCustomTransactionCategories(readCustomTransactionCategories(user.id, activeWorkspaceId));
  }, [activeWorkspaceId, user?.id]);

  React.useEffect(() => {
    const handlePopState = () => {
      const searchParams = new URLSearchParams(window.location.search);
      const requestedTab = searchParams.get(APP_TAB_QUERY_PARAM);
      suppressNextTabHistorySyncRef.current = true;
      setActiveTab(isTabValue(requestedTab) ? requestedTab : 'dashboard');
      setIsSidebarOpen(false);
      setIsQuickCreateOpen(false);
      setIsProfileMenuOpen(false);
      setIsNotificationsOpen(false);
      setIsHeaderSearchOpen(false);

      const periodSelection = readDashboardPeriodSelectionFromSearch(window.location.search);
      void fetchDashboardOverviewDataRef.current({
        silent: true,
        periodSelection,
      });
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  React.useEffect(() => {
    if (!isHeaderSearchOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (headerSearchRef.current && event.target instanceof Node && !headerSearchRef.current.contains(event.target)) {
        setIsHeaderSearchOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [isHeaderSearchOpen]);

  React.useEffect(() => {
    if (!isQuickCreateOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (
        quickCreateMenuRef.current &&
        event.target instanceof Node &&
        !quickCreateMenuRef.current.contains(event.target)
      ) {
        setIsQuickCreateOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [isQuickCreateOpen]);

  const applyWhatsAppPayload = React.useCallback((payload: any) => {
    if (!payload || typeof payload !== 'object') return;

    if (typeof payload.status === 'string') {
      setIsWhatsAppConnected(String(payload.status).toUpperCase() === 'CONNECTED');
    }

    if (typeof payload.phoneNumber === 'string' && payload.phoneNumber) {
      setWorkspaceWhatsAppPhoneNumber(`+${String(payload.phoneNumber).replace(/^\+/, '')}`);
    } else if ('phoneNumber' in payload) {
      setWorkspaceWhatsAppPhoneNumber('');
    }

    const fallbackState = resolveWhatsAppConnectionState({
      statusValue: payload.status,
      diagnosticValue: null,
    });

    if (payload.diagnostic && typeof payload.diagnostic === 'object') {
      const diagnostic = payload.diagnostic as Record<string, unknown>;
      setWhatsAppDiagnostic((current) => ({
        numeroConectado:
          typeof diagnostic.numeroConectado === 'string'
            ? diagnostic.numeroConectado
            : current?.numeroConectado ?? null,
        connectionState: resolveWhatsAppConnectionState({
          statusValue: payload.status,
          diagnosticValue: diagnostic.connectionState ?? fallbackState,
        }),
        lastValidatedAt:
          typeof diagnostic.lastValidatedAt === 'string' ? diagnostic.lastValidatedAt : current?.lastValidatedAt ?? null,
        lastTestSentAt:
          typeof diagnostic.lastTestSentAt === 'string' ? diagnostic.lastTestSentAt : current?.lastTestSentAt ?? null,
        lastErrorMessage:
          typeof diagnostic.lastErrorMessage === 'string'
            ? diagnostic.lastErrorMessage
            : current?.lastErrorMessage ?? null,
        metaResult:
          typeof diagnostic.metaResult === 'string' || (diagnostic.metaResult && typeof diagnostic.metaResult === 'object')
            ? (diagnostic.metaResult as WhatsAppDiagnostic['metaResult'])
            : current?.metaResult ?? null,
      }));
    } else if ('status' in payload) {
      setWhatsAppDiagnostic((current) =>
        current
          ? {
              ...current,
              connectionState: fallbackState,
            }
          : {
              numeroConectado: null,
              connectionState: fallbackState,
              lastValidatedAt: null,
              lastTestSentAt: null,
              lastErrorMessage: null,
              metaResult: null,
            }
      );
    }
  }, []);

  const parseWhatsAppResponse = React.useCallback(async (response: Response) => {
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw {
        status: response.status,
        payload,
      };
    }
    return payload;
  }, []);

  const handleConnectWhatsApp = React.useCallback(async () => {
    setIsConnectingWhatsApp(true);
    setWhatsAppFeedback(null);
    try {
      const response = await fetch('/api/workspace/whatsapp', {
        method: 'POST',
        headers: await getAuthHeaders(true),
        body: JSON.stringify({
          action: 'connect',
          phoneNumber: workspaceWhatsAppPhoneNumber,
        }),
      });
      const payload = await parseWhatsAppResponse(response);
      applyWhatsAppPayload(payload);
      const connectionState = resolveWhatsAppConnectionState({
        statusValue: payload?.status,
        diagnosticValue: payload?.diagnostic?.connectionState,
      });
      setWhatsAppFeedback({
        tone: connectionState === 'connected' ? 'success' : 'info',
        title: connectionState === 'connected' ? 'WhatsApp conectado' : 'Conexão em validação',
        message:
          typeof payload?.message === 'string'
            ? payload.message
            : connectionState === 'connected'
              ? 'O WhatsApp foi conectado com sucesso.'
              : 'A Meta aceitou a conexão. Agora falta apenas a confirmação final de entrega.',
      });
    } catch (error: any) {
      const message =
        typeof error?.payload?.error === 'string'
          ? error.payload.error
          : 'Não foi possível conectar o WhatsApp.';
      if (error?.payload?.diagnostic) {
        applyWhatsAppPayload({ diagnostic: error.payload.diagnostic, status: 'FAILED' });
      }
      setWhatsAppFeedback({
        tone: 'error',
        title: 'Falha ao conectar',
        message,
      });
    } finally {
      setIsConnectingWhatsApp(false);
    }
  }, [applyWhatsAppPayload, getAuthHeaders, parseWhatsAppResponse, workspaceWhatsAppPhoneNumber]);

  const handleDisconnectWhatsApp = React.useCallback(async () => {
    setIsDisconnectingWhatsApp(true);
    setWhatsAppFeedback(null);
    try {
      const response = await fetch('/api/workspace/whatsapp', {
        method: 'POST',
        headers: await getAuthHeaders(true),
        body: JSON.stringify({
          action: 'disconnect',
        }),
      });
      const payload = await parseWhatsAppResponse(response);
      applyWhatsAppPayload(payload);
      setWhatsAppFeedback({
        tone: 'info',
        title: 'WhatsApp desconectado',
        message:
          typeof payload?.message === 'string'
            ? payload.message
            : 'A integração do WhatsApp foi desconectada com sucesso.',
      });
    } catch (error: any) {
      const message =
        typeof error?.payload?.error === 'string'
          ? error.payload.error
          : 'Não foi possível desconectar o WhatsApp.';
      if (error?.payload?.diagnostic) {
        applyWhatsAppPayload({ diagnostic: error.payload.diagnostic, status: 'FAILED' });
      }
      setWhatsAppFeedback({
        tone: 'error',
        title: 'Falha ao desconectar',
        message,
      });
    } finally {
      setIsDisconnectingWhatsApp(false);
    }
  }, [applyWhatsAppPayload, getAuthHeaders, parseWhatsAppResponse]);

  const handleSendWhatsAppTest = React.useCallback(async () => {
    setIsSendingWhatsAppTest(true);
    setWhatsAppFeedback(null);
    try {
      const response = await fetch('/api/workspace/whatsapp', {
        method: 'POST',
        headers: await getAuthHeaders(true),
        body: JSON.stringify({
          action: 'send_test',
          phoneNumber: workspaceWhatsAppPhoneNumber,
        }),
      });
      const payload = await parseWhatsAppResponse(response);
      applyWhatsAppPayload(payload);
      setWhatsAppFeedback({
        tone: 'info',
        title: 'Teste em validação',
        message:
          typeof payload?.message === 'string'
            ? payload.message
            : 'A Meta aceitou o teste. Agora falta apenas a confirmação final de entrega.',
      });
    } catch (error: any) {
      const message =
        typeof error?.payload?.error === 'string'
          ? error.payload.error
          : 'Não foi possível enviar o teste do WhatsApp.';
      if (error?.payload?.diagnostic) {
        applyWhatsAppPayload({ diagnostic: error.payload.diagnostic, status: 'FAILED' });
      }
      setWhatsAppFeedback({
        tone: 'error',
        title: 'Falha no envio',
        message,
      });
    } finally {
      setIsSendingWhatsAppTest(false);
    }
  }, [applyWhatsAppPayload, getAuthHeaders, parseWhatsAppResponse, workspaceWhatsAppPhoneNumber]);

  const derivedAgendaBills = React.useMemo<Bill[]>(() => {
    const now = new Date();
    const agendaItems: Bill[] = [];

    for (const debt of debts) {
      if (debt.status === 'Quitada') continue;
      const nextDueDate = getDebtDueDateValue(debt, now);
      const daysUntil = getAgendaDayDiff(nextDueDate, now);
      if (daysUntil > 30) continue;

      agendaItems.push({
        id: `debt-${debt.id}`,
        label: debt.creditor,
        date: formatAgendaDate(nextDueDate),
        isoDate: nextDueDate.toISOString(),
        amount: debt.remainingAmount,
        icon: CreditCard,
        color: 'text-[var(--text-secondary)]',
        bg: 'bg-[color:var(--danger-soft)]',
        status: daysUntil < 0 ? 'overdue' : 'pending',
        kind: 'debt',
        helperText: `${debt.category} - vencimento em ${formatDebtDueDateLabel(debt, now)}`,
        daysUntil,
      });
    }

    for (const debt of recurringDebts) {
      if (debt.status !== 'Ativa') continue;
      const nextDueDate = new Date(debt.nextDueDate);
      const daysUntil = getAgendaDayDiff(nextDueDate, now);
      if (daysUntil > 30) continue;

      agendaItems.push({
        id: `recurring-debt-${debt.id}`,
        label: debt.creditor,
        date: formatAgendaDate(nextDueDate),
        isoDate: nextDueDate.toISOString(),
        amount: debt.amount,
        icon: Workflow,
        color: 'text-[var(--text-secondary)]',
        bg: 'bg-[color:var(--primary-soft)]',
        status: daysUntil < 0 ? 'overdue' : 'pending',
        kind: 'debt',
        helperText: `${debt.category} - ${getRecurringDebtFrequencyLabel(debt.frequency)}`,
        daysUntil,
      });
    }

    for (const goal of goals) {
      if (!goal.deadline || goal.current >= goal.target) continue;
      const deadline = new Date(goal.deadline);
      if (Number.isNaN(deadline.getTime())) continue;
      const daysUntil = getAgendaDayDiff(deadline, now);
      if (daysUntil > 30) continue;

      agendaItems.push({
        id: `goal-${goal.id}`,
        label: goal.name,
        date: formatAgendaDate(deadline),
        isoDate: deadline.toISOString(),
        amount: Math.max(0, goal.target - goal.current),
        icon: Target,
        color: 'text-[var(--text-secondary)]',
        bg: 'bg-[color:var(--primary-soft)]',
        status: daysUntil < 0 ? 'overdue' : 'pending',
        kind: 'goal',
        helperText: `Faltam ${formatCurrency(Math.max(0, goal.target - goal.current))} para concluir`,
        daysUntil,
      });
    }

    return agendaItems.sort((a, b) => {
      const left = a.isoDate ? new Date(a.isoDate).getTime() : 0;
      const right = b.isoDate ? new Date(b.isoDate).getTime() : 0;
      return left - right;
    });
  }, [debts, recurringDebts, goals]);

  React.useEffect(() => {
    setBills(derivedAgendaBills);
  }, [derivedAgendaBills]);

  const premiumSmartNotifications = React.useMemo(
    () =>
      currentPlan === 'PREMIUM'
        ? buildPremiumSmartAlerts({
            transactions,
            totalBalance,
            goals,
            now: new Date(),
          })
        : [],
    [currentPlan, goals, totalBalance, transactions]
  );

  const appNotifications = React.useMemo<AppNotification[]>(() => {
    const notifications: AppNotification[] = [];
    const overdueBills = derivedAgendaBills.filter((bill) => bill.status === 'overdue');
    const upcomingBills = derivedAgendaBills.filter(
      (bill) => bill.status !== 'paid' && (bill.daysUntil ?? 99) >= 0 && (bill.daysUntil ?? 99) <= 7
    );

    if (overdueBills.length > 0) {
      notifications.push({
        id: `agenda-overdue-${overdueBills.length}`,
        title: 'Você tem compromissos em atraso',
        message: `${overdueBills.length} item(ns) exigem atenção imediata na sua agenda financeira.`,
        tone: 'error',
        targetTab: 'agenda',
      });
    } else if (upcomingBills.length > 0) {
      notifications.push({
        id: `agenda-upcoming-${upcomingBills.length}`,
        title: 'Há vencimentos próximos',
        message: `${upcomingBills.length} compromisso(s) vencem nos próximos 7 dias.`,
        tone: 'warning',
        targetTab: 'agenda',
      });
    }

    if (subscriptionSummary?.status === 'PENDING') {
      notifications.push({
        id: 'subscription-pending',
        title: 'Sua assinatura precisa de atenção',
        message: 'Revise a cobrança para manter seu acesso premium ativo.',
        tone: 'error',
        targetTab: 'subscription',
      });
    } else if (subscriptionSummary?.status === 'TRIALING') {
      notifications.push({
        id: 'subscription-trial',
        title: 'Seu período de teste está ativo',
        message: subscriptionSummary.nextBillingDate
          ? `A cobrança do Pro começa em ${subscriptionSummary.nextBillingDate}.`
          : 'Aproveite o teste do Pro e acompanhe a próxima cobrança na sua assinatura.',
        tone: 'info',
        targetTab: 'subscription',
      });
    } else if (subscriptionSummary?.status === 'CANCELED' && subscriptionSummary.cancelAtPeriodEnd) {
      notifications.push({
        id: 'subscription-canceled',
        title: 'Sua assinatura está programada para encerrar',
        message: 'Reative o plano se quiser continuar com acesso aos recursos premium.',
        tone: 'warning',
        targetTab: 'subscription',
      });
    }

    if (currentPlan === 'FREE' && currentMonthTransactionCount >= Math.ceil(FREE_TRANSACTION_LIMIT_PER_MONTH * 0.8)) {
      notifications.push({
        id: 'free-transactions-limit',
        title: 'Você está perto do limite do plano Free',
        message: `Já foram ${currentMonthTransactionCount}/${FREE_TRANSACTION_LIMIT_PER_MONTH} lançamentos neste mês.`,
        tone: 'warning',
        targetTab: 'subscription',
      });
    }

    if (currentPlan === 'FREE' && aiUsageCount >= Math.ceil(FREE_AI_LIMIT_PER_MONTH * 0.8)) {
      notifications.push({
        id: 'free-ai-limit',
        title: 'Seu limite de IA está quase no fim',
        message: `Você já usou ${aiUsageCount}/${FREE_AI_LIMIT_PER_MONTH} interações de IA neste mês.`,
        tone: 'info',
        targetTab: 'subscription',
      });
    }

    if (currentPlan !== 'FREE' && !isWhatsAppConnected) {
      notifications.push({
        id: 'whatsapp-not-connected',
        title: 'Conecte o WhatsApp da conta',
        message: 'Ative alertas e resumos automáticos direto no seu celular.',
        tone: 'info',
        targetTab: 'integrations',
      });
    }

    notifications.push(...premiumSmartNotifications.slice(0, 3));

    for (const event of workspaceEvents.slice(0, 2)) {
      notifications.push({
        id: `event-${event.id}`,
        title: getWorkspaceEventLabel(event.type),
        message: getWorkspaceEventMessage(event),
        tone: 'success',
        timestamp: formatEventTimestamp(event.created_at),
      });
    }

    return notifications.slice(0, 6);
  }, [
    aiUsageCount,
    currentMonthTransactionCount,
    currentPlan,
    derivedAgendaBills,
    isWhatsAppConnected,
    premiumSmartNotifications,
    subscriptionSummary,
    workspaceEvents,
  ]);

  const visibleNotifications = React.useMemo(
    () => appNotifications.filter((notification) => !notificationPreferences.deletedIds.includes(notification.id)),
    [appNotifications, notificationPreferences.deletedIds]
  );

  const unreadNotifications = React.useMemo(
    () => visibleNotifications.filter((notification) => !notificationPreferences.readIds.includes(notification.id)),
    [notificationPreferences.readIds, visibleNotifications]
  );

  const readNotifications = React.useMemo(
    () => visibleNotifications.filter((notification) => notificationPreferences.readIds.includes(notification.id)),
    [notificationPreferences.readIds, visibleNotifications]
  );

  const markNotificationAsRead = React.useCallback((notificationId: string) => {
    setNotificationPreferences((current) => {
      if (current.readIds.includes(notificationId)) return current;
      return {
        ...current,
        readIds: [...current.readIds, notificationId],
      };
    });
  }, []);

  const markAllNotificationsAsRead = React.useCallback(() => {
    setNotificationPreferences((current) => ({
      ...current,
      readIds: Array.from(new Set([...current.readIds, ...visibleNotifications.map((notification) => notification.id)])),
    }));
  }, [visibleNotifications]);

  const deleteNotification = React.useCallback((notificationId: string) => {
    setNotificationPreferences((current) => ({
      readIds: current.readIds.filter((id) => id !== notificationId),
      deletedIds: current.deletedIds.includes(notificationId)
        ? current.deletedIds
        : [...current.deletedIds, notificationId],
    }));
  }, []);

  const handleNotificationClick = React.useCallback(
    (notification: AppNotification) => {
      markNotificationAsRead(notification.id);
      setIsNotificationsOpen(false);
      if (notification.targetTab) {
        navigateToTab(notification.targetTab, { openAssistant: notification.targetTab === 'assistant' });
      }
    },
    [markNotificationAsRead, navigateToTab]
  );

  const assistantFinancialContext = React.useMemo(() => {
    const now = new Date();
    const enrichedTransactions = transactions.map((tx) => ({
      ...tx,
      parsedDate: parseTransactionDate(tx.date),
      numericAmount: parseCurrency(tx.amount),
    }));

    const totalIncome = enrichedTransactions
      .filter((tx) => tx.type === 'income')
      .reduce((acc, tx) => acc + tx.numericAmount, 0);
    const totalExpenses = enrichedTransactions
      .filter((tx) => tx.type === 'expense')
      .reduce((acc, tx) => acc + tx.numericAmount, 0);
    const balance = totalIncome - totalExpenses;

    const currentMonthTransactions = enrichedTransactions.filter((tx) => {
      if (!tx.parsedDate) return false;
      return (
        tx.parsedDate.getFullYear() === now.getFullYear() &&
        tx.parsedDate.getMonth() === now.getMonth()
      );
    });

    const monthIncome = currentMonthTransactions
      .filter((tx) => tx.type === 'income')
      .reduce((acc, tx) => acc + tx.numericAmount, 0);
    const monthExpenses = currentMonthTransactions
      .filter((tx) => tx.type === 'expense')
      .reduce((acc, tx) => acc + tx.numericAmount, 0);
    const monthBalance = monthIncome - monthExpenses;
    const monthSavingsRate = monthIncome > 0 ? (monthBalance / monthIncome) * 100 : 0;

    const expenseByCategory = new Map<string, number>();
    for (const tx of enrichedTransactions) {
      if (tx.type !== 'expense') continue;
      const category = tx.cat || 'Outros';
      expenseByCategory.set(category, (expenseByCategory.get(category) || 0) + tx.numericAmount);
    }

    const topExpenseCategories = Array.from(expenseByCategory.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([category, amount]) => ({ category, amount }));

    const recentTransactions = [...enrichedTransactions]
      .sort((a, b) => (b.parsedDate?.getTime() ?? 0) - (a.parsedDate?.getTime() ?? 0))
      .slice(0, 8)
      .map((tx) => ({
        date: tx.date,
        description: tx.desc,
        category: tx.cat,
        type: tx.type,
        amount: tx.numericAmount,
        wallet: tx.wallet,
      }));

    const goalsSummary = goals.map((goal) => ({
      name: goal.name,
      category: goal.category,
      target: goal.target,
      current: goal.current,
      progress: goal.target > 0 ? (goal.current / goal.target) * 100 : 0,
    }));

    const totalInvested = investments.reduce((acc, inv) => acc + inv.invested, 0);
    const totalInvestmentCurrent = investments.reduce((acc, inv) => acc + inv.value, 0);
    const investmentProfit = totalInvestmentCurrent - totalInvested;
    const investmentProfitability =
      totalInvested > 0 ? (investmentProfit / totalInvested) * 100 : 0;

    const topInvestments = [...investments]
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
      .map((inv) => ({
        name: inv.label,
        type: inv.type,
        walletName: inv.walletName,
        invested: inv.invested,
        currentValue: inv.value,
      }));

    const activeDebts = debts.filter((debt) => debt.status !== 'Quitada');
    const activeRecurringObligations = recurringDebts.filter((debt) => debt.status === 'Ativa');
    const totalDebtRemaining =
      activeDebts.reduce((acc, debt) => acc + debt.remainingAmount, 0) +
      activeRecurringObligations.reduce((acc, debt) => acc + debt.amount, 0);
    const totalDebtOriginal = activeDebts.reduce((acc, debt) => acc + debt.originalAmount, 0);
    const highestConventionalDebt = [...activeDebts].sort((a, b) => b.remainingAmount - a.remainingAmount)[0] ?? null;
    const highestRecurringDebt = [...activeRecurringObligations].sort((a, b) => b.amount - a.amount)[0] ?? null;
    const highestDebt = (() => {
      if (!highestConventionalDebt) return highestRecurringDebt ? {
        creditor: highestRecurringDebt.creditor,
        category: highestRecurringDebt.category,
        remainingAmount: highestRecurringDebt.amount,
        interestRateMonthly: 0,
      } : null;
      if (!highestRecurringDebt) return highestConventionalDebt;
      return highestConventionalDebt.remainingAmount >= highestRecurringDebt.amount
        ? highestConventionalDebt
        : {
            creditor: highestRecurringDebt.creditor,
            category: highestRecurringDebt.category,
            remainingAmount: highestRecurringDebt.amount,
            interestRateMonthly: 0,
          };
    })();

    return {
      balance,
      totalIncome,
      totalExpenses,
      monthIncome,
      monthExpenses,
      monthBalance,
      monthSavingsRate,
      topExpenseCategories,
      recentTransactions,
      goals: goalsSummary,
      investments: {
        totalInvested,
        totalCurrent: totalInvestmentCurrent,
        profit: investmentProfit,
        profitability: investmentProfitability,
        topInvestments,
      },
      debts: {
        activeCount: activeDebts.length + activeRecurringObligations.length,
        totalRemaining: totalDebtRemaining,
        totalOriginal: totalDebtOriginal,
        highestDebt: highestDebt
          ? {
              creditor: highestDebt.creditor,
              category: highestDebt.category,
              remainingAmount: highestDebt.remainingAmount,
              interestRateMonthly: highestDebt.interestRateMonthly,
            }
          : null,
      },
    };
  }, [transactions, goals, investments, debts, recurringDebts]);

  React.useEffect(() => {
    if (!aiUsageStorageKey) {
      setAiUsageCount(0);
      return;
    }

    const rawValue = window.localStorage.getItem(aiUsageStorageKey);
    const parsedValue = Number(rawValue);
    if (Number.isFinite(parsedValue) && parsedValue >= 0) {
      setAiUsageCount(parsedValue);
      return;
    }

    setAiUsageCount(0);
  }, [aiUsageStorageKey]);

  React.useEffect(() => {
    if (!user) return;
    setSettingsName((prev) => prev || getUserDisplayName(user));
    setSettingsEmail((prev) => prev || user.email || '');
    setSettingsAvatarUrl(getUserAvatarUrl(user) || '');
    setOnboardingWorkspaceName((prev) =>
      prev !== 'Minha Conta' ? prev : user.user_metadata?.company_name || prev
    );
    setOnboardingObjective((prev) =>
      prev !== ONBOARDING_OBJECTIVES[0] ? prev : user.user_metadata?.objective || prev
    );
    setOnboardingProfile((prev) =>
      prev !== ONBOARDING_USAGE_LEVELS[1] ? prev : user.user_metadata?.segment || prev
    );
  }, [user]);

  const activeWorkspace = React.useMemo(
    () => (activeWorkspaceId ? workspaces.find((workspace) => workspace.id === activeWorkspaceId) ?? null : null),
    [activeWorkspaceId, workspaces]
  );
  const canDeleteActiveWorkspace = Boolean(
    activeWorkspace &&
      String(activeWorkspace.role || '').toUpperCase() === 'OWNER' &&
      workspaces.length > 1
  );

  React.useEffect(() => {
    if (activeWorkspace?.name) {
      setOnboardingWorkspaceName(activeWorkspace.name);
    }
  }, [activeWorkspace]);

  React.useEffect(() => {
    if (!isWorkspaceOnboardingOpen) return;
    setOnboardingStep(0);
    setOnboardingFirstRecord(createInitialOnboardingTransaction());
    setOnboardingFirstRecordAdded(false);
    setOnboardingInsightViewed(false);
    setOnboardingDesiredPlan('FREE');
  }, [isWorkspaceOnboardingOpen, activeWorkspaceId]);

  const onboardingCurrentMonthExpenses = React.useMemo(
    () =>
      transactions.filter(
        (tx) => tx.type === 'expense' && isInCurrentMonth(parseTransactionDate(tx.date))
      ),
    [transactions]
  );

  const onboardingCurrentMonthIncomeCount = React.useMemo(
    () =>
      transactions.filter(
        (tx) => tx.type === 'income' && isInCurrentMonth(parseTransactionDate(tx.date))
      ).length,
    [transactions]
  );

  const onboardingPrimaryInsight = React.useMemo(() => {
    const total = onboardingCurrentMonthExpenses.reduce((acc, tx) => acc + parseCurrency(tx.amount), 0);
    if (total <= 0) {
      return {
        category: 'alimentacao',
        percentage: 0,
        monthlySaving: 0,
      };
    }

    const categoryTotals = onboardingCurrentMonthExpenses.reduce(
      (acc, tx) => {
        const key = tx.cat || 'Outros';
        acc[key] = (acc[key] || 0) + parseCurrency(tx.amount);
        return acc;
      },
      {} as Record<string, number>
    );

    const [category, amount] = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];
    const percentage = Math.round((amount / total) * 100);
    const monthlySaving = Math.round(amount * 0.1);

    return { category, percentage, monthlySaving };
  }, [onboardingCurrentMonthExpenses]);

  const onboardingAutomaticInsight = React.useMemo(() => {
    const transportTotal = onboardingCurrentMonthExpenses
      .filter((tx) => String(tx.cat || '').toLowerCase().includes('transporte'))
      .reduce((acc, tx) => acc + parseCurrency(tx.amount), 0);

    const fallbackTotal = onboardingCurrentMonthExpenses.reduce(
      (acc, tx) => acc + parseCurrency(tx.amount),
      0
    );
    const appliedTotal = transportTotal > 0 ? transportTotal : fallbackTotal;
    const annualSaving = appliedTotal * 0.15 * 12;

    return {
      categoryLabel: transportTotal > 0 ? 'transporte' : 'saidas variáveis',
      total: appliedTotal,
      annualSaving,
    };
  }, [onboardingCurrentMonthExpenses]);

  const onboardingChecklist = React.useMemo(() => {
    const expenseCount = onboardingCurrentMonthExpenses.length;
    const incomeCount = onboardingCurrentMonthIncomeCount;
    const hasGoal = goals.length > 0;
    const hasInsightPreview = onboardingInsightViewed;

    return [
      { label: 'Adicionar 3 saidas', done: expenseCount >= 3 },
      { label: 'Adicionar uma entrada', done: incomeCount >= 1 },
      { label: 'Criar uma meta financeira', done: hasGoal },
      { label: 'Conhecer a prévia das análises com IA', done: hasInsightPreview },
    ];
  }, [goals.length, onboardingCurrentMonthExpenses.length, onboardingCurrentMonthIncomeCount, onboardingInsightViewed]);

  const onboardingChecklistProgress = React.useMemo(() => {
    const completed = onboardingChecklist.filter((item) => item.done).length;
    return Math.round((completed / onboardingChecklist.length) * 100);
  }, [onboardingChecklist]);

  const onboardingFlowProgress = Math.round(((onboardingStep + 1) / 9) * 100);

  const handleAvatarFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) return;
    if (file.size > AVATAR_MAX_FILE_SIZE_BYTES) {
      showUiFeedback('Escolha uma imagem de até 5 MB.');
      return;
    }

    setIsAvatarProcessing(true);

    try {
      const optimizedAvatar = await optimizeAvatarFile(file);
      setSettingsAvatarUrl(optimizedAvatar);
      setSettingsSavedAt('Foto pronta. Clique em salvar alterações para concluir.');
    } catch (error) {
      console.error('Avatar processing error:', error);
      showUiFeedback(error instanceof Error ? error.message : 'Não foi possível processar a foto.');
    } finally {
      setIsAvatarProcessing(false);
    }
  };

  const handleSaveSettings = async () => {
    if (isAvatarProcessing) return;

    const normalizedAvatarUrl = settingsAvatarUrl.trim();

    if (!isValidAvatarUrl(normalizedAvatarUrl)) {
      showUiFeedback('A foto de perfil precisa ser uma imagem enviada pelo sistema ou uma URL http/https válida.');
      return;
    }

    try {
      const updatePayload: {
        email?: string;
        data?: {
          full_name?: string | null;
          avatar_url?: string | null;
        };
      } = {
        data: {
          full_name: settingsName.trim() || null,
          avatar_url: normalizedAvatarUrl || null,
        },
      };

      const normalizedEmail = settingsEmail.trim();
      if (normalizedEmail && normalizedEmail !== user?.email) {
        updatePayload.email = normalizedEmail;
      }

      const { data, error } = await supabase.auth.updateUser(updatePayload);
      if (error) {
        throw error;
      }

      if (data?.user) {
        setUser(data.user);
      }

      const accessToken = (await supabase.auth.getSession()).data.session?.access_token;
      if (accessToken) {
        void setupUserOnServer(accessToken, data.user?.id || null);
      }

      setSettingsSavedAt(
        `Alterações salvas às ${new Date().toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
        })}`
      );
    } catch (error) {
      console.error('Save settings error:', error);
      showUiFeedback(error instanceof Error ? error.message : 'Falha ao salvar configurações.');
    }
  };

  const handleCompleteWorkspaceOnboarding = async (
    desiredPlanOverride?: 'FREE' | 'PRO' | 'PREMIUM'
  ) => {
    if (isSavingOnboarding) return;
    setIsSavingOnboarding(true);

    try {
      const desiredPlan = desiredPlanOverride || onboardingDesiredPlan;
      const response = await fetch('/api/onboarding', {
        method: 'POST',
        headers: await getAuthHeaders(true),
        body: JSON.stringify({
          workspaceName: onboardingWorkspaceName,
          objective: onboardingObjective,
          financialProfile: onboardingProfile,
          desiredPlan,
          aiSuggestionsEnabled: onboardingAiSuggestionsEnabled,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message =
          typeof payload?.error === 'string'
            ? payload.error
            : `Falha ao concluir onboarding (HTTP ${response.status}).`;
        throw new Error(message);
      }

      setIsWorkspaceOnboardingOpen(false);
      await fetchDashboardData();

      if (payload?.upgradeRequired) {
        const planMap: Record<string, string> = {
          FREE: 'Free',
          PRO: 'Pro Mensal',
          PREMIUM: 'Premium Mensal',
        };
        const targetPlan = planMap[String(payload?.desiredPlan || '')];
        if (targetPlan === 'Pro Mensal' || targetPlan === 'Premium Mensal') {
          void handleUpgrade(targetPlan);
        }
      }
    } catch (error) {
      console.error('Onboarding save error:', error);
      showUiFeedback(error instanceof Error ? error.message : 'Falha ao salvar onboarding.');
    } finally {
      setIsSavingOnboarding(false);
    }
  };

  const handleDismissWorkspaceOnboarding = async () => {
    if (isDismissingOnboarding || isSavingOnboarding) return;
    setIsDismissingOnboarding(true);

    try {
      const response = await fetch('/api/onboarding', {
        method: 'PATCH',
        headers: await getAuthHeaders(true),
        body: JSON.stringify({ dismissed: true }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          typeof payload?.error === 'string'
            ? payload.error
            : `Falha ao atualizar onboarding (HTTP ${response.status}).`
        );
      }
      setIsWorkspaceOnboardingOpen(false);
    } catch (error) {
      console.error('Onboarding dismiss error:', error);
      showUiFeedback(error instanceof Error ? error.message : 'Falha ao atualizar onboarding.');
    } finally {
      setIsDismissingOnboarding(false);
    }
  };

  const handleAddOnboardingFirstRecord = async () => {
    if (isSavingOnboardingRecord) return;

    const payload: TransactionFormData = {
      ...onboardingFirstRecord,
      flowType:
        onboardingFirstRecord.flowType === 'Transferência'
          ? 'Saida'
          : onboardingFirstRecord.flowType,
      destinationWallet: '',
      description:
        onboardingFirstRecord.description.trim() ||
        (onboardingFirstRecord.flowType === 'Entrada'
          ? 'Primeiro registro de entrada'
          : 'Primeiro registro de saida'),
    };

    if (!payload.amount || parseMoneyInput(payload.amount) <= 0) {
      showUiFeedback('Preencha um valor maior que zero.');
      return;
    }

    if (!payload.category.trim()) {
      showUiFeedback('Selecione uma categoria.');
      return;
    }

    setIsSavingOnboardingRecord(true);
    try {
      const created = await handleSubmitTransaction(payload);
      if (created === false) {
        return;
      }

      setOnboardingFirstRecordAdded(true);
      setOnboardingStep(4);
    } finally {
      setIsSavingOnboardingRecord(false);
    }
  };

  const openUpgradeLimitModal = (reason: 'transactions' | 'ai') => {
    setUpgradeLimitReason(reason);
    setIsUpgradeLimitModalOpen(true);
  };

  const consumeAiQuota = () => {
    if (!isFreePlan) return true;
    if (aiLimitReached) {
      openUpgradeLimitModal('ai');
      return false;
    }

    const nextUsage = aiUsageCount + 1;
    setAiUsageCount(nextUsage);
    if (aiUsageStorageKey) {
      window.localStorage.setItem(aiUsageStorageKey, String(nextUsage));
    }

    return true;
  };

  const sendAssistantRequest = async (params: {
    userText: string;
    messageText: string;
    audioInput?: { base64: string; mimeType: string } | null;
  }) => {
    const nowLabel = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const clientNonce = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const userMessage: Message = {
      role: 'user',
      text: params.userText,
      time: nowLabel,
      clientNonce,
    };
    const historyForRequest = [...messages, userMessage].map((m) => ({
      role: m.role,
      parts: [{ text: m.text }],
    }));

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: await getAuthHeaders(true),
        body: JSON.stringify({
          message: params.messageText,
          audioInput: params.audioInput || undefined,
          replyMode: 'both',
          history: historyForRequest,
          context: {
            userName: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuario',
            activeTab,
            isWhatsAppConnected,
            financialSummary: assistantFinancialContext,
            replyMode: 'both',
          },
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(typeof data?.error === 'string' ? data.error : 'Falha ao processar mensagem');
      }

      const inputTranscript =
        params.audioInput && typeof data?.inputTranscript === 'string' ? data.inputTranscript.trim() : '';
      if (inputTranscript) {
        setMessages((prev) => {
          const next = [...prev];
          for (let index = next.length - 1; index >= 0; index -= 1) {
            const row = next[index];
            if (row.role !== 'user') continue;
            if (row.clientNonce !== clientNonce) continue;
            next[index] = {
              ...row,
              text: inputTranscript,
            };
            break;
          }
          return next;
        });
      }

      const text = typeof data?.text === 'string' ? data.text : '';
      let audioUrl: string | null = null;
      let audioMimeType: string | null = null;

      if (
        data?.audio &&
        typeof data.audio === 'object' &&
        typeof data.audio.base64 === 'string' &&
        typeof data.audio.mimeType === 'string'
      ) {
        const audioBlob = decodeBase64ToBlob(data.audio.base64, data.audio.mimeType);
        if (audioBlob && audioBlob.size > 0) {
          audioMimeType = data.audio.mimeType;
          audioUrl = URL.createObjectURL(audioBlob);
          responseAudioUrlsRef.current.push(audioUrl);
        }
      }

      if (text || audioUrl) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'model',
            text: text || 'Resposta em audio gerada.',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            audioUrl,
            audioMimeType,
          },
        ]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'model',
          text: `Desculpe, tive um problema tecnico ao processar sua mensagem. ${
            error instanceof Error ? error.message : 'Tente novamente em alguns instantes.'
          }`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
      setIsSubmittingAudio(false);
    }
  };

  const handleSendMessage = async (presetMessage?: string) => {
    const messageText = (presetMessage ?? input).trim();
    if (!messageText || isLoading || isSubmittingAudio || isRecordingAudio) return;
    if (!consumeAiQuota()) return;

    setInput('');
    await sendAssistantRequest({
      userText: messageText,
      messageText,
    });
  };

  const handleSendAudioBlob = async (audioBlob: Blob, mimeTypeHint: string) => {
    if (isLoading || isSubmittingAudio) return;
    if (!consumeAiQuota()) return;

    setIsSubmittingAudio(true);
    try {
      const base64 = await blobToBase64(audioBlob);
      await sendAssistantRequest({
        userText: 'Audio enviado',
        messageText: '',
        audioInput: {
          base64,
          mimeType: mimeTypeHint || audioBlob.type || 'audio/webm',
        },
      });
    } catch (error) {
      console.error('Audio send error:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'model',
          text: `Nao consegui processar seu audio agora. ${
            error instanceof Error ? error.message : 'Tente novamente.'
          }`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      setIsSubmittingAudio(false);
    }
  };

  const stopAssistantAudioRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') return;
    recorder.stop();
  };

  const startAssistantAudioRecording = async () => {
    if (isLoading || isSubmittingAudio) return;
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      showUiFeedback('Seu navegador nao suporta gravacao de audio.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      audioChunksRef.current = [];

      const preferredMimeType = pickSupportedRecorderMimeType();
      const recorder = preferredMimeType
        ? new MediaRecorder(stream, { mimeType: preferredMimeType })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        setIsRecordingAudio(false);

        const chunks = [...audioChunksRef.current];
        audioChunksRef.current = [];
        const mimeType = recorder.mimeType || preferredMimeType || 'audio/webm';

        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach((track) => track.stop());
          mediaStreamRef.current = null;
        }
        mediaRecorderRef.current = null;

        if (!chunks.length) return;
        const audioBlob = new Blob(chunks, { type: mimeType });
        void handleSendAudioBlob(audioBlob, mimeType);
      };

      recorder.onerror = () => {
        setIsRecordingAudio(false);
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach((track) => track.stop());
          mediaStreamRef.current = null;
        }
        mediaRecorderRef.current = null;
        showUiFeedback('Falha ao gravar audio. Tente novamente.');
      };

      recorder.start();
      setIsRecordingAudio(true);
    } catch (error) {
      console.error('Audio record error:', error);
      showUiFeedback('Nao consegui acessar seu microfone.');
      setIsRecordingAudio(false);
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }
      mediaRecorderRef.current = null;
    }
  };

  const toggleAssistantAudioRecording = () => {
    if (isRecordingAudio) {
      stopAssistantAudioRecording();
      return;
    }
    void startAssistantAudioRecording();
  };
  const handleUpgrade = React.useCallback(
    async (plan: string) => {
      try {
        const selectedPlan = parseCheckoutPlanLabel(plan);
        if (!selectedPlan) {
          showUiFeedback('Plano inválido para checkout.');
          return;
        }

        window.location.href = getCheckoutPath({
          plan: selectedPlan.plan,
          interval: selectedPlan.interval,
          workspaceId: activeWorkspaceId,
        });
      } catch (error) {
        console.error('Upgrade error:', error);
        const message = error instanceof Error ? error.message : 'erro inesperado';
        showUiFeedback(`Erro ao iniciar upgrade: ${message}`);
      }
    },
    [activeWorkspaceId, showUiFeedback]
  );

  const buildPlanLabelFromSummary = React.useCallback((summary: SubscriptionOverview | null) => {
    if (!summary || summary.plan === 'FREE') {
      return 'Pro Mensal';
    }

    const suffix = summary.interval === 'ANNUAL' ? 'Anual' : 'Mensal';
    return `${summary.planLabel} ${suffix}`;
  }, []);

  const fetchSubscriptionData = React.useCallback(async () => {
    if (!user || !activeWorkspaceId) return;

    setIsSubscriptionLoading(true);
    setSubscriptionError(null);

    try {
      const response = await fetch('/api/stripe/subscription', {
        headers: await getAuthHeaders(),
      });
      const payload = (await response.json().catch(() => ({}))) as SubscriptionOverview & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || `Falha ao carregar assinatura (HTTP ${response.status}).`);
      }

      setSubscriptionSummary(payload);
    } catch (error) {
      console.error('Subscription fetch error:', error);
      setSubscriptionSummary(null);
      setSubscriptionError(error instanceof Error ? error.message : 'Falha ao carregar assinatura.');
    } finally {
      setIsSubscriptionLoading(false);
    }
  }, [activeWorkspaceId, getAuthHeaders, user]);

  const openStripePortal = React.useCallback(
    async (target: 'payment' | 'history') => {
      try {
        setSubscriptionActionLoading(target);

        const response = await fetch('/api/stripe/portal', {
          method: 'POST',
          headers: await getAuthHeaders(),
        });
        const raw = await response.text();
        const data = raw ? JSON.parse(raw) : {};

        if (!response.ok) {
          const message =
            typeof data?.error === 'string'
              ? data.error
              : `Falha ao abrir portal (HTTP ${response.status}).`;
          if (
            (response.status === 404 || message.toLowerCase().includes('customer')) &&
            (subscriptionSummary?.canOpenCheckout || isFreePlan)
          ) {
            const shouldUpgrade = window.confirm(
              'Esta conta ainda não tem uma assinatura regularizada. Deseja abrir o checkout agora?'
            );
            if (shouldUpgrade) {
              void handleUpgrade(buildPlanLabelFromSummary(subscriptionSummary));
            }
            return;
          }
          throw new Error(message);
        }

        if (data.url) {
          window.location.href = data.url;
        }
      } catch (error) {
        console.error('Portal error:', error);
        const message = error instanceof Error ? error.message : 'erro inesperado';
        showUiFeedback(`Erro ao abrir assinatura: ${message}`);
      } finally {
        setSubscriptionActionLoading(null);
      }
    },
    [buildPlanLabelFromSummary, getAuthHeaders, handleUpgrade, isFreePlan, showUiFeedback, subscriptionSummary]
  );
  const handleManageSubscription = React.useCallback(() => {
    navigateToTab('subscription');
  }, [navigateToTab]);

  const handleSubscriptionAction = React.useCallback(
    async (action: 'cancel' | 'reactivate') => {
      try {
        setSubscriptionActionLoading(action);
        setSubscriptionError(null);

        const response = await fetch('/api/stripe/subscription', {
          method: 'POST',
          headers: await getAuthHeaders(true),
          body: JSON.stringify({ action }),
        });
        const payload = (await response.json().catch(() => ({}))) as SubscriptionOverview & { error?: string };

        if (!response.ok) {
          throw new Error(payload.error || `Falha ao atualizar assinatura (HTTP ${response.status}).`);
        }

        setSubscriptionSummary(payload);
        const nextPlan = normalizePlan(payload.plan);
        const nextReportAccessLevel: ReportAccessLevel = nextPlan === 'FREE' ? 'basic' : 'full';
        setCurrentPlan((current) => (current === nextPlan ? current : nextPlan));
        setReportAccessLevel((current) => (current === nextReportAccessLevel ? current : nextReportAccessLevel));
        const resolvedWorkspaceId = activeWorkspaceId || payload.workspaceId || null;
        if (resolvedWorkspaceId) {
          upsertWorkspaceSnapshot(resolvedWorkspaceId, {
            currentPlan: nextPlan,
            reportAccessLevel: nextReportAccessLevel,
          });
        }
      } catch (error) {
        console.error('Subscription action error:', error);
        setSubscriptionError(error instanceof Error ? error.message : 'Falha ao atualizar assinatura.');
      } finally {
        setSubscriptionActionLoading(null);
      }
    },
    [activeWorkspaceId, getAuthHeaders, upsertWorkspaceSnapshot]
  );

  const handleChangePlan = React.useCallback(() => {
    if (!subscriptionSummary) {
      handleManageSubscription();
      return;
    }

    if (
      subscriptionSummary.recommendedAction === 'checkout' ||
      subscriptionSummary.recommendedAction === 'regularize'
    ) {
      void handleUpgrade(buildPlanLabelFromSummary(subscriptionSummary));
      return;
    }

    if (currentPlan === 'FREE') {
      void handleUpgrade('Pro Mensal');
      return;
    }

    void openStripePortal('history');
  }, [buildPlanLabelFromSummary, currentPlan, handleManageSubscription, handleUpgrade, openStripePortal, subscriptionSummary]);

  React.useEffect(() => {
    if (!user || !pendingPlanFromQuery || pendingPlanHandled || !activeWorkspaceId) {
      return;
    }

    const supportedPlans = new Set(['Pro Mensal', 'Pro Anual', 'Premium Mensal', 'Premium Anual']);
    if (supportedPlans.has(pendingPlanFromQuery)) {
      setPendingPlanHandled(true);
      void handleUpgrade(pendingPlanFromQuery);
      return;
    }

    setPendingPlanHandled(true);
  }, [activeWorkspaceId, handleUpgrade, pendingPlanFromQuery, pendingPlanHandled, user]);

  React.useEffect(() => {
    if (!user || activeTab !== 'subscription') return;
    void fetchSubscriptionData();
  }, [activeTab, fetchSubscriptionData, user]);

  const handleExportPDF = async () => {
    const { jsPDF } = await import('jspdf');
    await import('jspdf-autotable');

    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text('Relatério Financeiro - Cote Finance AI', 20, 20);
    doc.setFontSize(12);
    doc.text(`Data: ${new Date().toLocaleDateString()}`, 20, 30);

    const totalIncome = transactions
      .filter((tx) => tx.type === 'income')
      .reduce((acc, tx) => acc + parseCurrency(tx.amount), 0);
    const totalExpenses = transactions
      .filter((tx) => tx.type === 'expense')
      .reduce((acc, tx) => acc + parseCurrency(tx.amount), 0);

    doc.text(`Total Entradas: ${formatCurrency(totalIncome)}`, 20, 45);
    doc.text(`Total Saidas: ${formatCurrency(totalExpenses)}`, 20, 55);
    doc.text(`Saldo Líquido: ${formatCurrency(totalIncome - totalExpenses)}`, 20, 65);

    const tableData = transactions.map((tx) => [tx.date, tx.desc, tx.cat, tx.amount, tx.wallet]);

    (doc as any).autoTable({
      startY: 80,
      head: [['Data', 'Descrição', 'Categoria', 'Valor', 'Carteira']],
      body: tableData,
    });

    doc.save('relatorio-financeiro-cote.pdf');
  };

  const handleExportCSV = () => {
    const headers = ['Data', 'Descrição', 'Categoria', 'Valor', 'Tipo', 'Carteira'];
    const rows = transactions.map((tx) => [
      tx.date,
      tx.desc,
      tx.cat,
      tx.amount,
      tx.type,
      tx.wallet,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'transacoes-cote.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const resolveTransactionCategory = async (tx: TransactionFormData) => {
    if (tx.category !== 'Auto (IA)') return tx.category;
    if (!consumeAiQuota()) {
      return 'Outros';
    }

    try {
      const response = await fetch('/api/ai/classify', {
        method: 'POST',
        headers: await getAuthHeaders(true),
        body: JSON.stringify({
          description: tx.description,
          amount: parseMoneyInput(tx.amount),
        }),
      });

      const data = await response.json();
      if (!response.ok || typeof data?.category !== 'string') {
        return 'Outros';
      }

      return mapAiCategoryToCategory(data.category);
    } catch (error) {
      console.error('Auto classification error:', error);
      return 'Outros';
    }
  };

  const handleSuggestTransactionCategory = React.useCallback(
    async (description: string) => {
      const trimmed = description.trim();
      if (trimmed.length < 3) return null;

      try {
        const response = await fetch(
          `/api/transactions/suggest-category?description=${encodeURIComponent(trimmed)}`,
          {
            headers: await getAuthHeaders(),
          }
        );
        const data = await response.json().catch(() => ({}));
        if (response.ok && typeof data?.suggestion?.category === 'string') {
          return data.suggestion.category as string;
        }
      } catch (error) {
        console.error('Suggest category error:', error);
      }

      const localFallback = mapAiCategoryToCategory(trimmed);
      return localFallback === 'Outros' ? null : localFallback;
    },
    [getAuthHeaders]
  );

  const normalizeOcrDateToInput = (rawDate?: string | null) => {
    if (!rawDate) return null;
    const parsed = parseTransactionDate(rawDate);
    if (!parsed) return null;
    return new Date(parsed.getTime() - parsed.getTimezoneOffset() * 60000)
      .toISOString()
      .split('T')[0];
  };

  const handleParseTransactionReceipt = React.useCallback(
    async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/transactions/ocr', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: formData,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(typeof data?.error === 'string' ? data.error : 'Falha no OCR');
      }

      return {
        amount: typeof data?.detected?.amount === 'number' ? data.detected.amount : null,
        date: normalizeOcrDateToInput(
          typeof data?.detected?.date === 'string' ? data.detected.date : null
        ),
        description:
          typeof data?.detected?.description === 'string' ? data.detected.description : null,
        receiptUrl: typeof data?.receiptUrl === 'string' ? data.receiptUrl : null,
      };
    },
    [getAuthHeaders]
  );

  const handleSubmitTransaction = async (tx: TransactionFormData) => {
    const submittedDate = new Date(`${tx.date}T00:00:00`);
    const isSubmittedInCurrentMonth = isInCurrentMonth(
      Number.isNaN(submittedDate.getTime()) ? null : submittedDate
    );
    const previousTransaction = editingTransactionId
      ? transactions.find((item) => item.id === editingTransactionId) ?? null
      : null;
    const wasCurrentMonthBeforeEdit = previousTransaction
      ? isInCurrentMonth(parseTransactionDate(previousTransaction.date))
      : false;
    const willIncreaseCurrentMonthCount =
      isSubmittedInCurrentMonth && (!editingTransactionId || !wasCurrentMonthBeforeEdit);

    if (
      isFreePlan &&
      willIncreaseCurrentMonthCount &&
      currentMonthTransactionCount >= FREE_TRANSACTION_LIMIT_PER_MONTH
    ) {
      openUpgradeLimitModal('transactions');
      return false;
    }

    const flowType = tx.flowType;
    const resolvedCategory = await resolveTransactionCategory(tx);
    const absoluteAmount = parseMoneyInput(tx.amount);
    if (!absoluteAmount || absoluteAmount <= 0) {
      throw new Error('Valor inválido para transação.');
    }
    if (flowType === 'Transferência') {
      if (!tx.destinationWallet.trim()) {
        throw new Error('Selecione a conta de destino da transferência.');
      }
      if (tx.destinationWallet === tx.wallet) {
        throw new Error('Conta origem e destino não podem ser iguais.');
      }
    }

    const shouldCreateRecurringIncome =
      !editingTransactionId &&
      flowType === 'Entrada' &&
      tx.incomeScheduleMode === 'RECURRING';

    if (shouldCreateRecurringIncome) {
      const recurringPayload = {
        kind: 'INCOME',
        title: tx.description.trim(),
        description: null,
        amount: absoluteAmount,
        wallet: tx.wallet,
        category: resolvedCategory,
        paymentMethod: mapPaymentMethodToBackend(tx.paymentMethod),
        frequency: tx.recurrenceFrequency,
        interval: 1,
        startDate: tx.date,
        endDate: tx.recurrenceEndDate.trim() ? tx.recurrenceEndDate : null,
        status: 'ACTIVE',
      };

      const response = await fetch('/api/recurrence-rules', {
        method: 'POST',
        headers: await getAuthHeaders(true),
        body: JSON.stringify(recurringPayload),
      });
      const responseData = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          typeof responseData?.error === 'string'
            ? responseData.error
            : 'Falha ao salvar entrada recorrente.'
        );
      }

      setEditingTransactionId(null);
      refreshTransactionsAfterMutation();
      return true;
    }

    const previousTransactionsSnapshot = transactions;
    const previousTotalBalance = totalBalance;
    const previousMonthCount = currentMonthTransactionCount;

    try {
      const method = editingTransactionId ? 'PATCH' : 'POST';
      const optimisticId = editingTransactionId || `temp-${Date.now()}`;
      const payload = {
        ...(editingTransactionId ? { id: String(editingTransactionId) } : {}),
        description: tx.description.trim(),
        amount: absoluteAmount,
        flowType,
        type: mapFlowTypeToBackendType(flowType),
        category: resolvedCategory,
        paymentMethod: mapPaymentMethodToBackend(tx.paymentMethod),
        wallet: tx.wallet,
        destinationWallet: tx.flowType === 'Transferência' ? tx.destinationWallet : null,
        receiptUrl: tx.receiptUrl || null,
        date: tx.date,
      };
      const optimisticTransaction = buildOptimisticTransaction(tx, resolvedCategory, optimisticId);
      const previousBalanceDelta = previousTransaction ? getTransactionBalanceDelta(previousTransaction) : 0;
      const nextBalanceDelta = getTransactionBalanceDelta(optimisticTransaction);
      const previousMonthContribution = previousTransaction && isTransactionInCurrentMonth(previousTransaction) ? 1 : 0;
      const nextMonthContribution = isTransactionInCurrentMonth(optimisticTransaction) ? 1 : 0;

      setTransactions((current) =>
        sortTransactionsByNewest(
          editingTransactionId
            ? current.map((item) => (item.id === editingTransactionId ? optimisticTransaction : item))
            : [optimisticTransaction, ...current]
        )
      );
      setTotalBalance(previousTotalBalance - previousBalanceDelta + nextBalanceDelta);
      setCurrentMonthTransactionCount(
        Math.max(0, previousMonthCount - previousMonthContribution + nextMonthContribution)
      );

      const response = await fetch('/api/transactions', {
        method,
        headers: await getAuthHeaders(true),
        body: JSON.stringify(payload),
      });

      const responseData = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message =
          typeof responseData?.message === 'string'
            ? responseData.message
            : typeof responseData?.error === 'string'
              ? responseData.error
              : 'Falha ao salvar transação.';
        setTransactions(previousTransactionsSnapshot);
        setTotalBalance(previousTotalBalance);
        setCurrentMonthTransactionCount(previousMonthCount);
        throw new Error(message);
      }

      const savedTransaction = mapApiTransactionToClientTransaction(responseData);
      setTransactions((current) =>
        sortTransactionsByNewest(current.map((item) => (item.id === optimisticId ? savedTransaction : item)))
      );
      setEditingTransactionId(null);
      refreshTransactionsAfterMutation();
      return true;
    } catch (error) {
      setTransactions(previousTransactionsSnapshot);
      setTotalBalance(previousTotalBalance);
      setCurrentMonthTransactionCount(previousMonthCount);
      console.error('Save transaction error:', error);
      throw new Error(
        error instanceof Error ? error.message : 'Falha ao salvar transação. Tente novamente.'
      );
    }
  };

  const handleOpenCreateTransaction = (draft?: Partial<TransactionFormData> | null) => {
    if (transactionLimitReached) {
      openUpgradeLimitModal('transactions');
      return;
    }
    setEditingTransactionId(null);
    setTransactionModalDraft(draft ?? null);
    setIsTransactionModalOpen(true);
  };

  const handleCreateCustomTransactionCategory = React.useCallback(
    (flowType: 'Entrada' | 'Saida', categoryName: string) => {
      const normalizedCategory = normalizeCustomCategoryLabel(categoryName);
      if (!normalizedCategory) return;

      setCustomTransactionCategories((current) => {
        const next: CustomTransactionCategoryBuckets =
          flowType === 'Entrada'
            ? {
                ...current,
                income: current.income.includes(normalizedCategory)
                  ? current.income
                  : [...current.income, normalizedCategory],
              }
            : {
                ...current,
                expense: current.expense.includes(normalizedCategory)
                  ? current.expense
                  : [...current.expense, normalizedCategory],
              };

        if (user?.id && activeWorkspaceId) {
          writeCustomTransactionCategories(user.id, activeWorkspaceId, next);
        }
        return next;
      });
    },
    [activeWorkspaceId, user?.id]
  );

  const handleStartEditTransaction = (id: string | number) => {
    setTransactionModalDraft(null);
    setEditingTransactionId(id);
    setIsTransactionModalOpen(true);
  };

  const handleDeleteTransaction = async (id: string | number) => {
    const previousTransactionsSnapshot = transactions;
    const previousTotalBalance = totalBalance;
    const previousMonthCount = currentMonthTransactionCount;
    const transactionToDelete = transactions.find((item) => item.id === id) ?? null;

    if (!transactionToDelete) {
      return;
    }

    try {
      setTransactions((current) => current.filter((item) => item.id !== id));
      setTotalBalance(previousTotalBalance - getTransactionBalanceDelta(transactionToDelete));
      setCurrentMonthTransactionCount(
        Math.max(0, previousMonthCount - (isTransactionInCurrentMonth(transactionToDelete) ? 1 : 0))
      );

      const response = await fetch('/api/transactions', {
        method: 'DELETE',
        headers: await getAuthHeaders(true),
        body: JSON.stringify({ id: String(id) }),
      });

      const responseData = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message =
          typeof responseData?.message === 'string'
            ? responseData.message
            : typeof responseData?.error === 'string'
              ? responseData.error
              : 'Falha ao excluir transação.';
        setTransactions(previousTransactionsSnapshot);
        setTotalBalance(previousTotalBalance);
        setCurrentMonthTransactionCount(previousMonthCount);
        showUiFeedback(message);
        return;
      }

      if (editingTransactionId === id) {
        setEditingTransactionId(null);
        setIsTransactionModalOpen(false);
      }

      refreshTransactionsAfterMutation();
    } catch (error) {
      setTransactions(previousTransactionsSnapshot);
      setTotalBalance(previousTotalBalance);
      setCurrentMonthTransactionCount(previousMonthCount);
      console.error('Delete transaction error:', error);
      showUiFeedback('Falha ao excluir transação. Tente novamente.');
    }
  };

  const handleSubmitGoal = async (goal: GoalFormData) => {
    const payload = {
      ...(editingGoalId ? { id: String(editingGoalId) } : {}),
      title: goal.title.trim(),
      target: parseMoneyInput(goal.target),
      accumulated: parseMoneyInput(goal.accumulated),
      category: goal.category,
      deadline: goal.deadline || null,
    };

    const response = await fetch('/api/goals', {
      method: editingGoalId ? 'PATCH' : 'POST',
      headers: await getAuthHeaders(true),
      body: JSON.stringify(payload),
    });
    const responseData = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message =
        typeof responseData?.error === 'string'
          ? responseData.error
          : 'Falha ao salvar meta.';
      throw new Error(message);
    }

    setEditingGoalId(null);
    await refreshGoalsResource();
  };

  const handleOpenCreateGoal = () => {
    setEditingGoalId(null);
    setIsGoalModalOpen(true);
  };

  const handleStartEditGoal = (id: string | number) => {
    setEditingGoalId(id);
    setIsGoalModalOpen(true);
  };

  const handleDeleteGoal = (id: string | number) => {
    (async () => {
      try {
        const response = await fetch('/api/goals', {
          method: 'DELETE',
          headers: await getAuthHeaders(true),
          body: JSON.stringify({ id: String(id) }),
        });
        const responseData = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(
            typeof responseData?.error === 'string'
              ? responseData.error
              : 'Falha ao excluir meta.'
          );
        }
        if (editingGoalId === id) {
          setEditingGoalId(null);
          setIsGoalModalOpen(false);
        }
        await refreshGoalsResource();
      } catch (error) {
        showUiFeedback(error instanceof Error ? error.message : 'Falha ao excluir meta.');
      }
    })();
  };

  const handleSubmitInvestment = async (inv: InvestmentFormData) => {
    const payload = {
      ...(editingInvestmentId ? { id: String(editingInvestmentId) } : {}),
      name: inv.name.trim(),
      type: inv.type,
      walletId: inv.walletId,
      invested: parseMoneyInput(inv.invested),
      current: parseMoneyInput(inv.current),
      expectedReturnAnnual: Number(inv.expectedReturnAnnual || 0),
    };

    const response = await fetch('/api/investments', {
      method: editingInvestmentId ? 'PATCH' : 'POST',
      headers: await getAuthHeaders(true),
      body: JSON.stringify(payload),
    });
    const responseData = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message =
        typeof responseData?.error === 'string'
          ? responseData.error
          : 'Falha ao salvar investimento.';
      throw new Error(message);
    }

    setEditingInvestmentId(null);
    await refreshInvestmentsResource();
  };

  const handleOpenCreateInvestment = () => {
    setEditingInvestmentId(null);
    setIsInvestmentModalOpen(true);
  };

  const handleStartEditInvestment = (id: string | number) => {
    setEditingInvestmentId(id);
    setIsInvestmentModalOpen(true);
  };

  const handleDeleteInvestment = (id: string | number) => {
    (async () => {
      try {
        const response = await fetch('/api/investments', {
          method: 'DELETE',
          headers: await getAuthHeaders(true),
          body: JSON.stringify({ id: String(id) }),
        });
        const responseData = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(
            typeof responseData?.error === 'string'
              ? responseData.error
              : 'Falha ao excluir investimento.'
          );
        }
        if (editingInvestmentId === id) {
          setEditingInvestmentId(null);
          setIsInvestmentModalOpen(false);
        }
        await refreshInvestmentsResource();
      } catch (error) {
        showUiFeedback(error instanceof Error ? error.message : 'Falha ao excluir investimento.');
      }
    })();
  };

  const deriveDebtStatusFromRemainingAndDueDate = React.useCallback(
    (remainingAmount: number, dueDate: string | null | undefined): DebtFormData['status'] => {
      if (remainingAmount <= 0) return 'Quitada';
      const parsedDueDate = parseInputDateValue(dueDate ?? null);
      if (parsedDueDate && startOfDay(parsedDueDate).getTime() < startOfDay(new Date()).getTime()) {
        return 'Atrasada';
      }
      return 'Em aberto';
    },
    []
  );

  const handleSubmitDebt = async (debt: DebtFormData) => {
    const parsedDueDate = parseInputDateValue(debt.dueDate);
    const parsedOriginalAmount = parseMoneyInput(debt.originalAmount);
    const parsedPaidAmount = parseMoneyInput(debt.paidAmount);
    const parsedRemainingAmount = Math.max(0, parsedOriginalAmount - parsedPaidAmount);
    const derivedStatus = deriveDebtStatusFromRemainingAndDueDate(parsedRemainingAmount, parsedDueDate ? toInputDateValue(parsedDueDate) : null);
    const payload = {
      ...(editingDebtId ? { id: String(editingDebtId) } : {}),
      creditor: debt.creditor.trim(),
      originalAmount: parsedOriginalAmount,
      remainingAmount: parsedRemainingAmount,
      interestRateMonthly: debt.hasInterest ? Number(debt.interestRateMonthly || 0) : 0,
      dueDate: parsedDueDate ? toInputDateValue(parsedDueDate) : null,
      dueDay: parsedDueDate ? parsedDueDate.getDate() : undefined,
      category: debt.category,
      status: derivedStatus,
    };

    const response = await fetch('/api/debts', {
      method: editingDebtId ? 'PATCH' : 'POST',
      headers: await getAuthHeaders(true),
      body: JSON.stringify(payload),
    });
    const responseData = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message =
        typeof responseData?.error === 'string'
          ? responseData.error
          : 'Falha ao salvar dívida.';
      throw new Error(message);
    }

    setEditingDebtId(null);
    setDebtDraft(null);
    setDebtFeedbackMessage(editingDebtId ? 'Dívida atualizada com sucesso.' : 'Dívida adicionada com sucesso.');
    await refreshDebtsResource();
    triggerDeferredProjectionRefresh();
  };

  const handleOpenCreateDebt = () => {
    setDebtFeedbackMessage(null);
    setEditingDebtId(null);
    setDebtDraft(null);
    setIsDebtModalOpen(true);
  };

  const handleOpenCreateRecurringDebt = (category?: string) => {
    const resolvedCategory =
      typeof category === 'string' && category.trim().length > 0
        ? category
        : RECURRING_DEBT_PRESETS[0]?.category ?? 'Água';
    setDebtFeedbackMessage(null);
    setEditingRecurringDebtId(null);
    setRecurringDebtDraft({
      creditor: getRecurringDebtDescriptionDefault(resolvedCategory),
      category: resolvedCategory,
      frequency: 'MONTHLY',
      interval: '1',
      startDate: new Date().toISOString().slice(0, 10),
      weekday: String(new Date().getDay()),
    });
    setIsRecurringDebtModalOpen(true);
  };

  const handleStartEditDebt = (id: string | number) => {
    setDebtFeedbackMessage(null);
    setEditingDebtId(id);
    setDebtDraft(null);
    setIsDebtModalOpen(true);
  };

  const handleDeleteDebt = (id: string | number) => {
    (async () => {
      try {
        const response = await fetch('/api/debts', {
          method: 'DELETE',
          headers: await getAuthHeaders(true),
          body: JSON.stringify({ id: String(id) }),
        });
        const responseData = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(
            typeof responseData?.error === 'string'
              ? responseData.error
              : 'Falha ao excluir dívida.'
          );
        }
        if (editingDebtId === id) {
          setEditingDebtId(null);
          setDebtDraft(null);
          setIsDebtModalOpen(false);
        }
        setDebtFeedbackMessage('Dívida removida com sucesso.');
        await refreshDebtsResource();
        triggerDeferredProjectionRefresh();
      } catch (error) {
        showUiFeedback(error instanceof Error ? error.message : 'Falha ao excluir dívida.');
      }
    })();
  };

  const handleRegisterDebtPayment = async (id: string | number, amount: number, paymentDate: string) => {
    const targetDebt = debts.find((debt) => debt.id === id);
    if (!targetDebt) {
      throw new Error('Dívida não encontrada para registrar pagamento.');
    }
    if (!(amount > 0)) {
      throw new Error('Informe um valor de pagamento maior que zero.');
    }
    const nextRemainingAmount = Math.max(0, targetDebt.remainingAmount - amount);
    const nextStatus = deriveDebtStatusFromRemainingAndDueDate(nextRemainingAmount, targetDebt.dueDate ?? paymentDate);

    const response = await fetch('/api/debts', {
      method: 'PATCH',
      headers: await getAuthHeaders(true),
      body: JSON.stringify({
        id: String(id),
        remainingAmount: nextRemainingAmount,
        status: nextStatus,
      }),
    });
    const responseData = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(typeof responseData?.error === 'string' ? responseData.error : 'Falha ao registrar pagamento.');
    }

    const paymentTransactionResponse = await fetch('/api/transactions', {
      method: 'POST',
      headers: await getAuthHeaders(true),
      body: JSON.stringify({
        description: `Pagamento de dívida: ${targetDebt.creditor}`,
        amount,
        date: paymentDate,
        dueDate: paymentDate,
        wallet: wallets[0]?.name || DEFAULT_TRANSACTION_WALLET,
        category: 'Pagamento de dívida',
        type: 'EXPENSE',
        flowType: 'Saida',
        paymentMethod: 'Outro',
        status: 'CONFIRMED',
        originType: 'DEBT',
        originId: `debt-payment:${id}:${Date.now()}`,
      }),
    });
    const paymentTransactionPayload = await paymentTransactionResponse.json().catch(() => ({}));
    if (!paymentTransactionResponse.ok) {
      throw new Error(
        typeof paymentTransactionPayload?.error === 'string'
          ? paymentTransactionPayload.error
          : 'Pagamento lançado, mas falhou ao registrar transação no ledger.'
      );
    }

    setDebtFeedbackMessage('Pagamento registrado com sucesso.');
    refreshTransactionsAfterMutation();
    await refreshDebtsResource();
    triggerDeferredProjectionRefresh();
  };

  const handleSettleDebt = async (id: string | number) => {
    try {
      const response = await fetch('/api/debts', {
        method: 'PATCH',
        headers: await getAuthHeaders(true),
        body: JSON.stringify({
          id: String(id),
          remainingAmount: 0,
          status: 'Quitada',
        }),
      });
      const responseData = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(typeof responseData?.error === 'string' ? responseData.error : 'Falha ao quitar dívida.');
      }
      setDebtFeedbackMessage('Dívida quitada com sucesso.');
      await refreshDebtsResource();
      triggerDeferredProjectionRefresh();
    } catch (error) {
      showUiFeedback(error instanceof Error ? error.message : 'Falha ao quitar dívida.');
    }
  };

  const handleReopenDebt = async (id: string | number) => {
    try {
      const targetDebt = debts.find((debt) => debt.id === id);
      if (!targetDebt) {
        throw new Error('Dívida não encontrada para reabrir.');
      }
      const nextRemainingAmount = Math.max(0, targetDebt.originalAmount);
      const nextStatus = deriveDebtStatusFromRemainingAndDueDate(nextRemainingAmount, targetDebt.dueDate);
      const response = await fetch('/api/debts', {
        method: 'PATCH',
        headers: await getAuthHeaders(true),
        body: JSON.stringify({
          id: String(id),
          remainingAmount: nextRemainingAmount,
          status: nextStatus,
        }),
      });
      const responseData = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(typeof responseData?.error === 'string' ? responseData.error : 'Falha ao reabrir dívida.');
      }
      setDebtFeedbackMessage('Dívida reaberta com sucesso.');
      await refreshDebtsResource();
      triggerDeferredProjectionRefresh();
    } catch (error) {
      showUiFeedback(error instanceof Error ? error.message : 'Falha ao reabrir dívida.');
    }
  };

  const handleSubmitRecurringDebt = async (debt: RecurringDebtFormData) => {
    const parsedStartDate = parseInputDateValue(debt.startDate);
    const derivedMonthlyDueDay = parsedStartDate?.getDate() ?? null;
    const monthlyDueDay =
      editingRecurringDebt?.source === 'legacy_debt'
        ? editingRecurringDebt.dueDay ?? derivedMonthlyDueDay
        : derivedMonthlyDueDay;
    const payload = {
      ...(editingRecurringDebt
        ? {
            id: String(editingRecurringDebt.id),
            source: editingRecurringDebt.source,
            legacyDebtId: editingRecurringDebt.legacyDebtId ?? null,
          }
        : {}),
      creditor: debt.creditor.trim(),
      amount: parseMoneyInput(debt.amount),
      category: debt.category,
      frequency: debt.frequency,
      interval: debt.frequency === 'MONTHLY' ? 1 : Number(debt.interval || 1),
      startDate: debt.startDate,
      endDate: debt.endDate.trim() ? debt.endDate : null,
      dueDay: debt.frequency === 'MONTHLY' ? monthlyDueDay : null,
      notes: debt.notes.trim() || null,
    };

    const response = await fetch('/api/recurring-debts', {
      method: editingRecurringDebt ? 'PATCH' : 'POST',
      headers: await getAuthHeaders(true),
      body: JSON.stringify(payload),
    });
    const responseData = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message =
        typeof responseData?.error === 'string'
          ? responseData.error
          : 'Falha ao salvar recorrência.';
      throw new Error(message);
    }

    setEditingRecurringDebtId(null);
    setRecurringDebtDraft(null);
    setDebtFeedbackMessage(editingRecurringDebt ? 'Recorrência atualizada com sucesso.' : 'Recorrência criada com sucesso.');
    await refreshRecurringDebtsResource();
    triggerDeferredProjectionRefresh();
  };

  const handleStartEditRecurringDebt = (id: string | number) => {
    setDebtFeedbackMessage(null);
    setEditingRecurringDebtId(id);
    setRecurringDebtDraft(null);
    setIsRecurringDebtModalOpen(true);
  };

  const handleDuplicateRecurringDebt = (id: string | number) => {
    const targetDebt = recurringDebts.find((debt) => debt.id === id);
    if (!targetDebt) {
      showUiFeedback('Recorrência não encontrada para duplicar.');
      return;
    }

    setDebtFeedbackMessage(null);
    setEditingRecurringDebtId(null);
    setRecurringDebtDraft({
      creditor: targetDebt.creditor,
      amount: formatMoneyInput(targetDebt.amount),
      category: targetDebt.category,
      frequency: targetDebt.frequency,
      interval: String(Math.max(1, targetDebt.interval || 1)),
      startDate: new Date().toISOString().slice(0, 10),
      weekday: String(new Date().getDay()),
      endDate: '',
      notes: targetDebt.notes || '',
      source: 'recurring_debt',
      legacyDebtId: null,
    });
    setIsRecurringDebtModalOpen(true);
  };

  const handleDeleteRecurringDebt = (id: string | number) => {
    (async () => {
      try {
        const target = recurringDebts.find((debt) => debt.id === id);
        const response = await fetch('/api/recurring-debts', {
          method: 'DELETE',
          headers: await getAuthHeaders(true),
          body: JSON.stringify({
            id: String(id),
            source: target?.source,
            legacyDebtId: target?.legacyDebtId ?? null,
          }),
        });
        const responseData = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(
            typeof responseData?.error === 'string'
              ? responseData.error
              : 'Falha ao excluir recorrência.'
          );
        }
        if (editingRecurringDebtId === id) {
          setEditingRecurringDebtId(null);
          setRecurringDebtDraft(null);
          setIsRecurringDebtModalOpen(false);
        }
        setDebtFeedbackMessage('Recorrência removida com sucesso.');
        await refreshRecurringDebtsResource();
        triggerDeferredProjectionRefresh();
      } catch (error) {
        showUiFeedback(error instanceof Error ? error.message : 'Falha ao excluir recorrência.');
      }
    })();
  };

  const handleToggleRecurringDebtStatus = async (id: string | number) => {
    try {
      const targetDebt = recurringDebts.find((debt) => debt.id === id);
      if (!targetDebt) {
        throw new Error('Recorrência não encontrada.');
      }
      const nextStatus = targetDebt.status === 'Ativa' ? 'Pausada' : 'Ativa';
      const response = await fetch('/api/recurring-debts', {
        method: 'PATCH',
        headers: await getAuthHeaders(true),
        body: JSON.stringify({
          id: String(id),
          source: targetDebt.source,
          legacyDebtId: targetDebt.legacyDebtId ?? null,
          status: nextStatus,
        }),
      });
      const responseData = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(typeof responseData?.error === 'string' ? responseData.error : 'Falha ao atualizar status da recorrência.');
      }
      setDebtFeedbackMessage(nextStatus === 'Ativa' ? 'Recorrência reativada com sucesso.' : 'Recorrência pausada com sucesso.');
      await refreshRecurringDebtsResource();
      triggerDeferredProjectionRefresh();
    } catch (error) {
      showUiFeedback(error instanceof Error ? error.message : 'Falha ao atualizar status da recorrência.');
    }
  };

  const handleOpenCreateWorkspaceModal = () => {
    setCreateWorkspaceError(null);
    setNewWorkspaceName('');
    setIsCreateWorkspaceModalOpen(true);
  };

  const handleCreateWorkspace = async (name: string) => {
    const normalizedName = name.trim();
    if (!normalizedName) {
      setCreateWorkspaceError('Informe um nome para a nova conta.');
      return;
    }

    setIsCreatingWorkspace(true);
    setCreateWorkspaceError(null);
    try {
      const response = await fetch('/api/workspaces', {
        method: 'POST',
        headers: await getAuthHeaders(true),
        body: JSON.stringify({
          name: normalizedName,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.workspace?.id) {
        const message =
          typeof payload?.error === 'string'
            ? payload.error
            : `Falha ao criar conta (HTTP ${response.status}).`;
        throw new Error(message);
      }

      setWorkspaces((prev) => [
        ...prev,
        {
          id: payload.workspace.id,
          name: payload.workspace.name,
          role: 'OWNER',
        },
      ]);
      setActiveWorkspaceId(payload.workspace.id);
      setIsCreateWorkspaceModalOpen(false);
      setNewWorkspaceName('');
      setIsWorkspaceOnboardingOpen(true);
    } catch (error) {
      console.error('Create workspace error:', error);
      setCreateWorkspaceError(error instanceof Error ? error.message : 'Falha ao criar conta.');
    } finally {
      setIsCreatingWorkspace(false);
    }
  };

  const handleOpenCreateWalletModal = () => {
    setCreateWalletError(null);
    setNewWalletBank('');
    setNewWalletName('');
    setNewWalletInitialBalance('');
    setIsCreateWalletModalOpen(true);
  };

  const handleCreateWallet = async () => {
    const resolvedBank = newWalletBank.trim();
    const resolvedName = newWalletName.trim() || resolvedBank;

    if (!resolvedName) {
      setCreateWalletError('Selecione um banco ou informe um nome para a nova carteira.');
      return;
    }

    setIsCreatingWallet(true);
    setCreateWalletError(null);
    try {
      const response = await fetch('/api/wallets', {
        method: 'POST',
        headers: await getAuthHeaders(true),
        body: JSON.stringify({
          bank: resolvedBank,
          name: resolvedName,
          type: 'BANK',
          initialBalance: newWalletInitialBalance.trim() || '0',
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.wallet?.id) {
        const message =
          typeof payload?.error === 'string' ? payload.error : `Falha ao criar carteira (HTTP ${response.status}).`;
        throw new Error(message);
      }

      const createdWallet = payload.wallet as WalletAccount;
      setWallets((prev) => [...prev, createdWallet].sort((a, b) => b.balance - a.balance));
      if (typeof createdWallet.balance === 'number' && Number.isFinite(createdWallet.balance)) {
        setTotalBalance((prev) => prev + createdWallet.balance);
      }
      setIsCreateWalletModalOpen(false);
      setNewWalletBank('');
      setNewWalletName('');
      setNewWalletInitialBalance('');
      void refreshTransactionsResource({
        syncTransactions: false,
        syncWallets: true,
        syncWorkspaceEvents: true,
        syncInsights: false,
        syncProjection: false,
        syncCalendarReadModel: false,
        syncTotalsAndPlan: true,
        syncUsageAndLimits: false,
        syncWhatsAppState: false,
      });
      triggerDeferredProjectionRefresh(700);
    } catch (error) {
      console.error('Create wallet error:', error);
      setCreateWalletError(error instanceof Error ? error.message : 'Falha ao criar carteira.');
    } finally {
      setIsCreatingWallet(false);
    }
  };

  const handleRequestDeleteWallet = (wallet: WalletAccount) => {
    setDeleteWalletError(null);
    setWalletPendingDelete(wallet);
  };

  const handleConfirmDeleteWallet = async () => {
    if (!walletPendingDelete) return;

    setIsDeletingWallet(true);
    setDeleteWalletError(null);
    try {
      const response = await fetch(`/api/wallets?id=${encodeURIComponent(walletPendingDelete.id)}`, {
        method: 'DELETE',
        headers: await getAuthHeaders(false),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message =
          typeof payload?.error === 'string'
            ? payload.error
            : `Falha ao excluir carteira (HTTP ${response.status}).`;
        throw new Error(message);
      }

      setWallets((prev) => prev.filter((wallet) => wallet.id !== walletPendingDelete.id));
      if (typeof walletPendingDelete.balance === 'number' && Number.isFinite(walletPendingDelete.balance)) {
        setTotalBalance((prev) => prev - walletPendingDelete.balance);
      }
      setPortfolioFeedback({
        tone: 'success',
        message: `Carteira "${walletPendingDelete.name}" excluída com sucesso.`,
      });
      setWalletPendingDelete(null);
      void refreshTransactionsResource({
        syncTransactions: false,
        syncWallets: true,
        syncWorkspaceEvents: true,
        syncInsights: false,
        syncProjection: false,
        syncCalendarReadModel: false,
        syncTotalsAndPlan: true,
        syncUsageAndLimits: false,
        syncWhatsAppState: false,
      });
      triggerDeferredProjectionRefresh(700);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao excluir carteira.';
      setDeleteWalletError(message);
      setPortfolioFeedback({
        tone: 'error',
        message,
      });
    } finally {
      setIsDeletingWallet(false);
    }
  };

  const handleOpenDeleteWorkspaceModal = () => {
    setDeleteWorkspaceError(null);
    setDeleteWorkspaceConfirmationName('');
    setIsDeleteWorkspaceModalOpen(true);
  };

  const handleDeleteWorkspace = async () => {
    if (!activeWorkspace) {
      setDeleteWorkspaceError('Selecione uma conta válida para excluir.');
      return;
    }

    const expectedName = activeWorkspace.name.trim();
    const providedName = deleteWorkspaceConfirmationName.trim();
    if (providedName !== expectedName) {
      setDeleteWorkspaceError('Digite o nome da conta exatamente para confirmar a exclusão.');
      return;
    }

    setIsDeletingWorkspace(true);
    setDeleteWorkspaceError(null);
    try {
      const response = await fetch('/api/workspaces', {
        method: 'DELETE',
        headers: await getAuthHeaders(true),
        body: JSON.stringify({
          workspaceId: activeWorkspace.id,
          confirmationName: providedName,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message =
          typeof payload?.error === 'string'
            ? payload.error
            : `Falha ao excluir conta (HTTP ${response.status}).`;
        throw new Error(message);
      }

      const nextWorkspaceId =
        typeof payload?.nextWorkspaceId === 'string' && payload.nextWorkspaceId
          ? payload.nextWorkspaceId
          : workspaces.find((workspace) => workspace.id !== activeWorkspace.id)?.id || null;

      setWorkspaces((prev) => prev.filter((workspace) => workspace.id !== activeWorkspace.id));
      setActiveWorkspaceId(nextWorkspaceId);
      setIsDeleteWorkspaceModalOpen(false);
      setDeleteWorkspaceConfirmationName('');
      setSettingsSavedAt(`Conta "${activeWorkspace.name}" excluída com sucesso.`);
      navigateToTab('dashboard');
    } catch (error) {
      setDeleteWorkspaceError(error instanceof Error ? error.message : 'Falha ao excluir conta.');
    } finally {
      setIsDeletingWorkspace(false);
    }
  };

  const handleOpenNew = () => {
    setIsQuickCreateOpen((prev) => !prev);
  };

  const handleQuickCreateTransaction = (
    flowType: TransactionFlowType,
    category?: string | null
  ) => {
    navigateToTab('transactions');
    setIsQuickCreateOpen(false);
    handleOpenCreateTransaction({
      flowType,
      category: category || getDefaultCategoryForFlow(flowType),
      paymentMethod: getDefaultPaymentMethodForFlow(flowType),
      destinationWallet: flowType === TRANSACTION_FLOW_TYPES[2] ? '' : undefined,
    });
  };

  const handleQuickCreateResource = (targetTab: 'goals' | 'debts' | 'investments') => {
    navigateToTab(targetTab);
    setIsQuickCreateOpen(false);

    if (targetTab === 'goals') {
      handleOpenCreateGoal();
      return;
    }

    if (targetTab === 'debts') {
      handleOpenCreateDebt();
      return;
    }

    handleOpenCreateInvestment();
  };

  const handleHeaderSearchSelect = React.useCallback(
    (item: NavigationSearchItem) => {
      navigateToTab(item.tab, { openAssistant: item.tab === 'assistant' });
    },
    [navigateToTab]
  );

  const handleHeaderSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setIsHeaderSearchOpen(false);
      return;
    }

    if (event.key !== 'Enter') return;
    event.preventDefault();
    const firstResult = headerSearchResults[0];
    if (!firstResult) return;
    handleHeaderSearchSelect(firstResult);
  };

  if (authLoading) {
    return (
      <div className="theme-app-shell min-h-screen flex items-center justify-center">
        <div className="size-12 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <LoginView onLoginSuccess={(u) => setUser(u)} initialMode={loginModeFromQuery} />;
  }

  return (
    <AppErrorBoundary>
      <div className="theme-app-shell flex h-screen overflow-hidden">
      {showTutorial && (
        <OnboardingContainer>
          <OnboardingTutorial onComplete={() => setShowTutorial(false)} />
        </OnboardingContainer>
      )}

      <AnimatePresence>
        {uiFeedback && (
          <motion.div
            key={uiFeedback.id}
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="fixed right-4 top-4 z-[160] w-[min(24rem,calc(100vw-2rem))]"
          >
            <div
              className={cn(
                'theme-modal-surface flex items-start gap-3 rounded-2xl border px-4 py-3 shadow-[var(--shadow-soft)]',
                uiFeedback.tone === 'success'
                  ? 'border-[color:color-mix(in_srgb,var(--positive)_32%,transparent)]'
                  : uiFeedback.tone === 'error'
                    ? 'border-[color:color-mix(in_srgb,var(--danger)_32%,transparent)]'
                    : 'border-[color:color-mix(in_srgb,var(--primary)_32%,transparent)]'
              )}
            >
              <div className="mt-0.5 shrink-0 text-[var(--text-secondary)]">
                {uiFeedback.tone === 'success' ? (
                  <CheckCircle2 size={16} />
                ) : uiFeedback.tone === 'error' ? (
                  <AlertTriangle size={16} />
                ) : (
                  <Bell size={16} />
                )}
              </div>
              <p className="flex-1 text-sm leading-relaxed text-[var(--text-primary)]">{uiFeedback.message}</p>
              <button
                type="button"
                onClick={dismissUiFeedback}
                className="rounded-lg p-1 text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
                aria-label="Fechar mensagem"
              >
                <X size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isUpgradeLimitModalOpen && (
          <motion.div
            className="fixed inset-0 z-[130] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              className="absolute inset-0 bg-[var(--bg-app)] backdrop-blur-sm"
              onClick={() => setIsUpgradeLimitModalOpen(false)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="theme-modal-surface relative w-full max-w-md rounded-3xl p-6 shadow-2xl"
            >
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[color:var(--border-default)] bg-[color:var(--primary-soft)] px-3 py-1">
                <ArrowUpRight size={12} className="text-[var(--text-secondary)]" />
                <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)]">
                  Upgrade
                </span>
              </div>
              <h3 className="card-title-premium text-[var(--text-primary)] mb-2">Limite do plano Free atingido</h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-6">
                {upgradeLimitReason === 'transactions'
                  ? `Você chegou ao limite de ${FREE_TRANSACTION_LIMIT_PER_MONTH} transações no mês.`
                  : `Você chegou ao limite de ${FREE_AI_LIMIT_PER_MONTH} interações de IA no mês.`}{' '}
                Faça upgrade para Pro/Premium e continue sem bloqueios.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsUpgradeLimitModalOpen(false)}
                  className="flex-1 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface-elevated)] px-4 py-2 text-sm font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                >
                  Agora não
                </button>
                <button
                  onClick={() => {
                    setIsUpgradeLimitModalOpen(false);
                    navigateToTab('integrations');
                    void handleUpgrade('Pro Mensal');
                  }}
                  className="flex-1 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-bold text-[var(--text-primary)] hover:bg-[var(--primary-hover)] transition-colors"
                >
                  Fazer upgrade
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isCreateWorkspaceModalOpen && (
          <motion.div
            className="fixed inset-0 z-[132] flex items-end justify-center p-0 sm:items-center sm:p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              type="button"
              aria-label="Fechar modal de nova conta"
              onClick={() => {
                if (isCreatingWorkspace) return;
                setIsCreateWorkspaceModalOpen(false);
                setCreateWorkspaceError(null);
              }}
              className="absolute inset-0 bg-[var(--bg-app)]/85 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: 16, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 16, opacity: 0, scale: 0.98 }}
              className="theme-modal-surface relative z-10 w-full max-w-lg rounded-t-[1.75rem] p-5 shadow-2xl sm:rounded-3xl sm:p-6"
            >
              <div className="mx-auto mb-4 h-1.5 w-14 rounded-full bg-[var(--bg-surface-elevated)] sm:hidden" />
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)]">Nova conta</p>
                  <h3 className="page-title-premium text-[var(--text-primary)]">Criar conta</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
                    Crie uma nova conta para separar finanças pessoais, empresa ou operações diferentes dentro do mesmo
                    painel.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (isCreatingWorkspace) return;
                    setIsCreateWorkspaceModalOpen(false);
                    setCreateWorkspaceError(null);
                  }}
                  className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface-elevated)] px-3 py-1.5 text-xs font-bold text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
                >
                  Fechar
                </button>
              </div>

              <form
                className="space-y-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleCreateWorkspace(newWorkspaceName);
                }}
              >
                <div>
                  <label className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">
                    Nome da conta
                  </label>
                  <input
                    type="text"
                    value={newWorkspaceName}
                    onChange={(event) => setNewWorkspaceName(event.target.value)}
                    placeholder="Ex.: Empresa, Casa ou Projeto"
                    autoFocus
                    maxLength={80}
                    className="w-full rounded-2xl border border-[var(--border-default)] bg-[var(--bg-app)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-muted)] focus:border-[var(--primary)]"
                  />
                </div>

                {createWorkspaceError && (
                  <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-app)] px-4 py-3 text-sm text-[var(--danger)]">
                    {createWorkspaceError}
                  </div>
                )}

                <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      if (isCreatingWorkspace) return;
                      setIsCreateWorkspaceModalOpen(false);
                      setCreateWorkspaceError(null);
                    }}
                    className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface-elevated)] px-4 py-3 text-sm font-bold text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
                  >
                    Agora não
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingWorkspace}
                    className="rounded-2xl bg-[var(--primary)] px-4 py-3 text-sm font-bold text-[var(--text-primary)] transition-colors hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isCreatingWorkspace ? 'Criando conta...' : 'Criar conta'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isCreateWalletModalOpen && (
          <motion.div
            className="fixed inset-0 z-[133] flex items-end justify-center p-0 sm:items-center sm:p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              type="button"
              aria-label="Fechar modal de nova carteira"
              onClick={() => {
                if (isCreatingWallet) return;
                setIsCreateWalletModalOpen(false);
                setCreateWalletError(null);
              }}
              className="absolute inset-0 bg-[var(--bg-app)]/85 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: 16, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 16, opacity: 0, scale: 0.98 }}
              className="theme-modal-surface relative z-10 w-full max-w-lg rounded-t-[1.75rem] p-5 shadow-2xl sm:rounded-3xl sm:p-6"
            >
              <div className="mx-auto mb-4 h-1.5 w-14 rounded-full bg-[var(--bg-surface-elevated)] sm:hidden" />
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)]">
                    Nova carteira
                  </p>
                  <h3 className="page-title-premium text-[var(--text-primary)]">Criar carteira</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
                    Selecione o banco de origem e crie uma nova carteira para acompanhar melhor seus saldos.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (isCreatingWallet) return;
                    setIsCreateWalletModalOpen(false);
                    setCreateWalletError(null);
                  }}
                  className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface-elevated)] px-3 py-1.5 text-xs font-bold text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
                >
                  Fechar
                </button>
              </div>

              <form
                className="space-y-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleCreateWallet();
                }}
              >
                <div>
                  <label className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">
                    Banco de origem
                  </label>
                  <select
                    value={newWalletBank}
                    onChange={(event) => {
                      const nextBank = event.target.value;
                      setNewWalletBank(nextBank);
                      setNewWalletName((prev) => (prev.trim() ? prev : nextBank));
                    }}
                    className="w-full rounded-2xl border border-[var(--border-default)] bg-[var(--bg-app)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--primary)]"
                  >
                    <option value="">Selecione um banco</option>
                    {MAIN_BANK_OPTIONS.map((bank) => (
                      <option key={bank} value={bank}>
                        {bank}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">
                    Nome da carteira
                  </label>
                  <input
                    type="text"
                    value={newWalletName}
                    onChange={(event) => setNewWalletName(event.target.value)}
                    placeholder="Ex.: Nubank pessoal ou Caixa empresa"
                    maxLength={80}
                    className="w-full rounded-2xl border border-[var(--border-default)] bg-[var(--bg-app)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-muted)] focus:border-[var(--primary)]"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">
                    Saldo inicial (opcional)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={newWalletInitialBalance}
                    onChange={(event) => setNewWalletInitialBalance(maskMoneyInput(event.target.value))}
                    placeholder="R$ 0,00"
                    className="w-full rounded-2xl border border-[var(--border-default)] bg-[var(--bg-app)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-muted)] focus:border-[var(--primary)]"
                  />
                </div>

                {createWalletError && (
                  <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-app)] px-4 py-3 text-sm text-[var(--danger)]">
                    {createWalletError}
                  </div>
                )}

                <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      if (isCreatingWallet) return;
                      setIsCreateWalletModalOpen(false);
                      setCreateWalletError(null);
                    }}
                    className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface-elevated)] px-4 py-3 text-sm font-bold text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
                  >
                    Agora não
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingWallet}
                    className="rounded-2xl bg-[var(--primary)] px-4 py-3 text-sm font-bold text-[var(--text-primary)] transition-colors hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isCreatingWallet ? 'Criando carteira...' : 'Criar carteira'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {walletPendingDelete && (
          <motion.div
            className="fixed inset-0 z-[134] flex items-end justify-center p-0 sm:items-center sm:p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              type="button"
              aria-label="Fechar confirmação de exclusão de carteira"
              onClick={() => {
                if (isDeletingWallet) return;
                setWalletPendingDelete(null);
                setDeleteWalletError(null);
              }}
              className="absolute inset-0 bg-[var(--bg-app)]/85 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: 16, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 16, opacity: 0, scale: 0.98 }}
              className="theme-modal-surface relative z-10 w-full max-w-lg rounded-t-[1.75rem] p-5 shadow-2xl sm:rounded-3xl sm:p-6"
            >
              <div className="mx-auto mb-4 h-1.5 w-14 rounded-full bg-[var(--bg-surface-elevated)] sm:hidden" />
              <div className="mb-5 space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--danger)]">Excluir carteira</p>
                <h3 className="card-title-premium text-[var(--text-primary)]">
                  Confirmar exclusão de &quot;{walletPendingDelete.name}&quot;
                </h3>
                <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
                  Essa ação remove a carteira de forma permanente. Se houver transações ou investimentos vinculados, a
                  exclusão será bloqueada para evitar perda de dados.
                </p>
              </div>

              {deleteWalletError && (
                <div className="mb-4 rounded-xl border border-[var(--border-default)] bg-[color:var(--danger-soft)] px-4 py-3 text-sm text-[var(--text-primary)]">
                  {deleteWalletError}
                </div>
              )}

              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    if (isDeletingWallet) return;
                    setWalletPendingDelete(null);
                    setDeleteWalletError(null);
                  }}
                  className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface-elevated)] px-4 py-3 text-sm font-bold text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => void handleConfirmDeleteWallet()}
                  disabled={isDeletingWallet}
                  className="rounded-2xl border border-[var(--border-default)] bg-[color:var(--danger-soft)] px-4 py-3 text-sm font-bold text-[var(--danger)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isDeletingWallet ? 'Excluindo carteira...' : 'Excluir carteira'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isDeleteWorkspaceModalOpen && activeWorkspace && (
          <motion.div
            className="fixed inset-0 z-[135] flex items-end justify-center p-0 sm:items-center sm:p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              type="button"
              aria-label="Fechar confirmação de exclusão de conta"
              onClick={() => {
                if (isDeletingWorkspace) return;
                setIsDeleteWorkspaceModalOpen(false);
                setDeleteWorkspaceError(null);
                setDeleteWorkspaceConfirmationName('');
              }}
              className="absolute inset-0 bg-[var(--bg-app)]/90 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: 16, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 16, opacity: 0, scale: 0.98 }}
              className="theme-modal-surface relative z-10 w-full max-w-xl rounded-t-[1.75rem] p-5 shadow-2xl sm:rounded-3xl sm:p-6"
            >
              <div className="mx-auto mb-4 h-1.5 w-14 rounded-full bg-[var(--bg-surface-elevated)] sm:hidden" />
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--danger)]">Ação irreversível</p>
                <h3 className="card-title-premium text-[var(--text-primary)]">
                  Excluir conta &quot;{activeWorkspace.name}&quot;
                </h3>
                <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
                  Para confirmar, digite o nome da conta exatamente como está. Todos os dados vinculados serão
                  apagados permanentemente.
                </p>
              </div>

              <div className="mt-5 space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">
                  Digite: {activeWorkspace.name}
                </label>
                <input
                  type="text"
                  value={deleteWorkspaceConfirmationName}
                  onChange={(event) => setDeleteWorkspaceConfirmationName(event.target.value)}
                  placeholder={activeWorkspace.name}
                  className="app-field w-full rounded-xl px-4 py-3 text-sm"
                />
              </div>

              {deleteWorkspaceError && (
                <div className="mt-4 rounded-xl border border-[var(--border-default)] bg-[color:var(--danger-soft)] px-4 py-3 text-sm text-[var(--text-primary)]">
                  {deleteWorkspaceError}
                </div>
              )}

              <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    if (isDeletingWorkspace) return;
                    setIsDeleteWorkspaceModalOpen(false);
                    setDeleteWorkspaceError(null);
                    setDeleteWorkspaceConfirmationName('');
                  }}
                  className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface-elevated)] px-4 py-3 text-sm font-bold text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => void handleDeleteWorkspace()}
                  disabled={isDeletingWorkspace}
                  className="rounded-2xl border border-[var(--border-default)] bg-[color:var(--danger-soft)] px-4 py-3 text-sm font-bold text-[var(--danger)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isDeletingWorkspace ? 'Excluindo conta...' : 'Excluir conta'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isWorkspaceOnboardingOpen && (
          <motion.div
            className="fixed inset-0 z-[136] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-[var(--bg-app)]/85 backdrop-blur-sm" />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="theme-modal-surface relative w-full max-w-3xl rounded-3xl p-6 shadow-2xl"
            >
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-[var(--text-secondary)] font-black mb-2">
                    Onboarding Cote Finance AI
                  </p>
                  <h3 className="page-title-premium text-[var(--text-primary)]">Configuração inteligente da sua conta</h3>
                  <p className="text-sm text-[var(--text-secondary)]">Etapa {onboardingStep + 1} de 9</p>
                </div>
                <button
                  onClick={() => void handleDismissWorkspaceOnboarding()}
                  disabled={isDismissingOnboarding || isSavingOnboarding}
                  className="app-button-secondary rounded-xl px-3 py-1.5 text-xs font-bold"
                >
                  {isDismissingOnboarding ? 'Salvando...' : 'Depois'}
                </button>
              </div>

              <div className="mb-6 h-2 w-full rounded-full bg-[var(--bg-surface-elevated)]">
                <div
                  className="h-full rounded-full bg-[var(--primary)] transition-all duration-300"
                  style={{ width: `${onboardingFlowProgress}%` }}
                />
              </div>

              {onboardingStep === 0 && (
                <div className="space-y-6">
                  <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface-elevated)]/40 p-6">
                    <h4 className="page-title-premium mb-2 text-[var(--text-primary)]">Bem-vindo ao Cote Finance AI</h4>
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                      Vamos configurar sua conta em menos de 1 minuto. Isso ajuda a IA a entender melhor suas finanças e
                      gerar insights mais úteis para você.
                    </p>
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={() => setOnboardingStep(1)}
                      className="app-button-primary rounded-xl px-5 py-2.5 text-sm font-bold"
                    >
                      Começar
                    </button>
                  </div>
                </div>
              )}

              {onboardingStep === 1 && (
                <div className="space-y-5">
                  <div>
                    <h4 className="page-title-premium text-[var(--text-primary)] mb-1">Qual é seu principal objetivo financeiro?</h4>
                    <p className="text-sm text-[var(--text-secondary)]">
                      Escolha o objetivo principal para personalizar seus insights.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {ONBOARDING_OBJECTIVES.map((objective) => (
                      <button
                        key={objective}
                        type="button"
                        aria-pressed={onboardingObjective === objective}
                        onClick={() => setOnboardingObjective(objective)}
                        className={cn(
                          'app-selection-chip flex items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold',
                          onboardingObjective === objective && 'is-selected'
                        )}
                      >
                        <span className="min-w-0 text-balance">{objective}</span>
                        <span className="app-selection-chip-check" aria-hidden="true">
                          <CheckCircle2 size={12} />
                        </span>
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-between">
                    <button
                      onClick={() => setOnboardingStep(0)}
                      className="app-button-secondary rounded-xl px-4 py-2 text-sm font-bold"
                    >
                      Voltar
                    </button>
                    <button
                      onClick={() => setOnboardingStep(2)}
                      className="app-button-primary rounded-xl px-5 py-2.5 text-sm font-bold"
                    >
                      Continuar
                    </button>
                  </div>
                </div>
              )}

              {onboardingStep === 2 && (
                <div className="space-y-5">
                  <div>
                    <h4 className="page-title-premium text-[var(--text-primary)] mb-1">
                      Quantos lançamentos você pretende registrar por mês?
                    </h4>
                    <p className="text-sm text-[var(--text-secondary)]">Isso ajuda a ajustar recomendações e limites iniciais.</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {ONBOARDING_USAGE_LEVELS.map((rangeLabel) => (
                      <button
                        key={rangeLabel}
                        type="button"
                        aria-pressed={onboardingProfile === rangeLabel}
                        onClick={() => setOnboardingProfile(rangeLabel)}
                        className={cn(
                          'app-selection-chip flex items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold',
                          onboardingProfile === rangeLabel && 'is-selected'
                        )}
                      >
                        <span className="min-w-0 text-balance">{rangeLabel}</span>
                        <span className="app-selection-chip-check" aria-hidden="true">
                          <CheckCircle2 size={12} />
                        </span>
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-between">
                    <button
                      onClick={() => setOnboardingStep(1)}
                      className="app-button-secondary rounded-xl px-4 py-2 text-sm font-bold"
                    >
                      Voltar
                    </button>
                    <button
                      onClick={() => setOnboardingStep(3)}
                      className="app-button-primary rounded-xl px-5 py-2.5 text-sm font-bold"
                    >
                      Continuar
                    </button>
                  </div>
                </div>
              )}

              {onboardingStep === 3 && (
                <div className="space-y-5">
                  <div>
                    <h4 className="page-title-premium text-[var(--text-primary)] mb-1">
                      Vamos adicionar seu primeiro registro financeiro
                    </h4>
                    <p className="text-sm text-[var(--text-secondary)]">
                      Adicionar seus primeiros dados leva menos de 10 segundos.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {(['Entrada', 'Saida'] as TransactionFlowType[]).map((flowType) => (
                      <button
                        key={flowType}
                        aria-pressed={onboardingFirstRecord.flowType === flowType}
                        onClick={() =>
                          setOnboardingFirstRecord((prev) => ({
                            ...prev,
                            flowType,
                            paymentMethod: getDefaultPaymentMethodForFlow(flowType),
                          }))
                        }
                        className={cn(
                          'app-selection-chip flex items-center justify-between gap-2 rounded-2xl px-4 py-3 text-sm font-bold',
                          onboardingFirstRecord.flowType === flowType && 'is-selected'
                        )}
                      >
                        <span>{flowType}</span>
                        <span className="app-selection-chip-check" aria-hidden="true">
                          <CheckCircle2 size={12} />
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="label-premium text-[var(--text-muted)]">Valor</label>
                      <MoneyInput
                        value={onboardingFirstRecord.amount}
                        onChange={(value) =>
                          setOnboardingFirstRecord((prev) => ({
                            ...prev,
                            amount: value,
                          }))
                        }
                        placeholder="R$ 0,00"
                        className={cn(
                          'app-field w-full rounded-xl py-2 px-4 text-sm',
                          parseMoneyInput(onboardingFirstRecord.amount) > 0 && 'app-field-filled'
                        )}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="label-premium text-[var(--text-muted)]">Categoria</label>
                      <select
                        value={onboardingFirstRecord.category}
                        onChange={(event) =>
                          setOnboardingFirstRecord((prev) => ({
                            ...prev,
                            category: event.target.value,
                          }))
                        }
                        className={cn(
                          'app-field w-full rounded-xl py-2 px-4 text-sm',
                          onboardingFirstRecord.category.trim().length > 0 && 'app-field-filled'
                        )}
                      >
                        {TRANSACTION_CATEGORIES.filter((category) => category !== 'Auto (IA)').map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="label-premium text-[var(--text-muted)]">
                      Descrição (opcional)
                    </label>
                    <input
                      value={onboardingFirstRecord.description}
                      onChange={(event) =>
                        setOnboardingFirstRecord((prev) => ({
                          ...prev,
                          description: event.target.value,
                        }))
                      }
                      placeholder="Ex: Mercado do mês"
                      className={cn(
                        'app-field w-full rounded-xl py-2 px-4 text-sm',
                        onboardingFirstRecord.description.trim().length > 0 && 'app-field-filled'
                      )}
                    />
                  </div>

                  {onboardingFirstRecordAdded && (
                    <div className="rounded-xl border border-[color:var(--border-default)] bg-[color:var(--primary-soft)] px-4 py-3 text-sm text-[var(--text-secondary)]">
                      Parabéns! Seu primeiro registro foi adicionado.
                    </div>
                  )}

                  <div className="flex justify-between">
                    <button
                      onClick={() => setOnboardingStep(2)}
                      className="app-button-secondary rounded-xl px-4 py-2 text-sm font-bold"
                    >
                      Voltar
                    </button>
                    <button
                      onClick={() => void handleAddOnboardingFirstRecord()}
                      disabled={isSavingOnboardingRecord || parseMoneyInput(onboardingFirstRecord.amount) <= 0}
                      className="app-cta-primary rounded-xl px-5 py-2.5 text-sm font-bold"
                    >
                      {isSavingOnboardingRecord ? 'Adicionando...' : 'Adicionar registro'}
                    </button>
                  </div>
                </div>
              )}

              {onboardingStep === 4 && (
                <div className="space-y-5">
                  <div>
                    <h4 className="page-title-premium text-[var(--text-primary)] mb-1">Este é seu painel financeiro</h4>
                    <p className="text-sm text-[var(--text-secondary)]">Aqui você acompanha tudo em um único lugar.</p>
                  </div>
                  <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface-elevated)]/50 p-5 space-y-3">
                    <p className="text-sm text-[var(--text-primary)]">Aqui você pode ver:</p>
                    <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
                      <li>saldo atual</li>
                      <li>saidas por categoria</li>
                      <li>evolução dos gastos</li>
                      <li>análises completas disponíveis no Pro</li>
                    </ul>
                  </div>
                  <div className="flex justify-between">
                    <button
                      onClick={() => setOnboardingStep(3)}
                      className="app-button-secondary rounded-xl px-4 py-2 text-sm font-bold"
                    >
                      Voltar
                    </button>
                    <button
                      onClick={() => setOnboardingStep(5)}
                      className="app-button-primary rounded-xl px-5 py-2.5 text-sm font-bold"
                    >
                      Continuar
                    </button>
                  </div>
                </div>
              )}

              {onboardingStep === 5 && (
                <div className="space-y-5">
                  <div>
                    <h4 className="page-title-premium text-[var(--text-primary)] mb-1">Prévia das análises com IA</h4>
                    <p className="text-sm text-[var(--text-secondary)]">
                      Este é um exemplo do tipo de insight automático disponível nos planos Pro e Premium.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-[color:var(--border-default)] bg-[color:var(--primary-soft)] p-5 text-sm leading-relaxed text-[var(--text-secondary)]">
                    Você gastou {onboardingPrimaryInsight.percentage}% em{' '}
                    {String(onboardingPrimaryInsight.category || 'alimentação').toLowerCase()}. Se reduzir esse gasto em
                    10%, pode economizar aproximadamente{' '}
                    {formatCurrency(onboardingPrimaryInsight.monthlySaving)} por mês.
                  </div>
                  <div className="flex justify-between">
                    <button
                      onClick={() => setOnboardingStep(4)}
                      className="app-button-secondary rounded-xl px-4 py-2 text-sm font-bold"
                    >
                      Voltar
                    </button>
                    <button
                      onClick={() => {
                        setOnboardingInsightViewed(true);
                        setOnboardingStep(6);
                      }}
                      className="app-button-primary rounded-xl px-5 py-2.5 text-sm font-bold"
                    >
                      Entendi como funciona
                    </button>
                  </div>
                </div>
              )}

              {onboardingStep === 6 && (
                <div className="space-y-5">
                  <div>
                    <h4 className="page-title-premium text-[var(--text-primary)] mb-1">Complete seu setup</h4>
                    <p className="text-sm text-[var(--text-secondary)]">
                      Conclua estas ações para deixar sua conta pronta para análises mais avançadas.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface-elevated)]/50 p-5 space-y-4">
                    <div className="h-2 w-full rounded-full bg-[var(--bg-surface-elevated)]">
                      <div
                        className="h-full rounded-full bg-[var(--primary)] transition-all"
                        style={{ width: `${onboardingChecklistProgress}%` }}
                      />
                    </div>
                    <p className="text-sm text-[var(--text-secondary)]">Você completou {onboardingChecklistProgress}% do setup.</p>
                    <div className="space-y-2">
                      {onboardingChecklist.map((item) => (
                        <div key={item.label} className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
                          <CheckCircle2 size={16} className={item.done ? 'text-[var(--text-secondary)]' : 'text-[var(--text-muted)]'} />
                          <span className={item.done ? 'text-[var(--text-secondary)]' : 'text-[var(--text-secondary)]'}>{item.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <button
                      onClick={() => setOnboardingStep(5)}
                      className="app-button-secondary rounded-xl px-4 py-2 text-sm font-bold"
                    >
                      Voltar
                    </button>
                    <button
                      onClick={() => setOnboardingStep(7)}
                      className="app-button-primary rounded-xl px-5 py-2.5 text-sm font-bold"
                    >
                      Continuar
                    </button>
                  </div>
                </div>
              )}

              {onboardingStep === 7 && (
                <div className="space-y-5">
                  <div>
                    <h4 className="page-title-premium text-[var(--text-primary)] mb-1">Exemplo de oportunidade detectada</h4>
                    <p className="text-sm text-[var(--text-secondary)]">
                      Nos planos Pro e Premium, a IA destaca padrões e oportunidades automaticamente.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-[var(--border-default)]/25 bg-[color:var(--primary-soft)] p-5 text-sm leading-relaxed text-[var(--text-secondary)]">
                    Você gastou {formatCurrency(onboardingAutomaticInsight.total)} em{' '}
                    {onboardingAutomaticInsight.categoryLabel} neste mês. Se reduzir 15% desse valor, pode economizar
                    aproximadamente {formatCurrency(onboardingAutomaticInsight.annualSaving)} por ano.
                  </div>
                  <div className="flex justify-between">
                    <button
                      onClick={() => setOnboardingStep(6)}
                      className="app-button-secondary rounded-xl px-4 py-2 text-sm font-bold"
                    >
                      Voltar
                    </button>
                    <button
                      onClick={() => setOnboardingStep(8)}
                      className="app-button-primary rounded-xl px-5 py-2.5 text-sm font-bold"
                    >
                      Ver análise completa
                    </button>
                  </div>
                </div>
              )}

              {onboardingStep === 8 && (
                <div className="space-y-5">
                  <div>
                    <h4 className="page-title-premium text-[var(--text-primary)] mb-1">
                      Desbloqueie análises financeiras avançadas
                    </h4>
                    <p className="text-sm text-[var(--text-secondary)]">Com o plano Pro você terá:</p>
                  </div>
                  <div className="rounded-2xl border border-[color:var(--border-default)] bg-[color:var(--primary-soft)] p-5">
                    <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
                      <li>• insights financeiros completos</li>
                      <li>• previsões de saldo</li>
                      <li>• alertas de gastos fora do padrão</li>
                      <li>• resumos e lembretes no WhatsApp</li>
                      <li>• relatórios avançados</li>
                    </ul>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                    <input
                      type="checkbox"
                      checked={onboardingAiSuggestionsEnabled}
                      onChange={(event) => setOnboardingAiSuggestionsEnabled(event.target.checked)}
                    />
                    Ativar sugestões de IA para esta conta
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2 sm:justify-between">
                    <button
                      onClick={() => setOnboardingStep(7)}
                      className="app-button-secondary rounded-xl px-4 py-2 text-sm font-bold"
                    >
                      Voltar
                    </button>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        onClick={() => void handleCompleteWorkspaceOnboarding('FREE')}
                        disabled={isSavingOnboarding}
                        className="app-button-secondary rounded-xl px-4 py-2 text-sm font-bold disabled:opacity-60"
                      >
                        Continuar no Free
                      </button>
                      <button
                        onClick={() => void handleCompleteWorkspaceOnboarding('PRO')}
                        disabled={isSavingOnboarding}
                        className="app-button-primary rounded-xl px-5 py-2.5 text-sm font-bold disabled:opacity-60"
                      >
                        {isSavingOnboarding ? 'Preparando...' : 'Testar Pro gratuitamente por 3 dias'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <TransactionModal
        isOpen={isTransactionModalOpen}
        onClose={() => {
          setIsTransactionModalOpen(false);
          setEditingTransactionId(null);
          setTransactionModalDraft(null);
        }}
        onSubmit={handleSubmitTransaction}
        onSuggestCategory={handleSuggestTransactionCategory}
        onParseReceipt={handleParseTransactionReceipt}
        walletOptions={wallets}
        customCategories={customTransactionCategories}
        onCreateCategory={handleCreateCustomTransactionCategory}
        initialData={editingTransaction}
        initialDraft={transactionModalDraft}
      />

      <GoalModal
        isOpen={isGoalModalOpen}
        onClose={() => {
          setIsGoalModalOpen(false);
          setEditingGoalId(null);
        }}
        onSubmit={handleSubmitGoal}
        initialData={editingGoal}
      />

      <InvestmentModal
        isOpen={isInvestmentModalOpen}
        onClose={() => {
          setIsInvestmentModalOpen(false);
          setEditingInvestmentId(null);
        }}
        onSubmit={handleSubmitInvestment}
        wallets={wallets}
        initialData={editingInvestment}
      />

      <DebtModal
        isOpen={isDebtModalOpen}
        onClose={() => {
          setIsDebtModalOpen(false);
          setEditingDebtId(null);
          setDebtDraft(null);
        }}
        onSubmit={handleSubmitDebt}
        initialData={editingDebt}
        initialDraft={debtDraft}
      />
      <RecurringDebtModal
        isOpen={isRecurringDebtModalOpen}
        onClose={() => {
          setIsRecurringDebtModalOpen(false);
          setEditingRecurringDebtId(null);
          setRecurringDebtDraft(null);
        }}
        onSubmit={handleSubmitRecurringDebt}
        initialData={editingRecurringDebt}
        initialDraft={recurringDebtDraft}
      />
      {/* Sidebar Overlay for Mobile */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 z-[90] bg-[var(--bg-app)] backdrop-blur-sm lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={cn(
          'sidebar-premium fixed inset-y-0 left-0 z-[100] flex h-full max-w-[88vw] flex-shrink-0 flex-col border-r border-[var(--border-default)] backdrop-blur-xl transition-all duration-300 lg:relative lg:max-w-none lg:translate-x-0',
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full',
          isSidebarCollapsed ? 'w-[13.75rem] lg:w-[4.75rem]' : 'w-[13.75rem] lg:w-[13.75rem]'
        )}
      >
        <button
          type="button"
          onClick={() => setIsSidebarCollapsed((current) => !current)}
          className="absolute -right-3 top-5 z-20 hidden h-7 w-7 items-center justify-center rounded-full border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-secondary)] shadow-[var(--shadow-soft)] transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] lg:inline-flex"
          title={isSidebarCollapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          {isSidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
        <div className={cn('flex items-center justify-between gap-2', isSidebarCollapsed ? 'p-2.5' : 'px-3.5 py-3')} id="sidebar-logo">
          <Image
            src={isSidebarCollapsed ? sidebarCollapsedLogo : brandLogo}
            alt="Cote Finance AI - By Cote Juros"
            width={isSidebarCollapsed ? 64 : 700}
            height={isSidebarCollapsed ? 64 : 192}
            className={cn('h-auto transition-all duration-300', isSidebarCollapsed ? 'w-11' : 'w-full max-w-[280px]')}
          />
          <div className="flex items-center gap-2">
            <button onClick={() => setIsSidebarOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] lg:hidden">
              <X size={20} />
            </button>
          </div>
        </div>

                <nav className={cn('flex-1 space-y-0.5 overflow-y-auto custom-scrollbar py-2.5', isSidebarCollapsed ? 'px-1.5' : 'px-2.5')}>
          {MAIN_NAV_ITEMS.map((item) => (
            <SidebarItem
              key={`main-nav-${item.tab}`}
              icon={item.icon}
              label={item.label}
              active={activeTab === item.tab}
              collapsed={isSidebarCollapsed}
              onClick={() => navigateToTab(item.tab)}
            />
          ))}

          <div className={cn('my-3 border-t border-[var(--border-default)]', isSidebarCollapsed ? 'mx-1' : 'mx-2')} />

          {SECONDARY_NAV_ITEMS.map((item) => {
            const isWhatsAppFeatureLocked = item.tab === 'integrations' && isFreePlan;
            return (
              <SidebarItem
                key={`secondary-nav-${item.tab}`}
                icon={item.icon}
                label={item.label}
                active={activeTab === item.tab}
                collapsed={isSidebarCollapsed}
                badgeText={isWhatsAppFeatureLocked ? 'Pro' : null}
                locked={isWhatsAppFeatureLocked}
                onClick={() => navigateToTab(item.tab, { openAssistant: item.tab === 'assistant' })}
              />
            );
          })}
        </nav>

        <div className="p-3">
          {isSidebarCollapsed ? (
            <div className="space-y-3">
              <div className="rounded-2xl border border-[color:var(--border-default)] bg-[color:var(--primary-soft)] px-2 py-3 text-center">
                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)]">{planLabel}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (isFreePlan) {
                    void handleUpgrade('Pro Mensal');
                    return;
                  }
                  handleManageSubscription();
                }}
                className="flex h-12 w-full items-center justify-center rounded-xl bg-[linear-gradient(135deg,var(--primary)_0%,var(--primary-hover)_100%)] text-[var(--text-primary)] transition-all duration-200 hover:brightness-105"
                title={isFreePlan ? 'Atualizar para Pro' : 'Gerenciar assinatura'}
              >
                <ArrowUpRight size={18} />
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="flex h-12 w-full items-center justify-center rounded-xl bg-[var(--bg-surface-elevated)] text-[var(--text-primary)] transition-all duration-200 hover:bg-[var(--bg-surface-elevated)]"
                title="Sair"
              >
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <>
              <div className="rounded-2xl border border-[color:var(--border-default)] bg-[color:var(--primary-soft)] p-3">
                <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)]">Plano {planLabel}</p>
                <p className="mb-3 text-[11px] text-[var(--text-secondary)] leading-snug">
                  {isFreePlan ? `${FREE_TRANSACTION_LIMIT_PER_MONTH} transações/mês` : 'Transações ilimitadas'}
                </p>
                <button
                  onClick={() => {
                    if (isFreePlan) {
                      void handleUpgrade('Pro Mensal');
                      return;
                    }
                    handleManageSubscription();
                  }}
                  className="w-full rounded-xl bg-[linear-gradient(135deg,var(--primary)_0%,var(--primary-hover)_100%)] py-2 text-[11px] font-bold text-[var(--text-primary)] transition-all hover:brightness-105 shadow-lg shadow-[color:var(--primary-soft)]"
                >
                  {isFreePlan ? 'Atualizar para Pro' : 'Gerenciar assinatura'}
                </button>
              </div>
              <button
                onClick={handleLogout}
                className="mt-4 flex w-full items-center justify-center gap-3 px-3 py-2 text-sm font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
              >
                <LogOut size={18} /> Sair
              </button>
            </>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="sticky top-0 z-30 border-b border-[var(--border-default)] bg-[color:color-mix(in_srgb,var(--bg-primary)_92%,var(--bg-secondary))] px-3 py-3 backdrop-blur-xl sm:px-4 lg:px-8">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              <Menu size={20} />
            </button>
                            <h2 className="max-w-[44vw] truncate text-base font-bold capitalize text-[var(--text-primary)] sm:max-w-[18rem] lg:max-w-none lg:text-xl">
                {activeTabTitle}
              </h2>
              <div className="hidden md:flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-bold">
                  Conta
                </span>
                {workspaces.length > 0 && (
                  <select
                    value={activeWorkspaceId || ''}
                    onChange={(event) => {
                      const nextWorkspaceId = event.target.value;
                      if (!nextWorkspaceId || nextWorkspaceId === activeWorkspaceId) return;
                      setActiveWorkspaceId(nextWorkspaceId);
                    }}
                    className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
                  >
                    {workspaces.map((workspace) => (
                      <option key={workspace.id} value={workspace.id}>
                        {workspace.name}
                      </option>
                    ))}
                  </select>
                )}
                <button
                  onClick={handleOpenCreateWorkspaceModal}
                  className="px-2.5 py-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--primary)] transition-colors"
                >
                  + Conta
                </button>
              </div>
          </div>

            <div className="flex flex-shrink-0 items-center gap-2 lg:gap-4">
            <button
              onClick={() => {
                if (isFreePlan) {
                  void handleUpgrade('Pro Mensal');
                  return;
                }
                handleManageSubscription();
              }}
              className="hidden md:inline-flex items-center gap-2 rounded-xl bg-[linear-gradient(135deg,var(--primary)_0%,var(--primary-hover)_100%)] px-3 py-2 text-xs font-bold text-[var(--text-primary)] transition-all hover:brightness-105"
            >
              <ArrowUpRight size={14} /> {isFreePlan ? 'Upgrade' : 'Assinatura'}
            </button>

            <div className="relative" ref={quickCreateMenuRef}>
              <button
                onClick={handleOpenNew}
                type="button"
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-xl border bg-[var(--bg-surface)] px-2.5 py-2 text-xs font-bold text-[var(--text-primary)] transition-all sm:gap-2 sm:px-3',
                  isQuickCreateOpen ? 'border-[var(--primary)]' : 'border-[var(--border-default)] hover:border-[var(--primary)]'
                )}
              >
                <Plus size={14} />
                <span>Nova</span>
                <ChevronDown size={12} className={cn('transition-transform', isQuickCreateOpen && 'rotate-180')} />
              </button>

              {isQuickCreateOpen && (
                <>
                  <button
                    type="button"
                    aria-label="Fechar atalhos rápidos"
                    onClick={() => setIsQuickCreateOpen(false)}
                    className="fixed inset-0 z-40 bg-[var(--bg-app)] md:hidden"
                  />
                  <div className="theme-modal-surface fixed inset-x-3 top-20 z-50 max-h-[calc(100vh-6rem)] overflow-y-auto rounded-2xl p-3 shadow-2xl backdrop-blur-xl md:absolute md:right-0 md:top-full md:mt-2 md:w-[22rem] md:max-h-[75vh] md:inset-x-auto">
                  <div className="mb-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-muted)]">
                      {'Atalhos r\u00e1pidos'}
                    </p>
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">
                      Crie um novo item com menos cliques.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => handleQuickCreateTransaction('Entrada')}
                      className="app-surface-subtle rounded-xl px-3 py-3 text-left text-[var(--text-primary)] transition-colors hover:border-[color:var(--border-default)] hover:text-[var(--text-primary)]"
                    >
                      <div className="mb-1 flex items-center gap-2 text-sm font-bold">
                        <ArrowUpRight size={15} className="text-[var(--text-secondary)]" />
                        Entrada
                      </div>
                      <p className="text-[11px] text-[var(--text-secondary)]">{'Entrada r\u00e1pida de sal\u00e1rio, pix ou freelance.'}</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickCreateTransaction('Saida')}
                      className="app-surface-subtle rounded-xl px-3 py-3 text-left text-[var(--text-primary)] transition-colors hover:border-[color:var(--border-default)] hover:text-[var(--text-primary)]"
                    >
                      <div className="mb-1 flex items-center gap-2 text-sm font-bold">
                        <ArrowDownRight size={15} className="text-[var(--danger)]" />
                        Saida
                      </div>
                      <p className="text-[11px] text-[var(--text-secondary)]">{'Registre um gasto sem navegar at\u00e9 a aba.'}</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickCreateTransaction(TRANSACTION_FLOW_TYPES[2])}
                      className="app-surface-subtle rounded-xl px-3 py-3 text-left text-[var(--text-primary)] transition-colors hover:border-[color:var(--border-default)] hover:text-[var(--text-primary)]"
                    >
                      <div className="mb-1 flex items-center gap-2 text-sm font-bold">
                        <Workflow size={15} className="text-[var(--text-secondary)]" />
                        {'Transfer\u00eancia'}
                      </div>
                      <p className="text-[11px] text-[var(--text-secondary)]">Movimente saldo entre contas e carteiras.</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickCreateResource('goals')}
                      className="app-surface-subtle rounded-xl px-3 py-3 text-left text-[var(--text-primary)] transition-colors hover:border-[color:var(--border-default)] hover:text-[var(--text-primary)]"
                    >
                      <div className="mb-1 flex items-center gap-2 text-sm font-bold">
                        <Target size={15} className="text-[var(--text-secondary)]" />
                        Meta
                      </div>
                      <p className="text-[11px] text-[var(--text-secondary)]">Crie um objetivo financeiro e acompanhe o progresso.</p>
                    </button>
                  </div>

                  <div className="app-surface-subtle mt-3 rounded-xl p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-muted)]">
                        Categorias mais usadas
                      </p>
                      <span className="text-[10px] text-[var(--text-muted)]">Abre como saida</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {([
                        { value: 'Alimentação', label: 'Alimentação' },
                        { value: 'Transporte', label: 'Transporte' },
                        { value: 'Moradia', label: 'Moradia' },
                        { value: 'Saúde', label: 'Saúde' },
                        { value: 'Lazer', label: 'Lazer' },
                      ] as const).map((quickCategory) => (
                        <button
                          key={quickCategory.value}
                          type="button"
                          onClick={() => handleQuickCreateTransaction('Saida', quickCategory.value)}
                          className="app-surface-subtle rounded-full px-3 py-1.5 text-[11px] font-semibold text-[var(--text-primary)] transition-colors hover:border-[color:var(--border-default)] hover:text-[var(--text-primary)]"
                        >
                          {quickCategory.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => handleQuickCreateResource('debts')}
                      className="app-surface-subtle rounded-xl px-3 py-2 text-left text-xs font-bold text-[var(--text-primary)] transition-colors hover:border-[color:var(--border-default)] hover:text-[var(--text-primary)]"
                    >
                      <div className="mb-1 flex items-center gap-2">
                        <CreditCard size={14} className="text-[var(--text-secondary)]" />
                        {'D\u00edvida'}
                      </div>
                      <p className="text-[11px] font-medium text-[var(--text-secondary)]">Adicione uma conta a pagar ou parcelamento.</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickCreateResource('investments')}
                      className="app-surface-subtle rounded-xl px-3 py-2 text-left text-xs font-bold text-[var(--text-primary)] transition-colors hover:border-[color:var(--border-default)] hover:text-[var(--text-primary)]"
                    >
                      <div className="mb-1 flex items-center gap-2">
                        <TrendingUp size={14} className="text-[var(--text-secondary)]" />
                        Investimento
                      </div>
                      <p className="text-[11px] font-medium text-[var(--text-secondary)]">Registre um ativo e acompanhe rendimento.</p>
                    </button>
                  </div>
                  </div>
                </>
              )}
            </div>

            <div className="relative hidden xl:block" ref={headerSearchRef}>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
              <input
                type="text"
                value={headerSearchTerm}
                placeholder="Ir para Dashboard, Transações, Calendário..."
                onFocus={() => setIsHeaderSearchOpen(true)}
                onChange={(event) => {
                  setHeaderSearchTerm(event.target.value);
                  setIsHeaderSearchOpen(true);
                }}
                onKeyDown={handleHeaderSearchKeyDown}
                className="app-field w-72 rounded-xl py-2 pl-10 pr-4 text-xs text-[var(--text-primary)] transition-all focus:border-[var(--primary)] focus:outline-none"
              />

              {isHeaderSearchOpen && (
                <div className="theme-modal-surface absolute right-0 z-50 mt-2 w-[22rem] overflow-hidden rounded-2xl border border-[var(--border-default)] shadow-[var(--shadow-soft)]">
                  <div className="border-b border-[var(--border-default)] px-3 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                      Navegar no produto
                    </p>
                  </div>
                  <div className="custom-scrollbar max-h-72 overflow-y-auto p-2 pr-1">
                    {headerSearchResults.length > 0 ? (
                      headerSearchResults.map((item) => (
                        <button
                          key={`header-search-${item.tab}`}
                          type="button"
                          onClick={() => handleHeaderSearchSelect(item)}
                          className="w-full rounded-xl px-3 py-2 text-left transition-colors hover:bg-[var(--bg-surface)]"
                        >
                          <p className="text-sm font-semibold text-[var(--text-primary)]">{item.label}</p>
                          <p className="mt-1 text-xs text-[var(--text-secondary)]">{item.description}</p>
                        </button>
                      ))
                    ) : (
                      <p className="px-3 py-4 text-sm text-[var(--text-secondary)]">
                        Nenhum destino encontrado para sua busca.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

              <button
              onClick={() => setIsAssistantOpen(!isAssistantOpen)}
              className={cn(
                'p-2 rounded-xl border transition-all',
                isAssistantOpen
                  ? 'bg-[color:var(--primary-soft)] border-[var(--primary)] text-[var(--text-secondary)]'
                  : 'app-surface-subtle text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              )}
            >
              <MessageSquare size={18} />
            </button>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsNotificationsOpen((current) => !current)}
                  className={cn(
                    'app-surface-subtle relative rounded-xl p-2 transition-all hover:text-[var(--text-primary)]',
                    unreadNotifications.length > 0 ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'
                  )}
                >
                  <Bell size={18} />
                  {unreadNotifications.length > 0 && (
                    <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full border border-[var(--border-default)] bg-[var(--bg-app)] px-1 text-[10px] font-bold leading-none text-[var(--danger)]">
                      {unreadNotifications.length}
                    </span>
                  )}
                </button>

                <AnimatePresence>
                  {isNotificationsOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsNotificationsOpen(false)} />
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.97 }}
                        transition={{ duration: 0.18 }}
                        className="theme-modal-surface fixed inset-x-3 top-20 z-50 max-h-[calc(100vh-6rem)] overflow-hidden rounded-2xl shadow-[var(--shadow-soft)] backdrop-blur md:absolute md:right-0 md:top-full md:mt-3 md:w-[min(26rem,calc(100vw-1.5rem))] md:max-h-none md:inset-x-auto"
                      >
                        <div className="border-b border-[var(--border-default)] px-4 py-3">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-bold text-[var(--text-primary)]">Notificações</p>
                              <p className="text-xs text-[var(--text-secondary)]">
                                {visibleNotifications.length > 0
                                  ? unreadNotifications.length > 0
                                    ? `${unreadNotifications.length} nova(s) e ${readNotifications.length} já revisada(s)`
                                    : 'Tudo revisado por aqui'
                                  : 'Nada novo por enquanto'}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {unreadNotifications.length > 0 && (
                                <button
                                  type="button"
                                  onClick={markAllNotificationsAsRead}
                                  className="app-surface-subtle inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-[var(--text-primary)] transition hover:border-[color:var(--border-default)] hover:text-[var(--text-primary)]"
                                >
                                  <CheckCircle2 size={12} />
                                  Marcar lidas
                                </button>
                              )}
                              {unreadNotifications.length > 0 && (
                                <span className="rounded-full border border-[var(--border-default)] bg-[var(--bg-app)] px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-[var(--danger)]">
                                  {unreadNotifications.length} novas
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {visibleNotifications.length === 0 ? (
                          <div className="px-4 py-5">
                            <p className="text-sm text-[var(--text-secondary)]">Nenhuma atualização pendente no momento.</p>
                            <p className="mt-1 text-xs text-[var(--text-muted)]">
                              Quando surgir algo importante sobre sua conta, assinatura ou agenda, isso aparece aqui.
                            </p>
                          </div>
                        ) : (
                          <div className="max-h-[calc(100vh-11rem)] overflow-y-auto p-2 md:max-h-[26rem]">
                            {unreadNotifications.length > 0 && (
                              <div className="px-2 pb-2 pt-1">
                                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[var(--text-muted)]">Novas</p>
                              </div>
                            )}
                            {unreadNotifications.map((notification) => (
                              <div key={notification.id} className="app-surface-subtle mb-2 rounded-2xl px-3 py-3">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                  <button
                                    type="button"
                                    onClick={() => handleNotificationClick(notification)}
                                    className="min-w-0 flex-1 text-left"
                                  >
                                    <div className="flex items-center gap-2">
                                      <span
                                        className={cn(
                                          'inline-flex size-2 rounded-full',
                                          notification.tone === 'error'
                                            ? 'bg-[color:var(--danger-soft)]'
                                            : notification.tone === 'warning'
                                              ? 'bg-[color:var(--danger-soft)]'
                                              : notification.tone === 'success'
                                                ? 'bg-[var(--primary)]'
                                                : 'bg-[var(--primary)]'
                                        )}
                                      />
                                      <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{notification.title}</p>
                                    </div>
                                    <p className="mt-1 text-sm leading-relaxed text-[var(--text-secondary)]">{notification.message}</p>
                                  </button>
                                  <div className="flex shrink-0 items-center justify-between gap-2 sm:flex-col sm:items-end sm:justify-start">
                                    {notification.timestamp && (
                                      <span className="text-[11px] text-[var(--text-muted)]">{notification.timestamp}</span>
                                    )}
                                    <div className="flex items-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() => markNotificationAsRead(notification.id)}
                                        className="rounded-lg p-1.5 text-[var(--text-secondary)] transition hover:bg-[var(--bg-surface-elevated)] hover:text-[var(--text-primary)]"
                                        aria-label="Marcar como lida"
                                      >
                                        <CheckCircle2 size={14} />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => deleteNotification(notification.id)}
                                        className="rounded-lg p-1.5 text-[var(--text-secondary)] transition hover:bg-[var(--bg-surface-elevated)] hover:text-[var(--danger)]"
                                        aria-label="Apagar notificação"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}

                            {readNotifications.length > 0 && (
                              <div className="px-2 pb-2 pt-2">
                                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[var(--text-muted)]">Lidas</p>
                              </div>
                            )}
                            {readNotifications.map((notification) => (
                              <div
                                key={notification.id}
                                className="mb-2 rounded-2xl border border-transparent px-3 py-3 opacity-75 transition hover:border-[var(--border-default)] hover:bg-[var(--bg-surface)] hover:opacity-100"
                              >
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                  <button
                                    type="button"
                                    onClick={() => handleNotificationClick(notification)}
                                    className="min-w-0 flex-1 text-left"
                                  >
                                    <div className="flex items-center gap-2">
                                      <span
                                        className={cn(
                                          'inline-flex size-2 rounded-full',
                                          notification.tone === 'error'
                                            ? 'bg-[var(--bg-surface-elevated)]'
                                            : notification.tone === 'warning'
                                              ? 'bg-[color:var(--danger-soft)]/70'
                                              : notification.tone === 'success'
                                                ? 'bg-[color:var(--primary-soft)]'
                                                : 'bg-[var(--primary)]/70'
                                        )}
                                      />
                                      <p className="truncate text-sm font-medium text-[var(--text-primary)]">{notification.title}</p>
                                    </div>
                                    <p className="mt-1 text-sm leading-relaxed text-[var(--text-secondary)]">{notification.message}</p>
                                  </button>
                                  <div className="flex shrink-0 items-center justify-between gap-2 sm:flex-col sm:items-end sm:justify-start">
                                    {notification.timestamp && (
                                      <span className="text-[11px] text-[var(--text-muted)]">{notification.timestamp}</span>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => deleteNotification(notification.id)}
                                      className="rounded-lg p-1.5 text-[var(--text-secondary)] transition hover:bg-[var(--bg-surface-elevated)] hover:text-[var(--danger)]"
                                      aria-label="Apagar notificação"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

            <div className="relative">
              <button
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                className="size-10 rounded-full bg-[var(--bg-surface-elevated)] border border-[var(--border-default)] overflow-hidden cursor-pointer hover:border-[var(--primary)] transition-all flex items-center justify-center group"
              >
                <UserAvatar
                  user={user}
                  className="size-full"
                  fallbackClassName="border border-[color:var(--border-default)]"
                  textClassName="text-sm"
                />
              </button>

              <AnimatePresence>
                {isProfileMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsProfileMenuOpen(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="theme-modal-surface absolute right-0 mt-2 w-64 rounded-2xl shadow-2xl z-50 overflow-hidden"
                    >
                      <div className="p-4 border-b border-[var(--border-default)]">
                        <div className="flex items-center gap-3">
                          <UserAvatar
                            user={user}
                            className="size-12 border border-[var(--border-default)] bg-[var(--bg-surface-elevated)]"
                            fallbackClassName="border border-[color:var(--border-default)]"
                            textClassName="text-base"
                          />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-[var(--text-primary)]">{getUserDisplayName(user)}</p>
                            <p className="truncate text-xs text-[var(--text-muted)]">{user.email}</p>
                          </div>
                        </div>
                        <div
                          className={cn(
                            'mt-3 inline-block rounded border px-2 py-0.5',
                            isFreePlan
                              ? 'bg-[var(--bg-surface-elevated)]/10 border-[var(--border-strong)]/20'
                              : 'bg-[color:var(--primary-soft)] border-[color:var(--border-default)]'
                          )}
                        >
                          <span
                            className={cn(
                              'text-[10px] font-black uppercase tracking-widest',
                              isFreePlan ? 'text-[var(--text-secondary)]' : 'text-[var(--text-secondary)]'
                            )}
                          >
                            Plano {planLabel}
                          </span>
                        </div>
                      </div>
                      <div className="p-2">
                        <button
                          onClick={() => {
                            navigateToTab('settings');
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] transition-all"
                        >
                          <Settings size={16} /> Configurações
                        </button>
                        <button
                          onClick={() => {
                            handleManageSubscription();
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] transition-all"
                        >
                          <CreditCard size={16} /> Assinatura
                        </button>
                        <div className="h-px bg-[var(--bg-surface-elevated)] my-2" />
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[var(--danger)] hover:bg-[var(--bg-surface)] transition-all"
                        >
                          <LogOut size={16} /> Sair
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
        </header>

          <div className="border-b border-[var(--border-default)] bg-[color:color-mix(in_srgb,var(--bg-primary)_92%,var(--bg-secondary))] px-3 py-3 md:hidden">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Conta ativa</span>
                <button
                  onClick={handleOpenCreateWorkspaceModal}
                  className="app-surface-subtle rounded-lg px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)] transition-colors hover:border-[color:var(--border-default)] hover:text-[var(--text-primary)]"
                >
                  + Conta
                </button>
              </div>
              {workspaces.length > 0 && (
                <select
                  value={activeWorkspaceId || ''}
                  onChange={(event) => {
                    const nextWorkspaceId = event.target.value;
                    if (!nextWorkspaceId || nextWorkspaceId === activeWorkspaceId) return;
                    setActiveWorkspaceId(nextWorkspaceId);
                  }}
                  className="app-field w-full rounded-xl px-3 py-3 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
                >
                  {workspaces.map((workspace) => (
                    <option key={workspace.id} value={workspace.id}>
                      {workspace.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

        <div
          className={cn(
            'flex-1 bg-[radial-gradient(circle_at_top,color-mix(in_srgb,var(--accent)_16%,transparent)_0%,transparent_36%),linear-gradient(180deg,var(--bg-app)_0%,var(--bg-app-secondary)_100%)] p-3 sm:p-5 lg:p-8 xl:p-10',
            isTransactionModalOpen ? 'overflow-y-hidden' : 'overflow-y-auto custom-scrollbar'
          )}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'dashboard' && (
                <DashboardPageContainer>
                  <DashboardView
                      overview={dashboardOverview}
                      loading={dashboardOverviewLoading}
                      error={dashboardOverviewError}
                      currentPlan={currentPlan}
                      goals={goals}
                      wallets={wallets}
                      investments={investments}
                      onAddTransaction={handleOpenCreateTransaction}
                      onUpgrade={() => void handleUpgrade('Pro Mensal')}
                      onOpenSummaryTarget={handleDashboardOpenSummaryTarget}
                      onPeriodChange={handleDashboardPeriodChange}
                      onOpenGoals={() => navigateToTab('goals')}
                      onOpenPortfolio={() => navigateToTab('portfolio')}
                      onOpenCreateGoal={() => {
                        navigateToTab('goals');
                        handleOpenCreateGoal();
                      }}
                      onOpenCreateWallet={() => {
                        navigateToTab('portfolio');
                        handleOpenCreateWalletModal();
                      }}
                      onOpenTransactions={handleDashboardOpenTransactions}
                      onOpenTransactionDetail={handleDashboardOpenTransactionDetail}
                      onOpenAssistant={() => openAssistantWithPrompt()}
                      onSendAssistantPrompt={openAssistantWithPrompt}
                    />
                </DashboardPageContainer>
              )}
              {activeTab === 'transactions' && (
                <TransactionsContainer>
                  <TransactionsView
                    transactions={transactions}
                    onAddTransaction={handleOpenCreateTransaction}
                    onEditTransaction={handleStartEditTransaction}
                    onDeleteTransaction={handleDeleteTransaction}
                    initialFlowFilter={transactionsInitialFlowFilter}
                  />
                </TransactionsContainer>
              )}
              {activeTab === 'goals' && (
                <GoalsContainer>
                  <GoalsView
                    goals={goals}
                    onAddGoal={handleOpenCreateGoal}
                    onEditGoal={handleStartEditGoal}
                    onDeleteGoal={handleDeleteGoal}
                    formatCurrency={formatCurrency}
                  />
                </GoalsContainer>
              )}
              {activeTab === 'debts' && (
                <DebtsContainer>
                  <DebtsView
                    debts={debts}
                    recurringDebts={recurringDebts}
                    transactions={transactions}
                    dashboardProjection={dashboardProjection}
                    onAddDebt={handleOpenCreateDebt}
                    onAddRecurringDebt={handleOpenCreateRecurringDebt}
                    onDuplicateRecurringDebt={handleDuplicateRecurringDebt}
                    onEditDebt={handleStartEditDebt}
                    onRegisterDebtPayment={handleRegisterDebtPayment}
                    onSettleDebt={handleSettleDebt}
                    onReopenDebt={handleReopenDebt}
                    onDeleteDebt={handleDeleteDebt}
                    onEditRecurringDebt={handleStartEditRecurringDebt}
                    onToggleRecurringDebtStatus={handleToggleRecurringDebtStatus}
                    onDeleteRecurringDebt={handleDeleteRecurringDebt}
                  />
                </DebtsContainer>
              )}
              {activeTab === 'investments' && (
                <InvestmentsContainer>
                  <InvestmentsView
                    investments={investments}
                    onAddInvestment={handleOpenCreateInvestment}
                    onEditInvestment={handleStartEditInvestment}
                    onDeleteInvestment={handleDeleteInvestment}
                    formatCurrency={formatCurrency}
                  />
                </InvestmentsContainer>
              )}
              {activeTab === 'portfolio' && (
                <PortfolioView
                  wallets={wallets}
                  investments={investments}
                  debts={debts}
                  recurringDebts={recurringDebts}
                  transactions={transactions}
                  totalBalance={totalBalance}
                  currentPlan={currentPlan}
                  onAddWallet={handleOpenCreateWalletModal}
                  onTransferBalance={(walletName) => {
                    const sourceWallet = walletName ?? wallets[0]?.name ?? '';
                    const destinationWallet =
                      wallets.find((wallet) => wallet.name !== sourceWallet)?.name ?? '';

                    navigateToTab('transactions');
                    handleOpenCreateTransaction({
                      flowType: 'Transferência',
                      wallet: sourceWallet,
                      destinationWallet,
                      category: getDefaultCategoryForFlow('Transferência'),
                      paymentMethod: getDefaultPaymentMethodForFlow('Transferência'),
                    });
                  }}
                  onAddInvestment={() => {
                    navigateToTab('investments');
                    handleOpenCreateInvestment();
                  }}
                  onAddDebt={() => {
                    navigateToTab('debts');
                    handleOpenCreateDebt();
                  }}
                  onViewWalletHistory={() => {
                    navigateToTab('transactions');
                  }}
                  onAdjustWalletBalance={(walletName) => {
                    navigateToTab('transactions');
                    handleOpenCreateTransaction({
                      flowType: 'Entrada',
                      wallet: walletName ?? wallets[0]?.name ?? '',
                      category: getDefaultCategoryForFlow('Entrada'),
                      paymentMethod: getDefaultPaymentMethodForFlow('Entrada'),
                      description: 'Ajuste de saldo',
                    });
                  }}
                  onDeleteWallet={handleRequestDeleteWallet}
                  onOpenInvestments={() => navigateToTab('investments')}
                  onOpenDebts={() => navigateToTab('debts')}
                  onOpenReports={() => navigateToTab('reports')}
                  onUpgrade={() => void handleUpgrade('Pro Mensal')}
                  actionFeedback={portfolioFeedback}
                  onDismissFeedback={() => setPortfolioFeedback(null)}
                />
              )}
              {activeTab === 'agenda' && (
                <CalendarContainer>
                  <FinancialCalendarView
                    currentPlan={currentPlan}
                    activeWorkspaceId={activeWorkspaceId}
                    getAuthHeaders={getAuthHeaders}
                    onUpgrade={() => void handleUpgrade('Pro Mensal')}
                    onNavigateTab={(tab) => navigateToTab(tab)}
                  />
                </CalendarContainer>
              )}
              {activeTab === 'reports' && (
                <ReportsView
                  transactions={transactions}
                  totalBalance={totalBalance}
                  projection={dashboardProjection}
                  reportOverview={reportsOverview}
                  goals={goals}
                  onExportPDF={handleExportPDF}
                  onExportCSV={handleExportCSV}
                  onBeforeUseAI={consumeAiQuota}
                  getApiHeaders={getAuthHeaders}
                  accessLevel={reportAccessLevel}
                  currentPlan={currentPlan}
                  onUpgrade={() => void handleUpgrade('Pro Mensal')}
                />
              )}
              {activeTab === 'assistant' && (
                <AssistantTabView onOpenAssistant={() => setIsAssistantOpen(true)} />
              )}
              {activeTab === 'integrations' && (
                <IntegrationsView
                  onUpgrade={() => void handleUpgrade('Pro Mensal')}
                  currentPlan={currentPlan}
                  isWhatsAppConnected={isWhatsAppConnected}
                  isConnectingWhatsApp={isConnectingWhatsApp}
                  isDisconnectingWhatsApp={isDisconnectingWhatsApp}
                  isSendingWhatsAppTest={isSendingWhatsAppTest}
                  whatsAppPhoneNumber={workspaceWhatsAppPhoneNumber}
                  whatsAppFeedback={whatsAppFeedback}
                  whatsAppDiagnostic={whatsAppDiagnostic}
                  onWhatsAppPhoneNumberChange={setWorkspaceWhatsAppPhoneNumber}
                  onConnectWhatsApp={handleConnectWhatsApp}
                  onDisconnectWhatsApp={handleDisconnectWhatsApp}
                  onSendWhatsAppTest={handleSendWhatsAppTest}
                />
              )}

              {activeTab === 'subscription' && (
                <SubscriptionView
                  summary={subscriptionSummary}
                  isLoading={isSubscriptionLoading}
                  error={subscriptionError}
                  onRetry={() => void fetchSubscriptionData()}
                  onChangePlan={handleChangePlan}
                  onCancel={() => void handleSubscriptionAction('cancel')}
                  onReactivate={() => void handleSubscriptionAction('reactivate')}
                  onOpenPaymentMethod={() => void openStripePortal('payment')}
                  onOpenBillingHistory={() => void openStripePortal('history')}
                  actionLoading={subscriptionActionLoading}
                />
              )}

              {activeTab === 'settings' && (
                <SettingsContainer>
                <div className="max-w-3xl space-y-6 animate-in fade-in duration-500">
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="page-title-premium text-[var(--text-primary)]">Configurações</h3>
                    <button
                      onClick={() => navigateToTab('integrations')}
                      className="app-button-secondary px-3 py-2 rounded-xl text-xs font-bold transition-all"
                    >
                      Abrir WhatsApp
                    </button>
                  </div>

                  <div className="app-surface-card rounded-2xl p-6 space-y-4">
                    <h4 className="label-premium text-[var(--text-primary)]">Perfil</h4>
                    <div className="flex flex-col gap-4 md:flex-row md:items-center">
                      <UserAvatar
                        user={user}
                        displayName={settingsName}
                        avatarUrl={settingsAvatarUrl}
                        className="size-20 border border-[var(--border-default)] bg-[var(--bg-surface-elevated)]"
                        fallbackClassName="border border-[color:var(--border-default)]"
                        textClassName="text-2xl"
                      />
                      <div className="flex-1 space-y-2">
                        <div>
                          <label className="label-premium text-[var(--text-muted)]">
                            Foto de perfil
                          </label>
                          <p className="mt-2 text-xs text-[var(--text-muted)]">
                            PNG, JPG ou WEBP de até 5 MB. A imagem é ajustada automaticamente para avatar.
                          </p>
                        </div>
                        <input
                          ref={avatarInputRef}
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/jpg"
                          onChange={handleAvatarFileChange}
                          className="hidden"
                        />
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <button
                            type="button"
                            onClick={() => avatarInputRef.current?.click()}
                            disabled={isAvatarProcessing}
                            className="app-button-secondary inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isAvatarProcessing ? 'Processando foto...' : 'Enviar foto'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSettingsAvatarUrl('');
                              setSettingsSavedAt('Foto removida. Clique em salvar alterações para concluir.');
                            }}
                            disabled={!settingsAvatarUrl || isAvatarProcessing}
                            className="inline-flex items-center justify-center rounded-xl border border-[var(--border-default)] px-4 py-2 text-sm font-bold text-[var(--text-secondary)] transition-all hover:border-[var(--border-strong)] hover:text-[var(--danger)] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Remover foto
                          </button>
                        </div>
                        <p className="text-xs text-[var(--text-muted)]">
                          Se não houver foto, o sistema mostra automaticamente as iniciais do usuário.
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="label-premium text-[var(--text-muted)]">Nome</label>
                        <input
                          type="text"
                          value={settingsName}
                          onChange={(e) => setSettingsName(e.target.value)}
                          className="app-field w-full rounded-xl py-2 px-4 text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="label-premium text-[var(--text-muted)]">E-mail</label>
                        <input
                          type="email"
                          value={settingsEmail}
                          onChange={(e) => setSettingsEmail(e.target.value)}
                          className="app-field w-full rounded-xl py-2 px-4 text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="app-surface-card rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <h4 className="label-premium mb-2 text-[var(--text-primary)]">Plano atual</h4>
                      <div
                        className={cn(
                          'inline-flex items-center gap-2 px-3 py-1 rounded-full border',
                          isFreePlan
                            ? 'bg-[var(--bg-surface-elevated)]/10 border-[var(--border-strong)]/20'
                            : 'bg-[color:var(--primary-soft)] border-[color:var(--border-default)]'
                        )}
                      >
                        <span
                          className={cn(
                            'text-[10px] font-black uppercase tracking-widest',
                            isFreePlan ? 'text-[var(--text-secondary)]' : 'text-[var(--text-secondary)]'
                          )}
                        >
                          {planLabel}
                        </span>
                        <span className="text-xs text-[var(--text-secondary)]">Ativo</span>
                      </div>
                      {isFreePlan && (
                        <p className="mt-2 text-xs text-[var(--text-secondary)]">
                          {currentMonthTransactionCount}/{FREE_TRANSACTION_LIMIT_PER_MONTH} transações no mês - IA{' '}
                          {aiUsageCount}/{FREE_AI_LIMIT_PER_MONTH}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        if (isFreePlan) {
                          void handleUpgrade('Pro Mensal');
                          return;
                        }
                        handleManageSubscription();
                      }}
                      className="app-button-secondary px-4 py-2 rounded-xl text-sm font-bold transition-all"
                    >
                      {isFreePlan ? 'Fazer upgrade' : 'Gerenciar assinatura'}
                    </button>
                  </div>

                  <div className="app-surface-card rounded-2xl p-6 space-y-4">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="label-premium text-[var(--text-primary)]">
                        Atividade da conta
                      </h4>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                        {workspaceEvents.length} eventos
                      </span>
                    </div>
                    {workspaceEvents.length === 0 ? (
                      <p className="text-sm text-[var(--text-secondary)]">
                        Nenhum evento recente encontrado para esta conta.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {workspaceEvents.slice(0, 8).map((event) => (
                          <div
                            key={event.id}
                            className="app-surface-subtle rounded-xl px-3 py-2 flex items-center justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-[var(--text-primary)] truncate">
                                {getWorkspaceEventLabel(event.type)}
                              </p>
                              <p className="text-[11px] text-[var(--text-muted)]">
                                {event.user_id ? `Usuário: ${event.user_id.slice(0, 8)}...` : 'Sistema'}
                              </p>
                            </div>
                            <span className="text-[11px] text-[var(--text-muted)] whitespace-nowrap">
                              {formatEventTimestamp(event.created_at)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="app-surface-card rounded-2xl border border-[color:var(--border-default)] p-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="space-y-2">
                        <h4 className="label-premium text-[var(--danger)]">Zona de risco</h4>
                        <p className="text-sm font-semibold text-[var(--text-primary)]">Excluir conta atual</p>
                        <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
                          Essa ação é irreversível e remove carteiras, transações, metas, dívidas, investimentos e eventos
                          desta conta.
                        </p>
                        {!canDeleteActiveWorkspace && (
                          <p className="text-xs text-[var(--text-muted)]">
                            {workspaces.length <= 1
                              ? 'Crie outra conta antes de excluir a atual.'
                              : 'Somente o proprietário da conta pode excluir esta conta.'}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        disabled={!canDeleteActiveWorkspace || isDeletingWorkspace}
                        onClick={handleOpenDeleteWorkspaceModal}
                        className="inline-flex items-center justify-center rounded-xl border border-[var(--border-default)] bg-[color:var(--danger-soft)] px-4 py-2 text-sm font-bold text-[var(--danger)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Excluir conta
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="text-xs text-[var(--text-muted)] min-h-4">{settingsSavedAt || ''}</div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleLogout}
                        className="px-4 py-2 rounded-xl bg-[var(--bg-app)] border border-[var(--border-default)] text-sm font-bold text-[var(--danger)] hover:bg-[var(--bg-surface)] transition-all"
                      >
                        Sair
                      </button>
                      <button
                        onClick={handleSaveSettings}
                        disabled={isAvatarProcessing}
                        className="px-4 py-2 rounded-xl bg-[var(--primary)] text-[var(--text-primary)] text-sm font-bold hover:bg-[var(--primary-hover)] transition-all disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Salvar alterações
                      </button>
                    </div>
                  </div>
                </div>
                </SettingsContainer>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Assistant Panel */}
      <AnimatePresence>
        {isAssistantOpen && (
          <motion.aside
            id="ai-assistant"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 right-0 z-[120] w-full sm:w-[420px] flex flex-col border-l border-[var(--border-default)] bg-[linear-gradient(180deg,var(--bg-app-secondary)_0%,var(--bg-app)_100%)] backdrop-blur-xl shadow-2xl"
          >
            <div className="p-6 border-b border-[var(--border-default)] flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="size-2 rounded-full bg-[var(--primary)] shadow-[0_0_0_4px_color-mix(in_srgb,var(--primary)_22%,transparent)] animate-pulse" />
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--primary)]">Assistente Cote</h3>
                  {isWhatsAppConnected && (
                    <div className="flex items-center gap-1 ml-2 px-1.5 py-0.5 rounded border border-[color:color-mix(in_srgb,var(--whatsapp)_40%,transparent)] bg-[var(--whatsapp-soft)]">
                      <MessageSquare size={8} className="text-[var(--whatsapp)]" />
                      <span className="text-[8px] font-black text-[var(--whatsapp)] uppercase tracking-widest">WhatsApp Ativo</span>
                    </div>
                  )}
                </div>
                <p className="text-xs text-[var(--text-secondary)]">Pergunte qualquer coisa sobre suas finanças</p>
              </div>
              <button onClick={() => setIsAssistantOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
              {!hasUserMessages && (
                <div className="space-y-2">
                  <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest">Sugestões</p>
                  <div className="flex flex-wrap gap-2">
                    {ASSISTANT_SUGGESTIONS.map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => void handleSendMessage(suggestion)}
                        disabled={isLoading || isSubmittingAudio || isRecordingAudio}
                        className="px-2.5 py-1.5 rounded-lg bg-[color:var(--primary-soft)] border border-[color:color-mix(in_srgb,var(--primary)_35%,transparent)] text-[11px] text-[var(--primary)] hover:text-[var(--text-primary)] hover:bg-[color:color-mix(in_srgb,var(--primary-soft)_70%,var(--bg-surface-elevated))] transition-all disabled:opacity-50"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg, i) => (
                <div key={i} className={cn('space-y-2', msg.role === 'user' ? 'flex flex-col items-end' : '')}>
                  <div
                    className={cn(
                      'p-4 rounded-2xl max-w-[90%]',
                      msg.role === 'user'
                        ? 'bg-[var(--primary)] border border-[color:color-mix(in_srgb,var(--primary)_55%,transparent)] text-[var(--text-primary)] rounded-tr-none shadow-[0_10px_24px_color-mix(in_srgb,var(--primary)_28%,transparent)]'
                        : 'bg-[var(--bg-surface-elevated)] border border-[var(--border-default)] text-[var(--text-primary)] rounded-tl-none'
                    )}
                  >
                    {msg.role === 'model' && i > 0 && (
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="text-[var(--primary)]" size={14} />
                        <span className="text-[10px] font-black text-[var(--primary)] uppercase tracking-widest">Análise Cote</span>
                      </div>
                    )}
                    {msg.role === 'model' ? (
                      <div className="space-y-3">
                        {renderAssistantMessageText(msg.text)}
                        {msg.audioUrl && (
                          <audio
                            controls
                            preload="none"
                            src={msg.audioUrl}
                            className="w-full h-9 rounded-lg"
                          />
                        )}
                      </div>
                    ) : (
                      <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.text}</p>
                    )}
                  </div>
                  <span className={cn('text-[10px] text-[var(--text-secondary)] font-bold', msg.role === 'user' ? 'mr-1' : 'ml-1')}>
                    {msg.time}
                  </span>
                </div>
              ))}

              {isLoading && (
                <div className="flex items-center gap-2 text-[var(--primary)] text-[10px] font-bold uppercase tracking-widest animate-pulse">
                  <Sparkles size={12} /> Cote está pensando...
                </div>
              )}
            </div>

            <div className="p-4 border-t border-[var(--border-default)]">
              <div className="relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      void handleSendMessage();
                    }
                  }}
                  placeholder="Digite uma mensagem..."
                  disabled={isLoading || isSubmittingAudio || isRecordingAudio}
                  className="w-full bg-[var(--bg-surface-elevated)] border border-[var(--border-default)] rounded-xl py-3 pl-4 pr-20 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)] focus:shadow-[0_0_0_2px_color-mix(in_srgb,var(--primary)_25%,transparent)] transition-all disabled:opacity-50"
                />
                <button
                  onClick={toggleAssistantAudioRecording}
                  disabled={!isRecordingAudio && (isLoading || isSubmittingAudio)}
                  className={cn(
                    'absolute right-10 top-1/2 -translate-y-1/2 inline-flex size-7 items-center justify-center rounded-lg transition-colors disabled:opacity-50',
                    isRecordingAudio
                      ? 'bg-[var(--danger-soft)] text-[var(--danger)] hover:bg-[color:color-mix(in_srgb,var(--danger-soft)_75%,var(--bg-surface-elevated))]'
                      : 'bg-[var(--bg-surface-muted)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  )}
                  title={isRecordingAudio ? 'Parar gravação' : 'Gravar áudio'}
                >
                  {isRecordingAudio ? <StopCircle size={14} /> : <Mic size={14} />}
                </button>
                <button
                  onClick={() => void handleSendMessage()}
                  disabled={isLoading || isSubmittingAudio || isRecordingAudio}
                  className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex size-7 items-center justify-center rounded-lg bg-[var(--primary)] text-[var(--text-primary)] hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-50"
                >
                  <Send size={16} />
                </button>
              </div>
              {isRecordingAudio && (
                <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-[var(--danger)]">
                  Gravando audio... toque no icone para enviar.
                </p>
              )}
              {isSubmittingAudio && !isRecordingAudio && (
                <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-[var(--primary)]">
                  Enviando audio para o assistente...
                </p>
              )}

              {isFreePlan && (
                <div className="mt-3 flex items-center justify-between gap-2">
                  <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest">
                    IA Free: {aiUsageCount}/{FREE_AI_LIMIT_PER_MONTH}
                  </p>
                  {aiLimitReached && (
                    <button
                      onClick={() => openUpgradeLimitModal('ai')}
                      className="text-[10px] font-black uppercase tracking-widest text-[var(--primary)] hover:text-[var(--primary-hover)] transition-colors"
                    >
                      Desbloquear IA
                    </button>
                  )}
                </div>
              )}

              <div className="mt-4 flex items-center justify-center gap-2 text-[10px] text-[var(--whatsapp)] font-bold uppercase tracking-widest">
                <Smartphone size={10} />
                Integrado com WhatsApp
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

        {!isAssistantOpen && (
          <button
            onClick={() => setIsAssistantOpen(true)}
            className="fixed bottom-8 right-8 size-14 bg-[var(--primary)] text-[var(--text-primary)] rounded-full border border-[color:color-mix(in_srgb,var(--primary)_55%,transparent)] shadow-2xl shadow-[color:var(--primary-soft)] flex items-center justify-center hover:scale-110 hover:bg-[var(--primary-hover)] transition-all z-50"
          >
            <MessageSquare size={24} />
          </button>
        )}
      </div>
    </AppErrorBoundary>
  );
}

