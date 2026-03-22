import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://etwpdcpkalyacvnwdsfh.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0d3BkY3BrYWx5YWN2bndkc2ZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzMTUxNzQsImV4cCI6MjA4ODg5MTE3NH0.7nLBxO9MZDIW2-BzAQN8mZLoNoGwiCPrvboiGyP_BcA";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function scanAndFix() {
  console.log("Scanning Database for Orphaned Data...");

  // 1. Find all stores to use as targets
  const { data: allStores } = await supabase.from('stores').select('id, user_id, business_name');
  if (!allStores || allStores.length === 0) {
    console.error("No stores found in DB. RLS might be blocking or DB is empty.");
    return;
  }
  console.log(`Found ${allStores.length} stores in DB.`);

  // 2. Find all orphaned invoices
  const { data: orphanedInvoices } = await supabase
    .from('invoices')
    .select('id, user_id, invoice_number, grand_total, store_id')
    .or('store_id.is.null,store_id.eq.offline-default');

  if (orphanedInvoices && orphanedInvoices.length > 0) {
    console.log(`Found ${orphanedInvoices.length} orphaned invoices.`);
    
    for (const inv of orphanedInvoices) {
      if (!inv.user_id) continue;
      
      // Find a store for this user
      const userStore = allStores.find(s => s.user_id === inv.user_id);
      if (userStore) {
        if (Number(inv.grand_total) > 0) {
          console.log(`Mapping Invoice ${inv.invoice_number} (ID: ${inv.id}) to Store ${userStore.business_name}`);
          await supabase.from('invoices').update({ store_id: userStore.id }).eq('id', inv.id);
        } else {
          console.log(`Deleting Ghost Invoice: ${inv.id}`);
          await supabase.from('invoices').delete().eq('id', inv.id);
        }
      } else {
        console.log(`No store found for User ID ${inv.user_id} - Invoice ${inv.id} remains orphaned.`);
      }
    }
  }

  // 3. Find all orphaned customers
  const { data: orphanedCustomers } = await supabase
    .from('customers')
    .select('id, store_id, name, (SELECT user_id FROM stores WHERE id = store_id LIMIT 1) as user_id') // This won't work in one go due to schema
    .or('store_id.is.null,store_id.eq.offline-default');
  
  // Actually, customers usually don't have user_id, they have store_id.
  // If store_id is null, we can't easily know who they belong to unless we check invoices.
  
  if (orphanedCustomers && orphanedCustomers.length > 0) {
    console.log(`Found ${orphanedCustomers.length} orphaned customers.`);
    for (const cust of orphanedCustomers) {
       // Try to find an invoice for this customer to trace the user
       const { data: inv } = await supabase.from('invoices').select('user_id').eq('customer_id', cust.id).limit(1).maybeSingle();
       if (inv && inv.user_id) {
         const userStore = allStores.find(s => s.user_id === inv.user_id);
         if (userStore) {
            console.log(`Mapping Customer ${cust.name} to Store ${userStore.business_name}`);
            await supabase.from('customers').update({ store_id: userStore.id }).eq('id', cust.id);
         }
       }
    }
  }

  // 4. Ghost Cleanup (Deleted Customer + 0 Total)
  const { data: ghosts } = await supabase
    .from('invoices')
    .select('id, grand_total, customer_id')
    .eq('grand_total', 0);

  if (ghosts) {
    for (const inv of ghosts) {
      const { data: cust } = await supabase.from('customers').select('name').eq('id', inv.customer_id).maybeSingle();
      if (!cust || cust.name === 'Deleted Customer') {
        console.log(`Deleting Final Ghost Invoice: ${inv.id}`);
        await supabase.from('invoices').delete().eq('id', inv.id);
      }
    }
  }

  console.log("Scan and fix complete.");
}

scanAndFix();
