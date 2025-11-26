/*
  # Supabase Auth修復 - トリガークリーンアップ

  ## 問題
  過去数日間、auth.usersテーブルへのトリガーを繰り返し作成・削除したことで、
  Supabase Auth内部のキャッシュまたはスキーマが破損した可能性がある。
  
  ## 解決策
  1. すべてのauth.users関連トリガーを完全に削除
  2. handle_new_user関数を削除
  3. user_settingsは手動作成（フロントエンド側で対応）

  ## セキュリティ
  - RLSポリシーは維持
  - user_settingsのセキュリティは変更なし
*/

-- 1. auth.usersへのすべてのトリガーを削除
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
DROP TRIGGER IF EXISTS handle_new_user_trigger ON auth.users CASCADE;

-- 2. handle_new_user関数を完全に削除
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- 3. 孤立したuser_settingsレコードをクリーンアップ（念のため）
DELETE FROM user_settings 
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- 4. 確認：トリガーが存在しないことを確認
DO $$
DECLARE
  trigger_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO trigger_count
  FROM information_schema.triggers
  WHERE event_object_schema = 'auth' 
    AND event_object_table = 'users';
  
  IF trigger_count > 0 THEN
    RAISE WARNING 'auth.users triggers still exist: %', trigger_count;
  ELSE
    RAISE NOTICE 'auth.users triggers successfully cleaned up';
  END IF;
END $$;
