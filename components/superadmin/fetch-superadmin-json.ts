'use client';

import * as React from 'react';

import { supabase } from '@/lib/supabase';

export async function fetchSuperadminJson<T>(input: string, init?: RequestInit): Promise<T> {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw new Error(error.message || 'Não foi possível validar sua sessão.');
  }

  const token = data.session?.access_token;
  if (!token) {
    throw new Error('Sessão inválida. Faça login novamente.');
  }

  const timeoutMs = 15000;
  const abortController = new AbortController();
  const timeoutId = window.setTimeout(() => abortController.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(input, {
      ...init,
      cache: 'no-store',
      signal: init?.signal ?? abortController.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(init?.headers || {}),
      },
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('A requisição administrativa demorou mais do que o esperado. Tente novamente.');
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }

  const text = await response.text();
  const payload = text ? safeParseJson(text) : null;

  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && payload && 'error' in payload && typeof payload.error === 'string'
        ? payload.error
        : `Falha ao carregar dados administrativos (HTTP ${response.status}).`;
    throw new Error(message);
  }

  return payload as T;
}

function safeParseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export function useDebouncedValue<T>(value: T, delayMs = 250) {
  const [debouncedValue, setDebouncedValue] = React.useState(value);

  React.useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebouncedValue(value), delayMs);
    return () => window.clearTimeout(timeoutId);
  }, [delayMs, value]);

  return debouncedValue;
}
