/*
  # Create import_history table

  1. New Tables
    - `import_history`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `filename` (text) - Uploaded file name
      - `rows` (integer) - Number of rows imported
      - `format` (text) - File format (CSV, HTML, etc.)
      - `created_at` (timestamptz) - Import timestamp
  
  2. Security
    - Enable RLS on `import_history` table
    - Add policy for users to read their own import history
    - Add policy for users to insert their own import history
    - Add policy for users to delete their own import history
*/

CREATE TABLE IF NOT EXISTS import_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  filename text NOT NULL,
  rows integer NOT NULL DEFAULT 0,
  format text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE import_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own import history"
  ON import_history
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own import history"
  ON import_history
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own import history"
  ON import_history
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS import_history_user_id_idx ON import_history(user_id);
CREATE INDEX IF NOT EXISTS import_history_created_at_idx ON import_history(created_at DESC);
