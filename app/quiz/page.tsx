import type { Metadata } from 'next';
import QuizClient from './quiz-client';

export const metadata: Metadata = {
  title: 'Quiz Financeiro | Descubra se você está perdendo dinheiro sem perceber',
  description:
    'Faça um diagnóstico financeiro rápido e descubra em menos de 1 minuto onde sua falta de visibilidade pode estar gerando perdas.',
};

export default function QuizPage() {
  return <QuizClient />;
}
