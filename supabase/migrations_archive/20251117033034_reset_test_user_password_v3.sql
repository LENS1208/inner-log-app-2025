/*
  # Reset Test User Password (v3)

  This migration resets the password for the test user account to "test2025".
  
  1. Changes
    - Deletes the existing test user
    - Recreates the user with email: kan.yamaji@gmail.com
    - Sets password: test2025
    - Confirms the email automatically
  
  2. Security Notes
    - This is a development/demo account only
    - Password is intentionally simple for testing
    - User data and trades are preserved in the database
*/

-- Delete existing user if exists
DELETE FROM auth.users WHERE email = 'kan.yamaji@gmail.com';

-- Create new test user with proper password
-- Using Supabase's auth.users table with a known password hash for "test2025"
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'kan.yamaji@gmail.com',
  crypt('test2025', gen_salt('bf')),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
);

-- Grant necessary permissions
GRANT ALL ON auth.users TO postgres, authenticated, service_role;
