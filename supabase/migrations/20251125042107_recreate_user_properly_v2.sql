/*
  # Recreate user with proper authentication setup

  1. Purpose
    - Delete and recreate user to fix authentication issues
    - Email: kan.yamaji@gmail.com
    - Password: test2025
    - Properly set all required fields for Supabase Auth

  2. Changes
    - Delete existing user completely
    - Create new user with all proper auth fields
*/

DO $$
DECLARE
  new_user_id uuid;
  hashed_password text;
BEGIN
  -- Delete existing user and related data
  DELETE FROM auth.identities WHERE user_id IN (
    SELECT id FROM auth.users WHERE email = 'kan.yamaji@gmail.com'
  );
  DELETE FROM auth.users WHERE email = 'kan.yamaji@gmail.com';
  
  -- Generate new user ID and hash password
  new_user_id := gen_random_uuid();
  hashed_password := crypt('test2025', gen_salt('bf'));
  
  -- Insert user with all required fields
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    confirmation_sent_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    created_at,
    updated_at,
    phone,
    phone_confirmed_at,
    phone_change,
    phone_change_token,
    phone_change_sent_at,
    email_change,
    email_change_token_new,
    email_change_token_current,
    email_change_confirm_status,
    banned_until,
    reauthentication_token,
    reauthentication_sent_at,
    is_sso_user,
    deleted_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    new_user_id,
    'authenticated',
    'authenticated',
    'kan.yamaji@gmail.com',
    hashed_password,
    now(), -- email_confirmed_at
    now(), -- confirmation_sent_at
    NULL,  -- recovery_sent_at
    NULL,  -- last_sign_in_at
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    false, -- is_super_admin
    now(), -- created_at
    now(), -- updated_at
    NULL,  -- phone
    NULL,  -- phone_confirmed_at
    '',    -- phone_change
    '',    -- phone_change_token
    NULL,  -- phone_change_sent_at
    '',    -- email_change
    '',    -- email_change_token_new
    '',    -- email_change_token_current
    0,     -- email_change_confirm_status
    NULL,  -- banned_until
    '',    -- reauthentication_token
    NULL,  -- reauthentication_sent_at
    false, -- is_sso_user
    NULL   -- deleted_at
  );

  -- Create identity
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
    jsonb_build_object(
      'sub', new_user_id::text,
      'email', 'kan.yamaji@gmail.com',
      'email_verified', true,
      'phone_verified', false
    ),
    'email',
    now(),
    now(),
    now()
  );
  
  RAISE NOTICE 'User recreated successfully with ID: %', new_user_id;
  
END $$;
