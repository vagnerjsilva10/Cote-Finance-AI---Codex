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
  platformRoleSource: 'env' | 'override' | 'default';
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
    platformRoleSource: 'env' | 'override' | 'default';
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

export type SuperadminUserUpdateResponse = {
  ok: boolean;
  user: {
    id: string;
    name: string | null;
    profilePlan: string;
    platformRoleSource: 'env' | 'override' | 'default';
    entitlement: {
      plan: string;
      status: string;
      currentPeriodEnd: string | null;
    };
    platformRole: string;
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

export type SuperadminWorkspaceUpdateResponse = {
  ok: boolean;
  workspace: {
    id: string;
    name: string;
    whatsappStatus: string | null;
    whatsappPhoneNumber: string | null;
    preference: {
      onboardingCompleted: boolean;
      aiSuggestionsEnabled: boolean;
      objective: string | null;
      financialProfile: string | null;
    };
  };
};

export type SuperadminTrackingSettingsResponse = {
  settings: import('@/lib/tracking/types').TrackingSettings;
  publicSettings: import('@/lib/tracking/types').PublicTrackingSettings;
  status: {
    pixelConfigured: boolean;
    utmCaptureActive: boolean;
    purchaseTrackingActive: boolean;
  };
};

export type SuperadminSubscriptionSummary = {
  workspaceId: string;
  workspaceName: string;
  ownerName: string | null;
  ownerEmail: string | null;
  plan: string;
  status: string;
  currentPeriodEnd: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  estimatedMrr: number;
  hasStripeCustomer: boolean;
  hasStripeSubscription: boolean;
};

export type SuperadminSubscriptionsResponse = {
  query: string;
  filters: {
    plan: string;
    status: string;
  };
  metrics: {
    total: number;
    active: number;
    pending: number;
    canceled: number;
    free: number;
    paying: number;
    pro: number;
    premium: number;
    estimatedMrr: number;
  };
  total: number;
  subscriptions: SuperadminSubscriptionSummary[];
};

export type SuperadminSubscriptionUpdateResponse = {
  ok: boolean;
  subscription: {
    workspaceId: string;
    plan: string;
    status: string;
    currentPeriodEnd: string | null;
    estimatedMrr: number;
  };
};

export type SuperadminFeatureFlagRecord = {
  key: string;
  label: string;
  description: string;
  scope: string;
  enabled: boolean;
};

export type SuperadminFeatureFlagsResponse = {
  flags: SuperadminFeatureFlagRecord[];
  summary: {
    total: number;
    enabled: number;
    disabled: number;
  };
};

export type SuperadminAuditLogEvent = {
  id: string;
  type: string;
  category: string;
  createdAt: string | null;
  workspaceId: string;
  workspaceName: string;
  userId: string | null;
  userEmail: string | null;
  userName: string | null;
  payload: unknown;
};

export type SuperadminAuditLogsResponse = {
  query: string;
  filters: {
    category: string;
  };
  summary: {
    total: number;
    billing: number;
    tracking: number;
    whatsapp: number;
    ai: number;
    produto: number;
    geral: number;
  };
  total: number;
  events: SuperadminAuditLogEvent[];
};

export type SuperadminAiWorkspaceUsageSummary = {
  workspaceId: string;
  workspaceName: string;
  ownerName: string | null;
  ownerEmail: string | null;
  plan: string;
  currentMonthUsage: number;
  chatUsage: number;
  classifyUsage: number;
  limit: number | null;
  usageRate: number | null;
  nearLimit: boolean;
  aiSuggestionsEnabled: boolean;
  lastAiEventAt: string | null;
};

export type SuperadminAiRecentEvent = {
  id: string;
  type: string;
  typeLabel: string;
  createdAt: string | null;
  workspaceId: string;
  workspaceName: string;
  userId: string | null;
  userEmail: string | null;
  userName: string | null;
  payload: unknown;
};

export type SuperadminAiResponse = {
  query: string;
  filters: {
    plan: string;
  };
  summary: {
    totalWorkspaces: number;
    activeWorkspaces: number;
    totalInteractionsThisMonth: number;
    chatInteractionsThisMonth: number;
    classifyInteractionsThisMonth: number;
    workspacesNearLimit: number;
    aiSuggestionsEnabled: number;
    averageUsagePerActiveWorkspace: number;
    geminiConfigured: boolean;
  };
  quotaReference: Record<
    string,
    {
      aiInteractionsPerMonth: number | null;
    }
  >;
  trend: Array<{
    date: string;
    total: number;
    chat: number;
    classify: number;
  }>;
  total: number;
  workspaces: SuperadminAiWorkspaceUsageSummary[];
  recentEvents: SuperadminAiRecentEvent[];
};

export type SuperadminWhatsappWorkspaceSummary = {
  workspaceId: string;
  workspaceName: string;
  ownerName: string | null;
  ownerEmail: string | null;
  plan: string;
  hasPlanAccess: boolean;
  whatsappStatus: string;
  whatsappPhoneNumber: string | null;
  whatsappConnectedAt: string | null;
  configUpdatedAt: string | null;
  lastEventAt: string | null;
};

export type SuperadminWhatsappRecentEvent = {
  id: string;
  type: string;
  typeLabel: string;
  category: string;
  createdAt: string | null;
  workspaceId: string;
  workspaceName: string;
  userId: string | null;
  userEmail: string | null;
  userName: string | null;
  payload: unknown;
};

export type SuperadminWhatsappResponse = {
  query: string;
  filters: {
    plan: string;
    status: string;
  };
  summary: {
    totalWorkspaces: number;
    eligibleWorkspaces: number;
    connectedWorkspaces: number;
    connectingWorkspaces: number;
    disconnectedWorkspaces: number;
    configUpdatesLast30Days: number;
    digestsSentLast30Days: number;
    previewTestsLast30Days: number;
  };
  environment: {
    apiConfigured: boolean;
    verifyConfigured: boolean;
    signatureValidationEnabled: boolean;
    connectTemplateConfigured: boolean;
    digestTemplateConfigured: boolean;
    templateLanguage: string;
    phoneNumberIdConfigured: boolean;
  };
  trend: Array<{
    date: string;
    total: number;
    config: number;
    delivery: number;
    connection: number;
  }>;
  total: number;
  workspaces: SuperadminWhatsappWorkspaceSummary[];
  recentEvents: SuperadminWhatsappRecentEvent[];
};

export type SuperadminReportsResponse = {
  summary: {
    totalUsers: number;
    totalWorkspaces: number;
    payingWorkspaces: number;
    estimatedMrr: number;
    newSignupsLast30Days: number;
    activeUsersLast30Days: number;
    aiUsageLast30Days: number;
    aiActiveWorkspacesLast30Days: number;
    whatsappConnectedWorkspaces: number;
    totalTransactions: number;
    transactionsLast30Days: number;
  };
  monthlyTrend: Array<{
    month: string;
    signups: number;
    newWorkspaces: number;
    aiEvents: number;
    transactions: number;
  }>;
  planMix: Array<{
    plan: string;
    workspaces: number;
    estimatedMrr: number;
  }>;
  funnel: {
    totalUsers: number;
    totalWorkspaces: number;
    payingWorkspaces: number;
    aiActiveWorkspacesLast30Days: number;
    whatsappConnectedWorkspaces: number;
  };
  operations: {
    ai: number;
    whatsapp: number;
    billing: number;
    tracking: number;
    product: number;
  };
};

export type SuperadminContentResponse = {
  config: {
    brand: {
      productName: string;
      signature: string;
      supportEmail: string;
      privacyUrl: string;
      termsUrl: string;
    };
    acquisition: {
      defaultPrimaryCta: string;
      defaultSecondaryCta: string;
      riskReversal: string;
      trustLine: string;
    };
    pricing: {
      freeDescription: string;
      proDescription: string;
      premiumDescription: string;
    };
    editorial: {
      voiceAndTone: string;
      priorityMessage: string;
      currentFocus: string;
    };
  };
  surfaces: Array<{
    key: string;
    label: string;
    route: string;
    file: string;
    status: string;
    objective: string;
    notes: string;
  }>;
  summary: {
    surfaces: number;
    activeSurfaces: number;
    primaryCta: string;
    supportEmail: string;
  };
};
