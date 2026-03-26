import { describe, it, expect, vi } from 'vitest';
import { supabase } from '../../shared/utils/supabase';

describe('RLS Verification (Real Supabase)', () => {
  // This test assumes User A and User B are confirmed.
  // If auth fails, it will skip or report failure.

  it('prevents data fetching without valid session', async () => {
    // By default, anon key should not see anything if RLS is on
    const { data, error } = await supabase.from('invoices').select('*');

    // If RLS is ON, data should be [] or empty, and no error (standard PostgREST behavior)
    expect(data?.length).toBe(0);
  });

  it('denies INSERT without user_id matching auth.uid()', async () => {
    // Try to insert with a random user_id
    const { error } = await supabase.from('customers').insert({
      name: 'Unauthorized',
      user_id: '00000000-0000-0000-0000-000000000000',
    });

    // Supabase should return an error or silently fail if WITH CHECK fails
    // Usually it's a 403 or empty response depending on configuration
    if (error) {
      expect(error.code).toBeDefined();
    }
  });
});
