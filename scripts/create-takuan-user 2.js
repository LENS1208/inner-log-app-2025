import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  console.error('VITE_SUPABASE_URL is not set');
  process.exit(1);
}

if (!supabaseServiceKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY is not set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createUser() {
  try {
    console.log('Creating user: takuan_1000@yahoo.co.jp');

    const { data, error } = await supabase.auth.admin.createUser({
      email: 'takuan_1000@yahoo.co.jp',
      password: 'test2025',
      email_confirm: true,
      user_metadata: {}
    });

    if (error) {
      console.error('Error creating user:', error);
      process.exit(1);
    }

    console.log('User created successfully:', data.user.id);
    console.log('Email:', data.user.email);
    console.log('Email confirmed:', data.user.email_confirmed_at);
  } catch (err) {
    console.error('Exception:', err);
    process.exit(1);
  }
}

createUser();
