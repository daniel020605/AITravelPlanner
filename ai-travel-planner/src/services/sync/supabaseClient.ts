import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { useConfigStore } from '../../stores/configStore';

let cachedClient: SupabaseClient | null = null;
let cachedUrl = '';
let cachedKey = '';

let cachedAdminClient: SupabaseClient | null = null;
let cachedAdminUrl = '';
let cachedAdminKey = '';

// Create (and reuse) a supabase client for interacting with the database
export function getSupabaseClient() {
  const config = useConfigStore.getState().config || {};
  const supabaseUrl = (config.supabase_url || '').trim();
  const supabaseAnonKey = (config.supabase_anon_key || '').trim();
  
  if (!supabaseUrl || !supabaseAnonKey) {
    cachedClient = null;
    cachedUrl = '';
    cachedKey = '';
    return null;
  }
  
  if (cachedClient && cachedUrl === supabaseUrl && cachedKey === supabaseAnonKey) {
    return cachedClient;
  }
  
  cachedClient = createClient(supabaseUrl, supabaseAnonKey);
  cachedUrl = supabaseUrl;
  cachedKey = supabaseAnonKey;
  return cachedClient;
}

// Optional admin client (requires Supabase service role key; use with caution)
export function getSupabaseAdminClient() {
  const config = useConfigStore.getState().config || {};
  const supabaseUrl = (config.supabase_url || '').trim();
  const supabaseServiceRoleKey = (config.supabase_service_role_key || '').trim();

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    cachedAdminClient = null;
    cachedAdminUrl = '';
    cachedAdminKey = '';
    return null;
  }

  if (
    cachedAdminClient &&
    cachedAdminUrl === supabaseUrl &&
    cachedAdminKey === supabaseServiceRoleKey
  ) {
    return cachedAdminClient;
  }

  cachedAdminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  cachedAdminUrl = supabaseUrl;
  cachedAdminKey = supabaseServiceRoleKey;
  return cachedAdminClient;
}
