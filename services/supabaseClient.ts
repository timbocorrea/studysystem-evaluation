import { createClient, SupabaseClient } from '@supabase/supabase-js';

const resolveEnvVar = (key: string): string | undefined => {
  const processEnv = typeof process !== 'undefined' ? (process.env as Record<string, string | undefined>) : {};
  const windowEnv = typeof window !== 'undefined' ? (window as any).env || {} : {};

  if (key === 'SUPABASE_URL') {
    return processEnv.SUPABASE_URL || processEnv.VITE_SUPABASE_URL || windowEnv.SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL;
  }

  if (key === 'SUPABASE_ANON_KEY') {
    return processEnv.SUPABASE_ANON_KEY || processEnv.VITE_SUPABASE_ANON_KEY || windowEnv.SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;
  }

  return processEnv[key] || windowEnv[key];
};

let cachedClient: SupabaseClient | null = null;

export const createSupabaseClient = (): SupabaseClient => {
  if (cachedClient) return cachedClient;

  const supabaseUrl = resolveEnvVar('SUPABASE_URL');
  const supabaseAnonKey = resolveEnvVar('SUPABASE_ANON_KEY');

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase credentials are missing. Set SUPABASE_URL and SUPABASE_ANON_KEY.');
  }

  cachedClient = createClient(supabaseUrl, supabaseAnonKey);
  return cachedClient;
};
