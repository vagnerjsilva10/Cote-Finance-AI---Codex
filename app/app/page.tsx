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

const FREE_TRANSACTION_LIMIT_PER_MONTH = 20;
const FREE_AI_LIMIT_PER_MONTH = 20;

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
    'ai.chat.used': 'Assistente IA utilizado',
    'ai.classify.used': 'Classificação automática usada',
  };

  return labels[eventType] || eventType.replace(/\./g, ' • ');
};

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

type SidebarItemProps = {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  onClick?: () => void;
};

const SidebarItem = ({ icon: Icon, label, active = false, onClick }: SidebarItemProps) => (
  <button
    onClick={onClick}
    className={cn(
      'flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 w-full text-left group',
      active
        ? 'bg-emerald-500/10 text-emerald-500 font-medium'
        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
    )}
  >
    <Icon
      size={20}
      className={cn(active ? 'text-emerald-500' : 'text-slate-500 group-hover:text-slate-300')}
    />
    <span className="text-sm">{label}</span>
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
};

const DashboardView = ({ transactions, insights, onAddTransaction }: DashboardViewProps) => {
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

            {insights.map((insight, index) => (
              <div
                key={`${index}-${insight.slice(0, 24)}`}
                className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4"
              >
                <p className="text-xs font-bold uppercase tracking-widest text-emerald-400 mb-2">
                  Insight automático
                </p>
                <p className="text-sm text-emerald-100/90">{insight}</p>
              </div>
            ))}
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
  isWhatsAppConnected: boolean;
  isConnectingWhatsApp: boolean;
  isSendingWhatsAppTest: boolean;
  onConnectWhatsApp: (phone: string) => void;
  onDisconnectWhatsApp: () => void;
  onSendWhatsAppTest: () => void;
};

const IntegrationsView = ({
  onUpgrade,
  isWhatsAppConnected,
  isConnectingWhatsApp,
  isSendingWhatsAppTest,
  onConnectWhatsApp,
  onDisconnectWhatsApp,
  onSendWhatsAppTest,
}: IntegrationsViewProps) => {
  const [billingCycle, setBillingCycle] = React.useState<'monthly' | 'annually'>('monthly');
  const [phoneNumber, setPhoneNumber] = React.useState('');

  const plans = [
    {
      name: 'Pro',
      monthlyPrice: 29,
      annualPrice: 290,
      active: false,
      features: [
        'Lançamentos ilimitados',
        'IA completa',
        'Relatórios avançados',
        'Metas ilimitadas',
        'Investimentos',
      ],
    },
    {
      name: 'Premium',
      monthlyPrice: 49,
      annualPrice: 490,
      active: false,
      features: [
        'Tudo do Pro',
        'Insights semanais automáticos',
        'Planejamento estratégico',
        'Suporte prioritário',
      ],
    },
  ];

  return (
    <div
      className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500"
      id="whatsapp-integration"
    >
      <div className="flex flex-col items-center space-y-6">
        <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={cn(
              'px-6 py-2 rounded-lg text-sm font-bold transition-all',
              billingCycle === 'monthly' ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-400'
            )}
          >
            Mensal
          </button>
          <button
            onClick={() => setBillingCycle('annually')}
            className={cn(
              'px-6 py-2 rounded-lg text-sm font-bold transition-all',
              billingCycle === 'annually' ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-400'
            )}
          >
            Anual <span className="text-[10px] ml-1 opacity-70">(2 meses grátis)</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={cn(
                'p-8 rounded-3xl border transition-all duration-300 relative bg-slate-900/50 border-slate-800 hover:border-slate-700'
              )}
            >
              <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-black text-white">
                  R$ {billingCycle === 'monthly' ? plan.monthlyPrice : plan.annualPrice}
                </span>
                <span className="text-slate-500 text-sm">
                  /{billingCycle === 'monthly' ? 'mês' : 'ano'}
                </span>
              </div>
              <button
                onClick={() => onUpgrade(`${plan.name} ${billingCycle === 'monthly' ? 'Mensal' : 'Anual'}`)}
                className="w-full py-4 rounded-2xl bg-emerald-500 text-white font-bold hover:bg-emerald-600 transition-all mb-8 shadow-lg shadow-emerald-500/20"
              >
                Escolher {plan.name}
              </button>
              <ul className="space-y-4">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-3 text-sm text-slate-400">
                    <CheckCircle2 size={16} className="text-emerald-500" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-slate-900/50 border border-slate-800 p-6 lg:p-8 rounded-3xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500">
              <MessageSquare size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Integração com WhatsApp</h3>
              <p className="text-sm text-slate-500">
                Alertas e resumos automáticos direto no seu celular
              </p>
            </div>
          </div>
          <div
            className={cn(
              'flex items-center self-start lg:self-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest',
              isWhatsAppConnected ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
            )}
          >
            <div
              className={cn(
                'size-1.5 rounded-full animate-pulse',
                isWhatsAppConnected ? 'bg-emerald-500' : 'bg-rose-500'
              )}
            />
            {isWhatsAppConnected ? 'Conectado' : 'Desconectado'}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="space-y-6">
            <p className="text-slate-400 leading-relaxed">
              Receba um resumo automático com insights do mês e próximos vencimentos no WhatsApp
              assim que sua integração estiver ativa.
            </p>

            <div className="space-y-4">
              {[
                'Informe o número que vai receber os alertas',
                'Conecte o WhatsApp do workspace',
                'Envie um teste e confirme que as mensagens chegaram',
              ].map((step, i) => (
                <div key={i} className="flex gap-4 items-start">
                  <div className="size-6 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-500 flex-shrink-0">
                    {i + 1}
                  </div>
                  <p className="text-sm text-slate-300">{step}</p>
                </div>
              ))}
            </div>

            {!isWhatsAppConnected && (
              <div className="space-y-2">
                <label className="text-xs text-slate-500 font-bold uppercase tracking-widest">Número do WhatsApp</label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+55 (11) 99999-9999"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-emerald-500 transition-all"
                />
              </div>
            )}

            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => onConnectWhatsApp(phoneNumber)}
                disabled={isWhatsAppConnected || isConnectingWhatsApp || (!isWhatsAppConnected && !phoneNumber)}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 px-8 py-3 rounded-xl font-bold transition-all shadow-lg',
                  isWhatsAppConnected || isConnectingWhatsApp || (!isWhatsAppConnected && !phoneNumber)
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-500/20'
                )}
              >
                {isWhatsAppConnected
                  ? 'WhatsApp Conectado'
                  : isConnectingWhatsApp
                  ? 'Conectando...'
                  : 'Conectar WhatsApp'}
              </button>

              {isWhatsAppConnected && (
                <button
                  onClick={onDisconnectWhatsApp}
                  className="flex-1 flex items-center justify-center gap-2 px-8 py-3 rounded-xl font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500 hover:text-white transition-all"
                >
                  Desconectar
                </button>
              )}
              </div>

              {isWhatsAppConnected && (
                <button
                  onClick={onSendWhatsAppTest}
                  disabled={isSendingWhatsAppTest}
                  className={cn(
                    'w-full rounded-xl border px-5 py-3 text-sm font-bold transition-all',
                    isSendingWhatsAppTest
                      ? 'cursor-not-allowed border-slate-800 bg-slate-900 text-slate-500'
                      : 'border-slate-700 bg-slate-900/70 text-slate-200 hover:border-emerald-500/50 hover:text-white'
                  )}
                >
                  {isSendingWhatsAppTest ? 'Enviando teste...' : 'Enviar teste agora'}
                </button>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-950/45 p-6 shadow-[0_18px_60px_rgba(2,6,23,0.28)]">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-500">Preview do WhatsApp</p>
                <h4 className="mt-2 text-lg font-black text-white">Resumo que chega no celular</h4>
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

            <div className="space-y-3 rounded-3xl border border-slate-800 bg-[#0b141a] p-4">
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
                : 'Nenhum vencimento cr?tico',
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
  onExportPDF: () => void;
  onExportCSV: () => void;
  onBeforeUseAI?: () => boolean;
  getApiHeaders: (withJsonContentType?: boolean) => Promise<Record<string, string>>;
};

const ReportsView = ({
  transactions,
  onExportPDF,
  onExportCSV,
  onBeforeUseAI,
  getApiHeaders,
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
              className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 px-4 text-sm text-white focus:outline-none focus:border-emerald-500"
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

  React.useEffect(() => {
    if (!isOpen) return;
    setFormData(getInitialFormData());
    setIsSubmitting(false);
    setSuggestedCategory(null);
    setIsLoadingSuggestion(false);
    setIsParsingReceipt(false);
    setReceiptStatus(null);
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
    <div className="theme-modal-backdrop fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="theme-modal-surface bg-slate-900 border border-slate-800 p-6 rounded-3xl max-w-lg w-full shadow-2xl my-6"
      >
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
                    'px-4 py-3.5 rounded-2xl text-sm font-bold transition-colors border flex items-center justify-center gap-2',
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs text-slate-500 font-bold uppercase tracking-widest">Data</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 px-4 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs text-slate-500 font-bold uppercase tracking-widest">Categoria</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 px-4 text-sm text-white focus:outline-none focus:border-emerald-500"
              >
                {TRANSACTION_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-slate-500 font-bold uppercase tracking-widest">
              Método de pagamento
            </label>
            <select
              value={formData.paymentMethod}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, paymentMethod: e.target.value as PaymentMethodLabel }))
              }
              className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 px-4 text-sm text-white focus:outline-none focus:border-emerald-500"
            >
              {PAYMENT_METHODS.map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-slate-500 font-bold uppercase tracking-widest">
              Comprovante (JPG, PNG, PDF)
            </label>
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.pdf"
              onChange={handleReceiptUpload}
              disabled={isParsingReceipt || isSubmitting}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 px-3 text-sm text-slate-300 file:mr-3 file:rounded-md file:border-0 file:bg-slate-700 file:px-3 file:py-1 file:text-xs file:font-bold file:text-slate-200 hover:file:bg-slate-600"
            />
            {receiptStatus && <p className="text-[11px] text-slate-400">{receiptStatus}</p>}
          </div>

          {formData.category === 'Auto (IA)' && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs text-emerald-300">
              A categoria sera classificada automaticamente com base na descricao.
            </div>
          )}

          {formData.flowType === 'Transferência' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs text-slate-500 font-bold uppercase tracking-widest">Conta origem</label>
                <select
                  value={formData.wallet}
                  onChange={(e) => setFormData((prev) => ({ ...prev, wallet: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 px-4 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  {TRANSACTION_WALLETS.map((wallet) => (
                    <option key={wallet} value={wallet}>
                      {wallet}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs text-slate-500 font-bold uppercase tracking-widest">Conta destino</label>
                <select
                  value={formData.destinationWallet}
                  onChange={(e) => setFormData((prev) => ({ ...prev, destinationWallet: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 px-4 text-sm text-white focus:outline-none focus:border-emerald-500"
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
          ) : (
            <div className="space-y-2">
              <label className="text-xs text-slate-500 font-bold uppercase tracking-widest">Conta / Carteira</label>
              <select
                value={formData.wallet}
                onChange={(e) => setFormData((prev) => ({ ...prev, wallet: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 px-4 text-sm text-white focus:outline-none focus:border-emerald-500"
              >
                {TRANSACTION_WALLETS.map((wallet) => (
                  <option key={wallet} value={wallet}>
                    {wallet}
                  </option>
                ))}
              </select>
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
  };

  const [activeTab, setActiveTab] = React.useState<Tab>('dashboard');
  const [dataLoading, setDataLoading] = React.useState(false);
  const [totalBalance, setTotalBalance] = React.useState(0);
  const [dashboardInsights, setDashboardInsights] = React.useState<string[]>([]);
  const [currentPlan, setCurrentPlan] = React.useState<SubscriptionPlan>('FREE');
  const [currentMonthTransactionCount, setCurrentMonthTransactionCount] = React.useState(0);
  const [aiUsageCount, setAiUsageCount] = React.useState(0);
  const [isUpgradeLimitModalOpen, setIsUpgradeLimitModalOpen] = React.useState(false);
  const [upgradeLimitReason, setUpgradeLimitReason] = React.useState<'transactions' | 'ai'>(
    'transactions'
  );
  const [workspaces, setWorkspaces] = React.useState<WorkspaceOption[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = React.useState<string | null>(null);
  const [isWorkspaceOnboardingOpen, setIsWorkspaceOnboardingOpen] = React.useState(false);
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
          setSettingsWhatsApp(`+${data.workspace.whatsapp_phone_number}`);
        }
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
          settingsWhatsApp:
            data.workspace && typeof data.workspace.whatsapp_phone_number === 'string' && data.workspace.whatsapp_phone_number
              ? `+${data.workspace.whatsapp_phone_number}`
              : DEFAULT_WHATSAPP_NUMBER,
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
  const [isProfileMenuOpen, setIsProfileMenuOpen] = React.useState(false);
  const [isQuickCreateOpen, setIsQuickCreateOpen] = React.useState(false);
  const [settingsName, setSettingsName] = React.useState('');
  const [settingsEmail, setSettingsEmail] = React.useState('');
  const [settingsWhatsApp, setSettingsWhatsApp] = React.useState(DEFAULT_WHATSAPP_NUMBER);
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
  const workspaceDashboardCacheRef = React.useRef<
    Record<
      string,
      {
        totalBalance: number;
        currentPlan: SubscriptionPlan;
        currentMonthTransactionCount: number;
        aiUsageCount: number;
        transactions: Transaction[];
        goals: Goal[];
        investments: Investment[];
        debts: Debt[];
        workspaceEvents: WorkspaceEventItem[];
        dashboardInsights: string[];
        isWhatsAppConnected: boolean;
        settingsWhatsApp: string;
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
      setCurrentMonthTransactionCount(0);
      setAiUsageCount(0);
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
    setCurrentMonthTransactionCount(cachedWorkspaceData.currentMonthTransactionCount);
    setAiUsageCount(cachedWorkspaceData.aiUsageCount);
    setTransactions(cachedWorkspaceData.transactions);
    setGoals(cachedWorkspaceData.goals);
    setInvestments(cachedWorkspaceData.investments);
    setDebts(cachedWorkspaceData.debts);
    setWorkspaceEvents(cachedWorkspaceData.workspaceEvents);
    setDashboardInsights(cachedWorkspaceData.dashboardInsights);
    setIsWhatsAppConnected(cachedWorkspaceData.isWhatsAppConnected);
    setSettingsWhatsApp(cachedWorkspaceData.settingsWhatsApp);
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
        helperText: `${debt.category} ? vencimento todo dia ${String(debt.dueDay).padStart(2, '0')}`,
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
    setSettingsName((prev) => prev || user.user_metadata?.full_name || user.email?.split('@')[0] || '');
    setSettingsEmail((prev) => prev || user.email || '');
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
    const hasInsight = onboardingInsightViewed || dashboardInsights.length > 0;

    return [
      { label: 'Adicionar 3 despesas', done: expenseCount >= 3 },
      { label: 'Adicionar uma receita', done: incomeCount >= 1 },
      { label: 'Criar uma meta financeira', done: hasGoal },
      { label: 'Ver seu primeiro insight da IA', done: hasInsight },
    ];
  }, [dashboardInsights.length, goals.length, onboardingCurrentMonthExpenses.length, onboardingCurrentMonthIncomeCount, onboardingInsightViewed]);

  const onboardingChecklistProgress = React.useMemo(() => {
    const completed = onboardingChecklist.filter((item) => item.done).length;
    return Math.round((completed / onboardingChecklist.length) * 100);
  }, [onboardingChecklist]);

  const onboardingFlowProgress = Math.round(((onboardingStep + 1) / 9) * 100);

  const handleSaveSettings = async () => {
    const normalizedPhone = settingsWhatsApp.replace(/[^\d+]/g, '');
    setSettingsWhatsApp(normalizedPhone || DEFAULT_WHATSAPP_NUMBER);

    try {
      const updatePayload: {
        email?: string;
        data?: {
          full_name?: string | null;
          phone?: string | null;
        };
      } = {
        data: {
          full_name: settingsName.trim() || null,
          phone: normalizedPhone || null,
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

  const handleCreateWorkspace = async () => {
    const name = window.prompt('Nome da nova conta/workspace');
    if (!name?.trim()) return;

    try {
      const response = await fetch('/api/workspaces', {
        method: 'POST',
        headers: await getAuthHeaders(true),
        body: JSON.stringify({
          name: name.trim(),
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
      setIsWorkspaceOnboardingOpen(true);
    } catch (error) {
      console.error('Create workspace error:', error);
      alert(error instanceof Error ? error.message : 'Falha ao criar workspace.');
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
                      <li>insights da inteligência artificial</li>
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
                    <h4 className="text-xl font-bold text-white mb-1">Sua primeira análise financeira</h4>
                    <p className="text-sm text-slate-400">A IA analisou seus primeiros dados.</p>
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
                      Ver mais insights
                    </button>
                  </div>
                </div>
              )}

              {onboardingStep === 6 && (
                <div className="space-y-5">
                  <div>
                    <h4 className="text-xl font-bold text-white mb-1">Complete seu setup</h4>
                    <p className="text-sm text-slate-400">Conclua estas ações para ativar todo o potencial da IA.</p>
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
                    <h4 className="text-xl font-bold text-white mb-1">Insight detectado</h4>
                    <p className="text-sm text-slate-400">A IA encontrou um padrão para economizar mais.</p>
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
          'fixed inset-y-0 left-0 z-[100] flex h-full w-[18rem] max-w-[88vw] flex-shrink-0 flex-col border-r border-slate-900 bg-slate-950/96 backdrop-blur-xl transition-transform duration-300 lg:relative lg:w-64 lg:max-w-none lg:translate-x-0',
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="p-6 flex items-center justify-between" id="sidebar-logo">
          <Image
            src={brandLogo}
            alt="Cote Finance AI - By Cote Juros"
            width={420}
            height={112}
            className="h-auto w-full max-w-[280px]"
          />
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-slate-500 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto custom-scrollbar">
          <SidebarItem icon={LayoutDashboard} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => { setActiveTab('dashboard'); setIsSidebarOpen(false); }} />
          <SidebarItem icon={ReceiptText} label="Transações" active={activeTab === 'transactions'} onClick={() => { setActiveTab('transactions'); setIsSidebarOpen(false); }} />
          <SidebarItem icon={Target} label="Metas" active={activeTab === 'goals'} onClick={() => { setActiveTab('goals'); setIsSidebarOpen(false); }} />
          <SidebarItem icon={CreditCard} label="Dívidas" active={activeTab === 'debts'} onClick={() => { setActiveTab('debts'); setIsSidebarOpen(false); }} />
          <SidebarItem icon={TrendingUp} label="Investimentos" active={activeTab === 'investments'} onClick={() => { setActiveTab('investments'); setIsSidebarOpen(false); }} />
          <SidebarItem icon={PieChart} label="Relatórios" active={activeTab === 'reports'} onClick={() => { setActiveTab('reports'); setIsSidebarOpen(false); }} />
          <SidebarItem icon={MessageSquare} label="Assistente IA" active={activeTab === 'assistant'} onClick={() => { setActiveTab('assistant'); setIsAssistantOpen(true); setIsSidebarOpen(false); }} />
          <SidebarItem icon={Settings} label="Configurações" active={activeTab === 'settings'} onClick={() => { setActiveTab('settings'); setIsSidebarOpen(false); }} />
        </nav>

        <div className="p-4">
          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4">
            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-2">
              Plano {planLabel}
            </p>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              {isFreePlan
                ? `Free: até ${FREE_TRANSACTION_LIMIT_PER_MONTH} transações/mês e IA limitada (${aiUsageCount}/${FREE_AI_LIMIT_PER_MONTH}).`
                : 'Seu plano atual possui lançamentos e IA ilimitados.'}
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
            className="w-full mt-4 flex items-center gap-3 px-3 py-2 text-slate-500 hover:text-white transition-colors text-sm font-medium"
          >
            <LogOut size={18} /> Sair
          </button>
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
                  onClick={() => void handleCreateWorkspace()}
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

              <button
              onClick={() => alert('Sem notificações novas no momento.')}
              className="relative hidden rounded-xl border border-slate-800 bg-slate-900 p-2 text-slate-500 transition-all hover:text-white sm:block"
            >
              <Bell size={18} />
              <span className="absolute top-2 right-2 size-2 bg-rose-500 rounded-full border-2 border-slate-950" />
            </button>

            <div className="relative">
              <button
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                className="size-10 rounded-full bg-slate-800 border border-slate-700 overflow-hidden cursor-pointer hover:border-emerald-500 transition-all flex items-center justify-center group"
              >
                <div className="w-full h-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-300 font-bold text-sm">
                  VS
                </div>
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
                        <p className="text-sm font-bold text-white">
                          {user.user_metadata?.full_name || user.email?.split('@')[0]}
                        </p>
                        <p className="text-xs text-slate-500">{user.email}</p>
                        <div
                          className={cn(
                            'mt-2 inline-block px-2 py-0.5 rounded border',
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
                  onClick={() => void handleCreateWorkspace()}
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
              {activeTab === 'agenda' && <AgendaView bills={bills} />}
              {activeTab === 'reports' && (
                <ReportsView
                  transactions={transactions}
                  onExportPDF={handleExportPDF}
                  onExportCSV={handleExportCSV}
                  onBeforeUseAI={consumeAiQuota}
                  getApiHeaders={getAuthHeaders}
                />
              )}
              {activeTab === 'assistant' && (
                <AssistantTabView onOpenAssistant={() => setIsAssistantOpen(true)} />
              )}
              {activeTab === 'integrations' && (
                <IntegrationsView
                  onUpgrade={handleUpgrade}
                  isWhatsAppConnected={isWhatsAppConnected}
                  isConnectingWhatsApp={isConnectingWhatsApp}
                  isSendingWhatsAppTest={isSendingWhatsAppTest}
                  onConnectWhatsApp={async (phone) => {
                    setIsConnectingWhatsApp(true);
                    try {
                      const response = await fetch('/api/workspace/whatsapp', {
                        method: 'POST',
                        headers: await getAuthHeaders(true),
                        body: JSON.stringify({ action: 'connect', phoneNumber: phone }),
                      });
                      const payload = await response.json().catch(() => ({}));
                      if (!response.ok) {
                        throw new Error(
                          typeof payload?.error === 'string'
                            ? payload.error
                            : `Falha ao conectar WhatsApp (HTTP ${response.status})`
                        );
                      }
                      setIsWhatsAppConnected(true);
                      alert('WhatsApp conectado com sucesso.');
                    } catch (error) {
                      console.error('WhatsApp connect error:', error);
                      alert(error instanceof Error ? error.message : 'Falha ao conectar WhatsApp.');
                    } finally {
                      setIsConnectingWhatsApp(false);
                    }
                  }}
                  onDisconnectWhatsApp={async () => {
                    try {
                      const response = await fetch('/api/workspace/whatsapp', {
                        method: 'POST',
                        headers: await getAuthHeaders(true),
                        body: JSON.stringify({ action: 'disconnect' }),
                      });
                      const payload = await response.json().catch(() => ({}));
                      if (!response.ok) {
                        throw new Error(
                          typeof payload?.error === 'string'
                            ? payload.error
                            : `Falha ao desconectar WhatsApp (HTTP ${response.status})`
                        );
                      }
                      setIsWhatsAppConnected(false);
                      alert('WhatsApp desconectado.');
                    } catch (error) {
                      console.error('WhatsApp disconnect error:', error);
                      alert(error instanceof Error ? error.message : 'Falha ao desconectar WhatsApp.');
                    }
                  }}
                  onSendWhatsAppTest={async () => {
                    setIsSendingWhatsAppTest(true);
                    try {
                      const response = await fetch('/api/workspace/whatsapp', {
                        method: 'POST',
                        headers: await getAuthHeaders(true),
                        body: JSON.stringify({ action: 'send_test' }),
                      });
                      const payload = await response.json().catch(() => ({}));
                      if (!response.ok) {
                        throw new Error(
                          typeof payload?.error === 'string'
                            ? payload.error
                            : `Falha ao enviar teste (HTTP ${response.status})`
                        );
                      }
                      alert('Resumo de teste enviado para o WhatsApp conectado.');
                    } catch (error) {
                      console.error('WhatsApp test send error:', error);
                      alert(error instanceof Error ? error.message : 'Falha ao enviar teste do WhatsApp.');
                    } finally {
                      setIsSendingWhatsAppTest(false);
                    }
                  }}
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
                        className="px-4 py-2 rounded-xl bg-emerald-500 text-white text-sm font-bold hover:bg-emerald-600 transition-all"
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
