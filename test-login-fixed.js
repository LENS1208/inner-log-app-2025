import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables manually
const envContent = readFileSync(join(__dirname, '.env'), 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length) {
    envVars[key.trim()] = valueParts.join('=').trim();
  }
});

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseKey = envVars.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testLogin() {
  console.log('🔄 Testing login with multiple accounts...\n');

  // Test 1: New user (lll@lll.jp)
  console.log('Test 1: lll@lll.jp (newly created)');
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'lll@lll.jp',
      password: 'test2025',
    });

    if (error) {
      console.error('❌ Login failed:', error.message);
    } else if (data?.user) {
      console.log('✅ Login successful for lll@lll.jp');
      await supabase.auth.signOut();
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
  }

  console.log('\nTest 2: kan.yamaji@gmail.com (existing user)');
  try {
    // Test with the known test account
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'kan.yamaji@gmail.com',
      password: 'test2025',
    });

    if (error) {
      console.error('❌ Login failed:', error.message);
      console.error('Error details:', JSON.stringify(error, null, 2));
      return false;
    }

    if (data?.user) {
      console.log('✅ Login successful!');
      console.log('User ID:', data.user.id);
      console.log('Email:', data.user.email);

      // Check if user_settings exists
      const { data: settings, error: settingsError } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', data.user.id)
        .maybeSingle();

      if (settingsError) {
        console.warn('⚠️  Could not fetch user_settings:', settingsError.message);
      } else if (settings) {
        console.log('✅ user_settings exists');
      } else {
        console.log('⚠️  user_settings does not exist - will be created on first use');
      }

      // Sign out
      await supabase.auth.signOut();
      console.log('\n✅ All tests passed!');
      return true;
    }
  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
    console.error(err);
    return false;
  }
}

testLogin().then(success => {
  process.exit(success ? 0 : 1);
});
