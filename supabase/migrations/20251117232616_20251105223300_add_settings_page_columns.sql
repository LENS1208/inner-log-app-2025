/*
  # Add settings page columns to user_settings table

  1. New Columns
    - Display settings
      - `theme` (text) - 'light' or 'dark' color theme
      - `date_format` (text) - date format preference
    
    - CSV Import settings
      - `csv_format_preset` (text) - 'XM', 'MT4', 'MT5', 'custom'
      - `csv_column_mapping` (jsonb) - custom column mapping configuration
    
    - AI function settings
      - `ai_evaluation_frequency` (text) - 'realtime', 'daily', 'weekly'
      - `ai_proposal_detail_level` (text) - 'concise', 'standard', 'detailed'
      - `ai_evaluation_enabled` (boolean) - enable/disable AI evaluation
      - `ai_proposal_enabled` (boolean) - enable/disable AI proposals
      - `ai_advice_enabled` (boolean) - enable/disable AI advice
    
    - Profile settings (stored in auth.users metadata)
      - trader_name will be stored in auth.users.raw_user_meta_data
      - email is already in auth.users table

  2. Notes
    - All new columns have sensible defaults
    - CSV column mapping stored as JSONB for flexibility
    - AI settings allow granular control per section
*/

-- Add display settings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_settings' AND column_name = 'theme'
  ) THEN
    ALTER TABLE user_settings ADD COLUMN theme text DEFAULT 'light' CHECK (theme IN ('light', 'dark'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_settings' AND column_name = 'date_format'
  ) THEN
    ALTER TABLE user_settings ADD COLUMN date_format text DEFAULT 'yyyy-MM-dd';
  END IF;
END $$;

-- Add CSV import settings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_settings' AND column_name = 'csv_format_preset'
  ) THEN
    ALTER TABLE user_settings ADD COLUMN csv_format_preset text DEFAULT 'MT4' CHECK (csv_format_preset IN ('XM', 'MT4', 'MT5', 'custom'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_settings' AND column_name = 'csv_column_mapping'
  ) THEN
    ALTER TABLE user_settings ADD COLUMN csv_column_mapping jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Add AI function settings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_settings' AND column_name = 'ai_evaluation_frequency'
  ) THEN
    ALTER TABLE user_settings ADD COLUMN ai_evaluation_frequency text DEFAULT 'daily' CHECK (ai_evaluation_frequency IN ('realtime', 'daily', 'weekly'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_settings' AND column_name = 'ai_proposal_detail_level'
  ) THEN
    ALTER TABLE user_settings ADD COLUMN ai_proposal_detail_level text DEFAULT 'standard' CHECK (ai_proposal_detail_level IN ('concise', 'standard', 'detailed'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_settings' AND column_name = 'ai_evaluation_enabled'
  ) THEN
    ALTER TABLE user_settings ADD COLUMN ai_evaluation_enabled boolean DEFAULT true;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_settings' AND column_name = 'ai_proposal_enabled'
  ) THEN
    ALTER TABLE user_settings ADD COLUMN ai_proposal_enabled boolean DEFAULT true;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_settings' AND column_name = 'ai_advice_enabled'
  ) THEN
    ALTER TABLE user_settings ADD COLUMN ai_advice_enabled boolean DEFAULT true;
  END IF;
END $$;

-- Update default demo settings with new columns
UPDATE user_settings 
SET 
  theme = 'light',
  date_format = 'yyyy-MM-dd',
  csv_format_preset = 'MT4',
  ai_evaluation_frequency = 'daily',
  ai_proposal_detail_level = 'standard',
  ai_evaluation_enabled = true,
  ai_proposal_enabled = true,
  ai_advice_enabled = true
WHERE user_id IS NULL;
