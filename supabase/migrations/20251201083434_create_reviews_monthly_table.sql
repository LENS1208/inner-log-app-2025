/*
  # 月次レビューアーカイブテーブルの作成

  ## 概要
  ユーザーの月次トレードレビューを保存し、過去の振り返りをアーカイブ管理するためのテーブルです。
  AIコーチによる自動生成レビューを月単位で保存し、ユーザーが過去月との比較や成長の可視化を行えるようにします。

  ## 新規テーブル
  - `reviews_monthly`
    - `id` (uuid, primary key) - レビューID
    - `user_id` (uuid, not null) - ユーザーID（auth.usersへの外部キー）
    - `month` (text, not null) - 対象月（YYYY-MM形式）
    - `summary_profit` (numeric) - 月間合計損益
    - `summary_pf` (numeric) - プロフィットファクター
    - `summary_win_rate` (numeric) - 勝率（0-100）
    - `summary_trade_count` (integer) - 月間トレード数
    - `strengths` (jsonb) - 今月の強み（配列、最大3件）
    - `weaknesses` (jsonb) - 今月の課題（配列、最大2件）
    - `next_focus` (text) - 来月の重点テーマ
    - `ai_comment_kizuki` (text) - AIコーチコメント：気づき
    - `ai_comment_chuui` (text) - AIコーチコメント：注意点
    - `ai_comment_next_itte` (text) - AIコーチコメント：次の一手
    - `coach_avatar` (text) - 使用したコーチアバター（teacher/beginner/strategist）
    - `is_early_month` (boolean) - 月初レビューフラグ（データ不足時true）
    - `created_at` (timestamptz) - 作成日時
    - `updated_at` (timestamptz) - 更新日時

  ## セキュリティ
  - RLS有効化
  - ユーザーは自分のレビューのみ閲覧・作成・更新可能
  - 削除は許可しない（履歴保護）

  ## 制約
  - user_id + month の組み合わせで一意性を保証（月に1レビューのみ）
*/

-- テーブル作成
CREATE TABLE IF NOT EXISTS reviews_monthly (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month text NOT NULL,
  summary_profit numeric DEFAULT 0,
  summary_pf numeric DEFAULT 0,
  summary_win_rate numeric DEFAULT 0,
  summary_trade_count integer DEFAULT 0,
  strengths jsonb DEFAULT '[]'::jsonb,
  weaknesses jsonb DEFAULT '[]'::jsonb,
  next_focus text DEFAULT '',
  ai_comment_kizuki text DEFAULT '',
  ai_comment_chuui text DEFAULT '',
  ai_comment_next_itte text DEFAULT '',
  coach_avatar text DEFAULT 'teacher',
  is_early_month boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT unique_user_month UNIQUE (user_id, month)
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_reviews_monthly_user_id ON reviews_monthly(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_monthly_month ON reviews_monthly(month);
CREATE INDEX IF NOT EXISTS idx_reviews_monthly_user_month ON reviews_monthly(user_id, month);

-- RLS有効化
ALTER TABLE reviews_monthly ENABLE ROW LEVEL SECURITY;

-- RLSポリシー：自分のレビューを閲覧
CREATE POLICY "Users can view own monthly reviews"
  ON reviews_monthly
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- RLSポリシー：自分のレビューを作成
CREATE POLICY "Users can create own monthly reviews"
  ON reviews_monthly
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- RLSポリシー：自分のレビューを更新
CREATE POLICY "Users can update own monthly reviews"
  ON reviews_monthly
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 更新日時の自動更新トリガー
CREATE OR REPLACE FUNCTION update_reviews_monthly_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_reviews_monthly_updated_at_trigger
  BEFORE UPDATE ON reviews_monthly
  FOR EACH ROW
  EXECUTE FUNCTION update_reviews_monthly_updated_at();
