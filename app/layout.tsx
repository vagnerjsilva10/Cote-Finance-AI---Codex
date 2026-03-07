import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'Cote Finance AI | Seu Assistente Financeiro Inteligente',
  description: 'Organize, analise, preveja e oriente automaticamente suas finanças com o Cote Finance AI.',
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
    <html lang="pt-BR" className="dark">
      <body
        className={`${inter.variable} font-sans antialiased bg-slate-950 text-slate-50 custom-scrollbar`}
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
