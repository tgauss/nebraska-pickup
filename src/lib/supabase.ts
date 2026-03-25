import { createClient, SupabaseClient } from '@supabase/supabase-js';

function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || '';
}

function getSupabaseAnonKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
}

// Client-side Supabase client — fully lazy, returns null if not configured
let _supabase: SupabaseClient | null = null;
export function getSupabase(): SupabaseClient | null {
  const url = getSupabaseUrl();
  if (!url || url.includes('your-project')) return null;
  if (!_supabase) {
    _supabase = createClient(url, getSupabaseAnonKey());
  }
  return _supabase;
}

// Server-side Supabase client (uses service role key, bypasses RLS)
export function createAdminClient(): SupabaseClient | null {
  const url = getSupabaseUrl();
  if (!url || url.includes('your-project')) return null;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  return createClient(url, serviceRoleKey);
}
