export type WorkspaceShellPayload = {
  activeWorkspaceId: string;
  plan: string;
  limits: {
    reports: 'basic' | 'full';
    transactionsPerMonth: number | null;
    aiInteractionsPerMonth: number | null;
  };
  currentMonthTransactionCount: number;
  currentMonthAiUsage: number;
  workspaces: Array<{
    id: string;
    name: string;
    role: string;
  }>;
  onboarding: {
    completed: boolean;
    dismissed: boolean;
    shouldShow: boolean;
    objective: string | null;
    financialProfile: string | null;
    aiSuggestionsEnabled: boolean;
  };
  workspace: {
    id: string;
    name: string;
    whatsapp_status: string | null;
    whatsapp_phone_number: string | null;
    whatsapp_last_connection_state: string | null;
    whatsapp_last_validated_at: string | null;
    whatsapp_last_test_sent_at: string | null;
    whatsapp_last_error_message: string | null;
  } | null;
  wallets: Array<{
    id: string;
    name: string;
    balance: number;
  }>;
  recentEvents: Array<{
    id: string;
    type: string;
    created_at: string;
    user_id: string | null;
    payload: Record<string, unknown> | null;
  }>;
  transactions?: any[];
  goals?: any[];
  investments?: any[];
  debts?: any[];
  recurringDebts?: any[];
};
