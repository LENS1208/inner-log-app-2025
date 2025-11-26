/*
  # 【緊急修正】user_settingsのセキュリティ問題を解決

  ## 問題の詳細
  1. user_id=NULLのレコードが存在
  2. 匿名ユーザー用のRLSポリシーが存在し、データが混在
  3. ログイン済みユーザーが別ユーザーのデータを見る可能性

  ## 修正内容
  1. データクリーンアップ
    - user_id=NULLのレコードを削除
  
  2. セキュリティ強化
    - 匿名ユーザー用のポリシーを全削除
    - user_id列をNOT NULL制約に変更
  
  3. 保持するポリシー
    - 認証済みユーザーのみが自分のデータにアクセス可能

  ## セキュリティ
  - RLSは有効なまま
  - 認証済みユーザーのみがアクセス可能
*/

-- 1. user_id=NULLのレコードを削除
DELETE FROM user_settings
WHERE user_id IS NULL;

-- 2. 危険な匿名ユーザー用ポリシーを削除
DROP POLICY IF EXISTS "Anonymous users can read demo settings" ON user_settings;
DROP POLICY IF EXISTS "Anonymous users can insert demo settings" ON user_settings;
DROP POLICY IF EXISTS "Anonymous users can update demo settings" ON user_settings;

-- 3. user_id列をNOT NULL制約に変更
ALTER TABLE user_settings
ALTER COLUMN user_id SET NOT NULL;

-- 4. 既存の安全なポリシーを確認（念のため再作成）
DROP POLICY IF EXISTS "Users can read own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can insert own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can update own settings" ON user_settings;

CREATE POLICY "Users can read own settings"
  ON user_settings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings"
  ON user_settings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
  ON user_settings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
