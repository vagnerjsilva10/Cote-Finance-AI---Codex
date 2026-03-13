'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { Manrope, Space_Grotesk } from 'next/font/google';
import { Sparkles } from 'lucide-react';
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
        <div className="mx-auto max-w-3xl rounded-[2rem] border border-white/10 bg-slate-900/65 p-8 text-center" style={{ fontFamily: 'var(--font-body)' }}>
          <p className="text-slate-300">Carregando seu diagnóstico...</p>
        </div>
      </QuizContainer>
    );
  }

  if (!result) return null;

  return (
    <QuizContainer className={`${displayFont.variable} ${bodyFont.variable}`}>
      <div className="mx-auto max-w-4xl space-y-6" style={{ fontFamily: 'var(--font-body)' }}>
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="rounded-[2rem] border border-white/10 bg-slate-900/65 p-6 sm:p-8"
        >
          <span className="inline-flex rounded-full border border-emerald-300/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200">
            Seu perfil financeiro foi identificado
          </span>
          <h1 className="mt-4 text-3xl font-bold text-white sm:text-4xl" style={{ fontFamily: 'var(--font-display)' }}>
            Seu perfil financeiro
          </h1>
          <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_.9fr]">
            <div className="space-y-4">
              <div className="rounded-3xl border border-emerald-300/20 bg-emerald-500/10 p-5">
                <p className="text-sm text-emerald-100">Resultado principal</p>
                <p className="mt-2 text-3xl font-bold text-white">{result.profileTitle.replace('Perfil ', '')}</p>
                <p className="mt-3 text-slate-100">{result.profileText}</p>
              </div>

              <p className="text-base leading-7 text-slate-300">{result.profileDescription}</p>

              <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-5">
                <p className="text-sm text-slate-400">Com base nas suas respostas:</p>
                <ul className="mt-4 space-y-3 text-slate-200">
                  {result.insights.map((insight, index) => (
                    <motion.li
                      key={insight}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.08 }}
                      className="flex items-start gap-3"
                    >
                      <span className="mt-1 h-2.5 w-2.5 rounded-full bg-emerald-400" />
                      <span>{insight}</span>
                    </motion.li>
                  ))}
                </ul>
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="space-y-4"
            >
              <div className="rounded-3xl border border-cyan-300/20 bg-cyan-500/10 p-5">
                <p className="text-sm text-cyan-100">Você pode estar perdendo até</p>
                <p className="mt-2 text-3xl font-bold text-white">
                  {formatCurrency(result.monthlyLossMin)} - {formatCurrency(result.monthlyLossMax)} por mês
                </p>
                <p className="mt-3 text-sm text-slate-200">
                  Isso pode representar até {formatCurrency(result.annualLossMax)} por ano.
                </p>
                <p className="mt-4 text-xs text-slate-300">
                  Estimativa baseada nas suas respostas e em padrões financeiros comuns.
                </p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-5">
                <p className="text-sm text-slate-400">Comparando suas respostas com milhares de diagnósticos financeiros...</p>
                <p className="mt-3 text-2xl font-bold text-white">{result.totalScore} pontos</p>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, Math.max(12, result.totalScore * 10))}%` }}
                    transition={{ duration: 0.55, ease: 'easeOut' }}
                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-cyan-400 to-sky-400"
                  />
                </div>
              </div>
            </motion.div>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.12 }}
          className="rounded-[2rem] border border-white/10 bg-slate-900/65 p-6 sm:p-8"
        >
          <h2 className="text-2xl font-bold text-white sm:text-3xl" style={{ fontFamily: 'var(--font-display)' }}>
            É exatamente para isso que criamos o Cote Finance AI.
          </h2>
          <p className="mt-4 text-slate-300">O aplicativo analisa automaticamente suas finanças e mostra:</p>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {[
              'para onde seu dinheiro está indo',
              'quais categorias consomem mais renda',
              'padrões invisíveis de gasto',
              'oportunidades reais de economia',
            ].map((item, index) => (
              <motion.div
                key={item}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.15 + index * 0.06 }}
                whileHover={{ y: -3 }}
                className="rounded-2xl border border-white/10 bg-slate-950/70 p-4 text-slate-200"
              >
                {item}
              </motion.div>
            ))}
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.2 }}
          className="rounded-[2rem] border border-emerald-300/20 bg-[linear-gradient(180deg,rgba(16,185,129,0.14),rgba(15,23,42,0.94)_35%,rgba(2,6,23,0.98)_100%)] px-6 py-10 text-center"
        >
          <div className="mx-auto max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-100">
              <Sparkles size={14} />
              Diagnóstico personalizado
            </div>
            <h2 className="mt-4 text-3xl font-bold text-white md:text-5xl" style={{ fontFamily: 'var(--font-display)' }}>
              Ver meu diagnóstico completo
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-slate-200">
              Leve esse diagnóstico para dentro do aplicativo e veja seus gastos com clareza real.
            </p>
            <div className="mt-6 flex flex-col items-center gap-3">
              <CTAButton
                href="/signup"
                onClick={() =>
                  trackQuizEvent('quiz_signup_click', {
                    profile: result.profileKey,
                    score: result.totalScore,
                  })
                }
              >
                Ver meu diagnóstico completo
              </CTAButton>
              <p className="text-sm text-slate-400">Crie sua conta em menos de 30 segundos.</p>
            </div>
          </div>
        </motion.section>
      </div>
    </QuizContainer>
  );
}
