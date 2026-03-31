import { type ParsedFinancialIntent } from '@/lib/ai/schemas/financial-intent.schema';

function hasAmbiguousAmount(intent: ParsedFinancialIntent) {
  const txAmount = intent.transaction?.amount;
  const goalTarget = intent.goal?.targetAmount;
  const goalContribution = intent.goal?.contributionAmount;
  const debtAmount = intent.debt?.amount;
  const investmentAmount = intent.investment?.amount;

  return [txAmount, goalTarget, goalContribution, debtAmount, investmentAmount].every(
    (value) => value === null || typeof value === 'undefined'
  );
}

export function shouldRequireConfirmation(intent: ParsedFinancialIntent) {
  if (intent.needsConfirmation) return true;
  if (intent.confidence < 0.62) return true;

  if (
    intent.intent === 'create_expense' ||
    intent.intent === 'create_income' ||
    intent.intent === 'create_goal' ||
    intent.intent === 'contribute_goal' ||
    intent.intent === 'create_investment' ||
    intent.intent === 'create_debt' ||
    intent.intent === 'pay_debt'
  ) {
    if (hasAmbiguousAmount(intent)) return true;
  }

  if (intent.intent === 'unknown') return true;
  return false;
}

