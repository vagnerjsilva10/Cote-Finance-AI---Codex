'use client';

import type { PublicTrackingSettings, StoredAttribution } from '@/lib/tracking/types';

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: (...args: unknown[]) => void;
    __coteTrackingSettings?: PublicTrackingSettings | null;
    __coteTrackingPixelLoaded?: boolean;
    dataLayer?: Array<Record<string, unknown>>;
  }
}

export const ATTRIBUTION_STORAGE_KEY = 'cote_tracking_attribution';
export const PENDING_PURCHASE_STORAGE_KEY = 'cote_tracking_pending_purchase';

export function getDefaultPublicTrackingSettings(): PublicTrackingSettings {
  return {
    pixelId: '',
    pixelEnabled: false,
    quizTrackingEnabled: true,
    signupTrackingEnabled: true,
    purchaseTrackingEnabled: true,
    utmCaptureEnabled: true,
  };
}

export function setTrackingSettings(settings: PublicTrackingSettings) {
  if (typeof window === 'undefined') return;
  window.__coteTrackingSettings = settings;
}

export function getTrackingSettings() {
  if (typeof window === 'undefined') return getDefaultPublicTrackingSettings();
  return window.__coteTrackingSettings ?? getDefaultPublicTrackingSettings();
}

function setCookie(name: string, value: string, maxAgeSeconds: number) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSeconds}; samesite=lax`;
}

export function readStoredAttribution(): StoredAttribution | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(ATTRIBUTION_STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as StoredAttribution;
  } catch {
    return null;
  }
}

export function saveStoredAttribution(value: StoredAttribution) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify(value));
  setCookie('cote_tracking_attribution', JSON.stringify(value), 60 * 60 * 24 * 90);
}

export function captureAttributionFromUrl(currentUrl: URL) {
  const settings = getTrackingSettings();
  if (!settings.utmCaptureEnabled) return readStoredAttribution();

  const relevantKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'xcod'];
  const collectedEntries = Array.from(currentUrl.searchParams.entries()).filter(([key]) => {
    return relevantKeys.includes(key) || key.startsWith('utm_');
  });

  const hasAttribution = collectedEntries.length > 0;
  const existing = readStoredAttribution();
  if (!hasAttribution && existing) return existing;
  if (!hasAttribution) return null;

  const rawParams = Object.fromEntries(collectedEntries);
  const now = new Date().toISOString();
  const nextValue: StoredAttribution = {
    ...existing,
    landingPath: existing?.landingPath || currentUrl.pathname,
    initialReferrer: existing?.initialReferrer || document.referrer || undefined,
    utm_source: rawParams.utm_source || existing?.utm_source,
    utm_medium: rawParams.utm_medium || existing?.utm_medium,
    utm_campaign: rawParams.utm_campaign || existing?.utm_campaign,
    utm_content: rawParams.utm_content || existing?.utm_content,
    utm_term: rawParams.utm_term || existing?.utm_term,
    fbclid: rawParams.fbclid || existing?.fbclid,
    xcod: rawParams.xcod || existing?.xcod,
    raw_params: {
      ...(existing?.raw_params || {}),
      ...rawParams,
    },
    firstCapturedAt: existing?.firstCapturedAt || now,
    lastCapturedAt: now,
  };

  saveStoredAttribution(nextValue);
  return nextValue;
}

export function initializeMetaPixel(settings: PublicTrackingSettings) {
  if (typeof window === 'undefined' || !settings.pixelEnabled || !settings.pixelId || window.__coteTrackingPixelLoaded) {
    return;
  }

  ((f: Window & typeof globalThis, b: Document, e: 'script', v: string) => {
    if (f.fbq) return;
    const n = function (...args: unknown[]) {
      (n.callMethod ? n.callMethod : n.queue.push)(...args);
    } as ((...args: unknown[]) => void) & { callMethod?: (...args: unknown[]) => void; queue: unknown[]; loaded?: boolean; version?: string; push?: (...args: unknown[]) => number };
    if (!f._fbq) f._fbq = n;
    n.push = (...args: unknown[]) => n.queue.push(args);
    n.loaded = true;
    n.version = '2.0';
    n.queue = [];
    f.fbq = n;
    const t = b.createElement(e);
    t.async = true;
    t.src = v;
    const s = b.getElementsByTagName(e)[0];
    s.parentNode?.insertBefore(t, s);
  })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');

  window.fbq?.('init', settings.pixelId);
  window.__coteTrackingPixelLoaded = true;
}

export function trackPixelPageView() {
  const settings = getTrackingSettings();
  if (!settings.pixelEnabled || !settings.pixelId) return;
  window.fbq?.('track', 'PageView');
}

export function trackPixelCustom(eventName: string, payload?: Record<string, unknown>) {
  const settings = getTrackingSettings();
  if (!settings.pixelEnabled || !settings.pixelId) return;
  if (payload) {
    window.fbq?.('trackCustom', eventName, payload);
    return;
  }
  window.fbq?.('trackCustom', eventName);
}

export function trackPixelStandard(
  eventName: 'CompleteRegistration' | 'Purchase' | 'Lead' | 'InitiateCheckout',
  payload?: Record<string, unknown>
) {
  const settings = getTrackingSettings();
  if (!settings.pixelEnabled || !settings.pixelId) return;
  if (payload) {
    window.fbq?.('track', eventName, payload);
    return;
  }
  window.fbq?.('track', eventName);
}

export function pushInternalTrackingEvent(event: string, payload: Record<string, unknown> = {}) {
  if (typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event, ...payload });
}

export function markPendingPurchase(payload: { plan: string; value: number; currency: 'BRL' }) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(PENDING_PURCHASE_STORAGE_KEY, JSON.stringify(payload));
}

export function consumePendingPurchase() {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(PENDING_PURCHASE_STORAGE_KEY);
  if (!raw) return null;
  window.localStorage.removeItem(PENDING_PURCHASE_STORAGE_KEY);
  try {
    return JSON.parse(raw) as { plan: string; value: number; currency: 'BRL' };
  } catch {
    return null;
  }
}
