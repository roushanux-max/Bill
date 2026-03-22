import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://etwpdcpkalyacvnwdsfh.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0d3BkY3BrYWx5YWN2bndkc2ZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzMTUxNzQsImV4cCI6MjA4ODg5MTE3NH0.7nLBxO9MZDIW2-BzAQN8mZLoNoGwiCPrvboiGyP_BcA";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  const tables = ['stores', 'customers', 'products', 'invoices', 'invoice_items', 'payments', 'activity_logs'];
  const results: any = {};
  for (const table of tables) {
    const { error } = await supabase.from(table).select('id').limit(1);
    results[table] = error ? error.message : 'OK';
  }
  console.log('---RESULTS_START---');
  console.log(JSON.stringify(results, null, 2));
  console.log('---RESULTS_END---');
}

check();
