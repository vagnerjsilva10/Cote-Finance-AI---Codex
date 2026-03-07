import { createClient } from '@supabase/supabase-js';

type SupabaseClientInstance = ReturnType<typeof createClient>;

let supabaseClient: SupabaseClientInstance | null = null;

function readSupabaseEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL');
  }

  if (!supabaseAnonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  return { supabaseUrl, supabaseAnonKey };
}

export function getSupabaseClient() {
  if (!supabaseClient) {
    const { supabaseUrl, supabaseAnonKey } = readSupabaseEnv();
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  }

  return supabaseClient;
}

// Preserve the existing import shape while delaying client creation until first use.
export const supabase = new Proxy({} as SupabaseClientInstance, {
  get(_target, prop) {
    const client = getSupabaseClient();
    const value = (client as unknown as Record<PropertyKey, unknown>)[prop];
    return typeof value === 'function' ? value.bind(client) : value;
  },
});
