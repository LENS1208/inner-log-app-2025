/*
  # Create AI Coaching Jobs Table

  1. New Tables
    - `ai_coaching_jobs`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `dataset` (text) - dataset identifier (A, B, C, etc.)
      - `status` (text) - job status (pending, processing, completed, failed)
      - `progress` (integer) - progress percentage (0-100)
      - `result` (jsonb) - generated coaching data
      - `error_message` (text) - error details if failed
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `completed_at` (timestamptz)
  
  2. Security
    - Enable RLS on `ai_coaching_jobs` table
    - Add policies for users to manage their own jobs
    
  3. Indexes
    - Index on user_id and dataset for quick lookups
    - Index on status for job queue processing
*/

CREATE TABLE IF NOT EXISTS ai_coaching_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dataset text NOT NULL DEFAULT 'default',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  progress integer NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  result jsonb,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  UNIQUE(user_id, dataset)
);

CREATE INDEX IF NOT EXISTS idx_ai_coaching_jobs_user_dataset ON ai_coaching_jobs(user_id, dataset);
CREATE INDEX IF NOT EXISTS idx_ai_coaching_jobs_status ON ai_coaching_jobs(status);

ALTER TABLE ai_coaching_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own coaching jobs"
  ON ai_coaching_jobs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own coaching jobs"
  ON ai_coaching_jobs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own coaching jobs"
  ON ai_coaching_jobs FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own coaching jobs"
  ON ai_coaching_jobs FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION update_ai_coaching_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  IF NEW.status = 'completed' OR NEW.status = 'failed' THEN
    NEW.completed_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ai_coaching_jobs_updated_at_trigger
  BEFORE UPDATE ON ai_coaching_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_coaching_jobs_updated_at();