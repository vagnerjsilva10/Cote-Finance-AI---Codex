'use client';

import * as React from 'react';
import {
  ArrowDownRight,
  Bell,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Plus,
  ReceiptText,
  RefreshCw,
  Sparkles,
  Target,
  TriangleAlert,
  Wallet,
} from 'lucide-react';
import type {
  FinancialCalendarAlert,
  FinancialCalendarDayGroup,
  FinancialCalendarOccurrence,
  FinancialCalendarSnapshot,
} from '@/lib/financial-calendar/types';
import { ButtonPrimary, ButtonSecondary } from '@/components/ui/premium-primitives';
import {
  FinancialCalendarComposer,
  type FinancialCalendarComposerPayload,
  type FinancialCalendarComposerValues,
} from '@/components/financial-calendar/financial-calendar-composer';
import { FinancialCalendarDaySheet } from '@/components/financial-calendar/financial-calendar-day-sheet';
import { cn } from '@/lib/utils';

type SubscriptionPlan = 'FREE' | 'PRO' | 'PREMIUM';
type WorkspaceTab = 'transactions' | 'goals' | 'debts';
type InlineFeedback = { tone: 'success' | 'info'; message: string };

type FinancialCalendarViewProps = {
  currentPlan: SubscriptionPlan;
  activeWorkspaceId: string | null;
  getAuthHeaders: (withJsonContentType?: boolean, workspaceIdOverride?: string | null) => Promise<Record<string, string>>;
  onUpgrade: () => void;
  onNavigateTab?: (tab: WorkspaceTab) => void;
};

type CalendarCell = {
  key: string;
  date: Date;
  label: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  group: FinancialCalendarDayGroup;
  isCritical: boolean;
  hasOverdue: boolean;
  hasDueSoon: boolean;
};

const WEEKDAY_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'];

function formatCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function formatCompactCurrency(value: number | null | undefined) {
  const numeric = Number(value || 0);
  const abs = Math.abs(numeric);
  if (abs >= 1000) {
    const compact = abs >= 10000 ? (abs / 1000).toFixed(0) : (abs / 1000).toFixed(1);
    return `${numeric < 0 ? '-' : ''}R$ ${compact.replace('.0', '')}k`;
  }
  return formatCurrency(numeric);
}

function formatMonthLabel(date: Date) {
  return new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function parseCalendarValue(value: string) {
  const token = String(value || '').slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(token);
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function formatDayNumber(dateIso: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
  }).format(parseCalendarValue(dateIso));
}

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toMonthKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function toInputDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function startOfWeek(date: Date) {
  const normalized = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = normalized.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  normalized.setDate(normalized.getDate() + diff);
  return normalized;
}

function getEmptyDayGroup(date: Date): FinancialCalendarDayGroup {
  return {
    date: toDateKey(date),
    events: [],
    inflow: 0,
    outflow: 0,
    net: 0,
    pendingCount: 0,
    overdueCount: 0,
    pressureScore: 0,
    pressureLevel: 'low',
    projectedBalance: null,
    reasons: [],
  };
}

function getEventTone(event: FinancialCalendarOccurrence) {
  if (event.type === 'EXPECTED_INCOME') {
    return {
      dot: 'bg-[var(--positive)]',
      chip: 'border-[rgba(79,191,138,0.24)] bg-[rgba(79,191,138,0.12)] text-[color:color-mix(in_srgb,var(--positive)_82%,white)]',
      icon: ArrowDownRight,
      label: 'Entrada',
    };
  }
  if (event.type === 'CARD_BILL') {
    return {
      dot: 'bg-[var(--warning)]',
      chip: 'border-[rgba(217,164,65,0.24)] bg-[rgba(217,164,65,0.12)] text-[color:color-mix(in_srgb,var(--warning)_82%,white)]',
      icon: CreditCard,
      label: 'Fatura',
    };
  }
  if (event.type === 'INSTALLMENT') {
    return {
      dot: 'bg-[rgba(214,169,109,1)]',
      chip: 'border-[rgba(214,169,109,0.24)] bg-[rgba(214,169,109,0.10)] text-[rgb(232,208,172)]',
      icon: ReceiptText,
      label: 'Parcela',
    };
  }
  if (event.type === 'SUBSCRIPTION' || event.type === 'FIXED_BILL') {
    return {
      dot: 'bg-[rgba(160,174,192,0.88)]',
      chip: 'border-[rgba(255,255,255,0.09)] bg-[rgba(255,255,255,0.04)] text-[var(--text-secondary)]',
      icon: ReceiptText,
      label: event.type === 'SUBSCRIPTION' ? 'Assinatura' : 'Fixa',
    };
  }
  if (event.type === 'GOAL_DEADLINE') {
    return {
      dot: 'bg-[var(--primary)]',
      chip: 'border-[rgba(79,140,255,0.24)] bg-[rgba(79,140,255,0.12)] text-[color:color-mix(in_srgb,var(--primary)_82%,white)]',
      icon: Target,
      label: 'Meta',
    };
  }
  return {
    dot: 'bg-[var(--danger)]',
    chip: 'border-[rgba(255,90,90,0.22)] bg-[rgba(255,90,90,0.10)] text-[color:color-mix(in_srgb,var(--danger)_82%,white)]',
    icon: Bell,
    label: 'Alerta',
  };
}

function getAlertEyebrow(alert: FinancialCalendarAlert) {
  if (alert.kind === 'overdue') return 'Eventos vencidos';
  if (alert.kind === 'upcoming_due') return 'Vencimento proximo';
  if (alert.kind === 'tight_balance') return 'Saldo previsto';
  if (alert.kind === 'outflow_cluster') return 'Concentracao de saidas';
  return 'Ponto critico';
}

function derivePrimaryAlert(snapshot: FinancialCalendarSnapshot | null) {
  if (!snapshot) {
    return {
      eyebrow: 'Panorama do periodo',
      title: 'Carregando leitura financeira',
      message: 'Estamos montando o mes a partir de entradas, saidas e vencimentos sincronizados.',
      tone: 'neutral' as const,
      dayKey: null as string | null,
    };
  }

  const alert = snapshot.alerts[0];
  if (alert) {
    return {
      eyebrow: getAlertEyebrow(alert),
      title: alert.title,
      message: alert.message,
      tone:
        alert.severity === 'critical'
          ? ('danger' as const)
          : alert.severity === 'warning'
            ? ('warning' as const)
            : ('info' as const),
      dayKey: alert.dayKey,
    };
  }

  return {
    eyebrow: 'Mes organizado',
    title: 'Nenhuma data critica no radar',
    message: 'Seu calendario financeiro esta limpo e com folga visual para o restante do periodo.',
    tone: 'positive' as const,
    dayKey: null as string | null,
  };
}

function getAlertCardTone(alert: FinancialCalendarAlert) {
  if (alert.severity === 'critical') {
    return 'border-[rgba(255,90,90,0.18)] bg-[rgba(255,90,90,0.08)] text-[var(--danger)]';
  }
  if (alert.severity === 'warning') {
    return 'border-[rgba(217,164,65,0.20)] bg-[rgba(217,164,65,0.08)] text-[var(--warning)]';
  }
  return 'border-[rgba(79,140,255,0.18)] bg-[rgba(79,140,255,0.08)] text-[var(--primary)]';
}

function formatAlertWindow(alert: FinancialCalendarAlert) {
  if (alert.startDate && alert.endDate && alert.startDate !== alert.endDate) {
    return `${formatDayNumber(alert.startDate)} - ${formatDayNumber(alert.endDate)}`;
  }
  if (alert.startDate) {
    return formatDayNumber(alert.startDate);
  }
  return 'Radar do periodo';
}

function getCellAriaLabel(cell: CalendarCell) {
  const dateLabel = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(cell.date);

  if (!cell.isCurrentMonth) {
    return `${dateLabel}. Fora do mes em foco.`;
  }

  if (cell.group.events.length === 0) {
    return `${dateLabel}. Nenhum evento financeiro mapeado.`;
  }

  return `${dateLabel}. ${cell.group.events.length} evento(s), saldo do dia ${formatCurrency(cell.group.net)}.`;
}
function buildMonthCells(snapshot: FinancialCalendarSnapshot | null) {
  if (!snapshot) return [] as CalendarCell[];

  const focus = parseCalendarValue(snapshot.period.focusDate);
  const monthStart = new Date(focus.getFullYear(), focus.getMonth(), 1);
  const gridStart = startOfWeek(monthStart);
  const today = new Date();
  const todayKey = toDateKey(today);
  const dayMap = new Map(snapshot.groupedByDay.map((day) => [toDateKey(parseCalendarValue(day.date)), day]));
  const criticalSet = new Set(snapshot.criticalDays.map((day) => toDateKey(parseCalendarValue(day.date))));
  const cells: CalendarCell[] = [];

  for (let index = 0; index < 42; index += 1) {
    const cellDate = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + index);
    const key = toDateKey(cellDate);
    const group = dayMap.get(key) || getEmptyDayGroup(cellDate);
    const hasOverdue = group.events.some((event) => event.status === 'OVERDUE');
    const hasDueSoon = group.events.some((event) => {
      if (event.status !== 'PENDING') return false;
      const date = parseCalendarValue(event.date);
      const diff = Math.round((startOfLocalDay(date).getTime() - startOfLocalDay(today).getTime()) / 86400000);
      return diff >= 0 && diff <= 3;
    });

    cells.push({
      key,
      date: cellDate,
      label: cellDate.getDate(),
      isCurrentMonth: cellDate.getMonth() === focus.getMonth(),
      isToday: key === todayKey,
      group,
      isCritical: criticalSet.has(key),
      hasOverdue,
      hasDueSoon,
    });
  }

  return cells;
}

function getCellSummary(day: FinancialCalendarDayGroup) {
  return day.events.slice(0, 3).map((event) => getEventTone(event));
}

function buildDayInsights(day: FinancialCalendarDayGroup | null, snapshot: FinancialCalendarSnapshot | null) {
  if (!day || !snapshot) return [] as string[];

  const insights: string[] = [];
  const dayKey = toDateKey(parseCalendarValue(day.date));
  const isCritical = snapshot.criticalDays.some((item) => toDateKey(parseCalendarValue(item.date)) === dayKey);

  if (isCritical || day.pressureLevel === 'high') {
    insights.push('Este e um dos dias mais pesados do mes.');
  }

  if (day.outflow > day.inflow) {
    insights.push('Voce tera mais saidas do que entradas nesta data.');
  }

  if (day.pendingCount >= 2 || day.overdueCount > 0 || day.events.some((event) => event.status === 'OVERDUE')) {
    insights.push('Ha vencimentos proximos que exigem atencao.');
  }

  if ((day.projectedBalance ?? 0) < 0) {
    insights.push('O saldo pode ficar apertado apos este dia.');
  }

  if (insights.length === 0 && day.events.length > 0) {
    insights.push('O fluxo deste dia esta distribuido e sob controle visual.');
  }

  return insights.slice(0, 4);
}

function resolveOriginDestination(event: FinancialCalendarOccurrence) {
  if (!event.sourceId || event.sourceType === 'MANUAL') return null;

  if (event.sourceType === 'GOAL') {
    return { tab: 'goals' as const };
  }

  if (
    event.sourceType === 'EXPENSE' ||
    event.sourceType === 'INCOME' ||
    event.sourceType === 'CARD_BILL' ||
    event.sourceType === 'INSTALLMENT'
  ) {
    return { tab: 'transactions' as const };
  }

  if (event.sourceType === 'SUBSCRIPTION') {
    return { tab: 'debts' as const };
  }

  return null;
}

function buildComposerInitialValues(event: FinancialCalendarOccurrence): Partial<FinancialCalendarComposerValues> {
  return {
    title: event.title,
    description: event.description || '',
    type: event.type,
    amount: typeof event.amount === 'number' ? String(event.amount) : '',
    category: event.category || '',
    date: event.seriesDate.slice(0, 10),
    recurrence: event.recurrence,
    status: event.status,
    reminderEnabled: event.reminderEnabled,
    reminderDaysBefore: String(event.reminderDaysBefore),
  };
}

export function FinancialCalendarView({
  currentPlan,
  activeWorkspaceId,
  getAuthHeaders,
  onUpgrade,
  onNavigateTab,
}: FinancialCalendarViewProps) {
  const [monthCursor, setMonthCursor] = React.useState(() => new Date());
  const [snapshot, setSnapshot] = React.useState<FinancialCalendarSnapshot | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedDayKey, setSelectedDayKey] = React.useState<string | null>(null);
  const [isComposerOpen, setIsComposerOpen] = React.useState(false);
  const [composerDate, setComposerDate] = React.useState(() => toInputDate(new Date()));
  const [composerMode, setComposerMode] = React.useState<'create' | 'edit'>('create');
  const [editingEvent, setEditingEvent] = React.useState<FinancialCalendarOccurrence | null>(null);
  const [composerError, setComposerError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [pendingActionId, setPendingActionId] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<InlineFeedback | null>(null);

  const loadMonth = React.useCallback(
    async (date: Date, options?: { silent?: boolean }) => {
      if (!activeWorkspaceId || currentPlan === 'FREE') {
        setSnapshot(null);
        setError(null);
        setIsLoading(false);
        return;
      }

      if (!options?.silent) {
        setIsLoading(true);
      }
      setError(null);

      try {
        const headers = await getAuthHeaders(false, activeWorkspaceId);
        const response = await fetch(`/api/financial-calendar/month?date=${toMonthKey(date)}`, {
          headers,
          cache: 'no-store',
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(payload?.error || `Falha ao carregar calendario (HTTP ${response.status}).`);
        }
        setSnapshot(payload as FinancialCalendarSnapshot);
      } catch (fetchError) {
        setNotice(null);
        setError(fetchError instanceof Error ? fetchError.message : 'Falha ao carregar calendario financeiro.');
      } finally {
        setIsLoading(false);
      }
    },
    [activeWorkspaceId, currentPlan, getAuthHeaders]
  );

  React.useEffect(() => {
    void loadMonth(monthCursor);
  }, [loadMonth, monthCursor]);


  React.useEffect(() => {
    if (!notice) return;
    const timeoutId = window.setTimeout(() => setNotice(null), 3600);
    return () => window.clearTimeout(timeoutId);
  }, [notice]);

  const cells = React.useMemo(() => buildMonthCells(snapshot), [snapshot]);
  const selectedDay = React.useMemo(() => {
    if (!selectedDayKey) return null;
    return cells.find((cell) => cell.key === selectedDayKey)?.group || null;
  }, [cells, selectedDayKey]);

  React.useEffect(() => {
    if (!selectedDayKey) return;
    if (!cells.some((cell) => cell.key === selectedDayKey)) {
      setSelectedDayKey(null);
    }
  }, [cells, selectedDayKey]);
  const primaryAlert = React.useMemo(() => derivePrimaryAlert(snapshot), [snapshot]);
  const topAlerts = React.useMemo(() => snapshot?.alerts.slice(0, 3) || [], [snapshot]);
  const selectedDayInsights = React.useMemo(() => buildDayInsights(selectedDay, snapshot), [selectedDay, snapshot]);
  const hasMonthEvents = Boolean(snapshot && snapshot.events.length > 0);
  const composerInitialValues = React.useMemo(
    () => (editingEvent ? buildComposerInitialValues(editingEvent) : null),
    [editingEvent]
  );

  const handleOpenComposer = React.useCallback(
    (date?: Date) => {
      setComposerMode('create');
      setEditingEvent(null);
      setComposerError(null);
      setComposerDate(toInputDate(date || monthCursor));
      setIsComposerOpen(true);
    },
    [monthCursor]
  );

  const handleOpenEdit = React.useCallback((event: FinancialCalendarOccurrence) => {
    setComposerMode('edit');
    setEditingEvent(event);
    setComposerError(null);
    setComposerDate(event.seriesDate.slice(0, 10));
    setIsComposerOpen(true);
  }, []);

  const handleMonthShift = React.useCallback((direction: -1 | 1) => {
    setSelectedDayKey(null);
    setMonthCursor((current) => new Date(current.getFullYear(), current.getMonth() + direction, 1));
  }, []);

  const handleGoToToday = React.useCallback(() => {
    setSelectedDayKey(null);
    setMonthCursor(new Date());
  }, []);

  const handleRetry = React.useCallback(() => {
    void loadMonth(monthCursor);
  }, [loadMonth, monthCursor]);

  const handleSubmitComposer = React.useCallback(
    async (payload: FinancialCalendarComposerPayload) => {
      setIsSubmitting(true);
      setComposerError(null);
      try {
        const headers = await getAuthHeaders(true, activeWorkspaceId);
        const body = {
          title: payload.title,
          description: payload.description,
          type: payload.type,
          amount: payload.amount ? Number(payload.amount) : null,
          category: payload.category,
          date: payload.date,
          recurrence: payload.recurrence,
          isRecurring: payload.recurrence !== 'NONE',
          status: payload.status,
          reminderEnabled: payload.reminderEnabled,
          reminderDaysBefore: payload.reminderEnabled ? Number(payload.reminderDaysBefore || 0) : 0,
        };
        const response = await fetch(
          composerMode === 'edit' && editingEvent
            ? `/api/financial-calendar/${editingEvent.eventId}`
            : '/api/financial-calendar',
          {
            method: composerMode === 'edit' && editingEvent ? 'PATCH' : 'POST',
            headers,
            body: JSON.stringify(body),
          }
        );
        const result = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(result?.error || `Falha ao salvar evento (HTTP ${response.status}).`);
        }
        setIsComposerOpen(false);
        setSelectedDayKey(editingEvent?.occurrenceKey || payload.date);
        setEditingEvent(null);
        setNotice({
          tone: 'success',
          message: composerMode === 'edit' ? 'Evento manual atualizado no calendario.' : 'Evento manual adicionado ao mes financeiro.',
        });
        await loadMonth(monthCursor, { silent: true });
      } catch (submitError) {
        setNotice(null);
        setComposerError(submitError instanceof Error ? submitError.message : 'Falha ao salvar evento financeiro.');
      } finally {
        setIsSubmitting(false);
      }
    },
    [activeWorkspaceId, composerMode, editingEvent, getAuthHeaders, loadMonth, monthCursor]
  );

  const handleEventAction = React.useCallback(
    async (event: FinancialCalendarOccurrence, action: 'paid' | 'received') => {
      setPendingActionId(event.id);
      try {
        const headers = await getAuthHeaders(true, activeWorkspaceId);
        const response = await fetch(`/api/financial-calendar/${event.eventId}/${action}`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ occurrenceDate: event.date.slice(0, 10) }),
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(payload?.error || `Falha ao atualizar evento (HTTP ${response.status}).`);
        }
        setNotice({
          tone: 'success',
          message: action === 'paid' ? 'Evento marcado como pago.' : 'Evento marcado como recebido.',
        });
        await loadMonth(monthCursor, { silent: true });
      } catch (actionError) {
        setNotice(null);
        setError(actionError instanceof Error ? actionError.message : 'Falha ao atualizar status do evento.');
      } finally {
        setPendingActionId(null);
      }
    },
    [activeWorkspaceId, getAuthHeaders, loadMonth, monthCursor]
  );

  const handleDeleteEvent = React.useCallback(
    async (event: FinancialCalendarOccurrence) => {
      setPendingActionId(event.id);
      try {
        const headers = await getAuthHeaders(true, activeWorkspaceId);
        const isRecurringOccurrence = event.isRecurring;
        const response = await fetch(
          isRecurringOccurrence ? `/api/financial-calendar/${event.eventId}/cancel` : `/api/financial-calendar/${event.eventId}`,
          {
            method: isRecurringOccurrence ? 'POST' : 'DELETE',
            headers,
            body: isRecurringOccurrence ? JSON.stringify({ occurrenceDate: event.date.slice(0, 10) }) : undefined,
          }
        );
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(payload?.error || `Falha ao remover evento (HTTP ${response.status}).`);
        }
        setNotice({
          tone: 'info',
          message: event.isRecurring ? 'Ocorrencia cancelada neste dia.' : 'Evento removido do calendario.',
        });
        await loadMonth(monthCursor, { silent: true });
      } catch (deleteError) {
        setNotice(null);
        setError(deleteError instanceof Error ? deleteError.message : 'Falha ao remover evento financeiro.');
      } finally {
        setPendingActionId(null);
      }
    },
    [activeWorkspaceId, getAuthHeaders, loadMonth, monthCursor]
  );

  const handleOpenOrigin = React.useCallback(
    (event: FinancialCalendarOccurrence) => {
      const destination = resolveOriginDestination(event);
      if (!destination || !onNavigateTab) return;
      setSelectedDayKey(null);
      onNavigateTab(destination.tab);
    },
    [onNavigateTab]
  );

  if (currentPlan === 'FREE') {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <section className="app-surface-card overflow-hidden rounded-[2rem] border border-[rgba(79,140,255,0.14)] bg-[radial-gradient(circle_at_top_right,rgba(79,140,255,0.16),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.025)_0%,rgba(255,255,255,0)_100%),var(--bg-surface)] p-6 sm:p-8">
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div className="space-y-4">
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[var(--text-muted)]">Feature Pro</p>
              <h3 className="page-title-premium max-w-3xl text-[var(--text-primary)]">Calendario Financeiro Inteligente</h3>
              <p className="max-w-2xl text-sm leading-relaxed text-[var(--text-secondary)] sm:text-base">
                Veja o mes como fluxo financeiro, com pressao por dia, vencimentos proximos, saldo previsto e pontos onde a decisao precisa acontecer antes do aperto.
              </p>
              <div className="flex flex-wrap gap-2">
                {['Entradas previstas', 'Contas fixas', 'Datas criticas', 'Saldo projetado'].map((item) => (
                  <span key={item} className="badge-premium bg-[rgba(255,255,255,0.04)] text-[var(--text-secondary)]">
                    {item}
                  </span>
                ))}
              </div>
              <ButtonPrimary className="mt-2 rounded-2xl px-5" onClick={onUpgrade}>
                Desbloquear no Pro
              </ButtonPrimary>
            </div>
            <div className="rounded-[1.8rem] border border-[var(--border-default)] bg-[rgba(7,12,21,0.86)] p-4 shadow-[0_28px_70px_-40px_rgba(2,6,23,0.9)]">
              <div className="grid grid-cols-7 gap-2 text-center text-[11px] font-black uppercase tracking-[0.18em] text-[var(--text-muted)]">
                {WEEKDAY_LABELS.map((label) => (
                  <span key={label}>{label}</span>
                ))}
              </div>
              <div className="mt-3 grid grid-cols-7 gap-2">
                {Array.from({ length: 35 }).map((_, index) => {
                  const isCritical = index === 11 || index === 18 || index === 25;
                  return (
                    <div
                      key={index}
                      className={cn(
                        'min-h-[74px] rounded-2xl border p-2 text-left',
                        isCritical
                          ? 'border-[rgba(255,90,90,0.18)] bg-[rgba(255,90,90,0.07)]'
                          : 'border-[var(--border-default)] bg-[rgba(255,255,255,0.03)]'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[var(--text-secondary)]">{(index % 31) + 1}</span>
                        {isCritical ? <TriangleAlert size={12} className="text-[var(--danger)]" /> : null}
                      </div>
                      <div className="mt-6 flex gap-1">
                        <span className="h-1.5 flex-1 rounded-full bg-[rgba(79,191,138,0.55)]" />
                        <span className="h-1.5 w-6 rounded-full bg-[rgba(255,90,90,0.42)]" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  if (!activeWorkspaceId) {
    return (
      <section className="app-surface-card rounded-[2rem] p-6 sm:p-8">
        <div className="max-w-2xl space-y-3">
          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[var(--text-muted)]">Calendario Financeiro Inteligente</p>
          <h3 className="page-title-premium text-[var(--text-primary)]">Selecione um workspace para ler o mes financeiro</h3>
          <p className="text-sm leading-relaxed text-[var(--text-secondary)] sm:text-base">
            O calendario precisa de um contexto ativo para carregar entradas, saidas, vencimentos e alertas do periodo.
          </p>
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[var(--text-muted)]">Calendario Financeiro Inteligente</p>
          <h3 className="page-title-premium text-[var(--text-primary)]">Mapa financeiro do mes antes dele acontecer</h3>
          <p className="max-w-3xl text-sm leading-relaxed text-[var(--text-secondary)] sm:text-base">
            Leia entradas, saidas, concentracoes de vencimento e pressao de caixa sem cair na logica de agenda generica.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ButtonSecondary className="rounded-2xl px-4" onClick={() => handleMonthShift(-1)}>
            <ChevronLeft size={16} />
            Mes anterior
          </ButtonSecondary>
          <div data-testid="financial-calendar-month-label" className="rounded-2xl border border-[var(--border-default)] bg-[rgba(255,255,255,0.04)] px-4 py-3 text-sm font-bold capitalize text-[var(--text-primary)]">
            {formatMonthLabel(monthCursor)}
          </div>
          <ButtonSecondary className="rounded-2xl px-4" onClick={() => handleMonthShift(1)}>
            Proximo mes
            <ChevronRight size={16} />
          </ButtonSecondary>
          <ButtonSecondary className="rounded-2xl px-4" onClick={handleGoToToday}>
            Hoje
          </ButtonSecondary>
          <ButtonPrimary data-testid="financial-calendar-new-event" className="rounded-2xl px-4" onClick={() => handleOpenComposer()}>
            <Plus size={16} />
            Novo evento
          </ButtonPrimary>
        </div>
      </div>

      <div data-testid="financial-calendar-feedback" aria-live="polite" className="space-y-3">
        {notice ? (
          <div
            className={cn(
              'rounded-3xl border px-4 py-3 text-sm',
              notice.tone === 'success'
                ? 'border-[rgba(79,191,138,0.18)] bg-[rgba(79,191,138,0.10)] text-[color:color-mix(in_srgb,var(--positive)_84%,white)]'
                : 'border-[rgba(79,140,255,0.18)] bg-[rgba(79,140,255,0.10)] text-[color:color-mix(in_srgb,var(--primary)_84%,white)]'
            )}
          >
            <div className="flex items-start gap-3">
              <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
              <p>{notice.message}</p>
            </div>
          </div>
        ) : null}

        {error ? (
          <div role="alert" className="rounded-3xl border border-[rgba(255,90,90,0.2)] bg-[rgba(255,90,90,0.08)] px-4 py-3 text-sm text-[var(--danger)]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p>{error}</p>
              <ButtonSecondary className="rounded-2xl px-4" onClick={handleRetry}>
                <RefreshCw size={14} />
                Tentar novamente
              </ButtonSecondary>
            </div>
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <button
          type="button"
          onClick={() => {
            if (primaryAlert.dayKey) {
              setSelectedDayKey(primaryAlert.dayKey);
            }
          }}
          disabled={!primaryAlert.dayKey}
          className={cn(
            'app-surface-card group relative overflow-hidden rounded-[2rem] p-5 text-left xl:col-span-6 disabled:cursor-default disabled:opacity-100',
            primaryAlert.tone === 'danger'
              ? 'border-[rgba(255,90,90,0.18)] bg-[radial-gradient(circle_at_top_right,rgba(255,90,90,0.12),transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.02)_0%,rgba(255,255,255,0)_100%),var(--bg-surface)]'
              : primaryAlert.tone === 'warning'
                ? 'border-[rgba(217,164,65,0.18)] bg-[radial-gradient(circle_at_top_right,rgba(217,164,65,0.14),transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.02)_0%,rgba(255,255,255,0)_100%),var(--bg-surface)]'
                : primaryAlert.tone === 'positive'
                  ? 'border-[rgba(79,191,138,0.18)] bg-[radial-gradient(circle_at_top_right,rgba(79,191,138,0.12),transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.02)_0%,rgba(255,255,255,0)_100%),var(--bg-surface)]'
                  : 'border-[rgba(79,140,255,0.16)] bg-[radial-gradient(circle_at_top_right,rgba(79,140,255,0.14),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.02)_0%,rgba(255,255,255,0)_100%),var(--bg-surface)]'
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-3">
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[var(--text-muted)]">{primaryAlert.eyebrow}</p>
              <h4 className="max-w-2xl text-2xl font-black tracking-[-0.03em] text-[var(--text-primary)]">
                {primaryAlert.title}
              </h4>
              <p className="max-w-2xl text-sm leading-relaxed text-[var(--text-secondary)]">{primaryAlert.message}</p>
            </div>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[var(--border-default)] bg-[rgba(255,255,255,0.05)] text-[var(--text-primary)]">
              <Sparkles size={20} />
            </div>
          </div>
        </button>

        <div className="app-surface-card rounded-[2rem] p-5 xl:col-span-2">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[var(--text-muted)]">Entradas previstas</p>
          <p className="mt-3 text-2xl font-black text-[var(--positive)]">
            {isLoading ? '--' : formatCurrency(snapshot?.summary.totalExpectedInflow)}
          </p>
          <div className="mt-6 flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)]">
            <ArrowDownRight size={14} className="text-[var(--positive)]" />
            Caixa esperado para entrar
          </div>
        </div>

        <div className="app-surface-card rounded-[2rem] p-5 xl:col-span-2">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[var(--text-muted)]">Saidas previstas</p>
          <p className="mt-3 text-2xl font-black text-[var(--text-primary)]">
            {isLoading ? '--' : formatCurrency(snapshot?.summary.totalExpectedOutflow)}
          </p>
          <div className="mt-6 flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)]">
            <ReceiptText size={14} className="text-[var(--warning)]" />
            Compromissos mapeados no periodo
          </div>
        </div>

        <div className="app-surface-card rounded-[2rem] p-5 xl:col-span-2">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[var(--text-muted)]">Saldo previsto</p>
          <p className={cn('mt-3 text-2xl font-black', Number(snapshot?.summary.projectedBalance || 0) >= 0 ? 'text-[var(--text-primary)]' : 'text-[var(--danger)]')}>
            {isLoading ? '--' : formatCurrency(snapshot?.summary.projectedBalance)}
          </p>
          <div className="mt-6 flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)]">
            <Wallet size={14} className="text-[var(--primary)]" />
            Abertura + movimentos previstos
          </div>
        </div>
            </div>

      {topAlerts.length > 0 ? (
        <div className="grid gap-3 lg:grid-cols-3">
          {topAlerts.map((alert) => (
            <button
              key={alert.id}
              type="button"
              onClick={() => {
                if (alert.dayKey) {
                  setSelectedDayKey(alert.dayKey);
                }
              }}
              disabled={!alert.dayKey}
              className={cn(
                'rounded-[1.6rem] border p-4 text-left transition hover:-translate-y-0.5 hover:border-[var(--border-strong)] disabled:cursor-default',
                getAlertCardTone(alert)
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--text-muted)]">
                    {getAlertEyebrow(alert)}
                  </p>
                  <p className="mt-2 text-sm font-bold leading-relaxed text-[var(--text-primary)]">{alert.title}</p>
                </div>
                <span className="rounded-full border border-[rgba(255,255,255,0.09)] bg-[rgba(255,255,255,0.05)] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                  {formatAlertWindow(alert)}
                </span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">{alert.message}</p>
            </button>
          ))}
        </div>
      ) : null}

      <section className="app-surface-card overflow-hidden rounded-[2rem] border border-[var(--border-default)] bg-[linear-gradient(180deg,rgba(255,255,255,0.018)_0%,rgba(255,255,255,0)_100%),var(--bg-surface)]">
        <div className="flex flex-col gap-4 border-b border-[var(--border-default)] px-4 py-4 sm:px-6 sm:py-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[var(--text-muted)]">Visao mensal</p>
            <h4 className="mt-2 text-xl font-black capitalize tracking-[-0.03em] text-[var(--text-primary)]">
              {formatMonthLabel(monthCursor)}
            </h4>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-black uppercase tracking-[0.16em]">
            <span className="rounded-full border border-[rgba(79,191,138,0.24)] bg-[rgba(79,191,138,0.10)] px-3 py-1 text-[color:color-mix(in_srgb,var(--positive)_82%,white)]">Entradas</span>
            <span className="rounded-full border border-[rgba(255,255,255,0.09)] bg-[rgba(255,255,255,0.04)] px-3 py-1 text-[var(--text-secondary)]">Saidas fixas</span>
            <span className="rounded-full border border-[rgba(217,164,65,0.24)] bg-[rgba(217,164,65,0.10)] px-3 py-1 text-[color:color-mix(in_srgb,var(--warning)_82%,white)]">Faturas e parcelas</span>
            <span className="rounded-full border border-[rgba(217,164,65,0.18)] bg-[rgba(217,164,65,0.08)] px-3 py-1 text-[color:color-mix(in_srgb,var(--warning)_80%,white)]">Vence logo</span>
            <span className="rounded-full border border-[rgba(255,90,90,0.18)] bg-[rgba(255,90,90,0.08)] px-3 py-1 text-[color:color-mix(in_srgb,var(--danger)_82%,white)]">Vencidos</span>
            <span className="rounded-full border border-[rgba(255,90,90,0.22)] bg-[rgba(255,90,90,0.10)] px-3 py-1 text-[color:color-mix(in_srgb,var(--danger)_82%,white)]">Datas criticas</span>
          </div>
        </div>

        <div className="px-3 pb-3 pt-4 sm:px-5 sm:pb-5">
          <div data-testid="financial-calendar-grid-scroll" className="overflow-x-auto overscroll-x-contain pb-1">
            <div className="min-w-[720px]">
              <div className="mb-3 grid grid-cols-7 gap-2 text-center text-[11px] font-black uppercase tracking-[0.18em] text-[var(--text-muted)] sm:mb-4 sm:gap-3">
                {WEEKDAY_LABELS.map((label) => (
                  <div key={label}>{label}</div>
                ))}
              </div>

              {isLoading ? (
                <div className="grid grid-cols-7 gap-2 sm:gap-3" aria-hidden="true">
                  {Array.from({ length: 35 }).map((_, index) => (
                    <div key={index} className="min-h-[102px] animate-pulse rounded-[1.4rem] border border-[var(--border-default)] bg-[rgba(255,255,255,0.03)] p-3 sm:min-h-[128px]" />
                  ))}
                </div>
              ) : !hasMonthEvents ? (
                <div className="rounded-[1.8rem] border border-dashed border-[var(--border-default)] bg-[rgba(255,255,255,0.03)] px-6 py-12 text-center">
                  <p className="text-base font-bold text-[var(--text-primary)]">Nenhum evento financeiro neste mes</p>
                  <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-[var(--text-secondary)]">
                    O mes ainda esta limpo. Adicione um evento manual ou aguarde a sincronizacao de despesas, receitas, metas e recorrencias.
                  </p>
                  <ButtonPrimary data-testid="financial-calendar-empty-create" className="mt-5 rounded-2xl px-5" onClick={() => handleOpenComposer(monthCursor)}>
                    <Plus size={16} />
                    Adicionar primeiro evento
                  </ButtonPrimary>
                </div>
              ) : (
                <div className="grid grid-cols-7 gap-2 sm:gap-3">
                  {cells.map((cell) => {
                    const summaryDots = getCellSummary(cell.group);
                    const netIsPositive = cell.group.net >= 0;
                    const isSelected = selectedDayKey === cell.key;
                    return (
                      <button
                        key={cell.key}
                        type="button"
                        data-testid={`financial-calendar-day-${cell.key}`}
                        aria-label={getCellAriaLabel(cell)}
                        aria-pressed={isSelected}
                        onClick={() => {
                          if (!cell.isCurrentMonth) {
                            setMonthCursor(new Date(cell.date.getFullYear(), cell.date.getMonth(), 1));
                            return;
                          }
                          setSelectedDayKey(cell.key);
                        }}
                        className={cn(
                          'group relative min-h-[102px] overflow-hidden rounded-[1.35rem] border p-2.5 text-left transition-all sm:min-h-[128px] sm:p-3',
                          cell.isCurrentMonth
                            ? 'border-[var(--border-default)] bg-[linear-gradient(180deg,rgba(255,255,255,0.025)_0%,rgba(255,255,255,0)_100%),rgba(10,16,28,0.92)] hover:-translate-y-0.5 hover:border-[var(--border-strong)] hover:bg-[rgba(16,24,39,0.98)]'
                            : 'border-[rgba(255,255,255,0.04)] bg-[rgba(255,255,255,0.02)] text-[var(--text-muted)]',
                          cell.isCritical && cell.isCurrentMonth && 'border-[rgba(255,90,90,0.18)] bg-[radial-gradient(circle_at_top_right,rgba(255,90,90,0.10),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.025)_0%,rgba(255,255,255,0)_100%),rgba(10,16,28,0.96)]',
                          cell.hasOverdue && !cell.isCritical && cell.isCurrentMonth && 'border-[rgba(255,90,90,0.16)] bg-[radial-gradient(circle_at_top_right,rgba(255,90,90,0.08),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.025)_0%,rgba(255,255,255,0)_100%),rgba(10,16,28,0.94)]',
                          cell.hasDueSoon && !cell.hasOverdue && !cell.isCritical && cell.isCurrentMonth && 'border-[rgba(217,164,65,0.16)] bg-[radial-gradient(circle_at_top_right,rgba(217,164,65,0.08),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.025)_0%,rgba(255,255,255,0)_100%),rgba(10,16,28,0.94)]',
                          cell.isToday && 'ring-1 ring-[rgba(79,140,255,0.34)]',
                          isSelected && 'ring-2 ring-[rgba(79,140,255,0.24)]'
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className={cn('text-sm font-black', cell.isCurrentMonth ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]')}>
                            {cell.label}
                          </span>
                          {cell.group.events.length > 0 ? (
                            <span className="rounded-full border border-[var(--border-default)] bg-[rgba(255,255,255,0.04)] px-2 py-0.5 text-[10px] font-black text-[var(--text-secondary)]">
                              {cell.group.events.length}
                            </span>
                          ) : null}
                        </div>

                        {cell.isCurrentMonth ? (
                          <div className="mt-4 flex h-[calc(100%-1.5rem)] flex-col justify-between">
                            <div className="flex flex-wrap gap-1">
                              {summaryDots.length > 0 ? (
                                summaryDots.map((tone, index) => (
                                  <span key={`${cell.key}-${index}`} className={cn('h-1.5 rounded-full', tone.dot, index === 0 ? 'w-8' : index === 1 ? 'w-5' : 'w-3')} />
                                ))
                              ) : (
                                <span className="text-[10px] font-semibold text-[var(--text-muted)]">Sem eventos</span>
                              )}
                            </div>

                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                                <span>{cell.isCritical ? 'Pressao' : cell.hasOverdue ? 'Vencido' : cell.hasDueSoon ? 'Vence logo' : 'Fluxo'}</span>
                                {cell.isCritical ? <TriangleAlert size={11} className="text-[var(--danger)]" /> : cell.hasOverdue ? <TriangleAlert size={11} className="text-[var(--danger)]" /> : cell.hasDueSoon ? <Bell size={11} className="text-[var(--warning)]" /> : null}
                              </div>
                              <p className={cn('text-xs font-black sm:text-sm', netIsPositive ? 'text-[var(--text-primary)]' : 'text-[var(--danger)]')}>
                                {formatCompactCurrency(cell.group.net)}
                              </p>
                            </div>
                          </div>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <FinancialCalendarDaySheet
        isOpen={Boolean(selectedDay)}
        day={selectedDay}
        insights={selectedDayInsights}
        onClose={() => setSelectedDayKey(null)}
        onMarkPaid={(event) => void handleEventAction(event, 'paid')}
        onMarkReceived={(event) => void handleEventAction(event, 'received')}
        onEdit={handleOpenEdit}
        onDelete={(event) => void handleDeleteEvent(event)}
        onOpenOrigin={handleOpenOrigin}
        pendingActionId={pendingActionId}
      />

      <FinancialCalendarComposer
        isOpen={isComposerOpen}
        mode={composerMode}
        initialDate={composerDate}
        initialValues={composerInitialValues}
        isSubmitting={isSubmitting}
        error={composerError}
        onClose={() => {
          setIsComposerOpen(false);
          setEditingEvent(null);
          setComposerMode('create');
        }}
        onSubmit={(payload) => void handleSubmitComposer(payload)}
      />
    </div>
  );
}






















