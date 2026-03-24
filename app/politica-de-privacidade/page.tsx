import type { Metadata } from 'next';
import { LegalPage } from '@/app/_shared/legal-page';

export const metadata: Metadata = {
  title: 'Política de Privacidade | Cote Finance AI',
  description: 'Como o Cote Finance AI coleta, usa e protege seus dados.',
};

const sections = [
  {
    title: '1. Dados que coletamos',
    paragraphs: [
      'Coletamos os dados necessários para criar sua conta, autenticar seu acesso, manter sua conta ativa e oferecer os recursos financeiros do produto.',
      'Esses dados podem incluir nome, e-mail, dados de autenticação, preferências de uso e informações financeiras que você registrar no sistema.',
    ],
    bullets: [
      'Dados cadastrais e de autenticação',
      'Informações da conta e do plano contratado',
      'Transações, metas, dívidas, investimentos e demais registros inseridos por você',
      'Dados técnicos mínimos para segurança, desempenho e auditoria',
    ],
  },
  {
    title: '2. Como usamos seus dados',
    paragraphs: [
      'Usamos seus dados para operar o Cote Finance AI, autenticar seu acesso, processar assinatura, gerar relatórios e disponibilizar funcionalidades de análise financeira e inteligência artificial.',
      'Também utilizamos essas informações para segurança, prevenção de fraude, suporte, diagnóstico técnico e melhoria contínua da plataforma.',
    ],
  },
  {
    title: '3. Compartilhamento de dados',
    paragraphs: [
      'Não vendemos seus dados pessoais. O compartilhamento ocorre apenas quando necessário para viabilizar a operação do produto, como autenticação, infraestrutura, cobrança, envio de e-mails e integrações solicitadas por você.',
      'Prestadores terceirizados acessam apenas o mínimo necessário para executar o serviço contratado e devem seguir padrões adequados de segurança e confidencialidade.',
    ],
  },
  {
    title: '4. Segurança e retenção',
    paragraphs: [
      'Adotamos medidas técnicas e organizacionais razoáveis para proteger sua conta e seus dados contra acesso não autorizado, alteração indevida, perda e uso abusivo.',
      'Mantemos os dados pelo tempo necessário para operar a conta, cumprir obrigações legais, resolver disputas e preservar a integridade do histórico da conta.',
    ],
  },
  {
    title: '5. Seus direitos',
    paragraphs: [
      'Você pode solicitar atualização de dados cadastrais, exclusão da conta, esclarecimentos sobre tratamento de dados e informações sobre armazenamento e processamento.',
      'Solicitações relacionadas à privacidade podem ser feitas pelos canais oficiais de contato do Cote Finance AI.',
    ],
  },
];

export default function PoliticaDePrivacidadePage() {
  return (
    <LegalPage
      eyebrow="Privacidade"
      title="Política de Privacidade"
      description="Esta política explica como o Cote Finance AI trata seus dados para operar o produto com segurança, manter sua conta ativa e entregar os recursos financeiros e de inteligência artificial da plataforma."
      lastUpdated="7 de março de 2026"
      sections={sections}
      currentPage="privacidade"
    />
  );
}
