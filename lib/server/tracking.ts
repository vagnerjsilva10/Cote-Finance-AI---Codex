import 'server-only';

import { cookies } from 'next/headers';
import { Prisma } from '@prisma/client';
import { createHash } from 'crypto';
import { prisma } from '@/lib/prisma';
import type { MetaPurchasePayload, PublicTrackingSettings, StoredAttribution, TrackingSettings } from '@/lib/tracking/types';

const TRACKING_SETTINGS_KEY = 'tracking_settings';
export const ATTRIBUTION_COOKIE_NAME = 'cote_tracking_attribution';

export const DEFAULT_TRACKING_SETTINGS: TrackingSettings = {
  pixelId: '',
  pixelEnabled: false,
  conversionsApiEnabled: false,
  conversionsApiAccessToken: '',
  testEventCode: '',
  quizTrackingEnabled: true,
  signupTrackingEnabled: true,
  purchaseTrackingEnabled: true,
  utmCaptureEnabled: true,
};

export function isMissingTrackingTableError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === 'P2021' || error.code === 'P2022';
  }

  const message = error instanceof Error ? error.message : String(error || '');
  return /does not exist|relation .* does not exist|column .* does not exist/i.test(message);
}

function normalizeString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function coerceBoolean(value: unknown, fallback = false) {
  return typeof value === 'boolean' ? value : fallback;
}

export function sanitizeTrackingSettings(value: unknown): TrackingSettings {
  const raw = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};

  return {
    pixelId: normalizeString(raw.pixelId),
    pixelEnabled: coerceBoolean(raw.pixelEnabled, false),
    conversionsApiEnabled: coerceBoolean(raw.conversionsApiEnabled, false),
    conversionsApiAccessToken: normalizeString(raw.conversionsApiAccessToken),
    testEventCode: normalizeString(raw.testEventCode),
    quizTrackingEnabled: coerceBoolean(raw.quizTrackingEnabled, true),
    signupTrackingEnabled: coerceBoolean(raw.signupTrackingEnabled, true),
    purchaseTrackingEnabled: coerceBoolean(raw.purchaseTrackingEnabled, true),
    utmCaptureEnabled: coerceBoolean(raw.utmCaptureEnabled, true),
  };
}

export function toPublicTrackingSettings(settings: TrackingSettings): PublicTrackingSettings {
  return {
    pixelId: settings.pixelId,
    pixelEnabled: settings.pixelEnabled,
    quizTrackingEnabled: settings.quizTrackingEnabled,
    signupTrackingEnabled: settings.signupTrackingEnabled,
    purchaseTrackingEnabled: settings.purchaseTrackingEnabled,
    utmCaptureEnabled: settings.utmCaptureEnabled,
  };
}

export async function readTrackingSettings(): Promise<TrackingSettings> {
  try {
    const setting = await prisma.platformSetting.findUnique({
      where: { key: TRACKING_SETTINGS_KEY },
      select: { value: true },
    });

    return sanitizeTrackingSettings(setting?.value ?? DEFAULT_TRACKING_SETTINGS);
  } catch (error) {
    if (isMissingTrackingTableError(error)) {
      return DEFAULT_TRACKING_SETTINGS;
    }
    throw error;
  }
}

export async function saveTrackingSettings(nextValue: TrackingSettings) {
  const value = sanitizeTrackingSettings(nextValue);

  try {
    await prisma.platformSetting.upsert({
      where: { key: TRACKING_SETTINGS_KEY },
      update: { value },
      create: { key: TRACKING_SETTINGS_KEY, value },
    });
  } catch (error) {
    if (!isMissingTrackingTableError(error)) {
      throw error;
    }
  }

  return value;
}

export function parseAttributionCookie(rawValue: string | undefined | null): StoredAttribution | null {
  if (!rawValue) return null;

  try {
    return JSON.parse(decodeURIComponent(rawValue)) as StoredAttribution;
  } catch {
    return null;
  }
}

export async function readAttributionFromCookies() {
  const cookieStore = await cookies();
  return parseAttributionCookie(cookieStore.get(ATTRIBUTION_COOKIE_NAME)?.value ?? null);
}

function sanitizeAttribution(input: StoredAttribution | null | undefined): StoredAttribution | null {
  if (!input) return null;

  const rawParams =
    input.raw_params && typeof input.raw_params === 'object'
      ? Object.fromEntries(
          Object.entries(input.raw_params)
            .filter((entry): entry is [string, string] => typeof entry[0] === 'string' && typeof entry[1] === 'string')
            .slice(0, 25)
        )
      : undefined;

  const normalized: StoredAttribution = {
    landingPath: normalizeString(input.landingPath) || undefined,
    initialReferrer: normalizeString(input.initialReferrer) || undefined,
    utm_source: normalizeString(input.utm_source) || undefined,
    utm_medium: normalizeString(input.utm_medium) || undefined,
    utm_campaign: normalizeString(input.utm_campaign) || undefined,
    utm_content: normalizeString(input.utm_content) || undefined,
    utm_term: normalizeString(input.utm_term) || undefined,
    fbclid: normalizeString(input.fbclid) || undefined,
    xcod: normalizeString(input.xcod) || undefined,
    raw_params: rawParams,
    firstCapturedAt: normalizeString(input.firstCapturedAt) || undefined,
    lastCapturedAt: normalizeString(input.lastCapturedAt) || undefined,
  };

  if (!Object.values(normalized).some(Boolean)) {
    return null;
  }

  return normalized;
}

export async function upsertAttributionForUser(params: {
  userId: string;
  workspaceId?: string | null;
  attribution: StoredAttribution | null;
}) {
  const attribution = sanitizeAttribution(params.attribution);
  if (!attribution) return null;

  try {
    return await prisma.marketingAttribution.upsert({
      where: { user_id: params.userId },
      update: {
        workspace_id: params.workspaceId ?? undefined,
        landing_path: attribution.landingPath,
        initial_referrer: attribution.initialReferrer,
        utm_source: attribution.utm_source,
        utm_medium: attribution.utm_medium,
        utm_campaign: attribution.utm_campaign,
        utm_content: attribution.utm_content,
        utm_term: attribution.utm_term,
        fbclid: attribution.fbclid,
        xcod: attribution.xcod,
        raw_params: attribution.raw_params ?? undefined,
        last_seen_at: attribution.lastCapturedAt ? new Date(attribution.lastCapturedAt) : new Date(),
      },
      create: {
        user_id: params.userId,
        workspace_id: params.workspaceId ?? undefined,
        landing_path: attribution.landingPath,
        initial_referrer: attribution.initialReferrer,
        utm_source: attribution.utm_source,
        utm_medium: attribution.utm_medium,
        utm_campaign: attribution.utm_campaign,
        utm_content: attribution.utm_content,
        utm_term: attribution.utm_term,
        fbclid: attribution.fbclid,
        xcod: attribution.xcod,
        raw_params: attribution.raw_params ?? undefined,
        ...(attribution.firstCapturedAt ? { created_at: new Date(attribution.firstCapturedAt) } : {}),
        ...(attribution.lastCapturedAt ? { last_seen_at: new Date(attribution.lastCapturedAt) } : {}),
      },
    });
  } catch (error) {
    if (isMissingTrackingTableError(error)) {
      return null;
    }
    throw error;
  }
}

export async function readAttributionForUser(userId: string) {
  try {
    return await prisma.marketingAttribution.findUnique({
      where: { user_id: userId },
    });
  } catch (error) {
    if (isMissingTrackingTableError(error)) {
      return null;
    }
    throw error;
  }
}

function sha256(value: string) {
  return createHash('sha256').update(value.trim().toLowerCase()).digest('hex');
}

export async function sendMetaPurchaseServerEvent(params: MetaPurchasePayload) {
  const settings = await readTrackingSettings();
  if (!settings.pixelEnabled || !settings.purchaseTrackingEnabled || !settings.conversionsApiEnabled) {
    return { sent: false, reason: 'tracking_disabled' as const };
  }

  if (!settings.pixelId || !settings.conversionsApiAccessToken) {
    return { sent: false, reason: 'missing_credentials' as const };
  }

  const attribution = params.userId ? await readAttributionForUser(params.userId) : null;
  const userData: Record<string, unknown> = {};

  if (params.email) {
    userData.em = [sha256(params.email)];
  }

  if (attribution?.fbclid) {
    userData.fbc = attribution.fbclid;
  }

  const body = {
    data: [
      {
        event_name: 'Purchase',
        event_time: Math.floor(Date.now() / 1000),
        action_source: 'website',
        event_id: params.eventId || undefined,
        user_data: userData,
        custom_data: {
          currency: params.currency,
          value: params.value,
          content_name: params.plan,
          utm_source: attribution?.utm_source ?? undefined,
          utm_campaign: attribution?.utm_campaign ?? undefined,
          utm_medium: attribution?.utm_medium ?? undefined,
          workspace_id: params.workspaceId ?? undefined,
        },
      },
    ],
    ...(settings.testEventCode ? { test_event_code: settings.testEventCode } : {}),
    access_token: settings.conversionsApiAccessToken,
  };

  try {
    const response = await fetch(`https://graph.facebook.com/v20.0/${settings.pixelId}/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      console.warn('Meta CAPI purchase event failed', response.status, text);
      return { sent: false, reason: 'request_failed' as const };
    }

    return { sent: true as const };
  } catch (error) {
    console.warn('Meta CAPI purchase event error', error);
    return { sent: false, reason: 'network_error' as const };
  }
}
