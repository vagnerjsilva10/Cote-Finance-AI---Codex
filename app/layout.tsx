import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/components/theme/theme-provider';
import { ThemeScript } from '@/components/theme/theme-script';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'Cote Finance AI | Seu Assistente Financeiro Inteligente',
  description: 'Organize, analise, preveja e oriente automaticamente suas finan�as com o Cote Finance AI.',
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
        <ThemeScript />
      </head>
      <body
        className={`${inter.variable} bg-slate-950 font-sans text-slate-50 antialiased custom-scrollbar`}
        suppressHydrationWarning
      >
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
