import { colors } from '@/design-system/tokens/colors';

export const chartColors = {
  income: colors.success.base,
  expense: colors.danger.base,
  balance: colors.accent.base,
  goal: colors.goal.base,
  info: colors.info.base,
  projection: colors.warning.base,
} as const;