import 'server-only';

import { createClient } from '@supabase/supabase-js';

export const SUPABASE_ADMIN_CONFIG_MISSING_ERROR =
  'Supabase Admin não configurado. Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.';

let supabaseAdminClient: ReturnType<typeof createClient> | null = null;

function readSupabaseAdminEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(SUPABASE_ADMIN_CONFIG_MISSING_ERROR);
  }

  return { supabaseUrl, serviceRoleKey };
}

export function isSupabaseAdminConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
}

export function getSupabaseAdminClient() {
  if (!supabaseAdminClient) {
    const { supabaseUrl, serviceRoleKey } = readSupabaseAdminEnv();
    supabaseAdminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return supabaseAdminClient;
}

export function getSupabaseAppUrl() {
  return process.env.APP_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim() || null;
}
