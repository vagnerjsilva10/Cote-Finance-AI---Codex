import {
  mapConventionalDebtStatusToLegacyDebtStatus as mapConventionalDebtStatusToLegacyDebtStatusDomain,
  mapLegacyDebtStatusToConventionalDebtStatus as mapLegacyDebtStatusToConventionalDebtStatusDomain,
  normalizeRecurringDebtStatus as normalizeRecurringDebtStatusDomain,
  type ConventionalDebtStatus as ConventionalDebtStatusDomain,
  type RecurringDebtStatus as RecurringDebtStatusDomain,
} from '@/lib/domain/financial-domain';

export const RECURRING_DEBT_CATEGORIES = [
  'Água',
  'Luz',
  'Internet',
  'Aluguel',
  'Telefone',
  'Condomínio',
  'Assinatura',
] as const;

export const CONVENTIONAL_DEBT_CATEGORIES = [
  'Cartão de crédito',
  'Empréstimo',
  'Financiamento',
  'Cheque especial',
  'Acordo',
  'Pessoa física',
  'Outros',
] as const;

export const RECURRING_DEBT_FREQUENCIES = [
  { value: 'WEEKLY', label: 'Semanal' },
  { value: 'MONTHLY', label: 'Mensal' },
  { value: 'QUARTERLY', label: 'Trimestral' },
  { value: 'YEARLY', label: 'Anual' },
] as const;

export const RECURRING_DEBT_PRESETS = [
  { category: 'Água', title: 'Água', description: 'Conta recorrente da residência.', dueDay: '10' },
  { category: 'Luz', title: 'Luz', description: 'Energia com vencimento recorrente.', dueDay: '10' },
  { category: 'Internet', title: 'Internet', description: 'Plano fixo da conexão principal.', dueDay: '15' },
  { category: 'Aluguel', title: 'Aluguel', description: 'Compromisso recorrente da moradia.', dueDay: '5' },
] as const;

export type ConventionalDebtStatus = ConventionalDebtStatusDomain;
export type RecurringDebtStatus = RecurringDebtStatusDomain;
export type RecurringDebtFrequency = (typeof RECURRING_DEBT_FREQUENCIES)[number]['value'];

export function isRecurringDebtCategory(category: string) {
  return RECURRING_DEBT_CATEGORIES.includes(category as (typeof RECURRING_DEBT_CATEGORIES)[number]);
}

export function getRecurringDebtDefaultDueDay(category: string) {
  return RECURRING_DEBT_PRESETS.find((preset) => preset.category === category)?.dueDay ?? '10';
}

export function getRecurringDebtFrequencyLabel(frequency: string) {
  return RECURRING_DEBT_FREQUENCIES.find((item) => item.value === frequency)?.label ?? frequency;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function clampDay(year: number, month: number, dueDay: number) {
  const lastDay = new Date(year, month + 1, 0).getDate();
  return Math.max(1, Math.min(dueDay, lastDay));
}

export function computeConventionalDebtNextDueDate(params: {
  dueDay?: number | null;
  dueDate?: Date | string | null;
  now?: Date;
}) {
  if (params.dueDate) {
    const parsed = params.dueDate instanceof Date ? params.dueDate : new Date(params.dueDate);
    if (!Number.isNaN(parsed.getTime())) {
      return startOfDay(parsed);
    }
  }
  const now = startOfDay(params.now ?? new Date());
  const dueDay = Math.max(1, Math.min(Number(params.dueDay || 1), 31));
  const currentCandidate = new Date(
    now.getFullYear(),
    now.getMonth(),
    clampDay(now.getFullYear(), now.getMonth(), dueDay)
  );

  if (startOfDay(currentCandidate) >= now) {
    return currentCandidate;
  }

  const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return new Date(
    nextMonthDate.getFullYear(),
    nextMonthDate.getMonth(),
    clampDay(nextMonthDate.getFullYear(), nextMonthDate.getMonth(), dueDay)
  );
}

function addMonths(date: Date, count: number) {
  return new Date(date.getFullYear(), date.getMonth() + count, date.getDate());
}

function addDays(date: Date, count: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + count);
}

export function computeNextRecurringDebtDueDate(params: {
  frequency: string;
  interval?: number;
  startDate: Date;
  dueDay?: number | null;
  currentDueDate?: Date | null;
  now?: Date;
}) {
  const frequency = String(params.frequency || 'MONTHLY').toUpperCase() as RecurringDebtFrequency;
  const interval = Math.max(1, Number(params.interval || 1));
  const now = startOfDay(params.now ?? new Date());
  const startDate = startOfDay(params.startDate);
  let candidate = startOfDay(params.currentDueDate ?? params.startDate);

  if (frequency === 'MONTHLY' || frequency === 'QUARTERLY' || frequency === 'YEARLY') {
    const monthStep = frequency === 'MONTHLY' ? interval : frequency === 'QUARTERLY' ? interval * 3 : interval * 12;
    const dueDay = Math.max(1, Math.min(Number(params.dueDay || startDate.getDate()), 31));
    candidate = new Date(startDate.getFullYear(), startDate.getMonth(), clampDay(startDate.getFullYear(), startDate.getMonth(), dueDay));

    while (startOfDay(candidate) < now) {
      const advancedBase = addMonths(candidate, monthStep);
      candidate = new Date(
        advancedBase.getFullYear(),
        advancedBase.getMonth(),
        clampDay(advancedBase.getFullYear(), advancedBase.getMonth(), dueDay)
      );
    }

    return candidate;
  }

  candidate = startOfDay(params.currentDueDate ?? params.startDate);
  while (startOfDay(candidate) < now) {
    candidate = addDays(candidate, interval * 7);
  }
  return candidate;
}

export function mapLegacyDebtStatusToConventionalStatus(status: string | null | undefined): ConventionalDebtStatus {
  return mapLegacyDebtStatusToConventionalDebtStatusDomain(status);
}

export function mapConventionalStatusToLegacyDebtStatus(status: string | null | undefined) {
  return mapConventionalDebtStatusToLegacyDebtStatusDomain(status);
}

export function normalizeRecurringDebtStatus(status: string | null | undefined): RecurringDebtStatus {
  return normalizeRecurringDebtStatusDomain(status);
}

export function mapLegacyDebtStatusToLabel(status: string | null | undefined) {
  const normalized = mapLegacyDebtStatusToConventionalStatus(status);
  if (normalized === 'PAID') return 'Quitada';
  if (normalized === 'OVERDUE') return 'Atrasada';
  if (normalized === 'INSTALLMENT') return 'Parcelada';
  return 'Em aberto';
}

