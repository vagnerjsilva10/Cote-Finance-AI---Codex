export type WorkspacePlan = 'FREE' | 'PRO' | 'PREMIUM';

export const PLAN_LIMITS: Record<
  WorkspacePlan,
  { transactionsPerMonth: number | null; aiInteractionsPerMonth: number | null; reports: 'basic' | 'full' }
> = {
  FREE: {
    transactionsPerMonth: 10,
    aiInteractionsPerMonth: 10,
    reports: 'basic',
  },
  PRO: {
    transactionsPerMonth: null,
    aiInteractionsPerMonth: 500,
    reports: 'full',
  },
  PREMIUM: {
    transactionsPerMonth: null,
    aiInteractionsPerMonth: null,
    reports: 'full',
  },
};
