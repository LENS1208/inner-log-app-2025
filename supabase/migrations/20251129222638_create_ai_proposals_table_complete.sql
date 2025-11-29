/*
  # AI Proposalsテーブルの作成

  ## 新規テーブル
  - `ai_proposals` - AI提案データを保存
    - `id` (uuid, primary key) - 提案ID
    - `user_id` (uuid, NOT NULL) - ユーザーID
    - `pair` (text) - 通貨ペア
    - `timeframe` (text) - 時間軸
    - `period` (text) - 期間
    - `title` (text, nullable) - タイトル
    - `proposal_data` (jsonb, nullable) - 提案データ
    - `bias` (text, nullable) - バイアス
    - `confidence` (integer) - 信頼度
    - `user_rating` (numeric, nullable) - ユーザー評価
    - `is_fixed` (boolean) - 固定フラグ
    - `prompt` (text) - プロンプト
    - `parent_id` (uuid, nullable) - 親提案ID
    - `created_at` (timestamptz) - 作成日時
    - `updated_at` (timestamptz) - 更新日時

  ## セキュリティ
  - RLSを有効化
  - ユーザーは自分の提案のみアクセス可能
*/

CREATE TABLE IF NOT EXISTS ai_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pair text,
  timeframe text,
  period text,
  title text,
  proposal_data jsonb DEFAULT '{}'::jsonb,
  bias text,
  confidence integer DEFAULT 0,
  user_rating numeric(3, 1),
  is_fixed boolean DEFAULT false,
  prompt text DEFAULT '',
  parent_id uuid REFERENCES ai_proposals(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE ai_proposals ENABLE ROW LEVEL SECURITY;

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

CREATE INDEX IF NOT EXISTS idx_ai_proposals_user_id ON ai_proposals(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_proposals_created_at ON ai_proposals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_proposals_pair ON ai_proposals(pair);
CREATE INDEX IF NOT EXISTS idx_ai_proposals_parent_id ON ai_proposals(parent_id);
