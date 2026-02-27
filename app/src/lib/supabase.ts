import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl) {
    console.warn('WARNING: NEXT_PUBLIC_SUPABASE_URL is missing. Supabase features disabled.');
}

// Client for client-side usage (public data)
export const supabase = supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

// Client for server-side usage (admin rights, bypassing RLS)
// ONLY use in API routes or server components
export const supabaseAdmin = supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey)
    : supabase;

export const isSupabaseConfigured = () => {
    return !!(supabaseUrl && supabaseAnonKey);
};
