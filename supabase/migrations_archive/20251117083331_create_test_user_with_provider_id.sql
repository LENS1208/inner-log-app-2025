/*
  # Create Test User Account

  1. Purpose
    - Create a test user account with email: kan.yamaji@gmail.com
    - Password: test2025
    - Email confirmed and ready to use

  2. Details
    - Uses Supabase's auth.users table
    - Password is properly hashed using crypt with bcrypt
    - Email is auto-confirmed for immediate login
    - Identity record includes required provider_id field
*/

-- Delete existing user if exists
DELETE FROM auth.identities WHERE user_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
DELETE FROM auth.users WHERE email = 'kan.yamaji@gmail.com';

-- Create the test user with proper bcrypt password hash
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'authenticated',
  'authenticated',
  'kan.yamaji@gmail.com',
  crypt('test2025', gen_salt('bf')),
  NOW(),
  NOW(),
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

-- Create identity record with provider_id
INSERT INTO auth.identities (
  provider_id,
  id,
  user_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
) VALUES (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  '{"sub":"a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11","email":"kan.yamaji@gmail.com"}',
  'email',
  NOW(),
  NOW(),
  NOW()
);
