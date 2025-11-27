/*
  # 危険なPublic Accessポリシーをすべて削除し、正しいRLSポリシーを適用

  ## 問題
  - すべてのテーブルに`USING (true)`の危険なポリシーが設定されていた
  - 誰でも全ユーザーのデータにアクセス可能な状態だった

  ## 修正内容
  1. すべての危険な"Public access"ポリシーを削除
  2. 各テーブルに正しいauth.uid()ベースのポリシーを設定
  3. デモデータへの読み取りアクセスは維持

  ## セキュリティ原則
  - 認証済みユーザーは自分のデータのみアクセス可能
  - デモデータ(dataset='A','B','C')は誰でも読み取り可能
  - ユーザーデータ(dataset=null)は所有者のみアクセス可能
*/

-- ============================================================
-- STEP 1: 危険なPublic Accessポリシーをすべて削除
-- ============================================================

DROP POLICY IF EXISTS "Public access to trades" ON trades;
DROP POLICY IF EXISTS "Public access to trade_notes" ON trade_notes;
DROP POLICY IF EXISTS "Public access to daily_notes" ON daily_notes;
DROP POLICY IF EXISTS "Public access to free_memos" ON free_memos;
DROP POLICY IF EXISTS "Public access to note_links" ON note_links;
DROP POLICY IF EXISTS "Public access to user_settings" ON user_settings;
DROP POLICY IF EXISTS "Public access to account_transactions" ON account_transactions;
DROP POLICY IF EXISTS "Public access to account_summary" ON account_summary;
DROP POLICY IF EXISTS "Public access to ai_proposals" ON ai_proposals;
DROP POLICY IF EXISTS "Public access to ai_coaching_jobs" ON ai_coaching_jobs;
DROP POLICY IF EXISTS "Public access to import_history" ON import_history;

-- ============================================================
-- STEP 2: trade_notes - 正しいポリシーを設定
-- ============================================================

CREATE POLICY "Users can view own trade notes"
  ON trade_notes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own trade notes"
  ON trade_notes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own trade notes"
  ON trade_notes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own trade notes"
  ON trade_notes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================
-- STEP 3: daily_notes - 正しいポリシーを設定
-- ============================================================

CREATE POLICY "Users can view own daily notes"
  ON daily_notes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily notes"
  ON daily_notes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own daily notes"
  ON daily_notes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own daily notes"
  ON daily_notes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================
-- STEP 4: free_memos - 正しいポリシーを設定
-- ============================================================

CREATE POLICY "Users can view own free memos"
  ON free_memos FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own free memos"
  ON free_memos FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own free memos"
  ON free_memos FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own free memos"
  ON free_memos FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================
-- STEP 5: note_links - 正しいポリシーを設定
-- ============================================================

CREATE POLICY "Users can view own note links"
  ON note_links FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own note links"
  ON note_links FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own note links"
  ON note_links FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own note links"
  ON note_links FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================
-- STEP 6: account_transactions - datasetベースのポリシー
-- ============================================================

CREATE POLICY "Anyone can view demo account transactions"
  ON account_transactions FOR SELECT
  TO public
  USING (dataset IN ('A', 'B', 'C'));

CREATE POLICY "Users can view own account transactions"
  ON account_transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own account transactions"
  ON account_transactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own account transactions"
  ON account_transactions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own account transactions"
  ON account_transactions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================
-- STEP 7: account_summary - datasetベースのポリシー
-- ============================================================

CREATE POLICY "Anyone can view demo account summary"
  ON account_summary FOR SELECT
  TO public
  USING (dataset IN ('A', 'B', 'C'));

CREATE POLICY "Users can view own account summary"
  ON account_summary FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own account summary"
  ON account_summary FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own account summary"
  ON account_summary FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own account summary"
  ON account_summary FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================
-- STEP 8: ai_proposals - 正しいポリシーを設定
-- ============================================================

CREATE POLICY "Users can view own ai proposals"
  ON ai_proposals FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own ai proposals"
  ON ai_proposals FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ai proposals"
  ON ai_proposals FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own ai proposals"
  ON ai_proposals FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================
-- STEP 9: ai_coaching_jobs - 正しいポリシーを設定
-- ============================================================

CREATE POLICY "Users can view own ai coaching jobs"
  ON ai_coaching_jobs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own ai coaching jobs"
  ON ai_coaching_jobs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ai coaching jobs"
  ON ai_coaching_jobs FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own ai coaching jobs"
  ON ai_coaching_jobs FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================
-- STEP 10: import_history - 正しいポリシーを設定
-- ============================================================

CREATE POLICY "Users can view own import history"
  ON import_history FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own import history"
  ON import_history FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own import history"
  ON import_history FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own import history"
  ON import_history FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
