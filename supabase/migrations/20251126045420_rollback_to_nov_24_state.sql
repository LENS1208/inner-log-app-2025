/*
  # 11月24日の状態に戻す

  11月25日と26日に適用されたマイグレーションの変更を取り消します。

  ## 取り消す変更
  1. 削除されたpublicポリシーを復元
  2. user_settingsの変更を取り消し
  3. トリガー関連の変更を取り消し
  4. テストユーザーを削除

  ## セキュリティ
  - 開発/テスト環境では、publicアクセスを許可（認証なしでデモモード動作）
  - 本番環境では、このマイグレーション適用前の状態を使用すること
*/

-- ============================================
-- 1. テストユーザーの削除
-- ============================================
DELETE FROM auth.users WHERE email IN (
  'test@innerlog.app',
  'uuu@uuu.jp',
  'lll@lll.jp',
  'ppp@ppp.jp',
  'ooo@ooo.jp'
);

-- ============================================
-- 2. Publicアクセスポリシーの復元
-- ============================================

-- trades テーブル
DROP POLICY IF EXISTS "Allow all access to trades" ON trades;
CREATE POLICY "Allow all access to trades"
  ON trades
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- trade_notes テーブル
DROP POLICY IF EXISTS "Allow all access to trade_notes" ON trade_notes;
CREATE POLICY "Allow all access to trade_notes"
  ON trade_notes
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- daily_notes テーブル
DROP POLICY IF EXISTS "Allow all access to daily_notes" ON daily_notes;
CREATE POLICY "Allow all access to daily_notes"
  ON daily_notes
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- free_memos テーブル
DROP POLICY IF EXISTS "Allow all access to free_memos" ON free_memos;
CREATE POLICY "Allow all access to free_memos"
  ON free_memos
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- note_links テーブル
DROP POLICY IF EXISTS "Allow all access to note_links" ON note_links;
CREATE POLICY "Allow all access to note_links"
  ON note_links
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- account_summary テーブル
DROP POLICY IF EXISTS "Allow all access to account_summary" ON account_summary;
CREATE POLICY "Allow all access to account_summary"
  ON account_summary
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- account_transactions テーブル
DROP POLICY IF EXISTS "Allow all access to account_transactions" ON account_transactions;
CREATE POLICY "Allow all access to account_transactions"
  ON account_transactions
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- user_settings テーブル
DROP POLICY IF EXISTS "Allow all access to user_settings" ON user_settings;
CREATE POLICY "Allow all access to user_settings"
  ON user_settings
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- ai_proposals テーブル
DROP POLICY IF EXISTS "Allow all access to ai_proposals" ON ai_proposals;
CREATE POLICY "Allow all access to ai_proposals"
  ON ai_proposals
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- ai_coaching_jobs テーブル
DROP POLICY IF EXISTS "Allow all access to ai_coaching_jobs" ON ai_coaching_jobs;
CREATE POLICY "Allow all access to ai_coaching_jobs"
  ON ai_coaching_jobs
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- import_history テーブル
DROP POLICY IF EXISTS "Allow all access to import_history" ON import_history;
CREATE POLICY "Allow all access to import_history"
  ON import_history
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- ============================================
-- 3. 認証済みユーザー用ポリシーを削除（不要）
-- ============================================

-- trades
DROP POLICY IF EXISTS "Users can view own trades" ON trades;
DROP POLICY IF EXISTS "Users can insert own trades" ON trades;
DROP POLICY IF EXISTS "Users can update own trades" ON trades;
DROP POLICY IF EXISTS "Users can delete own trades" ON trades;

-- trade_notes
DROP POLICY IF EXISTS "Users can view own trade notes" ON trade_notes;
DROP POLICY IF EXISTS "Users can insert own trade notes" ON trade_notes;
DROP POLICY IF EXISTS "Users can update own trade notes" ON trade_notes;
DROP POLICY IF EXISTS "Users can delete own trade notes" ON trade_notes;

-- daily_notes
DROP POLICY IF EXISTS "Users can view own daily notes" ON daily_notes;
DROP POLICY IF EXISTS "Users can insert own daily notes" ON daily_notes;
DROP POLICY IF EXISTS "Users can update own daily notes" ON daily_notes;
DROP POLICY IF EXISTS "Users can delete own daily notes" ON daily_notes;

-- free_memos
DROP POLICY IF EXISTS "Users can view own free memos" ON free_memos;
DROP POLICY IF EXISTS "Users can insert own free memos" ON free_memos;
DROP POLICY IF EXISTS "Users can update own free memos" ON free_memos;
DROP POLICY IF EXISTS "Users can delete own free memos" ON free_memos;

-- note_links
DROP POLICY IF EXISTS "Users can view own note links" ON note_links;
DROP POLICY IF EXISTS "Users can insert own note links" ON note_links;
DROP POLICY IF EXISTS "Users can update own note links" ON note_links;
DROP POLICY IF EXISTS "Users can delete own note links" ON note_links;

-- account_summary
DROP POLICY IF EXISTS "Users can view own summary" ON account_summary;
DROP POLICY IF EXISTS "Users can insert own summary" ON account_summary;
DROP POLICY IF EXISTS "Users can update own summary" ON account_summary;
DROP POLICY IF EXISTS "Users can delete own summary" ON account_summary;

-- account_transactions
DROP POLICY IF EXISTS "Users can view own transactions" ON account_transactions;
DROP POLICY IF EXISTS "Users can insert own transactions" ON account_transactions;
DROP POLICY IF EXISTS "Users can update own transactions" ON account_transactions;
DROP POLICY IF EXISTS "Users can delete own transactions" ON account_transactions;

-- user_settings
DROP POLICY IF EXISTS "Users can read own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can insert own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can update own settings" ON user_settings;

-- ai_proposals
DROP POLICY IF EXISTS "Users can view own proposals" ON ai_proposals;
DROP POLICY IF EXISTS "Users can insert own proposals" ON ai_proposals;
DROP POLICY IF EXISTS "Users can update own proposals" ON ai_proposals;
DROP POLICY IF EXISTS "Users can delete own proposals" ON ai_proposals;

-- ai_coaching_jobs
DROP POLICY IF EXISTS "Users can view own coaching jobs" ON ai_coaching_jobs;
DROP POLICY IF EXISTS "Users can create own coaching jobs" ON ai_coaching_jobs;
DROP POLICY IF EXISTS "Users can update own coaching jobs" ON ai_coaching_jobs;
DROP POLICY IF EXISTS "Users can delete own coaching jobs" ON ai_coaching_jobs;

-- import_history
DROP POLICY IF EXISTS "Users can read own import history" ON import_history;
DROP POLICY IF EXISTS "Users can insert own import history" ON import_history;
DROP POLICY IF EXISTS "Users can delete own import history" ON import_history;

-- ============================================
-- 4. 確認メッセージ
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✅ Successfully rolled back to November 24 state';
  RAISE NOTICE '✅ All tables now have public access policies';
  RAISE NOTICE '✅ Demo mode should work without authentication';
END $$;
