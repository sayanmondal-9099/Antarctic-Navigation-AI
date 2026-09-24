import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Check if valid Supabase configuration is provided
export const isSupabaseConfigured = 
  Boolean(supabaseUrl && supabaseAnonKey) &&
  supabaseUrl !== 'DEMO_MODE' &&
  supabaseUrl.startsWith('http');

let supabase: SupabaseClient | null = null;

if (isSupabaseConfigured) {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
    console.log('[Supabase] Initialized client successfully.');
  } catch (error) {
    console.error('[Supabase] Failed to initialize client:', error);
  }
} else {
  console.warn('[Supabase] Configuration not detected. Running in offline DEMO mode.');
}

export { supabase };
