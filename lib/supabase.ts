import { createClient } from '@supabase/supabase-js';

type SupabaseClientInstance = ReturnType<typeof createClient>;

let supabaseClient: SupabaseClientInstance | null = null;

export const SUPABASE_CONFIG_MISSING_ERROR =
  'Supabase nao configurado. Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.';

function readSupabaseEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error(SUPABASE_CONFIG_MISSING_ERROR);
  }

  if (!supabaseAnonKey) {
    throw new Error(SUPABASE_CONFIG_MISSING_ERROR);
  }

  return { supabaseUrl, supabaseAnonKey };
}

export function getSupabaseClient() {
  if (!supabaseClient) {
    const { supabaseUrl, supabaseAnonKey } = readSupabaseEnv();
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  }

  return supabaseClient;
}

function createUnavailableSupabaseClient(message: string) {
  const error = new Error(message);
  const authErrorResponse = {
    data: { session: null, user: null },
    error,
  };

  return {
    auth: {
      getSession: async () => authErrorResponse,
      getUser: async () => authErrorResponse,
      signInWithPassword: async () => authErrorResponse,
      signUp: async () => authErrorResponse,
      resend: async () => ({ data: { user: null, session: null }, error }),
      signInWithOAuth: async () => ({ data: { provider: null, url: null }, error }),
      signOut: async () => ({ error }),
      updateUser: async () => authErrorResponse,
      exchangeCodeForSession: async () => authErrorResponse,
      verifyOtp: async () => authErrorResponse,
      onAuthStateChange: () => ({
        data: {
          subscription: {
            unsubscribe() {},
          },
        },
      }),
    },
  };
}

// Preserve the existing import shape while delaying client creation until first use.
export const supabase = new Proxy({} as SupabaseClientInstance, {
  get(_target, prop) {
    let client: SupabaseClientInstance | ReturnType<typeof createUnavailableSupabaseClient>;

    try {
      client = getSupabaseClient();
    } catch (error) {
      const message = error instanceof Error ? error.message : SUPABASE_CONFIG_MISSING_ERROR;
      client = createUnavailableSupabaseClient(message);
    }

    const value = (client as unknown as Record<PropertyKey, unknown>)[prop];
    return typeof value === 'function' ? value.bind(client) : value;
  },
});
