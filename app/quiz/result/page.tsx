import type { Metadata } from 'next';
import ResultClient from './result-client';

export const metadata: Metadata = {
  title: 'Resultado do Quiz Financeiro | Cote Finance AI',
  description:
    'Veja seu perfil financeiro, a estimativa de dinheiro perdido e como o Cote Finance AI pode ajudar a organizar sua rotina financeira.',
};

export default function QuizResultPage() {
  return <ResultClient />;
}
