import type { Metadata } from 'next';
import { LegalPage } from '@/app/_shared/legal-page';

export const metadata: Metadata = {
  title: 'Política de Cookies | Cote Finance AI',
  description: 'Entenda como usamos cookies para segurança, desempenho e melhoria da experiência no Cote Finance AI.',
};

const sections = [
  {
    title: '1. O que são cookies',
    paragraphs: [
      'Cookies são pequenos arquivos armazenados no seu navegador para lembrar preferências, manter sessões ativas e melhorar a navegação.',
      'No Cote Finance AI, eles ajudam a manter o acesso seguro, reduzir fricção no uso e melhorar a estabilidade da plataforma.',
    ],
  },
  {
    title: '2. Como usamos cookies',
    paragraphs: [
      'Utilizamos cookies essenciais para autenticação, proteção de sessão, funcionamento de recursos principais e prevenção de abuso.',
      'Também podemos usar cookies de desempenho e mensuração para entender o uso da plataforma e evoluir a experiência com base em dados agregados.',
    ],
    bullets: [
      'Cookies essenciais de autenticação e sessão',
      'Cookies de segurança e prevenção de fraude',
      'Cookies de preferência e experiência',
      'Cookies de análise e desempenho',
    ],
  },
  {
    title: '3. Gestão de cookies',
    paragraphs: [
      'Você pode revisar, bloquear ou remover cookies nas configurações do navegador a qualquer momento.',
      'Ao desativar cookies essenciais, algumas funcionalidades podem deixar de funcionar corretamente, incluindo login, navegação autenticada e persistência de sessão.',
    ],
  },
  {
    title: '4. Atualizações desta política',
    paragraphs: [
      'Esta política pode ser atualizada para refletir mudanças legais, técnicas ou de produto.',
      'A versão mais recente será sempre publicada nesta página com a data de atualização.',
    ],
  },
];

export default function CookiesPolicyPage() {
  return (
    <LegalPage
      eyebrow="Cookies"
      title="Política de Cookies"
      description="Esta política explica quais cookies usamos no Cote Finance AI, por que eles são necessários e como você pode gerenciá-los."
      lastUpdated="31 de março de 2026"
      sections={sections}
      currentPage="cookies"
    />
  );
}
