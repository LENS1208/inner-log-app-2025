/*
  # 破損したkan.yamaji@gmail.comユーザーを修復 v3

  ## 解決策
  emailカラムは生成カラムなので除外
*/

DO $$
DECLARE
  old_user_id uuid;
  new_user_id uuid;
BEGIN
  SELECT id INTO old_user_id FROM auth.users WHERE email = 'kan.yamaji@gmail.com';
  IF old_user_id IS NULL THEN RETURN; END IF;

  DELETE FROM auth.users WHERE id = old_user_id;
  new_user_id := gen_random_uuid();
  
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data,
    is_super_admin, role
  ) VALUES (
    new_user_id, '00000000-0000-0000-0000-000000000000',
    'kan.yamaji@gmail.com', crypt('test2025', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    false, 'authenticated'
  );

  INSERT INTO auth.identities (
    provider_id, user_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  ) VALUES (
    new_user_id::text, new_user_id,
    jsonb_build_object(
      'sub', new_user_id::text,
      'email', 'kan.yamaji@gmail.com',
      'email_verified', true,
      'phone_verified', false
    ),
    'email', now(), now(), now()
  );

  UPDATE user_settings SET user_id = new_user_id WHERE user_id = old_user_id;
  UPDATE trades SET user_id = new_user_id WHERE user_id = old_user_id;
  UPDATE daily_notes SET user_id = new_user_id WHERE user_id = old_user_id;
  UPDATE trade_notes SET user_id = new_user_id WHERE user_id = old_user_id;
  UPDATE account_transactions SET user_id = new_user_id WHERE user_id = old_user_id;
  UPDATE account_summary SET user_id = new_user_id WHERE user_id = old_user_id;

  RAISE NOTICE 'User recreated: %', new_user_id;
END $$;
