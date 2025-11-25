/*
  # Add setup column to trades table
  
  1. Changes
    - Add `setup` column to store trading setup type (e.g., 'Trend', 'Breakout', 'Pullback', 'Reversal', 'Range')
  
  2. Security
    - No RLS changes needed
*/

-- Add setup column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trades' AND column_name = 'setup'
  ) THEN
    ALTER TABLE trades ADD COLUMN setup text;
  END IF;
END $$;