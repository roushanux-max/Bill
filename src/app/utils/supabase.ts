import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://bill.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndobW1oZmxkcmlneXlxcWxxeWdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2ODk2NjMsImV4cCI6MjA4ODI2NTY2M30.0wYAFYwPVA0W_MYg5ZMPq1pJ5KYLD78CO1_M9plXG_A";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
