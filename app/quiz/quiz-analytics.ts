'use client';

import { pushInternalTrackingEvent, trackPixelCustom } from '@/lib/tracking/client';

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
  }
}

export type QuizAnalyticsEvent =
  | 'quiz_start'
  | 'quiz_question_2'
  | 'quiz_question_4'
  | 'quiz_complete'
  | 'quiz_result_view'
  | 'quiz_signup_click'
  | 'quiz_dropoff_step';

export function trackQuizEvent(event: QuizAnalyticsEvent, payload: Record<string, unknown> = {}) {
  if (typeof window === 'undefined') return;

  if (event === 'quiz_start') {
    trackPixelCustom('QuizStart');
  }

  if (event === 'quiz_complete') {
    trackPixelCustom('QuizComplete');
  }

  pushInternalTrackingEvent(event, payload);

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event,
    ...payload,
  });
}
