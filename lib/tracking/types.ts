export type TrackingSettings = {
  pixelId: string;
  pixelEnabled: boolean;
  conversionsApiEnabled: boolean;
  conversionsApiAccessToken: string;
  testEventCode: string;
  quizTrackingEnabled: boolean;
  signupTrackingEnabled: boolean;
  purchaseTrackingEnabled: boolean;
  utmCaptureEnabled: boolean;
};

export type PublicTrackingSettings = {
  pixelId: string;
  pixelEnabled: boolean;
  quizTrackingEnabled: boolean;
  signupTrackingEnabled: boolean;
  purchaseTrackingEnabled: boolean;
  utmCaptureEnabled: boolean;
};

export type StoredAttribution = {
  landingPath?: string;
  initialReferrer?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  fbclid?: string;
  xcod?: string;
  raw_params?: Record<string, string>;
  firstCapturedAt?: string;
  lastCapturedAt?: string;
};

export type MetaPurchasePayload = {
  value: number;
  currency: 'BRL';
  plan: string;
  userId?: string | null;
  workspaceId?: string | null;
  email?: string | null;
  eventId?: string | null;
};
