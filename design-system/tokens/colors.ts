export const colors = {
  background: {
    primary: '#0B1220',
    secondary: '#0F172A',
    tertiary: '#111827',
    card: '#0F1B2D',
  },
  border: {
    default: '#1E293B',
    soft: '#1A2435',
  },
  text: {
    primary: '#F8FAFC',
    secondary: '#CBD5E1',
    muted: '#94A3B8',
  },
  accent: {
    base: '#3B82F6',
    hover: '#2563EB',
    soft: 'rgba(59, 130, 246, 0.16)',
  },
  success: {
    base: '#34D399',
    soft: '#065F46',
    bg: 'rgba(52, 211, 153, 0.14)',
  },
  danger: {
    base: '#F87171',
    soft: '#7F1D1D',
    bg: 'rgba(248, 113, 113, 0.14)',
  },
  warning: {
    base: '#F59E0B',
    soft: '#78350F',
    bg: 'rgba(245, 158, 11, 0.14)',
  },
  info: {
    base: '#22D3EE',
    soft: '#164E63',
    bg: 'rgba(34, 211, 238, 0.14)',
  },
  goal: {
    base: '#A78BFA',
    soft: '#4C1D95',
    bg: 'rgba(167, 139, 250, 0.14)',
  },
  neutral: {
    base: '#64748B',
    soft: '#334155',
    bg: 'rgba(100, 116, 139, 0.14)',
  },
} as const;

export const semanticColors = {
  balance: colors.accent.base,
  income: colors.success.base,
  expense: colors.danger.base,
  debt: colors.warning.base,
  goal: colors.goal.base,
  ai: colors.info.base,
  neutral: colors.neutral.base,
} as const;

