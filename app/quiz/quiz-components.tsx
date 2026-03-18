'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Check } from 'lucide-react';

export function QuizContainer({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <main className={`min-h-dvh overflow-x-clip bg-[var(--bg-app)] text-[var(--text-primary)] ${className}`}>
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_14%_10%,rgba(59,130,246,.18),transparent_30%),radial-gradient(circle_at_86%_8%,rgba(59,130,246,.16),transparent_26%),linear-gradient(180deg,var(--bg-surface)_0%,var(--bg-surface)_52%,var(--bg-app)_100%)]" />
      <div className="mx-auto w-full max-w-4xl px-4 py-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-8">{children}</div>
    </main>
  );
}

export function ProgressBar({
  current,
  total,
  label,
  percentageLabel,
}: {
  current: number;
  total: number;
  label: string;
  percentageLabel?: string;
}) {
  const width = total > 0 ? Math.min(100, Math.max(0, (current / total) * 100)) : 0;

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-2 text-sm text-[var(--text-secondary)] sm:flex-row sm:items-center sm:justify-between">
        <span className="pr-3">{label}</span>
        <div className="text-left sm:text-right">
          <span className="block">
            Pergunta {Math.min(current, total)} de {total}
          </span>
          {percentageLabel ? <span className="block text-xs text-[var(--text-secondary)]">{percentageLabel}</span> : null}
        </div>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[var(--bg-surface)]/10">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${width}%` }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="h-full rounded-full bg-gradient-to-r from-[var(--primary)] via-[var(--primary)] to-[var(--primary-hover)]"
        />
      </div>
    </div>
  );
}

export function QuestionCard({
  eyebrow,
  title,
  children,
  footer,
}: {
  eyebrow?: string;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -18 }}
      transition={{ duration: 0.35 }}
      className="rounded-[1.5rem] border border-[var(--border-default)] bg-[var(--bg-surface)]/65 p-4 shadow-[var(--shadow-soft)] sm:rounded-[2rem] sm:p-8"
    >
      {eyebrow ? (
        <span className="inline-flex max-w-full rounded-full border border-[var(--border-default)]/30 bg-[color:var(--primary-soft)] px-3 py-1 text-xs font-semibold leading-5 text-[var(--text-secondary)]">
          {eyebrow}
        </span>
      ) : null}
      <h1 className="mt-4 text-[1.65rem] font-bold leading-tight text-[var(--text-primary)] sm:text-4xl">{title}</h1>
      <div className="mt-5 sm:mt-6">{children}</div>
      {footer ? <div className="mt-5 sm:mt-6">{footer}</div> : null}
    </motion.section>
  );
}

export function AnswerButton({
  label,
  selected,
  onClick,
  disabled,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <motion.button
      type="button"
      whileHover={disabled ? undefined : { y: -2 }}
      whileTap={disabled ? undefined : { scale: 0.985 }}
      onClick={onClick}
      disabled={disabled}
      className={`flex min-h-[72px] w-full items-center justify-between rounded-2xl border px-4 py-4 text-left text-[15px] font-medium leading-6 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-soft)] sm:text-base ${
        selected
          ? 'border-[var(--border-default)]/50 bg-[color:var(--primary-soft)] text-[var(--text-primary)] shadow-[var(--shadow-soft)]'
          : 'border-[var(--border-default)] bg-[var(--bg-app)]/65 text-[var(--text-primary)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-surface)]'
      } ${disabled ? 'cursor-not-allowed opacity-70' : ''}`}
    >
      <span className="pr-3 text-balance">{label}</span>
      <span
        className={`flex h-7 w-7 items-center justify-center rounded-full border ${
          selected ? 'border-[var(--border-default)]/50 bg-[color:var(--primary-soft)] text-[var(--text-secondary)]' : 'border-[var(--border-default)] text-[var(--text-muted)]'
        }`}
      >
        <Check size={14} />
      </span>
    </motion.button>
  );
}

export function AnalysisScreen({
  title,
  text,
  messages,
  activeIndex,
  statusLabel,
  rewardLabel,
}: {
  title: string;
  text: string;
  messages: string[];
  activeIndex: number;
  statusLabel?: string;
  rewardLabel?: string;
}) {
  return (
    <QuestionCard eyebrow="Diagnóstico em andamento" title={title}>
      <div className="space-y-6">
        {statusLabel ? (
          <div className="inline-flex max-w-full rounded-full border border-[var(--border-default)] bg-[color:var(--primary-soft)] px-3 py-1 text-xs font-semibold leading-5 text-[var(--text-secondary)]">
            {statusLabel}
          </div>
        ) : null}
        <p className="text-sm leading-7 text-[var(--text-secondary)] sm:text-base">{text}</p>
        <div className="grid gap-4 lg:grid-cols-[1fr_.95fr]">
          <div className="rounded-3xl border border-[var(--border-default)] bg-[var(--bg-app)] p-5">
            <p className="mb-4 text-sm text-[var(--text-secondary)]">Processando seu perfil</p>
            <div className="space-y-3">
              {messages.map((message, index) => (
                <motion.div
                  key={message}
                  animate={{
                    opacity: activeIndex === index ? 1 : 0.45,
                    x: activeIndex === index ? 0 : -6,
                  }}
                  transition={{ duration: 0.25 }}
                  className={`rounded-2xl border px-4 py-3 text-sm ${
                    activeIndex === index
                      ? 'border-[var(--border-default)]/35 bg-[color:var(--primary-soft)] text-[var(--text-secondary)]'
                      : 'border-[var(--border-default)] bg-[var(--bg-surface)]/5 text-[var(--text-secondary)]'
                  }`}
                >
                  {message}
                </motion.div>
              ))}
            </div>
            {rewardLabel ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.2 }}
                className="mt-5 rounded-2xl border border-[var(--border-default)]/25 bg-[color:var(--primary-soft)] px-4 py-3 text-sm font-semibold text-[var(--text-secondary)]"
              >
                {rewardLabel}
              </motion.div>
            ) : null}
          </div>

          <div className="rounded-3xl border border-[var(--border-default)] bg-[var(--bg-app)] p-5">
            <p className="mb-4 text-sm text-[var(--text-secondary)]">Sinais financeiros</p>
            <div className="space-y-4">
              {[
                { label: 'Mapa de gastos', width: '82%', color: 'bg-[var(--primary)]' },
                { label: 'Padrões invisíveis', width: '68%', color: 'bg-[var(--primary)]' },
                { label: 'Potencial de economia', width: '74%', color: 'bg-[var(--secondary-highlight)]' },
              ].map((item, index) => (
                <div key={item.label} className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
                    <span>{item.label}</span>
                    <span>{item.width}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[var(--bg-surface)]/10">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: item.width }}
                      transition={{ duration: 0.6, delay: index * 0.12 }}
                      className={`h-full rounded-full ${item.color}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </QuestionCard>
  );
}

export function CTAButton({
  href,
  children,
  onClick,
}: {
  href: string;
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-6 py-3 text-sm font-bold text-[var(--text-primary)] transition-colors hover:bg-[var(--primary-hover)]"
    >
      {children}
      <ArrowRight size={16} />
    </Link>
  );
}

