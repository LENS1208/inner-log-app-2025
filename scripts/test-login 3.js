import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testLogin(email, password) {
  console.log(`\nTesting login for: ${email}`);
  console.log('Password:', password);

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      console.error('❌ Login failed:', error.message);
      console.error('Error details:', JSON.stringify(error, null, 2));
      return false;
    }

    console.log('✅ Login successful!');
    console.log('User ID:', data.user?.id);
    console.log('Email:', data.user?.email);
    return true;
  } catch (err) {
    console.error('❌ Exception:', err);
    return false;
  }
}

async function runTests() {
  console.log('=== Login Tests ===\n');

  await testLogin('takuan_1000@yahoo.co.jp', 'test2025');
  await testLogin('kan.yamaji@gmail.com', 'test2025');

  console.log('\n=== Tests Complete ===');
}

runTests();
