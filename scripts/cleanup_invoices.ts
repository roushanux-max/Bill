import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://etwpdcpkalyacvnwdsfh.supabase.co';
const supabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0d3BkY3BrYWx5YWN2bndkc2ZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzMTUxNzQsImV4cCI6MjA4ODg5MTE3NH0.7nLBxO9MZDIW2-BzAQN8mZLoNoGwiCPrvboiGyP_BcA';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function cleanupZeroInvoices() {
  console.log('Fetching ALL visible invoices...');

  const { data: invoices, error } = await supabase.from('invoices').select('*');

  console.log(`Visible invoices count: ${invoices?.length || 0}`);
  if (invoices && invoices.length > 0) {
    console.log('Sample invoice:', JSON.stringify(invoices[0], null, 2));
  }

  if (error) {
    console.error('Error fetching invoices:', error);
    return;
  }

  const erroneous =
    invoices?.filter((inv) => {
      const isZero = !inv.total || inv.total === 0;
      const hasNoItems = !inv.items || (Array.isArray(inv.items) && inv.items.length === 0);
      return isZero || hasNoItems;
    }) || [];

  if (erroneous.length === 0) {
    console.log('No erroneous invoices found.');
    return;
  }

  console.log(`Found ${erroneous.length} erroneous invoices.`);
  erroneous.forEach((inv) => {
    console.log(
      `- ID: ${inv.id}, Number: ${inv.invoice_number}, Total: ${inv.total}, Items: ${Array.isArray(inv.items) ? inv.items.length : 0}`
    );
  });

  const idsToDelete = erroneous.map((inv) => inv.id);

  console.log('Deleting...');
  const { error: deleteError } = await supabase.from('invoices').delete().in('id', idsToDelete);

  if (deleteError) {
    console.error('Error deleting invoices:', deleteError);
  } else {
    console.log(`Successfully deleted ${erroneous.length} erroneous invoices.`);
  }
}

cleanupZeroInvoices();
