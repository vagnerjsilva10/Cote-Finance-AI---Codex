import type {
  SuperadminUserSummary,
  SuperadminWorkspaceSummary,
} from '@/lib/superadmin/types';

export function formatAdminCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}

export function formatAdminNumber(value: number) {
  return new Intl.NumberFormat('pt-BR').format(Number.isFinite(value) ? value : 0);
}

export function formatAdminPercent(value: number) {
  return `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(value)}%`;
}

export function formatAdminDate(value: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

export function formatAdminDateTime(value: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatPlatformRole(role: string) {
  switch (role) {
    case 'superadmin':
      return 'Super Admin';
    case 'admin':
      return 'Admin';
    default:
      return 'Usuário';
  }
}

export function formatPlanLabel(plan: string) {
  switch (plan) {
    case 'PREMIUM':
      return 'Premium';
    case 'PRO':
      return 'Pro';
    case 'FREE':
      return 'Free';
    default:
      return plan || '—';
  }
}

export function formatSubscriptionStatus(status: string | null) {
  if (!status) return 'Sem assinatura';

  switch (status.toUpperCase()) {
    case 'ACTIVE':
      return 'Ativa';
    case 'TRIALING':
      return 'Trial';
    case 'PAST_DUE':
      return 'Pagamento pendente';
    case 'UNPAID':
      return 'Não paga';
    case 'CANCELED':
      return 'Cancelada';
    case 'INCOMPLETE':
      return 'Incompleta';
    default:
      return status;
  }
}

export function getSubscriptionTone(status: string | null) {
  if (!status) return 'border-slate-700/70 bg-slate-900/70 text-slate-300';

  switch (status.toUpperCase()) {
    case 'ACTIVE':
    case 'TRIALING':
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
    case 'PAST_DUE':
    case 'INCOMPLETE':
      return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
    case 'CANCELED':
    case 'UNPAID':
      return 'border-rose-500/30 bg-rose-500/10 text-rose-300';
    default:
      return 'border-slate-700/70 bg-slate-900/70 text-slate-300';
  }
}

export function humanizeEventType(type: string) {
  const normalized = type.replace(/_/g, ' ').replace(/\./g, ' · ');
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

export function matchesUserQuery(user: SuperadminUserSummary, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;

  return [user.id, user.email, user.name || ''].some((value) => value.toLowerCase().includes(normalizedQuery));
}

export function matchesWorkspaceQuery(workspace: SuperadminWorkspaceSummary, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;

  return [workspace.id, workspace.name, workspace.ownerEmail || '', workspace.ownerName || ''].some((value) =>
    value.toLowerCase().includes(normalizedQuery)
  );
}
