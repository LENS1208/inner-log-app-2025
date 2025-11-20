/*
  # Add user_id columns and secure RLS policies

  ## Changes
  
  1. Add user_id columns to all tables
    - `trades`: Add user_id (nullable for demo data)
    - `trade_notes`: Add user_id (nullable for demo data)
    - `daily_notes`: Add user_id (nullable for demo data)
    - `free_memos`: Add user_id (nullable for demo data)
    - `note_links`: Add user_id (nullable for demo data)
  
  2. Remove insecure RLS policies
    - Drop all existing "Allow all access" policies that use USING (true)
  
  3. Add secure RLS policies
    - Authenticated users can only access their own data
    - Demo data (user_id IS NULL) is read-only for all users
    - Each operation (SELECT, INSERT, UPDATE, DELETE) has separate policies
  
  4. Security
    - All policies check auth.uid() = user_id for authenticated users
    - Demo data is protected from modification
    - No USING (true) policies that expose all data
*/

-- Add user_id columns to all tables
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trades' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE trades ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_trades_user_id ON trades(user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trade_notes' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE trade_notes ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_trade_notes_user_id ON trade_notes(user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'daily_notes' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE daily_notes ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_daily_notes_user_id ON daily_notes(user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'free_memos' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE free_memos ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_free_memos_user_id ON free_memos(user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'note_links' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE note_links ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_note_links_user_id ON note_links(user_id);
  END IF;
END $$;

-- Drop insecure policies
DROP POLICY IF EXISTS "Allow all access to trades" ON trades;
DROP POLICY IF EXISTS "Allow all access to trade_notes" ON trade_notes;
DROP POLICY IF EXISTS "Allow all access to daily_notes" ON daily_notes;
DROP POLICY IF EXISTS "Allow all access to free_memos" ON free_memos;
DROP POLICY IF EXISTS "Allow all access to note_links" ON note_links;

-- TRADES table policies
CREATE POLICY "Users can view own trades and demo data"
  ON trades FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert own trades"
  ON trades FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own trades"
  ON trades FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own trades"
  ON trades FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- TRADE_NOTES table policies
CREATE POLICY "Users can view own trade notes and demo data"
  ON trade_notes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR user_id IS NULL);

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

-- DAILY_NOTES table policies
CREATE POLICY "Users can view own daily notes and demo data"
  ON daily_notes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR user_id IS NULL);

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

-- FREE_MEMOS table policies
CREATE POLICY "Users can view own free memos and demo data"
  ON free_memos FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR user_id IS NULL);

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

-- NOTE_LINKS table policies
CREATE POLICY "Users can view own note links and demo data"
  ON note_links FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR user_id IS NULL);

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
