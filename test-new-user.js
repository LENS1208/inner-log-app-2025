import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const envContent = readFileSync('.env', 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length) {
    envVars[key.trim()] = valueParts.join('=').trim();
  }
});

const supabase = createClient(envVars.VITE_SUPABASE_URL, envVars.VITE_SUPABASE_ANON_KEY);

console.log('Testing NEW user: test@example.com / Password123!\n');

const { data, error } = await supabase.auth.signInWithPassword({
  email: 'test@example.com',
  password: 'Password123!',
});

if (error) {
  console.error('❌ Login failed:', error.message);
  console.error('Status:', error.status);
  process.exit(1);
} else {
  console.log('✅ Login SUCCESSFUL!');
  console.log('User ID:', data.user.id);
  console.log('Email:', data.user.email);
  console.log('\n📋 Use these credentials in the browser:');
  console.log('   Email: test@example.com');
  console.log('   Password: Password123!');
  await supabase.auth.signOut();
  process.exit(0);
}
