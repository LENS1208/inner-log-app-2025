/*
  # すべてのトリガーを完全に無効化してログインを修復

  ## 緊急対応
  「Database error querying schema」エラーは、トリガー関数が
  auth.usersテーブルにアクセスする際の権限問題が原因
  
  ## 解決策
  1. すべてのトリガーを完全に削除
  2. トリガー関数を完全に削除
  3. user_settingsは手動またはフロントエンドで作成
*/

-- 1. トリガーを完全に削除
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;

-- 2. トリガー関数を完全に削除
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- 3. 関連する可能性のある他の関数も削除
DROP FUNCTION IF EXISTS public.update_user_settings_updated_at() CASCADE;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
