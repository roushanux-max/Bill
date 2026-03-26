import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://etwpdcpkalyacvnwdsfh.supabase.co';
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0d3BkY3BrYWx5YWN2bndkc2ZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzMTUxNzQsImV4cCI6MjA4ODg5MTE3NH0.7nLBxO9MZDIW2-BzAQN8mZLoNoGwiCPrvboiGyP_BcA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
