/*
  # user_settingsのNOT NULL制約を修正

  ## 問題
  user_id列にNOT NULL制約を追加したことで、
  Supabase Authとの統合に問題が発生している可能性がある

  ## 解決策
  1. NOT NULL制約を一旦削除
  2. デフォルト値を設定せず、トリガーで確実にuser_idを設定
  3. UNIQUE制約は維持（1ユーザー1設定）

  ## セキュリティ
  - RLSポリシーは維持
  - トリガーによる自動作成は継続
*/

-- user_id列のNOT NULL制約を削除
ALTER TABLE user_settings
ALTER COLUMN user_id DROP NOT NULL;

-- トリガー関数を再作成（確実にuser_idを設定）
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- 新規ユーザーのデフォルト設定を作成
  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 既存のトリガーを確認・再作成
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
