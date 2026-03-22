import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://whmmhfldrigyyqqlqygo.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndobW1oZmxkcmlneXlxcWxxeWdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2ODk2NjMsImV4cCI6MjA4ODI2NTY2M30.0wYAFYwPVA0W_MYg5ZMPq1pJ5KYLD78CO1_M9plXG_A";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  console.log('Checking connection to whmmhfldrigyyqqlqygo...');
  const { data, error } = await supabase.from('stores').select('id').limit(1);
  if (error) {
    console.error('Error:', error.message);
  } else {
    console.log('Success! Connection established. Stores found:', data);
  }
}

check();
