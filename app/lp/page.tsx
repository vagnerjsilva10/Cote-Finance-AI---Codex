import type { Metadata } from 'next';
import LandingPage from '../landing/page';

export const metadata: Metadata = {
  title: 'Cote Finance AI | Descubra para onde seu dinheiro está indo',
  description:
    'Controle financeiro com IA para entender seus gastos, visualizar categorias, receber insights automáticos e alertas no WhatsApp.',
};

export default function PaidLandingPage() {
  return <LandingPage />;
}
