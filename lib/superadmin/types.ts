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
    suspendedUsers: number;
    blockedUsers: number;
    suspendedWorkspaces: number;
    subscriptionsWithNotes: number;
    adminActionsLast30Days: number;
  };
  conversion: {
    proRate: number;
    premiumRate: number;
  };
  alerts: Array<{
    id: string;
    tone: 'info' | 'warning' | 'danger';
    title: string;
    description: string;
    href: string | null;
  }>;
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
  lifecycleStatus: 'ACTIVE' | 'SUSPENDED' | 'BLOCKED';
  lifecycleReason: string | null;
  platformRole: string;
  platformRoleSource: 'env' | 'override' | 'default';
  whatsappConnected: boolean;
  aiUsageLast30Days: number;
};

export type SuperadminUsersResponse = {
  query: string;
  total: number;
  capabilities: {
    authAdminConfigured: boolean;
  };
  users: SuperadminUserSummary[];
};

export type SuperadminUserDetailResponse = {
  capabilities: {
    authAdminConfigured: boolean;
  };
  user: {
    id: string;
    name: string | null;
    email: string;
    createdAt: string;
    updatedAt: string;
    lifecycleStatus: 'ACTIVE' | 'SUSPENDED' | 'BLOCKED';
    lifecycleReason: string | null;
    platformRole: string;
    platformRoleSource: 'env' | 'override' | 'default';
    profilePlan: string;
    userPlan: string;
    workspacePlan: string | null;
    effectiveAppPlan: string;
    effectiveWorkspaceId: string | null;
    effectiveWorkspaceName: string | null;
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
  supportLink?: {
    type: 'magiclink' | 'recovery';
    url: string;
  } | null;
  user: {
    id: string;
    name: string | null;
    email: string;
    profilePlan: string;
    userPlan: string;
    workspacePlan: string | null;
    effectiveAppPlan: string;
    effectiveWorkspaceId: string | null;
    effectiveWorkspaceName: string | null;
    lifecycleStatus: 'ACTIVE' | 'SUSPENDED' | 'BLOCKED';
    lifecycleReason: string | null;
    platformRoleSource: 'env' | 'override' | 'default';
    entitlement: {
      plan: string;
      status: string;
      currentPeriodEnd: string | null;
    };
    platformRole: string;
  };
};

export type SuperadminUserCreateResponse = {
  ok: boolean;
  createdUser: {
    id: string;
    email: string;
    name: string | null;
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
  lifecycleStatus: 'ACTIVE' | 'SUSPENDED';
  lifecycleReason: string | null;
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
    lifecycleStatus: 'ACTIVE' | 'SUSPENDED';
    lifecycleReason: string | null;
    plan: string;
    workspacePlan: string;
    ownerUserPlan: string | null;
    effectiveAppPlan: string;
    subscriptionStatus: string | null;
    currentPeriodEnd: string | null;
    owner: {
      userId: string;
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
    monthlyUsage: {
      transactionsActual: number;
      transactionsEffective: number;
      transactionResetReason: string | null;
      aiActual: number;
      aiEffective: number;
      aiResetReason: string | null;
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
  monthlyUsage?: {
    transactionsActual: number;
    transactionsEffective: number;
    transactionResetReason: string | null;
    aiActual: number;
    aiEffective: number;
    aiResetReason: string | null;
  };
  workspace: {
    id: string;
    name: string;
    whatsappStatus: string | null;
    whatsappPhoneNumber: string | null;
    lifecycleStatus: 'ACTIVE' | 'SUSPENDED';
    lifecycleReason: string | null;
    ownerUserId: string | null;
    preference: {
      onboardingCompleted: boolean;
      aiSuggestionsEnabled: boolean;
      objective: string | null;
      financialProfile: string | null;
    };
  };
};

export type SuperadminPlanConfig = {
  code: 'FREE' | 'PRO' | 'PREMIUM';
  name: string;
  active: boolean;
  visible: boolean;
  default: boolean;
  sortOrder: number;
  monthlyPrice: number;
  annualPrice: number;
  trialDays: number;
  description: string;
  features: string[];
  trustBadges: string[];
  limits: {
    transactionsPerMonth: number | null;
    aiInteractionsPerMonth: number | null;
    reports: 'basic' | 'full';
  };
};

export type SuperadminPlansResponse = {
  plans: SuperadminPlanConfig[];
  summary: {
    total: number;
    active: number;
    visible: number;
    defaultPlan: 'FREE' | 'PRO' | 'PREMIUM';
  };
};

export type SuperadminPlansUpdateResponse = {
  ok: boolean;
  plans: SuperadminPlanConfig[];
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
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  adminNote: string | null;
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
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
    adminNote: string | null;
  };
};

export type SuperadminFeatureFlagRecord = {
  key: string;
  label: string;
  description: string;
  scope: string;
  enabled: boolean;
  allowedPlans: Array<'FREE' | 'PRO' | 'PREMIUM'>;
};

export type SuperadminFeatureFlagsResponse = {
  flags: SuperadminFeatureFlagRecord[];
  summary: {
    total: number;
    enabled: number;
    disabled: number;
    workspaceOverrides: number;
    userOverrides: number;
  };
  workspaceOverrides: Array<{
    flagKey: string;
    flagLabel: string;
    workspaceId: string;
    workspaceName: string;
    enabled: boolean;
    reason: string | null;
    updatedAt: string;
  }>;
  userOverrides: Array<{
    flagKey: string;
    flagLabel: string;
    userId: string;
    userName: string | null;
    userEmail: string;
    enabled: boolean;
    reason: string | null;
    updatedAt: string;
  }>;
  search: {
    workspaceQuery: string;
    userQuery: string;
    workspaces: Array<{
      id: string;
      name: string;
      plan: 'FREE' | 'PRO' | 'PREMIUM';
    }>;
    users: Array<{
      id: string;
      name: string | null;
      email: string;
      plan: 'FREE' | 'PRO' | 'PREMIUM';
    }>;
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
    admin: number;
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
  resetOffset: number;
  resetReason: string | null;
  effectiveUsage: number;
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

export type SuperadminAiResetResponse = {
  ok: boolean;
  workspaceId: string;
  effectiveUsage: number;
  resetOffset: number;
  resetReason: string | null;
};

export type SuperadminWhatsappWorkspaceRecord = {
  workspaceId: string;
  workspaceName: string;
  ownerName: string | null;
  ownerEmail: string | null;
  plan: string;
  whatsappStatus: string | null;
  phoneNumber: string | null;
  testPhoneNumber: string | null;
  lastConnectionState:
    | 'idle'
    | 'connecting'
    | 'connected'
    | 'disconnected'
    | 'failed'
    | 'error'
    | 'testing'
    | 'config_pending';
  lastErrorMessage: string | null;
  lastErrorCategory: string | null;
  lastValidatedAt: string | null;
  lastTestSentAt: string | null;
  updatedAt: string | null;
  readiness: {
    ready: boolean;
    issues: string[];
    connectTemplateConfigured: boolean;
    digestTemplateConfigured: boolean;
    workspacePhoneConfigured: boolean;
    testDestinationConfigured: boolean;
    templateLanguage: string | null;
  };
  activity: {
    lastInboundAt: string | null;
    lastOperationalAt: string | null;
    lastOperationalType: string | null;
    lastAiAt: string | null;
    lastAiMode: string | null;
    inboundLast24h: number;
    transactionsLast24h: number;
    alertsLast24h: number;
    aiLast24h: number;
  };
};

export type SuperadminWhatsappResponse = {
  query: string;
  environment: {
    ready: boolean;
    accessTokenConfigured: boolean;
    phoneNumberIdConfigured: boolean;
    verifyTokenConfigured: boolean;
    appSecretConfigured: boolean;
    apiVersionConfigured: boolean;
  };
  summary: {
    total: number;
    connected: number;
    withErrors: number;
    pendingConfig: number;
    messagesLast30Days: number;
    transactionsViaWhatsappLast30Days: number;
    transactionsEditedViaWhatsappLast30Days: number;
    transactionsRemovedViaWhatsappLast30Days: number;
    aiViaWhatsappLast30Days: number;
    aiViaWhatsappGeminiLast30Days: number;
    aiViaWhatsappDeterministicLast30Days: number;
    alertsSentLast30Days: number;
    overdueGoalAlertsLast30Days: number;
    recurringHeavyAlertsLast30Days: number;
  };
  recentEvents: Array<{
    id: string;
    workspaceId: string;
    workspaceName: string;
    type: string;
    createdAt: string;
    userEmail: string | null;
    aiMode: string | null;
  }>;
  workspaces: SuperadminWhatsappWorkspaceRecord[];
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




