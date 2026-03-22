
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  console.log('--- TABLES CHECK ---');
  // We can't easily list all tables via anon key, but we can try to query common ones
  const tables = ['stores', 'customers', 'products', 'invoices', 'invoice_items', 'activity_logs', 'profiles', 'users'];
  for (const table of tables) {
    try {
      const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
      if (error) {
        console.log(`${table}: ❌ ${error.message}`);
      } else {
        console.log(`${table}: ✅ ${count} rows`);
      }
    } catch (e) {
      console.log(`${table}: 💥 ${e.message}`);
    }
  }
}

check();
