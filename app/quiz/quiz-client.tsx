'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { Sparkles } from 'lucide-react';
import { Manrope, Space_Grotesk } from 'next/font/google';
import {
  AnalysisScreen,
  AnswerButton,
  ProgressBar,
  QuestionCard,
  QuizContainer,
} from './quiz-components';
import { trackQuizEvent } from './quiz-analytics';
import { buildQuizResult, quizQuestions, type QuizAnswer } from './quiz-lib';
import { clearQuizResult, saveQuizResult } from './quiz-storage';

const displayFont = Space_Grotesk({ subsets: ['latin'], weight: ['600', '700'], variable: '--font-display' });
const bodyFont = Manrope({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-body' });

const analysisMessages = [
  'Analisando seus hábitos financeiros...',
  'Comparando com milhares de diagnósticos...',
  'Identificando padrões de gasto...',
  'Gerando seu diagnóstico financeiro...',
];

const suspenseMessages: Partial<Record<number, string>> = {
  1: 'Estamos analisando seus hábitos financeiros...',
  2: 'Estamos identificando padrões de gasto...',
  3: 'Seu diagnóstico está quase pronto...',
};

const psychologicalAlerts: Partial<Record<number, string>> = {
  1: '⚠ Estamos identificando um padrão comum de gastos invisíveis.',
  2: '⚠ Muitas pessoas com respostas parecidas perdem dinheiro sem perceber.',
  3: '⚠ Seu diagnóstico está revelando possíveis vazamentos financeiros.',
};

export default function QuizClient() {
  const router = useRouter();
  const [started, setStarted] = React.useState(false);
  const [questionIndex, setQuestionIndex] = React.useState(0);
  const [answers, setAnswers] = React.useState<QuizAnswer[]>([]);
  const [selectedOptionId, setSelectedOptionId] = React.useState<string | null>(null);
  const [feedback, setFeedback] = React.useState<string | null>(null);
  const [progressMessage, setProgressMessage] = React.useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const [analysisIndex, setAnalysisIndex] = React.useState(0);

  const questionTwoTracked = React.useRef(false);
  const questionFourTracked = React.useRef(false);
  const completedRef = React.useRef(false);
  const answerTimeoutRef = React.useRef<number | null>(null);
  const analysisTimeoutRef = React.useRef<number | null>(null);
  const analysisIntervalRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    clearQuizResult();
  }, []);

  React.useEffect(() => {
    if (!started || isAnalyzing) return;

    if (questionIndex === 1 && !questionTwoTracked.current) {
      trackQuizEvent('quiz_question_2');
      questionTwoTracked.current = true;
    }

    if (questionIndex === 3 && !questionFourTracked.current) {
      trackQuizEvent('quiz_question_4');
      questionFourTracked.current = true;
    }
  }, [isAnalyzing, questionIndex, started]);

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
    if (!started) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [started]);

  React.useEffect(() => {
    return () => {
      if (answerTimeoutRef.current) window.clearTimeout(answerTimeoutRef.current);
      if (analysisTimeoutRef.current) window.clearTimeout(analysisTimeoutRef.current);
      if (analysisIntervalRef.current) window.clearInterval(analysisIntervalRef.current);
    };
  }, []);

  const startQuiz = React.useCallback(() => {
    setStarted(true);
    setQuestionIndex(0);
    setAnswers([]);
    setSelectedOptionId(null);
    setFeedback(null);
    setProgressMessage(null);
    completedRef.current = false;
    trackQuizEvent('quiz_start');
  }, []);

  const currentQuestion = quizQuestions[questionIndex];
  const diagnosisPercent = started ? Math.round(((questionIndex + 1) / quizQuestions.length) * 100) : 0;

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
      setFeedback(option.feedback || 'Boa resposta 👍');

      answerTimeoutRef.current = window.setTimeout(() => {
        setSelectedOptionId(null);
        setFeedback(null);

        if (questionIndex === quizQuestions.length - 1) {
          setIsAnalyzing(true);
          setAnalysisIndex(0);
          setProgressMessage('Seu perfil financeiro está sendo identificado');
          completedRef.current = true;
          trackQuizEvent('quiz_complete', { totalScore: nextAnswers.reduce((sum, answer) => sum + answer.score, 0) });

          analysisIntervalRef.current = window.setInterval(() => {
            setAnalysisIndex((prev) => (prev + 1) % analysisMessages.length);
          }, 700);

          analysisTimeoutRef.current = window.setTimeout(() => {
            if (analysisIntervalRef.current) window.clearInterval(analysisIntervalRef.current);
            const result = buildQuizResult(nextAnswers);
            saveQuizResult(result);
            router.push('/quiz/result');
          }, 2800);

          return;
        }

        const nextQuestionIndex = questionIndex + 1;
        setQuestionIndex(nextQuestionIndex);
        setProgressMessage(suspenseMessages[nextQuestionIndex] || null);
      }, 360);
    },
    [answers, currentQuestion, questionIndex, router, selectedOptionId]
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
                eyebrow="Leva menos de 1 minuto"
                title="Descubra em 30 segundos por que seu dinheiro some todo mês"
                footer={
                  <button
                    type="button"
                    onClick={startQuiz}
                    className="inline-flex min-h-[52px] w-full items-center justify-center rounded-xl bg-emerald-500 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-emerald-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70 sm:w-auto"
                  >
                    Começar diagnóstico
                  </button>
                }
              >
                <div className="space-y-4">
                  <p className="text-lg leading-7 text-slate-300">
                    Mais de 12.000 pessoas já fizeram esse diagnóstico financeiro.
                  </p>
                  <div className="inline-flex rounded-full border border-cyan-300/20 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-100">
                    8 em cada 10 pessoas descobrem gastos invisíveis ao finalizar este quiz.
                  </div>

                  <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-5">
                    <ProgressBar current={0} total={quizQuestions.length} label="Pronto para começar" percentageLabel="Diagnóstico 0% concluído" />
                  </div>

                  <div className="grid gap-4 md:grid-cols-[1.1fr_.9fr]">
                    <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-5">
                      <div className="space-y-3 text-slate-300">
                        <p>No fim do mês parece que tudo aconteceu rápido demais.</p>
                        <p>Esse quiz cruza padrões comuns de gastos invisíveis e mostra um pré-diagnóstico personalizado.</p>
                        <p className="font-medium text-white">Seu resultado sai em menos de 40 segundos.</p>
                      </div>
                    </div>

                    <div className="rounded-3xl border border-emerald-300/20 bg-emerald-500/10 p-5">
                      <div className="flex items-center gap-2 text-sm font-semibold text-emerald-100">
                        <Sparkles size={16} />
                        Experiência guiada
                      </div>
                      <ul className="mt-4 space-y-3 text-sm text-emerald-50">
                        <li>5 perguntas rápidas</li>
                        <li>Diagnóstico com perfil financeiro</li>
                        <li>Estimativa de dinheiro perdido</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </QuestionCard>
            </motion.div>
          ) : isAnalyzing ? (
            <motion.div
              key="quiz-analysis"
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -18 }}
              transition={{ duration: 0.35 }}
            >
              <AnalysisScreen
                title="Seu diagnóstico financeiro está pronto"
                text="Estamos cruzando suas respostas com padrões financeiros comuns para estimar onde o seu dinheiro pode estar escapando."
                messages={analysisMessages}
                activeIndex={analysisIndex}
                statusLabel="Comparando suas respostas com milhares de diagnósticos financeiros..."
                rewardLabel="Seu perfil financeiro foi identificado."
              />
            </motion.div>
          ) : (
            <motion.div
              key={currentQuestion.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.32 }}
              className="space-y-4"
            >
              <div className="rounded-3xl border border-white/10 bg-slate-900/50 p-4 sm:p-5">
                <ProgressBar
                  current={questionIndex + 1}
                  total={quizQuestions.length}
                  label="Diagnóstico financeiro em andamento"
                  percentageLabel={`Diagnóstico ${diagnosisPercent}% concluído`}
                />
                <AnimatePresence mode="wait">
                  {progressMessage ? (
                    <motion.p
                      key={progressMessage}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.22 }}
                      className="mt-3 text-sm font-medium leading-6 text-cyan-200"
                    >
                      {progressMessage}
                    </motion.p>
                  ) : null}
                </AnimatePresence>
                <AnimatePresence mode="wait">
                  {psychologicalAlerts[questionIndex] ? (
                    <motion.p
                      key={psychologicalAlerts[questionIndex]}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.22, delay: 0.04 }}
                      className="mt-2 text-sm font-medium leading-6 text-amber-200"
                    >
                      {psychologicalAlerts[questionIndex]}
                    </motion.p>
                  ) : null}
                </AnimatePresence>
              </div>

              <QuestionCard eyebrow="Pré-diagnóstico financeiro" title={currentQuestion.title}>
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

                <div className="mt-5 min-h-7">
                  <AnimatePresence>
                    {feedback ? (
                      <motion.p
                        key={feedback}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2 }}
                        className="text-sm font-medium text-emerald-200"
                      >
                        {feedback}
                      </motion.p>
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
