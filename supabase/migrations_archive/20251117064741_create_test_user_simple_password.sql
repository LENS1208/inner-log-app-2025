/*
  # Create test user with simple password

  1. Creates test@innerlog.app user with password: testpass2025
  2. Updates password hash directly for testing purposes
  
  Security Note: This is for development/testing only
*/

-- Delete existing test user if exists
DELETE FROM auth.users WHERE email = 'test@innerlog.app';

-- Insert new user with proper structure
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
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'test@innerlog.app',
  crypt('testpass2025', gen_salt('bf')),
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

-- Create user_settings entry for the new user
INSERT INTO user_settings (user_id, language, theme)
SELECT id, 'ja', 'light'
FROM auth.users
WHERE email = 'test@innerlog.app'
ON CONFLICT (user_id) DO NOTHING;
