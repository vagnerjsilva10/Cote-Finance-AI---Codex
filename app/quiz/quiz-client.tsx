'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, Sparkles } from 'lucide-react';
import { Manrope, Space_Grotesk } from 'next/font/google';
import { AnswerButton, ProgressBar, QuestionCard, QuizContainer } from './quiz-components';
import { trackQuizEvent } from './quiz-analytics';
import { buildQuizResult, quizQuestions, type QuizAnswer } from './quiz-lib';
import { clearQuizResult, saveQuizResult } from './quiz-storage';

const displayFont = Space_Grotesk({ subsets: ['latin'], weight: ['600', '700'], variable: '--font-display' });
const bodyFont = Manrope({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-body' });

const progressStages = [
  'Analisando seu comportamento financeiro...',
  'Identificando possíveis desperdícios...',
  'Detectando padrões invisíveis...',
  'Gerando seu diagnóstico...',
];

const questionAlerts: Partial<Record<number, string>> = {
  0: '⚠️ A maioria das pessoas perde controle já nesse ponto',
  1: '📉 Falta de revisão aumenta desperdícios invisíveis',
  2: '🚨 Isso é um dos sinais mais claros de falta de visibilidade',
  3: '⚠️ Sem isso, você não consegue melhorar',
  4: '💡 Sem clareza, qualquer método quebra com o tempo',
};

function getStageByQuestionIndex(index: number) {
  const ratio = (index + 1) / quizQuestions.length;
  if (ratio <= 0.25) return progressStages[0];
  if (ratio <= 0.5) return progressStages[1];
  if (ratio <= 0.8) return progressStages[2];
  return progressStages[3];
}

export default function QuizClient() {
  const router = useRouter();
  const [started, setStarted] = React.useState(false);
  const [questionIndex, setQuestionIndex] = React.useState(0);
  const [answers, setAnswers] = React.useState<QuizAnswer[]>([]);
  const [selectedOptionId, setSelectedOptionId] = React.useState<string | null>(null);
  const [responseAlert, setResponseAlert] = React.useState<string | null>(null);
  const [showTensionScreen, setShowTensionScreen] = React.useState(false);
  const [analysisIndex, setAnalysisIndex] = React.useState(0);
  const [analysisProgress, setAnalysisProgress] = React.useState(12);

  const questionTwoTracked = React.useRef(false);
  const questionFourTracked = React.useRef(false);
  const completedRef = React.useRef(false);
  const answerTimeoutRef = React.useRef<number | null>(null);
  const tensionIntervalRef = React.useRef<number | null>(null);
  const tensionTimeoutRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    clearQuizResult();
  }, []);

  React.useEffect(() => {
    if (!started || showTensionScreen) return;
    if (questionIndex === 1 && !questionTwoTracked.current) {
      trackQuizEvent('quiz_question_2');
      questionTwoTracked.current = true;
    }
    if (questionIndex === 3 && !questionFourTracked.current) {
      trackQuizEvent('quiz_question_4');
      questionFourTracked.current = true;
    }
  }, [questionIndex, showTensionScreen, started]);

  React.useEffect(() => {
    return () => {
      if (started && !completedRef.current) {
        trackQuizEvent('quiz_dropoff_step', {
          step: Math.min(questionIndex + 1, quizQuestions.length),
          answersCount: answers.length,
        });
      }
    };
  }, [answers.length, questionIndex, started]);

  React.useEffect(() => {
    return () => {
      if (answerTimeoutRef.current) window.clearTimeout(answerTimeoutRef.current);
      if (tensionIntervalRef.current) window.clearInterval(tensionIntervalRef.current);
      if (tensionTimeoutRef.current) window.clearTimeout(tensionTimeoutRef.current);
    };
  }, []);

  const startQuiz = React.useCallback(() => {
    setStarted(true);
    setQuestionIndex(0);
    setAnswers([]);
    setSelectedOptionId(null);
    setResponseAlert(null);
    setShowTensionScreen(false);
    setAnalysisIndex(0);
    setAnalysisProgress(12);
    completedRef.current = false;
    trackQuizEvent('quiz_start');
  }, []);

  const currentQuestion = quizQuestions[questionIndex];

  const openTensionScreen = React.useCallback(
    (finalAnswers: QuizAnswer[]) => {
      setShowTensionScreen(true);
      setAnalysisIndex(0);
      setAnalysisProgress(18);
      completedRef.current = true;
      trackQuizEvent('quiz_complete', { totalScore: finalAnswers.reduce((sum, item) => sum + item.score, 0) });

      tensionIntervalRef.current = window.setInterval(() => {
        setAnalysisIndex((prev) => {
          if (prev >= progressStages.length - 1) return prev;
          return prev + 1;
        });

        setAnalysisProgress((prev) => {
          if (prev >= 96) return 96;
          return prev + 22;
        });
      }, 650);

      tensionTimeoutRef.current = window.setTimeout(() => {
        if (tensionIntervalRef.current) window.clearInterval(tensionIntervalRef.current);
        setAnalysisProgress(100);
        const result = buildQuizResult(finalAnswers);
        saveQuizResult(result);
        router.push('/quiz/result');
      }, 3000);
    },
    [router]
  );

  const handleAnswer = React.useCallback(
    (optionId: string) => {
      if (!currentQuestion || selectedOptionId) return;

      const option = currentQuestion.options.find((item) => item.id === optionId);
      if (!option) return;

      const nextAnswer: QuizAnswer = {
        questionId: currentQuestion.id,
        optionId: option.id,
        label: option.label,
        score: option.score,
      };

      const nextAnswers = [...answers, nextAnswer];
      setAnswers(nextAnswers);
      setSelectedOptionId(option.id);
      setResponseAlert(questionAlerts[questionIndex] || null);

      answerTimeoutRef.current = window.setTimeout(() => {
        setSelectedOptionId(null);
        setResponseAlert(null);

        if (questionIndex === quizQuestions.length - 1) {
          openTensionScreen(nextAnswers);
          return;
        }

        setQuestionIndex((prev) => prev + 1);
      }, 520);
    },
    [answers, currentQuestion, openTensionScreen, questionIndex, selectedOptionId]
  );

  return (
    <QuizContainer className={`${displayFont.variable} ${bodyFont.variable}`}>
      <div className="mx-auto max-w-3xl" style={{ fontFamily: 'var(--font-body)' }}>
        <AnimatePresence mode="wait">
          {!started ? (
            <motion.div
              key="quiz-intro"
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -18 }}
              transition={{ duration: 0.35 }}
              className="space-y-5"
            >
              <QuestionCard
                eyebrow="Diagnóstico inteligente em 60 segundos"
                eyebrowClassName="border-[rgba(79,140,255,.38)] bg-[rgba(79,140,255,.14)] text-[var(--primary)]"
                title="Descubra em 60 segundos se você está perdendo dinheiro sem perceber"
                footer={
                  <button
                    type="button"
                    onClick={startQuiz}
                    className="inline-flex min-h-[56px] w-full items-center justify-center rounded-xl border border-[rgba(255,255,255,.14)] bg-[linear-gradient(135deg,var(--cta-primary)_0%,var(--accent-premium)_100%)] px-7 py-3.5 text-sm font-bold text-white shadow-[0_10px_25px_rgba(79,140,255,.3)] transition-[transform,filter,box-shadow,background] duration-200 hover:-translate-y-[1px] hover:[background:linear-gradient(135deg,var(--cta-hover)_0%,var(--accent-premium)_100%)] hover:shadow-[0_14px_30px_rgba(79,140,255,.36)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--selected-glow)] active:translate-y-0 active:scale-[0.99] active:[background:linear-gradient(135deg,var(--cta-active)_0%,var(--accent-premium)_100%)] active:shadow-[0_6px_18px_rgba(60,123,224,.38)] sm:w-auto"
                  >
                    Começar agora
                  </button>
                }
              >
                <div className="space-y-4">
                  <p className="text-base leading-7 text-[var(--text-secondary)] sm:text-lg">
                    Responda algumas perguntas rápidas e veja o que está travando sua vida financeira.
                  </p>

                  <div className="inline-flex max-w-full rounded-full border border-[rgba(79,140,255,.34)] bg-[rgba(79,140,255,.1)] px-3 py-1 text-xs font-bold leading-5 text-[#4F8CFF]">
                    +12.000 pessoas já fizeram esse diagnóstico
                  </div>

                  <div className="grid gap-4 md:grid-cols-[1.05fr_.95fr]">
                    <div className="rounded-3xl border border-[var(--border-default)] bg-[linear-gradient(155deg,rgba(8,12,22,.9)_0%,rgba(18,29,50,.82)_100%)] p-5">
                      <ProgressBar current={0} total={quizQuestions.length} label="Pronto para começar?" stageText={progressStages[0]} />
                    </div>

                    <div className="rounded-3xl border border-[color:color-mix(in_srgb,var(--warning)_35%,transparent)] bg-[var(--warning-soft)] p-5">
                      <div className="flex items-center gap-2 text-sm font-semibold text-[var(--warning)]">
                        <Sparkles size={16} />
                        Diagnóstico pessoal
                      </div>
                      <ul className="mt-4 space-y-3 text-sm leading-6 text-[var(--text-secondary)]">
                        <li>6 perguntas objetivas</li>
                        <li>Análise de padrões invisíveis</li>
                        <li>Resultado com direção prática</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </QuestionCard>
            </motion.div>
          ) : showTensionScreen ? (
            <motion.div
              key="tension-screen"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.32 }}
            >
              <QuestionCard eyebrow="Finalizando diagnóstico" title="⚠️ Detectamos padrões que indicam perda financeira recorrente">
                <div className="space-y-6">
                  <p className="text-base leading-7 text-[var(--text-secondary)]">Estamos finalizando seu diagnóstico...</p>

                  <div className="rounded-3xl border border-[color:color-mix(in_srgb,var(--danger)_35%,transparent)] bg-[var(--danger-soft)] p-4">
                    <motion.div
                      animate={{ scale: [1, 1.02, 1] }}
                      transition={{ duration: 1.6, repeat: Infinity }}
                      className="flex items-center gap-2 text-sm font-semibold text-[var(--danger)]"
                    >
                      <AlertTriangle size={16} />
                      Sinal de atenção: decisões financeiras no escuro
                    </motion.div>
                  </div>

                  <div className="rounded-3xl border border-[var(--border-default)] bg-[linear-gradient(155deg,rgba(8,12,22,.88)_0%,rgba(20,30,52,.82)_68%,rgba(20,34,60,.74)_100%)] p-5">
                    <ProgressBar current={Math.min(quizQuestions.length, quizQuestions.length)} total={quizQuestions.length} label="Processando respostas" stageText={progressStages[analysisIndex]} />
                    <div className="mt-4 h-3 overflow-hidden rounded-full border border-[rgba(255,255,255,.09)] bg-[rgba(255,255,255,.08)]">
                      <motion.div
                        initial={{ width: '12%' }}
                        animate={{ width: `${analysisProgress}%` }}
                        transition={{ duration: 0.35, ease: 'easeOut' }}
                        className="h-full rounded-full bg-[linear-gradient(90deg,var(--cta-primary)_0%,var(--accent-premium)_100%)] shadow-[0_0_16px_rgba(79,140,255,.48)]"
                      />
                    </div>
                  </div>
                </div>
              </QuestionCard>
            </motion.div>
          ) : (
            <motion.div
              key={currentQuestion.id}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.3 }}
              className="space-y-5"
            >
              <div className="rounded-3xl border border-[var(--border-default)] bg-[linear-gradient(160deg,rgba(15,23,42,.68)_0%,rgba(19,30,54,.7)_60%,rgba(18,32,58,.58)_100%)] p-4 sm:p-5">
                <ProgressBar
                  current={questionIndex + 1}
                  total={quizQuestions.length}
                  label="Diagnóstico em andamento"
                  stageText={getStageByQuestionIndex(questionIndex)}
                />
              </div>

              <QuestionCard eyebrow="Diagnóstico financeiro pessoal" title={currentQuestion.title}>
                <div className="space-y-3">
                  {currentQuestion.options.map((option) => (
                    <AnswerButton
                      key={option.id}
                      label={option.label}
                      selected={selectedOptionId === option.id}
                      disabled={Boolean(selectedOptionId)}
                      onClick={() => handleAnswer(option.id)}
                    />
                  ))}
                </div>

                <div className="mt-5 min-h-8">
                  <AnimatePresence mode="wait">
                    {responseAlert ? (
                      <motion.div
                        key={responseAlert}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.22 }}
                        className="rounded-2xl border border-[color:color-mix(in_srgb,var(--warning)_34%,transparent)] bg-[var(--warning-soft)] px-4 py-3 text-sm font-medium text-[var(--warning)]"
                      >
                        <motion.span animate={{ opacity: [0.85, 1, 0.85] }} transition={{ duration: 1.4, repeat: Infinity }}>
                          {responseAlert}
                        </motion.span>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
              </QuestionCard>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </QuizContainer>
  );
}
