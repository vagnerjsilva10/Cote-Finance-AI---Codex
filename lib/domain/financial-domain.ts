export const TRANSACTION_TYPES = ['INCOME', 'EXPENSE', 'TRANSFER'] as const;
export const TRANSACTION_STATUSES = ['PENDING', 'CONFIRMED', 'CANCELLED'] as const;
export const TRANSACTION_PAYMENT_METHODS = [
  'PIX',
  'CARD',
  'CASH',
  'BANK_TRANSFER',
  'BOLETO',
  'DEBIT',
  'OTHER',
] as const;

export const CONVENTIONAL_DEBT_STATUSES = ['OPEN', 'PAID', 'OVERDUE', 'INSTALLMENT'] as const;
export const LEGACY_DEBT_STATUSES = ['ACTIVE', 'PAID', 'OVERDUE', 'INSTALLMENT'] as const;
export const RECURRING_DEBT_STATUSES = ['ACTIVE', 'PAUSED', 'ENDED'] as const;

export const DERIVED_FINANCIAL_EVENT_SOURCE_TYPES = [
  'GOAL',
  'EXPENSE',
  'INCOME',
  'SUBSCRIPTION',
  'CARD_BILL',
  'INSTALLMENT',
] as const;

export const FINANCIAL_SOURCE_KINDS = [
  'goal',
  'transaction',
  'recurring-debt',
  'legacy-recurring-debt',
  'debt',
] as const;

export type TransactionType = (typeof TRANSACTION_TYPES)[number];
export type TransactionStatus = (typeof TRANSACTION_STATUSES)[number];
export type TransactionPaymentMethod = (typeof TRANSACTION_PAYMENT_METHODS)[number];
export type ConventionalDebtStatus = (typeof CONVENTIONAL_DEBT_STATUSES)[number];
export type LegacyDebtStatus = (typeof LEGACY_DEBT_STATUSES)[number];
export type RecurringDebtStatus = (typeof RECURRING_DEBT_STATUSES)[number];
export type DerivedFinancialEventSourceType = (typeof DERIVED_FINANCIAL_EVENT_SOURCE_TYPES)[number];
export type FinancialSourceKind = (typeof FINANCIAL_SOURCE_KINDS)[number];
export type FinancialEventStatus = 'PENDING' | 'PAID' | 'RECEIVED' | 'OVERDUE' | 'CANCELED';

const TRANSACTION_STATUS_ALIASES: Record<string, TransactionStatus> = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  CANCELLED: 'CANCELLED',
  CANCELED: 'CANCELLED',
};

const TRANSACTION_TYPE_ALIASES: Record<string, TransactionType> = {
  INCOME: 'INCOME',
  EXPENSE: 'EXPENSE',
  TRANSFER: 'TRANSFER',
};

const CONVENTIONAL_DEBT_STATUS_ALIASES: Record<string, ConventionalDebtStatus> = {
  OPEN: 'OPEN',
  ACTIVE: 'OPEN',
  PAID: 'PAID',
  QUITADA: 'PAID',
  OVERDUE: 'OVERDUE',
  ATRASADA: 'OVERDUE',
  INSTALLMENT: 'INSTALLMENT',
  PARCELADA: 'INSTALLMENT',
};

const RECURRING_DEBT_STATUS_ALIASES: Record<string, RecurringDebtStatus> = {
  ACTIVE: 'ACTIVE',
  ATIVA: 'ACTIVE',
  PAUSED: 'PAUSED',
  PAUSADA: 'PAUSED',
  ENDED: 'ENDED',
  ENCERRADA: 'ENDED',
};

const EVENT_STATUS_ALIASES: Record<string, FinancialEventStatus> = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  RECEIVED: 'RECEIVED',
  OVERDUE: 'OVERDUE',
  CANCELED: 'CANCELED',
  CANCELLED: 'CANCELED',
};

export type ParsedFinancialSourceRef =
  | {
      kind: FinancialSourceKind;
      id: string;
    }
  | {
      kind: 'unknown';
      id: string;
    };

function normalizeToken(value: string | null | undefined) {
  return String(value || '')
    .trim()
    .toUpperCase();
}

export function normalizeTransactionType(
  value: string | null | undefined
): TransactionType | null {
  const normalized = normalizeToken(value);
  return TRANSACTION_TYPE_ALIASES[normalized] || null;
}

export function normalizeTransactionStatus(
  value: string | null | undefined,
  fallback: TransactionStatus = 'PENDING'
): TransactionStatus {
  const normalized = normalizeToken(value);
  return TRANSACTION_STATUS_ALIASES[normalized] || fallback;
}

export function canTransitionTransactionStatus(params: {
  from: string | null | undefined;
  to: string | null | undefined;
  allowConfirmedCancellation?: boolean;
  allowConfirmedReopen?: boolean;
}) {
  const from = normalizeTransactionStatus(params.from);
  const to = normalizeTransactionStatus(params.to);

  if (from === to) return true;

  if (from === 'PENDING') {
    return to === 'CONFIRMED' || to === 'CANCELLED';
  }

  if (from === 'CONFIRMED') {
    if (to === 'CANCELLED') return Boolean(params.allowConfirmedCancellation);
    if (to === 'PENDING') return Boolean(params.allowConfirmedReopen);
    return false;
  }

  return false;
}

export function mapCalendarStatusToTransactionStatus(
  status: string | null | undefined
): TransactionStatus {
  const normalized = normalizeFinancialEventStatus(status);
  if (normalized === 'PAID' || normalized === 'RECEIVED') return 'CONFIRMED';
  if (normalized === 'CANCELED') return 'CANCELLED';
  return 'PENDING';
}

export function mapTransactionStatusToCalendarStatus(params: {
  transactionStatus: string | null | undefined;
  transactionType: string | null | undefined;
}): FinancialEventStatus {
  const status = normalizeTransactionStatus(params.transactionStatus);
  const type = normalizeTransactionType(params.transactionType);

  if (status === 'CONFIRMED') {
    return type === 'INCOME' ? 'RECEIVED' : 'PAID';
  }
  if (status === 'CANCELLED') return 'CANCELED';
  return 'PENDING';
}

export function normalizeConventionalDebtStatus(
  value: string | null | undefined,
  fallback: ConventionalDebtStatus = 'OPEN'
): ConventionalDebtStatus {
  const normalized = normalizeToken(value);
  return CONVENTIONAL_DEBT_STATUS_ALIASES[normalized] || fallback;
}

export function mapConventionalDebtStatusToLegacyDebtStatus(
  value: string | null | undefined
): LegacyDebtStatus {
  const normalized = normalizeConventionalDebtStatus(value);
  if (normalized === 'PAID') return 'PAID';
  if (normalized === 'OVERDUE') return 'OVERDUE';
  if (normalized === 'INSTALLMENT') return 'INSTALLMENT';
  return 'ACTIVE';
}

export function mapLegacyDebtStatusToConventionalDebtStatus(
  value: string | null | undefined
): ConventionalDebtStatus {
  return normalizeConventionalDebtStatus(value);
}

export function mapConventionalDebtStatusToCalendarStatus(
  value: string | null | undefined
): FinancialEventStatus {
  const normalized = normalizeConventionalDebtStatus(value);
  if (normalized === 'PAID') return 'PAID';
  if (normalized === 'OVERDUE') return 'OVERDUE';
  return 'PENDING';
}

export function mapCalendarStatusToConventionalDebtStatus(
  value: string | null | undefined
): ConventionalDebtStatus {
  const normalized = normalizeFinancialEventStatus(value);
  if (normalized === 'PAID' || normalized === 'RECEIVED') return 'PAID';
  if (normalized === 'OVERDUE') return 'OVERDUE';
  return 'OPEN';
}

export function normalizeRecurringDebtStatus(
  value: string | null | undefined,
  fallback: RecurringDebtStatus = 'ACTIVE'
): RecurringDebtStatus {
  const normalized = normalizeToken(value);
  return RECURRING_DEBT_STATUS_ALIASES[normalized] || fallback;
}

export function mapRecurringDebtStatusToLegacyDebtStatus(
  value: string | null | undefined
): LegacyDebtStatus {
  const normalized = normalizeRecurringDebtStatus(value);
  if (normalized === 'ENDED') return 'PAID';
  return 'ACTIVE';
}

export function mapLegacyDebtStatusToRecurringDebtStatus(
  value: string | null | undefined
): RecurringDebtStatus {
  const normalized = mapLegacyDebtStatusToConventionalDebtStatus(value);
  return normalized === 'PAID' ? 'ENDED' : 'ACTIVE';
}

export function normalizeFinancialEventStatus(
  value: string | null | undefined,
  fallback: FinancialEventStatus = 'PENDING'
): FinancialEventStatus {
  const normalized = normalizeToken(value);
  return EVENT_STATUS_ALIASES[normalized] || fallback;
}

export function buildFinancialSourceRef(kind: FinancialSourceKind, id: string) {
  return `${kind}:${id}`;
}

export function parseFinancialSourceRef(
  sourceId: string | null | undefined
): ParsedFinancialSourceRef {
  const raw = String(sourceId || '');
  if (!raw.includes(':')) return { kind: 'unknown', id: raw };

  const [kind, ...rest] = raw.split(':');
  const candidateKind = String(kind || '').trim() as FinancialSourceKind;
  const id = rest.join(':');
  if (!FINANCIAL_SOURCE_KINDS.includes(candidateKind)) {
    return { kind: 'unknown', id };
  }

  return {
    kind: candidateKind,
    id,
  };
}
