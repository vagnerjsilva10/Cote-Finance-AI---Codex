import * as React from 'react';
import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { TrackingProvider } from '@/components/tracking/tracking-provider';
import './globals.css';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'Cote Finance AI | Seu Assistente Financeiro Inteligente',
  description: 'Organize, analise, preveja e acompanhe suas finanças com clareza no Cote Finance AI.',
  icons: {
    icon: [{ url: '/brand/cote-favicon.svg', type: 'image/svg+xml' }],
    shortcut: ['/brand/cote-favicon.svg'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
      </head>
      <body className={`${plusJakartaSans.variable} font-sans antialiased custom-scrollbar`} suppressHydrationWarning>
        <React.Suspense fallback={null}>
          <TrackingProvider />
        </React.Suspense>
        {children}
      </body>
    </html>
  );
}
