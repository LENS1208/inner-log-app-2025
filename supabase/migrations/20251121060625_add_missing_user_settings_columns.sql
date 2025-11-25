/*
  # Add missing columns to user_settings table

  1. Changes
    - Add `theme` column (light/dark theme preference)
    - Add `time_format` column (24h/12h time format)
    - Add `date_format` column (date display format)
    - Add `currency` column (JPY, USD, EUR, GBP)
    - Add `csv_format_preset` column (MT4, MT5, custom)
    - Add `csv_column_mapping` column (JSONB for column mapping)
    - Add `ai_evaluation_frequency` column (daily, weekly, monthly)
    - Add `ai_proposal_detail_level` column (simple, standard, detailed)
    - Add `ai_evaluation_enabled` column (boolean)
    - Add `ai_proposal_enabled` column (boolean)
    - Add `ai_advice_enabled` column (boolean)

  2. Security
    - No RLS changes needed (table already has RLS enabled)
*/

-- Add theme column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_settings' AND column_name = 'theme'
  ) THEN
    ALTER TABLE user_settings ADD COLUMN theme text DEFAULT 'light';
  END IF;
END $$;

-- Add time_format column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_settings' AND column_name = 'time_format'
  ) THEN
    ALTER TABLE user_settings ADD COLUMN time_format text DEFAULT '24h';
  END IF;
END $$;

-- Add date_format column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_settings' AND column_name = 'date_format'
  ) THEN
    ALTER TABLE user_settings ADD COLUMN date_format text DEFAULT 'yyyy-MM-dd';
  END IF;
END $$;

-- Add currency column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_settings' AND column_name = 'currency'
  ) THEN
    ALTER TABLE user_settings ADD COLUMN currency text DEFAULT 'JPY';
  END IF;
END $$;

-- Add csv_format_preset column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_settings' AND column_name = 'csv_format_preset'
  ) THEN
    ALTER TABLE user_settings ADD COLUMN csv_format_preset text DEFAULT 'MT4';
  END IF;
END $$;

-- Add csv_column_mapping column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_settings' AND column_name = 'csv_column_mapping'
  ) THEN
    ALTER TABLE user_settings ADD COLUMN csv_column_mapping jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Add ai_evaluation_frequency column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_settings' AND column_name = 'ai_evaluation_frequency'
  ) THEN
    ALTER TABLE user_settings ADD COLUMN ai_evaluation_frequency text DEFAULT 'daily';
  END IF;
END $$;

-- Add ai_proposal_detail_level column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_settings' AND column_name = 'ai_proposal_detail_level'
  ) THEN
    ALTER TABLE user_settings ADD COLUMN ai_proposal_detail_level text DEFAULT 'standard';
  END IF;
END $$;

-- Add ai_evaluation_enabled column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_settings' AND column_name = 'ai_evaluation_enabled'
  ) THEN
    ALTER TABLE user_settings ADD COLUMN ai_evaluation_enabled boolean DEFAULT true;
  END IF;
END $$;

-- Add ai_proposal_enabled column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_settings' AND column_name = 'ai_proposal_enabled'
  ) THEN
    ALTER TABLE user_settings ADD COLUMN ai_proposal_enabled boolean DEFAULT true;
  END IF;
END $$;

-- Add ai_advice_enabled column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_settings' AND column_name = 'ai_advice_enabled'
  ) THEN
    ALTER TABLE user_settings ADD COLUMN ai_advice_enabled boolean DEFAULT true;
  END IF;
END $$;
