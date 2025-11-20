/*
  # トレードジャーナル用テーブル作成

  1. 新規テーブル
    - `trades`（取引データ）
      - `id` (uuid, primary key) - 内部ID
      - `ticket` (text, unique) - 取引番号（XM等のticket番号）
      - `item` (text) - 通貨ペア
      - `side` (text) - BUY/SELL
      - `size` (numeric) - ロットサイズ
      - `open_time` (timestamptz) - エントリー時刻
      - `open_price` (numeric) - エントリー価格
      - `close_time` (timestamptz) - 決済時刻
      - `close_price` (numeric) - 決済価格
      - `commission` (numeric) - 手数料
      - `swap` (numeric) - スワップ
      - `profit` (numeric) - 損益（円）
      - `pips` (numeric) - pips損益
      - `sl` (numeric, nullable) - ストップロス
      - `tp` (numeric, nullable) - テイクプロフィット
      - `created_at` (timestamptz) - 作成日時

    - `daily_notes`（日次ノート）
      - `id` (uuid, primary key)
      - `date_key` (text, unique) - 日付キー (YYYY-MM-DD)
      - `title` (text) - タイトル
      - `good` (text) - うまくいった点
      - `improve` (text) - 改善点
      - `next_promise` (text) - 次回の約束
      - `free` (text) - 自由メモ
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `trade_notes`（取引ノート）
      - `id` (uuid, primary key)
      - `ticket` (text, foreign key) - 取引番号
      - `entry_emotion` (text) - エントリー時の感情
      - `entry_basis` (jsonb) - エントリー根拠（配列）
      - `tech_set` (jsonb) - テクニカル条件（配列）
      - `market_set` (jsonb) - マーケット環境（配列）
      - `fund_set` (jsonb) - ファンダメンタルズ（配列）
      - `fund_note` (text) - ファンダメンタルズメモ
      - `exit_triggers` (jsonb) - 決済のきっかけ（配列）
      - `exit_emotion` (text) - 決済時の感情
      - `note_right` (text) - うまくいった点
      - `note_wrong` (text) - 改善点
      - `note_next` (text) - 次回の約束
      - `note_free` (text) - 自由メモ
      - `tags` (jsonb) - タグ（配列）
      - `images` (jsonb) - 画像データ（配列）
      - `ai_advice` (text) - AIアドバイス
      - `ai_advice_pinned` (boolean) - アドバイス固定
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. セキュリティ
    - すべてのテーブルでRLSを有効化
    - 認証済みユーザーは自分のデータのみアクセス可能
    - 現時点では全ユーザーが全データにアクセス可能（認証未実装）

  3. インデックス
    - `trades.ticket` - 高速検索用
    - `trade_notes.ticket` - 外部キー検索用
    - `daily_notes.date_key` - 日付検索用
*/

-- trades テーブル
CREATE TABLE IF NOT EXISTS trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket text UNIQUE NOT NULL,
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
  created_at timestamptz DEFAULT now()
);

ALTER TABLE trades ENABLE ROW LEVEL SECURITY;

-- 一時的にすべてのユーザーがアクセス可能（後で認証実装時に修正）
CREATE POLICY "Allow all access to trades"
  ON trades
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- daily_notes テーブル
CREATE TABLE IF NOT EXISTS daily_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date_key text UNIQUE NOT NULL,
  title text NOT NULL,
  good text DEFAULT '',
  improve text DEFAULT '',
  next_promise text DEFAULT '',
  free text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE daily_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to daily_notes"
  ON daily_notes
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- trade_notes テーブル
CREATE TABLE IF NOT EXISTS trade_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket text UNIQUE NOT NULL REFERENCES trades(ticket) ON DELETE CASCADE,
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

ALTER TABLE trade_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to trade_notes"
  ON trade_notes
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_trades_ticket ON trades(ticket);
CREATE INDEX IF NOT EXISTS idx_trades_close_time ON trades(close_time);
CREATE INDEX IF NOT EXISTS idx_trade_notes_ticket ON trade_notes(ticket);
CREATE INDEX IF NOT EXISTS idx_daily_notes_date_key ON daily_notes(date_key);
