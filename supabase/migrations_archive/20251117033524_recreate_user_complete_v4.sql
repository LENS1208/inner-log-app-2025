/*
  # Recreate User Complete (v4)

  This migration completely recreates the test user with all required fields.
  
  1. Changes
    - Deletes existing user and identity
    - Recreates with proper password and identity
    - Email: takuan_1000@yahoo.co.jp
    - Password: test2025
  
  2. Data Integrity
    - Maintains user_id for trade data relationships
    - Creates proper identity record
*/

-- Delete existing records
DELETE FROM auth.identities WHERE user_id = '4e4b6842-84ea-45a4-a8d0-e31a133bf054';
DELETE FROM auth.users WHERE id = '4e4b6842-84ea-45a4-a8d0-e31a133bf054';

-- Recreate user
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
  '4e4b6842-84ea-45a4-a8d0-e31a133bf054'::uuid,
  'authenticated',
  'authenticated',
  'takuan_1000@yahoo.co.jp',
  crypt('test2025', gen_salt('bf')),
  NOW(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb,
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
);

-- Create corresponding identity with provider_id
INSERT INTO auth.identities (
  id,
  provider_id,
  user_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
VALUES (
  gen_random_uuid(),
  '4e4b6842-84ea-45a4-a8d0-e31a133bf054',
  '4e4b6842-84ea-45a4-a8d0-e31a133bf054'::uuid,
  jsonb_build_object(
    'sub', '4e4b6842-84ea-45a4-a8d0-e31a133bf054',
    'email', 'takuan_1000@yahoo.co.jp',
    'email_verified', true,
    'provider', 'email'
  ),
  'email',
  NOW(),
  NOW(),
  NOW()
);
