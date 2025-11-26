/*
  # データベース完全リセット - 11月24日の状態に戻す

  ## 実施内容
  1. すべてのテーブルを削除
  2. すべてのストレージバケットを削除
  3. すべての関数を削除
  4. 11月24日時点のテーブル構造を再作成
  5. publicアクセスポリシーを設定

  ## 注意
  - すべてのデータが削除されます
  - 認証テーブル (auth.users) は削除されません
*/

-- ============================================================
-- STEP 1: すべてのテーブルを削除
-- ============================================================

DROP TABLE IF EXISTS public.import_history CASCADE;
DROP TABLE IF EXISTS public.daily_notes CASCADE;
DROP TABLE IF EXISTS public.note_links CASCADE;
DROP TABLE IF EXISTS public.ai_coaching_jobs CASCADE;
DROP TABLE IF EXISTS public.trades CASCADE;
DROP TABLE IF EXISTS public.account_transactions CASCADE;
DROP TABLE IF EXISTS public.trade_notes CASCADE;
DROP TABLE IF EXISTS public.account_summary CASCADE;
DROP TABLE IF EXISTS public.free_memos CASCADE;
DROP TABLE IF EXISTS public.user_settings CASCADE;
DROP TABLE IF EXISTS public.ai_proposals CASCADE;

-- ============================================================
-- STEP 2: ストレージバケットを削除
-- ============================================================

DO $$
BEGIN
  DELETE FROM storage.buckets WHERE name = 'user-avatars';
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- ============================================================
-- STEP 3: 関数を削除
-- ============================================================

DROP FUNCTION IF EXISTS public.get_demo_account_summary() CASCADE;

-- ============================================================
-- STEP 4: tradesテーブルを再作成
-- ============================================================

CREATE TABLE IF NOT EXISTS public.trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket text NOT NULL UNIQUE,
  item text NOT NULL,
  side text NOT NULL,
  size numeric NOT NULL CHECK (size > 0),
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
  setup text,
  dataset text,
  user_id uuid,
  created_at timestamptz DEFAULT now()
);

COMMENT ON COLUMN trades.dataset IS 'Dataset identifier: A, B, C for demo data, NULL for user data';

-- ============================================================
-- STEP 5: 他のテーブルを再作成
-- ============================================================

CREATE TABLE IF NOT EXISTS public.trade_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket text NOT NULL UNIQUE,
  user_id uuid,
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
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.daily_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date_key text NOT NULL UNIQUE,
  user_id uuid,
  title text NOT NULL,
  good text DEFAULT '',
  improve text DEFAULT '',
  next_promise text DEFAULT '',
  free text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.free_memos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  title text NOT NULL,
  content text DEFAULT '',
  date_key text NOT NULL,
  tags jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.note_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  source_type text NOT NULL CHECK (source_type IN ('trade', 'daily', 'free')),
  source_id text NOT NULL,
  target_type text NOT NULL CHECK (target_type IN ('trade', 'daily', 'free')),
  target_id text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE,
  data_source text DEFAULT 'demo' CHECK (data_source IN ('demo', 'database')),
  default_dataset text DEFAULT 'A' CHECK (default_dataset IN ('A', 'B', 'C')),
  language text DEFAULT 'ja' CHECK (language IN ('ja', 'en')),
  timezone text DEFAULT 'Asia/Tokyo',
  time_format text DEFAULT '24h' CHECK (time_format IN ('24h', '12h')),
  currency text DEFAULT 'JPY',
  initial_capital numeric DEFAULT 1000000,
  dd_basis text DEFAULT 'capital' CHECK (dd_basis IN ('capital', 'r')),
  lot_size numeric DEFAULT 100000,
  default_spread numeric DEFAULT 0,
  target_pf numeric DEFAULT 1.5,
  target_winrate numeric DEFAULT 0.5,
  target_dd_pct numeric DEFAULT -20,
  max_consecutive_losses integer DEFAULT 5,
  enable_notifications boolean DEFAULT true,
  dd_alert_threshold numeric DEFAULT -15,
  theme text DEFAULT 'light' CHECK (theme IN ('light', 'dark')),
  date_format text DEFAULT 'yyyy-MM-dd',
  csv_format_preset text DEFAULT 'MT4' CHECK (csv_format_preset IN ('XM', 'MT4', 'MT5', 'custom')),
  csv_column_mapping jsonb DEFAULT '{}',
  ai_evaluation_frequency text DEFAULT 'daily' CHECK (ai_evaluation_frequency IN ('realtime', 'daily', 'weekly')),
  ai_proposal_detail_level text DEFAULT 'standard' CHECK (ai_proposal_detail_level IN ('concise', 'standard', 'detailed')),
  ai_evaluation_enabled boolean DEFAULT true,
  ai_proposal_enabled boolean DEFAULT true,
  ai_advice_enabled boolean DEFAULT true,
  coach_avatar_preset text DEFAULT 'teacher',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.account_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  dataset text NOT NULL,
  ticket text,
  transaction_date timestamptz NOT NULL,
  transaction_type text NOT NULL,
  category text NOT NULL,
  description text,
  amount numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.account_summary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  dataset text NOT NULL,
  total_deposits numeric DEFAULT 0,
  total_withdrawals numeric DEFAULT 0,
  xm_points_earned numeric DEFAULT 0,
  xm_points_used numeric DEFAULT 0,
  total_swap numeric DEFAULT 0,
  total_commission numeric DEFAULT 0,
  total_profit numeric DEFAULT 0,
  closed_pl numeric DEFAULT 0,
  swap_positive numeric DEFAULT 0,
  swap_negative numeric DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ai_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  parent_id uuid REFERENCES ai_proposals(id),
  version integer DEFAULT 1,
  pair text NOT NULL,
  timeframe text NOT NULL,
  bias text NOT NULL,
  confidence integer DEFAULT 0,
  hero_data jsonb DEFAULT '{}',
  daily_actions jsonb DEFAULT '{}',
  scenario jsonb DEFAULT '{}',
  ideas jsonb DEFAULT '[]',
  factors jsonb DEFAULT '{}',
  notes jsonb DEFAULT '{}',
  is_fixed boolean DEFAULT false,
  prompt text DEFAULT '',
  user_rating numeric CHECK (user_rating >= 1.0 AND user_rating <= 5.0 AND (user_rating * 2) = floor(user_rating * 2)),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ai_coaching_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  dataset text DEFAULT 'default',
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  progress integer DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  result jsonb,
  error_message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.import_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  filename text NOT NULL,
  rows integer DEFAULT 0,
  format text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- STEP 6: RLSを有効化
-- ============================================================

ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE free_memos ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_coaching_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_history ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- STEP 7: publicアクセスポリシーを設定
-- ============================================================

-- trades
CREATE POLICY "Public access to trades" ON trades FOR ALL USING (true) WITH CHECK (true);

-- trade_notes
CREATE POLICY "Public access to trade_notes" ON trade_notes FOR ALL USING (true) WITH CHECK (true);

-- daily_notes
CREATE POLICY "Public access to daily_notes" ON daily_notes FOR ALL USING (true) WITH CHECK (true);

-- free_memos
CREATE POLICY "Public access to free_memos" ON free_memos FOR ALL USING (true) WITH CHECK (true);

-- note_links
CREATE POLICY "Public access to note_links" ON note_links FOR ALL USING (true) WITH CHECK (true);

-- user_settings
CREATE POLICY "Public access to user_settings" ON user_settings FOR ALL USING (true) WITH CHECK (true);

-- account_transactions
CREATE POLICY "Public access to account_transactions" ON account_transactions FOR ALL USING (true) WITH CHECK (true);

-- account_summary
CREATE POLICY "Public access to account_summary" ON account_summary FOR ALL USING (true) WITH CHECK (true);

-- ai_proposals
CREATE POLICY "Public access to ai_proposals" ON ai_proposals FOR ALL USING (true) WITH CHECK (true);

-- ai_coaching_jobs
CREATE POLICY "Public access to ai_coaching_jobs" ON ai_coaching_jobs FOR ALL USING (true) WITH CHECK (true);

-- import_history
CREATE POLICY "Public access to import_history" ON import_history FOR ALL USING (true) WITH CHECK (true);
