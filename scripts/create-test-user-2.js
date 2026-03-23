import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Missing Supabase URL or Anon Key");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function createSecondUser() {
    console.log("Creating second test user: test2@bill.com / password123");
    const { data, error } = await supabase.auth.signUp({
        email: 'test2@bill.com',
        password: 'password123',
    });

    if (error && !error.message.includes("already registered")) {
        console.error("❌ Error:", error.message);
    } else {
        console.log("✅ Success/Exists!");
    }
}

createSecondUser();
