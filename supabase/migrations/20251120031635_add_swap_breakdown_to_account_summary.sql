/*
  # Add swap breakdown columns to account_summary

  1. Changes
    - Add `swap_positive` column to track total positive swap
    - Add `swap_negative` column to track total negative swap
  
  2. Notes
    - These columns enable displaying swap breakdown in the UI
    - Default values are set to 0
    - Existing data will be populated from trades table
*/

-- Add swap breakdown columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'account_summary' AND column_name = 'swap_positive'
  ) THEN
    ALTER TABLE account_summary ADD COLUMN swap_positive numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'account_summary' AND column_name = 'swap_negative'
  ) THEN
    ALTER TABLE account_summary ADD COLUMN swap_negative numeric DEFAULT 0;
  END IF;
END $$;

-- Populate swap breakdown from existing trades data
UPDATE account_summary AS summary
SET 
  swap_positive = COALESCE((
    SELECT SUM(swap) 
    FROM trades 
    WHERE user_id = summary.user_id 
      AND dataset = summary.dataset 
      AND swap > 0
  ), 0),
  swap_negative = COALESCE((
    SELECT SUM(swap) 
    FROM trades 
    WHERE user_id = summary.user_id 
      AND dataset = summary.dataset 
      AND swap < 0
  ), 0);
