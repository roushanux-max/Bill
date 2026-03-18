import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://etwpdcpkalyacvnwdsfh.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0d3BkY3BrYWx5YWN2bndkc2ZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzMTUxNzQsImV4cCI6MjA4ODg5MTE3NH0.7nLBxO9MZDIW2-BzAQN8mZLoNoGwiCPrvboiGyP_BcA";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function inspectData() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.log("No user session found. Please login in the browser first.");
    const { data: sessions } = await supabase.auth.getSession();
    console.log("Session:", sessions);
    return;
  }

  console.log("Checking invoices for user:", user.email, "(", user.id, ")");

  // 1. Check all invoices for this user
  const { data: allInvoices, error: invError } = await supabase
    .from('invoices')
    .select('*')
    .eq('user_id', user.id);

  if (invError) {
    console.error("Error fetching invoices:", invError);
  } else {
    console.log(`Found ${allInvoices.length} total invoices for this user.`);
    const orphaned = allInvoices.filter(inv => !inv.store_id);
    console.log(`Orphaned invoices (no store_id): ${orphaned.length}`);
    
    if (orphaned.length > 0) {
      console.log("Sample orphaned invoice IDs:", orphaned.slice(0, 5).map(i => i.id));
    }

    const stores = [...new Set(allInvoices.map(inv => inv.store_id))];
    console.log("Unique store_ids used in invoices:", stores);
  }

  // 2. Check stores for this user
  const { data: userStores, error: storeError } = await supabase
    .from('stores')
    .select('*')
    .eq('user_id', user.id);

  if (storeError) {
    console.error("Error fetching stores:", storeError);
  } else {
    console.log(`Found ${userStores.length} stores for this user.`);
    userStores.forEach(s => {
      console.log(` - Store: ${s.business_name} (ID: ${s.id})`);
    });
  }
}

inspectData();
