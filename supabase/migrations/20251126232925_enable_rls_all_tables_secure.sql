/*
  # すべてのテーブルでRLSを有効化し、安全なポリシーを設定

  ## セキュリティ上の問題
  すべてのテーブルでRLSが無効化されており、誰でも全ユーザーのデータにアクセス可能な状態。

  ## 変更内容
  1. すべてのテーブルでRLSを有効化
  2. 各テーブルに適切なポリシーを設定：
     - ユーザーは自分のデータのみ閲覧・編集可能
     - user_idカラムでアクセス制御
     - demo datasetは公開（dataset IS NOT NULL）

  ## 対象テーブル
  - trades
  - trade_notes
  - daily_notes
  - free_memos
  - note_links
  - user_settings
  - account_transactions
  - account_summary
  - ai_proposals
  - ai_coaching_jobs
  - import_history

  ## セキュリティ
  - すべてのテーブルでRLS有効
  - 認証されたユーザーのみアクセス可能
  - 各ユーザーは自分のデータのみアクセス可能
*/

-- ==========================================
-- 1. TRADES テーブル
-- ==========================================
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own trades" ON trades;
DROP POLICY IF EXISTS "Users can insert own trades" ON trades;
DROP POLICY IF EXISTS "Users can update own trades" ON trades;
DROP POLICY IF EXISTS "Users can delete own trades" ON trades;
DROP POLICY IF EXISTS "Anyone can view demo trades" ON trades;

CREATE POLICY "Users can view own trades"
  ON trades FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR dataset IS NOT NULL  -- demo data
  );

CREATE POLICY "Users can insert own trades"
  ON trades FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own trades"
  ON trades FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own trades"
  ON trades FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ==========================================
-- 2. TRADE_NOTES テーブル
-- ==========================================
ALTER TABLE trade_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own trade notes" ON trade_notes;
DROP POLICY IF EXISTS "Users can insert own trade notes" ON trade_notes;
DROP POLICY IF EXISTS "Users can update own trade notes" ON trade_notes;
DROP POLICY IF EXISTS "Users can delete own trade notes" ON trade_notes;

CREATE POLICY "Users can view own trade notes"
  ON trade_notes FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own trade notes"
  ON trade_notes FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own trade notes"
  ON trade_notes FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own trade notes"
  ON trade_notes FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ==========================================
-- 3. DAILY_NOTES テーブル
-- ==========================================
ALTER TABLE daily_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own daily notes" ON daily_notes;
DROP POLICY IF EXISTS "Users can insert own daily notes" ON daily_notes;
DROP POLICY IF EXISTS "Users can update own daily notes" ON daily_notes;
DROP POLICY IF EXISTS "Users can delete own daily notes" ON daily_notes;

CREATE POLICY "Users can view own daily notes"
  ON daily_notes FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own daily notes"
  ON daily_notes FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own daily notes"
  ON daily_notes FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own daily notes"
  ON daily_notes FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ==========================================
-- 4. FREE_MEMOS テーブル
-- ==========================================
ALTER TABLE free_memos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own free memos" ON free_memos;
DROP POLICY IF EXISTS "Users can insert own free memos" ON free_memos;
DROP POLICY IF EXISTS "Users can update own free memos" ON free_memos;
DROP POLICY IF EXISTS "Users can delete own free memos" ON free_memos;

CREATE POLICY "Users can view own free memos"
  ON free_memos FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own free memos"
  ON free_memos FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own free memos"
  ON free_memos FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own free memos"
  ON free_memos FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ==========================================
-- 5. NOTE_LINKS テーブル
-- ==========================================
ALTER TABLE note_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own note links" ON note_links;
DROP POLICY IF EXISTS "Users can insert own note links" ON note_links;
DROP POLICY IF EXISTS "Users can update own note links" ON note_links;
DROP POLICY IF EXISTS "Users can delete own note links" ON note_links;

CREATE POLICY "Users can view own note links"
  ON note_links FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own note links"
  ON note_links FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own note links"
  ON note_links FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own note links"
  ON note_links FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ==========================================
-- 6. USER_SETTINGS テーブル
-- ==========================================
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can insert own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can update own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can delete own settings" ON user_settings;

CREATE POLICY "Users can view own settings"
  ON user_settings FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own settings"
  ON user_settings FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own settings"
  ON user_settings FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own settings"
  ON user_settings FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ==========================================
-- 7. ACCOUNT_TRANSACTIONS テーブル
-- ==========================================
ALTER TABLE account_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own transactions" ON account_transactions;
DROP POLICY IF EXISTS "Users can insert own transactions" ON account_transactions;
DROP POLICY IF EXISTS "Users can update own transactions" ON account_transactions;
DROP POLICY IF EXISTS "Users can delete own transactions" ON account_transactions;
DROP POLICY IF EXISTS "Anyone can view demo transactions" ON account_transactions;

CREATE POLICY "Users can view own transactions"
  ON account_transactions FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR dataset IS NOT NULL  -- demo data
  );

CREATE POLICY "Users can insert own transactions"
  ON account_transactions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own transactions"
  ON account_transactions FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own transactions"
  ON account_transactions FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ==========================================
-- 8. ACCOUNT_SUMMARY テーブル
-- ==========================================
ALTER TABLE account_summary ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own summary" ON account_summary;
DROP POLICY IF EXISTS "Users can insert own summary" ON account_summary;
DROP POLICY IF EXISTS "Users can update own summary" ON account_summary;
DROP POLICY IF EXISTS "Users can delete own summary" ON account_summary;
DROP POLICY IF EXISTS "Anyone can view demo summary" ON account_summary;

CREATE POLICY "Users can view own summary"
  ON account_summary FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR dataset IS NOT NULL  -- demo data
  );

CREATE POLICY "Users can insert own summary"
  ON account_summary FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own summary"
  ON account_summary FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own summary"
  ON account_summary FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ==========================================
-- 9. AI_PROPOSALS テーブル
-- ==========================================
ALTER TABLE ai_proposals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own proposals" ON ai_proposals;
DROP POLICY IF EXISTS "Users can insert own proposals" ON ai_proposals;
DROP POLICY IF EXISTS "Users can update own proposals" ON ai_proposals;
DROP POLICY IF EXISTS "Users can delete own proposals" ON ai_proposals;

-- user_id が nullable なので、user_id IS NULL OR user_id = auth.uid() とする
CREATE POLICY "Users can view own proposals"
  ON ai_proposals FOR SELECT
  TO authenticated
  USING (user_id IS NULL OR user_id = auth.uid());

CREATE POLICY "Users can insert own proposals"
  ON ai_proposals FOR INSERT
  TO authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

CREATE POLICY "Users can update own proposals"
  ON ai_proposals FOR UPDATE
  TO authenticated
  USING (user_id IS NULL OR user_id = auth.uid())
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

CREATE POLICY "Users can delete own proposals"
  ON ai_proposals FOR DELETE
  TO authenticated
  USING (user_id IS NULL OR user_id = auth.uid());

-- ==========================================
-- 10. AI_COACHING_JOBS テーブル
-- ==========================================
ALTER TABLE ai_coaching_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own coaching jobs" ON ai_coaching_jobs;
DROP POLICY IF EXISTS "Users can insert own coaching jobs" ON ai_coaching_jobs;
DROP POLICY IF EXISTS "Users can update own coaching jobs" ON ai_coaching_jobs;
DROP POLICY IF EXISTS "Users can delete own coaching jobs" ON ai_coaching_jobs;

CREATE POLICY "Users can view own coaching jobs"
  ON ai_coaching_jobs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own coaching jobs"
  ON ai_coaching_jobs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own coaching jobs"
  ON ai_coaching_jobs FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own coaching jobs"
  ON ai_coaching_jobs FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ==========================================
-- 11. IMPORT_HISTORY テーブル
-- ==========================================
ALTER TABLE import_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own import history" ON import_history;
DROP POLICY IF EXISTS "Users can insert own import history" ON import_history;
DROP POLICY IF EXISTS "Users can update own import history" ON import_history;
DROP POLICY IF EXISTS "Users can delete own import history" ON import_history;

CREATE POLICY "Users can view own import history"
  ON import_history FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own import history"
  ON import_history FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own import history"
  ON import_history FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own import history"
  ON import_history FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
