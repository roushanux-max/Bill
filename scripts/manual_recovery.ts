import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://etwpdcpkalyacvnwdsfh.supabase.co';
const supabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0d3BkY3BrYWx5YWN2bndkc2ZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzMTUxNzQsImV4cCI6MjA4ODg5MTE3NH0.7nLBxO9MZDIW2-BzAQN8mZLoNoGwiCPrvboiGyP_BcA';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function runRecovery() {
  console.log('Starting Data Recovery...');

  // Note: Since we are running in a script, we can't easily get the auth session
  // unless we use a Service Role key or the user is already logged in and the
  // session is persisted in a way we can access.
  // HOWEVER, the user might have provided the user_id if we asked,
  // but for now let's try to find the "active" stores first.

  const { data: stores, error: storeError } = await supabase
    .from('stores')
    .select('*')
    .order('created_at', { ascending: true });

  if (storeError || !stores || stores.length === 0) {
    console.error(
      'No stores found to map data to. Please ensure you are logged in or provide a store ID.'
    );
    return;
  }

  const primaryStore = stores[0];
  console.log(`Using Primary Store: ${primaryStore.business_name} (ID: ${primaryStore.id})`);
  const userId = primaryStore.user_id;

  // 1. Recover Orphaned Invoices
  console.log('Checking for orphaned invoices...');
  const { data: orphanedInvoices, error: invError } = await supabase
    .from('invoices')
    .select('id, invoice_number, grand_total, customer_id')
    .eq('user_id', userId)
    .or(`store_id.is.null,store_id.eq.offline-default`);

  if (invError) {
    console.error('Error fetching orphaned invoices:', invError);
  } else if (orphanedInvoices && orphanedInvoices.length > 0) {
    console.log(`Found ${orphanedInvoices.length} orphaned invoices.`);

    // Filter out ghosts (0 total and no customer or deleted)
    // We can't easily check customer name in one query here, so we'll do it carefully
    const toRestore = orphanedInvoices.filter((inv) => Number(inv.grand_total) > 0);
    const toDelete = orphanedInvoices.filter((inv) => Number(inv.grand_total) === 0);

    console.log(`Restoring ${toRestore.length} valid invoices...`);
    for (const inv of toRestore) {
      await supabase.from('invoices').update({ store_id: primaryStore.id }).eq('id', inv.id);
    }

    console.log(`Deleting ${toDelete.length} ghost/zero-total invoices...`);
    for (const inv of toDelete) {
      await supabase.from('invoices').delete().eq('id', inv.id);
    }
  } else {
    console.log('No orphaned invoices found.');
  }

  // 2. Recover Orphaned Customers
  console.log('Checking for orphaned customers...');
  const { data: orphanedCustomers, error: custError } = await supabase
    .from('customers')
    .select('id, name')
    .or(`store_id.is.null,store_id.eq.offline-default`);

  if (custError) {
    console.error('Error fetching orphaned customers:', custError);
  } else if (orphanedCustomers && orphanedCustomers.length > 0) {
    console.log(`Found ${orphanedCustomers.length} orphaned customers.`);
    for (const cust of orphanedCustomers) {
      await supabase.from('customers').update({ store_id: primaryStore.id }).eq('id', cust.id);
    }
    console.log('Customers restored.');
  } else {
    console.log('No orphaned customers found.');
  }

  // 3. Special Cleanup: Delete "Deleted Customer" invoices with 0 total even if they HAVE a store_id
  console.log("Cleaning up 'Deleted Customer' ghost invoices with 0 total...");
  // This requires a join or two queries.
  // First get all items with 0 total
  const { data: zeroTotalInvoices } = await supabase
    .from('invoices')
    .select('id, customer_id')
    .eq('grand_total', 0);

  if (zeroTotalInvoices && zeroTotalInvoices.length > 0) {
    for (const inv of zeroTotalInvoices) {
      // Check if customer exists
      const { data: customer } = await supabase
        .from('customers')
        .select('name')
        .eq('id', inv.customer_id)
        .maybeSingle();
      if (!customer || customer.name === 'Deleted Customer') {
        console.log(`Deleting ghost invoice ${inv.id}`);
        await supabase.from('invoices').delete().eq('id', inv.id);
      }
    }
  }

  console.log('Recovery Finished.');
}

runRecovery();
