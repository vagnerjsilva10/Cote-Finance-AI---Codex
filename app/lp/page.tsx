import type { Metadata } from 'next';
import PaidLandingClient from './paid-landing-client';

export const metadata: Metadata = {
  title: 'Cote Finance AI | Descubra Para Onde Seu Dinheiro Está Indo',
  description:
    'Controle financeiro com IA para entender seus gastos, visualizar categorias, receber insights automáticos e alertas no WhatsApp.',
};

export default function PaidLandingPage() {
  return <PaidLandingClient />;
}
