import type { FinancialCalendarView } from '@/lib/financial-calendar/types';

export type CreateFinancialEventDto = {
  title: string;
  description?: string | null;
  type: string;
  amount?: number | string | null;
  category?: string | null;
  date: string;
  endDate?: string | null;
  recurrence?: string | null;
  recurrenceInterval?: number | string | null;
  isRecurring?: boolean | null;
  status?: string | null;
  reminderEnabled?: boolean | null;
  reminderDaysBefore?: number | string | null;
  colorToken?: string | null;
};

export type UpdateFinancialEventDto = Partial<CreateFinancialEventDto>;

export type FinancialEventOccurrenceActionDto = {
  occurrenceDate?: string | null;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function ensureObject(value: unknown, fallbackMessage = 'Corpo da requisição do calendário inválido.') {
  if (!isPlainObject(value)) {
    throw new Error(fallbackMessage);
  }
  return value;
}

function readString(value: unknown) {
  return typeof value === 'string' ? value : null;
}

function parseLocalDateToken(value: string) {
  const trimmed = value.trim();
  const dayMatch = /^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/.exec(trimmed);
  if (dayMatch) {
    const year = Number(dayMatch[1]);
    const month = Number(dayMatch[2]) - 1;
    const day = Number(dayMatch[3]);
    const parsed = new Date(year, month, day);
    if (
      parsed.getFullYear() === year &&
      parsed.getMonth() === month &&
      parsed.getDate() === day
    ) {
      return trimmed;
    }
    throw new Error('Data inválida.');
  }

  const monthMatch = /^(\d{4})-(\d{2})$/.exec(trimmed);
  if (monthMatch) {
    const year = Number(monthMatch[1]);
    const month = Number(monthMatch[2]) - 1;
    const parsed = new Date(year, month, 1);
    if (parsed.getFullYear() === year && parsed.getMonth() === month) {
      return trimmed;
    }
    throw new Error('Data inválida.');
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('Data inválida.');
  }

  return trimmed;
}

function parseDateString(value: unknown, fieldName: string, { required = false }: { required?: boolean } = {}) {
  if (value === null || value === undefined || value === '') {
    if (required) throw new Error(`${fieldName} é obrigatório.`);
    return null;
  }

  if (typeof value !== 'string') {
    throw new Error(`${fieldName} deve ser uma string.`);
  }

  try {
    return parseLocalDateToken(value);
  } catch {
    throw new Error(`${fieldName} inválido.`);
  }
}

export function parseCreateFinancialEventDto(payload: unknown): CreateFinancialEventDto {
  const body = ensureObject(payload);

  const title = readString(body.title)?.trim() || '';
  const type = readString(body.type)?.trim() || '';
  const date = parseDateString(body.date, 'data', { required: true });

  if (!title) {
    throw new Error('O titulo do evento e obrigatorio.');
  }
  if (!type) {
    throw new Error('Selecione um tipo de evento financeiro.');
  }

  parseDateString(body.endDate, 'data final');

  return {
    title,
    description: readString(body.description)?.trim() || null,
    type,
    amount:
      typeof body.amount === 'number' || typeof body.amount === 'string' || body.amount === null
        ? (body.amount as number | string | null)
        : undefined,
    category: readString(body.category)?.trim() || null,
    date: date as string,
    endDate: readString(body.endDate)?.trim() || null,
    recurrence: readString(body.recurrence)?.trim() || null,
    recurrenceInterval:
      typeof body.recurrenceInterval === 'number' || typeof body.recurrenceInterval === 'string'
        ? (body.recurrenceInterval as number | string)
        : null,
    isRecurring: typeof body.isRecurring === 'boolean' ? body.isRecurring : null,
    status: readString(body.status)?.trim() || null,
    reminderEnabled: typeof body.reminderEnabled === 'boolean' ? body.reminderEnabled : null,
    reminderDaysBefore:
      typeof body.reminderDaysBefore === 'number' || typeof body.reminderDaysBefore === 'string'
        ? (body.reminderDaysBefore as number | string)
        : null,
    colorToken: readString(body.colorToken)?.trim() || null,
  };
}

export function parseUpdateFinancialEventDto(payload: unknown): UpdateFinancialEventDto {
  const body = ensureObject(payload);

  if (Object.keys(body).length === 0) {
    throw new Error('Informe ao menos um campo para atualizar.');
  }

  parseDateString(body.date, 'data');
  parseDateString(body.endDate, 'data final');

  return {
    title: readString(body.title)?.trim() || undefined,
    description: typeof body.description === 'string' ? body.description.trim() || null : undefined,
    type: readString(body.type)?.trim() || undefined,
    amount:
      typeof body.amount === 'number' || typeof body.amount === 'string' || body.amount === null
        ? (body.amount as number | string | null)
        : undefined,
    category: typeof body.category === 'string' ? body.category.trim() || null : undefined,
    date: typeof body.date === 'string' ? body.date.trim() : undefined,
    endDate: typeof body.endDate === 'string' ? body.endDate.trim() : body.endDate === null ? null : undefined,
    recurrence: typeof body.recurrence === 'string' ? body.recurrence.trim() : undefined,
    recurrenceInterval:
      typeof body.recurrenceInterval === 'number' || typeof body.recurrenceInterval === 'string'
        ? (body.recurrenceInterval as number | string)
        : undefined,
    isRecurring: typeof body.isRecurring === 'boolean' ? body.isRecurring : undefined,
    status: typeof body.status === 'string' ? body.status.trim() : undefined,
    reminderEnabled: typeof body.reminderEnabled === 'boolean' ? body.reminderEnabled : undefined,
    reminderDaysBefore:
      typeof body.reminderDaysBefore === 'number' || typeof body.reminderDaysBefore === 'string'
        ? (body.reminderDaysBefore as number | string)
        : undefined,
    colorToken: typeof body.colorToken === 'string' ? body.colorToken.trim() || null : undefined,
  };
}

export function parseOccurrenceActionDto(payload: unknown): FinancialEventOccurrenceActionDto {
  if (payload === null || payload === undefined || payload === '') {
    return {};
  }

  const body = ensureObject(payload);
  parseDateString(body.occurrenceDate, 'data da ocorrencia');

  return {
    occurrenceDate: typeof body.occurrenceDate === 'string' ? body.occurrenceDate.trim() : null,
  };
}

export function parseCalendarListQuery(req: Request, defaultView: FinancialCalendarView = 'month') {
  const url = new URL(req.url);
  const viewParam = String(url.searchParams.get('view') || defaultView).trim().toLowerCase();
  const date = url.searchParams.get('date');
  const view = viewParam === 'day' || viewParam === 'week' || viewParam === 'month' ? viewParam : defaultView;

  if (date) {
    parseDateString(date, 'data');
  }

  return {
    view,
    date,
  };
}

export function parseUpcomingQuery(req: Request) {
  const url = new URL(req.url);
  const fromDate = url.searchParams.get('fromDate');
  const daysRaw = url.searchParams.get('days');

  if (fromDate) {
    parseDateString(fromDate, 'data inicial');
  }

  let days = 14;
  if (daysRaw) {
    const parsed = Number(daysRaw);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 90) {
      throw new Error('days deve ser um inteiro entre 1 e 90.');
    }
    days = parsed;
  }

  return {
    fromDate,
    days,
  };
}

export function parseMonthlySummaryQuery(req: Request) {
  const url = new URL(req.url);
  const date = url.searchParams.get('date');

  if (date) {
    parseDateString(date, 'data');
  }

  return { date };
}
