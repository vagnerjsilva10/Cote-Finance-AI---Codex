'use client';

import * as React from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  captureAttributionFromUrl,
  consumePendingPurchase,
  getDefaultPublicTrackingSettings,
  initializeMetaPixel,
  markPendingPurchase,
  pushInternalTrackingEvent,
  setTrackingSettings,
  trackPixelPageView,
  trackPixelStandard,
} from '@/lib/tracking/client';
import type { PublicTrackingSettings } from '@/lib/tracking/types';

function resolveCheckoutValue(plan: string | null, interval: string | null) {
  if (plan === 'PREMIUM') {
    return interval === 'annual' ? 490 : 49;
  }
  if (plan === 'PRO') {
    return interval === 'annual' ? 290 : 29;
  }
  return 0;
}

export function TrackingProvider() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [settings, setSettingsState] = React.useState<PublicTrackingSettings>(getDefaultPublicTrackingSettings());

  React.useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const response = await fetch('/api/tracking/config', { cache: 'no-store' });
        const payload = (await response.json().catch(() => null)) as PublicTrackingSettings | null;
        if (!response.ok || !payload || cancelled) return;
        setTrackingSettings(payload);
        setSettingsState(payload);
        initializeMetaPixel(payload);
        trackPixelPageView();
      } catch {
        // Silent fail to avoid affecting the app.
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    captureAttributionFromUrl(url);
    trackPixelPageView();

    if (pathname === '/app' && searchParams.get('auth') === 'signup' && settings.signupTrackingEnabled) {
      trackPixelStandard('CompleteRegistration');
      pushInternalTrackingEvent('signup_started', { source: 'auth_query' });
    }

    if (pathname === '/app' && searchParams.get('checkout') === 'success' && settings.purchaseTrackingEnabled) {
      const pendingPurchase = consumePendingPurchase();
      if (pendingPurchase) {
        trackPixelStandard('Purchase', pendingPurchase);
        pushInternalTrackingEvent('purchase_completed', pendingPurchase);
      }
    }
  }, [pathname, searchParams, settings.purchaseTrackingEnabled, settings.signupTrackingEnabled]);

  React.useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest('a') : null;
      if (!(target instanceof HTMLAnchorElement)) return;

      const href = target.getAttribute('href') || '';
      if (!href) return;

      if ((href.startsWith('/signup') || href.includes('/app?auth=signup')) && settings.signupTrackingEnabled) {
        trackPixelStandard('CompleteRegistration');
        pushInternalTrackingEvent('signup_started', { href });
      }

      if (href.startsWith('/app/checkout')) {
        const url = new URL(href, window.location.origin);
        const plan = url.searchParams.get('plan');
        const interval = url.searchParams.get('interval');
        const value = resolveCheckoutValue(plan, interval);
        if (value > 0) {
          markPendingPurchase({ plan: plan || 'PRO', value, currency: 'BRL' });
        }
        trackPixelStandard('InitiateCheckout');
        pushInternalTrackingEvent('checkout_started', { plan, interval });
      }
    };

    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [settings.purchaseTrackingEnabled, settings.signupTrackingEnabled]);

  return null;
}

