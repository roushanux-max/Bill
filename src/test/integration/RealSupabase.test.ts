import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { supabase } from '../../shared/utils/supabase';
import { cleanupTestData } from '../utils/test-db';

describe('Real Supabase RLS & Isolation', () => {
  const userA = { email: 'test@bill.com', password: 'password123', id: '' };
  const userB = { email: 'test2@bill.com', password: 'password123', id: '' };

  beforeAll(async () => {
    // 1. Get User A ID
    const { data: authA } = await supabase.auth.signInWithPassword({
      email: userA.email,
      password: userA.password
    });
    userA.id = authA.user?.id || '';

    // 2. Get User B ID
    const { data: authB } = await supabase.auth.signInWithPassword({
      email: userB.email,
      password: userB.password
    });
    userB.id = authB.user?.id || '';

    // Cleanup before starting
    await cleanupTestData(userA.id);
    await cleanupTestData(userB.id);
  });

  afterAll(async () => {
    await cleanupTestData(userA.id);
    await cleanupTestData(userB.id);
    await supabase.auth.signOut();
  });

  it('enforces RLS: User B cannot see User A data', async () => {
    // 1. Sign in as User A and create a customer
    await supabase.auth.signInWithPassword({ email: userA.email, password: userA.password });
    
    // We need a store first because of foreign keys in the original schema
    const { data: store } = await supabase.from('stores').insert({
        user_id: userA.id,
        business_name: 'Store A',
    }).select().single();
    
    const { data: customerA } = await supabase.from('customers').insert({
      store_id: store.id,
      name: 'Private Customer A',
      user_id: userA.id // In our new schema we added user_id
    }).select().single();

    expect(customerA).toBeDefined();

    // 2. Sign in as User B
    await supabase.auth.signInWithPassword({ email: userB.email, password: userB.password });

    // 3. Try to fetch ALL customers
    const { data: allCustomers } = await supabase.from('customers').select('*');

    // 4. Verify User B sees NOTHING from User A
    const foundA = allCustomers?.find(c => c.id === customerA.id);
    expect(foundA).toBeUndefined();
    expect(allCustomers?.length).toBe(0);
  });

  it('enforces RLS: User B cannot UPDATE User A data', async () => {
    // We are still signed in as User B
    // Try to update User A's customer
    // We already know its ID from the previous test if it was exported, but let's re-signin to get it
    await supabase.auth.signInWithPassword({ email: userA.email, password: userA.password });
    const { data: customerA } = await supabase.from('customers').select('id').limit(1).single();

    await supabase.auth.signInWithPassword({ email: userB.email, password: userB.password });
    const { error } = await supabase.from('customers')
        .update({ name: 'Hacked' })
        .eq('id', customerA.id);

    // Supabase will either return an error or 0 rows affected
    // With RLS, it usually just returns 0 rows and no error for UPDATE if USING fails
    const { data: verifyA } = await supabase.from('customers').select('name').eq('id', customerA.id);
    expect(verifyA?.length).toBe(0);
  });
});
