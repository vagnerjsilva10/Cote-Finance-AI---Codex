import { z } from 'zod';

export const AssistantIntentSchema = z.enum([
  'create_expense',
  'create_income',
  'create_goal',
  'contribute_goal',
  'create_investment',
  'create_debt',
  'pay_debt',
  'query_summary',
  'set_reply_mode',
  'unknown',
]);

export const AssistantReplyModeSchema = z.enum(['text', 'audio', 'both', 'unchanged']);

const AssistantTransactionPayloadSchema = z.object({
  amount: z.number().positive().nullable().optional(),
  currency: z.string().trim().default('BRL'),
  description: z.string().trim().nullable().optional(),
  merchant: z.string().trim().nullable().optional(),
  categoryHint: z.string().trim().nullable().optional(),
  walletHint: z.string().trim().nullable().optional(),
  date: z.string().trim().nullable().optional(),
  notes: z.string().trim().nullable().optional(),
});

const AssistantGoalPayloadSchema = z.object({
  name: z.string().trim().nullable().optional(),
  targetAmount: z.number().positive().nullable().optional(),
  contributionAmount: z.number().positive().nullable().optional(),
  deadlineHint: z.string().trim().nullable().optional(),
});

const AssistantInvestmentPayloadSchema = z.object({
  name: z.string().trim().nullable().optional(),
  amount: z.number().positive().nullable().optional(),
  typeHint: z.string().trim().nullable().optional(),
  institutionHint: z.string().trim().nullable().optional(),
  expectedReturnAnnual: z.number().min(0).nullable().optional(),
});

const AssistantDebtPayloadSchema = z.object({
  creditor: z.string().trim().nullable().optional(),
  amount: z.number().positive().nullable().optional(),
  dueDateHint: z.string().trim().nullable().optional(),
  dueDay: z.number().int().min(1).max(31).nullable().optional(),
  categoryHint: z.string().trim().nullable().optional(),
});

const AssistantQueryPayloadSchema = z.object({
  metric: z
    .enum([
      'category_spend_month',
      'goal_remaining',
      'investment_total',
      'monthly_summary',
      'debt_total',
      'unknown',
    ])
    .default('unknown'),
  categoryHint: z.string().trim().nullable().optional(),
  goalHint: z.string().trim().nullable().optional(),
  periodHint: z.string().trim().nullable().optional(),
});

export const ParsedFinancialIntentSchema = z.object({
  intent: AssistantIntentSchema,
  confidence: z.number().min(0).max(1).default(0.5),
  needsConfirmation: z.boolean().default(false),
  replyModeRequested: AssistantReplyModeSchema.default('unchanged'),
  transaction: AssistantTransactionPayloadSchema.nullable().optional(),
  goal: AssistantGoalPayloadSchema.nullable().optional(),
  investment: AssistantInvestmentPayloadSchema.nullable().optional(),
  debt: AssistantDebtPayloadSchema.nullable().optional(),
  query: AssistantQueryPayloadSchema.nullable().optional(),
});

export type AssistantIntent = z.infer<typeof AssistantIntentSchema>;
export type AssistantReplyMode = z.infer<typeof AssistantReplyModeSchema>;
export type ParsedFinancialIntent = z.infer<typeof ParsedFinancialIntentSchema>;

