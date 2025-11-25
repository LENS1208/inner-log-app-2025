/*
  # コアテーブルの初期化

  1. 新規テーブル
    - `trades` - 取引データ
    - `daily_notes` - 日次ノート
    - `trade_notes` - 取引ノート
    - `account_summary` - アカウントサマリー
    - `account_transactions` - アカウント取引履歴
    - `user_settings` - ユーザー設定
    - `ai_proposals` - AI提案
    - `import_history` - インポート履歴

  2. セキュリティ
    - すべてのテーブルでRLSを有効化
    - user_id列を追加してユーザーごとにデータを分離
    - 認証済みユーザーは自分のデータのみアクセス可能

  3. インデックス
    - 各テーブルの主要カラムにインデックスを作成
*/

-- trades テーブル
CREATE TABLE IF NOT EXISTS trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  ticket text NOT NULL,
  item text NOT NULL,
  side text NOT NULL,
  size numeric NOT NULL,
  open_time timestamptz NOT NULL,
  open_price numeric NOT NULL,
  close_time timestamptz NOT NULL,
  close_price numeric NOT NULL,
  commission numeric DEFAULT 0,
  swap numeric DEFAULT 0,
  profit numeric NOT NULL,
  pips numeric NOT NULL,
  sl numeric,
  tp numeric,
  dataset text DEFAULT 'default',
  setup text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, ticket)
);

ALTER TABLE trades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own trades"
  ON trades FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

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

-- daily_notes テーブル
CREATE TABLE IF NOT EXISTS daily_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date_key text NOT NULL,
  title text NOT NULL,
  good text DEFAULT '',
  improve text DEFAULT '',
  next_promise text DEFAULT '',
  free text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date_key)
);

ALTER TABLE daily_notes ENABLE ROW LEVEL SECURITY;

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

-- trade_notes テーブル
CREATE TABLE IF NOT EXISTS trade_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  ticket text NOT NULL,
  entry_emotion text DEFAULT '',
  entry_basis jsonb DEFAULT '[]',
  tech_set jsonb DEFAULT '[]',
  market_set jsonb DEFAULT '[]',
  fund_set jsonb DEFAULT '[]',
  fund_note text DEFAULT '',
  exit_triggers jsonb DEFAULT '[]',
  exit_emotion text DEFAULT '',
  note_right text DEFAULT '',
  note_wrong text DEFAULT '',
  note_next text DEFAULT '',
  note_free text DEFAULT '',
  tags jsonb DEFAULT '[]',
  images jsonb DEFAULT '[]',
  ai_advice text DEFAULT '',
  ai_advice_pinned boolean DEFAULT false,
  free_memos jsonb DEFAULT '[]',
  related_links jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, ticket)
);

ALTER TABLE trade_notes ENABLE ROW LEVEL SECURITY;

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

-- account_summary テーブル
CREATE TABLE IF NOT EXISTS account_summary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  balance numeric NOT NULL DEFAULT 0,
  equity numeric NOT NULL DEFAULT 0,
  profit numeric NOT NULL DEFAULT 0,
  deposit numeric NOT NULL DEFAULT 0,
  withdraw numeric NOT NULL DEFAULT 0,
  commission numeric NOT NULL DEFAULT 0,
  swap numeric NOT NULL DEFAULT 0,
  swap_long numeric DEFAULT 0,
  swap_short numeric DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE account_summary ENABLE ROW LEVEL SECURITY;

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

-- account_transactions テーブル
CREATE TABLE IF NOT EXISTS account_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  time timestamptz NOT NULL,
  type text NOT NULL,
  amount numeric NOT NULL,
  balance numeric NOT NULL,
  comment text DEFAULT '',
  swap_long numeric DEFAULT 0,
  swap_short numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE account_transactions ENABLE ROW LEVEL SECURITY;

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

-- user_settings テーブル
CREATE TABLE IF NOT EXISTS user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  display_name text DEFAULT '',
  default_lot numeric DEFAULT 0.1,
  risk_percentage numeric DEFAULT 2.0,
  language text DEFAULT 'ja',
  timezone text DEFAULT 'Asia/Tokyo',
  coach_avatar_preset text DEFAULT 'male1',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

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

-- 新規ユーザー作成時に自動的にuser_settingsレコードを作成するトリガー
CREATE OR REPLACE FUNCTION create_user_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_settings();

-- ai_proposals テーブル
CREATE TABLE IF NOT EXISTS ai_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  parent_id uuid REFERENCES ai_proposals(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  proposal_data jsonb NOT NULL,
  status text DEFAULT 'pending',
  user_rating numeric(3,1),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE ai_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own AI proposals"
  ON ai_proposals FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own AI proposals"
  ON ai_proposals FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own AI proposals"
  ON ai_proposals FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own AI proposals"
  ON ai_proposals FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- import_history テーブル
CREATE TABLE IF NOT EXISTS import_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  filename text NOT NULL,
  row_count integer NOT NULL DEFAULT 0,
  success_count integer NOT NULL DEFAULT 0,
  error_count integer NOT NULL DEFAULT 0,
  errors jsonb DEFAULT '[]',
  imported_at timestamptz DEFAULT now()
);

ALTER TABLE import_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own import history"
  ON import_history FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own import history"
  ON import_history FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_trades_user_id ON trades(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_ticket ON trades(ticket);
CREATE INDEX IF NOT EXISTS idx_trades_close_time ON trades(close_time);
CREATE INDEX IF NOT EXISTS idx_trades_item ON trades(item);
CREATE INDEX IF NOT EXISTS idx_trade_notes_user_id ON trade_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_trade_notes_ticket ON trade_notes(ticket);
CREATE INDEX IF NOT EXISTS idx_daily_notes_user_id ON daily_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_notes_date_key ON daily_notes(date_key);
CREATE INDEX IF NOT EXISTS idx_account_transactions_user_id ON account_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_account_transactions_time ON account_transactions(time);
CREATE INDEX IF NOT EXISTS idx_ai_proposals_user_id ON ai_proposals(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_proposals_parent_id ON ai_proposals(parent_id);
CREATE INDEX IF NOT EXISTS idx_import_history_user_id ON import_history(user_id);

-- itemカラムを大文字に正規化するトリガー
CREATE OR REPLACE FUNCTION normalize_item_to_uppercase()
RETURNS TRIGGER AS $$
BEGIN
  NEW.item = UPPER(NEW.item);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trades_normalize_item ON trades;
CREATE TRIGGER trades_normalize_item
  BEFORE INSERT OR UPDATE ON trades
  FOR EACH ROW
  EXECUTE FUNCTION normalize_item_to_uppercase();