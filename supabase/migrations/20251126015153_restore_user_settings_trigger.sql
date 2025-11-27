/*
  # user_settingsのupdated_atトリガーを復元

  ## 目的
  user_settingsテーブルのupdated_at列を自動更新するトリガーを復元
  このトリガーはauth.usersとは無関係で安全
*/

-- 1. トリガー関数を作成
CREATE OR REPLACE FUNCTION public.update_user_settings_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 2. トリガーを作成
DROP TRIGGER IF EXISTS user_settings_updated_at ON user_settings;
CREATE TRIGGER user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_user_settings_updated_at();
