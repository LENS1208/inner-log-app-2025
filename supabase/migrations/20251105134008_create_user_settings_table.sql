/*
  # Create user_settings table

  1. New Tables
    - `user_settings`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users) - NULL for demo mode
      - Data source settings
        - `data_source` (text) - 'demo' or 'database'
        - `default_dataset` (text) - 'A', 'B', or 'C'
      - Display settings
        - `language` (text) - 'ja' or 'en'
        - `timezone` (text) - timezone identifier
        - `time_format` (text) - '24h' or '12h'
        - `currency` (text) - 'JPY', 'USD', etc.
      - Trade calculation settings
        - `initial_capital` (numeric) - default initial capital
        - `dd_basis` (text) - 'capital' or 'r'
        - `lot_size` (numeric) - standard lot size
        - `default_spread` (numeric) - default spread cost
      - Evaluation criteria
        - `target_pf` (numeric) - target profit factor
        - `target_winrate` (numeric) - target win rate
        - `target_dd_pct` (numeric) - target drawdown percentage
        - `max_consecutive_losses` (integer) - alert threshold
      - Notification settings
        - `enable_notifications` (boolean)
        - `dd_alert_threshold` (numeric)
      - Timestamps
        - `created_at` (timestamptz)
        - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `user_settings` table
    - Add policy for users to read their own settings
    - Add policy for users to update their own settings
    - Add policy for anonymous users to read/update demo settings
*/

CREATE TABLE IF NOT EXISTS user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Data source settings
  data_source text DEFAULT 'demo' CHECK (data_source IN ('demo', 'database')),
  default_dataset text DEFAULT 'A' CHECK (default_dataset IN ('A', 'B', 'C')),
  
  -- Display settings
  language text DEFAULT 'ja' CHECK (language IN ('ja', 'en')),
  timezone text DEFAULT 'Asia/Tokyo',
  time_format text DEFAULT '24h' CHECK (time_format IN ('24h', '12h')),
  currency text DEFAULT 'JPY',
  
  -- Trade calculation settings
  initial_capital numeric DEFAULT 1000000,
  dd_basis text DEFAULT 'capital' CHECK (dd_basis IN ('capital', 'r')),
  lot_size numeric DEFAULT 100000,
  default_spread numeric DEFAULT 0,
  
  -- Evaluation criteria
  target_pf numeric DEFAULT 1.5,
  target_winrate numeric DEFAULT 0.5,
  target_dd_pct numeric DEFAULT -20,
  max_consecutive_losses integer DEFAULT 5,
  
  -- Notification settings
  enable_notifications boolean DEFAULT true,
  dd_alert_threshold numeric DEFAULT -15,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(user_id)
);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own settings"
  ON user_settings
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
  ON user_settings
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings"
  ON user_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anonymous users can read demo settings"
  ON user_settings
  FOR SELECT
  TO anon
  USING (user_id IS NULL);

CREATE POLICY "Anonymous users can update demo settings"
  ON user_settings
  FOR UPDATE
  TO anon
  USING (user_id IS NULL)
  WITH CHECK (user_id IS NULL);

CREATE POLICY "Anonymous users can insert demo settings"
  ON user_settings
  FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL);

-- Create default demo settings
INSERT INTO user_settings (user_id, data_source, default_dataset, language, initial_capital)
VALUES (NULL, 'demo', 'A', 'ja', 1000000)
ON CONFLICT (user_id) DO NOTHING;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_user_settings_updated_at();
