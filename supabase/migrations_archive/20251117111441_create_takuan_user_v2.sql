/*
  # Create takuan_1000@yahoo.co.jp user

  Creates a new user with email takuan_1000@yahoo.co.jp and password test2025.
  
  1. New User
    - Email: takuan_1000@yahoo.co.jp
    - Password: test2025
    - Email confirmed automatically
    
  2. Security
    - User settings will be auto-created via trigger
*/

DO $$
DECLARE
  user_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM auth.users WHERE email = 'takuan_1000@yahoo.co.jp'
  ) INTO user_exists;

  IF NOT user_exists THEN
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
      'takuan_1000@yahoo.co.jp',
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
  END IF;
END $$;
