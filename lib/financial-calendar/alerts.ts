import type {
  FinancialCalendarAlert,
  FinancialCalendarDayGroup,
  FinancialCalendarOccurrence,
} from '@/lib/financial-calendar/types';
import { parseCalendarDate, startOfDay, toDateKey } from '@/lib/financial-calendar/utils';

type BuildFinancialAlertsParams = {
  events: FinancialCalendarOccurrence[];
  groupedDays: FinancialCalendarDayGroup[];
  criticalDays: FinancialCalendarDayGroup[];
  now: Date;
};

function addDays(date: Date, count: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + count);
}

function differenceInDays(from: Date, to: Date) {
  const diff = startOfDay(to).getTime() - startOfDay(from).getTime();
  return Math.round(diff / 86400000);
}

function formatDay(date: Date) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  }).format(date);
}

function getSeverityWeight(severity: FinancialCalendarAlert['severity']) {
  if (severity === 'critical') return 3;
  if (severity === 'warning') return 2;
  return 1;
}

function buildUpcomingDueAlert(events: FinancialCalendarOccurrence[], now: Date) {
  const windowEnd = addDays(now, 3);
  const upcoming = events
    .filter((event) => {
      if (event.status !== 'PENDING') return false;
      const date = parseCalendarDate(event.date);
      return date >= startOfDay(now) && date <= startOfDay(windowEnd);
    })
    .sort((left, right) => parseCalendarDate(left.date).getTime() - parseCalendarDate(right.date).getTime());

  if (upcoming.length === 0) return null;

  const first = upcoming[0];
  const dueDate = parseCalendarDate(first.date);
  const daysUntil = differenceInDays(now, dueDate);
  const title =
    first.type === 'CARD_BILL'
      ? daysUntil === 0
        ? 'Sua fatura vence hoje.'
        : `Sua fatura vence em ${daysUntil} dia(s).`
      : daysUntil === 0
        ? `${first.title} vence hoje.`
        : `${first.title} vence em ${daysUntil} dia(s).`;

  return {
    id: `upcoming:${first.id}`,
    kind: 'upcoming_due',
    severity: daysUntil <= 1 ? 'critical' : 'warning',
    title,
    message:
      upcoming.length > 1
        ? `Existem ${upcoming.length} vencimentos próximos no radar imediato deste período.`
        : 'Vale preparar o caixa antes da data para evitar pressão desnecessária.',
    dayKey: toDateKey(dueDate),
    startDate: first.date,
    endDate: first.date,
    eventIds: upcoming.slice(0, 4).map((event) => event.id),
  } satisfies FinancialCalendarAlert;
}

function buildOverdueAlert(events: FinancialCalendarOccurrence[]) {
  const overdue = events
    .filter((event) => event.status === 'OVERDUE')
    .sort((left, right) => parseCalendarDate(left.date).getTime() - parseCalendarDate(right.date).getTime());

  if (overdue.length === 0) return null;

  const first = overdue[0];
  return {
    id: `overdue:${first.id}`,
    kind: 'overdue',
    severity: 'critical',
    title: 'Você tem eventos vencidos que precisam de atenção.',
    message:
      overdue.length === 1
        ? `${first.title} já passou do prazo e deve ser revisado agora.`
        : `${overdue.length} itens estão vencidos e podem pressionar o restante do mês.`,
    dayKey: toDateKey(parseCalendarDate(first.date)),
    startDate: first.date,
    endDate: overdue[overdue.length - 1]?.date || first.date,
    eventIds: overdue.slice(0, 6).map((event) => event.id),
  } satisfies FinancialCalendarAlert;
}

function buildHeavyDayAlert(criticalDays: FinancialCalendarDayGroup[]) {
  const candidate = criticalDays.find(
    (day) => day.pressureLevel === 'high' || day.pendingCount + day.overdueCount >= 3
  );

  if (!candidate) return null;

  const date = parseCalendarDate(candidate.date);
  const obligations = candidate.pendingCount + candidate.overdueCount;
  return {
    id: `heavy:${candidate.date}`,
    kind: 'heavy_day',
    severity: candidate.projectedBalance !== null && candidate.projectedBalance < 0 ? 'critical' : 'warning',
    title: `O dia ${formatDay(date)} é um ponto crítico do seu mês.`,
    message:
      obligations > 0
        ? `${obligations} obrigação(ões) financeiras se acumulam nesta data.`
        : 'A combinação de saídas e saldo projetado merece atenção antecipada.',
    dayKey: toDateKey(date),
    startDate: candidate.date,
    endDate: candidate.date,
    eventIds: candidate.events.slice(0, 6).map((event) => event.id),
  } satisfies FinancialCalendarAlert;
}

function buildTightBalanceAlert(groupedDays: FinancialCalendarDayGroup[]) {
  if (groupedDays.length === 0) return null;

  const totalOutflow = groupedDays.reduce((acc, day) => acc + day.outflow, 0);
  const averageOutflow = totalOutflow > 0 ? totalOutflow / groupedDays.length : 0;
  const threshold = averageOutflow > 0 ? averageOutflow * 0.5 : 0;
  let bestRange: { startIndex: number; endIndex: number; hasNegative: boolean } | null = null;
  let currentStart = -1;
  let currentHasNegative = false;

  for (let index = 0; index < groupedDays.length; index += 1) {
    const day = groupedDays[index];
    const projected = day.projectedBalance ?? 0;
    const isTight = projected < 0 || projected <= threshold;

    if (isTight) {
      if (currentStart === -1) {
        currentStart = index;
        currentHasNegative = projected < 0;
      } else if (projected < 0) {
        currentHasNegative = true;
      }
      continue;
    }

    if (currentStart !== -1) {
      const candidate = {
        startIndex: currentStart,
        endIndex: index - 1,
        hasNegative: currentHasNegative,
      };
      if (!bestRange || candidate.hasNegative || candidate.endIndex - candidate.startIndex > bestRange.endIndex - bestRange.startIndex) {
        bestRange = candidate;
      }
      currentStart = -1;
      currentHasNegative = false;
    }
  }

  if (currentStart !== -1) {
    const candidate = {
      startIndex: currentStart,
      endIndex: groupedDays.length - 1,
      hasNegative: currentHasNegative,
    };
    if (!bestRange || candidate.hasNegative || candidate.endIndex - candidate.startIndex > bestRange.endIndex - bestRange.startIndex) {
      bestRange = candidate;
    }
  }

  if (!bestRange) return null;

  const startDay = groupedDays[bestRange.startIndex];
  const endDay = groupedDays[bestRange.endIndex];
  const startDate = parseCalendarDate(startDay.date);
  const endDate = parseCalendarDate(endDay.date);

  return {
    id: `balance:${startDay.date}:${endDay.date}`,
    kind: 'tight_balance',
    severity: bestRange.hasNegative ? 'critical' : 'warning',
    title:
      bestRange.startIndex === bestRange.endIndex
        ? `O saldo previsto fica apertado em ${formatDay(startDate)}.`
        : `O saldo previsto fica apertado entre ${formatDay(startDate)} e ${formatDay(endDate)}.`,
    message: bestRange.hasNegative
      ? 'O caixa projetado entra em zona crítica e pede decisão antes do período.'
      : 'A margem de folga fica curta e merece monitoramento neste trecho do mês.',
    dayKey: toDateKey(startDate),
    startDate: startDay.date,
    endDate: endDay.date,
    eventIds: groupedDays
      .slice(bestRange.startIndex, bestRange.endIndex + 1)
      .flatMap((day) => day.events.map((event) => event.id))
      .slice(0, 10),
  } satisfies FinancialCalendarAlert;
}

function buildOutflowClusterAlert(groupedDays: FinancialCalendarDayGroup[]) {
  const totalOutflow = groupedDays.reduce((acc, day) => acc + day.outflow, 0);
  if (groupedDays.length === 0 || totalOutflow <= 0) return null;

  let bestWindow:
    | {
        startIndex: number;
        endIndex: number;
        outflowEvents: number;
        outflowAmount: number;
      }
    | null = null;

  for (let startIndex = 0; startIndex < groupedDays.length; startIndex += 1) {
    const startDate = parseCalendarDate(groupedDays[startIndex].date);
    let outflowEvents = 0;
    let outflowAmount = 0;
    let endIndex = startIndex;

    while (endIndex < groupedDays.length) {
      const day = groupedDays[endIndex];
      const currentDate = parseCalendarDate(day.date);
      if (differenceInDays(startDate, currentDate) > 4) break;

      outflowEvents += day.events.filter((event) => event.flow === 'out' && event.status !== 'CANCELED').length;
      outflowAmount += day.outflow;
      endIndex += 1;
    }

    const candidate = {
      startIndex,
      endIndex: endIndex - 1,
      outflowEvents,
      outflowAmount,
    };

    if (
      candidate.outflowEvents >= 4 &&
      candidate.outflowAmount >= totalOutflow * 0.35 &&
      (!bestWindow || candidate.outflowAmount > bestWindow.outflowAmount)
    ) {
      bestWindow = candidate;
    }
  }

  if (!bestWindow) return null;

  const startDay = groupedDays[bestWindow.startIndex];
  const endDay = groupedDays[bestWindow.endIndex];
  const startDate = parseCalendarDate(startDay.date);
  const endDate = parseCalendarDate(endDay.date);

  return {
    id: `cluster:${startDay.date}:${endDay.date}`,
    kind: 'outflow_cluster',
    severity: 'warning',
    title: `Há ${bestWindow.outflowEvents} saídas concentradas entre os dias ${formatDay(startDate)} e ${formatDay(endDate)}.`,
    message: 'Essa concentração pode apertar o caixa mesmo quando o restante do mês parece leve.',
    dayKey: toDateKey(startDate),
    startDate: startDay.date,
    endDate: endDay.date,
    eventIds: groupedDays
      .slice(bestWindow.startIndex, bestWindow.endIndex + 1)
      .flatMap((day) => day.events.filter((event) => event.flow === 'out').map((event) => event.id))
      .slice(0, 10),
  } satisfies FinancialCalendarAlert;
}

export function buildFinancialCalendarAlerts(params: BuildFinancialAlertsParams) {
  const alerts = [
    buildOverdueAlert(params.events),
    buildUpcomingDueAlert(params.events, params.now),
    buildTightBalanceAlert(params.groupedDays),
    buildHeavyDayAlert(params.criticalDays),
    buildOutflowClusterAlert(params.groupedDays),
  ].filter(Boolean) as FinancialCalendarAlert[];

  return alerts
    .sort((left, right) => {
      const severityDiff = getSeverityWeight(right.severity) - getSeverityWeight(left.severity);
      if (severityDiff !== 0) return severityDiff;
      return left.id.localeCompare(right.id);
    })
    .slice(0, 4);
}
