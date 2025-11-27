/*
  # user_settingsの自動作成トリガーを復元

  ## 問題
  - user_settingsの自動作成トリガーが存在しない
  - 新規ユーザー登録時に自動的にuser_settingsが作成されない
  
  ## 対応
  - handle_new_user関数を再作成
  - auth.usersのINSERTトリガーを再作成
*/

-- 既存の関数とトリガーを削除
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 新規ユーザー作成時にuser_settingsを自動作成する関数
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- トリガーを作成
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
