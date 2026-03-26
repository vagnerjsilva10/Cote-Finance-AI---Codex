'use client';

import * as React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  CreditCard,
  Pencil,
  ReceiptText,
  Target,
  Trash2,
  TriangleAlert,
  X,
} from 'lucide-react';
import type {
  FinancialCalendarDayGroup,
  FinancialCalendarOccurrence,
} from '@/lib/financial-calendar/types';
import { ButtonPrimary, ButtonSecondary } from '@/components/ui/premium-primitives';
import { cn } from '@/lib/utils';

type FinancialCalendarDaySheetProps = {
  isOpen: boolean;
  day: FinancialCalendarDayGroup | null;
  insights: string[];
  onClose: () => void;
  onMarkPaid: (event: FinancialCalendarOccurrence) => void;
  onMarkReceived: (event: FinancialCalendarOccurrence) => void;
  onEdit: (event: FinancialCalendarOccurrence) => void;
  onDelete: (event: FinancialCalendarOccurrence) => void;
  onOpenOrigin: (event: FinancialCalendarOccurrence) => void;
  pendingActionId?: string | null;
};

function formatCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
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

function formatDayTitle(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  }).format(parseCalendarValue(value));
}

function getEventIcon(event: FinancialCalendarOccurrence) {
  if (event.type === 'EXPECTED_INCOME') return ArrowDownRight;
  if (event.type === 'CARD_BILL') return CreditCard;
  if (event.type === 'GOAL_DEADLINE') return Target;
  if (event.type === 'FINANCIAL_REMINDER' || event.type === 'MANUAL_ALERT') return Bell;
  return ReceiptText;
}

function getEventTypeLabel(event: FinancialCalendarOccurrence) {
  if (event.type === 'EXPECTED_INCOME') return 'Entrada';
  if (event.type === 'FIXED_BILL') return 'Conta fixa';
  if (event.type === 'CARD_BILL') return 'Fatura';
  if (event.type === 'INSTALLMENT') return 'Parcela';
  if (event.type === 'SUBSCRIPTION') return 'Assinatura';
  if (event.type === 'GOAL_DEADLINE') return 'Meta';
  if (event.type === 'FINANCIAL_REMINDER') return 'Lembrete';
  return 'Alerta';
}

function getEventTone(event: FinancialCalendarOccurrence) {
  if (event.type === 'EXPECTED_INCOME') {
    return {
      iconWrap: 'bg-[color-mix(in_srgb,var(--success)_16%,transparent)] text-[var(--success)] border-[color-mix(in_srgb,var(--success)_22%,transparent)]',
      badge: 'border-[color-mix(in_srgb,var(--success)_26%,transparent)] bg-[color-mix(in_srgb,var(--success)_12%,transparent)] text-[color:color-mix(in_srgb,var(--success)_82%,white)]',
    };
  }

  if (event.type === 'CARD_BILL' || event.type === 'INSTALLMENT') {
    return {
      iconWrap: 'bg-[color-mix(in_srgb,var(--warning)_14%,transparent)] text-[var(--warning)] border-[color-mix(in_srgb,var(--warning)_22%,transparent)]',
      badge: 'border-[color-mix(in_srgb,var(--warning)_24%,transparent)] bg-[color-mix(in_srgb,var(--warning)_12%,transparent)] text-[color:color-mix(in_srgb,var(--warning)_82%,white)]',
    };
  }

  if (event.type === 'GOAL_DEADLINE') {
    return {
      iconWrap: 'bg-[color-mix(in_srgb,var(--accent)_16%,transparent)] text-[var(--primary)] border-[color-mix(in_srgb,var(--accent)_22%,transparent)]',
      badge: 'border-[color-mix(in_srgb,var(--accent)_24%,transparent)] bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] text-[color:color-mix(in_srgb,var(--primary)_82%,white)]',
    };
  }

  if (event.type === 'FINANCIAL_REMINDER' || event.type === 'MANUAL_ALERT') {
    return {
      iconWrap: 'bg-[color-mix(in_srgb,var(--danger)_13%,transparent)] text-[var(--danger)] border-[color-mix(in_srgb,var(--danger)_18%,transparent)]',
      badge: 'border-[color-mix(in_srgb,var(--danger)_22%,transparent)] bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] text-[color:color-mix(in_srgb,var(--danger)_84%,white)]',
    };
  }

  return {
    iconWrap: 'bg-[color-mix(in_srgb,var(--neutral)_12%,transparent)] text-[var(--text-secondary)] border-[color-mix(in_srgb,var(--neutral)_8%,transparent)]',
    badge: 'border-[color-mix(in_srgb,var(--neutral)_9%,transparent)] bg-[color-mix(in_srgb,var(--neutral)_4%,transparent)] text-[var(--text-secondary)]',
  };
}

function getStatusLabel(event: FinancialCalendarOccurrence) {
  if (event.status === 'PAID') return 'Pago';
  if (event.status === 'RECEIVED') return 'Recebido';
  if (event.status === 'OVERDUE') return 'Vencido';
  if (event.status === 'CANCELED') return 'Cancelado';
  return 'Pendente';
}

function getStatusTone(event: FinancialCalendarOccurrence) {
  if (event.status === 'PAID' || event.status === 'RECEIVED') {
    return 'border-[color-mix(in_srgb,var(--success)_26%,transparent)] bg-[color-mix(in_srgb,var(--success)_10%,transparent)] text-[color:color-mix(in_srgb,var(--success)_84%,white)]';
  }
  if (event.status === 'OVERDUE') {
    return 'border-[color-mix(in_srgb,var(--danger)_24%,transparent)] bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] text-[color:color-mix(in_srgb,var(--danger)_84%,white)]';
  }
  if (event.status === 'CANCELED') {
    return 'border-[color-mix(in_srgb,var(--neutral)_18%,transparent)] bg-[color-mix(in_srgb,var(--neutral)_8%,transparent)] text-[var(--text-muted)]';
  }
  return 'border-[color-mix(in_srgb,var(--warning)_22%,transparent)] bg-[color-mix(in_srgb,var(--warning)_10%,transparent)] text-[color:color-mix(in_srgb,var(--warning)_78%,white)]';
}

function resolveOriginMeta(event: FinancialCalendarOccurrence) {
  if (!event.sourceId || event.sourceType === 'MANUAL') return null;

  if (event.sourceType === 'GOAL') {
    return {
      label: 'Meta vinculada ao prazo financeiro.',
      actionLabel: 'Abrir meta',
    };
  }

  if (event.sourceType === 'INCOME') {
    return {
      label: 'Receita sincronizada a partir do m\u00f3dulo de lan\u00e7amentos.',
      actionLabel: 'Abrir receita',
    };
  }

  if (event.sourceType === 'EXPENSE' || event.sourceType === 'CARD_BILL' || event.sourceType === 'INSTALLMENT') {
    return {
      label: 'Lan\u00e7amento sincronizado a partir da base financeira principal.',
      actionLabel: 'Abrir origem',
    };
  }

  if (event.sourceType === 'SUBSCRIPTION') {
    return {
      label: 'Recorr\u00eancia conectada a despesas assinadas ou fixas.',
      actionLabel: 'Abrir origem',
    };
  }
  return null;
}

function buildEventObservations(event: FinancialCalendarOccurrence) {
  const notes: string[] = [];

  if (event.status === 'OVERDUE') {
    notes.push('J\u00e1 passou do vencimento e pede a\u00e7\u00e3o imediata.');
  }

  if (event.isRecurring) {
    notes.push(`Recorr\u00eancia ${event.recurrence.toLowerCase()} ativa na s\u00e9rie.`);
  }

  if (event.reminderEnabled) {
    notes.push(`Lembrete ativo ${event.reminderDaysBefore} dia(s) antes.`);
  }

  if (event.isDerived) {
    notes.push('Mant\u00e9m sincroniza\u00e7\u00e3o com a origem do dado.');
  }

  return notes;
}

export function FinancialCalendarDaySheet({
  isOpen,
  day,
  insights,
  onClose,
  onMarkPaid,
  onMarkReceived,
  onEdit,
  onDelete,
  onOpenOrigin,
  pendingActionId,
}: FinancialCalendarDaySheetProps) {
  const headingId = React.useId();

  React.useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && day ? (
        <motion.div
          className="theme-modal-backdrop fixed inset-0 z-[138] flex items-end justify-center bg-[var(--bg-app)]/70 p-0 sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button type="button" aria-label="Fechar detalhes do dia" className="absolute inset-0" onClick={onClose} />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={headingId}
            initial={{ opacity: 0, y: 28, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            data-testid="financial-calendar-day-sheet" className="theme-modal-surface relative z-10 flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-[1.85rem] border border-[var(--border-default)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--neutral)_2%,transparent)_0%,transparent_100%),var(--bg-surface)] shadow-2xl sm:rounded-[2rem]"
          >
            <div className="flex items-start justify-between gap-4 border-b border-[var(--border-default)] px-5 py-4 sm:px-6">
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--text-muted)] sm:text-[11px]">
                  {'Leitura di\u00e1ria'}
                </p>
                <h3 id={headingId} className="text-xl font-black capitalize tracking-[-0.03em] text-[var(--text-primary)] sm:text-2xl">
                  {formatDayTitle(day.date)}
                </h3>
                <div className="flex flex-wrap items-center gap-2.5 text-xs font-medium text-[var(--text-secondary)]">
                  <span className="rounded-full border border-[color-mix(in_srgb,var(--neutral)_8%,transparent)] bg-[color-mix(in_srgb,var(--neutral)_3%,transparent)] px-3 py-1">
                    {day.events.length} evento{day.events.length === 1 ? '' : 's'}
                  </span>
                  <span
                    className={cn(
                      'rounded-full border px-3 py-1',
                      day.pressureLevel === 'high'
                        ? 'border-[color-mix(in_srgb,var(--danger)_20%,transparent)] bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] text-[var(--danger)]'
                        : day.pressureLevel === 'medium'
                          ? 'border-[color-mix(in_srgb,var(--warning)_24%,transparent)] bg-[color-mix(in_srgb,var(--warning)_10%,transparent)] text-[var(--warning)]'
                          : 'border-[color-mix(in_srgb,var(--success)_20%,transparent)] bg-[color-mix(in_srgb,var(--success)_10%,transparent)] text-[var(--success)]'
                    )}
                  >
                    Press\u00e3o {day.pressureLevel === 'high' ? 'alta' : day.pressureLevel === 'medium' ? 'moderada' : 'baixa'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar painel do dia"
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--border-default)] bg-[color-mix(in_srgb,var(--neutral)_3%,transparent)] text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
              >
                <X size={18} />
              </button>
            </div>

            <div className="custom-scrollbar flex-1 space-y-5 overflow-y-auto overscroll-contain px-5 py-5 pb-[max(env(safe-area-inset-bottom),1.25rem)] sm:px-6">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-3xl border border-[var(--border-default)] bg-[color-mix(in_srgb,var(--success)_6%,transparent)] p-4 shadow-[inset_0_1px_0_color-mix(in_srgb,var(--neutral)_3%,transparent)]">
                  <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[var(--text-muted)]">Entradas</p>
                  <p className="mt-3 text-2xl font-black text-[var(--success)]">{formatCurrency(day.inflow)}</p>
                </div>
                <div className="rounded-3xl border border-[var(--border-default)] bg-[color-mix(in_srgb,var(--danger)_5%,transparent)] p-4 shadow-[inset_0_1px_0_color-mix(in_srgb,var(--neutral)_3%,transparent)]">
                  <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[var(--text-muted)]">{'Sa\u00eddas'}</p>
                  <p className="mt-3 text-2xl font-black text-[var(--danger)]">{formatCurrency(day.outflow)}</p>
                </div>
                <div className="rounded-3xl border border-[var(--border-default)] bg-[color-mix(in_srgb,var(--accent)_6%,transparent)] p-4 shadow-[inset_0_1px_0_color-mix(in_srgb,var(--neutral)_3%,transparent)]">
                  <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[var(--text-muted)]">Impacto no saldo</p>
                  <p className={cn('mt-3 text-2xl font-black', day.net >= 0 ? 'text-[var(--text-primary)]' : 'text-[var(--danger)]')}>
                    {day.net >= 0 ? '+' : ''}
                    {formatCurrency(day.net)}
                  </p>
                </div>
                <div className="rounded-3xl border border-[var(--border-default)] bg-[color-mix(in_srgb,var(--neutral)_4%,transparent)] p-4 shadow-[inset_0_1px_0_color-mix(in_srgb,var(--neutral)_3%,transparent)]">
                  <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[var(--text-muted)]">Saldo projetado</p>
                  <p className={cn('mt-3 text-2xl font-black', (day.projectedBalance || 0) >= 0 ? 'text-[var(--text-primary)]' : 'text-[var(--danger)]')}>
                    {formatCurrency(day.projectedBalance)}
                  </p>
                </div>
              </div>

              {(insights.length > 0 || day.reasons.length > 0) && (
                <div className="rounded-3xl border border-[color-mix(in_srgb,var(--warning)_16%,transparent)] bg-[color-mix(in_srgb,var(--warning)_7%,transparent)] p-4 text-sm text-[var(--text-secondary)]">
                  <div className="flex items-center gap-2 text-[var(--warning)]">
                    <TriangleAlert size={16} />
                    <span className="text-xs font-black uppercase tracking-[0.22em]">Insights do dia</span>
                  </div>
                  {insights.length > 0 ? (
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {insights.map((insight) => (
                        <div
                          key={insight}
                          className="rounded-2xl border border-[color-mix(in_srgb,var(--neutral)_8%,transparent)] bg-[color-mix(in_srgb,var(--bg-tertiary)_82%,transparent)] px-3 py-3 leading-relaxed text-[var(--text-primary)]"
                        >
                          {insight}
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {day.reasons.length > 0 ? (
                    <p className="mt-3 leading-relaxed">{day.reasons.join(' - ')}.</p>
                  ) : null}
                </div>
              )}

              {day.events.length === 0 ? (
                <div className="rounded-[1.7rem] border border-dashed border-[color-mix(in_srgb,var(--accent)_16%,transparent)] bg-[radial-gradient(circle_at_top,color-mix(in_srgb,var(--accent)_8%,transparent),transparent_42%),color-mix(in_srgb,var(--neutral)_3%,transparent)] px-5 py-10 text-center">
                  <p className="text-base font-bold text-[var(--text-primary)]">Nenhum evento financeiro neste dia</p>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
                    {'Use este espa\u00e7o para avaliar folga de caixa, reservar saldo ou criar um novo evento financeiro manual.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {day.events.map((event) => {
                    const Icon = getEventIcon(event);
                    const tone = getEventTone(event);
                    const canSettle = event.status === 'PENDING' || event.status === 'OVERDUE';
                    const isBusy = pendingActionId === event.id;
                    const originMeta = resolveOriginMeta(event);
                    const observations = buildEventObservations(event);

                    return (
                      <article
                        key={event.id}
                        aria-busy={isBusy}
                        className="rounded-[1.6rem] border border-[var(--border-default)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--neutral)_3%,transparent)_0%,transparent_100%),color-mix(in_srgb,var(--bg-tertiary)_88%,transparent)] p-4 shadow-[0_18px_40px_-28px_color-mix(in_srgb,var(--bg-deep)_80%,transparent)]"
                      >
                        <div className="flex items-start gap-3">
                          <div className={cn('mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border', tone.iconWrap)}>
                            <Icon size={18} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-base font-bold text-[var(--text-primary)]">{event.title}</p>
                                {event.description ? (
                                  <p className="mt-1 text-sm leading-relaxed text-[var(--text-secondary)]">{event.description}</p>
                                ) : null}
                              </div>
                              {typeof event.amount === 'number' ? (
                                <p className={cn('shrink-0 text-right text-base font-black', event.flow === 'in' ? 'text-[var(--success)]' : event.flow === 'out' ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]')}>
                                  {event.flow === 'in' ? '+' : event.flow === 'out' ? '-' : ''}
                                  {formatCurrency(event.amount)}
                                </p>
                              ) : null}
                            </div>

                            <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em]">
                              <span className={cn('rounded-full border px-2.5 py-1', tone.badge)}>{getEventTypeLabel(event)}</span>
                              <span className={cn('rounded-full border px-2.5 py-1', getStatusTone(event))}>{getStatusLabel(event)}</span>
                              {event.category ? (
                                <span className="rounded-full border border-[var(--border-default)] bg-[color-mix(in_srgb,var(--neutral)_4%,transparent)] px-2.5 py-1 text-[var(--text-secondary)]">
                                  {event.category}
                                </span>
                              ) : null}
                            </div>

                            {originMeta ? (
                              <div className="mt-3 rounded-2xl border border-[color-mix(in_srgb,var(--neutral)_8%,transparent)] bg-[color-mix(in_srgb,var(--neutral)_3%,transparent)] px-3 py-3 text-sm text-[var(--text-secondary)]">
                                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--text-muted)]">Origem</p>
                                <p className="mt-2 leading-relaxed text-[var(--text-primary)]">{originMeta.label}</p>
                              </div>
                            ) : null}

                            {observations.length > 0 ? (
                              <div className="mt-3 rounded-2xl border border-[color-mix(in_srgb,var(--neutral)_8%,transparent)] bg-[color-mix(in_srgb,var(--neutral)_3%,transparent)] px-3 py-3 text-sm text-[var(--text-secondary)]">
                                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--text-muted)]">{'Observa\u00e7\u00f5es relevantes'}</p>
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {observations.map((note) => (
                                    <span
                                      key={note}
                                      className="rounded-full border border-[color-mix(in_srgb,var(--neutral)_9%,transparent)] bg-[color-mix(in_srgb,var(--bg-tertiary)_86%,transparent)] px-3 py-1 text-xs font-semibold text-[var(--text-secondary)]"
                                    >
                                      {note}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ) : null}

                            <div className="mt-4 flex flex-wrap gap-2.5">
                              {canSettle && event.flow === 'out' ? (
                                <ButtonPrimary
                                  data-testid={`financial-calendar-event-${event.id}-paid`}
                                  className="min-h-10 rounded-xl px-4 text-xs font-semibold"
                                  onClick={() => onMarkPaid(event)}
                                  disabled={isBusy}
                                >
                                  {isBusy ? 'Salvando...' : 'Marcar pago'}
                                </ButtonPrimary>
                              ) : null}

                              {canSettle && event.flow === 'in' ? (
                                <ButtonPrimary
                                  data-testid={`financial-calendar-event-${event.id}-received`}
                                  className="min-h-10 rounded-xl px-4 text-xs font-semibold"
                                  onClick={() => onMarkReceived(event)}
                                  disabled={isBusy}
                                >
                                  {isBusy ? 'Salvando...' : 'Marcar recebido'}
                                </ButtonPrimary>
                              ) : null}

                              {event.isManual ? (
                                <ButtonSecondary
                                  data-testid={`financial-calendar-event-${event.id}-edit`}
                                  className="min-h-10 rounded-xl px-4 text-xs font-semibold"
                                  onClick={() => onEdit(event)}
                                  disabled={isBusy}
                                >
                                  <Pencil size={14} />
                                  Editar manual
                                </ButtonSecondary>
                              ) : null}

                              {event.isManual ? (
                                <ButtonSecondary
                                  data-testid={`financial-calendar-event-${event.id}-delete`}
                                  className="min-h-10 rounded-xl px-4 text-xs font-semibold"
                                  onClick={() => onDelete(event)}
                                  disabled={isBusy}
                                >
                                  <Trash2 size={14} />
                                  {event.isRecurring ? 'Cancelar ocorr\u00eancia' : 'Excluir evento'}
                                </ButtonSecondary>
                              ) : null}

                              {originMeta ? (
                                <ButtonSecondary
                                  className="min-h-10 rounded-xl px-4 text-xs font-semibold"
                                  onClick={() => onOpenOrigin(event)}
                                  disabled={isBusy}
                                >
                                  <ArrowUpRight size={14} />
                                  {originMeta.actionLabel}
                                </ButtonSecondary>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
