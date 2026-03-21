import type {
  FinancialCalendarDayGroup,
  FinancialCalendarOccurrence,
  FinancialCalendarSummary,
  FinancialCalendarView,
  FinancialEventFlow,
  FinancialEventType,
  FinancialPressureLevel,
} from '@/lib/financial-calendar/types';

export function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function endOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

export function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

export function startOfWeek(date: Date) {
  const normalized = startOfDay(date);
  const day = normalized.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  normalized.setDate(normalized.getDate() + diff);
  return normalized;
}

export function endOfWeek(date: Date) {
  const start = startOfWeek(date);
  return endOfDay(new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6));
}

export function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateParts(value: string) {
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
      return parsed;
    }
    return null;
  }

  const monthMatch = /^(\d{4})-(\d{2})$/.exec(trimmed);
  if (monthMatch) {
    const year = Number(monthMatch[1]);
    const month = Number(monthMatch[2]) - 1;
    const parsed = new Date(year, month, 1);
    if (parsed.getFullYear() === year && parsed.getMonth() === month) {
      return parsed;
    }
    return null;
  }

  return null;
}

export function parseCalendarDate(value: string | null | undefined) {
  if (!value) return new Date();

  const localDate = parseDateParts(value);
  if (localDate) return localDate;

  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) return parsed;

  return new Date();
}

export function resolvePeriodBounds(view: FinancialCalendarView, focusDate: Date) {
  if (view === 'day') {
    return {
      view,
      focusDate,
      startDate: startOfDay(focusDate),
      endDate: endOfDay(focusDate),
    };
  }

  if (view === 'week') {
    return {
      view,
      focusDate,
      startDate: startOfWeek(focusDate),
      endDate: endOfWeek(focusDate),
    };
  }

  return {
    view,
    focusDate,
    startDate: startOfMonth(focusDate),
    endDate: endOfMonth(focusDate),
  };
}

export function mapFinancialEventFlow(type: FinancialEventType): FinancialEventFlow {
  if (type === 'EXPECTED_INCOME') return 'in';
  if (type === 'FIXED_BILL' || type === 'CARD_BILL' || type === 'INSTALLMENT' || type === 'SUBSCRIPTION') {
    return 'out';
  }
  return 'neutral';
}

function pressureLevelFromScore(score: number): FinancialPressureLevel {
  if (score >= 70) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}

export function groupEventsByDay(events: FinancialCalendarOccurrence[]) {
  const groups = new Map<string, FinancialCalendarOccurrence[]>();

  for (const event of events) {
    const key = toDateKey(parseCalendarDate(event.date));
    const current = groups.get(key) || [];
    current.push(event);
    groups.set(key, current);
  }

  return [...groups.entries()]
    .sort((left, right) => left[0].localeCompare(right[0]))
    .map(([date, items]) => {
      const inflow = items
        .filter((event) => event.flow === 'in' && event.status !== 'CANCELED')
        .reduce((acc, event) => acc + Number(event.amount || 0), 0);
      const outflow = items
        .filter((event) => event.flow === 'out' && event.status !== 'CANCELED')
        .reduce((acc, event) => acc + Number(event.amount || 0), 0);
      const pendingCount = items.filter((event) => event.status === 'PENDING').length;
      const overdueCount = items.filter((event) => event.status === 'OVERDUE').length;

      return {
        date,
        events: [...items].sort((left, right) => {
          const leftWeight = left.flow === 'out' ? 0 : left.flow === 'neutral' ? 1 : 2;
          const rightWeight = right.flow === 'out' ? 0 : right.flow === 'neutral' ? 1 : 2;
          if (leftWeight !== rightWeight) return leftWeight - rightWeight;
          return left.title.localeCompare(right.title);
        }),
        inflow,
        outflow,
        net: inflow - outflow,
        pendingCount,
        overdueCount,
        pressureScore: 0,
        pressureLevel: 'low' as const,
        projectedBalance: null,
        reasons: [] as string[],
      };
    });
}

export function generatePeriodSummary(
  events: FinancialCalendarOccurrence[],
  openingBalance: number
): FinancialCalendarSummary {
  const totalExpectedInflow = events
    .filter((event) => event.flow === 'in' && event.status !== 'CANCELED')
    .reduce((acc, event) => acc + Number(event.amount || 0), 0);

  const totalExpectedOutflow = events
    .filter((event) => event.flow === 'out' && event.status !== 'CANCELED')
    .reduce((acc, event) => acc + Number(event.amount || 0), 0);

  const overdueCount = events.filter((event) => event.status === 'OVERDUE').length;
  const nextDue = [...events]
    .filter((event) => event.status === 'PENDING' || event.status === 'OVERDUE')
    .sort((left, right) => parseCalendarDate(left.date).getTime() - parseCalendarDate(right.date).getTime())
    .slice(0, 6);

  return {
    totalExpectedInflow,
    totalExpectedOutflow,
    projectedBalance: openingBalance + totalExpectedInflow - totalExpectedOutflow,
    overdueCount,
    nextDue,
  };
}

export function detectPressureDays(
  groupedDays: FinancialCalendarDayGroup[],
  openingBalance: number
) {
  const totalOutflow = groupedDays.reduce((acc, day) => acc + day.outflow, 0);
  const averageOutflow = groupedDays.length > 0 ? totalOutflow / groupedDays.length : 0;
  const enrichedDays: FinancialCalendarDayGroup[] = [];
  let runningBalance = openingBalance;

  for (const day of groupedDays) {
    runningBalance += day.net;

    let score = 0;
    const reasons: string[] = [];

    if (day.outflow > 0 && averageOutflow > 0 && day.outflow >= averageOutflow * 1.5) {
      score += 30;
      reasons.push('saidas acima da media do periodo');
    }

    if (day.outflow > 0 && averageOutflow > 0 && day.outflow >= averageOutflow * 2.25) {
      score += 15;
    }

    if (day.pendingCount >= 3) {
      score += 20;
      reasons.push('muitos vencimentos no mesmo dia');
    }

    if (day.overdueCount > 0) {
      score += 25;
      reasons.push('ha itens vencidos');
    }

    if (runningBalance < 0) {
      score += 35;
      reasons.push('saldo previsto negativo');
    } else if (averageOutflow > 0 && runningBalance <= averageOutflow * 0.5) {
      score += 20;
      reasons.push('saldo previsto apertado');
    }

    if (day.net < 0 && Math.abs(day.net) > averageOutflow && averageOutflow > 0) {
      score += 15;
    }

    const normalizedScore = Math.min(100, score);
    enrichedDays.push({
      ...day,
      pressureScore: normalizedScore,
      pressureLevel: pressureLevelFromScore(normalizedScore),
      projectedBalance: runningBalance,
      reasons,
    });
  }

  return {
    groupedDays: enrichedDays,
    criticalDays: enrichedDays
      .filter((day) => day.pressureScore >= 40)
      .sort((left, right) => right.pressureScore - left.pressureScore || left.date.localeCompare(right.date))
      .slice(0, 6),
  };
}
