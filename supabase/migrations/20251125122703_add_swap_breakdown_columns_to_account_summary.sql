/*
  # Add swap breakdown columns to account_summary
  
  1. Changes
    - Add `swap_positive` column to store total positive swap
    - Add `swap_negative` column to store total negative swap (absolute value)
  
  2. Security
    - No RLS changes needed
*/

-- Add swap breakdown columns if they don't exist
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