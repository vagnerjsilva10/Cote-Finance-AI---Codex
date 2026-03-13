'use client';

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
  | 'quiz_signup_click';

export function trackQuizEvent(event: QuizAnalyticsEvent, payload: Record<string, unknown> = {}) {
  if (typeof window === 'undefined') return;

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event,
    ...payload,
  });
}
