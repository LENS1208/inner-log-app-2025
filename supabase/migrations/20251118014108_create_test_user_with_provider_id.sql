/*
  # Create test user account

  1. Creates test user with email/password authentication
    - Email: kan.yamaji@gmail.com
    - Password: test2025
    - Auto-confirmed email (no verification needed)
  
  2. Security
    - User can immediately log in without email verification
*/

DO $$
DECLARE
  new_user_id uuid;
BEGIN
  -- Delete existing user if exists
  DELETE FROM auth.users WHERE email = 'kan.yamaji@gmail.com';
  
  -- Generate new user ID
  new_user_id := gen_random_uuid();
  
  -- Insert user into auth.users with proper password hashing
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
    new_user_id,
    'authenticated',
    'authenticated',
    'kan.yamaji@gmail.com',
    crypt('test2025', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

  -- Create corresponding identity with provider_id
  INSERT INTO auth.identities (
    provider_id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    new_user_id::text,
    new_user_id,
    format('{"sub":"%s","email":"kan.yamaji@gmail.com","email_verified":false,"phone_verified":false}', new_user_id::text)::jsonb,
    'email',
    now(),
    now(),
    now()
  );
  
  RAISE NOTICE 'Test user created with ID: %', new_user_id;
  
END $$;
