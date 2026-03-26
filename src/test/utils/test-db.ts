import { createClient } from '@supabase/supabase-js';
import { supabase as realSupabase } from '../../shared/utils/supabase';

// Helper to delay execution
export const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Helper for cleanup (delete test records)
export async function cleanupTestData(userId: string) {
  if (!userId) return;

  // Clear all data for this test user
  await realSupabase.from('invoices').delete().eq('user_id', userId);
  await realSupabase.from('customers').delete().eq('user_id', userId);
  await realSupabase.from('products').delete().eq('user_id', userId);
}

// Wrapper for simulating network latency
export function withDelay<T>(promise: Promise<T>, ms: number = 1000): Promise<T> {
  return Promise.all([promise, delay(ms)]).then(([result]) => result);
}

// Mocking 'window' for headless tests if needed
if (typeof window === 'undefined') {
  (global as any).window = {};
}
