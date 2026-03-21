'use client';

import * as React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Pencil, Plus, X } from 'lucide-react';
import { ButtonPrimary, ButtonSecondary } from '@/components/ui/premium-primitives';
import { cn } from '@/lib/utils';

type ComposerField =
  | 'title'
  | 'type'
  | 'amount'
  | 'category'
  | 'date'
  | 'recurrence'
  | 'status'
  | 'reminderDaysBefore';

export type FinancialCalendarComposerValues = {
  title: string;
  description: string;
  type: string;
  amount: string;
  category: string;
  date: string;
  recurrence: string;
  status: string;
  reminderEnabled: boolean;
  reminderDaysBefore: string;
};

export type FinancialCalendarComposerPayload = {
  title: string;
  description: string | null;
  type: string;
  amount: string;
  category: string | null;
  date: string;
  recurrence: string;
  status: string;
  reminderEnabled: boolean;
  reminderDaysBefore: string;
};

type FinancialCalendarComposerProps = {
  isOpen: boolean;
  mode: 'create' | 'edit';
  initialDate: string;
  initialValues?: Partial<FinancialCalendarComposerValues> | null;
  isSubmitting: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (payload: FinancialCalendarComposerPayload) => void;
};

const EVENT_TYPE_OPTIONS = [
  { value: 'EXPECTED_INCOME', label: 'Entrada prevista' },
  { value: 'FIXED_BILL', label: 'Conta' },
  { value: 'CARD_BILL', label: 'Fatura' },
  { value: 'INSTALLMENT', label: 'Parcela' },
  { value: 'SUBSCRIPTION', label: 'Assinatura' },
  { value: 'GOAL_DEADLINE', label: 'Meta' },
  { value: 'FINANCIAL_REMINDER', label: 'Lembrete financeiro' },
  { value: 'MANUAL_ALERT', label: 'Outro evento financeiro' },
] as const;

const RECURRENCE_OPTIONS = [
  { value: 'NONE', label: 'Nao recorrente' },
  { value: 'DAILY', label: 'Diaria' },
  { value: 'WEEKLY', label: 'Semanal' },
  { value: 'MONTHLY', label: 'Mensal' },
  { value: 'YEARLY', label: 'Anual' },
] as const;

function getDefaultState(date: string): FinancialCalendarComposerValues {
  return {
    title: '',
    description: '',
    type: 'FIXED_BILL',
    amount: '',
    category: '',
    date,
    recurrence: 'NONE',
    status: 'PENDING',
    reminderEnabled: true,
    reminderDaysBefore: '3',
  };
}

function mergeInitialState(date: string, initialValues?: Partial<FinancialCalendarComposerValues> | null) {
  return {
    ...getDefaultState(date),
    ...initialValues,
  } satisfies FinancialCalendarComposerValues;
}

function isNeutralType(type: string) {
  return type === 'GOAL_DEADLINE' || type === 'FINANCIAL_REMINDER' || type === 'MANUAL_ALERT';
}

function isIncomeType(type: string) {
  return type === 'EXPECTED_INCOME';
}

function getStatusOptions(type: string) {
  if (isIncomeType(type)) {
    return [
      { value: 'PENDING', label: 'A receber' },
      { value: 'RECEIVED', label: 'Ja recebido' },
      { value: 'CANCELED', label: 'Cancelado' },
    ];
  }

  if (isNeutralType(type)) {
    return [
      { value: 'PENDING', label: 'Ativo' },
      { value: 'CANCELED', label: 'Cancelado' },
    ];
  }

  return [
    { value: 'PENDING', label: 'Pendente' },
    { value: 'PAID', label: 'Ja pago' },
    { value: 'CANCELED', label: 'Cancelado' },
  ];
}

function getTypeHelperText(type: string) {
  if (type === 'EXPECTED_INCOME') return 'Entradas previstas aparecem como reforco de caixa no dia configurado.';
  if (type === 'CARD_BILL') return 'Use para vencimentos relevantes do cartao ou consolidacoes importantes.';
  if (type === 'INSTALLMENT') return 'Ideal para parcelas manuais que ainda nao tenham origem automatica.';
  if (type === 'GOAL_DEADLINE') return 'Bom para metas com data limite e valor de referencia.';
  if (type === 'FINANCIAL_REMINDER' || type === 'MANUAL_ALERT') {
    return 'Funciona melhor para lembretes sem obrigacao financeira automatica por tras.';
  }
  return 'Escolha o tipo que melhor representa o impacto financeiro do evento.';
}

function validateForm(form: FinancialCalendarComposerValues) {
  const errors: Partial<Record<ComposerField, string>> = {};

  if (!form.title.trim()) {
    errors.title = 'Informe um titulo claro para o evento.';
  }

  if (!form.type) {
    errors.type = 'Selecione o tipo do evento.';
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date)) {
    errors.date = 'Escolha uma data valida.';
  }

  if (form.amount.trim()) {
    const numeric = Number(form.amount.replace(',', '.'));
    if (!Number.isFinite(numeric) || numeric < 0) {
      errors.amount = 'O valor precisa ser zero ou positivo.';
    }
  }

  if (form.reminderEnabled) {
    const parsed = Number(form.reminderDaysBefore);
    if (!Number.isInteger(parsed) || parsed < 0 || parsed > 30) {
      errors.reminderDaysBefore = 'Use um numero inteiro entre 0 e 30.';
    }
  }

  return errors;
}

export function FinancialCalendarComposer({
  isOpen,
  mode,
  initialDate,
  initialValues,
  isSubmitting,
  error,
  onClose,
  onSubmit,
}: FinancialCalendarComposerProps) {
  const [form, setForm] = React.useState<FinancialCalendarComposerValues>(() => mergeInitialState(initialDate, initialValues));
  const [validationErrors, setValidationErrors] = React.useState<Partial<Record<ComposerField, string>>>({});
  const titleInputRef = React.useRef<HTMLInputElement | null>(null);
  const headingId = React.useId();
  const descriptionId = React.useId();
  const titleId = React.useId();
  const typeId = React.useId();
  const statusId = React.useId();
  const dateId = React.useId();
  const amountId = React.useId();
  const categoryId = React.useId();
  const recurrenceId = React.useId();
  const descriptionFieldId = React.useId();
  const reminderId = React.useId();

  React.useEffect(() => {
    if (!isOpen) return;
    setForm(mergeInitialState(initialDate, initialValues));
    setValidationErrors({});
    const timer = window.setTimeout(() => titleInputRef.current?.focus(), 30);
    return () => window.clearTimeout(timer);
  }, [initialDate, initialValues, isOpen, mode]);

  React.useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isSubmitting, onClose]);

  const isEdit = mode === 'edit';
  const statusOptions = React.useMemo(() => getStatusOptions(form.type), [form.type]);
  const typeHelper = React.useMemo(() => getTypeHelperText(form.type), [form.type]);

  React.useEffect(() => {
    if (!statusOptions.some((option) => option.value === form.status)) {
      setForm((current) => ({ ...current, status: statusOptions[0]?.value || 'PENDING' }));
    }
  }, [form.status, statusOptions]);

  function updateField<K extends keyof FinancialCalendarComposerValues>(field: K, value: FinancialCalendarComposerValues[K]) {
    setForm((current) => ({ ...current, [field]: value }));
    setValidationErrors((current) => {
      if (!current[field as ComposerField]) return current;
      const next = { ...current };
      delete next[field as ComposerField];
      return next;
    });
  }

  function renderFieldError(field: ComposerField) {
    if (!validationErrors[field]) return null;
    return <p className="text-xs font-semibold text-[var(--danger)]">{validationErrors[field]}</p>;
  }

  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          className="theme-modal-backdrop fixed inset-0 z-[139] flex items-end justify-center bg-[var(--bg-app)]/72 p-0 sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button type="button" aria-label="Fechar evento financeiro" className="absolute inset-0" onClick={onClose} />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={headingId}
            aria-describedby={descriptionId}
            initial={{ opacity: 0, y: 28, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
            transition={{ duration: 0.22 }}
            className="theme-modal-surface relative z-10 flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[1.8rem] border border-[var(--border-default)] bg-[linear-gradient(180deg,rgba(255,255,255,0.03)_0%,rgba(255,255,255,0)_100%),var(--bg-surface)] shadow-2xl sm:rounded-[2rem]"
          >
            <div className="flex items-start justify-between gap-4 border-b border-[var(--border-default)] px-5 py-5 sm:px-6">
              <div className="space-y-2">
                <p className="text-[11px] font-black uppercase tracking-[0.26em] text-[var(--text-muted)]">
                  {isEdit ? 'Edicao manual' : 'Novo evento financeiro'}
                </p>
                <h3 id={headingId} className="text-2xl font-black tracking-[-0.03em] text-[var(--text-primary)]">
                  {isEdit ? 'Ajustar evento do mes' : 'Adicionar ao mes financeiro'}
                </h3>
                <p id={descriptionId} className="max-w-xl text-sm leading-relaxed text-[var(--text-secondary)]">
                  {isEdit
                    ? 'Atualize o evento manual sem quebrar a leitura financeira do calendario. Em eventos recorrentes, a alteracao afeta a serie.'
                    : 'Ao salvar, o evento entra no calendario e recalcula o resumo do periodo imediatamente.'}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar formulario"
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--border-default)] bg-[rgba(255,255,255,0.03)] text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
              >
                <X size={18} />
              </button>
            </div>

            <form
              data-testid="financial-calendar-composer"
              className="custom-scrollbar flex-1 space-y-5 overflow-y-auto overscroll-contain px-5 py-5 pb-[max(env(safe-area-inset-bottom),1.25rem)] sm:px-6"
              onSubmit={(event) => {
                event.preventDefault();
                if (isSubmitting) return;
                const nextErrors = validateForm(form);
                setValidationErrors(nextErrors);
                if (Object.keys(nextErrors).length > 0) {
                  return;
                }
                onSubmit({
                  title: form.title.trim(),
                  description: form.description.trim() || null,
                  type: form.type,
                  amount: form.amount.trim(),
                  category: form.category.trim() || null,
                  date: form.date,
                  recurrence: form.recurrence,
                  status: form.status,
                  reminderEnabled: form.reminderEnabled,
                  reminderDaysBefore: form.reminderEnabled ? form.reminderDaysBefore : '0',
                });
              }}
            >
              <div className="rounded-3xl border border-[var(--border-default)] bg-[rgba(255,255,255,0.03)] px-4 py-4 text-sm text-[var(--text-secondary)]">
                Preencha apenas o necessario. Campos opcionais ajudam a enriquecer a leitura do dia sem poluir o calendario.
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <label className="label-premium" htmlFor={titleId}>Titulo</label>
                  <input
                    ref={titleInputRef}
                    id={titleId}
                    data-testid="financial-calendar-title"
                    value={form.title}
                    onChange={(event) => updateField('title', event.target.value)}
                    className={cn('app-field rounded-2xl px-4 py-3', validationErrors.title && 'app-field-error')}
                    placeholder="Ex.: Fatura principal do cartao"
                    maxLength={120}
                    aria-invalid={Boolean(validationErrors.title)}
                    aria-describedby={validationErrors.title ? `${titleId}-error` : `${titleId}-hint`}
                    required
                  />
                  <p id={`${titleId}-hint`} className="text-xs text-[var(--text-muted)]">Obrigatorio. Use um nome curto e facil de reconhecer no mes.</p>
                  {validationErrors.title ? <div id={`${titleId}-error`}>{renderFieldError('title')}</div> : null}
                </div>

                <div className="space-y-2">
                  <label className="label-premium" htmlFor={typeId}>Tipo de evento</label>
                  <select
                    id={typeId}
                    data-testid="financial-calendar-type"
                    value={form.type}
                    onChange={(event) => updateField('type', event.target.value)}
                    className={cn('app-field rounded-2xl px-4 py-3', validationErrors.type && 'app-field-error')}
                    aria-invalid={Boolean(validationErrors.type)}
                    aria-describedby={validationErrors.type ? `${typeId}-error` : `${typeId}-hint`}
                  >
                    {EVENT_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <p id={`${typeId}-hint`} className="text-xs text-[var(--text-muted)]">{typeHelper}</p>
                  {validationErrors.type ? <div id={`${typeId}-error`}>{renderFieldError('type')}</div> : null}
                </div>

                <div className="space-y-2">
                  <label className="label-premium" htmlFor={statusId}>Status inicial</label>
                  <select
                    id={statusId}
                    value={form.status}
                    onChange={(event) => updateField('status', event.target.value)}
                    className="app-field rounded-2xl px-4 py-3"
                  >
                    {statusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-[var(--text-muted)]">Define como o item entra no calendario e nos resumos.</p>
                </div>

                <div className="space-y-2">
                  <label className="label-premium" htmlFor={dateId}>Data</label>
                  <input
                    id={dateId}
                    data-testid="financial-calendar-date"
                    value={form.date}
                    onChange={(event) => updateField('date', event.target.value)}
                    type="date"
                    className={cn('app-field rounded-2xl px-4 py-3', validationErrors.date && 'app-field-error')}
                    aria-invalid={Boolean(validationErrors.date)}
                    aria-describedby={validationErrors.date ? `${dateId}-error` : undefined}
                    required
                  />
                  {validationErrors.date ? <div id={`${dateId}-error`}>{renderFieldError('date')}</div> : null}
                </div>

                <div className="space-y-2">
                  <label className="label-premium" htmlFor={amountId}>Valor</label>
                  <input
                    id={amountId}
                    value={form.amount}
                    onChange={(event) => updateField('amount', event.target.value)}
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    className={cn('app-field rounded-2xl px-4 py-3', validationErrors.amount && 'app-field-error')}
                    placeholder="0,00"
                    aria-invalid={Boolean(validationErrors.amount)}
                    aria-describedby={validationErrors.amount ? `${amountId}-error` : `${amountId}-hint`}
                  />
                  <p id={`${amountId}-hint`} className="text-xs text-[var(--text-muted)]">Opcional para lembretes e eventos sem valor definido.</p>
                  {validationErrors.amount ? <div id={`${amountId}-error`}>{renderFieldError('amount')}</div> : null}
                </div>

                <div className="space-y-2">
                  <label className="label-premium" htmlFor={categoryId}>Categoria</label>
                  <input
                    id={categoryId}
                    value={form.category}
                    onChange={(event) => updateField('category', event.target.value)}
                    className="app-field rounded-2xl px-4 py-3"
                    placeholder="Ex.: Moradia, Cartao, Receita"
                    maxLength={60}
                  />
                  <p className="text-xs text-[var(--text-muted)]">Opcional. Ajuda a organizar o contexto financeiro do dia.</p>
                </div>

                <div className="space-y-2">
                  <label className="label-premium" htmlFor={recurrenceId}>Recorrencia</label>
                  <select
                    id={recurrenceId}
                    value={form.recurrence}
                    onChange={(event) => updateField('recurrence', event.target.value)}
                    className="app-field rounded-2xl px-4 py-3"
                  >
                    {RECURRENCE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-[var(--text-muted)]">A recorrencia expande o evento no periodo visivel sem gerar duplicacao de dados.</p>
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <label className="label-premium" htmlFor={descriptionFieldId}>Descricao</label>
                  <textarea
                    id={descriptionFieldId}
                    value={form.description}
                    onChange={(event) => updateField('description', event.target.value)}
                    className="app-field min-h-28 rounded-2xl px-4 py-3"
                    placeholder="Contexto curto para facilitar a leitura financeira do dia."
                    maxLength={240}
                  />
                  <p className="text-xs text-[var(--text-muted)]">Opcional. Bom para lembrar regra, observacao ou decisao esperada.</p>
                </div>
              </div>

              <label className="app-surface-subtle flex items-center justify-between gap-4 rounded-3xl px-4 py-4" htmlFor={reminderId}>
                <div>
                  <p className="text-sm font-bold text-[var(--text-primary)]">Ativar lembrete</p>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">
                    Mantem o evento preparado para notificacoes futuras sem poluir a interface.
                  </p>
                </div>
                <button
                  id={reminderId}
                  type="button"
                  role="switch"
                  aria-checked={form.reminderEnabled}
                  aria-label="Ativar lembrete"
                  onClick={() => {
                    updateField('reminderEnabled', !form.reminderEnabled);
                    if (form.reminderEnabled) {
                      setValidationErrors((current) => {
                        const next = { ...current };
                        delete next.reminderDaysBefore;
                        return next;
                      });
                    }
                  }}
                  className={`relative inline-flex h-8 w-14 items-center rounded-full border transition ${
                    form.reminderEnabled
                      ? 'border-[rgba(79,140,255,0.34)] bg-[var(--primary-soft)]'
                      : 'border-[var(--border-default)] bg-[rgba(255,255,255,0.04)]'
                  }`}
                >
                  <span
                    className={`inline-block h-6 w-6 rounded-full bg-white shadow transition ${
                      form.reminderEnabled ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
              </label>

              <div className="space-y-2">
                <label className="label-premium" htmlFor={`${reminderId}-days`}>Lembrar com antecedencia</label>
                <input
                  id={`${reminderId}-days`}
                  value={form.reminderDaysBefore}
                  onChange={(event) => updateField('reminderDaysBefore', event.target.value)}
                  type="number"
                  inputMode="numeric"
                  min="0"
                  max="30"
                  className={cn('app-field rounded-2xl px-4 py-3', validationErrors.reminderDaysBefore && 'app-field-error')}
                  disabled={!form.reminderEnabled}
                  aria-invalid={Boolean(validationErrors.reminderDaysBefore)}
                  aria-describedby={validationErrors.reminderDaysBefore ? `${reminderId}-error` : `${reminderId}-hint`}
                />
                <p id={`${reminderId}-hint`} className="text-xs text-[var(--text-muted)]">Escolha entre 0 e 30 dias antes da data principal.</p>
                {validationErrors.reminderDaysBefore ? <div id={`${reminderId}-error`}>{renderFieldError('reminderDaysBefore')}</div> : null}
              </div>

              {error ? (
                <div role="alert" className="rounded-2xl border border-[rgba(255,90,90,0.2)] bg-[rgba(255,90,90,0.1)] px-4 py-3 text-sm text-[var(--danger)]">
                  {error}
                </div>
              ) : null}

              <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-end">
                <ButtonSecondary type="button" onClick={onClose} className="rounded-2xl px-5" disabled={isSubmitting}>
                  Fechar
                </ButtonSecondary>
                <ButtonPrimary data-testid="financial-calendar-submit" type="submit" className="rounded-2xl px-5" disabled={isSubmitting}>
                  {isEdit ? <Pencil size={16} /> : <Plus size={16} />}
                  {isSubmitting ? 'Salvando...' : isEdit ? 'Salvar alteracoes' : 'Adicionar evento'}
                </ButtonPrimary>
              </div>
            </form>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
