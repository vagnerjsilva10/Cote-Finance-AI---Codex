import type { Metadata } from 'next';
import { LegalPage } from '@/app/_shared/legal-page';

export const metadata: Metadata = {
  title: 'Pol\u00edtica de Privacidade | Cote Finance AI',
  description: 'Como o Cote Finance AI coleta, usa e protege seus dados.',
};

const sections = [
  {
    title: '1. Dados que coletamos',
    paragraphs: [
      'Coletamos os dados necess\u00e1rios para criar sua conta, autenticar seu acesso, manter seu workspace ativo e oferecer os recursos financeiros do produto.',
      'Esses dados podem incluir nome, e-mail, dados de autentica\u00e7\u00e3o, prefer\u00eancias de uso e informa\u00e7\u00f5es financeiras que voc\u00ea registrar no sistema.',
    ],
    bullets: [
      'Dados cadastrais e de autentica\u00e7\u00e3o',
      'Informa\u00e7\u00f5es do workspace e do plano contratado',
      'Transa\u00e7\u00f5es, metas, d\u00edvidas, investimentos e demais registros inseridos por voc\u00ea',
      'Dados t\u00e9cnicos m\u00ednimos para seguran\u00e7a, desempenho e auditoria',
    ],
  },
  {
    title: '2. Como usamos seus dados',
    paragraphs: [
      'Usamos seus dados para operar o Cote Finance AI, autenticar seu acesso, processar assinatura, gerar relat\u00f3rios e disponibilizar funcionalidades de an\u00e1lise financeira e intelig\u00eancia artificial.',
      'Tamb\u00e9m utilizamos essas informa\u00e7\u00f5es para seguran\u00e7a, preven\u00e7\u00e3o de fraude, suporte, diagn\u00f3stico t\u00e9cnico e melhoria cont\u00ednua da plataforma.',
    ],
  },
  {
    title: '3. Compartilhamento de dados',
    paragraphs: [
      'N\u00e3o vendemos seus dados pessoais. O compartilhamento ocorre apenas quando necess\u00e1rio para viabilizar a opera\u00e7\u00e3o do produto, como autentica\u00e7\u00e3o, infraestrutura, cobran\u00e7a, envio de e-mails e integra\u00e7\u00f5es solicitadas por voc\u00ea.',
      'Prestadores terceirizados acessam apenas o m\u00ednimo necess\u00e1rio para executar o servi\u00e7o contratado e devem seguir padr\u00f5es adequados de seguran\u00e7a e confidencialidade.',
    ],
  },
  {
    title: '4. Seguran\u00e7a e reten\u00e7\u00e3o',
    paragraphs: [
      'Adotamos medidas t\u00e9cnicas e organizacionais razo\u00e1veis para proteger sua conta e seus dados contra acesso n\u00e3o autorizado, altera\u00e7\u00e3o indevida, perda e uso abusivo.',
      'Mantemos os dados pelo tempo necess\u00e1rio para operar a conta, cumprir obriga\u00e7\u00f5es legais, resolver disputas e preservar a integridade do hist\u00f3rico do workspace.',
    ],
  },
  {
    title: '5. Seus direitos',
    paragraphs: [
      'Voc\u00ea pode solicitar atualiza\u00e7\u00e3o de dados cadastrais, exclus\u00e3o da conta, esclarecimentos sobre tratamento de dados e informa\u00e7\u00f5es sobre armazenamento e processamento.',
      'Solicita\u00e7\u00f5es relacionadas \u00e0 privacidade podem ser feitas pelos canais oficiais de contato do Cote Finance AI.',
    ],
  },
];

export default function PoliticaDePrivacidadePage() {
  return (
    <LegalPage
      eyebrow="Privacidade"
      title="Pol\u00edtica de Privacidade"
      description="Esta pol\u00edtica explica como o Cote Finance AI trata seus dados para operar o produto com seguran\u00e7a, manter sua conta ativa e entregar os recursos financeiros e de intelig\u00eancia artificial da plataforma."
      lastUpdated="7 de mar\u00e7o de 2026"
      sections={sections}
    />
  );
}
