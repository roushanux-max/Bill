import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const signupUrl = `${supabaseUrl}/functions/v1/server/make-server-d504a230/signup`;

async function createConfirmedUser(email, name) {
    console.log(`Creating confirmed user: ${email}...`);
    try {
        const response = await fetch(signupUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.VITE_SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify({
                email,
                password: 'password123',
                name
            })
        });

        const result = await response.json();
        if (response.ok) {
            console.log(`✅ Success for ${email}!`);
            return result.data.user.id;
        } else {
            console.error(`❌ Failed for ${email}:`, result.error);
            return null;
        }
    } catch (e) {
        console.error(`💥 Error for ${email}:`, e.message);
        return null;
    }
}

async function run() {
    // Create two confirmed users
    await createConfirmedUser('realtest1@bill.com', 'Real Test 1');
    await createConfirmedUser('realtest2@bill.com', 'Real Test 2');
}

run();
