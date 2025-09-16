import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

export const SUPABASE_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_URL || 'https://qjrxvrxeskknweqqarhr.supabase.co';
export const SUPABASE_ANON_KEY = Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqcnh2cnhlc2trbndlcXFhcmhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxMzAzOTksImV4cCI6MjA3MjcwNjM5OX0.YsBGIl_PwjafKwkZZw3V2E0cRwvR7edI8eLG0q1wMYw';

console.log('Supabase Config:', { 
  url: SUPABASE_URL ? 'SET' : 'NOT SET', 
  key: SUPABASE_ANON_KEY ? 'SET' : 'NOT SET' 
});

// Supabase enabled for image uploads
export const supabase = (SUPABASE_URL && SUPABASE_ANON_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { 
        persistSession: false, // Disable for now since we're using Firebase auth
        autoRefreshToken: false,
        detectSessionInUrl: false 
      },
      db: { schema: 'public' },
      global: { 
        headers: { 
          'X-Client-Info': 'expo-mobile-app' 
        } 
      }
    })
  : null;

export default supabase;
