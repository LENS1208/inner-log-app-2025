/*
  # Recreate test user with valid password

  1. Purpose
    - Delete existing test user
    - Create new test user with password 'testtest' (6+ characters)
    - Email: kan.yamaji@gmail.com

  2. Notes
    - Password changed from 'test' to 'testtest' to meet 6-character minimum requirement
*/

DO $$
DECLARE
  new_user_id uuid;
  new_identity_id uuid;
  existing_user_id uuid;
BEGIN
  -- Find and delete existing user
  SELECT id INTO existing_user_id FROM auth.users WHERE email = 'kan.yamaji@gmail.com';
  
  IF existing_user_id IS NOT NULL THEN
    DELETE FROM user_settings WHERE user_settings.user_id = existing_user_id;
    DELETE FROM auth.identities WHERE auth.identities.user_id = existing_user_id;
    DELETE FROM auth.users WHERE auth.users.id = existing_user_id;
  END IF;

  -- Generate UUIDs
  new_user_id := gen_random_uuid();
  new_identity_id := gen_random_uuid();

  -- Insert user into auth.users with new password
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
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    new_user_id,
    'authenticated',
    'authenticated',
    'kan.yamaji@gmail.com',
    crypt('testtest', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"trader_name":"テストユーザー"}'::jsonb,
    NOW(),
    NOW(),
    '',
    ''
  );

  -- Create identity for the user
  INSERT INTO auth.identities (
    id,
    user_id,
    provider_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    new_identity_id,
    new_user_id,
    new_user_id::text,
    format('{"sub":"%s","email":"%s","email_verified":true,"phone_verified":false}', new_user_id::text, 'kan.yamaji@gmail.com')::jsonb,
    'email',
    NOW(),
    NOW(),
    NOW()
  );

  -- Create default settings for the user
  INSERT INTO user_settings (
    user_id,
    data_source,
    default_dataset,
    language,
    timezone,
    time_format,
    currency,
    initial_capital
  ) VALUES (
    new_user_id,
    'demo',
    'A',
    'ja',
    'Asia/Tokyo',
    '24h',
    'JPY',
    1000000
  );

  RAISE NOTICE 'Test user recreated successfully with ID: %. Password: testtest', new_user_id;
END $$;