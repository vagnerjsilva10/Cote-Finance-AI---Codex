'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Check } from 'lucide-react';

export function QuizContainer({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <main className={`min-h-dvh overflow-x-clip bg-[#05070D] text-[var(--text-primary)] ${className}`}>
      <div className="pointer-events-none fixed inset-0 -z-20 bg-[radial-gradient(circle_at_14%_10%,rgba(59,130,246,.16),transparent_32%),radial-gradient(circle_at_86%_8%,rgba(99,102,241,.12),transparent_30%),radial-gradient(circle_at_55%_100%,rgba(34,211,238,.08),transparent_42%),linear-gradient(180deg,#05070d_0%,#04060b_52%,#05070d_100%)]" />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,.05)_0.65px,transparent_0.8px),radial-gradient(circle_at_72%_56%,rgba(255,255,255,.035)_0.65px,transparent_0.8px)] [background-size:170px_170px,220px_220px] opacity-30 mix-blend-soft-light" />
      <div className="mx-auto w-full max-w-4xl px-4 py-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-9">{children}</div>
    </main>
  );
}

export function ProgressBar({
  current,
  total,
  label,
  stageText,
}: {
  current: number;
  total: number;
  label: string;
  stageText?: string;
}) {
  const width = total > 0 ? Math.min(100, Math.max(0, (current / total) * 100)) : 0;

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 text-sm text-[var(--text-secondary)] sm:flex-row sm:items-center sm:justify-between">
        <span className="pr-3 font-medium text-[var(--text-primary)]">{label}</span>
        <span className="text-left text-xs tracking-[0.12em] text-[var(--text-muted)] uppercase sm:text-right">
          Pergunta {Math.min(current, total)} de {total}
        </span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-[rgba(255,255,255,.08)]">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${width}%` }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="h-full rounded-full bg-gradient-to-r from-[var(--primary)] via-[var(--accent-indigo)] to-[var(--accent-cyan)]"
        />
      </div>

      {stageText ? (
        <motion.p
          key={stageText}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
          className="text-sm leading-6 text-[var(--text-secondary)]"
        >
          {stageText}
        </motion.p>
      ) : null}
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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.32 }}
      className="rounded-[1.6rem] border border-[var(--border-default)] bg-[rgba(15,23,42,.62)] p-4 shadow-[0_18px_45px_rgba(0,0,0,.32)] backdrop-blur-xl sm:rounded-[2rem] sm:p-8"
    >
      {eyebrow ? (
        <span className="inline-flex max-w-full rounded-full border border-[var(--border-default)]/35 bg-[color:var(--primary-soft)] px-3 py-1 text-[11px] font-semibold leading-5 tracking-[0.12em] text-[var(--text-secondary)] uppercase">
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
      whileTap={disabled ? undefined : { scale: 0.98 }}
      onClick={onClick}
      disabled={disabled}
      className={`flex min-h-[72px] w-full items-center justify-between rounded-2xl border px-4 py-4 text-left text-[15px] font-medium leading-6 transition-[transform,border-color,background,box-shadow] duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-soft)] sm:text-base ${
        selected
          ? 'border-[color:var(--accent-cyan)]/45 bg-[rgba(59,130,246,.14)] text-[var(--text-primary)] shadow-[0_8px_24px_rgba(59,130,246,.14)]'
          : 'border-[var(--border-default)] bg-[rgba(5,7,13,.78)] text-[var(--text-primary)] hover:border-[var(--border-strong)] hover:bg-[rgba(15,23,42,.75)]'
      } ${disabled ? 'cursor-not-allowed opacity-70' : ''}`}
    >
      <span className="pr-3 text-balance">{label}</span>
      <span
        className={`flex h-7 w-7 items-center justify-center rounded-full border ${
          selected ? 'border-[color:var(--accent-cyan)]/45 bg-[rgba(34,211,238,.12)] text-[var(--accent-cyan)]' : 'border-[var(--border-default)] text-[var(--text-muted)]'
        }`}
      >
        <Check size={14} />
      </span>
    </motion.button>
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
      className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-6 py-3 text-sm font-bold text-[var(--text-primary)] transition-[transform,background] duration-200 hover:scale-[1.02] hover:bg-[var(--primary-hover)]"
    >
      {children}
      <ArrowRight size={16} />
    </Link>
  );
}
