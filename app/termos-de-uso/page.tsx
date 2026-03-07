import type { Metadata } from 'next';
import { LegalPage } from '@/app/_shared/legal-page';

export const metadata: Metadata = {
  title: 'Termos de Uso | Cote Finance AI',
  description: 'Condi\u00e7\u00f5es de uso da plataforma Cote Finance AI.',
};

const sections = [
  {
    title: '1. Uso da plataforma',
    paragraphs: [
      'Ao criar uma conta no Cote Finance AI, voc\u00ea concorda em usar a plataforma de forma l\u00edcita, respons\u00e1vel e compat\u00edvel com a finalidade do produto.',
      'O acesso ao sistema \u00e9 pessoal e vinculado ao seu usu\u00e1rio e aos workspaces autorizados. Voc\u00ea \u00e9 respons\u00e1vel por manter suas credenciais seguras.',
    ],
  },
  {
    title: '2. Conta, workspace e responsabilidade',
    paragraphs: [
      'Cada workspace representa um ambiente pr\u00f3prio dentro do SaaS. Voc\u00ea \u00e9 respons\u00e1vel pelos dados que cadastra, edita, importa ou compartilha dentro desse ambiente.',
      '\u00c9 proibido utilizar a plataforma para praticar fraude, abuso, viola\u00e7\u00e3o de direitos de terceiros, engenharia reversa indevida ou qualquer atividade il\u00edcita.',
    ],
  },
  {
    title: '3. Planos, cobran\u00e7a e cancelamento',
    paragraphs: [
      'Os recursos dispon\u00edveis variam conforme o plano contratado. Planos pagos podem incluir renova\u00e7\u00e3o recorrente, per\u00edodo de teste, upgrade, downgrade e cancelamento conforme a pol\u00edtica de billing vigente.',
      'O cancelamento interrompe futuras cobran\u00e7as, mas n\u00e3o necessariamente remove imediatamente o acesso a per\u00edodos j\u00e1 pagos ou em teste, conforme o status da assinatura.',
    ],
  },
  {
    title: '4. Limita\u00e7\u00e3o e disponibilidade',
    paragraphs: [
      'O Cote Finance AI pode evoluir, ajustar recursos, corrigir comportamentos e melhorar a experi\u00eancia do produto a qualquer momento, sempre buscando preservar a continuidade do servi\u00e7o.',
      'Embora exista esfor\u00e7o t\u00e9cnico para manter a plataforma dispon\u00edvel e confi\u00e1vel, n\u00e3o h\u00e1 garantia absoluta de opera\u00e7\u00e3o ininterrupta, sem falhas ou sem necessidade de manuten\u00e7\u00e3o.',
    ],
  },
  {
    title: '5. Propriedade intelectual e contato',
    paragraphs: [
      'A marca, identidade visual, c\u00f3digo, conte\u00fados e elementos do produto pertencem ao Cote Finance AI ou aos seus respectivos titulares, quando aplic\u00e1vel.',
      'Ao continuar utilizando a plataforma, voc\u00ea concorda com estes termos e com a Pol\u00edtica de Privacidade vigente.',
    ],
  },
];

export default function TermosDeUsoPage() {
  return (
    <LegalPage
      eyebrow="Termos"
      title="Termos de Uso"
      description="Estes termos regulam o uso do Cote Finance AI, incluindo acesso \u00e0 plataforma, responsabilidades da conta, regras de billing e limites gerais de uso do servi\u00e7o."
      lastUpdated="7 de mar\u00e7o de 2026"
      sections={sections}
    />
  );
}
