/*
  # handle_new_userトリガーを削除してログイン問題を解決

  ## 問題
  handle_new_user関数がSECURITY DEFINERで実行され、
  ログイン時に"Database error querying schema"エラーを引き起こしている

  ## 修正内容
  1. トリガーを削除
  2. トリガー関数を削除
  
  ## 代替策
  フロントエンドでuser_settingsが存在しない場合は自動的に作成する
*/

-- トリガーを削除
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- トリガー関数を削除
DROP FUNCTION IF EXISTS public.handle_new_user();
