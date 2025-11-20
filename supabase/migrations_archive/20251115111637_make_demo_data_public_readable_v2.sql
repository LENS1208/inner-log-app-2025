/*
  # Make demo data publicly readable (v2)

  1. Purpose
    - Allow all authenticated users to view demo data (dataset A, B, C)
    - Users can only modify their own data
    - Demo data (dataset IN ('A', 'B', 'C')) is read-only for all users

  2. Changes
    - Update SELECT policies for trades, trade_notes, daily_notes, account_transactions, account_summary
    - Add condition to allow reading demo datasets
    
  3. Notes
    - trade_notes and daily_notes don't have dataset column, so we check via related trades
    - free_memos and note_links remain with user_id IS NULL check
*/

-- Trades: Update SELECT policy to include demo data
DROP POLICY IF EXISTS "Users can view own trades and demo data" ON trades;
CREATE POLICY "Users can view own trades and demo data"
  ON trades
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id 
    OR dataset IN ('A', 'B', 'C')
    OR user_id IS NULL
  );

-- Trade Notes: Update SELECT policy (check via ticket in trades)
DROP POLICY IF EXISTS "Users can view own trade notes and demo data" ON trade_notes;
CREATE POLICY "Users can view own trade notes and demo data"
  ON trade_notes
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id 
    OR EXISTS (
      SELECT 1 FROM trades 
      WHERE trades.ticket = trade_notes.ticket 
      AND (trades.dataset IN ('A', 'B', 'C') OR trades.user_id IS NULL)
    )
    OR user_id IS NULL
  );

-- Daily Notes: Update SELECT policy (check via user_id matching trades with dataset)
DROP POLICY IF EXISTS "Users can view own daily notes and demo data" ON daily_notes;
CREATE POLICY "Users can view own daily notes and demo data"
  ON daily_notes
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id 
    OR EXISTS (
      SELECT 1 FROM trades 
      WHERE trades.user_id = daily_notes.user_id
      AND trades.dataset IN ('A', 'B', 'C')
      LIMIT 1
    )
    OR user_id IS NULL
  );

-- Account Transactions: Update SELECT policy
DROP POLICY IF EXISTS "Users can view own transactions" ON account_transactions;
CREATE POLICY "Users can view own transactions and demo data"
  ON account_transactions
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id 
    OR dataset IN ('A', 'B', 'C')
  );

-- Account Summary: Update SELECT policy
DROP POLICY IF EXISTS "Users can view own summary" ON account_summary;
CREATE POLICY "Users can view own summary and demo data"
  ON account_summary
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id 
    OR dataset IN ('A', 'B', 'C')
  );

-- Free Memos: Keep existing policy (user_id IS NULL for demo)
DROP POLICY IF EXISTS "Users can view own free memos and demo data" ON free_memos;
CREATE POLICY "Users can view own free memos and demo data"
  ON free_memos
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id 
    OR user_id IS NULL
  );

-- Note Links: Keep existing policy (user_id IS NULL for demo)
DROP POLICY IF EXISTS "Users can view own note links and demo data" ON note_links;
CREATE POLICY "Users can view own note links and demo data"
  ON note_links
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id 
    OR user_id IS NULL
  );
