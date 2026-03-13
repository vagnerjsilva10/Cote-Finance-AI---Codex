export type QuizOption = {
  id: string;
  label: string;
  score: number;
  feedback?: string;
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

export type QuizProfileKey = 'controlado' | 'desorganizado' | 'dinheiro-invisivel';

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
    id: 'month-end',
    title: 'No fim do mês, qual dessas situações descreve melhor sua conta bancária?',
    options: [
      { id: 'surplus', label: 'Sobra dinheiro', score: 0, feedback: 'Boa resposta.' },
      { id: 'zero', label: 'Fica no zero', score: 1, feedback: 'Isso já mostra um ponto de atenção.' },
      { id: 'tight', label: 'Quase sempre aperta', score: 2, feedback: 'Isso é mais comum do que você imagina.' },
      { id: 'invisible', label: 'Não sei para onde foi', score: 3, feedback: 'Analisando padrão financeiro...' },
    ],
  },
  {
    id: 'visibility',
    title: 'Você sabe exatamente para onde seu dinheiro vai?',
    options: [
      { id: 'full-control', label: 'Tenho controle total', score: 0, feedback: 'Ótimo começo.' },
      { id: 'some-idea', label: 'Tenho uma ideia', score: 1, feedback: 'Já existe alguma visibilidade.' },
      { id: 'partial', label: 'Mais ou menos', score: 2, feedback: 'Seu diagnóstico está quase mostrando isso.' },
      { id: 'no-idea', label: 'Não faço ideia', score: 3, feedback: 'Esse é um sinal forte de dinheiro invisível.' },
    ],
  },
  {
    id: 'expense-weight',
    title: 'Qual desses gastos você acha que mais pesa no seu mês?',
    options: [
      { id: 'delivery', label: 'Delivery', score: 2, feedback: 'Estamos quase terminando seu diagnóstico.' },
      { id: 'online-shopping', label: 'Compras online', score: 2, feedback: 'Esse padrão aparece bastante.' },
      { id: 'subscriptions', label: 'Assinaturas', score: 1, feedback: 'Assinaturas pequenas costumam somar rápido.' },
      { id: 'transport', label: 'Transporte', score: 1, feedback: 'Custos recorrentes merecem atenção.' },
      { id: 'unknown', label: 'Não sei', score: 3, feedback: 'Não saber já é um ótimo sinal do que precisa melhorar.' },
    ],
  },
  {
    id: 'control-attempt',
    title: 'Você já tentou controlar seus gastos antes?',
    options: [
      { id: 'spreadsheets', label: 'Sim, com planilhas', score: 1, feedback: 'Você já tentou resolver isso.' },
      { id: 'app', label: 'Sim, com app', score: 1, feedback: 'Boa base para evoluir o controle.' },
      { id: 'gave-up', label: 'Já tentei, mas desisti', score: 2, feedback: 'Isso normalmente acontece quando falta clareza prática.' },
      { id: 'never', label: 'Nunca tentei', score: 3, feedback: 'Seu diagnóstico está quase pronto.' },
    ],
  },
  {
    id: 'desired-change',
    title: 'Se você tivesse mais clareza financeira, o que mais mudaria hoje?',
    options: [
      { id: 'save-more', label: 'Economizar mais', score: 2, feedback: 'Gerando diagnóstico personalizado...' },
      { id: 'invest-better', label: 'Investir melhor', score: 1, feedback: 'Boa meta.' },
      { id: 'stop-struggling', label: 'Parar de viver apertado', score: 3, feedback: 'Seu diagnóstico foi gerado agora.' },
      { id: 'understand-money', label: 'Entender melhor meu dinheiro', score: 2, feedback: 'Seu diagnóstico foi gerado agora.' },
    ],
  },
];

const profileCopy = {
  controlado: {
    title: 'Perfil Controlado',
    text: 'Você já tem alguma visibilidade sobre sua vida financeira.',
    description:
      'Mesmo com uma base melhor que a média, ainda podem existir pequenos vazamentos que ficam escondidos no dia a dia. Mais clareza ajuda a economizar com mais consistência.',
  },
  desorganizado: {
    title: 'Perfil Desorganizado',
    text: 'Sua rotina financeira parece estar sem um sistema claro de acompanhamento.',
    description:
      'Parte do problema não está na renda em si, mas na dificuldade de visualizar o que acontece ao longo do mês. Quando isso fica claro, organizar o dinheiro se torna muito mais viável.',
  },
  'dinheiro-invisivel': {
    title: 'Perfil Dinheiro Invisível',
    text: 'Parte do seu dinheiro provavelmente está sendo consumida por gastos invisíveis.',
    description:
      'Sem perceber, pequenas despesas podem consumir uma parte relevante da sua renda mensal. A boa notícia é que isso pode ser corrigido quando você passa a enxergar seus gastos com clareza.',
  },
} as const;

export function getProfileKey(totalScore: number): QuizProfileKey {
  if (totalScore <= 3) return 'controlado';
  if (totalScore <= 6) return 'desorganizado';
  return 'dinheiro-invisivel';
}

export function getLossEstimate(totalScore: number) {
  if (totalScore <= 3) {
    return { monthlyLossMin: 80, monthlyLossMax: 180, annualLossMax: 2160 };
  }

  if (totalScore <= 6) {
    return { monthlyLossMin: 180, monthlyLossMax: 360, annualLossMax: 4320 };
  }

  return { monthlyLossMin: 280, monthlyLossMax: 540, annualLossMax: 6480 };
}

export function buildInsights(answers: QuizAnswer[]) {
  const insights = new Set<string>();

  const visibility = answers.find((answer) => answer.questionId === 'visibility');
  if (!visibility || visibility.score >= 2) {
    insights.add('você pode não ter clareza total dos gastos mensais');
  }

  const expenseWeight = answers.find((answer) => answer.questionId === 'expense-weight');
  if (!expenseWeight || expenseWeight.optionId === 'unknown') {
    insights.add('categorias invisíveis podem consumir parte da sua renda');
  } else if (expenseWeight.optionId === 'delivery' || expenseWeight.optionId === 'online-shopping') {
    insights.add('pequenas compras podem estar se acumulando');
  } else {
    insights.add('gastos recorrentes podem estar pesando mais do que parecem');
  }

  const controlAttempt = answers.find((answer) => answer.questionId === 'control-attempt');
  if (!controlAttempt || controlAttempt.optionId === 'gave-up' || controlAttempt.optionId === 'never') {
    insights.add('falta um sistema simples para acompanhar sua rotina financeira');
  }

  const monthEnd = answers.find((answer) => answer.questionId === 'month-end');
  if (!monthEnd || monthEnd.score >= 2) {
    insights.add('o fim do mês pode estar chegando com menos previsibilidade do que deveria');
  }

  return Array.from(insights).slice(0, 4);
}

export function buildQuizResult(answers: QuizAnswer[]): QuizResultData {
  const totalScore = answers.reduce((sum, answer) => sum + answer.score, 0);
  const profileKey = getProfileKey(totalScore);
  const lossEstimate = getLossEstimate(totalScore);
  const profile = profileCopy[profileKey];

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
