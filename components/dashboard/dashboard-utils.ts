import { type DashboardOverviewUpcomingEvent } from '@/lib/dashboard/overview';

export const formatCurrency = (value: number) =>
  value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

export const formatDateShort = (value?: string | null) => {
  if (!value) return '--';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '--';
  return parsed.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: '2-digit',
  });
};

export const mapUpcomingStatusLabel = (status: string) => {
  const normalized = String(status || '').toUpperCase();
  if (normalized === 'OVERDUE') return 'Atrasado';
  if (normalized === 'PAID') return 'Pago';
  if (normalized === 'RECEIVED') return 'Recebido';
  if (normalized === 'CANCELED' || normalized === 'CANCELLED') return 'Cancelado';
  return 'Pendente';
};

export const getUpcomingFlowLabel = (flow: DashboardOverviewUpcomingEvent['flow']) => {
  if (flow === 'in') return 'Entrada';
  if (flow === 'out') return 'Saída';
  return 'Neutro';
};

export const extractInsightMetric = (text: string): string | null => {
  const currencyMatch = text.match(/R\$\s?\d{1,3}(?:\.\d{3})*(?:,\d{2})?/);
  if (currencyMatch) return currencyMatch[0];

  const percentMatch = text.match(/\d+(?:[.,]\d+)?%/);
  if (percentMatch) return percentMatch[0];

  const daysMatch = text.match(/\d+\s+dias?/i);
  if (daysMatch) return daysMatch[0];

  return null;
};

export const getInsightActionHint = (insight: string) => {
  const normalized = insight.toLowerCase();
  if (normalized.includes('gasto') || normalized.includes('despesa')) {
    return 'Ação sugerida: acompanhe esta categoria de perto nos próximos dias.';
  }
  if (normalized.includes('receita')) {
    return 'Ação sugerida: use esse ganho para reforçar reserva ou metas prioritárias.';
  }
  if (normalized.includes('saldo negativo')) {
    return 'Ação sugerida: antecipe ajustes de caixa antes da data crítica.';
  }
  return 'Ação sugerida: mantenha o acompanhamento semanal para validar a tendência.';
};
