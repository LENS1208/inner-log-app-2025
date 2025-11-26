/*
  # テストユーザーの作成

  既知のパスワードでログインできるテストユーザーを作成します。

  1. ユーザー情報
    - Email: test@innerlog.app
    - Password: testpass123
    - 自動的にメール確認済み

  2. セキュリティ
    - これはテスト/開発用アカウントです
    - 本番環境では削除してください
*/

-- 既存のtest@innerlog.appユーザーを削除（存在する場合）
DELETE FROM auth.users WHERE email = 'test@innerlog.app';

-- テストユーザーを作成
-- パスワードは 'testpass123'
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  aud,
  role,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token
)
VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'test@innerlog.app',
  crypt('testpass123', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"name":"Test User"}',
  'authenticated',
  'authenticated',
  now(),
  now(),
  '',
  ''
);

-- user_settingsレコードを作成
INSERT INTO user_settings (user_id)
SELECT id FROM auth.users WHERE email = 'test@innerlog.app';
