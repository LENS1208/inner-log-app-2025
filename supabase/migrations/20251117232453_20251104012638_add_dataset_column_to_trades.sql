/*
  # Add dataset column to trades table

  1. Changes
    - Add `dataset` column to `trades` table
      - Type: text (enum-like: 'A', 'B', 'C', or null for user data)
      - Default: null (user's own data)
      - Allows filtering by demo dataset
    
  2. Purpose
    - Enable storage of multiple demo datasets (A, B, C)
    - Distinguish between demo data and user's actual trading data
    - Support dataset switching in UI
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trades' AND column_name = 'dataset'
  ) THEN
    ALTER TABLE trades ADD COLUMN dataset text DEFAULT NULL;
    
    COMMENT ON COLUMN trades.dataset IS 'Dataset identifier: A, B, C for demo data, NULL for user data';
    
    CREATE INDEX IF NOT EXISTS idx_trades_dataset ON trades(dataset);
  END IF;
END $$;
