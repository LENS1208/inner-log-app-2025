/*
  # ユーザー設定自動作成トリガーの修正

  1. 問題
    - 新規ユーザー登録時にuser_settingsレコードが自動作成されない
    - トリガーが存在しないため「Database error saving new user」エラーが発生

  2. 解決策
    - トリガー関数を作成
    - auth.usersテーブルにトリガーを設定
    - SECURITY DEFINERでRLSをバイパス
*/

-- トリガー関数を作成（すでに存在する場合は再作成）
CREATE OR REPLACE FUNCTION public.create_user_settings()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.user_settings (user_id, language, coach_avatar_preset)
  VALUES (NEW.id, 'ja', 'male1')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- エラーが発生してもユーザー登録を継続
    RAISE WARNING 'Failed to create user_settings for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- 既存のトリガーを削除
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 新しいトリガーを作成
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_user_settings();

-- トリガー関数に実行権限を付与
GRANT EXECUTE ON FUNCTION public.create_user_settings() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_user_settings() TO service_role;
