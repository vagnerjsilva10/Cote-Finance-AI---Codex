import type { Metadata } from 'next';
import LandingPage from '../landing/page';

export const metadata: Metadata = {
  title: 'Cote Finance AI | Clareza financeira com inteligência',
  description:
    'Pare de adivinhar. Entenda para onde seu dinheiro está indo com IA, insights acionáveis e controle financeiro premium.',
};

export default function PaidLandingPage() {
  return <LandingPage />;
}
