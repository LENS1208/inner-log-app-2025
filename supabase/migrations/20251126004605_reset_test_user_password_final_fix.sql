/*
  # テストユーザーのパスワードを再設定

  ## 変更内容
  - kan.yamaji@gmail.comのパスワードを「Test1234」にリセット
  - Supabaseの標準パスワードハッシュ形式を使用

  ## セキュリティ
  - テスト環境専用
*/

-- パスワードをリセット（Test1234）
UPDATE auth.users
SET 
  encrypted_password = crypt('Test1234', gen_salt('bf')),
  updated_at = now()
WHERE email = 'kan.yamaji@gmail.com';
