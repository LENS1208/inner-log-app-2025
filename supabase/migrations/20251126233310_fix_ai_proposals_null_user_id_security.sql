/*
  # ai_proposalsテーブルのuser_id = NULLレコードへのアクセス制御を修正

  ## セキュリティ問題
  現在のポリシー "user_id IS NULL OR user_id = auth.uid()" により、
  user_id = NULL のレコードが全ユーザーに見える状態。

  ## 解決策
  user_id IS NULL のレコードは削除し、今後は必ずuser_idを設定する。
  ポリシーをシンプルに "user_id = auth.uid()" のみに変更。

  ## 変更内容
  1. user_id = NULL のレコードを削除（孤児レコード）
  2. ポリシーを修正して user_id = auth.uid() のみに制限
*/

-- user_id = NULL のレコードを削除（孤児レコード）
DELETE FROM ai_proposals WHERE user_id IS NULL;

-- ai_proposalsの既存ポリシーを削除
DROP POLICY IF EXISTS "Users can view own proposals" ON ai_proposals;
DROP POLICY IF EXISTS "Users can insert own proposals" ON ai_proposals;
DROP POLICY IF EXISTS "Users can update own proposals" ON ai_proposals;
DROP POLICY IF EXISTS "Users can delete own proposals" ON ai_proposals;

-- 安全なポリシーを再作成（user_id = auth.uid() のみ）
CREATE POLICY "Users can view own proposals"
  ON ai_proposals FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own proposals"
  ON ai_proposals FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own proposals"
  ON ai_proposals FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own proposals"
  ON ai_proposals FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- user_idカラムをNOT NULLに変更して将来の問題を防ぐ
ALTER TABLE ai_proposals ALTER COLUMN user_id SET NOT NULL;
