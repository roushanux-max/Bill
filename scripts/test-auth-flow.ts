import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function testAuth() {
    const testEmail = `test_${Date.now()}@test.com`;
    console.log(`Testing with temp email: ${testEmail}`);

    // 1. Sign up
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: testEmail,
        password: 'password123',
        options: {
            data: { full_name: 'Test Setup' }
        }
    });

    if (signUpError) {
        console.error("Sign up error:", signUpError.message);
        return;
    }

    console.log("Sign up successful. Session exists?", !!signUpData.session);
    console.log("User email confirmed at:", signUpData.user?.email_confirmed_at || 'NOT CONFIRMED');

    // 2. Try to sign in immediately
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: testEmail,
        password: 'password123'
    });

    if (signInError) {
        console.error("Sign in error:", signInError.message);
    } else {
        console.log("Sign in successful!");
    }
}

testAuth();
