export type WorkspacePlan = 'FREE' | 'PRO' | 'PREMIUM';

export const PLAN_LIMITS: Record<
  WorkspacePlan,
  { transactionsPerMonth: number | null; aiInteractionsPerMonth: number | null; reports: 'basic' | 'full' }
> = {
  FREE: {
    transactionsPerMonth: 15,
    aiInteractionsPerMonth: 15,
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
