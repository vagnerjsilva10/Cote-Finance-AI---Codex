import type { Metadata } from 'next';

import { SuperadminShell } from '@/components/superadmin/superadmin-shell';

export const metadata: Metadata = {
  title: 'Super Admin | Cote Finance AI',
  description: 'Painel administrativo da plataforma Cote Finance AI.',
};

export default function SuperadminLayout({ children }: { children: React.ReactNode }) {
  return <SuperadminShell>{children}</SuperadminShell>;
}
