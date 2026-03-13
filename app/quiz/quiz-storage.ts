'use client';

import { QUIZ_STORAGE_KEY, type QuizResultData } from './quiz-lib';

export function saveQuizResult(result: QuizResultData) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(QUIZ_STORAGE_KEY, JSON.stringify(result));
}

export function readQuizResult() {
  if (typeof window === 'undefined') return null;

  const raw = window.localStorage.getItem(QUIZ_STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as QuizResultData;
  } catch {
    return null;
  }
}

export function clearQuizResult() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(QUIZ_STORAGE_KEY);
}
