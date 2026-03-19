import type { Metadata } from 'next';
import ResultClient from './result-client';

export const metadata: Metadata = {
  title: 'Resultado do Diagnóstico Financeiro | Cote Finance AI',
  description:
    'Veja seu diagnóstico financeiro, estimativa de perdas recorrentes e próximos passos para recuperar controle com clareza.',
};

export default function QuizResultPage() {
  return <ResultClient />;
}
