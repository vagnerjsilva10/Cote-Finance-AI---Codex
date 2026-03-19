'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { Check, Sparkles, TriangleAlert } from 'lucide-react';
import { Manrope, Space_Grotesk } from 'next/font/google';
import { CTAButton, QuizContainer } from '../quiz-components';
import { trackQuizEvent } from '../quiz-analytics';
import { readQuizResult } from '../quiz-storage';

const displayFont = Space_Grotesk({ subsets: ['latin'], weight: ['600', '700'], variable: '--font-display' });
const bodyFont = Manrope({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-body' });

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(value);
}

export default function ResultClient() {
  const router = useRouter();
  const [result, setResult] = React.useState<ReturnType<typeof readQuizResult> | undefined>(undefined);

  React.useEffect(() => {
    const nextResult = readQuizResult();

    if (!nextResult) {
      router.replace('/quiz');
      return;
    }

    setResult(nextResult);
    trackQuizEvent('quiz_result_view', {
      profile: nextResult.profileKey,
      score: nextResult.totalScore,
    });
  }, [router]);

  if (result === undefined) {
    return (
      <QuizContainer className={`${displayFont.variable} ${bodyFont.variable}`}>
        <div className="mx-auto max-w-3xl rounded-[2rem] border border-[var(--border-default)] bg-[rgba(15,23,42,.62)] p-8 text-center backdrop-blur-xl" style={{ fontFamily: 'var(--font-body)' }}>
          <p className="text-[var(--text-secondary)]">Carregando seu diagnóstico...</p>
        </div>
      </QuizContainer>
    );
  }

  if (!result) return null;

  return (
    <QuizContainer className={`${displayFont.variable} ${bodyFont.variable}`}>
      <div className="mx-auto max-w-4xl space-y-5" style={{ fontFamily: 'var(--font-body)' }}>
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.42 }}
          className="rounded-[1.75rem] border border-[var(--border-default)] bg-[rgba(15,23,42,.64)] p-5 shadow-[0_20px_52px_rgba(0,0,0,.36)] backdrop-blur-xl sm:rounded-[2rem] sm:p-8"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(212,99,99,.4)] bg-[rgba(212,99,99,.12)] px-3 py-1 text-xs font-semibold tracking-[0.12em] text-[var(--danger)] uppercase">
            <TriangleAlert size={14} />
            Diagnóstico concluído
          </div>

          <h1 className="mt-4 text-[1.9rem] font-bold text-[var(--text-primary)] sm:text-5xl" style={{ fontFamily: 'var(--font-display)' }}>
            Você está perdendo dinheiro sem perceber
          </h1>

          <p className="mt-4 text-base leading-7 text-[var(--text-secondary)]">
            Seu padrão financeiro mostra falta de visibilidade e decisões no escuro.
          </p>

          <div className="mt-5 rounded-3xl border border-[rgba(250,204,21,.35)] bg-[rgba(250,204,21,.1)] p-4 sm:p-5">
            <p className="text-sm font-semibold text-[rgb(250,204,21)]">
              Isso pode representar de {formatCurrency(result.monthlyLossMin)} até {formatCurrency(result.monthlyLossMax)} por mês.
            </p>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Em 12 meses, sua perda pode chegar a {formatCurrency(result.annualLossMax)} sem você notar.
            </p>
          </div>

          <p className="mt-5 text-base leading-7 text-[var(--text-secondary)]">
            Sem clareza, pequenos gastos e decisões erradas se acumulam e travam sua evolução financeira.
          </p>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.42, delay: 0.08 }}
          className="rounded-[1.75rem] border border-[var(--border-default)] bg-[rgba(15,23,42,.64)] p-5 shadow-[0_20px_52px_rgba(0,0,0,.36)] backdrop-blur-xl sm:rounded-[2rem] sm:p-8"
        >
          <h2 className="text-2xl font-bold text-[var(--text-primary)] sm:text-3xl" style={{ fontFamily: 'var(--font-display)' }}>
            O Cote Finance AI analisa seu comportamento e mostra
          </h2>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {[
              'Onde você perde dinheiro',
              'O que ajustar agora',
              'Como evoluir mês a mês',
            ].map((item, index) => (
              <motion.div
                key={item}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.12 + index * 0.06 }}
                whileHover={{ y: -2 }}
                className="rounded-2xl border border-[rgba(46,169,122,.35)] bg-[rgba(46,169,122,.1)] p-4"
              >
                <div className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--success)]">
                  <Check size={14} />
                  {item}
                </div>
              </motion.div>
            ))}
          </div>

          <div className="mt-6 rounded-3xl border border-[var(--border-default)] bg-[rgba(5,7,13,.72)] p-5">
            <p className="text-sm text-[var(--text-secondary)]">Sinais detectados no seu diagnóstico</p>
            <ul className="mt-3 space-y-3 text-sm text-[var(--text-primary)]">
              {result.insights.map((insight) => (
                <li key={insight} className="flex items-start gap-2">
                  <span className="mt-1 h-2 w-2 rounded-full bg-[var(--accent-cyan)]" />
                  {insight}
                </li>
              ))}
            </ul>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.42, delay: 0.16 }}
          className="rounded-[1.75rem] border border-[var(--border-default)] bg-[rgba(15,23,42,.64)] px-5 py-8 text-center shadow-[0_20px_52px_rgba(0,0,0,.36)] backdrop-blur-xl sm:rounded-[2rem] sm:px-6 sm:py-10"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-default)]/35 bg-[color:var(--primary-soft)] px-3 py-1 text-xs font-semibold tracking-[0.12em] text-[var(--text-secondary)] uppercase">
            <Sparkles size={14} />
            Próximo passo
          </div>
          <h2 className="mt-4 text-[1.9rem] font-bold text-[var(--text-primary)] md:text-5xl" style={{ fontFamily: 'var(--font-display)' }}>
            Ver meu diagnóstico completo
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-[var(--text-secondary)]">
            Leve seu diagnóstico para dentro do app e transforme leitura financeira em decisão prática.
          </p>

          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <CTAButton
              href="/signup"
              onClick={() =>
                trackQuizEvent('quiz_signup_click', {
                  profile: result.profileKey,
                  score: result.totalScore,
                  source: 'quiz-primary-cta',
                })
              }
            >
              Ver meu diagnóstico completo
            </CTAButton>

            <Link
              href="/signup"
              onClick={() =>
                trackQuizEvent('quiz_signup_click', {
                  profile: result.profileKey,
                  score: result.totalScore,
                  source: 'quiz-secondary-cta',
                })
              }
              className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-[var(--border-default)] px-6 py-3 text-sm font-semibold text-[var(--text-primary)] transition-[transform,border-color,background] duration-200 hover:scale-[1.02] hover:border-[var(--border-strong)] hover:bg-[rgba(15,23,42,.8)]"
            >
              Começar grátis agora
            </Link>
          </div>

          <p className="mt-4 text-sm text-[var(--text-secondary)]">Sem cartão. Sem compromisso.</p>
        </motion.section>
      </div>
    </QuizContainer>
  );
}
