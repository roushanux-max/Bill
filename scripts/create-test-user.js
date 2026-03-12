import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Missing Superbase URL or Anon Key in .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function createTestUser() {
    console.log("Creating test user: test@billmint.local / password123");

    const { data, error } = await supabase.auth.signUp({
        email: 'test@billmint.com',
        password: 'password123',
        options: {
            data: {
                full_name: 'Test User',
            }
        }
    });

    if (error) {
        if (error.message.includes("User already registered")) {
            console.log("✅ User already exists! You can log in with test@billmint.com / password123");
        } else {
            console.error("❌ Failed to create user:", error.message);
        }
    } else {
        console.log("✅ Success! You can now log in with the above credentials.");
    }
}

createTestUser();
