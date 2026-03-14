export type SuperadminNavigationItem = {
  label: string;
  href: string;
  icon: string;
  description: string;
  implemented: boolean;
};

export const SUPERADMIN_NAVIGATION: SuperadminNavigationItem[] = [
  {
    label: 'Visão Geral',
    href: '/superadmin',
    icon: 'layout-dashboard',
    description: 'KPIs, atividade recente e visão operacional da plataforma.',
    implemented: true,
  },
  {
    label: 'Usuários',
    href: '/superadmin/users',
    icon: 'users',
    description: 'Gestão de contas, planos, acesso e atividade.',
    implemented: true,
  },
  {
    label: 'Workspaces',
    href: '/superadmin/workspaces',
    icon: 'building-2',
    description: 'Gestão de workspaces, owners, status e limites.',
    implemented: true,
  },
  {
    label: 'Planos',
    href: '/superadmin/plans',
    icon: 'badge-dollar-sign',
    description: 'Catálogo comercial, benefícios e política de planos.',
    implemented: false,
  },
  {
    label: 'Assinaturas',
    href: '/superadmin/subscriptions',
    icon: 'credit-card',
    description: 'Operação de billing, status e ações manuais.',
    implemented: false,
  },
  {
    label: 'Recursos / Feature Flags',
    href: '/superadmin/feature-flags',
    icon: 'toggle-left',
    description: 'Ativação controlada de recursos por ambiente e conta.',
    implemented: false,
  },
  {
    label: 'IA',
    href: '/superadmin/ai',
    icon: 'sparkles',
    description: 'Uso, limites, falhas e monitoramento dos fluxos de IA.',
    implemented: false,
  },
  {
    label: 'WhatsApp',
    href: '/superadmin/whatsapp',
    icon: 'message-circle-more',
    description: 'Monitoramento de integrações, templates e entregabilidade.',
    implemented: false,
  },
  {
    label: 'Conteúdo',
    href: '/superadmin/content',
    icon: 'file-text',
    description: 'Gestão futura de pricing, FAQs, CTAs e textos estratégicos.',
    implemented: false,
  },
  {
    label: 'Tracking / Marketing',
    href: '/superadmin/global-settings',
    icon: 'settings-2',
    description: 'Pixel da Meta, captura de UTM, CAPI e configurações de conversão.',
    implemented: true,
  },
  {
    label: 'Relatórios',
    href: '/superadmin/reports',
    icon: 'bar-chart-3',
    description: 'Relatórios operacionais e executivos da plataforma.',
    implemented: false,
  },
  {
    label: 'Logs / Auditoria',
    href: '/superadmin/audit-logs',
    icon: 'shield-check',
    description: 'Rastreabilidade administrativa e eventos críticos.',
    implemented: false,
  },
];

