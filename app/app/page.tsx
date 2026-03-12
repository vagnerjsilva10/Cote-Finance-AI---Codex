'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  LayoutDashboard,
  ReceiptText,
  Target,
  TrendingUp,
  PieChart,
  Sparkles,
  Settings,
  Calendar,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  ShoppingCart,
  Cloud,
  Home,
  Send,
  Bell,
  Search,
  ExternalLink,
  CheckCircle2,
  MessageSquare,
  Plus,
  LogOut,
  Smartphone,
  X,
  Menu,
  Trash2,
  Pencil,
  Download,
  FileText,
  CreditCard,
  User as UserIcon,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
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
import { supabase } from '@/lib/supabase';
import { getCheckoutPath, parseCheckoutPlanLabel } from '@/lib/billing/plans';

// --- Types ---

type LucideIcon = React.ComponentType<{ size?: number; className?: string }>;
const DEFAULT_WHATSAPP_NUMBER = '+551199999999';

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

type TransactionFlowType = 'Receita' | 'Despesa' | 'Transferência';
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
  remainingAmount: string;
  interestRateMonthly: string;
  dueDay: string;
  category: string;
  status: 'Ativa' | 'Quitada';
};

type InvestmentFormData = {
  name: string;
  type: string;
  institution: string;
  invested: string;
  current: string;
  expectedReturnAnnual: string;
};

type Transaction = {
  id: string | number;
  date: string;
  desc: string;
  cat: string;
  amount: string; // "-R$ 2.500,00" / "+R$ 8.500,00"
  type: 'income' | 'expense' | 'transfer';
  flowType: TransactionFlowType;
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
  color: string; // className ex: 'text-emerald-500'
};

type Investment = {
  id: string | number;
  label: string;
  type: string;
  institution: string;
  value: number; // valor atual
  invested: number; // valor total investido
  expectedReturnAnnual: number;
  color: string; // className ex: 'bg-emerald-500'
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
  category: string;
  status: 'Ativa' | 'Quitada';
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
  phoneNumberId?: string | null;
};

type WhatsAppDiagnostic = {
  templateConfigured: string | null;
  connectTemplateConfigured: string | null;
  idiomaConfigurado: string;
  destinoTeste: string | null;
  numeroConectado: string | null;
  phoneNumberId: string | null;
  validationResult: 'OK' | 'ERRO';
  validationIssues: string[];
  configSources?: {
    connectTemplateName: string;
    digestTemplateName: string;
    templateLanguage: string;
    testPhoneNumber: string;
  };
  metaResult?: string | WhatsAppMetaDiagnostic | null;
};

const FREE_TRANSACTION_LIMIT_PER_MONTH = 20;
const FREE_AI_LIMIT_PER_MONTH = 20;
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
      message: `Suas despesas subiram ${variation}% em relação ao mês anterior. Vale revisar onde o caixa acelerou.`,
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

        context.fillStyle = '#020617';
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
  'Receita',
  'Despesa',
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
  'Marketing',
  'Investimentos',
  'PIX',
  'Outros',
  'Auto (IA)',
];

const TRANSACTION_WALLETS = ['Nubank', 'Itaú', 'Santander', 'Bradesco', 'Dinheiro', 'Outros'];

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

const DEBT_CATEGORIES = [
  'Cartão de crédito',
  'Empréstimo',
  'Financiamento',
  'Cheque especial',
  'Outros',
];

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
  flowType: 'Despesa',
  category: 'Alimentação',
  paymentMethod: 'PIX',
  wallet: TRANSACTION_WALLETS[0],
  destinationWallet: '',
  receiptUrl: null,
  date: new Date().toISOString().split('T')[0],
});

const getInvestmentColor = (type: string) => {
  const colorMap: Record<string, string> = {
    'Renda fixa': 'bg-emerald-500',
    'Renda variável': 'bg-blue-500',
    Tesouro: 'bg-cyan-500',
    CDB: 'bg-teal-500',
    'LCI/LCA': 'bg-lime-500',
    'Ações': 'bg-amber-500',
    Fundos: 'bg-violet-500',
    Cripto: 'bg-rose-500',
    Outros: 'bg-slate-500',
  };

  return colorMap[type] || 'bg-slate-500';
};

const mapFlowTypeToBaseType = (flowType: TransactionFlowType): 'income' | 'expense' | 'transfer' => {
  if (flowType === 'Receita') return 'income';
  if (flowType === 'Despesa') return 'expense';
  return 'transfer';
};

const mapFlowTypeToBackendType = (flowType: TransactionFlowType) => {
  if (flowType === 'Receita') return 'INCOME';
  if (flowType === 'Despesa') return 'EXPENSE';
  return 'TRANSFER';
};

const mapBackendTypeToFlowType = (rawType: string): TransactionFlowType => {
  if (rawType === 'INCOME' || rawType === 'PIX_IN') return 'Receita';
  if (rawType === 'EXPENSE' || rawType === 'PIX_OUT') return 'Despesa';
  if (rawType === 'TRANSFER') return 'Transferência';
  if (rawType === 'income') return 'Receita';
  if (rawType === 'expense') return 'Despesa';
  return 'Despesa';
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
    normalized === 'TRANSFERÊNCIA BANCÁRIA'
  ) {
    return 'Transferência bancária';
  }
  if (normalized === 'BOLETO') return 'Boleto';
  if (normalized === 'DEBIT' || normalized === 'DEBITO' || normalized === 'DÉBITO') return 'Débito';
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
  if (flowType === 'Receita') return ArrowUpRight;
  if (flowType === 'Transferência') return Workflow;
  return ArrowDownRight;
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
    'workspace.created': 'Workspace criado',
    'onboarding.completed': 'Onboarding concluído',
    'workspace.whatsapp.connected': 'WhatsApp conectado',
    'workspace.whatsapp.disconnected': 'WhatsApp desconectado',
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
    'transaction.deleted': 'Uma movimentação foi removida do histórico deste workspace.',
    'workspace.created': 'Seu espaço financeiro foi criado e está pronto para uso.',
    'onboarding.completed': 'Sua configuração inicial foi concluída com sucesso.',
    'workspace.whatsapp.connected': 'Os alertas no WhatsApp deste workspace foram ativados.',
    'workspace.whatsapp.disconnected': 'O envio de alertas no WhatsApp foi desativado.',
    'stripe.checkout.created': 'O fluxo de assinatura foi iniciado e aguarda a sua confirmação.',
    'stripe.portal.created': 'A área de gerenciamento da assinatura foi aberta.',
    'stripe.customer.subscription.created': 'Sua assinatura foi criada e está sendo preparada para uso.',
    'stripe.customer.subscription.updated': 'Houve uma atualização recente na sua assinatura.',
    'stripe.customer.subscription.deleted': 'Sua assinatura foi encerrada neste workspace.',
    'stripe.invoice.paid': 'Recebemos a confirmação do pagamento da sua assinatura.',
    'stripe.invoice.payment_failed': 'A última tentativa de cobrança não foi concluída.',
    'ai.chat.used': 'Uma análise com IA foi gerada para este workspace.',
    'ai.classify.used': 'Uma classificação automática foi aplicada em uma movimentação.',
  };

  return messages[event.type] || 'Uma atualização recente foi registrada neste workspace.';
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
    desc: String(tx.description || ''),
    cat: tx.category?.name || 'Geral',
    amount: formatTransactionDisplayAmount(flowType, Number(tx.amount || 0)),
    type: mapFlowTypeToBaseType(flowType),
    paymentMethod: normalizePaymentMethodLabel(
      tx.payment_method || (tx.type === 'PIX_IN' || tx.type === 'PIX_OUT' ? 'PIX' : undefined)
    ),
    wallet: tx.wallet?.name || 'Carteira',
    destinationWallet: tx.destination_wallet?.name || null,
    receiptUrl: tx.receipt_url || null,
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
          <strong key={`assistant-strong-${index}`} className="font-semibold text-white">
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
              <span className="text-emerald-400 font-bold">{orderedItem[1]}.</span>
              <p className="text-sm text-slate-200 leading-relaxed break-words">
                {renderInlineAssistantText(orderedItem[2])}
              </p>
            </div>
          );
        }

        return (
          <p key={`assistant-line-${lineIndex}`} className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap break-words">
            {renderInlineAssistantText(trimmed)}
          </p>
        );
      })}
    </div>
  );
};

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
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center">
            <h2 className="text-xl font-bold text-white mb-2">Erro na interface</h2>
            <p className="text-sm text-slate-400 mb-5">
              Ocorreu uma falha inesperada de renderização. Recarregue a página para continuar.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-lg bg-emerald-500 text-white text-sm font-bold hover:bg-emerald-600 transition-colors"
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
            'flex h-full w-full items-center justify-center bg-emerald-500/20 font-bold text-emerald-300',
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
};

const SidebarItem = ({ icon: Icon, label, active = false, onClick, collapsed = false }: SidebarItemProps) => (
  <button
    onClick={onClick}
    title={collapsed ? label : undefined}
    className={cn(
      'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-all duration-200 group',
      collapsed && 'justify-center px-2',
      active
        ? 'bg-emerald-500/10 text-emerald-500 font-medium'
        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
    )}
  >
    <Icon
      size={20}
      className={cn(active ? 'text-emerald-500' : 'text-slate-500 group-hover:text-slate-300')}
    />
    {!collapsed && <span className="text-sm">{label}</span>}
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
}: StatCardProps) => (
  <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl hover:border-slate-700 transition-colors group relative overflow-hidden">
    <div className="flex items-center justify-between mb-4">
      <span className="text-slate-400 text-sm font-medium">{label}</span>
      <div
        className={cn(
          'p-2 rounded-lg',
          trendType === 'up'
            ? 'bg-emerald-500/10 text-emerald-500'
            : 'bg-rose-500/10 text-rose-500'
        )}
      >
        <Icon size={18} />
      </div>
    </div>
    <div className="flex flex-col gap-1">
      <p className="text-2xl font-bold tracking-tight text-white">{value}</p>
      <div
        className={cn(
          'text-sm font-semibold flex items-center gap-1',
          trendType === 'up' ? 'text-emerald-500' : 'text-rose-500'
        )}
      >
        {trendType === 'up' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
        {trendValue} <span className="text-slate-500 font-normal ml-1">{trend}</span>
      </div>
    </div>
    <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
      <Icon size={100} />
    </div>
  </div>
);

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
      ? 'border-amber-400/20 bg-amber-500/10 text-amber-100'
      : summary?.status === 'CANCELED'
        ? 'border-rose-400/20 bg-rose-500/10 text-rose-100'
        : summary?.status === 'TRIALING'
          ? 'border-cyan-400/20 bg-cyan-500/10 text-cyan-100'
          : 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100';

  return (
    <div className="max-w-6xl space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-emerald-200">
            <Sparkles size={14} />
            Billing interno
          </span>
          <div>
            <h3 className="text-2xl font-black text-white">Minha assinatura</h3>
            <p className="text-sm text-slate-400">
              Gerencie seu plano, cobrança e status da assinatura sem sair do Cote Finance AI.
            </p>
          </div>
        </div>
        <button
          onClick={onChangePlan}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-400"
        >
          <ArrowUpRight size={16} />
          {summary?.primaryActionLabel || 'Alterar plano'}
        </button>
      </div>

      {isLoading ? (
        <div className="rounded-[1.75rem] border border-slate-800 bg-slate-900/60 p-8 text-center">
          <p className="text-base font-semibold text-white">Carregando assinatura...</p>
          <p className="mt-2 text-sm text-slate-400">
            Estamos sincronizando o status do workspace e a cobrança atual.
          </p>
        </div>
      ) : error ? (
        <div className="rounded-[1.75rem] border border-rose-400/20 bg-rose-500/10 p-6">
          <p className="text-sm font-bold uppercase tracking-[0.24em] text-rose-200">Falha ao carregar</p>
          <p className="mt-3 text-sm text-slate-100">{error}</p>
          <button
            onClick={onRetry}
            className="mt-4 inline-flex items-center justify-center rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/5"
          >
            Tentar novamente
          </button>
        </div>
      ) : summary ? (
        <>
          <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-4 rounded-[1.9rem] border border-slate-800 bg-slate-900/60 p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                  <span className={cn('inline-flex w-fit rounded-full border px-3 py-1 text-xs font-bold', statusTone)}>
                    {summary.statusLabel}
                  </span>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Plano atual</p>
                    <h4 className="mt-2 text-3xl font-black text-white">{summary.planLabel}</h4>
                    <p className="mt-2 max-w-2xl text-sm text-slate-300">{summary.statusMessage}</p>
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Próxima cobrança</p>
                  <p className="mt-2 text-lg font-semibold text-white">{formatSubscriptionDate(summary.nextBillingDate)}</p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Status da assinatura</p>
                  <p className="mt-2 text-lg font-semibold text-white">{summary.statusLabel}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Cobrança</p>
                  <p className="mt-2 text-lg font-semibold text-white">{summary.billingLabel}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Workspace vinculado</p>
                  <p className="mt-2 text-lg font-semibold text-white">{summary.workspaceName}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4 rounded-[1.9rem] border border-slate-800 bg-slate-900/60 p-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Resumo rápido</p>
                <h4 className="mt-2 text-xl font-black text-white">Central de assinatura</h4>
                <p className="mt-2 text-sm text-slate-400">
                  Tudo o que importa para este workspace fica visível aqui. Quando uma ação exigir a Stripe,
                  abrimos apenas a etapa necessária.
                </p>
              </div>

              <div className="space-y-3 rounded-[1.4rem] border border-emerald-500/15 bg-emerald-500/8 p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 size={18} className="mt-0.5 text-emerald-300" />
                  <div>
                    <p className="text-sm font-semibold text-white">Pagamento seguro</p>
                    <p className="mt-1 text-sm text-slate-300">
                      Seus dados continuam protegidos pela Stripe e sincronizados com o billing do workspace.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CreditCard size={18} className="mt-0.5 text-emerald-300" />
                  <div>
                    <p className="text-sm font-semibold text-white">Gestão sem sair do app</p>
                    <p className="mt-1 text-sm text-slate-300">
                      Status, plano e próximas cobranças aparecem dentro do SaaS. Portal externo só quando preciso.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-[1.75rem] border border-slate-800 bg-slate-900/60 p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Recursos do plano</p>
                  <h4 className="mt-2 text-xl font-black text-white">Benefícios ativos</h4>
                </div>
                <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-semibold text-slate-300">
                  {summary.planLabel}
                </span>
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {summary.features.map((feature) => (
                  <div key={feature} className="rounded-2xl border border-white/10 bg-slate-950/55 p-4 text-sm text-slate-200">
                    {feature}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-slate-800 bg-slate-900/60 p-6">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Ações disponíveis</p>
              <h4 className="mt-2 text-xl font-black text-white">Gerenciar assinatura</h4>
              <div className="mt-5 space-y-3">
                <button
                  onClick={onChangePlan}
                  className="inline-flex w-full items-center justify-between rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-left text-sm font-semibold text-white transition hover:border-emerald-500/30 hover:bg-slate-900"
                >
                  <span>{summary.primaryActionLabel || 'Alterar plano'}</span>
                  <ArrowUpRight size={16} className="text-emerald-300" />
                </button>
                <button
                  onClick={onCancel}
                  disabled={!summary.canCancel || actionLoading !== null}
                  className="inline-flex w-full items-center justify-between rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-left text-sm font-semibold text-white transition hover:border-rose-400/30 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span>{actionLoading === 'cancel' ? 'Cancelando...' : 'Cancelar assinatura'}</span>
                </button>
                <button
                  onClick={onReactivate}
                  disabled={!summary.canReactivate || actionLoading !== null}
                  className="inline-flex w-full items-center justify-between rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-left text-sm font-semibold text-white transition hover:border-emerald-400/30 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span>{actionLoading === 'reactivate' ? 'Reativando...' : 'Reativar assinatura'}</span>
                </button>
                <button
                  onClick={onOpenPaymentMethod}
                  disabled={!summary.canManageBilling || actionLoading !== null}
                  className="inline-flex w-full items-center justify-between rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-left text-sm font-semibold text-white transition hover:border-white/20 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span>{actionLoading === 'payment' ? 'Abrindo...' : 'Atualizar forma de pagamento'}</span>
                  <ExternalLink size={16} className="text-slate-400" />
                </button>
                <button
                  onClick={onOpenBillingHistory}
                  disabled={!summary.canManageBilling || actionLoading !== null}
                  className="inline-flex w-full items-center justify-between rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-left text-sm font-semibold text-white transition hover:border-white/20 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span>{actionLoading === 'history' ? 'Abrindo...' : 'Ver histórico de cobrança'}</span>
                  <ExternalLink size={16} className="text-slate-400" />
                </button>
              </div>

              {summary.cancelAtPeriodEnd ? (
                <p className="mt-4 text-sm text-amber-200">
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
  transactions: Transaction[];
  insights: string[];
  onAddTransaction: () => void;
  currentPlan: SubscriptionPlan;
  onUpgrade: () => void;
};

const DashboardView = ({ transactions, insights, onAddTransaction, currentPlan, onUpgrade }: DashboardViewProps) => {
  const now = React.useMemo(() => new Date(), []);
  const enrichedTransactions = React.useMemo(
    () =>
      transactions.map((tx) => ({
        ...tx,
        parsedDate: parseTransactionDate(tx.date),
      })),
    [transactions]
  );

  const currentMonthTransactions = React.useMemo(
    () =>
      enrichedTransactions.filter((tx) => {
        if (!tx.parsedDate) return false;
        return (
          tx.parsedDate.getMonth() === now.getMonth() &&
          tx.parsedDate.getFullYear() === now.getFullYear()
        );
      }),
    [enrichedTransactions, now]
  );

  const monthIncome = currentMonthTransactions
    .filter((tx) => tx.type === 'income')
    .reduce((acc, tx) => acc + parseCurrency(tx.amount), 0);

  const monthExpenses = currentMonthTransactions
    .filter((tx) => tx.type === 'expense')
    .reduce((acc, tx) => acc + parseCurrency(tx.amount), 0);

  const monthBalance = monthIncome - monthExpenses;
  const savingsRate = monthIncome > 0 ? (monthBalance / monthIncome) * 100 : 0;

  const expenseByCategory = currentMonthTransactions.reduce((acc, tx) => {
    if (tx.type !== 'expense') return acc;
    const category = tx.cat || 'Sem categoria';
    acc.set(category, (acc.get(category) || 0) + parseCurrency(tx.amount));
    return acc;
  }, new Map<string, number>());

  const largestExpenseEntry = [...expenseByCategory.entries()].sort((a, b) => b[1] - a[1])[0];

  const chartData = React.useMemo(() => {
    const months = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
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
  }, [enrichedTransactions, now]);

  const recentTransactions = React.useMemo(
    () =>
      [...enrichedTransactions]
        .sort((a, b) => (b.parsedDate?.getTime() ?? 0) - (a.parsedDate?.getTime() ?? 0))
        .slice(0, 8),
    [enrichedTransactions]
  );

  const monthLabel = now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-white">Visão Geral</h3>
          <p className="text-sm text-slate-400 capitalize">Resumo de {monthLabel}</p>
        </div>
        <button
          onClick={onAddTransaction}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 text-white text-sm font-bold hover:bg-emerald-600 transition-colors"
        >
          <Plus size={16} /> Nova Transação
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          label="Entradas do mês"
          value={formatCurrency(monthIncome)}
          trend="transações de entrada"
          trendValue={`${currentMonthTransactions.filter((tx) => tx.type === 'income').length}`}
          icon={TrendingUp}
        />
        <StatCard
          label="Despesas do mês"
          value={formatCurrency(monthExpenses)}
          trend="transações de saída"
          trendValue={`${currentMonthTransactions.filter((tx) => tx.type === 'expense').length}`}
          icon={ShoppingCart}
          trendType="down"
        />
        <StatCard
          label="Saldo do mês"
          value={formatCurrency(monthBalance)}
          trend="entradas - despesas"
          trendValue={monthBalance >= 0 ? 'Positivo' : 'Negativo'}
          icon={Wallet}
          trendType={monthBalance >= 0 ? 'up' : 'down'}
        />
        <StatCard
          label="Taxa de economia"
          value={`${savingsRate.toFixed(1)}%`}
          trend="(entradas - despesas) / entradas"
          trendValue="mês atual"
          icon={Target}
          trendType={savingsRate >= 0 ? 'up' : 'down'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-900/50 border border-slate-800 p-6 rounded-2xl">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-white">Receitas vs Despesas</h3>
            <p className="text-sm text-slate-400">Últimos 6 meses</p>
          </div>

          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis
                  stroke="#64748b"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => formatCurrency(Number(value || 0))}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #1e293b',
                    borderRadius: '12px',
                  }}
                  formatter={(value, name) => [
                    formatCurrency(Number(value || 0)),
                    name === 'income' ? 'Receitas' : 'Despesas',
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="income"
                  name="income"
                  stroke="#10b981"
                  strokeWidth={3}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="expense"
                  name="expense"
                  stroke="#f43f5e"
                  strokeWidth={3}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="theme-report-card bg-slate-900/50 border border-slate-800 p-6 rounded-2xl">
          <h3 className="text-lg font-bold text-white mb-6">Insights do mês</h3>
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-800 bg-slate-800/30 p-4">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
                Maior gasto do mês
              </p>
              <p className="text-sm font-semibold text-white">
                {largestExpenseEntry
                  ? `${largestExpenseEntry[0]} (${formatCurrency(largestExpenseEntry[1])})`
                  : 'Sem despesas no mês atual'}
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-800/30 p-4">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
                Resumo do mês
              </p>
              <p className="text-sm text-slate-200">
                Você gastou <span className="font-bold text-rose-400">{formatCurrency(monthExpenses)}</span>{' '}
                em{' '}
                <span className="font-bold text-white">
                  {currentMonthTransactions.filter((tx) => tx.type === 'expense').length}
                </span>{' '}
                transações.
              </p>
            </div>

            {currentPlan === 'FREE' ? (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                <p className="text-xs font-bold uppercase tracking-widest text-emerald-400 mb-2">
                  Disponível no Pro
                </p>
                <p className="text-sm text-emerald-100/90 leading-relaxed">
                  Receba insights financeiros automáticos com base no seu histórico para identificar padrões,
                  desperdícios e oportunidades de ajuste.
                </p>
                <button
                  type="button"
                  onClick={onUpgrade}
                  className="mt-4 inline-flex items-center justify-center rounded-xl bg-emerald-500 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-emerald-400"
                >
                  Liberar insights automáticos
                </button>
              </div>
            ) : (
              insights.map((insight, index) => (
                <div
                  key={`${index}-${insight.slice(0, 24)}`}
                  className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4"
                >
                  <p className="text-xs font-bold uppercase tracking-widest text-emerald-400 mb-2">
                    Insight automático
                  </p>
                  <p className="text-sm text-emerald-100/90">{insight}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="theme-table-surface bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Últimas transações</h3>
          <span className="text-xs text-slate-500 uppercase tracking-widest">
            {recentTransactions.length} registros
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-left">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-800/30">
                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-widest">
                  Categoria
                </th>
                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-widest">
                  Descrição
                </th>
                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-widest">
                  Data
                </th>
                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">
                  Valor
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {recentTransactions.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-sm text-slate-500">
                    Nenhuma transação encontrada.
                  </td>
                </tr>
              )}
              {recentTransactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4 text-sm text-slate-300">{tx.cat || 'Sem categoria'}</td>
                  <td className="px-6 py-4 text-sm font-medium text-white">{tx.desc}</td>
                  <td className="px-6 py-4 text-sm text-slate-400">{tx.date}</td>
                  <td
                    className={cn(
                      'px-6 py-4 text-sm font-bold text-right',
                      tx.type === 'income'
                        ? 'text-emerald-500'
                        : tx.type === 'expense'
                          ? 'text-rose-500'
                          : 'text-cyan-400'
                    )}
                  >
                    {tx.amount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

type TransactionsViewProps = {
  transactions: Transaction[];
  onAddTransaction: () => void;
  onEditTransaction: (id: string | number) => void;
  onDeleteTransaction: (id: string | number) => void;
};

const TransactionsView = ({
  transactions,
  onAddTransaction,
  onEditTransaction,
  onDeleteTransaction,
}: TransactionsViewProps) => {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [typeFilter, setTypeFilter] = React.useState<'Todos' | TransactionFlowType>('Todos');

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
        <h3 className="text-xl font-bold text-white">Transações</h3>
        <button
          onClick={onAddTransaction}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 text-white text-sm font-bold hover:bg-emerald-600 transition-colors"
        >
          <Plus size={18} /> Nova Transação
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5">
          <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-2">Entradas totais</p>
          <p className="text-2xl font-black text-emerald-500">{formatCurrency(totalIncome)}</p>
        </div>
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5">
          <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-2">Saídas totais</p>
          <p className="text-2xl font-black text-rose-500">{formatCurrency(totalExpenses)}</p>
        </div>
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5">
          <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-2">Saldo</p>
          <p className={cn('text-2xl font-black', balance >= 0 ? 'text-emerald-500' : 'text-rose-500')}>
            {formatCurrency(balance)}
          </p>
        </div>
      </div>

      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 lg:p-5">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="lg:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por descrição"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as 'Todos' | TransactionFlowType)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 px-4 text-sm text-white focus:outline-none focus:border-emerald-500"
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
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 text-center text-slate-500 text-sm">
            Nenhuma transação encontrada para os filtros atuais.
          </div>
        )}

        {filteredTransactions.map((tx) => {
          const baseType = mapFlowTypeToBaseType(tx.flowType);

          return (
            <div key={tx.id} className="bg-slate-900/50 border border-slate-800 p-4 rounded-2xl space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">{tx.desc}</p>
                  <p className="text-xs text-slate-500">{tx.date}</p>
                </div>
                <p
                  className={cn(
                    'text-sm font-bold',
                    baseType === 'income'
                      ? 'text-emerald-500'
                      : baseType === 'expense'
                        ? 'text-rose-500'
                        : 'text-cyan-400'
                  )}
                >
                  {tx.amount}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2 py-1 rounded-md bg-slate-800 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                  {tx.flowType}
                </span>
                <span className="px-2 py-1 rounded-md bg-slate-800 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                  {tx.cat || 'Sem categoria'}
                </span>
                <span className="px-2 py-1 rounded-md bg-slate-800 text-slate-300 text-[10px] font-bold uppercase tracking-wider">
                  {getPaymentMethodIconLabel(tx.paymentMethod)}
                </span>
                <span className="text-[10px] text-emerald-500/80 font-bold uppercase tracking-widest flex items-center gap-1">
                  <Wallet size={10} /> {tx.wallet}
                </span>
                {tx.flowType === 'Transferência' && tx.destinationWallet && (
                  <span className="text-[10px] text-cyan-400/80 font-bold uppercase tracking-widest">
                    ? {tx.destinationWallet}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => onEditTransaction(tx.id)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-slate-800 text-slate-300 hover:text-white transition-colors"
                >
                  <Pencil size={12} /> Editar
                </button>
                <button
                  onClick={() => onDeleteTransaction(tx.id)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-colors"
                >
                  <Trash2 size={12} /> Excluir
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="theme-table-surface hidden lg:block bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-800/30">
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Data</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Descrição</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Tipo</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Categoria</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Método</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Carteira</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Valor</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {filteredTransactions.length === 0 && (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-sm text-slate-500">
                  Nenhuma transação encontrada para os filtros atuais.
                </td>
              </tr>
            )}

            {filteredTransactions.map((tx) => {
              const baseType = mapFlowTypeToBaseType(tx.flowType);

              return (
                <tr key={tx.id} className="hover:bg-slate-800/30 transition-colors group">
                  <td className="px-6 py-4 text-sm text-slate-400">{tx.date}</td>
                  <td className="px-6 py-4 text-sm font-medium text-white">{tx.desc}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 rounded-md bg-slate-800 text-slate-300 text-[10px] font-bold uppercase tracking-wider">
                      {tx.flowType}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-300">{tx.cat || 'Sem categoria'}</td>
                  <td className="px-6 py-4 text-xs text-slate-300">{tx.paymentMethod}</td>
                  <td className="px-6 py-4 text-xs text-slate-400">
                    {tx.wallet}
                    {tx.flowType === 'Transferência' && tx.destinationWallet ? ` -> ${tx.destinationWallet}` : ''}
                  </td>
                  <td
                    className={cn(
                      'px-6 py-4 text-sm font-bold text-right',
                      baseType === 'income'
                        ? 'text-emerald-500'
                        : baseType === 'expense'
                          ? 'text-rose-500'
                          : 'text-cyan-400'
                    )}
                  >
                    {tx.amount}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => onEditTransaction(tx.id)}
                        className="p-2 text-slate-400 hover:text-white transition-colors"
                        title="Editar"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => onDeleteTransaction(tx.id)}
                        className="p-2 text-slate-500 hover:text-rose-500 transition-colors"
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
  isSendingWhatsAppTest: boolean;
  isSavingWhatsAppConfig: boolean;
  whatsAppPhoneNumber: string;
  whatsAppTestPhoneNumber: string;
  whatsAppConnectTemplateName: string;
  whatsAppDigestTemplateName: string;
  whatsAppTemplateLanguage: string;
  whatsAppFeedback: WhatsAppFeedback;
  whatsAppDiagnostic: WhatsAppDiagnostic | null;
  onWhatsAppPhoneNumberChange: (value: string) => void;
  onWhatsAppTestPhoneNumberChange: (value: string) => void;
  onWhatsAppConnectTemplateNameChange: (value: string) => void;
  onWhatsAppDigestTemplateNameChange: (value: string) => void;
  onWhatsAppTemplateLanguageChange: (value: string) => void;
  onSaveWhatsAppConfig: () => void;
  onRunWhatsAppDiagnostic: () => void;
  onConnectWhatsApp: () => void;
  onDisconnectWhatsApp: () => void;
  onSendWhatsAppTest: () => void;
};

const IntegrationsView = ({
  onUpgrade,
  currentPlan,
  isWhatsAppConnected,
  isConnectingWhatsApp,
  isSendingWhatsAppTest,
  isSavingWhatsAppConfig,
  whatsAppPhoneNumber,
  whatsAppTestPhoneNumber,
  whatsAppConnectTemplateName,
  whatsAppDigestTemplateName,
  whatsAppTemplateLanguage,
  whatsAppFeedback,
  whatsAppDiagnostic,
  onWhatsAppPhoneNumberChange,
  onWhatsAppTestPhoneNumberChange,
  onWhatsAppConnectTemplateNameChange,
  onWhatsAppDigestTemplateNameChange,
  onWhatsAppTemplateLanguageChange,
  onSaveWhatsAppConfig,
  onRunWhatsAppDiagnostic,
  onConnectWhatsApp,
  onDisconnectWhatsApp,
  onSendWhatsAppTest,
}: IntegrationsViewProps) => {
  const [billingCycle, setBillingCycle] = React.useState<'monthly' | 'annually'>('monthly');
  const [showAdvancedWhatsAppSettings, setShowAdvancedWhatsAppSettings] = React.useState(false);
  const [showWhatsAppConnectionDetails, setShowWhatsAppConnectionDetails] = React.useState(false);
  const hasWhatsAppAccess = currentPlan !== 'FREE';
  const hasWhatsAppValidationIssues = Boolean(
    whatsAppDiagnostic &&
      (whatsAppDiagnostic.validationIssues.length > 0 || whatsAppDiagnostic.validationResult === 'ERRO')
  );

  const plans = [
    {
      name: 'Pro',
      monthlyPrice: 29,
      annualPrice: 290,
      features: [
        'Lançamentos ilimitados',
        'Análises inteligentes com IA',
        'Relatórios completos e gráficos avançados',
        'Insights financeiros automáticos',
        'Metas ilimitadas',
        'Investimentos',
        'Alertas e resumos no WhatsApp',
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
        'Suporte prioritário',
      ],
    },
  ];

  const feedbackToneClass =
    whatsAppFeedback?.tone === 'success'
      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100'
      : whatsAppFeedback?.tone === 'error'
      ? 'border-rose-500/30 bg-rose-500/10 text-rose-100'
      : 'border-slate-700 bg-slate-900/80 text-slate-200';

  return (
    <div
      className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500"
      id="whatsapp-integration"
    >
      <div className="flex flex-col items-center space-y-6">
        <div className="flex items-center rounded-xl border border-slate-800 bg-slate-900 p-1">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={cn(
              'rounded-lg px-6 py-2 text-sm font-bold transition-all',
              billingCycle === 'monthly' ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-400'
            )}
          >
            Mensal
          </button>
          <button
            onClick={() => setBillingCycle('annually')}
            className={cn(
              'rounded-lg px-6 py-2 text-sm font-bold transition-all',
              billingCycle === 'annually' ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-400'
            )}
          >
            Anual <span className="ml-1 text-[10px] opacity-70">(2 meses grátis)</span>
          </button>
        </div>

        <div className="grid w-full max-w-4xl grid-cols-1 gap-6 md:grid-cols-2">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className="relative rounded-3xl border border-slate-800 bg-slate-900/50 p-8 transition-all duration-300 hover:border-slate-700"
            >
              <h3 className="mb-2 text-xl font-bold text-white">{plan.name}</h3>
              <div className="mb-6 flex items-baseline gap-1">
                <span className="text-4xl font-black text-white">
                  R$ {billingCycle === 'monthly' ? plan.monthlyPrice : plan.annualPrice}
                </span>
                <span className="text-sm text-slate-500">/{billingCycle === 'monthly' ? 'mês' : 'ano'}</span>
              </div>
              <button
                onClick={() => onUpgrade(`${plan.name} ${billingCycle === 'monthly' ? 'Mensal' : 'Anual'}`)}
                className="mb-8 w-full rounded-2xl bg-emerald-500 py-4 font-bold text-white shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-600"
              >
                Escolher {plan.name}
              </button>
              <ul className="space-y-4">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-3 text-sm text-slate-400">
                    <CheckCircle2 size={16} className="text-emerald-500" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-6 lg:p-8">
        <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-500">
              <MessageSquare size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Integração com WhatsApp</h3>
              <p className="text-sm text-slate-500">Alertas e resumos automáticos direto no seu celular</p>
            </div>
          </div>
          <div
            className={cn(
              'flex items-center gap-2 self-start rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest lg:self-center',
              hasWhatsAppAccess
                ? isWhatsAppConnected
                  ? 'bg-emerald-500/10 text-emerald-500'
                  : 'bg-rose-500/10 text-rose-500'
                : 'bg-amber-500/10 text-amber-300'
            )}
          >
            <div
              className={cn(
                'size-1.5 rounded-full animate-pulse',
                hasWhatsAppAccess ? (isWhatsAppConnected ? 'bg-emerald-500' : 'bg-rose-500') : 'bg-amber-300'
              )}
            />
            {hasWhatsAppAccess ? (isWhatsAppConnected ? 'Conectado' : 'Desconectado') : 'Disponível no Pro'}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
          <div className="space-y-6">
            {!hasWhatsAppAccess ? (
              <div className="space-y-5 rounded-3xl border border-amber-500/20 bg-amber-500/5 p-6">
                <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">
                  Recurso Pro
                </div>
                <p className="leading-relaxed text-slate-300">
                  Alertas e resumos no WhatsApp ficam disponíveis a partir do plano Pro. Use esse canal para receber
                  lembretes financeiros e acompanhar o que merece atenção sem abrir o app.
                </p>
                <ul className="space-y-3 text-sm text-slate-300">
                  {[
                    'Resumo diário com saldo, entradas e saídas',
                    'Alertas de vencimentos e compromissos próximos',
                    'Teste de envio e configuração por workspace',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <CheckCircle2 size={16} className="mt-0.5 text-amber-300" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => onUpgrade(`Pro ${billingCycle === 'monthly' ? 'Mensal' : 'Anual'}`)}
                  className="inline-flex items-center justify-center rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-600"
                >
                  Liberar WhatsApp no Pro
                </button>
              </div>
            ) : (
              <>
                <p className="leading-relaxed text-slate-400">
                  Receba resumos financeiros e alertas importantes no WhatsApp deste workspace sem depender de e-mail ou
                  planilhas paralelas.
                </p>

                <div className="space-y-4">
                  {[
                    'Informe o número que vai receber os avisos',
                    'Conecte o WhatsApp deste workspace',
                    'Envie um teste e confirme que a mensagem chegou',
                  ].map((step, index) => (
                    <div key={index} className="flex items-start gap-4">
                      <div className="flex size-6 flex-shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-slate-500">
                        {index + 1}
                      </div>
                      <p className="text-sm text-slate-300">{step}</p>
                    </div>
                  ))}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500">
                      Número do WhatsApp do workspace
                    </label>
                    <input
                      type="tel"
                      value={whatsAppPhoneNumber}
                      onChange={(e) => onWhatsAppPhoneNumberChange(e.target.value)}
                      placeholder="+55 (11) 99999-9999"
                      className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white transition-all focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500">
                      Número para teste
                    </label>
                    <input
                      type="tel"
                      value={whatsAppTestPhoneNumber}
                      onChange={(e) => onWhatsAppTestPhoneNumberChange(e.target.value)}
                      placeholder="+55 (11) 99999-9999"
                      className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white transition-all focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500">
                      Status da configuração
                    </label>
                    <div className="flex min-h-[52px] items-center rounded-xl border border-slate-800 bg-slate-950/60 px-4 text-sm text-slate-300">
                      {hasWhatsAppValidationIssues
                        ? 'Há um ajuste pendente antes do envio.'
                        : isWhatsAppConnected
                        ? 'Configuração pronta para envio.'
                        : 'Preencha os números e conecte quando quiser ativar.'}
                    </div>
                  </div>
                </div>

                {whatsAppFeedback && (
                  <div className={cn('rounded-2xl border px-4 py-3', feedbackToneClass)}>
                    <p className="text-sm font-bold">{whatsAppFeedback.title}</p>
                    <p className="mt-1 text-sm leading-relaxed opacity-90">{whatsAppFeedback.message}</p>
                  </div>
                )}

                {hasWhatsAppValidationIssues && whatsAppDiagnostic?.validationIssues.length ? (
                  <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
                    <p className="text-sm font-bold text-amber-200">Revisão necessária</p>
                    <ul className="mt-2 space-y-2 text-sm text-amber-100/90">
                      {whatsAppDiagnostic.validationIssues.map((issue) => (
                        <li key={issue}>{issue}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <div className="flex flex-col gap-4">
                  <div className="grid gap-3 sm:grid-cols-4">
                    <button
                      onClick={onSaveWhatsAppConfig}
                      disabled={isSavingWhatsAppConfig}
                      className={cn(
                        'flex items-center justify-center gap-2 rounded-xl border px-5 py-3 text-sm font-bold transition-all',
                        isSavingWhatsAppConfig
                          ? 'cursor-not-allowed border-slate-800 bg-slate-900 text-slate-500'
                          : 'border-slate-700 bg-slate-900/70 text-slate-200 hover:border-emerald-500/50 hover:text-white'
                      )}
                    >
                      {isSavingWhatsAppConfig ? 'Salvando...' : 'Salvar números'}
                    </button>

                    <button
                      onClick={onConnectWhatsApp}
                      disabled={isConnectingWhatsApp || !whatsAppPhoneNumber.trim()}
                      className={cn(
                        'flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold transition-all shadow-lg',
                        isConnectingWhatsApp || !whatsAppPhoneNumber.trim()
                          ? 'cursor-not-allowed bg-slate-800 text-slate-500'
                          : 'bg-emerald-500 text-white shadow-emerald-500/20 hover:bg-emerald-600'
                      )}
                    >
                      {isConnectingWhatsApp ? 'Conectando...' : isWhatsAppConnected ? 'Reconectar' : 'Conectar'}
                    </button>

                    <button
                      onClick={onSendWhatsAppTest}
                      disabled={isSendingWhatsAppTest}
                      className={cn(
                        'flex items-center justify-center gap-2 rounded-xl border px-5 py-3 text-sm font-bold transition-all',
                        isSendingWhatsAppTest
                          ? 'cursor-not-allowed border-slate-800 bg-slate-900 text-slate-500'
                          : 'border-slate-700 bg-slate-900/70 text-slate-200 hover:border-emerald-500/50 hover:text-white'
                      )}
                    >
                      {isSendingWhatsAppTest ? 'Enviando teste...' : 'Testar envio'}
                    </button>

                    <button
                      onClick={onDisconnectWhatsApp}
                      disabled={!isWhatsAppConnected}
                      className={cn(
                        'flex items-center justify-center gap-2 rounded-xl border px-5 py-3 text-sm font-bold transition-all',
                        !isWhatsAppConnected
                          ? 'cursor-not-allowed border-slate-800 bg-slate-900 text-slate-500'
                          : 'border-rose-500/20 bg-rose-500/10 text-rose-300 hover:bg-rose-500 hover:text-white'
                      )}
                    >
                      Desconectar
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setShowAdvancedWhatsAppSettings((current) => !current)}
                      className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500 transition-colors hover:text-slate-300"
                    >
                      {showAdvancedWhatsAppSettings ? 'Ocultar ajustes avançados' : 'Mostrar ajustes avançados'}
                    </button>
                    {(hasWhatsAppValidationIssues || whatsAppDiagnostic?.metaResult) && (
                      <button
                        type="button"
                        onClick={() => setShowWhatsAppConnectionDetails((current) => !current)}
                        className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500 transition-colors hover:text-slate-300"
                      >
                        {showWhatsAppConnectionDetails ? 'Ocultar detalhes da conexão' : 'Ver detalhes da conexão'}
                      </button>
                    )}
                  </div>
                </div>

                {showAdvancedWhatsAppSettings && (
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                    <div className="mb-4">
                      <p className="text-sm font-bold text-slate-200">Ajustes avançados</p>
                      <p className="mt-1 text-sm leading-relaxed text-slate-500">
                        Use este bloco apenas se você precisar revisar templates ou idioma do WhatsApp.
                      </p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-slate-500">
                          Template de conexão
                        </label>
                        <input
                          type="text"
                          value={whatsAppConnectTemplateName}
                          onChange={(e) => onWhatsAppConnectTemplateNameChange(e.target.value)}
                          placeholder="cote_connect_success"
                          className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white transition-all focus:border-emerald-500 focus:outline-none"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-slate-500">
                          Idioma do template
                        </label>
                        <input
                          type="text"
                          value={whatsAppTemplateLanguage}
                          onChange={(e) => onWhatsAppTemplateLanguageChange(e.target.value)}
                          placeholder="pt_BR"
                          className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white transition-all focus:border-emerald-500 focus:outline-none"
                        />
                      </div>

                      <div className="space-y-2 sm:col-span-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-slate-500">
                          Template de resumo
                        </label>
                        <input
                          type="text"
                          value={whatsAppDigestTemplateName}
                          onChange={(e) => onWhatsAppDigestTemplateNameChange(e.target.value)}
                          placeholder="cote_daily_digest"
                          className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white transition-all focus:border-emerald-500 focus:outline-none"
                        />
                      </div>

                      <button
                        onClick={onSaveWhatsAppConfig}
                        disabled={isSavingWhatsAppConfig}
                        className={cn(
                          'flex items-center justify-center gap-2 rounded-xl border px-5 py-3 text-sm font-bold transition-all sm:col-span-1',
                          isSavingWhatsAppConfig
                            ? 'cursor-not-allowed border-slate-800 bg-slate-900 text-slate-500'
                            : 'border-slate-700 bg-slate-900/70 text-slate-200 hover:border-emerald-500/50 hover:text-white'
                        )}
                      >
                        {isSavingWhatsAppConfig ? 'Salvando...' : 'Salvar ajustes'}
                      </button>

                      <button
                        onClick={onRunWhatsAppDiagnostic}
                        className="flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900/70 px-5 py-3 text-sm font-bold text-slate-200 transition-all hover:border-emerald-500/50 hover:text-white sm:col-span-1"
                      >
                        Validar configuração
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-950/45 p-6 shadow-[0_18px_60px_rgba(2,6,23,0.28)]">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-500">WhatsApp</p>
                <h4 className="mt-2 text-lg font-black text-white">Como o resumo aparece no celular</h4>
              </div>
              <span
                className={cn(
                  'rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em]',
                  isWhatsAppConnected
                    ? 'bg-emerald-500/10 text-emerald-300'
                    : isConnectingWhatsApp
                    ? 'bg-amber-500/10 text-amber-300'
                    : 'bg-slate-800 text-slate-400'
                )}
              >
                {isWhatsAppConnected ? 'Ativo' : isConnectingWhatsApp ? 'Conectando' : 'Aguardando conexão'}
              </span>
            </div>

            <div className="space-y-4 rounded-3xl border border-slate-800 bg-[#0b141a] p-4">
              <div className="ml-auto max-w-[90%] rounded-2xl bg-[#005c4b] px-4 py-3 text-sm leading-relaxed text-white shadow-lg shadow-black/10">
                Quais alertas vou receber no WhatsApp?
              </div>
              <div className="max-w-[90%] rounded-2xl bg-[#202c33] px-4 py-3 text-sm leading-relaxed text-slate-100 shadow-lg shadow-black/10">
                Resumo diário com saldo, entradas, saídas, próximos vencimentos e insights práticos para agir mais rápido.
              </div>
              <div className="max-w-[90%] rounded-2xl bg-[#202c33] px-4 py-3 text-sm leading-relaxed text-slate-100 shadow-lg shadow-black/10">
                Exemplo: <span className="font-semibold text-white">Maior gasto do mês</span>, contas próximas do vencimento e um resumo do que merece atenção no caixa.
              </div>
            </div>

            {showWhatsAppConnectionDetails && whatsAppDiagnostic && (
              <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-900/70">
                <div className="border-b border-slate-800 px-4 py-3 text-sm font-bold text-slate-200">
                  Detalhes da conexão
                </div>
                <div className="p-4">
                  <div className="grid gap-3 text-sm text-slate-300 sm:grid-cols-2">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Template conexão</p>
                      <p className="mt-1 break-all">{whatsAppDiagnostic.connectTemplateConfigured || 'Não configurado'}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Template resumo</p>
                      <p className="mt-1 break-all">{whatsAppDiagnostic.templateConfigured || 'Não configurado'}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Idioma</p>
                      <p className="mt-1">{whatsAppDiagnostic.idiomaConfigurado}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Destino de teste</p>
                      <p className="mt-1 break-all">{whatsAppDiagnostic.destinoTeste || 'Não configurado'}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Número conectado</p>
                      <p className="mt-1 break-all">{whatsAppDiagnostic.numeroConectado || 'Não configurado'}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-2">
                    <span
                      className={cn(
                        'rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em]',
                        whatsAppDiagnostic.validationResult === 'OK'
                          ? 'bg-emerald-500/10 text-emerald-300'
                          : 'bg-rose-500/10 text-rose-300'
                      )}
                    >
                      {whatsAppDiagnostic.validationResult}
                    </span>
                  </div>

                  {whatsAppDiagnostic.validationIssues.length > 0 && (
                    <ul className="mt-4 space-y-2">
                      {whatsAppDiagnostic.validationIssues.map((issue) => (
                        <li key={issue} className="rounded-xl border border-rose-500/20 bg-rose-500/5 px-3 py-2 text-sm text-rose-100">
                          {issue}
                        </li>
                      ))}
                    </ul>
                  )}

                  {whatsAppDiagnostic.metaResult && (
                    <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/80 p-3 text-xs text-slate-400">
                      <p className="font-bold uppercase tracking-[0.18em] text-slate-500">Resultado da Meta</p>
                      <pre className="mt-2 whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-slate-300">
                        {typeof whatsAppDiagnostic.metaResult === 'string'
                          ? whatsAppDiagnostic.metaResult
                          : JSON.stringify(whatsAppDiagnostic.metaResult, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            )}

            <p className="mt-4 text-xs leading-relaxed text-slate-500">
              Depois de conectar, o workspace passa a receber um resumo automático por dia e você ainda pode disparar um teste manual imediatamente.
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

  const groupedBills = React.useMemo(
    () => [
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
    ].filter((group) => group.items.length > 0),
    [upcomingBills]
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-black uppercase tracking-[0.28em] text-emerald-300/80">
            Agenda financeira
          </p>
          <h3 className="text-2xl font-black text-white">Próximos compromissos do seu caixa</h3>
          <p className="max-w-2xl text-sm leading-relaxed text-slate-400">
            Veja o que vence primeiro, o que merece atenção nesta semana e quanto do seu
            caixa já está comprometido nos próximos 30 dias.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 self-start rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-2 text-sm font-semibold text-slate-300">
          <Calendar size={16} className="text-emerald-400" />
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
            className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 shadow-[0_18px_60px_rgba(2,6,23,0.28)]"
          >
            <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-500">{card.label}</p>
            <p className="mt-3 text-2xl font-black text-white">{card.value}</p>
            <p className="mt-2 text-sm text-slate-400">{card.helper}</p>
          </div>
        ))}
      </div>

      {upcomingBills.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-900/45 p-10 text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400">
            <Calendar size={26} />
          </div>
          <h4 className="text-lg font-bold text-white">Sua agenda está limpa por enquanto</h4>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            Adicione dívidas com vencimento ou metas com prazo para acompanhar compromissos sem
            perder o timing do seu caixa.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {groupedBills.map((group) => (
            <section key={group.key} className="rounded-3xl border border-slate-800 bg-slate-900/55 p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h4 className="text-lg font-black text-white">{group.title}</h4>
                  <p className="text-sm text-slate-400">
                    {group.items.length} {group.items.length === 1 ? 'item' : 'itens'} programados
                  </p>
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                {group.items.map((bill) => (
                  <article
                    key={bill.id}
                    className="rounded-2xl border border-slate-800 bg-slate-950/45 p-4 transition-all hover:border-slate-700 hover:bg-slate-950/70"
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
                          <p className="text-base font-bold text-white">{bill.label}</p>
                          <p className="text-sm text-slate-400">{bill.helperText}</p>
                          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs font-semibold text-slate-400">
                            <span className="rounded-full border border-slate-700 px-2.5 py-1">
                              {bill.date}
                            </span>
                            <span
                              className={cn(
                                'rounded-full px-2.5 py-1 font-black uppercase tracking-[0.14em]',
                                bill.status === 'overdue'
                                  ? 'bg-rose-500/12 text-rose-300'
                                  : 'bg-amber-500/10 text-amber-300'
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
                        <p className="text-lg font-black text-white">{formatCurrency(bill.amount)}</p>
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
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
  onAddDebt: () => void;
  onEditDebt: (id: string | number) => void;
  onDeleteDebt: (id: string | number) => void;
};

const DebtsView = ({ debts, onAddDebt, onEditDebt, onDeleteDebt }: DebtsViewProps) => {
  const totalOriginal = debts.reduce((acc, debt) => acc + debt.originalAmount, 0);
  const totalRemaining = debts.reduce((acc, debt) => acc + debt.remainingAmount, 0);
  const totalPaid = totalOriginal - totalRemaining;
  const progress = totalOriginal > 0 ? (totalPaid / totalOriginal) * 100 : 0;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h3 className="text-xl font-bold text-white">Dívidas</h3>
        <button
          onClick={onAddDebt}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 text-white text-sm font-bold hover:bg-emerald-600 transition-colors"
        >
          <Plus size={18} /> Nova Dívida
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="theme-report-card bg-slate-900/50 border border-slate-800 p-6 rounded-2xl">
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-1">Divida Total</p>
          <p className="text-2xl font-black text-white">{formatCurrency(totalRemaining)}</p>
        </div>
        <div className="theme-report-card bg-slate-900/50 border border-slate-800 p-6 rounded-2xl">
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-1">Valor Quitado</p>
          <p className="text-2xl font-black text-emerald-500">{formatCurrency(totalPaid)}</p>
        </div>
        <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl">
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-1">Progresso</p>
          <p className="text-2xl font-black text-white">{progress.toFixed(1)}%</p>
        </div>
      </div>

      <div className="theme-table-surface bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/50">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Credor</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Categoria</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Original</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Restante</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Juros % mês</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Vencimento</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {debts.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-sm text-slate-500">
                    Nenhuma dívida cadastrada.
                  </td>
                </tr>
              )}
              {debts.map((debt) => (
                <tr key={debt.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4 text-sm font-semibold text-white">{debt.creditor}</td>
                  <td className="px-6 py-4 text-sm text-slate-400">{debt.category}</td>
                  <td className="px-6 py-4 text-sm text-slate-300">{formatCurrency(debt.originalAmount)}</td>
                  <td className="px-6 py-4 text-sm font-bold text-white">{formatCurrency(debt.remainingAmount)}</td>
                  <td className="px-6 py-4 text-sm text-slate-300">{debt.interestRateMonthly.toFixed(2)}%</td>
                  <td className="px-6 py-4 text-sm text-slate-300">Dia {debt.dueDay}</td>
                  <td className="px-6 py-4">
                    <span
                      className={cn(
                        'px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-widest',
                        debt.status === 'Quitada'
                          ? 'bg-emerald-500/10 text-emerald-500'
                          : 'bg-amber-500/10 text-amber-500'
                      )}
                    >
                      {debt.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button
                        onClick={() => onEditDebt(debt.id)}
                        className="p-1.5 text-slate-500 hover:text-white transition-colors"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => onDeleteDebt(debt.id)}
                        className="p-1.5 text-slate-600 hover:text-rose-500 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
 // FECHAMENTO CORRETO (isso resolve o erro do parser)

type GoalsViewProps = {
  goals: Goal[];
  onAddGoal: () => void;
  onEditGoal: (id: string | number) => void;
  onDeleteGoal: (id: string | number) => void;
};

const GoalsView = ({ goals, onAddGoal, onEditGoal, onDeleteGoal }: GoalsViewProps) => {
  const totalGoals = goals.length;
  const targetTotal = goals.reduce((acc, goal) => acc + goal.target, 0);
  const accumulatedTotal = goals.reduce((acc, goal) => acc + goal.current, 0);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h3 className="text-xl font-bold text-white">Metas</h3>
        <button
          onClick={onAddGoal}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 text-white text-sm font-bold hover:bg-emerald-600 transition-colors"
        >
          <Plus size={18} /> Nova Meta
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5">
          <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-2">Total de metas</p>
          <p className="text-2xl font-black text-white">{totalGoals}</p>
        </div>
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5">
          <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-2">Meta total</p>
          <p className="text-2xl font-black text-emerald-500">{formatCurrency(targetTotal)}</p>
        </div>
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5">
          <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-2">Valor acumulado</p>
          <p className="text-2xl font-black text-blue-400">{formatCurrency(accumulatedTotal)}</p>
        </div>
      </div>

      <div className="space-y-4">
        {goals.length === 0 && (
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 text-center text-slate-500 text-sm">
            Nenhuma meta cadastrada.
          </div>
        )}

        {goals.map((goal) => {
          const progress = goal.target > 0 ? Math.min(100, (goal.current / goal.target) * 100) : 0;
          const remaining = Math.max(0, goal.target - goal.current);

          return (
            <div key={goal.id} className="bg-slate-900/50 border border-slate-800 p-5 rounded-2xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-white">{goal.name}</h4>
                    <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                      {goal.category}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {goal.deadline ? `Prazo: ${new Date(goal.deadline).toLocaleDateString('pt-BR')}` : 'Sem prazo definido'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onEditGoal(goal.id)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-slate-800 text-slate-300 hover:text-white transition-colors"
                  >
                    <Pencil size={12} /> Editar
                  </button>
                  <button
                    onClick={() => onDeleteGoal(goal.id)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-colors"
                  >
                    <Trash2 size={12} /> Excluir
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="text-slate-300">{formatCurrency(goal.current)} acumulado</span>
                  <span className="text-slate-500">Meta: {formatCurrency(goal.target)}</span>
                  <span className="text-emerald-500 font-bold">{progress.toFixed(1)}%</span>
                </div>

                <p className="text-xs text-slate-500">Faltam {formatCurrency(remaining)} para concluir.</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

type InvestmentsViewProps = {
  investments: Investment[];
  onAddInvestment: () => void;
  onEditInvestment: (id: string | number) => void;
  onDeleteInvestment: (id: string | number) => void;
};

type PortfolioViewProps = {
  wallets: WalletAccount[];
  investments: Investment[];
  debts: Debt[];
  transactions: Transaction[];
  totalBalance: number;
};

const PortfolioView = ({ wallets, investments, debts, transactions, totalBalance }: PortfolioViewProps) => {
  const totalInvested = investments.reduce((acc, investment) => acc + investment.value, 0);
  const activeDebts = debts.filter((debt) => debt.status === 'Ativa');
  const totalDebt = activeDebts.reduce((acc, debt) => acc + debt.remainingAmount, 0);
  const netWorth = totalBalance + totalInvested - totalDebt;

  const assetMix = React.useMemo(
    () =>
      [
        { name: 'Caixa', value: Math.max(totalBalance, 0), color: '#10b981' },
        { name: 'Investimentos', value: Math.max(totalInvested, 0), color: '#3b82f6' },
        { name: 'Dívidas', value: Math.max(totalDebt, 0), color: '#f59e0b' },
      ].filter((item) => item.value > 0),
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

  const topInvestments = React.useMemo(
    () =>
      [...investments]
        .sort((a, b) => b.value - a.value)
        .slice(0, 5)
        .map((investment) => ({
          ...investment,
          profit: investment.value - investment.invested,
          profitPct: investment.invested > 0 ? ((investment.value - investment.invested) / investment.invested) * 100 : 0,
        })),
    [investments]
  );

  const walletActivity = React.useMemo(() => {
    const activityMap = new Map<string, { income: number; expense: number; count: number }>();
    transactions.forEach((transaction) => {
      const walletName = transaction.wallet || 'Sem carteira';
      const parsedAmount = parseCurrency(transaction.amount);
      const absoluteAmount = Math.abs(parsedAmount);
      const current = activityMap.get(walletName) || { income: 0, expense: 0, count: 0 };

      if (transaction.type === 'income') {
        current.income += absoluteAmount;
      } else if (transaction.type === 'expense') {
        current.expense += absoluteAmount;
      }

      current.count += 1;
      activityMap.set(walletName, current);
    });

    return [...activityMap.entries()]
      .map(([walletName, activity]) => ({
        walletName,
        ...activity,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [transactions]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-2">
        <h3 className="text-xl font-bold text-white">Carteira</h3>
        <p className="max-w-3xl text-sm leading-relaxed text-slate-400">
          Acompanhe seu patrimônio consolidado, veja a distribuição entre contas, investimentos e dívidas e entenda
          onde sua carteira está mais concentrada.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5">
          <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-2">Saldo em contas</p>
          <p className="text-2xl font-black text-emerald-500">{formatCurrency(totalBalance)}</p>
        </div>
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5">
          <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-2">Investimentos atuais</p>
          <p className="text-2xl font-black text-blue-400">{formatCurrency(totalInvested)}</p>
        </div>
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5">
          <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-2">Dívidas em aberto</p>
          <p className="text-2xl font-black text-amber-400">{formatCurrency(totalDebt)}</p>
        </div>
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5">
          <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-2">Patrimônio líquido</p>
          <p className={cn('text-2xl font-black', netWorth >= 0 ? 'text-white' : 'text-rose-400')}>
            {formatCurrency(netWorth)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h4 className="text-lg font-bold text-white">Distribuição do patrimônio</h4>
              <p className="text-sm text-slate-500">Visualize a composição da sua carteira neste workspace.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_0.9fr]">
            <div className="h-72">
              {assetMix.length > 0 ? (
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
                        backgroundColor: '#0f172a',
                        borderColor: '#1e293b',
                        borderRadius: 16,
                        color: '#e2e8f0',
                      }}
                    />
                  </RePieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-800 text-sm text-slate-500">
                  Sem dados suficientes para montar a carteira.
                </div>
              )}
            </div>

            <div className="space-y-3">
              {assetMix.map((entry) => {
                const share = assetMix.reduce((acc, item) => acc + item.value, 0) > 0
                  ? (entry.value / assetMix.reduce((acc, item) => acc + item.value, 0)) * 100
                  : 0;
                return (
                  <div key={entry.name} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: entry.color }} />
                        <span className="text-sm font-semibold text-white">{entry.name}</span>
                      </div>
                      <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
                        {share.toFixed(1)}%
                      </span>
                    </div>
                    <p className="text-base font-bold text-slate-100">{formatCurrency(entry.value)}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
          <div className="mb-4">
            <h4 className="text-lg font-bold text-white">Contas e carteiras</h4>
            <p className="text-sm text-slate-500">Veja onde seu saldo de caixa está distribuído.</p>
          </div>

          <div className="space-y-3">
            {walletAllocation.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-800 px-4 py-6 text-sm text-slate-500">
                Nenhuma conta ou carteira cadastrada neste workspace.
              </div>
            )}

            {walletAllocation.map((wallet) => (
              <div key={wallet.id} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <span className="text-sm font-semibold text-white">{wallet.name}</span>
                  <span className="text-sm font-bold text-emerald-400">{formatCurrency(wallet.balance)}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                  <div className="h-full rounded-full bg-emerald-500" style={{ width: `${wallet.share}%` }} />
                </div>
                <p className="mt-2 text-xs text-slate-500">{wallet.share.toFixed(1)}% do saldo em contas</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
          <div className="mb-4">
            <h4 className="text-lg font-bold text-white">Principais posições de investimento</h4>
            <p className="text-sm text-slate-500">Os ativos que hoje mais representam sua carteira.</p>
          </div>

          <div className="space-y-3">
            {topInvestments.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-800 px-4 py-6 text-sm text-slate-500">
                Nenhum investimento registrado ainda.
              </div>
            )}

            {topInvestments.map((investment) => (
              <div key={investment.id} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-white">{investment.label}</p>
                    <p className="text-xs text-slate-500">
                      {investment.type} · {investment.institution}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-blue-400">{formatCurrency(investment.value)}</p>
                    <p
                      className={cn(
                        'text-xs font-semibold',
                        investment.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'
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

        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
          <div className="mb-4">
            <h4 className="text-lg font-bold text-white">Movimentação por carteira</h4>
            <p className="text-sm text-slate-500">Volume recente de entradas e saídas por conta.</p>
          </div>

          <div className="space-y-3">
            {walletActivity.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-800 px-4 py-6 text-sm text-slate-500">
                Ainda não há movimentações para consolidar por carteira.
              </div>
            )}

            {walletActivity.map((activity) => (
              <div key={activity.walletName} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <p className="text-sm font-semibold text-white">{activity.walletName}</p>
                  <span className="text-xs uppercase tracking-widest text-slate-500">{activity.count} lançamentos</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl bg-slate-900/70 px-3 py-2">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-1">Entradas</p>
                    <p className="font-semibold text-emerald-400">{formatCurrency(activity.income)}</p>
                  </div>
                  <div className="rounded-xl bg-slate-900/70 px-3 py-2">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-1">Saídas</p>
                    <p className="font-semibold text-rose-400">{formatCurrency(activity.expense)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {activeDebts.length > 0 && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
          <div className="mb-4">
            <h4 className="text-lg font-bold text-white">Dívidas que pressionam a carteira</h4>
            <p className="text-sm text-slate-500">Priorize as maiores exposições e vencimentos mais sensíveis.</p>
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            {[...activeDebts]
              .sort((a, b) => b.remainingAmount - a.remainingAmount)
              .slice(0, 3)
              .map((debt) => (
                <div key={debt.id} className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
                  <p className="text-sm font-semibold text-white">{debt.creditor}</p>
                  <p className="mt-1 text-xs text-slate-500">{debt.category}</p>
                  <p className="mt-4 text-xl font-black text-amber-300">{formatCurrency(debt.remainingAmount)}</p>
                  <p className="mt-2 text-xs text-slate-500">Vence todo dia {debt.dueDay}</p>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

const InvestmentsView = ({
  investments,
  onAddInvestment,
  onEditInvestment,
  onDeleteInvestment,
}: InvestmentsViewProps) => {
  const totalInvested = investments.reduce((acc, inv) => acc + inv.invested, 0);
  const currentValue = investments.reduce((acc, inv) => acc + inv.value, 0);
  const profit = currentValue - totalInvested;
  const profitPercentage = totalInvested > 0 ? (profit / totalInvested) * 100 : 0;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h3 className="text-xl font-bold text-white">Investimentos</h3>
        <button
          onClick={onAddInvestment}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 text-white text-sm font-bold hover:bg-emerald-600 transition-colors"
        >
          <Plus size={18} /> Novo Investimento
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5">
          <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-2">Total investido</p>
          <p className="text-2xl font-black text-white">{formatCurrency(totalInvested)}</p>
        </div>
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5">
          <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-2">Valor atual</p>
          <p className="text-2xl font-black text-blue-400">{formatCurrency(currentValue)}</p>
        </div>
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5">
          <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-2">Rendimento</p>
          <p className={cn('text-2xl font-black', profit >= 0 ? 'text-emerald-500' : 'text-rose-500')}>
            {profit >= 0 ? '+' : ''}{formatCurrency(profit)}
          </p>
        </div>
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5">
          <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-2">Rentabilidade %</p>
          <p className={cn('text-2xl font-black', profitPercentage >= 0 ? 'text-emerald-500' : 'text-rose-500')}>
            {profitPercentage.toFixed(2)}%
          </p>
        </div>
      </div>

      <div className="theme-table-surface bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/50">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Nome</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Tipo</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Instituição</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Investido</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Valor atual</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Rendimento</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Rentab. %</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Ret. esp. % a.a.</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {investments.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-sm text-slate-500">
                    Nenhum investimento cadastrado.
                  </td>
                </tr>
              )}

              {investments.map((item) => {
                const itemProfit = item.value - item.invested;
                const itemProfitPct = item.invested > 0 ? (itemProfit / item.invested) * 100 : 0;

                return (
                  <tr key={item.id} className="hover:bg-slate-800/30 transition-colors group">
                    <td className="px-6 py-4 text-sm font-semibold text-white">{item.label}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 rounded-md bg-slate-800 text-slate-300 text-[10px] font-bold uppercase tracking-wider">
                        {item.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-300">{item.institution}</td>
                    <td className="px-6 py-4 text-sm text-slate-300">{formatCurrency(item.invested)}</td>
                    <td className="px-6 py-4 text-sm text-white">{formatCurrency(item.value)}</td>
                    <td className={cn('px-6 py-4 text-sm font-bold', itemProfit >= 0 ? 'text-emerald-500' : 'text-rose-500')}>
                      {itemProfit >= 0 ? '+' : ''}{formatCurrency(itemProfit)}
                    </td>
                    <td className={cn('px-6 py-4 text-sm font-bold', itemProfitPct >= 0 ? 'text-emerald-500' : 'text-rose-500')}>
                      {itemProfitPct.toFixed(2)}%
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-300">{item.expectedReturnAnnual.toFixed(2)}%</td>
                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => onEditInvestment(item.id)}
                          className="p-2 text-slate-400 hover:text-white transition-colors"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => onDeleteInvestment(item.id)}
                          className="p-2 text-slate-500 hover:text-rose-500 transition-colors"
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
type ReportsViewProps = {
  transactions: Transaction[];
  totalBalance: number;
  goals: Goal[];
  onExportPDF: () => void;
  onExportCSV: () => void;
  onBeforeUseAI?: () => boolean;
  getApiHeaders: (withJsonContentType?: boolean) => Promise<Record<string, string>>;
  accessLevel: ReportAccessLevel;
  currentPlan: SubscriptionPlan;
  onUpgrade: () => void;
};

const ReportsView = ({
  transactions,
  totalBalance,
  goals,
  onExportPDF,
  onExportCSV,
  onBeforeUseAI,
  getApiHeaders,
  accessLevel,
  currentPlan,
  onUpgrade,
}: ReportsViewProps) => {
  const [isGeneratingInsight, setIsGeneratingInsight] = React.useState(false);
  const [aiInsight, setAiInsight] = React.useState<string | null>(null);
  const now = React.useMemo(() => new Date(), []);

  const enrichedTransactions = React.useMemo(
    () => transactions.map((tx) => ({ ...tx, parsedDate: parseTransactionDate(tx.date) })),
    [transactions]
  );

  const totalIncome = transactions
    .filter((tx) => tx.type === 'income')
    .reduce((acc, tx) => acc + parseCurrency(tx.amount), 0);

  const totalExpenses = transactions
    .filter((tx) => tx.type === 'expense')
    .reduce((acc, tx) => acc + parseCurrency(tx.amount), 0);

  const balance = totalIncome - totalExpenses;

  const revenueExpense12Months = React.useMemo(() => {
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
  }, [enrichedTransactions, now]);

  const savingsRate6Months = React.useMemo(() => {
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
  }, [enrichedTransactions, now]);

  const categoryData = React.useMemo(() => {
    const expenseByCategory = new Map<string, number>();
    for (const tx of transactions) {
      if (tx.type !== 'expense') continue;
      const key = tx.cat || 'Outros';
      expenseByCategory.set(key, (expenseByCategory.get(key) || 0) + parseCurrency(tx.amount));
    }

    const palette = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#06b6d4', '#ef4444', '#84cc16'];
    return Array.from(expenseByCategory.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, value], index) => ({
        name,
        value,
        color: palette[index % palette.length],
      }));
  }, [transactions]);

  const pieData = categoryData.length > 0 ? categoryData : [{ name: 'Sem dados', value: 1, color: '#334155' }];

  const expenseDeepDive = React.useMemo(() => {
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
        description: tx.desc || tx.cat || 'Despesa sem descrição',
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
  }, [enrichedTransactions, now]);

  const balanceForecast = React.useMemo(() => {
    const forecastWindowDays = 60;
    const horizonDays = [7, 15, 30];
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
    };
  }, [enrichedTransactions, now, totalBalance]);

  const premiumSmartAlerts = React.useMemo(
    () =>
      buildPremiumSmartAlerts({
        transactions,
        totalBalance,
        goals,
        now,
        includeOkState: true,
      }),
    [goals, now, totalBalance, transactions]
  );

  const generateAIInsight = async () => {
    if (onBeforeUseAI && !onBeforeUseAI()) {
      return;
    }

    setIsGeneratingInsight(true);
    try {
      const prompt = `Analise estes dados financeiros e gere 3 insights curtos e acionáveis:
Receitas: ${formatCurrency(totalIncome)}
Despesas: ${formatCurrency(totalExpenses)}
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
            <h3 className="text-xl font-bold text-white">Relatórios</h3>
            <p className="text-sm text-slate-400">
              Visão básica da sua movimentação financeira atual.
            </p>
          </div>
          {currentPlan === 'FREE' && (
            <button
              onClick={onUpgrade}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 text-white text-sm font-bold hover:bg-emerald-600 transition-colors"
            >
              <Sparkles size={16} /> Liberar relatórios completos
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl">
            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-1">Receitas</p>
            <p className="text-2xl font-black text-emerald-500">{formatCurrency(totalIncome)}</p>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl">
            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-1">Despesas</p>
            <p className="text-2xl font-black text-rose-500">{formatCurrency(totalExpenses)}</p>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl">
            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-1">Saldo líquido</p>
            <p className="text-2xl font-black text-white">{formatCurrency(balance)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="theme-report-card bg-slate-900/50 border border-slate-800 p-6 rounded-2xl">
            <h4 className="text-sm font-bold text-white uppercase tracking-widest mb-4">Resumo por categoria</h4>
            <div className="space-y-3">
              {categoryData.length === 0 ? (
                <p className="text-sm text-slate-500">Registre despesas para visualizar um resumo por categoria.</p>
              ) : (
                categoryData.slice(0, 5).map((item) => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-800/30 px-4 py-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="size-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-sm text-slate-200 truncate">{item.name}</span>
                    </div>
                    <span className="text-sm font-bold text-white">{formatCurrency(item.value)}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="theme-report-card bg-slate-900/50 border border-slate-800 p-6 rounded-2xl">
            <h4 className="text-sm font-bold text-white uppercase tracking-widest mb-4">Disponível no Pro</h4>
            <div className="space-y-3">
              {[
                'Gráficos comparativos completos',
                'Insights automáticos com IA',
                'Exportação em PDF e CSV',
                'Comparativos avançados de receita, despesa e economia',
              ].map((feature) => (
                <div
                  key={feature}
                  className="rounded-xl border border-emerald-500/15 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-100/90"
                >
                  {feature}
                </div>
              ))}
            </div>
            {currentPlan === 'FREE' && (
              <button
                onClick={onUpgrade}
                className="mt-5 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 text-white text-sm font-bold hover:bg-emerald-600 transition-colors"
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
        <h3 className="text-xl font-bold text-white">Relatórios e Insights</h3>
        <div className="flex gap-2">
          <button
            onClick={onExportPDF}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors text-sm font-bold"
          >
            <Download size={18} /> PDF
          </button>
          <button
            onClick={onExportCSV}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors text-sm font-bold"
          >
            <FileText size={18} /> CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl">
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-1">Receitas</p>
          <p className="text-2xl font-black text-emerald-500">{formatCurrency(totalIncome)}</p>
        </div>
        <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl">
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-1">Despesas</p>
          <p className="text-2xl font-black text-rose-500">{formatCurrency(totalExpenses)}</p>
        </div>
        <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl">
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-1">Saldo líquido</p>
          <p className="text-2xl font-black text-white">{formatCurrency(balance)}</p>
        </div>
      </div>

      {currentPlan === 'PREMIUM' ? (
        <div className="space-y-6">
          <div className="theme-report-card bg-slate-900/50 border border-slate-800 p-6 rounded-2xl">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between mb-6">
              <div>
                <h4 className="text-sm font-bold text-white uppercase tracking-widest">Previsão de saldo</h4>
                <p className="text-sm text-slate-400 mt-2">
                  Projeção baseada no ritmo médio das suas movimentações dos últimos 60 dias.
                </p>
              </div>
              <div
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest ${
                  balanceForecast.trend === 'positive'
                    ? 'bg-emerald-500/10 text-emerald-300'
                    : balanceForecast.trend === 'negative'
                      ? 'bg-rose-500/10 text-rose-300'
                      : 'bg-slate-800 text-slate-300'
                }`}
              >
                {balanceForecast.trend === 'positive'
                  ? 'Tendência positiva'
                  : balanceForecast.trend === 'negative'
                    ? 'Tendência de queda'
                    : 'Tendência estável'}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {balanceForecast.projections.map((item) => (
                <div
                  key={item.days}
                  className="rounded-2xl border border-slate-800 bg-slate-800/30 p-5"
                >
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
                    Em {item.days} dias
                  </p>
                  <p
                    className={`text-2xl font-black ${
                      item.projectedBalance >= 0 ? 'text-white' : 'text-rose-400'
                    }`}
                  >
                    {formatCurrency(item.projectedBalance)}
                  </p>
                  <p className="text-xs text-slate-400 mt-2">
                    {item.projectedBalance >= 0
                      ? 'Mantendo o ritmo atual, seu caixa permanece saudável.'
                      : 'Se nada mudar, o saldo projetado fica negativo.'}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-800/30 p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
                  Alertas inteligentes
                </p>
                <span className="rounded-full border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-300">
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
                        ? 'border-rose-500/30 bg-rose-500/10'
                        : alert.tone === 'warning'
                          ? 'border-amber-400/30 bg-amber-400/10'
                          : 'border-emerald-500/20 bg-emerald-500/10'
                    )}
                  >
                    <p
                      className={cn(
                        'text-xs font-bold uppercase tracking-widest',
                        alert.tone === 'error'
                          ? 'text-rose-300'
                          : alert.tone === 'warning'
                            ? 'text-amber-200'
                            : 'text-emerald-300'
                      )}
                    >
                      {alert.title}
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-slate-200">{alert.message}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="theme-report-card bg-slate-900/50 border border-slate-800 p-6 rounded-2xl">
            <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h4 className="text-sm font-bold text-white uppercase tracking-widest">Análises profundas de despesas</h4>
                <p className="mt-2 max-w-3xl text-sm text-slate-400">
                  Veja quais categorias mais cresceram, onde estão os gastos recorrentes mais pesados e qual despesa individual mais pressiona seu caixa neste mês.
                </p>
              </div>
              <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-300">
                Premium
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-800/30 p-5">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Despesas do mês</p>
                <p className="text-2xl font-black text-white">{formatCurrency(expenseDeepDive.currentMonthTotal)}</p>
                <p className="mt-2 text-xs text-slate-400">
                  {expenseDeepDive.previousMonthTotal > 0
                    ? `Mês anterior: ${formatCurrency(expenseDeepDive.previousMonthTotal)}`
                    : 'Sem comparação válida com o mês anterior.'}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-800/30 p-5">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Variação mensal</p>
                <p
                  className={cn(
                    'text-2xl font-black',
                    expenseDeepDive.monthOverMonthVariation === null
                      ? 'text-white'
                      : expenseDeepDive.monthOverMonthVariation > 0
                        ? 'text-amber-300'
                        : 'text-emerald-300'
                  )}
                >
                  {expenseDeepDive.monthOverMonthVariation === null
                    ? 'Sem base'
                    : `${expenseDeepDive.monthOverMonthVariation > 0 ? '+' : ''}${expenseDeepDive.monthOverMonthVariation.toFixed(1)}%`}
                </p>
                <p className="mt-2 text-xs text-slate-400">
                  Comparação entre as despesas do mês atual e do mês anterior.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-800/30 p-5">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Categoria mais pesada</p>
                <p className="text-lg font-black text-white">
                  {expenseDeepDive.topCurrentCategory?.name || 'Sem dados'}
                </p>
                <p className="mt-2 text-xs text-slate-400">
                  {expenseDeepDive.topCurrentCategory
                    ? formatCurrency(expenseDeepDive.topCurrentCategory.value)
                    : 'Registre mais despesas para gerar a análise.'}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-800/30 p-5">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Maior despesa individual</p>
                <p className="text-lg font-black text-white">
                  {expenseDeepDive.largestExpense?.description || 'Sem dados'}
                </p>
                <p className="mt-2 text-xs text-slate-400">
                  {expenseDeepDive.largestExpense
                    ? `${formatCurrency(expenseDeepDive.largestExpense.amount)} em ${expenseDeepDive.largestExpense.category}`
                    : 'Ainda não há lançamentos suficientes neste mês.'}
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-2">
              <div className="rounded-2xl border border-slate-800 bg-slate-800/30 p-5">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">Categorias que mais cresceram</p>
                <div className="space-y-3">
                  {expenseDeepDive.growingCategories.length === 0 ? (
                    <p className="text-sm text-slate-400">
                      Nenhuma categoria apresentou crescimento relevante em relação ao mês anterior.
                    </p>
                  ) : (
                    expenseDeepDive.growingCategories.map((item) => (
                      <div key={item.name} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-bold text-white">{item.name}</p>
                          <span className="text-xs font-bold uppercase tracking-widest text-amber-300">
                            +{item.variation.toFixed(0)}%
                          </span>
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-3 text-xs text-slate-400">
                          <span>Mês atual: {formatCurrency(item.currentValue)}</span>
                          <span>Mês anterior: {formatCurrency(item.previousValue)}</span>
                        </div>
                        <p className="mt-2 text-xs text-slate-500">
                          Crescimento absoluto de {formatCurrency(item.diff)} nesta categoria.
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-800/30 p-5">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">Categorias recorrentes que mais pesam</p>
                <div className="space-y-3">
                  {expenseDeepDive.recurringHeavyCategories.length === 0 ? (
                    <p className="text-sm text-slate-400">
                      Ainda não há categorias recorrentes suficientes neste mês para uma análise mais profunda.
                    </p>
                  ) : (
                    expenseDeepDive.recurringHeavyCategories.map((item) => (
                      <div key={item.name} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-bold text-white">{item.name}</p>
                          <span className="text-xs font-bold uppercase tracking-widest text-slate-300">
                            {item.count} lançamentos
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-slate-300">{formatCurrency(item.total)}</p>
                        <p className="mt-2 text-xs text-slate-500">
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
        <div className="theme-report-card bg-slate-900/50 border border-slate-800 p-6 rounded-2xl">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h4 className="text-sm font-bold text-white uppercase tracking-widest">Disponível no Premium</h4>
              <p className="text-sm text-slate-400 mt-2 max-w-2xl">
                Desbloqueie previsões de saldo em 7, 15 e 30 dias, alertas inteligentes e análises profundas de despesas para identificar crescimento por categoria e padrões que pressionam seu caixa.
              </p>
            </div>
            <button
              onClick={onUpgrade}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-emerald-600"
            >
              <Sparkles size={16} /> Conhecer Premium
            </button>
          </div>
        </div>
      )}

      <div className="theme-report-card bg-slate-900/50 border border-slate-800 p-6 rounded-2xl">
        <div className="mb-5">
          <h4 className="text-sm font-bold text-white uppercase tracking-widest">Receita x Despesa (12 meses)</h4>
        </div>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={revenueExpense12Months}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis
                stroke="#64748b"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => formatCurrency(Number(value || 0))}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  border: '1px solid #1e293b',
                  borderRadius: '12px',
                }}
                formatter={(value, name) => [
                  formatCurrency(Number(value || 0)),
                  name === 'income' ? 'Receitas' : 'Despesas',
                ]}
              />
              <Line type="monotone" dataKey="income" name="income" stroke="#10b981" strokeWidth={3} dot={{ r: 2 }} />
              <Line type="monotone" dataKey="expense" name="expense" stroke="#f43f5e" strokeWidth={3} dot={{ r: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="theme-report-card bg-slate-900/50 border border-slate-800 p-6 rounded-2xl">
          <h4 className="text-sm font-bold text-white uppercase tracking-widest mb-6">Gastos por categoria</h4>
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
                    backgroundColor: '#0f172a',
                    border: '1px solid #1e293b',
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
              <p className="text-xs text-slate-500">Sem despesas para exibir por categoria.</p>
            ) : (
              categoryData.map((item) => (
                <div key={item.name} className="flex items-center gap-2 text-xs">
                  <div className="size-2 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-400">{item.name}:</span>
                  <span className="text-white font-bold">{formatCurrency(item.value)}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="theme-report-card bg-slate-900/50 border border-slate-800 p-6 rounded-2xl">
          <h4 className="text-sm font-bold text-white uppercase tracking-widest mb-6">Taxa de economia (6 meses)</h4>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={savingsRate6Months}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis
                  stroke="#64748b"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${Number(value || 0).toFixed(0)}%`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #1e293b',
                    borderRadius: '12px',
                  }}
                  formatter={(value) => [`${Number(value || 0).toFixed(2)}%`, 'Taxa de economia']}
                />
                <Line
                  type="monotone"
                  dataKey="savingsRate"
                  stroke="#22c55e"
                  strokeWidth={3}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="theme-report-card bg-slate-900/50 border border-slate-800 p-6 rounded-2xl">
        <div className="flex items-center justify-between mb-6">
          <h4 className="text-sm font-bold text-white uppercase tracking-widest">Insights da IA</h4>
          <button
            onClick={generateAIInsight}
            disabled={isGeneratingInsight}
            className="text-[10px] font-black text-emerald-500 uppercase tracking-widest hover:underline disabled:opacity-50"
          >
            {isGeneratingInsight ? 'Gerando...' : 'Atualizar Insights'}
          </button>
        </div>
        <div className="space-y-4">
          {aiInsight ? (
            <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={16} className="text-emerald-500" />
                <span className="text-xs font-bold text-emerald-500 uppercase">Análise personalizada</span>
              </div>
              <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                {aiInsight}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center p-8">
              <Sparkles size={32} className="text-slate-700 mb-4" />
              <p className="text-sm text-slate-500">
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
    <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl">
      <h3 className="text-xl font-bold text-white mb-2">Assistente IA</h3>
      <p className="text-slate-400 text-sm mb-6">
        Converse com o Cote para analisar gastos, metas e investimentos com base nos seus dados atuais.
      </p>
      <button
        onClick={onOpenAssistant}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 text-white text-sm font-bold hover:bg-emerald-600 transition-colors"
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

  React.useEffect(() => {
    if (!isOpen) return;
    setFormData(getInitialFormData());
    setIsSubmitting(false);
  }, [isOpen, getInitialFormData]);

  if (!isOpen) return null;

  const isValid =
    formData.title.trim().length > 0 &&
    parseMoneyInput(formData.target) > 0 &&
    parseMoneyInput(formData.accumulated) >= 0 &&
    formData.category.trim().length > 0;

  const handleSubmit = async () => {
    if (!isValid || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Falha ao salvar meta.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="theme-modal-backdrop fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="theme-modal-surface bg-slate-900 border border-slate-800 p-6 rounded-3xl max-w-md w-full shadow-2xl"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">{initialData ? 'Editar Meta' : 'Nova Meta'}</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors" disabled={isSubmitting}>
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs text-slate-500 font-bold uppercase tracking-widest">Titulo</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Ex: Reserva de Emergencia"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 px-4 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs text-slate-500 font-bold uppercase tracking-widest">Meta (R$)</label>
              <MoneyInput
                value={formData.target}
                onChange={(value) => setFormData((prev) => ({ ...prev, target: value }))}
                placeholder="R$ 0,00"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 px-4 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs text-slate-500 font-bold uppercase tracking-widest">Acumulado (R$)</label>
              <MoneyInput
                value={formData.accumulated}
                onChange={(value) => setFormData((prev) => ({ ...prev, accumulated: value }))}
                placeholder="R$ 0,00"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 px-4 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs text-slate-500 font-bold uppercase tracking-widest">Categoria</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 px-4 text-sm text-white focus:outline-none focus:border-emerald-500"
              >
                {GOAL_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-slate-500 font-bold uppercase tracking-widest">Prazo</label>
              <input
                type="date"
                value={formData.deadline}
                onChange={(e) => setFormData((prev) => ({ ...prev, deadline: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 px-4 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={!isValid || isSubmitting}
            className={cn(
              'w-full mt-2 py-3 rounded-xl font-bold transition-all shadow-lg',
              !isValid || isSubmitting
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-500/20'
            )}
          >
            {isSubmitting ? 'Salvando...' : initialData ? 'Salvar alterações' : 'Criar meta'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

type InvestmentModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (inv: InvestmentFormData) => Promise<void> | void;
  initialData?: Investment | null;
};

const InvestmentModal = ({ isOpen, onClose, onSubmit, initialData = null }: InvestmentModalProps) => {
  const getInitialFormData = React.useCallback((): InvestmentFormData => {
    if (!initialData) {
      return {
        name: '',
        type: INVESTMENT_TYPES[0],
        institution: '',
        invested: '',
        current: '',
        expectedReturnAnnual: '',
      };
    }

    return {
      name: initialData.label,
      type: initialData.type,
      institution: initialData.institution,
      invested: formatMoneyInput(initialData.invested),
      current: formatMoneyInput(initialData.value),
      expectedReturnAnnual: String(initialData.expectedReturnAnnual),
    };
  }, [initialData]);

  const [formData, setFormData] = React.useState<InvestmentFormData>(getInitialFormData);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!isOpen) return;
    setFormData(getInitialFormData());
    setIsSubmitting(false);
  }, [isOpen, getInitialFormData]);

  if (!isOpen) return null;

  const isValid =
    formData.name.trim().length > 0 &&
    formData.institution.trim().length > 0 &&
    parseMoneyInput(formData.invested) >= 0 &&
    parseMoneyInput(formData.current) >= 0 &&
    Number(formData.expectedReturnAnnual) >= 0;

  const handleSubmit = async () => {
    if (!isValid || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Falha ao salvar investimento.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="theme-modal-backdrop fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="theme-modal-surface bg-slate-900 border border-slate-800 p-8 rounded-3xl max-w-md w-full shadow-2xl"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">{initialData ? 'Editar Investimento' : 'Novo Investimento'}</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors" disabled={isSubmitting}>
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs text-slate-500 font-bold uppercase tracking-widest">Nome</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Ex: Tesouro Selic 2029"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 px-4 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs text-slate-500 font-bold uppercase tracking-widest">Tipo</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData((prev) => ({ ...prev, type: e.target.value }))}
              className="block w-full min-w-0 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
            >
              {INVESTMENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-slate-500 font-bold uppercase tracking-widest">Instituição</label>
            <input
              type="text"
              value={formData.institution}
              onChange={(e) => setFormData((prev) => ({ ...prev, institution: e.target.value }))}
              placeholder="Ex: XP, NuInvest, Itaú"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 px-4 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs text-slate-500 font-bold uppercase tracking-widest">Valor investido (R$)</label>
              <MoneyInput
                value={formData.invested}
                onChange={(value) => setFormData((prev) => ({ ...prev, invested: value }))}
                placeholder="R$ 0,00"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 px-4 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-slate-500 font-bold uppercase tracking-widest">Valor atual (R$)</label>
              <MoneyInput
                value={formData.current}
                onChange={(value) => setFormData((prev) => ({ ...prev, current: value }))}
                placeholder="R$ 0,00"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 px-4 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-slate-500 font-bold uppercase tracking-widest">Retorno esperado (% a.a.)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={formData.expectedReturnAnnual}
              onChange={(e) => setFormData((prev) => ({ ...prev, expectedReturnAnnual: e.target.value }))}
              placeholder="0.00"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 px-4 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={!isValid || isSubmitting}
            className={cn(
              'w-full mt-2 py-3 rounded-xl font-bold transition-all shadow-lg',
              !isValid || isSubmitting
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-500/20'
            )}
          >
            {isSubmitting ? 'Salvando...' : initialData ? 'Salvar alterações' : 'Adicionar investimento'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

type DebtModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (debt: DebtFormData) => Promise<void> | void;
  initialData?: Debt | null;
};

const DebtModal = ({ isOpen, onClose, onSubmit, initialData = null }: DebtModalProps) => {
  const getInitialFormData = React.useCallback((): DebtFormData => {
    if (!initialData) {
      return {
        creditor: '',
        originalAmount: '',
        remainingAmount: '',
        interestRateMonthly: '',
        dueDay: '10',
        category: DEBT_CATEGORIES[0],
        status: 'Ativa',
      };
    }

    return {
      creditor: initialData.creditor,
      originalAmount: formatMoneyInput(initialData.originalAmount),
      remainingAmount: formatMoneyInput(initialData.remainingAmount),
      interestRateMonthly: String(initialData.interestRateMonthly),
      dueDay: String(initialData.dueDay),
      category: initialData.category,
      status: initialData.status,
    };
  }, [initialData]);

  const [formData, setFormData] = React.useState<DebtFormData>(getInitialFormData);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!isOpen) return;
    setFormData(getInitialFormData());
    setIsSubmitting(false);
  }, [isOpen, getInitialFormData]);

  if (!isOpen) return null;

  const isValid =
    formData.creditor.trim().length > 0 &&
    parseMoneyInput(formData.originalAmount) > 0 &&
    parseMoneyInput(formData.remainingAmount) >= 0 &&
    Number(formData.interestRateMonthly) >= 0 &&
    Number(formData.dueDay) >= 1 &&
    Number(formData.dueDay) <= 31;

  const handleSubmit = async () => {
    if (!isValid || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Falha ao salvar dívida.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="theme-modal-backdrop fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="theme-modal-surface bg-slate-900 border border-slate-800 p-8 rounded-3xl max-w-md w-full shadow-2xl"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">{initialData ? 'Editar Dívida' : 'Nova Dívida'}</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors" disabled={isSubmitting}>
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs text-slate-500 font-bold uppercase tracking-widest">Credor</label>
            <input
              type="text"
              value={formData.creditor}
              onChange={(e) => setFormData((prev) => ({ ...prev, creditor: e.target.value }))}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 px-4 text-sm text-white focus:outline-none focus:border-emerald-500"
              placeholder="Ex: Banco X"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs text-slate-500 font-bold uppercase tracking-widest">Valor Original</label>
              <MoneyInput
                value={formData.originalAmount}
                onChange={(value) => setFormData((prev) => ({ ...prev, originalAmount: value }))}
                placeholder="R$ 0,00"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 px-4 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-slate-500 font-bold uppercase tracking-widest">Valor Restante</label>
              <MoneyInput
                value={formData.remainingAmount}
                onChange={(value) => setFormData((prev) => ({ ...prev, remainingAmount: value }))}
                placeholder="R$ 0,00"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 px-4 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs text-slate-500 font-bold uppercase tracking-widest">Juros (% mês)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.interestRateMonthly}
                onChange={(e) => setFormData((prev) => ({ ...prev, interestRateMonthly: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 px-4 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-slate-500 font-bold uppercase tracking-widest">Dia Vencimento</label>
              <input
                type="number"
                min={1}
                max={31}
                value={formData.dueDay}
                onChange={(e) => setFormData((prev) => ({ ...prev, dueDay: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 px-4 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs text-slate-500 font-bold uppercase tracking-widest">Categoria</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 px-4 text-sm text-white focus:outline-none focus:border-emerald-500"
              >
                {DEBT_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-slate-500 font-bold uppercase tracking-widest">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value as 'Ativa' | 'Quitada' }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 px-4 text-sm text-white focus:outline-none focus:border-emerald-500"
              >
                <option>Ativa</option>
                <option>Quitada</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={!isValid || isSubmitting}
            className={cn(
              'w-full mt-4 py-3 rounded-xl font-bold transition-all shadow-lg',
              !isValid || isSubmitting
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-500/20'
            )}
          >
            {isSubmitting ? 'Salvando...' : initialData ? 'Salvar alterações' : 'Criar dívida'}
          </button>
        </div>
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
  initialData?: Transaction | null;
  initialDraft?: Partial<TransactionFormData> | null;
};

const TransactionModal = ({
  isOpen,
  onClose,
  onSubmit,
  onSuggestCategory,
  onParseReceipt,
  initialData = null,
  initialDraft = null,
}: TransactionModalProps) => {
  const getInitialFormData = React.useCallback((): TransactionFormData => {
    if (!initialData) {
      return {
        description: '',
        amount: '',
        flowType: 'Despesa',
        category: 'Alimentação',
        paymentMethod: 'PIX',
        wallet: TRANSACTION_WALLETS[0],
        destinationWallet: '',
        receiptUrl: null,
        date: new Date().toISOString().split('T')[0],
        ...initialDraft,
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
      category: initialData.cat || 'Outros',
      paymentMethod: initialData.paymentMethod || getDefaultPaymentMethodForFlow(initialData.flowType),
      wallet: initialData.wallet,
      destinationWallet: initialData.destinationWallet || '',
      receiptUrl: initialData.receiptUrl || null,
      date: normalizedDate,
    };
  }, [initialData]);

  const [formData, setFormData] = React.useState<TransactionFormData>(getInitialFormData);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [suggestedCategory, setSuggestedCategory] = React.useState<string | null>(null);
  const [isLoadingSuggestion, setIsLoadingSuggestion] = React.useState(false);
  const [isParsingReceipt, setIsParsingReceipt] = React.useState(false);
  const [receiptStatus, setReceiptStatus] = React.useState<string | null>(null);
  const [selectedReceiptName, setSelectedReceiptName] = React.useState<string | null>(null);
  const receiptInputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (!isOpen) return;
    setFormData(getInitialFormData());
    setIsSubmitting(false);
    setSuggestedCategory(null);
    setIsLoadingSuggestion(false);
    setIsParsingReceipt(false);
    setReceiptStatus(null);
    setSelectedReceiptName(null);
  }, [isOpen, getInitialFormData]);

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
        setReceiptStatus('Não foi possível extrair dados do comprovante.');
      }
    } catch {
      setReceiptStatus('Falha ao processar comprovante.');
    } finally {
      setIsParsingReceipt(false);
      event.target.value = '';
    }
  };

  if (!isOpen) return null;

  const isValid =
    formData.description.trim().length > 0 &&
    parseMoneyInput(formData.amount) > 0 &&
    formData.category.trim().length > 0 &&
    formData.wallet.trim().length > 0 &&
    (formData.flowType !== 'Transferência' ||
      (formData.destinationWallet.trim().length > 0 && formData.destinationWallet !== formData.wallet)) &&
    formData.date.trim().length > 0;

  const handleSubmit = async () => {
    if (!isValid || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const shouldClose = await onSubmit(formData);
      if (shouldClose !== false) {
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="theme-modal-backdrop fixed inset-0 z-[110] flex items-end justify-center overflow-x-hidden overflow-y-hidden bg-slate-950/80 p-0 backdrop-blur-sm sm:overflow-y-auto sm:items-center sm:p-4">
      <motion.div
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="theme-modal-surface mobile-hide-scrollbar box-border w-[calc(100vw-0.75rem)] max-w-[calc(100vw-0.75rem)] max-h-[92dvh] overflow-x-hidden overflow-y-auto overscroll-contain rounded-t-[1.75rem] border-x border-t border-slate-800 bg-slate-900 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 shadow-2xl sm:my-6 sm:w-full sm:max-w-lg sm:max-h-[calc(100dvh-3rem)] sm:rounded-3xl sm:border sm:p-6"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <div className="mb-4 flex justify-center sm:hidden">
          <div className="h-1.5 w-12 rounded-full bg-slate-700" />
        </div>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">{initialData ? 'Editar Transação' : 'Nova Transação'}</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors" disabled={isSubmitting}>
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs text-slate-500 font-bold uppercase tracking-widest">Tipo</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {TRANSACTION_FLOW_TYPES.map((flowType) => (
                <button
                  key={flowType}
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      flowType,
                      paymentMethod:
                        flowType === 'Transferência'
                          ? 'Transferência bancária'
                          : prev.paymentMethod === 'Transferência bancária'
                            ? 'PIX'
                            : prev.paymentMethod,
                    }))
                  }
                  className={cn(
                    'flex min-w-0 items-center justify-center gap-2 rounded-2xl border px-3 py-3 text-sm font-bold transition-colors sm:px-4 sm:py-3.5',
                    formData.flowType === flowType
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600'
                  )}
                >
                  {React.createElement(getFlowTypeIcon(flowType), { size: 16 })}
                  {flowType}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-slate-500 font-bold uppercase tracking-widest">Valor (R$)</label>
            <MoneyInput
              value={formData.amount}
              onChange={(value) => setFormData((prev) => ({ ...prev, amount: value }))}
              placeholder="R$ 0,00"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 px-4 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs text-slate-500 font-bold uppercase tracking-widest">Descrição</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Ex: Supermercado"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 px-4 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          {(isLoadingSuggestion || suggestedCategory) && (
            <div className="rounded-xl border border-slate-800 bg-slate-800/40 p-3 text-xs text-slate-300">
              {isLoadingSuggestion ? (
                <span>Buscando sugestão de categoria...</span>
              ) : suggestedCategory ? (
                <div className="flex items-center justify-between gap-2">
                  <span>
                    Sugestão: <span className="font-bold text-emerald-400">{suggestedCategory}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, category: suggestedCategory }))}
                    className="px-2 py-1 rounded-md bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition-colors"
                  >
                    Usar sugestão
                  </button>
                </div>
              ) : null}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="min-w-0 overflow-hidden space-y-2">
              <label className="text-xs text-slate-500 font-bold uppercase tracking-widest">Data</label>
              <div className="w-full min-w-0 max-w-full overflow-hidden rounded-xl border border-slate-700 bg-slate-800 sm:overflow-visible sm:rounded-none sm:border-0 sm:bg-transparent">
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
                  className="block w-full min-w-0 max-w-full appearance-none border-0 bg-transparent px-4 py-2 text-sm text-white [color-scheme:dark] focus:outline-none sm:rounded-xl sm:border sm:border-slate-700 sm:bg-slate-800 sm:focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="min-w-0 overflow-hidden space-y-2">
              <label className="text-xs text-slate-500 font-bold uppercase tracking-widest">Categoria</label>
              <div className="w-full min-w-0 max-w-full overflow-hidden rounded-xl border border-slate-700 bg-slate-800 sm:overflow-visible sm:rounded-none sm:border-0 sm:bg-transparent">
                <select
                  value={formData.category}
                  onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
                  className="block w-full min-w-0 max-w-full border-0 bg-transparent px-4 py-2 pr-10 text-sm text-white focus:outline-none sm:rounded-xl sm:border sm:border-slate-700 sm:bg-slate-800 sm:focus:border-emerald-500"
                >
                  {TRANSACTION_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-slate-500 font-bold uppercase tracking-widest">
              Método de pagamento
            </label>
            <div className="w-full min-w-0 max-w-full overflow-hidden rounded-xl border border-slate-700 bg-slate-800 sm:overflow-visible sm:rounded-none sm:border-0 sm:bg-transparent">
              <select
                value={formData.paymentMethod}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, paymentMethod: e.target.value as PaymentMethodLabel }))
                }
                className="block w-full min-w-0 max-w-full border-0 bg-transparent px-4 py-2 pr-10 text-sm text-white focus:outline-none sm:rounded-xl sm:border sm:border-slate-700 sm:bg-slate-800 sm:focus:border-emerald-500"
              >
                {PAYMENT_METHODS.map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-slate-500 font-bold uppercase tracking-widest">
              Comprovante (JPG, PNG, PDF)
            </label>
            <div className="flex w-full min-w-0 max-w-full flex-col items-stretch gap-3 overflow-hidden rounded-xl border border-slate-700 bg-slate-800 p-3 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={() => receiptInputRef.current?.click()}
                disabled={isParsingReceipt || isSubmitting}
                className="shrink-0 rounded-lg bg-slate-700 px-3 py-2 text-xs font-bold text-slate-100 transition-colors hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {selectedReceiptName ? 'Trocar arquivo' : 'Escolher arquivo'}
              </button>
              <span className="min-w-0 flex-1 truncate text-left text-sm text-slate-300">
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
            {receiptStatus && <p className="text-[11px] text-slate-400">{receiptStatus}</p>}
          </div>

          {formData.category === 'Auto (IA)' && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs text-emerald-300">
              A categoria sera classificada automaticamente com base na descricao.
            </div>
          )}

          {formData.flowType === 'Transferência' ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="min-w-0 overflow-hidden space-y-2">
                <label className="text-xs text-slate-500 font-bold uppercase tracking-widest">Conta origem</label>
                <div className="w-full min-w-0 max-w-full overflow-hidden rounded-xl border border-slate-700 bg-slate-800 sm:overflow-visible sm:rounded-none sm:border-0 sm:bg-transparent">
                  <select
                    value={formData.wallet}
                    onChange={(e) => setFormData((prev) => ({ ...prev, wallet: e.target.value }))}
                    className="block w-full min-w-0 max-w-full border-0 bg-transparent px-4 py-2 pr-10 text-sm text-white focus:outline-none sm:rounded-xl sm:border sm:border-slate-700 sm:bg-slate-800 sm:focus:border-emerald-500"
                  >
                    {TRANSACTION_WALLETS.map((wallet) => (
                      <option key={wallet} value={wallet}>
                        {wallet}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="min-w-0 overflow-hidden space-y-2">
                <label className="text-xs text-slate-500 font-bold uppercase tracking-widest">Conta destino</label>
                <div className="w-full min-w-0 max-w-full overflow-hidden rounded-xl border border-slate-700 bg-slate-800 sm:overflow-visible sm:rounded-none sm:border-0 sm:bg-transparent">
                  <select
                    value={formData.destinationWallet}
                    onChange={(e) => setFormData((prev) => ({ ...prev, destinationWallet: e.target.value }))}
                    className="block w-full min-w-0 max-w-full border-0 bg-transparent px-4 py-2 pr-10 text-sm text-white focus:outline-none sm:rounded-xl sm:border sm:border-slate-700 sm:bg-slate-800 sm:focus:border-emerald-500"
                  >
                    <option value="">Selecione</option>
                    {TRANSACTION_WALLETS.map((wallet) => (
                      <option key={wallet} value={wallet}>
                        {wallet}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-xs text-slate-500 font-bold uppercase tracking-widest">Conta / Carteira</label>
              <div className="w-full min-w-0 max-w-full overflow-hidden rounded-xl border border-slate-700 bg-slate-800 sm:overflow-visible sm:rounded-none sm:border-0 sm:bg-transparent">
                <select
                  value={formData.wallet}
                  onChange={(e) => setFormData((prev) => ({ ...prev, wallet: e.target.value }))}
                  className="block w-full min-w-0 max-w-full border-0 bg-transparent px-4 py-2 pr-10 text-sm text-white focus:outline-none sm:rounded-xl sm:border sm:border-slate-700 sm:bg-slate-800 sm:focus:border-emerald-500"
                >
                  {TRANSACTION_WALLETS.map((wallet) => (
                    <option key={wallet} value={wallet}>
                      {wallet}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {formData.flowType === 'Transferência' && formData.destinationWallet === formData.wallet && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-300">
              Conta origem e destino não podem ser iguais.
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={!isValid || isSubmitting}
            className={cn(
              'w-full mt-2 py-3 rounded-xl font-bold transition-all shadow-lg',
              !isValid || isSubmitting
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-500/20'
            )}
          >
            {isSubmitting ? 'Salvando...' : initialData ? 'Salvar alterações' : 'Criar transação'}
          </button>
        </div>
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
    <div className="theme-modal-backdrop fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="theme-modal-surface bg-slate-900 border border-slate-800 p-8 rounded-3xl max-w-md w-full shadow-2xl"
      >
        <div className="flex items-center justify-between mb-6">
          <span className="text-xs font-black text-emerald-500 uppercase tracking-widest">
            Passo {step + 1} de {steps.length}
          </span>
          <div className="flex gap-1">
            {steps.map((_, i) => (
              <div
                key={i}
                className={cn('h-1 w-4 rounded-full transition-all', i === step ? 'bg-emerald-500' : 'bg-slate-800')}
              />
            ))}
          </div>
        </div>

        <h3 className="text-2xl font-bold text-white mb-3">{steps[step].title}</h3>
        <p className="text-slate-400 mb-8 leading-relaxed">{steps[step].description}</p>

        <div className="flex items-center justify-between">
          <button onClick={onComplete} className="text-slate-500 hover:text-white text-sm font-bold transition-colors">
            Pular Tutorial
          </button>

          <div className="flex gap-3">
            {step > 0 && (
              <button
                onClick={prevStep}
                className="px-4 py-2 rounded-xl border border-slate-800 text-slate-400 hover:text-white transition-all"
              >
                Voltar
              </button>
            )}
            <button
              onClick={nextStep}
              className="px-6 py-2 rounded-xl bg-emerald-500 text-white font-bold hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20"
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

  const runSetupForToken = async (accessToken: string) => {
    const setupRes = await fetch('/api/setup-user', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const setupData = await setupRes.json().catch(() => ({}));
    if (!setupRes.ok && setupData.error) throw new Error(setupData.error);
  };

  const handleResendConfirmation = async () => {
    if (!pendingConfirmationEmail || loading) return;

    setLoading(true);
    setError(null);
    setNotice(null);

    try {
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: pendingConfirmationEmail,
        options: {
          emailRedirectTo: buildClientRedirectUrl('/auth/confirm'),
        },
      });

      if (resendError) throw resendError;

      setNotice('Enviamos um novo e-mail de confirmação. Verifique sua caixa de entrada e spam.');
    } catch (err: any) {
      setError(err?.message || 'Não foi possível reenviar o e-mail de confirmação.');
    } finally {
      setLoading(false);
    }
  };

  const requestEmailCode = async (normalizedEmail: string) => {
    if (!normalizedEmail) {
      throw new Error('Informe seu e-mail para receber o código.');
    }

    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        shouldCreateUser: false,
      },
    });

    if (otpError) {
      throw otpError;
    }

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

    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      email: normalizedEmail,
      token,
      type: 'email',
    });

    if (verifyError) {
      throw verifyError;
    }

    const accessToken =
      data.session?.access_token || (await supabase.auth.getSession()).data.session?.access_token;
    const resolvedUser = data.user || (await supabase.auth.getUser()).data.user;

    if (!accessToken || !resolvedUser) {
      throw new Error('Não foi possível validar o código. Solicite um novo e tente novamente.');
    }

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
        result = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
      } else {
        result = await supabase.auth.signUp({
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
        });
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
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setNotice(null);
    setLoading(true);
    try {
      const callbackUrl = buildClientRedirectUrl('/auth/callback');
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: callbackUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      if (error) throw error;
    } catch (err: any) {
      const rawMessage = String(err?.message || '');
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
    <div className="theme-app-shell min-h-screen bg-slate-950 px-4 py-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-5xl items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-[420px] rounded-[2rem] border border-slate-800 bg-slate-900/95 p-7 shadow-[0_32px_120px_-60px_rgba(16,185,129,0.45)]"
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
            <h1 className="text-2xl font-black text-white">
              {isLogin ? 'Entre na sua conta' : 'Crie sua conta gratuita'}
            </h1>
            <p className="text-sm text-slate-400">
              {isLogin
                ? loginMethod === 'otp'
                  ? 'Receba um código no e-mail e valide sua entrada sem depender da senha.'
                  : 'Acesse seu workspace com segurança e continue de onde parou.'
                : 'Comece a organizar suas finanças em minutos.'}
            </p>
          </div>
        </div>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          {isLogin ? (
            <div className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-800 bg-slate-950/50 p-1">
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
                    ? 'bg-emerald-500 text-white'
                    : 'text-slate-400 hover:text-white'
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
                    ? 'bg-emerald-500 text-white'
                    : 'text-slate-400 hover:text-white'
                )}
              >
                Código por e-mail
              </button>
            </div>
          ) : null}

          {!isLogin && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs text-slate-500 font-bold uppercase tracking-widest">Nome</label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 py-3 px-4 text-white transition-all focus:outline-none focus:border-emerald-500"
                  placeholder="Seu nome"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-slate-500 font-bold uppercase tracking-widest">Sobrenome</label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 py-3 px-4 text-white transition-all focus:outline-none focus:border-emerald-500"
                  placeholder="Seu sobrenome"
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs text-slate-500 font-bold uppercase tracking-widest">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 py-3 px-4 text-white transition-all focus:outline-none focus:border-emerald-500"
              placeholder="seuemail@exemplo.com"
            />
          </div>
          {!isLogin || loginMethod === 'password' ? (
            <div className="space-y-2">
              <label className="text-xs text-slate-500 font-bold uppercase tracking-widest">Senha</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 py-3 px-4 text-white transition-all focus:outline-none focus:border-emerald-500"
                placeholder={isLogin ? 'Digite sua senha' : 'Crie uma senha segura'}
              />
              {isLogin ? (
                <p className="text-xs leading-relaxed text-slate-500">
                  Entre com a senha que você criou para acessar sua conta.
                </p>
              ) : (
                <div className="rounded-xl border border-slate-800 bg-slate-800/30 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                    Critérios da senha
                  </p>
                  <ul className="mt-3 space-y-2 text-sm text-slate-300">
                    {passwordChecks.map((rule) => (
                      <li key={rule.label} className="flex items-center gap-2">
                        <span
                          className={cn(
                            'inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold',
                            rule.valid
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-slate-700 text-slate-400'
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
            <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-800/30 p-4">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-white">
                  {otpRequestedEmail ? 'Digite o código recebido' : 'Receba um código de acesso'}
                </p>
                <p className="text-xs leading-relaxed text-slate-400">
                  {otpRequestedEmail
                    ? `Enviamos o código para ${otpRequestedEmail}. Digite esse código abaixo para entrar.`
                    : 'Vamos enviar um código real para o seu e-mail para validar sua entrada no app.'}
                </p>
              </div>

              {otpRequestedEmail ? (
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-500">
                    Código
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\s+/g, ''))}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 py-3 px-4 text-white transition-all focus:outline-none focus:border-emerald-500"
                    placeholder="Digite o código recebido"
                  />
                </div>
              ) : null}
            </div>
          )}

          {!isLogin && (
            <>
              <p className="rounded-xl border border-slate-800 bg-slate-800/40 px-4 py-3 text-xs text-slate-400">
                Empresa, telefone, segmento, quantidade de contas e objetivo financeiro podem ser definidos depois, no onboarding.
              </p>

              <div className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-800/30 px-4 py-3 text-xs text-slate-300">
                <input
                  id="accepted-terms"
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-0.5 rounded border-slate-600 bg-slate-900"
                />
                <div className="leading-relaxed">
                  <label htmlFor="accepted-terms" className="cursor-pointer">
                    Aceito os{' '}
                  </label>
                  <Link href="/termos-de-uso" target="_blank" rel="noreferrer" className="font-semibold text-emerald-300 hover:text-emerald-200">
                    termos de uso
                  </Link>
                  <span>{' '}e{' '}</span>
                  <Link
                    href="/politica-de-privacidade"
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-emerald-300 hover:text-emerald-200"
                  >
                    política de privacidade
                  </Link>
                  <span>.</span>
                </div>
              </div>
            </>
          )}

          {notice && <p className="text-emerald-400 text-xs font-bold leading-relaxed">{notice}</p>}
          {error && <p className="text-rose-500 text-xs font-bold leading-relaxed">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-emerald-500 py-3 text-sm font-bold text-white transition-all hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 disabled:opacity-50"
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
              className="w-full text-center text-xs font-semibold text-slate-400 transition hover:text-white disabled:opacity-50"
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
                className="text-xs font-semibold text-slate-400 transition hover:text-white disabled:opacity-50"
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
                className="text-xs font-semibold text-slate-400 transition hover:text-white"
              >
                Alterar e-mail
              </button>
            </div>
          ) : null}
        </form>

        <div className="relative my-7">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-800"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-slate-900 px-3 text-slate-500 font-bold">Ou continue com</span>
          </div>
        </div>

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-700 bg-slate-800 py-3 text-sm font-bold text-white transition-all hover:bg-slate-700 disabled:opacity-50"
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

        <p className="mt-7 text-center text-sm text-slate-500">
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
            className="ml-1 font-bold text-emerald-500 hover:underline"
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

  const setupUserOnServer = React.useCallback(async (accessToken?: string | null) => {
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
          if (typeof payload?.activeWorkspaceId === 'string') {
            setActiveWorkspaceId(payload.activeWorkspaceId);
          }
          if (Array.isArray(payload?.workspaces)) {
            setWorkspaces(
              payload.workspaces.map((workspace: any) => ({
                id: workspace.id,
                name: workspace.name,
                role: workspace.role,
              }))
            );
          }
          if (payload?.onboarding && typeof payload.onboarding.completed === 'boolean') {
            setIsWorkspaceOnboardingOpen(!payload.onboarding.completed);
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
          void setupUserOnServer(session.access_token);
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
      if (session?.access_token) {
        void setupUserOnServer(session.access_token);
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
  const [dataLoading, setDataLoading] = React.useState(false);
  const [totalBalance, setTotalBalance] = React.useState(0);
  const [dashboardInsights, setDashboardInsights] = React.useState<string[]>([]);
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
  const [loginModeFromQuery, setLoginModeFromQuery] = React.useState<'login' | 'signup'>('login');
  const [pendingPlanFromQuery, setPendingPlanFromQuery] = React.useState<string | null>(null);
  const [pendingPlanHandled, setPendingPlanHandled] = React.useState(false);

  React.useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const authMode = searchParams.get('auth');
    const pendingPlan = searchParams.get('plan');
    const requestedTab = searchParams.get('tab');
    if (authMode === 'signup' || authMode === 'login') {
      setLoginModeFromQuery(authMode);
    }
    if (pendingPlan) {
      setPendingPlanFromQuery(pendingPlan);
      setPendingPlanHandled(false);
    }
    if (
      requestedTab === 'dashboard' ||
      requestedTab === 'transactions' ||
      requestedTab === 'goals' ||
      requestedTab === 'debts' ||
      requestedTab === 'investments' ||
      requestedTab === 'portfolio' ||
      requestedTab === 'reports' ||
      requestedTab === 'assistant' ||
      requestedTab === 'integrations' ||
      requestedTab === 'subscription' ||
      requestedTab === 'settings' ||
      requestedTab === 'agenda'
    ) {
      setActiveTab(requestedTab);
    }
  }, []);

  const getAuthHeaders = React.useCallback(
    async (withJsonContentType = false) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Sessão expirada. Faça login novamente.');
      }

      return {
        ...(withJsonContentType ? { 'Content-Type': 'application/json' } : {}),
        Authorization: `Bearer ${session.access_token}`,
        ...(activeWorkspaceId ? { 'x-workspace-id': activeWorkspaceId } : {}),
      };
    },
    [activeWorkspaceId]
  );

  const fetchDashboardData = React.useCallback(async (options?: { silent?: boolean }) => {
    if (!user) return;
    const silent = Boolean(options?.silent);
    if (!silent) {
      setDataLoading(true);
    }
    const usageStorageKey = user?.id ? `cote-ai-usage-${user.id}-${getCurrentMonthKey()}` : null;
    try {
      let response = await fetch('/api/dashboard', {
        headers: await getAuthHeaders(),
      });
      if (!response.ok && response.status === 404) {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.access_token) {
          await setupUserOnServer(session.access_token);
          response = await fetch('/api/dashboard', {
            headers: await getAuthHeaders(),
          });
        }
      }
      if (!response.ok) {
        throw new Error(`Falha ao buscar dashboard (HTTP ${response.status}).`);
      }

      const data = await response.json();
      if (data.totalBalance !== undefined) {
        setTotalBalance(data.totalBalance);
      }
      if (data.plan) {
        setCurrentPlan(normalizePlan(data.plan));
      } else {
        setCurrentPlan('FREE');
      }
      if (data.limits?.reports === 'basic' || data.limits?.reports === 'full') {
        setReportAccessLevel(data.limits.reports);
      } else {
        setReportAccessLevel(data.plan === 'FREE' ? 'basic' : 'full');
      }
      if (typeof data.currentMonthTransactionCount === 'number') {
        setCurrentMonthTransactionCount(Math.max(0, data.currentMonthTransactionCount));
      }
      if (typeof data.currentMonthAiUsage === 'number') {
        const normalizedUsage = Math.max(0, data.currentMonthAiUsage);
        setAiUsageCount(normalizedUsage);
        if (usageStorageKey) {
          window.localStorage.setItem(usageStorageKey, String(normalizedUsage));
        }
      }
      if (Array.isArray(data.workspaces)) {
        setWorkspaces(
          data.workspaces.map((workspace: any) => ({
            id: workspace.id,
            name: workspace.name,
            role: workspace.role,
          }))
        );
      }
      if (Array.isArray(data.wallets)) {
        setWallets(
          data.wallets.map((wallet: any) => ({
            id: String(wallet.id),
            name: String(wallet.name || 'Conta'),
            balance: Number(wallet.balance || 0),
          }))
        );
      } else {
        setWallets([]);
      }
      if (typeof data.activeWorkspaceId === 'string') {
        setActiveWorkspaceId(data.activeWorkspaceId);
      }
      if (data.onboarding) {
        setIsWorkspaceOnboardingOpen(!data.onboarding.completed);
      }
      if (Array.isArray(data.recentEvents)) {
        setWorkspaceEvents(
          data.recentEvents.map((event: any) => ({
            id: String(event.id),
            type: String(event.type || 'workspace.event'),
            created_at: String(event.created_at || new Date().toISOString()),
            user_id: typeof event.user_id === 'string' ? event.user_id : null,
            payload:
              event.payload && typeof event.payload === 'object'
                ? (event.payload as Record<string, unknown>)
                : null,
          }))
        );
      } else {
        setWorkspaceEvents([]);
      }
      if (data.workspace) {
        const workspaceStatus = String(data.workspace.whatsapp_status || '').toUpperCase();
        setIsWhatsAppConnected(workspaceStatus === 'CONNECTED');
        if (typeof data.workspace.whatsapp_phone_number === 'string' && data.workspace.whatsapp_phone_number) {
          setWorkspaceWhatsAppPhoneNumber(`+${data.workspace.whatsapp_phone_number}`);
        } else {
          setWorkspaceWhatsAppPhoneNumber(DEFAULT_WHATSAPP_NUMBER);
        }
        setWorkspaceWhatsAppConnectTemplateName(
          typeof data.workspace.whatsapp_connect_template_name === 'string'
            ? data.workspace.whatsapp_connect_template_name
            : ''
        );
        setWorkspaceWhatsAppDigestTemplateName(
          typeof data.workspace.whatsapp_digest_template_name === 'string'
            ? data.workspace.whatsapp_digest_template_name
            : ''
        );
        setWorkspaceWhatsAppTemplateLanguage(
          typeof data.workspace.whatsapp_template_language === 'string' && data.workspace.whatsapp_template_language
            ? data.workspace.whatsapp_template_language
            : 'pt_BR'
        );
        setWorkspaceWhatsAppTestPhoneNumber(
          typeof data.workspace.whatsapp_test_phone_number === 'string' && data.workspace.whatsapp_test_phone_number
            ? `+${data.workspace.whatsapp_test_phone_number}`
            : ''
        );
      }
      if (Array.isArray(data.insights)) {
        setDashboardInsights(
          data.insights
            .filter((item: unknown) => typeof item === 'string')
            .map((item: string) => item.trim())
            .filter(Boolean)
        );
      } else {
        setDashboardInsights([]);
      }
      if (data.transactions) {
        const mappedTransactions = data.transactions.map((tx: any) => mapApiTransactionToClientTransaction(tx));
        setTransactions(mappedTransactions);
        if (typeof data.currentMonthTransactionCount !== 'number') {
          const localMonthCount = mappedTransactions.filter((tx: Transaction) =>
            isInCurrentMonth(parseTransactionDate(tx.date))
          ).length;
          setCurrentMonthTransactionCount(localMonthCount);
        }
      } else {
        setTransactions([]);
      }
      if (data.goals) {
        setGoals(data.goals.map((g: any) => ({
          id: g.id,
          name: g.name,
          target: Number(g.target_amount),
          current: Number(g.current_amount),
          category: g.category || 'Outros',
          deadline: g.deadline || null,
          icon: Wallet,
          color: 'text-emerald-500',
        })));
      } else {
        setGoals([]);
      }
      if (Array.isArray(data.investments)) {
        setInvestments(
          data.investments.map((item: any) => ({
            id: item.id,
            label: item.name,
            type: item.type || 'Outros',
            institution: item.institution || 'Não informado',
            invested: Number(item.invested_amount || 0),
            value: Number(item.current_amount || 0),
            expectedReturnAnnual: Number(item.expected_return_annual || 0),
            color: getInvestmentColor(item.type || 'Outros'),
          }))
        );
      } else {
        setInvestments([]);
      }
      if (Array.isArray(data.debts)) {
        setDebts(
          data.debts.map((item: any) => ({
            id: item.id,
            creditor: item.creditor,
            originalAmount: Number(item.original_amount || 0),
            remainingAmount: Number(item.remaining_amount || 0),
            interestRateMonthly: Number(item.interest_rate_monthly || 0),
            dueDay: Number(item.due_day || 1),
            category: item.category || 'Outros',
            status: String(item.status || '').toUpperCase() === 'PAID' ? 'Quitada' : 'Ativa',
          }))
        );
      } else {
        setDebts([]);
      }
      const resolvedWorkspaceId = typeof data.activeWorkspaceId === 'string' ? data.activeWorkspaceId : activeWorkspaceId;
      if (resolvedWorkspaceId) {
        workspaceDashboardCacheRef.current[resolvedWorkspaceId] = {
          totalBalance: data.totalBalance !== undefined ? Number(data.totalBalance) : 0,
          currentPlan: data.plan ? normalizePlan(data.plan) : 'FREE',
          reportAccessLevel:
            data.limits?.reports === 'basic' || data.limits?.reports === 'full'
              ? data.limits.reports
              : data.plan === 'FREE'
                ? 'basic'
                : 'full',
          currentMonthTransactionCount:
            typeof data.currentMonthTransactionCount === 'number' ? Math.max(0, data.currentMonthTransactionCount) : 0,
          aiUsageCount: typeof data.currentMonthAiUsage === 'number' ? Math.max(0, data.currentMonthAiUsage) : 0,
          transactions: data.transactions
            ? data.transactions.map((tx: any) => mapApiTransactionToClientTransaction(tx))
            : [],
          goals: data.goals
            ? data.goals.map((g: any) => ({
                id: g.id,
                name: g.name,
                target: Number(g.target_amount),
                current: Number(g.current_amount),
                category: g.category || 'Outros',
                deadline: g.deadline || null,
                icon: Wallet,
                color: 'text-emerald-500',
              }))
            : [],
          investments: Array.isArray(data.investments)
            ? data.investments.map((item: any) => ({
                id: item.id,
                label: item.name,
                type: item.type || 'Outros',
                institution: item.institution || 'Não informado',
                invested: Number(item.invested_amount || 0),
                value: Number(item.current_amount || 0),
                expectedReturnAnnual: Number(item.expected_return_annual || 0),
                color: getInvestmentColor(item.type || 'Outros'),
              }))
            : [],
          debts: Array.isArray(data.debts)
            ? data.debts.map((item: any) => ({
                id: item.id,
                creditor: item.creditor,
                originalAmount: Number(item.original_amount || 0),
                remainingAmount: Number(item.remaining_amount || 0),
                interestRateMonthly: Number(item.interest_rate_monthly || 0),
                dueDay: Number(item.due_day || 1),
                category: item.category || 'Outros',
                status: String(item.status || '').toUpperCase() === 'PAID' ? 'Quitada' : 'Ativa',
              }))
            : [],
          workspaceEvents: Array.isArray(data.recentEvents)
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
            : [],
          dashboardInsights: Array.isArray(data.insights)
            ? data.insights
                .filter((item: unknown) => typeof item === 'string')
                .map((item: string) => item.trim())
                .filter(Boolean)
            : [],
          isWhatsAppConnected:
            data.workspace && String(data.workspace.whatsapp_status || '').toUpperCase() === 'CONNECTED',
          workspaceWhatsAppPhoneNumber:
            data.workspace && typeof data.workspace.whatsapp_phone_number === 'string' && data.workspace.whatsapp_phone_number
              ? `+${data.workspace.whatsapp_phone_number}`
              : DEFAULT_WHATSAPP_NUMBER,
          workspaceWhatsAppTestPhoneNumber:
            data.workspace &&
            typeof data.workspace.whatsapp_test_phone_number === 'string' &&
            data.workspace.whatsapp_test_phone_number
              ? `+${data.workspace.whatsapp_test_phone_number}`
              : '',
          workspaceWhatsAppConnectTemplateName:
            data.workspace && typeof data.workspace.whatsapp_connect_template_name === 'string'
              ? data.workspace.whatsapp_connect_template_name
              : '',
          workspaceWhatsAppDigestTemplateName:
            data.workspace && typeof data.workspace.whatsapp_digest_template_name === 'string'
              ? data.workspace.whatsapp_digest_template_name
              : '',
          workspaceWhatsAppTemplateLanguage:
            data.workspace &&
            typeof data.workspace.whatsapp_template_language === 'string' &&
            data.workspace.whatsapp_template_language
              ? data.workspace.whatsapp_template_language
              : 'pt_BR',
        };
      }
      hasFetchedDashboardRef.current = true;
      // Update other states as needed
    } catch (error) {
      console.error('Fetch error:', error);
      if (!silent) {
        setTransactions([]);
        setGoals([]);
        setInvestments([]);
        setDebts([]);
        setDashboardInsights(['Não foi possível carregar os insights no momento.']);
      }
    } finally {
      if (!silent) {
        setDataLoading(false);
      }
    }
  }, [activeWorkspaceId, getAuthHeaders, setupUserOnServer, user]);

  React.useEffect(() => {
    if (user) {
      void fetchDashboardData({ silent: hasFetchedDashboardRef.current });
    }
  }, [user, fetchDashboardData]);
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
  const [isWhatsAppConnected, setIsWhatsAppConnected] = React.useState(false);
  const [isConnectingWhatsApp, setIsConnectingWhatsApp] = React.useState(false);
  const [isSendingWhatsAppTest, setIsSendingWhatsAppTest] = React.useState(false);
  const [isSavingWhatsAppConfig, setIsSavingWhatsAppConfig] = React.useState(false);
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
  const [settingsWhatsApp, setSettingsWhatsApp] = React.useState(DEFAULT_WHATSAPP_NUMBER);
  const [workspaceWhatsAppPhoneNumber, setWorkspaceWhatsAppPhoneNumber] = React.useState(DEFAULT_WHATSAPP_NUMBER);
  const [workspaceWhatsAppTestPhoneNumber, setWorkspaceWhatsAppTestPhoneNumber] = React.useState('');
  const [workspaceWhatsAppConnectTemplateName, setWorkspaceWhatsAppConnectTemplateName] = React.useState('');
  const [workspaceWhatsAppDigestTemplateName, setWorkspaceWhatsAppDigestTemplateName] = React.useState('');
  const [workspaceWhatsAppTemplateLanguage, setWorkspaceWhatsAppTemplateLanguage] = React.useState('pt_BR');
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
  const [transactionModalDraft, setTransactionModalDraft] = React.useState<Partial<TransactionFormData> | null>(
    null
  );

  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [goals, setGoals] = React.useState<Goal[]>([]);
  const [investments, setInvestments] = React.useState<Investment[]>([]);
  const [wallets, setWallets] = React.useState<WalletAccount[]>([]);
  const [bills, setBills] = React.useState<Bill[]>([]);
  const [debts, setDebts] = React.useState<Debt[]>([]);

  const [messages, setMessages] = React.useState<Message[]>([
    {
      role: 'model',
      text: 'Sou seu assistente financeiro com IA.\nPosso analisar seus gastos,\nmetas e investimentos.',
      time: 'Agora',
    },
  ]);

  const [input, setInput] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
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
  const lastUserIdRef = React.useRef<string | null>(null);
  const lastWorkspaceIdRef = React.useRef<string | null>(null);
  const hasFetchedDashboardRef = React.useRef(false);
  const quickCreateMenuRef = React.useRef<HTMLDivElement | null>(null);
  const avatarInputRef = React.useRef<HTMLInputElement | null>(null);
  const workspaceDashboardCacheRef = React.useRef<
    Record<
      string,
      {
        totalBalance: number;
        currentPlan: SubscriptionPlan;
        reportAccessLevel: ReportAccessLevel;
        currentMonthTransactionCount: number;
        aiUsageCount: number;
        transactions: Transaction[];
        goals: Goal[];
        investments: Investment[];
        debts: Debt[];
        workspaceEvents: WorkspaceEventItem[];
        dashboardInsights: string[];
        isWhatsAppConnected: boolean;
        workspaceWhatsAppPhoneNumber: string;
        workspaceWhatsAppTestPhoneNumber: string;
        workspaceWhatsAppConnectTemplateName: string;
        workspaceWhatsAppDigestTemplateName: string;
        workspaceWhatsAppTemplateLanguage: string;
      }
    >
  >({});

  React.useEffect(() => {
    const nextUserId = user?.id ?? null;
    if (lastUserIdRef.current !== nextUserId) {
      workspaceDashboardCacheRef.current = {};
      setTransactions([]);
      setGoals([]);
      setInvestments([]);
      setDebts([]);
      setBills([]);
      setWorkspaceEvents([]);
      setSubscriptionSummary(null);
      setSubscriptionError(null);
      setIsSubscriptionLoading(false);
      setSubscriptionActionLoading(null);
      setDashboardInsights([]);
      setTotalBalance(0);
      setCurrentPlan('FREE');
      setReportAccessLevel('basic');
      setCurrentMonthTransactionCount(0);
      setAiUsageCount(0);
      setIsWhatsAppConnected(false);
      setWorkspaceWhatsAppPhoneNumber(DEFAULT_WHATSAPP_NUMBER);
      setWorkspaceWhatsAppTestPhoneNumber('');
      setWorkspaceWhatsAppConnectTemplateName('');
      setWorkspaceWhatsAppDigestTemplateName('');
      setWorkspaceWhatsAppTemplateLanguage('pt_BR');
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
      lastWorkspaceIdRef.current = null;
      lastUserIdRef.current = nextUserId;
    }
  }, [user?.id]);

  React.useEffect(() => {
    if (!user?.id) return;
    if (lastWorkspaceIdRef.current === activeWorkspaceId) return;
    lastWorkspaceIdRef.current = activeWorkspaceId;
    if (!activeWorkspaceId) return;
    const cachedWorkspaceData = workspaceDashboardCacheRef.current[activeWorkspaceId];
    if (!cachedWorkspaceData) return;

    setTotalBalance(cachedWorkspaceData.totalBalance);
    setCurrentPlan(cachedWorkspaceData.currentPlan);
    setReportAccessLevel(cachedWorkspaceData.reportAccessLevel);
    setCurrentMonthTransactionCount(cachedWorkspaceData.currentMonthTransactionCount);
    setAiUsageCount(cachedWorkspaceData.aiUsageCount);
    setTransactions(cachedWorkspaceData.transactions);
    setGoals(cachedWorkspaceData.goals);
    setInvestments(cachedWorkspaceData.investments);
    setDebts(cachedWorkspaceData.debts);
    setWorkspaceEvents(cachedWorkspaceData.workspaceEvents);
    setDashboardInsights(cachedWorkspaceData.dashboardInsights);
    setIsWhatsAppConnected(cachedWorkspaceData.isWhatsAppConnected);
    setWorkspaceWhatsAppPhoneNumber(cachedWorkspaceData.workspaceWhatsAppPhoneNumber);
    setWorkspaceWhatsAppTestPhoneNumber(cachedWorkspaceData.workspaceWhatsAppTestPhoneNumber);
    setWorkspaceWhatsAppConnectTemplateName(cachedWorkspaceData.workspaceWhatsAppConnectTemplateName);
    setWorkspaceWhatsAppDigestTemplateName(cachedWorkspaceData.workspaceWhatsAppDigestTemplateName);
    setWorkspaceWhatsAppTemplateLanguage(cachedWorkspaceData.workspaceWhatsAppTemplateLanguage);
  }, [activeWorkspaceId, user?.id]);

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
    }

    if (payload.config && typeof payload.config === 'object') {
      setWorkspaceWhatsAppConnectTemplateName(
        typeof payload.config.connectTemplateName === 'string' ? payload.config.connectTemplateName : ''
      );
      setWorkspaceWhatsAppDigestTemplateName(
        typeof payload.config.digestTemplateName === 'string' ? payload.config.digestTemplateName : ''
      );
      setWorkspaceWhatsAppTemplateLanguage(
        typeof payload.config.templateLanguage === 'string' && payload.config.templateLanguage
          ? payload.config.templateLanguage
          : 'pt_BR'
      );
      setWorkspaceWhatsAppTestPhoneNumber(
        typeof payload.config.testPhoneNumber === 'string' && payload.config.testPhoneNumber
          ? `+${String(payload.config.testPhoneNumber).replace(/^\+/, '')}`
          : ''
      );
    }

    if (payload.diagnostic && typeof payload.diagnostic === 'object') {
      setWhatsAppDiagnostic(payload.diagnostic as WhatsAppDiagnostic);
    }
  }, []);

  const buildWhatsAppPayload = React.useCallback(
    () => ({
      phoneNumber: workspaceWhatsAppPhoneNumber,
      testPhoneNumber: workspaceWhatsAppTestPhoneNumber,
      connectTemplateName: workspaceWhatsAppConnectTemplateName,
      digestTemplateName: workspaceWhatsAppDigestTemplateName,
      templateLanguage: workspaceWhatsAppTemplateLanguage,
    }),
    [
      workspaceWhatsAppConnectTemplateName,
      workspaceWhatsAppDigestTemplateName,
      workspaceWhatsAppPhoneNumber,
      workspaceWhatsAppTemplateLanguage,
      workspaceWhatsAppTestPhoneNumber,
    ]
  );

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

  const handleSaveWhatsAppConfig = React.useCallback(async () => {
    setIsSavingWhatsAppConfig(true);
    setWhatsAppFeedback(null);
    try {
      const response = await fetch('/api/workspace/whatsapp', {
        method: 'POST',
        headers: await getAuthHeaders(true),
        body: JSON.stringify({
          action: 'save_config',
          ...buildWhatsAppPayload(),
        }),
      });
      const payload = await parseWhatsAppResponse(response);
      applyWhatsAppPayload(payload);
      setWhatsAppFeedback({
        tone: 'success',
        title: 'Configuração salva',
        message:
          typeof payload?.message === 'string'
            ? payload.message
            : 'As configurações do WhatsApp deste workspace foram salvas.',
      });
    } catch (error: any) {
      const message =
        typeof error?.payload?.error === 'string'
          ? error.payload.error
          : 'Não foi possível salvar a configuração do WhatsApp.';
      if (error?.payload?.diagnostic) {
        setWhatsAppDiagnostic(error.payload.diagnostic as WhatsAppDiagnostic);
      }
      setWhatsAppFeedback({
        tone: 'error',
        title: 'Falha ao salvar',
        message,
      });
    } finally {
      setIsSavingWhatsAppConfig(false);
    }
  }, [applyWhatsAppPayload, buildWhatsAppPayload, getAuthHeaders, parseWhatsAppResponse]);

  const handleRunWhatsAppDiagnostic = React.useCallback(async () => {
    setWhatsAppFeedback(null);
    try {
      const response = await fetch('/api/workspace/whatsapp', {
        method: 'POST',
        headers: await getAuthHeaders(true),
        body: JSON.stringify({
          action: 'diagnose',
          ...buildWhatsAppPayload(),
        }),
      });
      const payload = await parseWhatsAppResponse(response);
      applyWhatsAppPayload(payload);
      setWhatsAppFeedback({
        tone: payload?.success ? 'success' : 'info',
        title: payload?.success ? 'Validação concluída' : 'Revisão necessária',
        message:
          typeof payload?.message === 'string'
            ? payload.message
            : 'A validação do WhatsApp foi concluída.',
      });
    } catch (error: any) {
      const message =
        typeof error?.payload?.error === 'string'
          ? error.payload.error
          : 'Não foi possível validar a configuração do WhatsApp.';
      if (error?.payload?.diagnostic) {
        setWhatsAppDiagnostic(error.payload.diagnostic as WhatsAppDiagnostic);
      }
      setWhatsAppFeedback({
        tone: 'error',
        title: 'Falha na validação',
        message,
      });
    }
  }, [applyWhatsAppPayload, buildWhatsAppPayload, getAuthHeaders, parseWhatsAppResponse]);

  const handleConnectWhatsApp = React.useCallback(async () => {
    setIsConnectingWhatsApp(true);
    setWhatsAppFeedback(null);
    try {
      const response = await fetch('/api/workspace/whatsapp', {
        method: 'POST',
        headers: await getAuthHeaders(true),
        body: JSON.stringify({
          action: 'connect',
          ...buildWhatsAppPayload(),
        }),
      });
      const payload = await parseWhatsAppResponse(response);
      applyWhatsAppPayload(payload);
      setWhatsAppFeedback({
        tone: 'success',
        title: 'WhatsApp conectado',
        message:
          typeof payload?.message === 'string'
            ? payload.message
            : 'O WhatsApp deste workspace foi conectado com sucesso.',
      });
      void fetchDashboardData({ silent: true });
    } catch (error: any) {
      const message =
        typeof error?.payload?.error === 'string'
          ? error.payload.error
          : 'Não foi possível conectar o WhatsApp.';
      if (error?.payload?.diagnostic) {
        setWhatsAppDiagnostic(error.payload.diagnostic as WhatsAppDiagnostic);
      }
      setWhatsAppFeedback({
        tone: 'error',
        title: 'Falha na conexão',
        message,
      });
    } finally {
      setIsConnectingWhatsApp(false);
    }
  }, [applyWhatsAppPayload, buildWhatsAppPayload, fetchDashboardData, getAuthHeaders, parseWhatsAppResponse]);

  const handleDisconnectWhatsApp = React.useCallback(async () => {
    setWhatsAppFeedback(null);
    try {
      const response = await fetch('/api/workspace/whatsapp', {
        method: 'POST',
        headers: await getAuthHeaders(true),
        body: JSON.stringify({ action: 'disconnect' }),
      });
      const payload = await parseWhatsAppResponse(response);
      applyWhatsAppPayload(payload);
      setWorkspaceWhatsAppPhoneNumber(DEFAULT_WHATSAPP_NUMBER);
      setWhatsAppFeedback({
        tone: 'info',
        title: 'WhatsApp desconectado',
        message:
          typeof payload?.message === 'string'
            ? payload.message
            : 'O WhatsApp deste workspace foi desconectado.',
      });
      void fetchDashboardData({ silent: true });
    } catch (error: any) {
      const message =
        typeof error?.payload?.error === 'string'
          ? error.payload.error
          : 'Não foi possível desconectar o WhatsApp.';
      if (error?.payload?.diagnostic) {
        setWhatsAppDiagnostic(error.payload.diagnostic as WhatsAppDiagnostic);
      }
      setWhatsAppFeedback({
        tone: 'error',
        title: 'Falha ao desconectar',
        message,
      });
    }
  }, [applyWhatsAppPayload, fetchDashboardData, getAuthHeaders, parseWhatsAppResponse]);

  const handleSendWhatsAppTest = React.useCallback(async () => {
    setIsSendingWhatsAppTest(true);
    setWhatsAppFeedback(null);
    try {
      const response = await fetch('/api/workspace/whatsapp', {
        method: 'POST',
        headers: await getAuthHeaders(true),
        body: JSON.stringify({
          action: 'send_test',
          ...buildWhatsAppPayload(),
        }),
      });
      const payload = await parseWhatsAppResponse(response);
      applyWhatsAppPayload(payload);
      setWhatsAppFeedback({
        tone: 'success',
        title: 'Teste enviado',
        message:
          typeof payload?.message === 'string'
            ? payload.message
            : 'A mensagem de teste foi enviada para o WhatsApp.',
      });
    } catch (error: any) {
      const message =
        typeof error?.payload?.error === 'string'
          ? error.payload.error
          : 'Não foi possível enviar o teste do WhatsApp.';
      if (error?.payload?.diagnostic) {
        setWhatsAppDiagnostic(error.payload.diagnostic as WhatsAppDiagnostic);
      }
      setWhatsAppFeedback({
        tone: 'error',
        title: 'Falha no envio',
        message,
      });
    } finally {
      setIsSendingWhatsAppTest(false);
    }
  }, [applyWhatsAppPayload, buildWhatsAppPayload, getAuthHeaders, parseWhatsAppResponse]);

  const derivedAgendaBills = React.useMemo<Bill[]>(() => {
    const now = new Date();
    const agendaItems: Bill[] = [];

    for (const debt of debts) {
      if (debt.status !== 'Ativa') continue;
      const nextDueDate = getNextMonthDueDate(debt.dueDay, now);
      const daysUntil = getAgendaDayDiff(nextDueDate, now);
      if (daysUntil > 30) continue;

      agendaItems.push({
        id: `debt-${debt.id}`,
        label: debt.creditor,
        date: formatAgendaDate(nextDueDate),
        isoDate: nextDueDate.toISOString(),
        amount: debt.remainingAmount,
        icon: CreditCard,
        color: 'text-amber-300',
        bg: 'bg-amber-500/10',
        status: daysUntil < 0 ? 'overdue' : 'pending',
        kind: 'debt',
        helperText: `${debt.category} - vencimento todo dia ${String(debt.dueDay).padStart(2, '0')}`,
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
        color: 'text-cyan-300',
        bg: 'bg-cyan-500/10',
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
  }, [debts, goals]);

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
        title: 'Conecte o WhatsApp do workspace',
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
        setActiveTab(notification.targetTab);
        if (notification.targetTab === 'assistant') {
          setIsAssistantOpen(true);
        }
      }
    },
    [markNotificationAsRead, setActiveTab]
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
        institution: inv.institution,
        invested: inv.invested,
        currentValue: inv.value,
      }));

    const activeDebts = debts.filter((debt) => debt.status === 'Ativa');
    const totalDebtRemaining = activeDebts.reduce((acc, debt) => acc + debt.remainingAmount, 0);
    const totalDebtOriginal = activeDebts.reduce((acc, debt) => acc + debt.originalAmount, 0);
    const highestDebt = [...activeDebts].sort((a, b) => b.remainingAmount - a.remainingAmount)[0] ?? null;

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
        activeCount: activeDebts.length,
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
  }, [transactions, goals, investments, debts]);

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
    setSettingsWhatsApp((prev) =>
      prev !== DEFAULT_WHATSAPP_NUMBER ? prev : user.user_metadata?.phone || prev
    );
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

  React.useEffect(() => {
    if (!activeWorkspaceId) return;
    const currentWorkspace = workspaces.find((workspace) => workspace.id === activeWorkspaceId);
    if (currentWorkspace?.name) {
      setOnboardingWorkspaceName(currentWorkspace.name);
    }
  }, [activeWorkspaceId, workspaces]);

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
      categoryLabel: transportTotal > 0 ? 'transporte' : 'despesas variaveis',
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
      { label: 'Adicionar 3 despesas', done: expenseCount >= 3 },
      { label: 'Adicionar uma receita', done: incomeCount >= 1 },
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
      alert('Escolha uma imagem de até 5 MB.');
      return;
    }

    setIsAvatarProcessing(true);

    try {
      const optimizedAvatar = await optimizeAvatarFile(file);
      setSettingsAvatarUrl(optimizedAvatar);
      setSettingsSavedAt('Foto pronta. Clique em salvar alterações para concluir.');
    } catch (error) {
      console.error('Avatar processing error:', error);
      alert(error instanceof Error ? error.message : 'Falha ao processar a foto.');
    } finally {
      setIsAvatarProcessing(false);
    }
  };

  const handleSaveSettings = async () => {
    if (isAvatarProcessing) return;

    const normalizedPhone = settingsWhatsApp.replace(/[^\d+]/g, '');
    const normalizedAvatarUrl = settingsAvatarUrl.trim();
    setSettingsWhatsApp(normalizedPhone || DEFAULT_WHATSAPP_NUMBER);

    if (!isValidAvatarUrl(normalizedAvatarUrl)) {
      alert('A foto de perfil precisa ser uma imagem enviada pelo sistema ou uma URL http/https válida.');
      return;
    }

    try {
      const updatePayload: {
        email?: string;
        data?: {
          full_name?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
        };
      } = {
        data: {
          full_name: settingsName.trim() || null,
          phone: normalizedPhone || null,
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
        void setupUserOnServer(accessToken);
      }

      setSettingsSavedAt(
        `Alterações salvas às ${new Date().toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
        })}`
      );
    } catch (error) {
      console.error('Save settings error:', error);
      alert(error instanceof Error ? error.message : 'Falha ao salvar configurações.');
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
      alert(error instanceof Error ? error.message : 'Falha ao salvar onboarding.');
    } finally {
      setIsSavingOnboarding(false);
    }
  };

  const handleAddOnboardingFirstRecord = async () => {
    if (isSavingOnboardingRecord) return;

    const payload: TransactionFormData = {
      ...onboardingFirstRecord,
      flowType:
        onboardingFirstRecord.flowType === 'Transferência'
          ? 'Despesa'
          : onboardingFirstRecord.flowType,
      destinationWallet: '',
    };

    if (!payload.amount || parseMoneyInput(payload.amount) <= 0) {
      alert('Preencha um valor maior que zero.');
      return;
    }

    if (!payload.category.trim()) {
      alert('Selecione uma categoria.');
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

  const handleSendMessage = async (presetMessage?: string) => {
    const messageText = (presetMessage ?? input).trim();
    if (!messageText || isLoading) return;
    if (!consumeAiQuota()) return;

    const userMessage: Message = {
      role: 'user',
      text: messageText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: await getAuthHeaders(true),
        body: JSON.stringify({
          message: messageText,
          history: messages.map((m) => ({
            role: m.role,
            parts: [{ text: m.text }],
          })),
          context: {
            userName: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuário',
            activeTab,
            isWhatsAppConnected,
            financialSummary: assistantFinancialContext,
          },
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(typeof data?.error === 'string' ? data.error : 'Falha ao processar mensagem');
      }
      const text = typeof data?.text === 'string' ? data.text : '';

      if (text) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'model',
            text: text,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'model',
          text: `Desculpe, tive um problema técnico ao processar sua mensagem. ${
            error instanceof Error ? error.message : 'Tente novamente em alguns instantes.'
          }`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpgrade = React.useCallback(
    async (plan: string) => {
      try {
        const selectedPlan = parseCheckoutPlanLabel(plan);
        if (!selectedPlan) {
          alert('Plano invalido para checkout.');
          return;
        }

        window.location.href = getCheckoutPath({
          plan: selectedPlan.plan,
          interval: selectedPlan.interval,
          workspaceId: activeWorkspaceId,
        });
      } catch (error) {
        console.error('Upgrade error:', error);
        const message = error instanceof Error ? error.message : 'erro desconhecido';
        alert(`Erro ao iniciar upgrade: ${message}`);
      }
    },
    [activeWorkspaceId]
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
              'Este workspace ainda nao tem uma assinatura regularizada. Deseja abrir o checkout agora?'
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
        const message = error instanceof Error ? error.message : 'erro desconhecido';
        alert(`Erro ao abrir assinatura: ${message}`);
      } finally {
        setSubscriptionActionLoading(null);
      }
    },
    [buildPlanLabelFromSummary, getAuthHeaders, handleUpgrade, isFreePlan, subscriptionSummary]
  );
  const handleManageSubscription = React.useCallback(() => {
    setActiveTab('subscription');
    setIsProfileMenuOpen(false);
    setIsSidebarOpen(false);
  }, []);

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
        await fetchDashboardData();
      } catch (error) {
        console.error('Subscription action error:', error);
        setSubscriptionError(error instanceof Error ? error.message : 'Falha ao atualizar assinatura.');
      } finally {
        setSubscriptionActionLoading(null);
      }
    },
    [fetchDashboardData, getAuthHeaders]
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

    doc.text(`Total Receitas: ${formatCurrency(totalIncome)}`, 20, 45);
    doc.text(`Total Despesas: ${formatCurrency(totalExpenses)}`, 20, 55);
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
      alert('Valor inválido para transação.');
      return false;
    }
    if (flowType === 'Transferência') {
      if (!tx.destinationWallet.trim()) {
        alert('Selecione a conta de destino da transferência.');
        return false;
      }
      if (tx.destinationWallet === tx.wallet) {
        alert('Conta origem e destino não podem ser iguais.');
        return false;
      }
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
          typeof responseData?.error === 'string'
            ? responseData.error
            : 'Falha ao salvar transação.';
        setTransactions(previousTransactionsSnapshot);
        setTotalBalance(previousTotalBalance);
        setCurrentMonthTransactionCount(previousMonthCount);
        alert(message);
        return false;
      }

      const savedTransaction = mapApiTransactionToClientTransaction(responseData);
      setTransactions((current) =>
        sortTransactionsByNewest(current.map((item) => (item.id === optimisticId ? savedTransaction : item)))
      );
      setEditingTransactionId(null);
      void fetchDashboardData({ silent: true });
      return true;
    } catch (error) {
      setTransactions(previousTransactionsSnapshot);
      setTotalBalance(previousTotalBalance);
      setCurrentMonthTransactionCount(previousMonthCount);
      console.error('Save transaction error:', error);
      alert('Falha ao salvar transação. Tente novamente.');
      return false;
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
          typeof responseData?.error === 'string'
            ? responseData.error
            : 'Falha ao excluir transação.';
        setTransactions(previousTransactionsSnapshot);
        setTotalBalance(previousTotalBalance);
        setCurrentMonthTransactionCount(previousMonthCount);
        alert(message);
        return;
      }

      if (editingTransactionId === id) {
        setEditingTransactionId(null);
        setIsTransactionModalOpen(false);
      }

      void fetchDashboardData({ silent: true });
    } catch (error) {
      setTransactions(previousTransactionsSnapshot);
      setTotalBalance(previousTotalBalance);
      setCurrentMonthTransactionCount(previousMonthCount);
      console.error('Delete transaction error:', error);
      alert('Falha ao excluir transação. Tente novamente.');
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
    await fetchDashboardData();
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
        await fetchDashboardData();
      } catch (error) {
        alert(error instanceof Error ? error.message : 'Falha ao excluir meta.');
      }
    })();
  };

  const handleSubmitInvestment = async (inv: InvestmentFormData) => {
    const payload = {
      ...(editingInvestmentId ? { id: String(editingInvestmentId) } : {}),
      name: inv.name.trim(),
      type: inv.type,
      institution: inv.institution.trim(),
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
    await fetchDashboardData();
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
        await fetchDashboardData();
      } catch (error) {
        alert(error instanceof Error ? error.message : 'Falha ao excluir investimento.');
      }
    })();
  };

  const handleSubmitDebt = async (debt: DebtFormData) => {
    const payload = {
      ...(editingDebtId ? { id: String(editingDebtId) } : {}),
      creditor: debt.creditor.trim(),
      originalAmount: parseMoneyInput(debt.originalAmount),
      remainingAmount: parseMoneyInput(debt.remainingAmount),
      interestRateMonthly: Number(debt.interestRateMonthly || 0),
      dueDay: Number(debt.dueDay || 1),
      category: debt.category,
      status: debt.status,
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
    await fetchDashboardData();
  };

  const handleOpenCreateDebt = () => {
    setEditingDebtId(null);
    setIsDebtModalOpen(true);
  };

  const handleStartEditDebt = (id: string | number) => {
    setEditingDebtId(id);
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
          setIsDebtModalOpen(false);
        }
        await fetchDashboardData();
      } catch (error) {
        alert(error instanceof Error ? error.message : 'Falha ao excluir dívida.');
      }
    })();
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
            : `Falha ao criar workspace (HTTP ${response.status}).`;
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

  const handleOpenNew = () => {
    setIsQuickCreateOpen((prev) => !prev);
  };

  const handleQuickCreateTransaction = (
    flowType: TransactionFlowType,
    category?: string | null
  ) => {
    setActiveTab('transactions');
    setIsQuickCreateOpen(false);
    handleOpenCreateTransaction({
      flowType,
      category:
        category ||
        (flowType === 'Receita'
          ? TRANSACTION_CATEGORIES[6]
          : flowType === TRANSACTION_FLOW_TYPES[2]
            ? TRANSACTION_CATEGORIES[11]
            : TRANSACTION_CATEGORIES[0]),
      paymentMethod: getDefaultPaymentMethodForFlow(flowType),
      destinationWallet: flowType === TRANSACTION_FLOW_TYPES[2] ? '' : undefined,
    });
  };

  const handleQuickCreateResource = (targetTab: 'goals' | 'debts' | 'investments') => {
    setActiveTab(targetTab);
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

  if (authLoading) {
    return (
      <div className="theme-app-shell min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="size-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <LoginView onLoginSuccess={(u) => setUser(u)} initialMode={loginModeFromQuery} />;
  }

  return (
    <AppErrorBoundary>
      <div className="theme-app-shell flex h-screen overflow-hidden bg-slate-950">
      {showTutorial && <OnboardingTutorial onComplete={() => setShowTutorial(false)} />}

      <AnimatePresence>
        {isUpgradeLimitModalOpen && (
          <motion.div
            className="fixed inset-0 z-[130] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
              onClick={() => setIsUpgradeLimitModalOpen(false)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl"
            >
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1">
                <ArrowUpRight size={12} className="text-emerald-400" />
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                  Upgrade
                </span>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Limite do plano Free atingido</h3>
              <p className="text-sm text-slate-400 leading-relaxed mb-6">
                {upgradeLimitReason === 'transactions'
                  ? `Você chegou ao limite de ${FREE_TRANSACTION_LIMIT_PER_MONTH} transações no mês.`
                  : `Você chegou ao limite de ${FREE_AI_LIMIT_PER_MONTH} interações de IA no mês.`}{' '}
                Faça upgrade para Pro/Premium e continue sem bloqueios.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsUpgradeLimitModalOpen(false)}
                  className="flex-1 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-bold text-slate-300 hover:text-white transition-colors"
                >
                  Agora não
                </button>
                <button
                  onClick={() => {
                    setIsUpgradeLimitModalOpen(false);
                    setActiveTab('integrations');
                    void handleUpgrade('Pro Mensal');
                  }}
                  className="flex-1 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-600 transition-colors"
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
              className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: 16, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 16, opacity: 0, scale: 0.98 }}
              className="relative z-10 w-full max-w-lg rounded-t-[1.75rem] border-x border-t border-slate-800 bg-slate-900 p-5 shadow-2xl sm:rounded-3xl sm:border sm:p-6"
            >
              <div className="mx-auto mb-4 h-1.5 w-14 rounded-full bg-slate-700 sm:hidden" />
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-emerald-400">Nova conta</p>
                  <h3 className="text-xl font-bold text-white">Criar workspace</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">
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
                  className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-300 transition-colors hover:text-white"
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
                  <label className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-slate-400">
                    Nome da conta
                  </label>
                  <input
                    type="text"
                    value={newWorkspaceName}
                    onChange={(event) => setNewWorkspaceName(event.target.value)}
                    placeholder="Ex.: Empresa, Casa ou Projeto"
                    autoFocus
                    maxLength={80}
                    className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-slate-500 focus:border-emerald-500"
                  />
                </div>

                {createWorkspaceError && (
                  <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
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
                    className="rounded-2xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm font-bold text-slate-300 transition-colors hover:text-white"
                  >
                    Agora não
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingWorkspace}
                    className="rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
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
        {isWorkspaceOnboardingOpen && (
          <motion.div
            className="fixed inset-0 z-[135] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm" />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-3xl rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl"
            >
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-emerald-400 font-black mb-2">
                    Onboarding Cote Finance AI
                  </p>
                  <h3 className="text-xl font-bold text-white">Setup inteligente do seu workspace</h3>
                  <p className="text-sm text-slate-400">Etapa {onboardingStep + 1} de 9</p>
                </div>
                <button
                  onClick={() => setIsWorkspaceOnboardingOpen(false)}
                  className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-300 hover:text-white"
                >
                  Depois
                </button>
              </div>

              <div className="mb-6 h-2 w-full rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${onboardingFlowProgress}%` }}
                />
              </div>

              {onboardingStep === 0 && (
                <div className="space-y-6">
                  <div className="rounded-2xl border border-slate-800 bg-slate-800/40 p-6">
                    <h4 className="text-2xl font-bold text-white mb-2">Bem-vindo ao Cote Finance AI</h4>
                    <p className="text-sm text-slate-300 leading-relaxed">
                      Vamos configurar sua conta em menos de 1 minuto. Isso ajuda a IA a entender melhor suas finanças e
                      gerar insights mais úteis para você.
                    </p>
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={() => setOnboardingStep(1)}
                      className="rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-600"
                    >
                      Começar
                    </button>
                  </div>
                </div>
              )}

              {onboardingStep === 1 && (
                <div className="space-y-5">
                  <div>
                    <h4 className="text-xl font-bold text-white mb-1">Qual é seu principal objetivo financeiro?</h4>
                    <p className="text-sm text-slate-400">
                      Escolha o objetivo principal para personalizar seus insights.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {ONBOARDING_OBJECTIVES.map((objective) => (
                      <button
                        key={objective}
                        onClick={() => setOnboardingObjective(objective)}
                        className={cn(
                          'rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition-colors',
                          onboardingObjective === objective
                            ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300'
                            : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-500'
                        )}
                      >
                        {objective}
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-between">
                    <button
                      onClick={() => setOnboardingStep(0)}
                      className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-bold text-slate-300"
                    >
                      Voltar
                    </button>
                    <button
                      onClick={() => setOnboardingStep(2)}
                      className="rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-600"
                    >
                      Continuar
                    </button>
                  </div>
                </div>
              )}

              {onboardingStep === 2 && (
                <div className="space-y-5">
                  <div>
                    <h4 className="text-xl font-bold text-white mb-1">
                      Quantos lançamentos você pretende registrar por mês?
                    </h4>
                    <p className="text-sm text-slate-400">Isso ajuda a ajustar recomendações e limites iniciais.</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {ONBOARDING_USAGE_LEVELS.map((rangeLabel) => (
                      <button
                        key={rangeLabel}
                        onClick={() => setOnboardingProfile(rangeLabel)}
                        className={cn(
                          'rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition-colors',
                          onboardingProfile === rangeLabel
                            ? 'border-cyan-500 bg-cyan-500/10 text-cyan-300'
                            : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-500'
                        )}
                      >
                        {rangeLabel}
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-between">
                    <button
                      onClick={() => setOnboardingStep(1)}
                      className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-bold text-slate-300"
                    >
                      Voltar
                    </button>
                    <button
                      onClick={() => setOnboardingStep(3)}
                      className="rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-600"
                    >
                      Continuar
                    </button>
                  </div>
                </div>
              )}

              {onboardingStep === 3 && (
                <div className="space-y-5">
                  <div>
                    <h4 className="text-xl font-bold text-white mb-1">
                      Vamos adicionar seu primeiro registro financeiro
                    </h4>
                    <p className="text-sm text-slate-400">
                      Adicionar seus primeiros dados leva menos de 10 segundos.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {(['Receita', 'Despesa'] as TransactionFlowType[]).map((flowType) => (
                      <button
                        key={flowType}
                        onClick={() =>
                          setOnboardingFirstRecord((prev) => ({
                            ...prev,
                            flowType,
                            paymentMethod: getDefaultPaymentMethodForFlow(flowType),
                          }))
                        }
                        className={cn(
                          'rounded-2xl border px-4 py-3 text-sm font-bold transition-colors',
                          onboardingFirstRecord.flowType === flowType
                            ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300'
                            : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-500'
                        )}
                      >
                        {flowType}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs text-slate-500 font-bold uppercase tracking-widest">Valor</label>
                      <MoneyInput
                        value={onboardingFirstRecord.amount}
                        onChange={(value) =>
                          setOnboardingFirstRecord((prev) => ({
                            ...prev,
                            amount: value,
                          }))
                        }
                        placeholder="R$ 0,00"
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 px-4 text-sm text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-slate-500 font-bold uppercase tracking-widest">Categoria</label>
                      <select
                        value={onboardingFirstRecord.category}
                        onChange={(event) =>
                          setOnboardingFirstRecord((prev) => ({
                            ...prev,
                            category: event.target.value,
                          }))
                        }
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 px-4 text-sm text-white focus:outline-none focus:border-emerald-500"
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
                    <label className="text-xs text-slate-500 font-bold uppercase tracking-widest">
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
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 px-4 text-sm text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {onboardingFirstRecordAdded && (
                    <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                      Parabéns! Seu primeiro registro foi adicionado.
                    </div>
                  )}

                  <div className="flex justify-between">
                    <button
                      onClick={() => setOnboardingStep(2)}
                      className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-bold text-slate-300"
                    >
                      Voltar
                    </button>
                    <button
                      onClick={() => void handleAddOnboardingFirstRecord()}
                      disabled={isSavingOnboardingRecord || parseMoneyInput(onboardingFirstRecord.amount) <= 0}
                      className="rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-600 disabled:opacity-60"
                    >
                      {isSavingOnboardingRecord ? 'Adicionando...' : 'Adicionar registro'}
                    </button>
                  </div>
                </div>
              )}

              {onboardingStep === 4 && (
                <div className="space-y-5">
                  <div>
                    <h4 className="text-xl font-bold text-white mb-1">Este é seu painel financeiro</h4>
                    <p className="text-sm text-slate-400">Aqui você acompanha tudo em um único lugar.</p>
                  </div>
                  <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-5 space-y-3">
                    <p className="text-sm text-slate-200">Aqui você pode ver:</p>
                    <ul className="space-y-2 text-sm text-slate-300">
                      <li>saldo atual</li>
                      <li>despesas por categoria</li>
                      <li>evolução dos gastos</li>
                      <li>análises completas disponíveis no Pro</li>
                    </ul>
                  </div>
                  <div className="flex justify-between">
                    <button
                      onClick={() => setOnboardingStep(3)}
                      className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-bold text-slate-300"
                    >
                      Voltar
                    </button>
                    <button
                      onClick={() => setOnboardingStep(5)}
                      className="rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-600"
                    >
                      Continuar
                    </button>
                  </div>
                </div>
              )}

              {onboardingStep === 5 && (
                <div className="space-y-5">
                  <div>
                    <h4 className="text-xl font-bold text-white mb-1">Prévia das análises com IA</h4>
                    <p className="text-sm text-slate-400">
                      Este é um exemplo do tipo de insight automático disponível nos planos Pro e Premium.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-5 text-sm leading-relaxed text-emerald-100">
                    Você gastou {onboardingPrimaryInsight.percentage}% em{' '}
                    {String(onboardingPrimaryInsight.category || 'alimentação').toLowerCase()}. Se reduzir esse gasto em
                    10%, pode economizar aproximadamente{' '}
                    {formatCurrency(onboardingPrimaryInsight.monthlySaving)} por mês.
                  </div>
                  <div className="flex justify-between">
                    <button
                      onClick={() => setOnboardingStep(4)}
                      className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-bold text-slate-300"
                    >
                      Voltar
                    </button>
                    <button
                      onClick={() => {
                        setOnboardingInsightViewed(true);
                        setOnboardingStep(6);
                      }}
                      className="rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-600"
                    >
                      Entendi como funciona
                    </button>
                  </div>
                </div>
              )}

              {onboardingStep === 6 && (
                <div className="space-y-5">
                  <div>
                    <h4 className="text-xl font-bold text-white mb-1">Complete seu setup</h4>
                    <p className="text-sm text-slate-400">
                      Conclua estas ações para deixar sua conta pronta para análises mais avançadas.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-5 space-y-4">
                    <div className="h-2 w-full rounded-full bg-slate-700">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all"
                        style={{ width: `${onboardingChecklistProgress}%` }}
                      />
                    </div>
                    <p className="text-sm text-slate-300">Você completou {onboardingChecklistProgress}% do setup.</p>
                    <div className="space-y-2">
                      {onboardingChecklist.map((item) => (
                        <div key={item.label} className="flex items-center gap-2 text-sm text-slate-200">
                          <CheckCircle2 size={16} className={item.done ? 'text-emerald-400' : 'text-slate-500'} />
                          <span className={item.done ? 'text-emerald-300' : 'text-slate-300'}>{item.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <button
                      onClick={() => setOnboardingStep(5)}
                      className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-bold text-slate-300"
                    >
                      Voltar
                    </button>
                    <button
                      onClick={() => setOnboardingStep(7)}
                      className="rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-600"
                    >
                      Continuar
                    </button>
                  </div>
                </div>
              )}

              {onboardingStep === 7 && (
                <div className="space-y-5">
                  <div>
                    <h4 className="text-xl font-bold text-white mb-1">Exemplo de oportunidade detectada</h4>
                    <p className="text-sm text-slate-400">
                      Nos planos Pro e Premium, a IA destaca padrões e oportunidades automaticamente.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-cyan-500/25 bg-cyan-500/10 p-5 text-sm leading-relaxed text-cyan-100">
                    Você gastou {formatCurrency(onboardingAutomaticInsight.total)} em{' '}
                    {onboardingAutomaticInsight.categoryLabel} neste mês. Se reduzir 15% desse valor, pode economizar
                    aproximadamente {formatCurrency(onboardingAutomaticInsight.annualSaving)} por ano.
                  </div>
                  <div className="flex justify-between">
                    <button
                      onClick={() => setOnboardingStep(6)}
                      className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-bold text-slate-300"
                    >
                      Voltar
                    </button>
                    <button
                      onClick={() => setOnboardingStep(8)}
                      className="rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-600"
                    >
                      Ver análise completa
                    </button>
                  </div>
                </div>
              )}

              {onboardingStep === 8 && (
                <div className="space-y-5">
                  <div>
                    <h4 className="text-xl font-bold text-white mb-1">
                      Desbloqueie análises financeiras avançadas
                    </h4>
                    <p className="text-sm text-slate-400">Com o plano Pro você terá:</p>
                  </div>
                  <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-5">
                    <ul className="space-y-2 text-sm text-emerald-100">
                      <li>• insights financeiros completos</li>
                      <li>• previsões de saldo</li>
                      <li>• alertas de gastos fora do padrão</li>
                      <li>• resumos e lembretes no WhatsApp</li>
                      <li>• relatórios avançados</li>
                    </ul>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-slate-300">
                    <input
                      type="checkbox"
                      checked={onboardingAiSuggestionsEnabled}
                      onChange={(event) => setOnboardingAiSuggestionsEnabled(event.target.checked)}
                    />
                    Ativar sugestáes de IA para este workspace
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2 sm:justify-between">
                    <button
                      onClick={() => setOnboardingStep(7)}
                      className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-bold text-slate-300"
                    >
                      Voltar
                    </button>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        onClick={() => void handleCompleteWorkspaceOnboarding('FREE')}
                        disabled={isSavingOnboarding}
                        className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-bold text-slate-300 hover:text-white disabled:opacity-60"
                      >
                        Continuar no Free
                      </button>
                      <button
                        onClick={() => void handleCompleteWorkspaceOnboarding('PRO')}
                        disabled={isSavingOnboarding}
                        className="rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-600 disabled:opacity-60"
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
        initialData={editingInvestment}
      />

      <DebtModal
        isOpen={isDebtModalOpen}
        onClose={() => {
          setIsDebtModalOpen(false);
          setEditingDebtId(null);
        }}
        onSubmit={handleSubmitDebt}
        initialData={editingDebt}
      />
      {/* Sidebar Overlay for Mobile */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 z-[90] bg-slate-950/80 backdrop-blur-sm lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-[100] flex h-full max-w-[88vw] flex-shrink-0 flex-col border-r border-slate-900 bg-slate-950/96 backdrop-blur-xl transition-all duration-300 lg:relative lg:max-w-none lg:translate-x-0',
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full',
          isSidebarCollapsed ? 'w-[18rem] lg:w-24' : 'w-[18rem] lg:w-64'
        )}
      >
        <div className={cn('flex items-center justify-between gap-3', isSidebarCollapsed ? 'p-4' : 'p-6')} id="sidebar-logo">
          <Image
            src={isSidebarCollapsed ? sidebarCollapsedLogo : brandLogo}
            alt="Cote Finance AI - By Cote Juros"
            width={isSidebarCollapsed ? 48 : 420}
            height={isSidebarCollapsed ? 48 : 112}
            className={cn('h-auto transition-all duration-300', isSidebarCollapsed ? 'w-11' : 'w-full max-w-[280px]')}
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsSidebarCollapsed((current) => !current)}
              className="hidden h-10 w-10 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-slate-300 transition hover:border-slate-700 hover:text-white lg:inline-flex"
              title={isSidebarCollapsed ? 'Expandir menu' : 'Recolher menu'}
            >
              {isSidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </button>
            <button onClick={() => setIsSidebarOpen(false)} className="text-slate-500 hover:text-white lg:hidden">
              <X size={20} />
            </button>
          </div>
        </div>

        <nav className={cn('flex-1 py-4 space-y-1 overflow-y-auto custom-scrollbar', isSidebarCollapsed ? 'px-2' : 'px-4')}>
          <SidebarItem
            icon={LayoutDashboard}
            label="Dashboard"
            active={activeTab === 'dashboard'}
            collapsed={isSidebarCollapsed}
            onClick={() => {
              setActiveTab('dashboard');
              setIsSidebarOpen(false);
            }}
          />
          <SidebarItem
            icon={ReceiptText}
            label="Transações"
            active={activeTab === 'transactions'}
            collapsed={isSidebarCollapsed}
            onClick={() => {
              setActiveTab('transactions');
              setIsSidebarOpen(false);
            }}
          />
          <SidebarItem
            icon={Target}
            label="Metas"
            active={activeTab === 'goals'}
            collapsed={isSidebarCollapsed}
            onClick={() => {
              setActiveTab('goals');
              setIsSidebarOpen(false);
            }}
          />
          <SidebarItem
            icon={CreditCard}
            label="Dívidas"
            active={activeTab === 'debts'}
            collapsed={isSidebarCollapsed}
            onClick={() => {
              setActiveTab('debts');
              setIsSidebarOpen(false);
            }}
          />
          <SidebarItem
            icon={TrendingUp}
            label="Investimentos"
            active={activeTab === 'investments'}
            collapsed={isSidebarCollapsed}
            onClick={() => {
              setActiveTab('investments');
              setIsSidebarOpen(false);
            }}
          />
          <SidebarItem
            icon={Wallet}
            label="Carteira"
            active={activeTab === 'portfolio'}
            collapsed={isSidebarCollapsed}
            onClick={() => {
              setActiveTab('portfolio');
              setIsSidebarOpen(false);
            }}
          />
          <SidebarItem
            icon={PieChart}
            label="Relatórios"
            active={activeTab === 'reports'}
            collapsed={isSidebarCollapsed}
            onClick={() => {
              setActiveTab('reports');
              setIsSidebarOpen(false);
            }}
          />
          <SidebarItem
            icon={MessageSquare}
            label="Assistente IA"
            active={activeTab === 'assistant'}
            collapsed={isSidebarCollapsed}
            onClick={() => {
              setActiveTab('assistant');
              setIsAssistantOpen(true);
              setIsSidebarOpen(false);
            }}
          />
          <SidebarItem
            icon={Settings}
            label="Configurações"
            active={activeTab === 'settings'}
            collapsed={isSidebarCollapsed}
            onClick={() => {
              setActiveTab('settings');
              setIsSidebarOpen(false);
            }}
          />
        </nav>

        <div className="p-4">
          {isSidebarCollapsed ? (
            <div className="space-y-3">
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-2 py-3 text-center">
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500">{planLabel}</p>
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
                className="flex h-12 w-full items-center justify-center rounded-xl bg-emerald-500 text-slate-950 transition-all duration-200 hover:bg-emerald-400"
                title={isFreePlan ? 'Atualizar para Pro' : 'Gerenciar assinatura'}
              >
                <ArrowUpRight size={18} />
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="flex h-12 w-full items-center justify-center rounded-xl bg-slate-800 text-white transition-all duration-200 hover:bg-slate-700"
                title="Sair"
              >
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <>
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4">
                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-2">
                  Plano {planLabel}
                </p>
                <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                  {isFreePlan
                    ? `Free: até ${FREE_TRANSACTION_LIMIT_PER_MONTH} transações/mês e IA limitada (${aiUsageCount}/${FREE_AI_LIMIT_PER_MONTH}).`
                    : currentPlan === 'PREMIUM'
                    ? 'Seu plano atual possui lançamentos ilimitados, IA sem limite mensal e automações avançadas.'
                    : 'Seu plano Pro possui lançamentos ilimitados, relatórios completos, IA avançada e alertas no WhatsApp.'}
                </p>
                <button
                  onClick={() => {
                    if (isFreePlan) {
                      void handleUpgrade('Pro Mensal');
                      return;
                    }
                    handleManageSubscription();
                  }}
                  className="w-full bg-emerald-500 text-white text-xs font-bold py-2.5 rounded-xl hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/10"
                >
                  {isFreePlan ? 'Atualizar para Pro' : 'Gerenciar assinatura'}
                </button>
              </div>
              <button
                onClick={handleLogout}
                className="mt-4 flex w-full items-center justify-center gap-3 px-3 py-2 text-sm font-medium text-slate-500 transition-colors hover:text-white"
              >
                <LogOut size={18} /> Sair
              </button>
            </>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="sticky top-0 z-30 border-b border-slate-900 bg-slate-950/80 px-3 py-3 backdrop-blur-xl sm:px-4 lg:px-8">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden rounded-xl border border-slate-800 bg-slate-900 p-2 text-slate-400 hover:text-white"
            >
              <Menu size={20} />
            </button>
              <h2 className="max-w-[44vw] truncate text-base font-bold capitalize text-white sm:max-w-[18rem] lg:max-w-none lg:text-xl">
              {activeTab === 'dashboard'
                ? 'Dashboard'
                : activeTab === 'transactions'
                ? 'Transações'
                : activeTab === 'goals'
                ? 'Metas'
                : activeTab === 'debts'
                ? 'Dívidas'
                : activeTab === 'investments'
                ? 'Investimentos'
                : activeTab === 'portfolio'
                ? 'Carteira'
                : activeTab === 'reports'
                ? 'Relatórios'
                : activeTab === 'assistant'
                ? 'Assistente IA'
                : activeTab === 'agenda'
                ? 'Agenda'
                : activeTab === 'integrations'
                ? 'Integrações'
                : activeTab === 'subscription'
                ? 'Minha assinatura'
                : 'Configurações'}
              </h2>
            {workspaces.length > 0 && (
              <div className="hidden md:flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">
                  Conta
                </span>
                <select
                  value={activeWorkspaceId || ''}
                  onChange={(event) => {
                    const nextWorkspaceId = event.target.value;
                    if (!nextWorkspaceId || nextWorkspaceId === activeWorkspaceId) return;
                    setActiveWorkspaceId(nextWorkspaceId);
                  }}
                  className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  {workspaces.map((workspace) => (
                    <option key={workspace.id} value={workspace.id}>
                      {workspace.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleOpenCreateWorkspaceModal}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-800 bg-slate-900 text-[10px] font-bold uppercase tracking-widest text-slate-300 hover:text-white hover:border-emerald-500 transition-colors"
                >
                  + Conta
                </button>
              </div>
            )}
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
              className="hidden md:inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-3 py-2 text-xs font-bold text-white transition-all hover:bg-emerald-600"
            >
              <ArrowUpRight size={14} /> {isFreePlan ? 'Upgrade' : 'Assinatura'}
            </button>

            <div className="relative" ref={quickCreateMenuRef}>
              <button
                onClick={handleOpenNew}
                type="button"
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-xl border bg-slate-900 px-2.5 py-2 text-xs font-bold text-white transition-all sm:gap-2 sm:px-3',
                  isQuickCreateOpen ? 'border-emerald-500' : 'border-slate-800 hover:border-emerald-500'
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
                    className="fixed inset-0 z-40 bg-slate-950/60 md:hidden"
                  />
                  <div className="fixed inset-x-3 top-20 z-50 max-h-[calc(100vh-6rem)] overflow-y-auto rounded-2xl border border-slate-800 bg-slate-950/98 p-3 shadow-2xl backdrop-blur-xl md:absolute md:right-0 md:top-full md:mt-2 md:w-[22rem] md:max-h-[75vh] md:inset-x-auto">
                  <div className="mb-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                      {'Atalhos r\u00e1pidos'}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Crie um novo item com menos cliques.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => handleQuickCreateTransaction('Receita')}
                      className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-3 text-left text-white transition-colors hover:border-emerald-500/40 hover:bg-emerald-500/15"
                    >
                      <div className="mb-1 flex items-center gap-2 text-sm font-bold">
                        <ArrowUpRight size={15} className="text-emerald-400" />
                        Receita
                      </div>
                      <p className="text-[11px] text-slate-300">{'Entrada r\u00e1pida de sal\u00e1rio, pix ou freelance.'}</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickCreateTransaction('Despesa')}
                      className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-3 text-left text-white transition-colors hover:border-rose-500/40 hover:bg-rose-500/15"
                    >
                      <div className="mb-1 flex items-center gap-2 text-sm font-bold">
                        <ArrowDownRight size={15} className="text-rose-400" />
                        Despesa
                      </div>
                      <p className="text-[11px] text-slate-300">{'Registre um gasto sem navegar at\u00e9 a aba.'}</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickCreateTransaction(TRANSACTION_FLOW_TYPES[2])}
                      className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-3 py-3 text-left text-white transition-colors hover:border-cyan-500/40 hover:bg-cyan-500/15"
                    >
                      <div className="mb-1 flex items-center gap-2 text-sm font-bold">
                        <Workflow size={15} className="text-cyan-400" />
                        {'Transfer\u00eancia'}
                      </div>
                      <p className="text-[11px] text-slate-300">Movimente saldo entre contas e carteiras.</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickCreateResource('goals')}
                      className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-3 text-left text-white transition-colors hover:border-amber-500/40 hover:bg-amber-500/15"
                    >
                      <div className="mb-1 flex items-center gap-2 text-sm font-bold">
                        <Target size={15} className="text-amber-300" />
                        Meta
                      </div>
                      <p className="text-[11px] text-slate-300">Crie um objetivo financeiro e acompanhe o progresso.</p>
                    </button>
                  </div>

                  <div className="mt-3 rounded-xl border border-slate-800 bg-slate-900/70 p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                        Categorias mais usadas
                      </p>
                      <span className="text-[10px] text-slate-500">Abre como despesa</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {([
                        { value: TRANSACTION_CATEGORIES[0], label: 'Alimenta\u00e7\u00e3o' },
                        { value: TRANSACTION_CATEGORIES[1], label: 'Transporte' },
                        { value: TRANSACTION_CATEGORIES[5], label: 'Moradia' },
                        { value: TRANSACTION_CATEGORIES[2], label: 'Sa\u00fade' },
                        { value: TRANSACTION_CATEGORIES[4], label: 'Lazer' },
                      ] as const).map((quickCategory) => (
                        <button
                          key={quickCategory.value}
                          type="button"
                          onClick={() => handleQuickCreateTransaction('Despesa', quickCategory.value)}
                          className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1.5 text-[11px] font-semibold text-slate-200 transition-colors hover:border-emerald-500 hover:text-white"
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
                      className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-left text-xs font-bold text-slate-200 transition-colors hover:border-emerald-500 hover:text-white"
                    >
                      <div className="mb-1 flex items-center gap-2">
                        <CreditCard size={14} className="text-slate-400" />
                        {'D\u00edvida'}
                      </div>
                      <p className="text-[11px] font-medium text-slate-400">Adicione uma conta a pagar ou parcelamento.</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickCreateResource('investments')}
                      className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-left text-xs font-bold text-slate-200 transition-colors hover:border-emerald-500 hover:text-white"
                    >
                      <div className="mb-1 flex items-center gap-2">
                        <TrendingUp size={14} className="text-slate-400" />
                        Investimento
                      </div>
                      <p className="text-[11px] font-medium text-slate-400">Registre um ativo e acompanhe rendimento.</p>
                    </button>
                  </div>
                  </div>
                </>
              )}
            </div>

            <div className="relative hidden xl:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input
                type="text"
                placeholder="Buscar..."
                className="bg-slate-900 border border-slate-800 rounded-xl py-2 pl-10 pr-4 text-xs text-white focus:outline-none focus:border-emerald-500 transition-all w-64"
              />
            </div>

              <button
              onClick={() => setIsAssistantOpen(!isAssistantOpen)}
              className={cn(
                'p-2 rounded-xl border transition-all',
                isAssistantOpen
                  ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500'
                  : 'bg-slate-900 border border-slate-800 text-slate-500 hover:text-white'
              )}
            >
              <MessageSquare size={18} />
            </button>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsNotificationsOpen((current) => !current)}
                  className={cn(
                    'relative rounded-xl border border-slate-800 bg-slate-900 p-2 transition-all hover:text-white',
                    unreadNotifications.length > 0 ? 'text-white' : 'text-slate-500'
                  )}
                >
                  <Bell size={18} />
                  {unreadNotifications.length > 0 && (
                    <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full border-2 border-slate-950 bg-rose-500 px-1 text-[10px] font-bold leading-none text-white">
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
                        className="absolute right-0 z-50 mt-3 w-[min(26rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/95 shadow-2xl shadow-slate-950/40 backdrop-blur"
                      >
                        <div className="border-b border-slate-800 px-4 py-3">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-bold text-white">Notificações</p>
                              <p className="text-xs text-slate-400">
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
                                  className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-200 transition hover:border-emerald-500 hover:text-white"
                                >
                                  <CheckCircle2 size={12} />
                                  Marcar lidas
                                </button>
                              )}
                              {unreadNotifications.length > 0 && (
                                <span className="rounded-full border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-rose-200">
                                  {unreadNotifications.length} novas
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {visibleNotifications.length === 0 ? (
                          <div className="px-4 py-5">
                            <p className="text-sm text-slate-300">Nenhuma atualização pendente no momento.</p>
                            <p className="mt-1 text-xs text-slate-500">
                              Quando surgir algo importante sobre sua conta, assinatura ou agenda, isso aparece aqui.
                            </p>
                          </div>
                        ) : (
                          <div className="max-h-[26rem] overflow-y-auto p-2">
                            {unreadNotifications.length > 0 && (
                              <div className="px-2 pb-2 pt-1">
                                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">Novas</p>
                              </div>
                            )}
                            {unreadNotifications.map((notification) => (
                              <div
                                key={notification.id}
                                className="mb-2 rounded-2xl border border-slate-800 bg-slate-900/80 px-3 py-3"
                              >
                                <div className="flex items-start justify-between gap-3">
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
                                            ? 'bg-rose-500'
                                            : notification.tone === 'warning'
                                              ? 'bg-amber-400'
                                              : notification.tone === 'success'
                                                ? 'bg-emerald-500'
                                                : 'bg-cyan-400'
                                        )}
                                      />
                                      <p className="truncate text-sm font-semibold text-white">{notification.title}</p>
                                    </div>
                                    <p className="mt-1 text-sm leading-relaxed text-slate-300">{notification.message}</p>
                                  </button>
                                  <div className="flex shrink-0 flex-col items-end gap-2">
                                    {notification.timestamp && (
                                      <span className="text-[11px] text-slate-500">{notification.timestamp}</span>
                                    )}
                                    <div className="flex items-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() => markNotificationAsRead(notification.id)}
                                        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white"
                                        aria-label="Marcar como lida"
                                      >
                                        <CheckCircle2 size={14} />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => deleteNotification(notification.id)}
                                        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-rose-300"
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
                                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">Lidas</p>
                              </div>
                            )}
                            {readNotifications.map((notification) => (
                              <div
                                key={notification.id}
                                className="mb-2 rounded-2xl border border-transparent px-3 py-3 opacity-75 transition hover:border-slate-800 hover:bg-slate-900/50 hover:opacity-100"
                              >
                                <div className="flex items-start justify-between gap-3">
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
                                            ? 'bg-rose-500/70'
                                            : notification.tone === 'warning'
                                              ? 'bg-amber-400/70'
                                              : notification.tone === 'success'
                                                ? 'bg-emerald-500/70'
                                                : 'bg-cyan-400/70'
                                        )}
                                      />
                                      <p className="truncate text-sm font-medium text-slate-200">{notification.title}</p>
                                    </div>
                                    <p className="mt-1 text-sm leading-relaxed text-slate-400">{notification.message}</p>
                                  </button>
                                  <div className="flex shrink-0 flex-col items-end gap-2">
                                    {notification.timestamp && (
                                      <span className="text-[11px] text-slate-500">{notification.timestamp}</span>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => deleteNotification(notification.id)}
                                      className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-rose-300"
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
                className="size-10 rounded-full bg-slate-800 border border-slate-700 overflow-hidden cursor-pointer hover:border-emerald-500 transition-all flex items-center justify-center group"
              >
                <UserAvatar
                  user={user}
                  className="size-full"
                  fallbackClassName="border border-emerald-500/30"
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
                      className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden"
                    >
                      <div className="p-4 border-b border-slate-800">
                        <div className="flex items-center gap-3">
                          <UserAvatar
                            user={user}
                            className="size-12 border border-slate-700 bg-slate-800"
                            fallbackClassName="border border-emerald-500/30"
                            textClassName="text-base"
                          />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-white">{getUserDisplayName(user)}</p>
                            <p className="truncate text-xs text-slate-500">{user.email}</p>
                          </div>
                        </div>
                        <div
                          className={cn(
                            'mt-3 inline-block rounded border px-2 py-0.5',
                            isFreePlan
                              ? 'bg-slate-500/10 border-slate-500/20'
                              : 'bg-emerald-500/10 border-emerald-500/20'
                          )}
                        >
                          <span
                            className={cn(
                              'text-[10px] font-black uppercase tracking-widest',
                              isFreePlan ? 'text-slate-300' : 'text-emerald-500'
                            )}
                          >
                            Plano {planLabel}
                          </span>
                        </div>
                      </div>
                      <div className="p-2">
                        <button
                          onClick={() => {
                            setActiveTab('settings');
                            setIsProfileMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-white transition-all"
                        >
                          <Settings size={16} /> Configurações
                        </button>
                        <button
                          onClick={() => {
                            handleManageSubscription();
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-white transition-all"
                        >
                          <CreditCard size={16} /> Assinatura
                        </button>
                        <div className="h-px bg-slate-800 my-2" />
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-rose-500 hover:bg-rose-500/10 transition-all"
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

        {workspaces.length > 0 && (
          <div className="border-b border-slate-900/80 bg-slate-950/60 px-3 py-3 md:hidden">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Conta ativa</span>
                <button
                  onClick={handleOpenCreateWorkspaceModal}
                  className="rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-300 transition-colors hover:border-emerald-500 hover:text-white"
                >
                  + Conta
                </button>
              </div>
              <select
                value={activeWorkspaceId || ''}
                onChange={(event) => {
                  const nextWorkspaceId = event.target.value;
                  if (!nextWorkspaceId || nextWorkspaceId === activeWorkspaceId) return;
                  setActiveWorkspaceId(nextWorkspaceId);
                }}
                className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-3 text-sm text-white focus:outline-none focus:border-emerald-500"
              >
                {workspaces.map((workspace) => (
                  <option key={workspace.id} value={workspace.id}>
                    {workspace.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-8 custom-scrollbar">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'dashboard' && (
                <DashboardView
                  transactions={transactions}
                  insights={dashboardInsights}
                  onAddTransaction={handleOpenCreateTransaction}
                  currentPlan={currentPlan}
                  onUpgrade={() => void handleUpgrade('Pro Mensal')}
                />
              )}
              {activeTab === 'transactions' && (
                <TransactionsView
                  transactions={transactions}
                  onAddTransaction={handleOpenCreateTransaction}
                  onEditTransaction={handleStartEditTransaction}
                  onDeleteTransaction={handleDeleteTransaction}
                />
              )}
              {activeTab === 'goals' && (
                <GoalsView
                  goals={goals}
                  onAddGoal={handleOpenCreateGoal}
                  onEditGoal={handleStartEditGoal}
                  onDeleteGoal={handleDeleteGoal}
                />
              )}
              {activeTab === 'debts' && (
                <DebtsView
                  debts={debts}
                  onAddDebt={handleOpenCreateDebt}
                  onEditDebt={handleStartEditDebt}
                  onDeleteDebt={handleDeleteDebt}
                />
              )}
              {activeTab === 'investments' && (
                <InvestmentsView
                  investments={investments}
                  onAddInvestment={handleOpenCreateInvestment}
                  onEditInvestment={handleStartEditInvestment}
                  onDeleteInvestment={handleDeleteInvestment}
                />
              )}
              {activeTab === 'portfolio' && (
                <PortfolioView
                  wallets={wallets}
                  investments={investments}
                  debts={debts}
                  transactions={transactions}
                  totalBalance={totalBalance}
                />
              )}
              {activeTab === 'agenda' && <AgendaView bills={bills} />}
              {activeTab === 'reports' && (
                <ReportsView
                  transactions={transactions}
                  totalBalance={totalBalance}
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
                  isSendingWhatsAppTest={isSendingWhatsAppTest}
                  isSavingWhatsAppConfig={isSavingWhatsAppConfig}
                  whatsAppPhoneNumber={workspaceWhatsAppPhoneNumber}
                  whatsAppTestPhoneNumber={workspaceWhatsAppTestPhoneNumber}
                  whatsAppConnectTemplateName={workspaceWhatsAppConnectTemplateName}
                  whatsAppDigestTemplateName={workspaceWhatsAppDigestTemplateName}
                  whatsAppTemplateLanguage={workspaceWhatsAppTemplateLanguage}
                  whatsAppFeedback={whatsAppFeedback}
                  whatsAppDiagnostic={whatsAppDiagnostic}
                  onWhatsAppPhoneNumberChange={setWorkspaceWhatsAppPhoneNumber}
                  onWhatsAppTestPhoneNumberChange={setWorkspaceWhatsAppTestPhoneNumber}
                  onWhatsAppConnectTemplateNameChange={setWorkspaceWhatsAppConnectTemplateName}
                  onWhatsAppDigestTemplateNameChange={setWorkspaceWhatsAppDigestTemplateName}
                  onWhatsAppTemplateLanguageChange={setWorkspaceWhatsAppTemplateLanguage}
                  onSaveWhatsAppConfig={handleSaveWhatsAppConfig}
                  onRunWhatsAppDiagnostic={handleRunWhatsAppDiagnostic}
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
                <div className="max-w-3xl space-y-6 animate-in fade-in duration-500">
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="text-xl font-bold text-white">Configurações</h3>
                    <button
                      onClick={() => setActiveTab('integrations')}
                      className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs font-bold text-slate-300 hover:text-white transition-all"
                    >
                      Abrir Integrações
                    </button>
                  </div>

                  <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl space-y-4">
                    <h4 className="text-sm font-bold text-white uppercase tracking-widest">Perfil</h4>
                    <div className="flex flex-col gap-4 md:flex-row md:items-center">
                      <UserAvatar
                        user={user}
                        displayName={settingsName}
                        avatarUrl={settingsAvatarUrl}
                        className="size-20 border border-slate-700 bg-slate-800"
                        fallbackClassName="border border-emerald-500/30"
                        textClassName="text-2xl"
                      />
                      <div className="flex-1 space-y-2">
                        <div>
                          <label className="text-xs text-slate-500 font-bold uppercase tracking-widest">
                            Foto de perfil
                          </label>
                          <p className="mt-2 text-xs text-slate-500">
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
                            className="inline-flex items-center justify-center rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-bold text-slate-100 transition-all hover:border-emerald-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
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
                            className="inline-flex items-center justify-center rounded-xl border border-slate-700 px-4 py-2 text-sm font-bold text-slate-300 transition-all hover:border-rose-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Remover foto
                          </button>
                        </div>
                        <p className="text-xs text-slate-500">
                          Se não houver foto, o sistema mostra automaticamente as iniciais do usuário.
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs text-slate-500 font-bold uppercase tracking-widest">Nome</label>
                        <input
                          type="text"
                          value={settingsName}
                          onChange={(e) => setSettingsName(e.target.value)}
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 px-4 text-sm text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs text-slate-500 font-bold uppercase tracking-widest">E-mail</label>
                        <input
                          type="email"
                          value={settingsEmail}
                          onChange={(e) => setSettingsEmail(e.target.value)}
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 px-4 text-sm text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <h4 className="text-sm font-bold text-white uppercase tracking-widest mb-2">Plano atual</h4>
                      <div
                        className={cn(
                          'inline-flex items-center gap-2 px-3 py-1 rounded-full border',
                          isFreePlan
                            ? 'bg-slate-500/10 border-slate-500/20'
                            : 'bg-emerald-500/10 border-emerald-500/20'
                        )}
                      >
                        <span
                          className={cn(
                            'text-[10px] font-black uppercase tracking-widest',
                            isFreePlan ? 'text-slate-300' : 'text-emerald-500'
                          )}
                        >
                          {planLabel}
                        </span>
                        <span className="text-xs text-slate-300">Ativo</span>
                      </div>
                      {isFreePlan && (
                        <p className="mt-2 text-xs text-slate-400">
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
                      className="px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm font-bold text-slate-200 hover:text-white hover:border-emerald-500 transition-all"
                    >
                      {isFreePlan ? 'Fazer upgrade' : 'Gerenciar assinatura'}
                    </button>
                  </div>

                  <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl space-y-4">
                    <h4 className="text-sm font-bold text-white uppercase tracking-widest">WhatsApp</h4>
                    {isFreePlan ? (
                      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-3">
                        <p className="text-sm font-semibold text-amber-200">
                          Alertas e resumos no WhatsApp fazem parte do plano Pro.
                        </p>
                        <p className="text-sm text-slate-300">
                          Faça upgrade para receber lembretes financeiros e resumos automáticos no celular.
                        </p>
                        <button
                          onClick={() => void handleUpgrade('Pro Mensal')}
                          className="inline-flex items-center justify-center rounded-xl bg-emerald-500 px-4 py-2 text-sm font-bold text-white transition-all hover:bg-emerald-600"
                        >
                          Liberar WhatsApp no Pro
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-2">
                          <label className="text-xs text-slate-500 font-bold uppercase tracking-widest">Número</label>
                          <input
                            type="text"
                            value={settingsWhatsApp}
                            onChange={(e) => setSettingsWhatsApp(e.target.value)}
                            placeholder="+551199999999"
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 px-4 text-sm text-white focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                        <div className="rounded-xl border border-slate-800 bg-slate-800/30 p-4 space-y-2">
                          <p className="text-xs text-slate-400">Exemplos de mensagens:</p>
                          <p className="text-sm text-slate-200">&quot;gastei R$ 50 mercado&quot;</p>
                          <p className="text-sm text-slate-200">&quot;recebi R$ 200 pix&quot;</p>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl space-y-4">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-sm font-bold text-white uppercase tracking-widest">
                        Atividade do workspace
                      </h4>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                        {workspaceEvents.length} eventos
                      </span>
                    </div>
                    {workspaceEvents.length === 0 ? (
                      <p className="text-sm text-slate-400">
                        Nenhum evento recente encontrado para este workspace.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {workspaceEvents.slice(0, 8).map((event) => (
                          <div
                            key={event.id}
                            className="rounded-xl border border-slate-800 bg-slate-800/30 px-3 py-2 flex items-center justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-slate-100 truncate">
                                {getWorkspaceEventLabel(event.type)}
                              </p>
                              <p className="text-[11px] text-slate-500">
                                {event.user_id ? `Usuário: ${event.user_id.slice(0, 8)}...` : 'Sistema'}
                              </p>
                            </div>
                            <span className="text-[11px] text-slate-500 whitespace-nowrap">
                              {formatEventTimestamp(event.created_at)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="text-xs text-slate-500 min-h-4">{settingsSavedAt || ''}</div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleLogout}
                        className="px-4 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-sm font-bold text-rose-400 hover:bg-rose-500/20 transition-all"
                      >
                        Sair
                      </button>
                      <button
                        onClick={handleSaveSettings}
                        disabled={isAvatarProcessing}
                        className="px-4 py-2 rounded-xl bg-emerald-500 text-white text-sm font-bold hover:bg-emerald-600 transition-all disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Salvar alterações
                      </button>
                    </div>
                  </div>
                </div>
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
            className="fixed inset-y-0 right-0 z-[120] w-full sm:w-[420px] flex flex-col border-l border-slate-900 bg-slate-950/95 backdrop-blur-xl shadow-2xl"
          >
            <div className="p-6 border-b border-slate-900 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Assistente Cote</h3>
                  {isWhatsAppConnected && (
                    <div className="flex items-center gap-1 ml-2 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                      <MessageSquare size={8} className="text-emerald-500" />
                      <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">WhatsApp Ativo</span>
                    </div>
                  )}
                </div>
                <p className="text-xs text-slate-400">Pergunte qualquer coisa sobre suas finanças</p>
              </div>
              <button onClick={() => setIsAssistantOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
              {!hasUserMessages && (
                <div className="space-y-2">
                  <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">Sugestáes</p>
                  <div className="flex flex-wrap gap-2">
                    {ASSISTANT_SUGGESTIONS.map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => void handleSendMessage(suggestion)}
                        disabled={isLoading}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-300 hover:text-white hover:border-emerald-500 transition-all disabled:opacity-50"
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
                        ? 'bg-emerald-500 text-white rounded-tr-none'
                        : 'bg-slate-900 border border-slate-800 text-slate-300 rounded-tl-none'
                    )}
                  >
                    {msg.role === 'model' && i > 0 && (
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="text-emerald-500" size={14} />
                        <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Análise Cote</span>
                      </div>
                    )}
                    {msg.role === 'model' ? (
                      renderAssistantMessageText(msg.text)
                    ) : (
                      <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.text}</p>
                    )}
                  </div>
                  <span className={cn('text-[10px] text-slate-600 font-bold', msg.role === 'user' ? 'mr-1' : 'ml-1')}>
                    {msg.time}
                  </span>
                </div>
              ))}

              {isLoading && (
                <div className="flex items-center gap-2 text-slate-500 text-[10px] font-bold uppercase tracking-widest animate-pulse">
                  <Sparkles size={12} /> Cote está pensando...
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-900">
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
                  disabled={isLoading}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 pl-4 pr-10 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 transition-all disabled:opacity-50"
                />
                <button
                  onClick={() => void handleSendMessage()}
                  disabled={isLoading}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500 hover:text-emerald-400 transition-colors disabled:opacity-50"
                >
                  <Send size={16} />
                </button>
              </div>

              {isFreePlan && (
                <div className="mt-3 flex items-center justify-between gap-2">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                    IA Free: {aiUsageCount}/{FREE_AI_LIMIT_PER_MONTH}
                  </p>
                  {aiLimitReached && (
                    <button
                      onClick={() => openUpgradeLimitModal('ai')}
                      className="text-[10px] font-black uppercase tracking-widest text-emerald-400 hover:text-emerald-300 transition-colors"
                    >
                      Desbloquear IA
                    </button>
                  )}
                </div>
              )}

              <div className="mt-4 flex items-center justify-center gap-2 text-[10px] text-slate-600 font-bold uppercase tracking-widest">
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
            className="fixed bottom-8 right-8 size-14 bg-emerald-500 text-white rounded-full shadow-2xl shadow-emerald-500/20 flex items-center justify-center hover:scale-110 transition-all z-50"
          >
            <MessageSquare size={24} />
          </button>
        )}
      </div>
    </AppErrorBoundary>
  );
}


