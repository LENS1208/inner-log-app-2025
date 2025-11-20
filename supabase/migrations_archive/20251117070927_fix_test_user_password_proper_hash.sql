/*
  # Fix Test User Password with Proper Hash
  
  1. Changes
    - Delete existing test user completely
    - Create new test user with properly formatted bcrypt hash
    
  2. Security
    - Uses bcrypt with proper cost factor (10)
    - Email is pre-confirmed
*/

-- Delete existing user and all related data
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'test@innerlog.app';
  
  IF v_user_id IS NOT NULL THEN
    DELETE FROM user_settings WHERE user_id = v_user_id;
    DELETE FROM trades WHERE user_id = v_user_id;
    DELETE FROM trade_notes WHERE user_id = v_user_id;
    DELETE FROM daily_notes WHERE user_id = v_user_id;
    DELETE FROM ai_proposals WHERE user_id = v_user_id;
    DELETE FROM ai_coaching_jobs WHERE user_id = v_user_id;
    DELETE FROM account_summary WHERE user_id = v_user_id;
    DELETE FROM account_transactions WHERE user_id = v_user_id;
    DELETE FROM import_history WHERE user_id = v_user_id;
    DELETE FROM auth.identities WHERE user_id = v_user_id;
    DELETE FROM auth.users WHERE id = v_user_id;
  END IF;
END $$;

-- Create new user with proper bcrypt hash
-- Password: test2025
-- Hash generated with cost factor 10
DO $$
DECLARE
  v_user_id uuid := gen_random_uuid();
BEGIN
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
    v_user_id,
    'authenticated',
    'authenticated',
    'test@innerlog.app',
    crypt('test2025', gen_salt('bf', 10)),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

  -- Create identity
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
    gen_random_uuid(),
    v_user_id,
    v_user_id::text,
    jsonb_build_object(
      'sub', v_user_id::text,
      'email', 'test@innerlog.app',
      'email_verified', true,
      'phone_verified', false
    ),
    'email',
    now(),
    now(),
    now()
  );
END $$;
