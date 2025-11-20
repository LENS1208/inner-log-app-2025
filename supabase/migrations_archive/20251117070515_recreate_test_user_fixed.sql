/*
  # Recreate Test User - Fixed
  
  1. Changes
    - Delete existing test user and all related data
    - Create fresh test user with proper password and identity
    
  2. Security
    - This is for test user only
*/

-- Store user_id before deletion
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Get user_id
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'test@innerlog.app';
  
  IF v_user_id IS NOT NULL THEN
    -- Delete all related data
    DELETE FROM user_settings WHERE user_id = v_user_id;
    DELETE FROM trades WHERE user_id = v_user_id;
    DELETE FROM trade_notes WHERE user_id = v_user_id;
    DELETE FROM daily_notes WHERE user_id = v_user_id;
    DELETE FROM ai_proposals WHERE user_id = v_user_id;
    DELETE FROM ai_coaching_jobs WHERE user_id = v_user_id;
    DELETE FROM account_summary WHERE user_id = v_user_id;
    DELETE FROM account_transactions WHERE user_id = v_user_id;
    DELETE FROM import_history WHERE user_id = v_user_id;
    
    -- Delete identities
    DELETE FROM auth.identities WHERE user_id = v_user_id;
    
    -- Delete the user
    DELETE FROM auth.users WHERE id = v_user_id;
  END IF;
END $$;

-- Create new user with proper password
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
    created_at,
    updated_at,
    confirmation_token,
    raw_app_meta_data,
    raw_user_meta_data
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_user_id,
    'authenticated',
    'authenticated',
    'test@innerlog.app',
    crypt('test2025', gen_salt('bf')),
    now(),
    now(),
    now(),
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb
  );

  -- Create identity record
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
    jsonb_build_object('sub', v_user_id::text, 'email', 'test@innerlog.app'),
    'email',
    now(),
    now(),
    now()
  );
END $$;
