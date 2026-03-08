import type { Metadata } from 'next';
import { LegalPage } from '@/app/_shared/legal-page';

export const metadata: Metadata = {
  title: 'Termos de Uso | Cote Finance AI',
  description: 'Condições de uso da plataforma Cote Finance AI.',
};

const sections = [
  {
    title: '1. Uso da plataforma',
    paragraphs: [
      'Ao criar uma conta no Cote Finance AI, você concorda em usar a plataforma de forma lícita, responsável e compatível com a finalidade do produto.',
      'O acesso ao sistema é pessoal e vinculado ao seu usuário e aos workspaces autorizados. Você é responsável por manter suas credenciais seguras.',
    ],
  },
  {
    title: '2. Conta, workspace e responsabilidade',
    paragraphs: [
      'Cada workspace representa um ambiente próprio dentro do SaaS. Você é responsável pelos dados que cadastra, edita, importa ou compartilha dentro desse ambiente.',
      'É proibido utilizar a plataforma para praticar fraude, abuso, violação de direitos de terceiros, engenharia reversa indevida ou qualquer atividade ilícita.',
    ],
  },
  {
    title: '3. Planos, cobrança e cancelamento',
    paragraphs: [
      'Os recursos disponíveis variam conforme o plano contratado. Planos pagos podem incluir renovação recorrente, período de teste, upgrade, downgrade e cancelamento conforme a política de billing vigente.',
      'O cancelamento interrompe futuras cobranças, mas não necessariamente remove imediatamente o acesso a períodos já pagos ou em teste, conforme o status da assinatura.',
    ],
  },
  {
    title: '4. Limitação e disponibilidade',
    paragraphs: [
      'O Cote Finance AI pode evoluir, ajustar recursos, corrigir comportamentos e melhorar a experiência do produto a qualquer momento, sempre buscando preservar a continuidade do serviço.',
      'Embora exista esforço técnico para manter a plataforma disponível e confiável, não há garantia absoluta de operação ininterrupta, sem falhas ou sem necessidade de manutenção.',
    ],
  },
  {
    title: '5. Propriedade intelectual e contato',
    paragraphs: [
      'A marca, identidade visual, código, conteúdos e elementos do produto pertencem ao Cote Finance AI ou aos seus respectivos titulares, quando aplicável.',
      'Ao continuar utilizando a plataforma, você concorda com estes termos e com a Política de Privacidade vigente.',
    ],
  },
];

export default function TermosDeUsoPage() {
  return (
    <LegalPage
      eyebrow="Termos"
      title="Termos de Uso"
      description="Estes termos regulam o uso do Cote Finance AI, incluindo acesso à plataforma, responsabilidades da conta, regras de billing e limites gerais de uso do serviço."
      lastUpdated="7 de março de 2026"
      sections={sections}
      currentPage="termos"
    />
  );
}
