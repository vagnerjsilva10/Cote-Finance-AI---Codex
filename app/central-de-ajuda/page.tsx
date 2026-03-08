import type { Metadata } from 'next';
import { HelpCenterExperience } from '@/components/help/help-center-experience';
import { absoluteUrl } from '@/lib/blog/seo';

export const metadata: Metadata = {
  title: 'Central de Ajuda | Cote Finance AI',
  description:
    'Encontre respostas r�pidas sobre conta, gastos, assinatura, pagamentos e como usar o Cote Finance AI no dia a dia.',
  alternates: {
    canonical: absoluteUrl('/central-de-ajuda'),
  },
  openGraph: {
    title: 'Central de Ajuda | Cote Finance AI',
    description:
      'Encontre respostas r�pidas sobre conta, gastos, assinatura, pagamentos e como usar o Cote Finance AI no dia a dia.',
    url: absoluteUrl('/central-de-ajuda'),
    siteName: 'Cote Finance AI',
    type: 'website',
    images: [
      {
        url: absoluteUrl('/brand/cote-finance-ai-logo.png'),
        width: 2400,
        height: 640,
        alt: 'Central de Ajuda do Cote Finance AI',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Central de Ajuda | Cote Finance AI',
    description:
      'Encontre respostas r�pidas sobre conta, gastos, assinatura, pagamentos e como usar o Cote Finance AI no dia a dia.',
    images: [absoluteUrl('/brand/cote-finance-ai-logo.png')],
  },
};

export default function HelpCenterPage() {
  return <HelpCenterExperience />;
}
