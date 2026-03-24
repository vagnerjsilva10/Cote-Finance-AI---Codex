export const CANONICAL_TRANSACTION_TYPES = ['INCOME', 'EXPENSE', 'TRANSFER'] as const;
export const CANONICAL_TRANSACTION_STATUSES = ['PLANNED', 'CONFIRMED', 'CANCELED'] as const;

export type CanonicalTransactionType = (typeof CANONICAL_TRANSACTION_TYPES)[number];
export type CanonicalTransactionStatus = (typeof CANONICAL_TRANSACTION_STATUSES)[number];

export type CanonicalTransaction = {
  id: string;
  workspaceId: string;
  walletId: string;
  destinationWalletId: string | null;
  categoryId: string | null;
  type: CanonicalTransactionType;
  status: CanonicalTransactionStatus;
  amount: number;
  transactionDate: string;
  effectiveDate: string;
  createdAt: string;
  recurrenceRuleId: string | null;
  debtContractId: string | null;
  paymentMethod: string | null;
  receiptUrl: string | null;
  originType: string | null;
  originId: string | null;
};

export function mapStoredTransactionStatusToCanonical(
  status: string | null | undefined
): CanonicalTransactionStatus {
  const normalized = String(status || 'CONFIRMED')
    .trim()
    .toUpperCase();

  if (normalized === 'PENDING') return 'PLANNED';
  if (normalized === 'CANCELLED' || normalized === 'CANCELED') return 'CANCELED';
  return 'CONFIRMED';
}

export function mapCanonicalTransactionStatusToStored(
  status: CanonicalTransactionStatus
): 'PENDING' | 'CONFIRMED' | 'CANCELLED' {
  if (status === 'PLANNED') return 'PENDING';
  if (status === 'CANCELED') return 'CANCELLED';
  return 'CONFIRMED';
}

export function mapStoredTransactionTypeToCanonical(
  type: string | null | undefined
): CanonicalTransactionType {
  const normalized = String(type || 'EXPENSE')
    .trim()
    .toUpperCase();

  if (normalized === 'PIX_IN') return 'INCOME';
  if (normalized === 'PIX_OUT') return 'EXPENSE';
  if (normalized === 'TRANSFER') return 'TRANSFER';
  if (normalized === 'INCOME') return 'INCOME';
  return 'EXPENSE';
}
