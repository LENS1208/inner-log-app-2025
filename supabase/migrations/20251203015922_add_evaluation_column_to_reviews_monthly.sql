/*
  # Add evaluation column to reviews_monthly table

  1. Changes
    - Add `evaluation` column (jsonb) to store comprehensive evaluation scores
    - This column stores:
      - Overall score and level
      - 5 evaluation scores (entry_skill, drawdown_control, risk_reward, risk_management, profit_stability)
      - Detailed metrics for each evaluation axis
    - Column is nullable to support existing records

  2. Security
    - No RLS changes needed (existing policies apply to all columns)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reviews_monthly' AND column_name = 'evaluation'
  ) THEN
    ALTER TABLE reviews_monthly ADD COLUMN evaluation jsonb;
  END IF;
END $$;
