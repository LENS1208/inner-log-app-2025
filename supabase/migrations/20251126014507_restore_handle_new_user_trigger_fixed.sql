/*
  # handle_new_userトリガーを安全に復元

  ## 問題の原因
  先ほどトリガーを削除したことで、システムの一貫性が損なわれた可能性がある
  
  ## 修正内容
  1. トリガー関数を復元（SECURITY DEFINERは削除）
  2. トリガーを復元
  
  ## 重要な変更
  - SECURITY DEFINERを使用せず、通常の権限で実行
  - エラーハンドリングを追加
*/

-- 1. トリガー関数を作成（SECURITY DEFINERなし）
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- 新規ユーザーのデフォルト設定を作成
  -- エラーが発生しても処理を続行
  BEGIN
    INSERT INTO public.user_settings (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION
    WHEN OTHERS THEN
      -- エラーをログに記録するが、トリガーは成功させる
      RAISE WARNING 'Failed to create user_settings for user %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

-- 2. トリガーを作成
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
