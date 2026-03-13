import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bill.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndobW1oZmxkcmlneXlxcWxxeWdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2ODk2NjMsImV4cCI6MjA4ODI2NTY2M30.0wYAFYwPVA0W_MYg5ZMPq1pJ5KYLD78CO1_M9plXG_A';

const users = Array.from({ length: 5 }, (_, i) => ({
  email: `test_user_isolation_${i}_${Date.now()}@example.com`,
  password: 'TestPassword123!',
  name: `Test User ${i}`
}));

async function runIsolationTest() {
  console.log('🚀 Starting Data Isolation Stress Test for 5 Accounts...');
  
  const clients = users.map(() => createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false }
  }));

  const userIds = [];

  try {
    // 1. Register 5 users
    console.log('\n--- 1. Registering 5 Users ---');
    for (let i = 0; i < users.length; i++) {
     console.log(`Registering ${users[i].email}...`);
      const { data, error } = await clients[i].auth.signUp({
        email: users[i].email,
        password: users[i].password,
        options: {
          data: { name: users[i].name }
        }
      });
      
      if (error) throw new Error(`Failed to sign up user ${i}: ${error.message}`);
      
      console.log(`✅ User ${i} registered with ID: ${data.user.id}`);
      userIds.push(data.user.id);
    }

    // 2. Create data for each user
    console.log('\n--- 2. Creating Store Data for Each User ---');
    for (let i = 0; i < users.length; i++) {
      console.log(`Creating store for User ${i}...`);
      
      const { data, error } = await clients[i].from('stores').insert({
        user_id: userIds[i],
        name: `Store for User ${i}`,
        address: `Address ${i}`,
      }).select();
      
      if (error) throw new Error(`Failed to create store for user ${i}: ${error.message}`);
      console.log(`✅ Store created: ${data[0].id}`);
    }

    // 3. Verify Isolation (Each user should only see 1 store)
    console.log('\n--- 3. Verifying RLS Data Isolation ---');
    let isolationPassed = true;
    for (let i = 0; i < users.length; i++) {
      console.log(`Checking stores visible to User ${i}...`);
      const { data, error } = await clients[i].from('stores').select('*');
      
      if (error) throw new Error(`Failed to fetch stores for user ${i}: ${error.message}`);
      
      if (data.length === 1 && data[0].user_id === userIds[i]) {
         console.log(`✅ User ${i} correctly sees only their own 1 store. (${data[0].name})`);
      } else {
         console.error(`❌ User ${i} sees ${data.length} stores! isolation failed.`);
         console.error(data);
         isolationPassed = false;
      }
    }

    // Attempt Cross-Account Access
    console.log('\n--- 4. Attempting Cross-Account Access (Negative Testing) ---');
    console.log(`Attempting to read User 0's store using User 1's client...`);
    const { data: user0StoreData } = await clients[0].from('stores').select('id');
    const user0StoreId = user0StoreData[0].id;

    const { data: crossReadData, error: crossReadError } = await clients[1].from('stores').select('*').eq('id', user0StoreId);
    
    if (crossReadData && crossReadData.length === 0) {
        console.log(`✅ User 1 successfully blocked from reading User 0's store.`);
    } else {
        console.error(`❌ User 1 was able to read User 0's store!`);
        console.error(crossReadData);
        isolationPassed = false;
    }


    if (isolationPassed) {
       console.log('\n🎉 STRESS TEST PASSED: Full Data Isolation Confirmed Across 5 Accounts.');
    } else {
       console.log('\n🚨 STRESS TEST FAILED: Data Leakage Detected.');
    }

  } catch (err) {
    console.error('\n❌ Test Error:', err);
  } finally {
      console.log('\n🧹 Note: Test users and stores are left in the database. You may want to delete them from Supabase dashboard.');
      console.log('Test completed.');
  }
}

runIsolationTest();
