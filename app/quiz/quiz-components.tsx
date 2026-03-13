'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Check } from 'lucide-react';

export function QuizContainer({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <main className={`min-h-screen bg-slate-950 text-slate-100 ${className}`}>
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_14%_10%,rgba(16,185,129,.18),transparent_30%),radial-gradient(circle_at_86%_8%,rgba(59,130,246,.16),transparent_26%),linear-gradient(180deg,#020617_0%,#020617_52%,#0b1120_100%)]" />
      <div className="mx-auto w-full max-w-4xl px-4 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-8">{children}</div>
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
      <div className="flex items-center justify-between text-sm text-slate-300">
        <span>{label}</span>
        <div className="text-right">
          <span className="block">
            Pergunta {Math.min(current, total)} de {total}
          </span>
          {percentageLabel ? <span className="block text-xs text-emerald-200">{percentageLabel}</span> : null}
        </div>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${width}%` }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-cyan-400 to-sky-400"
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
      className="rounded-[1.75rem] border border-white/10 bg-slate-900/65 p-5 shadow-[0_24px_80px_-36px_rgba(15,23,42,.8)] sm:rounded-[2rem] sm:p-8"
    >
      {eyebrow ? (
        <span className="inline-flex rounded-full border border-emerald-300/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200">
          {eyebrow}
        </span>
      ) : null}
      <h1 className="mt-4 text-[1.85rem] font-bold leading-tight text-white sm:text-4xl">{title}</h1>
      <div className="mt-6">{children}</div>
      {footer ? <div className="mt-6">{footer}</div> : null}
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
      className={`flex min-h-[68px] w-full items-center justify-between rounded-2xl border px-4 py-4 text-left text-[15px] font-medium leading-6 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70 sm:text-base ${
        selected
          ? 'border-emerald-300/50 bg-emerald-500/10 text-white shadow-[0_16px_36px_-24px_rgba(16,185,129,.7)]'
          : 'border-white/10 bg-slate-950/65 text-slate-200 hover:border-white/20 hover:bg-slate-900'
      } ${disabled ? 'cursor-not-allowed opacity-70' : ''}`}
    >
      <span className="pr-3">{label}</span>
      <span
        className={`flex h-7 w-7 items-center justify-center rounded-full border ${
          selected ? 'border-emerald-300/50 bg-emerald-500/20 text-emerald-200' : 'border-white/10 text-slate-500'
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
          <div className="inline-flex rounded-full border border-cyan-300/25 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-100">
            {statusLabel}
          </div>
        ) : null}
        <p className="text-base leading-7 text-slate-300">{text}</p>
        <div className="grid gap-4 lg:grid-cols-[1fr_.95fr]">
          <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-5">
            <p className="mb-4 text-sm text-slate-400">Processando seu perfil</p>
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
                      ? 'border-emerald-300/35 bg-emerald-500/10 text-emerald-100'
                      : 'border-white/10 bg-white/5 text-slate-400'
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
                className="mt-5 rounded-2xl border border-emerald-300/25 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-100"
              >
                {rewardLabel}
              </motion.div>
            ) : null}
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-5">
            <p className="mb-4 text-sm text-slate-400">Sinais financeiros</p>
            <div className="space-y-4">
              {[
                { label: 'Mapa de gastos', width: '82%', color: 'bg-emerald-400' },
                { label: 'Padrões invisíveis', width: '68%', color: 'bg-cyan-400' },
                { label: 'Potencial de economia', width: '74%', color: 'bg-sky-400' },
              ].map((item, index) => (
                <div key={item.label} className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <span>{item.label}</span>
                    <span>{item.width}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/10">
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
      className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-emerald-600"
    >
      {children}
      <ArrowRight size={16} />
    </Link>
  );
}
