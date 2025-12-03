/*
  # Add market scan initialization flag to user settings

  1. Changes
    - Add `market_scan_initialized` column to `user_settings` table
    - Default value is `false`
    - This flag tracks whether the user has already seen the initial sample proposal
  
  2. Purpose
    - Enable automatic generation of USDJPY sample proposal on first visit
    - Prevent duplicate sample generation on subsequent visits
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_settings' AND column_name = 'market_scan_initialized'
  ) THEN
    ALTER TABLE user_settings ADD COLUMN market_scan_initialized boolean DEFAULT false;
  END IF;
END $$;
