'use client';

import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Check } from 'lucide-react';

const quizThemeVars = {
  '--bg-primary': '#0B1220',
  '--bg-secondary': '#111A2E',
  '--bg-tertiary': '#16233A',
  '--cta-primary': '#4F8CFF',
  '--cta-hover': '#6EA3FF',
  '--cta-active': '#3C7BE0',
  '--accent-premium': '#7B61FF',
  '--highlight': '#FFC857',
  '--selected-bg': '#1E2F52',
  '--selected-border': '#4F8CFF',
  '--selected-glow': 'rgba(79, 140, 255, 0.35)',
} as CSSProperties;

export function QuizContainer({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <main style={quizThemeVars} className={`min-h-dvh overflow-x-clip bg-[var(--bg-primary)] text-[var(--text-primary)] ${className}`}>
      <div className="pointer-events-none fixed inset-0 -z-20 bg-[radial-gradient(circle_at_14%_10%,rgba(79,140,255,.16),transparent_34%),radial-gradient(circle_at_86%_8%,rgba(123,97,255,.12),transparent_30%),radial-gradient(circle_at_55%_100%,rgba(79,140,255,.09),transparent_44%),linear-gradient(180deg,var(--bg-primary)_0%,var(--bg-secondary)_56%,var(--bg-primary)_100%)]" />
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
  const percentage = Math.round(width);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 text-sm text-[var(--text-secondary)] sm:flex-row sm:items-center sm:justify-between">
        <span className="pr-3 font-medium text-[var(--text-primary)]">{label}</span>
        <span className="text-left text-xs tracking-[0.12em] text-[var(--text-muted)] uppercase sm:text-right">
          Pergunta {Math.min(current, total)} de {total} - {percentage}%
        </span>
      </div>

      <div className="h-3 overflow-hidden rounded-full border border-[rgba(255,255,255,.09)] bg-[rgba(255,255,255,.08)]">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${width}%` }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="h-full rounded-full bg-[linear-gradient(90deg,var(--cta-primary)_0%,var(--accent-premium)_100%)] shadow-[0_0_16px_rgba(79,140,255,.5)]"
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
      className="rounded-[1.6rem] border border-[var(--border-default)] bg-[rgba(17,26,46,.74)] p-4 shadow-[0_20px_50px_rgba(0,0,0,.36)] backdrop-blur-xl sm:rounded-[2rem] sm:p-8"
    >
      {eyebrow ? (
        <span className="inline-flex max-w-full rounded-full border border-[var(--border-default)]/35 bg-[color:var(--primary-soft)] px-3 py-1 text-[11px] font-semibold leading-5 tracking-[0.12em] text-[var(--text-secondary)] uppercase">
          {eyebrow}
        </span>
      ) : null}
      <h1 className="mt-4 text-[1.85rem] font-bold leading-tight text-[var(--text-primary)] sm:text-[2.55rem]">{title}</h1>
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
      aria-pressed={selected}
      whileHover={disabled ? undefined : { y: -1 }}
      whileTap={disabled ? undefined : { scale: 0.98 }}
      animate={selected ? { scale: [1, 0.985, 1] } : { scale: 1 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      onClick={onClick}
      disabled={disabled}
      className={`flex min-h-[78px] w-full items-center justify-between rounded-2xl border px-4 py-4 text-left text-[15px] font-semibold leading-6 transition-[transform,border-color,background,box-shadow,color] duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--selected-glow)] sm:min-h-[82px] sm:px-5 sm:text-base ${
        selected
          ? 'border-[color:var(--selected-border)] bg-[color:var(--selected-bg)] text-white shadow-[0_0_0_1px_var(--selected-border),0_12px_28px_var(--selected-glow)]'
          : 'border-[rgba(255,255,255,.12)] bg-[color:var(--bg-tertiary)] text-[var(--text-primary)] hover:border-[rgba(79,140,255,.58)] hover:bg-[rgba(30,47,82,.72)]'
      } ${disabled ? 'cursor-not-allowed opacity-70' : ''}`}
    >
      <span className="pr-3 text-balance">{label}</span>
      <motion.span
        initial={false}
        animate={selected ? { scale: 1, opacity: 1 } : { scale: 0.9, opacity: 0.8 }}
        transition={{ duration: 0.16, ease: 'easeOut' }}
        className={`flex h-7 w-7 items-center justify-center rounded-full border ${
          selected
            ? 'border-[color:var(--selected-border)] bg-[color:var(--cta-primary)] text-white shadow-[0_0_14px_rgba(79,140,255,.45)]'
            : 'border-[rgba(255,255,255,.22)] bg-[rgba(11,18,32,.64)] text-transparent'
        }`}
      >
        <Check size={14} />
      </motion.span>
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
      className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl border border-[rgba(255,255,255,.14)] bg-[linear-gradient(135deg,var(--cta-primary)_0%,var(--accent-premium)_100%)] px-6 py-3 text-sm font-bold text-white shadow-[0_10px_25px_rgba(79,140,255,.3)] transition-[transform,filter,box-shadow,background] duration-200 hover:-translate-y-[1px] hover:[background:linear-gradient(135deg,var(--cta-hover)_0%,var(--accent-premium)_100%)] hover:shadow-[0_14px_30px_rgba(79,140,255,.36)] active:translate-y-0 active:scale-[0.99] active:[background:linear-gradient(135deg,var(--cta-active)_0%,var(--accent-premium)_100%)] active:shadow-[0_6px_18px_rgba(60,123,224,.38)]"
    >
      {children}
      <ArrowRight size={16} />
    </Link>
  );
}
