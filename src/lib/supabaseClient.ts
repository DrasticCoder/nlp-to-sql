import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://pdqqxpyupcwnnqzftskc.supabase.co';
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBkcXF4cHl1cGN3bm5xemZ0c2tjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgxMjg1ODUsImV4cCI6MjA2MzcwNDU4NX0.T9E9T0KXlhham5fL6Tn_CMgFCeEAIz1CTtpAa2mH11Q';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase environment variables are missing');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
