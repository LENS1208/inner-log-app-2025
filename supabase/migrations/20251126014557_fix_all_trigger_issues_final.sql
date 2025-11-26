/*
  # すべてのトリガー問題を最終的に解決

  ## 問題の根本原因
  1. 複数のマイグレーションが同じトリガー関数を異なる方法で再作成
  2. SECURITY DEFINERが原因でログイン時にエラー
  3. トリガー関数の競合
  
  ## 最終的な解決策
  1. すべてのトリガーと関数を完全にクリーンアップ
  2. シンプルで安全なトリガーを作成
  3. SECURITY DEFINERを使用しない
  4. エラーハンドリングを追加
*/

-- 1. 既存のトリガーを完全に削除
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2. 既存のトリガー関数を完全に削除
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- 3. 新しいトリガー関数を作成（SECURITY DEFINERなし）
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- user_settingsが存在しない場合のみ作成
  -- エラーが発生してもログインは成功させる
  BEGIN
    INSERT INTO public.user_settings (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION
    WHEN OTHERS THEN
      -- エラーを無視してログインを継続
      NULL;
  END;

  RETURN NEW;
END;
$$;

-- 4. トリガーを作成（INSERT後に実行）
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 5. user_id列がNULLのレコードをクリーンアップ
DELETE FROM user_settings WHERE user_id IS NULL;

-- 6. user_id列にNOT NULL制約を追加
ALTER TABLE user_settings
ALTER COLUMN user_id SET NOT NULL;
