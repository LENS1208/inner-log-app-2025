-- # Create AI Proposals Table
--
-- 1. New Tables
--    - `ai_proposals`
--      - `id` (uuid, primary key) - Unique identifier for each proposal
--      - `user_id` (uuid, foreign key) - User who created the proposal
--      - `pair` (text) - Currency pair (e.g., USD/JPY)
--      - `timeframe` (text) - Timeframe (e.g., 1H, 4H, 1D)
--      - `bias` (text) - Market bias (BUY, SELL, NEUTRAL)
--      - `confidence` (integer) - Confidence level (0-100)
--      - `hero_data` (jsonb) - Hero summary data
--      - `daily_actions` (jsonb) - Daily action plan data
--      - `scenario` (jsonb) - Price scenario data (strong, base, weak)
--      - `ideas` (jsonb) - Trade ideas array
--      - `factors` (jsonb) - Analysis factors (technical, fundamental, sentiment)
--      - `notes` (jsonb) - Linked notes and memos
--      - `is_fixed` (boolean) - Whether the proposal is fixed/saved
--      - `prompt` (text) - User's original prompt/request
--      - `created_at` (timestamptz) - Creation timestamp
--      - `updated_at` (timestamptz) - Last update timestamp
--
-- 2. Security
--    - Enable RLS on `ai_proposals` table
--    - Add policy for users to read their own proposals
--    - Add policy for users to insert their own proposals
--    - Add policy for users to update their own proposals
--    - Add policy for users to delete their own proposals

CREATE TABLE IF NOT EXISTS ai_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pair text NOT NULL,
  timeframe text NOT NULL,
  bias text NOT NULL,
  confidence integer NOT NULL DEFAULT 0,
  hero_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  daily_actions jsonb NOT NULL DEFAULT '{}'::jsonb,
  scenario jsonb NOT NULL DEFAULT '{}'::jsonb,
  ideas jsonb NOT NULL DEFAULT '[]'::jsonb,
  factors jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_fixed boolean NOT NULL DEFAULT false,
  prompt text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE ai_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own proposals"
  ON ai_proposals FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own proposals"
  ON ai_proposals FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own proposals"
  ON ai_proposals FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own proposals"
  ON ai_proposals FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_ai_proposals_user_id ON ai_proposals(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_proposals_created_at ON ai_proposals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_proposals_pair ON ai_proposals(pair);
