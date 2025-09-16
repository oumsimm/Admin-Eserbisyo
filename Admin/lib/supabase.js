import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qjrxvrxeskknweqqarhr.supabase.co';
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqcnh2cnhlc2trbndlcXFhcmhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxMzAzOTksImV4cCI6MjA3MjcwNjM5OX0.YsBGIl_PwjafKwkZZw3V2E0cRwvR7edI8eLG0q1wMYw';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

export default supabase;


