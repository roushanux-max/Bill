import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkLogin() {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'test@bill.com',
    password: 'password123',
  });

  if (error) {
    console.error('FULL ERROR OBJECT:', JSON.stringify(error, null, 2));
  } else {
    console.log('Login success!', data.user?.id);
  }
}

checkLogin();
