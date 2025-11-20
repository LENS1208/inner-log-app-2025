/*
  # Create test user account

  1. Purpose
    - Create a test user account for development and testing
    - Email: kan.yamaji@gmail.com
    - Password: test (hashed)

  2. Notes
    - This is a development/test account
    - Password is intentionally simple for testing purposes
    - Uses Supabase's auth.users system
*/

DO $$
DECLARE
  user_id uuid;
  identity_id uuid;
BEGIN
  -- Check if user already exists
  SELECT id INTO user_id FROM auth.users WHERE email = 'kan.yamaji@gmail.com';
  
  IF user_id IS NULL THEN
    -- Generate UUIDs
    user_id := gen_random_uuid();
    identity_id := gen_random_uuid();

    -- Insert user into auth.users
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
      user_id,
      'authenticated',
      'authenticated',
      'kan.yamaji@gmail.com',
      crypt('test', gen_salt('bf')),
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
      identity_id,
      user_id,
      user_id::text,
      format('{"sub":"%s","email":"%s"}', user_id::text, 'kan.yamaji@gmail.com')::jsonb,
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
      user_id,
      'demo',
      'A',
      'ja',
      'Asia/Tokyo',
      '24h',
      'JPY',
      1000000
    );

    RAISE NOTICE 'Test user created successfully with ID: %', user_id;
  ELSE
    RAISE NOTICE 'Test user already exists with ID: %', user_id;
  END IF;
END $$;