import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';

export default function StressTest() {
  const [logs, setLogs] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, msg]);
    console.log(msg);
  };

  const runTest = async () => {
    setIsRunning(true);
    setLogs([]);
    addLog('🚀 Starting Data Isolation Stress Test for 5 Accounts in Browser...');

    const users = Array.from({ length: 5 }, (_, i) => ({
      email: `browser_stress_${Date.now()}_${i}@example.com`,
      password: 'TestPassword123!',
      name: `Browser User ${i}`
    }));

    const userIds: string[] = [];

    try {
      // 1. Register Users
      addLog('\\n--- 1. Registering 5 Users ---');
      for (let i = 0; i < users.length; i++) {
        addLog(`Registering ${users[i].email}...`);
        const { data, error } = await supabase.auth.signUp({
          email: users[i].email,
          password: users[i].password,
          options: { data: { name: users[i].name } }
        });
        
        if (error) throw new Error(`SignUp failed for user ${i}: ${error.message}`);
        userIds.push(data.user!.id);
        addLog(`✅ User ${i} registered with ID: ${data.user!.id.slice(0, 8)}...`);
        
        // Sign out to ensure clean state
        await supabase.auth.signOut();
      }

      // 2. Create Data for Each User
      addLog('\\n--- 2. Creating Store Data for Each User ---');
      for (let i = 0; i < users.length; i++) {
        // Sign in
        await supabase.auth.signInWithPassword({ email: users[i].email, password: users[i].password });
        
        addLog(`Creating store for User ${i}...`);
        const { data, error } = await supabase.from('stores').insert({
          user_id: userIds[i],
          name: `Store for User ${i}`,
          address: `Browser Address ${i}`,
        }).select();
        
        if (error) throw new Error(`Create store failed: ${error.message}`);
        addLog(`✅ Store created: ${data[0].id.slice(0, 8)}...`);
        
        await supabase.auth.signOut();
      }

      // 3. Verify Isolation
      addLog('\\n--- 3. Verifying RLS Data Isolation ---');
      let isolationPassed = true;
      for (let i = 0; i < users.length; i++) {
        await supabase.auth.signInWithPassword({ email: users[i].email, password: users[i].password });
        
        const { data, error } = await supabase.from('stores').select('*');
        if (error) throw new Error(`Fetch failed: ${error.message}`);
        
        if (data.length === 1 && data[0].user_id === userIds[i]) {
           addLog(`✅ User ${i} correctly sees only their own 1 store. (${data[0].name})`);
        } else {
           addLog(`❌ User ${i} sees ${data.length} stores! Isolation failed.`);
           isolationPassed = false;
        }
        await supabase.auth.signOut();
      }

      // 4. Attempt Cross-Account Access
      addLog('\\n--- 4. Attempting Cross-Account Access (Negative Testing) ---');
      
      // Get User 0's store ID
      await supabase.auth.signInWithPassword({ email: users[0].email, password: users[0].password });
      const { data: user0Data } = await supabase.from('stores').select('id');
      const user0StoreId = user0Data![0].id;
      await supabase.auth.signOut();

      // Sign in as User 1 and try to read User 0's store
      await supabase.auth.signInWithPassword({ email: users[1].email, password: users[1].password });
      addLog(`Attempting to read User 0's store using User 1's active session...`);
      const { data: crossReadData } = await supabase.from('stores').select('*').eq('id', user0StoreId);
      
      if (crossReadData && crossReadData.length === 0) {
          addLog(`✅ User 1 successfully blocked from reading User 0's store.`);
      } else {
          addLog(`❌ User 1 was able to read User 0's store!`);
          isolationPassed = false;
      }
      await supabase.auth.signOut();

      if (isolationPassed) {
         addLog('\\n[SUCCESS] 🎉 STRESS TEST PASSED: Full Data Isolation Confirmed Across 5 Accounts!');
      } else {
         addLog('\\n[FAILED] 🚨 STRESS TEST FAILED: Data Leakage Detected.');
      }

    } catch (err: any) {
      addLog(`\\n❌ Test Error: ${err.message}`);
    } finally {
      setIsRunning(false);
      addLog('\\nTest completed. Note: Test data remains in database.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow p-6">
        <h1 className="text-2xl font-bold mb-4">RLS Data Isolation Stress Test</h1>
        <p className="text-slate-600 mb-6">
          This utility will create 5 new accounts, generate data for each, and mathematically verify that Supabase Row Level Security prevents any user from accessing another user's data.
        </p>
        
        <button 
          onClick={runTest} 
          disabled={isRunning}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {isRunning ? 'Running Test...' : 'Start Stress Test'}
        </button>

        <div className="mt-8 bg-slate-900 rounded-lg p-4 font-mono text-sm h-96 overflow-y-auto">
          {logs.length === 0 ? (
            <span className="text-slate-500">Awaiting execution...</span>
          ) : (
            logs.map((log, i) => (
              <div key={i} className={`whitespace-pre-wrap ${log.includes('❌') || log.includes('[FAILED]') ? 'text-red-400' : log.includes('✅') || log.includes('[SUCCESS]') ? 'text-green-400' : 'text-slate-300'}`}>
                {log}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
