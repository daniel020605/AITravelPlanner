import { createClient } from '@supabase/supabase-js';
import { useConfigStore } from '../../stores/configStore';

// Create a single supabase client for interacting with the database
export function getSupabaseClient() {
  const config = useConfigStore.getState().config || {};
  const supabaseUrl = config.supabase_url || '';
  const supabaseAnonKey = config.supabase_service_role_key || config.supabase_anon_key || '';
  
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }
  
  return createClient(supabaseUrl, supabaseAnonKey);
}
