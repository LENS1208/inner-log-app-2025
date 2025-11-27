/*
  # user_settingsテーブルのRLSポリシーを修正

  ## 問題
  - 現在、危険な "USING (true)" ポリシーが存在
  - 全ユーザーが全ての設定にアクセスできる状態
  
  ## 対応
  - 危険なポリシーを削除
  - 適切なRLSポリシーを追加（ユーザーは自分の設定のみアクセス可能）
*/

-- 既存の危険なポリシーを削除
DROP POLICY IF EXISTS "Public access to user_settings" ON user_settings;
DROP POLICY IF EXISTS "Users can manage own settings" ON user_settings;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON user_settings;

-- 適切なRLSポリシーを追加
CREATE POLICY "Users can view own settings"
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

CREATE POLICY "Users can delete own settings"
  ON user_settings FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
