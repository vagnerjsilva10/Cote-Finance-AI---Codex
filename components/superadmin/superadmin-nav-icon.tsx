'use client';

import {
  BadgeDollarSign,
  BarChart3,
  Building2,
  CreditCard,
  FileText,
  LayoutDashboard,
  MessageCircleMore,
  Settings2,
  ShieldCheck,
  Sparkles,
  ToggleLeft,
  Users,
} from 'lucide-react';

const ICONS = {
  'badge-dollar-sign': BadgeDollarSign,
  'bar-chart-3': BarChart3,
  'building-2': Building2,
  'credit-card': CreditCard,
  'file-text': FileText,
  'layout-dashboard': LayoutDashboard,
  'message-circle-more': MessageCircleMore,
  'settings-2': Settings2,
  'shield-check': ShieldCheck,
  sparkles: Sparkles,
  'toggle-left': ToggleLeft,
  users: Users,
} as const;

export function SuperadminNavIcon({ name, className = 'h-4 w-4' }: { name: string; className?: string }) {
  const Icon = ICONS[name as keyof typeof ICONS] || LayoutDashboard;
  return <Icon className={className} />;
}

