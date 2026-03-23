import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function debug() {
    console.log("Testing Login...");
    let { data, error } = await supabase.auth.signInWithPassword({
        email: 'test@bill.com',
        password: 'password123'
    });
    
    if (error) {
        console.warn("Email Login Failed:", error.message);
        console.log("Attempting Anonymous Sign-In...");
        const anon = await supabase.auth.signInAnonymously();
        if (anon.error) {
            console.error("Anonymous Sign-In also failed:", anon.error.message);
            return;
        }
        data = anon.data;
        console.log("Anonymous Sign-In Success!");
    }
    console.log("User ID:", data.user?.id);

    console.log("Testing UNAUTHENTICATED Store Insert...");
    const { data: store, error: storeError } = await supabase.from('stores').insert({
        business_name: 'Unauthenticated Store'
    }).select().single();

    if (storeError) {
        console.warn("Unauthenticated Insert Blocked (Good!):", storeError.message);
    } else {
        console.log("Unauthenticated Insert Success! (RLS Problem!):", store.id);
        await supabase.from('stores').delete().eq('id', store.id);
    }
    
    console.log("Cleanup Done.");
}

debug();
