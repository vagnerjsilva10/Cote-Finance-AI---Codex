import type { PlatformAccess } from '@/lib/server/platform-access';
import type { SuperadminNavigationItem } from '@/lib/superadmin/navigation';

export type SuperadminBootstrapResponse = {
  access: PlatformAccess;
  navigation: SuperadminNavigationItem[];
};

export type SuperadminOverviewResponse = {
  metrics: {
    totalUsers: number;
    totalWorkspaces: number;
    activeUsers: number;
    newSignupsLast30Days: number;
    activeTrials: number | null;
    payingWorkspaces: number;
    proWorkspaces: number;
    premiumWorkspaces: number;
    canceledWorkspaces: number;
    estimatedMrr: number;
    aiUsageLast30Days: number;
    whatsappConnectedWorkspaces: number;
    totalTransactions: number;
    totalWallets: number;
    totalInvestments: number;
    totalDebts: number;
    errorEventsLast30Days: number;
  };
  conversion: {
    proRate: number;
    premiumRate: number;
  };
  recentEvents: Array<{
    id: string;
    type: string;
    createdAt: string;
    workspaceName: string;
    userEmail: string | null;
  }>;
  notes: {
    trialsTracked: boolean;
    churnTracked: boolean;
  };
  limitsReference: Record<
    string,
    {
      transactionsPerMonth: number | null;
      aiInteractionsPerMonth: number | null;
      reports: 'basic' | 'full';
    }
  >;
};

export type SuperadminUserSummary = {
  id: string;
  name: string | null;
  email: string;
  createdAt: string;
  lastAccessAt: string | null;
  workspaceCount: number;
  currentPlan: string;
  subscriptionStatus: string | null;
  platformRole: string;
  whatsappConnected: boolean;
  aiUsageLast30Days: number;
};

export type SuperadminUsersResponse = {
  query: string;
  total: number;
  users: SuperadminUserSummary[];
};

export type SuperadminUserDetailResponse = {
  user: {
    id: string;
    name: string | null;
    email: string;
    createdAt: string;
    updatedAt: string;
    platformRole: string;
    profilePlan: string;
    lastAccessAt: string | null;
    subscription: {
      plan: string;
      status: string;
      currentPeriodEnd: string | null;
    } | null;
    workspaces: Array<{
      id: string;
      name: string;
      role: string;
      plan: string;
      subscriptionStatus: string | null;
      whatsappStatus: string | null;
    }>;
    usage: {
      aiUsageLast30Days: number;
      eventsLast30Days: number;
    };
    recentEvents: Array<{
      id: string;
      type: string;
      createdAt: string;
      workspaceName: string;
    }>;
  };
};

export type SuperadminWorkspaceSummary = {
  id: string;
  name: string;
  createdAt: string;
  ownerName: string | null;
  ownerEmail: string | null;
  memberCount: number;
  plan: string;
  subscriptionStatus: string | null;
  whatsappStatus: string | null;
  transactionsCount: number;
  walletsCount: number;
  investmentsCount: number;
  debtsCount: number;
};

export type SuperadminWorkspacesResponse = {
  query: string;
  total: number;
  workspaces: SuperadminWorkspaceSummary[];
};

export type SuperadminWorkspaceDetailResponse = {
  workspace: {
    id: string;
    name: string;
    createdAt: string;
    updatedAt: string;
    whatsappStatus: string | null;
    whatsappPhoneNumber: string | null;
    plan: string;
    subscriptionStatus: string | null;
    currentPeriodEnd: string | null;
    owner: {
      name: string | null;
      email: string | null;
    } | null;
    members: Array<{
      id: string;
      userId: string;
      name: string | null;
      email: string;
      role: string;
    }>;
    resourceCounts: {
      wallets: number;
      transactions: number;
      goals: number;
      debts: number;
      investments: number;
      events: number;
    };
    limits: {
      transactionsPerMonth: number | null;
      aiInteractionsPerMonth: number | null;
      reports: 'basic' | 'full';
    };
    preference: {
      onboardingCompleted: boolean;
      objective: string | null;
      financialProfile: string | null;
      aiSuggestionsEnabled: boolean;
    } | null;
    recentEvents: Array<{
      id: string;
      type: string;
      createdAt: string;
      userEmail: string | null;
    }>;
  };
};
