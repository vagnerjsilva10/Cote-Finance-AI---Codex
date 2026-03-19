export type QuizOption = {
  id: string;
  label: string;
  score: number;
};

export type QuizQuestion = {
  id: string;
  title: string;
  options: QuizOption[];
};

export type QuizAnswer = {
  questionId: string;
  optionId: string;
  label: string;
  score: number;
};

export type QuizProfileKey = 'clareza-inicial' | 'atenção' | 'recorrente';

export type QuizResultData = {
  totalScore: number;
  profileKey: QuizProfileKey;
  profileTitle: string;
  profileText: string;
  profileDescription: string;
  monthlyLossMin: number;
  monthlyLossMax: number;
  annualLossMax: number;
  answers: QuizAnswer[];
  insights: string[];
  generatedAt: number;
};

export const QUIZ_STORAGE_KEY = 'cote-finance-ai.quiz.result';

export const quizQuestions: QuizQuestion[] = [
  {
    id: 'month-visibility',
    title: 'Você costuma saber exatamente quanto gastou no mês passado?',
    options: [
      { id: 'exact', label: 'Sei exatamente', score: 0 },
      { id: 'rough', label: 'Tenho uma ideia', score: 1 },
      { id: 'uncertain', label: 'Não sei direito', score: 2 },
      { id: 'none', label: 'Nem acompanho', score: 3 },
    ],
  },
  {
    id: 'review-frequency',
    title: 'Com que frequência você revisa seus gastos?',
    options: [
      { id: 'weekly', label: 'Toda semana', score: 0 },
      { id: 'sometimes', label: 'Algumas vezes no mês', score: 1 },
      { id: 'rarely', label: 'Raramente', score: 2 },
      { id: 'never', label: 'Nunca', score: 3 },
    ],
  },
  {
    id: 'money-disappears',
    title: 'Você já sentiu que o dinheiro simplesmente “sumiu”?',
    options: [
      { id: 'often', label: 'Sim, frequentemente', score: 3 },
      { id: 'sometimes', label: 'Às vezes', score: 2 },
      { id: 'rarely', label: 'Raramente', score: 1 },
      { id: 'never', label: 'Nunca', score: 0 },
    ],
  },
  {
    id: 'expense-clarity',
    title: 'Você sabe quais são seus maiores gastos hoje?',
    options: [
      { id: 'clear', label: 'Sim, claramente', score: 0 },
      { id: 'some', label: 'Tenho uma noção', score: 1 },
      { id: 'unsure', label: 'Não tenho certeza', score: 2 },
      { id: 'no-idea', label: 'Não faço ideia', score: 3 },
    ],
  },
  {
    id: 'past-attempt',
    title: 'Você já tentou organizar suas finanças antes?',
    options: [
      { id: 'worked', label: 'Sim, e funcionou', score: 0 },
      { id: 'not-sustained', label: 'Sim, mas não mantive', score: 2 },
      { id: 'gave-up', label: 'Tentei e desisti', score: 3 },
      { id: 'never', label: 'Nunca tentei', score: 2 },
    ],
  },
  {
    id: 'main-goal',
    title: 'Se você tivesse mais clareza financeira, o que mais quer?',
    options: [
      { id: 'save-more', label: 'Economizar mais', score: 1 },
      { id: 'stop-losing', label: 'Parar de perder dinheiro', score: 2 },
      { id: 'full-control', label: 'Ter controle total', score: 1 },
      { id: 'decide-better', label: 'Tomar decisões melhores', score: 1 },
    ],
  },
];

const profileCopy = {
  'clareza-inicial': {
    title: 'Perfil Clareza Inicial',
    text: 'Você já tem alguns sinais de controle, mas ainda pode estar deixando dinheiro escapar.',
    description:
      'Seu padrão mostra espaço para evolução consistente. Com mais visibilidade, você reduz ruído e toma decisões melhores.',
  },
  atenção: {
    title: 'Perfil Atenção',
    text: 'Seu padrão indica perda recorrente por falta de visibilidade financeira.',
    description:
      'Sem uma rotina clara de leitura dos gastos, decisões importantes acabam acontecendo no escuro e o resultado trava no médio prazo.',
  },
  recorrente: {
    title: 'Perfil Perda Recorrente',
    text: 'Seu diagnóstico indica sinais fortes de desperdício financeiro contínuo.',
    description:
      'Sem clareza prática, pequenos gastos se acumulam e comprometem sua capacidade de economizar, planejar e evoluir com segurança.',
  },
} as const;

export function getProfileKey(totalScore: number): QuizProfileKey {
  if (totalScore <= 5) return 'clareza-inicial';
  if (totalScore <= 11) return 'atenção';
  return 'recorrente';
}

export function getLossEstimate(totalScore: number) {
  if (totalScore <= 5) {
    return { monthlyLossMin: 180, monthlyLossMax: 420, annualLossMax: 5040 };
  }
  if (totalScore <= 11) {
    return { monthlyLossMin: 320, monthlyLossMax: 760, annualLossMax: 9120 };
  }
  return { monthlyLossMin: 520, monthlyLossMax: 1300, annualLossMax: 15600 };
}

export function buildInsights(answers: QuizAnswer[]) {
  const insights = new Set<string>();

  const monthVisibility = answers.find((answer) => answer.questionId === 'month-visibility');
  if (!monthVisibility || monthVisibility.score >= 2) {
    insights.add('você não tem uma leitura mensal consistente dos seus gastos');
  }

  const review = answers.find((answer) => answer.questionId === 'review-frequency');
  if (!review || review.score >= 2) {
    insights.add('falta de revisão recorrente está aumentando desperdícios invisíveis');
  }

  const disappears = answers.find((answer) => answer.questionId === 'money-disappears');
  if (!disappears || disappears.score >= 2) {
    insights.add('há sinais claros de decisões no escuro ao longo do mês');
  }

  const clarity = answers.find((answer) => answer.questionId === 'expense-clarity');
  if (!clarity || clarity.score >= 2) {
    insights.add('seus maiores gastos ainda não estão totalmente mapeados');
  }

  const attempts = answers.find((answer) => answer.questionId === 'past-attempt');
  if (!attempts || attempts.optionId === 'not-sustained' || attempts.optionId === 'gave-up') {
    insights.add('faltou um sistema simples e sustentável para manter o controle');
  }

  return Array.from(insights).slice(0, 4);
}

export function buildQuizResult(answers: QuizAnswer[]): QuizResultData {
  const totalScore = answers.reduce((sum, answer) => sum + answer.score, 0);
  const profileKey = getProfileKey(totalScore);
  const profile = profileCopy[profileKey];
  const lossEstimate = getLossEstimate(totalScore);

  return {
    totalScore,
    profileKey,
    profileTitle: profile.title,
    profileText: profile.text,
    profileDescription: profile.description,
    monthlyLossMin: lossEstimate.monthlyLossMin,
    monthlyLossMax: lossEstimate.monthlyLossMax,
    annualLossMax: lossEstimate.annualLossMax,
    answers,
    insights: buildInsights(answers),
    generatedAt: Date.now(),
  };
}
