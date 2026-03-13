import type { Metadata } from 'next';
import QuizClient from './quiz-client';

export const metadata: Metadata = {
  title: 'Quiz Financeiro | Descubra Por Que Seu Dinheiro Some',
  description:
    'Faça um diagnóstico financeiro rápido e descubra em menos de 1 minuto por que seu dinheiro pode estar sumindo no fim do mês.',
};

export default function QuizPage() {
  return <QuizClient />;
}
