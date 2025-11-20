/*
  # 自由メモとリンク機能の追加

  1. 新規テーブル
    - `free_memos`（自由メモ）
      - `id` (uuid, primary key)
      - `title` (text) - タイトル
      - `content` (text) - メモ内容
      - `date_key` (text) - 作成日付 (YYYY-MM-DD)
      - `tags` (jsonb) - タグ配列
      - `created_at` (timestamptz) - 作成日時
      - `updated_at` (timestamptz) - 更新日時

    - `note_links`（ノート間のリンク）
      - `id` (uuid, primary key)
      - `source_type` (text) - リンク元のタイプ（trade/daily/free）
      - `source_id` (text) - リンク元のID（ticketまたはdate_keyまたはfree_memo_id）
      - `target_type` (text) - リンク先のタイプ（trade/daily/free）
      - `target_id` (text) - リンク先のID
      - `created_at` (timestamptz) - 作成日時

  2. セキュリティ
    - すべてのテーブルでRLSを有効化
    - 一時的に全ユーザーがアクセス可能

  3. インデックス
    - `note_links.source_type, source_id` - リンク元検索用
    - `note_links.target_type, target_id` - リンク先検索用
*/

-- free_memos テーブル
CREATE TABLE IF NOT EXISTS free_memos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text DEFAULT '',
  date_key text NOT NULL,
  tags jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE free_memos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to free_memos"
  ON free_memos
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- note_links テーブル
CREATE TABLE IF NOT EXISTS note_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type text NOT NULL CHECK (source_type IN ('trade', 'daily', 'free')),
  source_id text NOT NULL,
  target_type text NOT NULL CHECK (target_type IN ('trade', 'daily', 'free')),
  target_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(source_type, source_id, target_type, target_id)
);

ALTER TABLE note_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to note_links"
  ON note_links
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_free_memos_date_key ON free_memos(date_key);
CREATE INDEX IF NOT EXISTS idx_note_links_source ON note_links(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_note_links_target ON note_links(target_type, target_id);
