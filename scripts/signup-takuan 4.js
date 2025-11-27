import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function signupUser() {
  try {
    console.log('Signing up user: takuan_1000@yahoo.co.jp');

    const { data, error } = await supabase.auth.signUp({
      email: 'takuan_1000@yahoo.co.jp',
      password: 'test2025',
      options: {
        emailRedirectTo: undefined,
        data: {}
      }
    });

    if (error) {
      console.error('Error signing up:', error);
      process.exit(1);
    }

    console.log('User signed up successfully!');
    console.log('User ID:', data.user?.id);
    console.log('Email:', data.user?.email);
    console.log('Email confirmed:', data.user?.email_confirmed_at);
    console.log('\nYou can now login with:');
    console.log('Email: takuan_1000@yahoo.co.jp');
    console.log('Password: test2025');
  } catch (err) {
    console.error('Exception:', err);
    process.exit(1);
  }
}

signupUser();
