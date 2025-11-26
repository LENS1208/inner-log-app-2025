/*
  # 動作確認用テストユーザーを作成 v2
  
  Email: test@example.com
  Password: Password123!
*/

DO $$
DECLARE
  new_user_id uuid;
BEGIN
  DELETE FROM auth.users WHERE email = 'test@example.com';
  new_user_id := gen_random_uuid();
  
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data,
    is_super_admin, role
  ) VALUES (
    new_user_id, '00000000-0000-0000-0000-000000000000',
    'test@example.com', crypt('Password123!', gen_salt('bf')),
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
      'email', 'test@example.com',
      'email_verified', true,
      'phone_verified', false
    ),
    'email', now(), now(), now()
  );

  INSERT INTO user_settings (user_id) VALUES (new_user_id) ON CONFLICT DO NOTHING;
  RAISE NOTICE 'User created: test@example.com';
END $$;
