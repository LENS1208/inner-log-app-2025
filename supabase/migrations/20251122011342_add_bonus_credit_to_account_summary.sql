/*
  # Add bonus_credit column to account_summary

  1. Changes
    - Add `bonus_credit` column to `account_summary` table for XM Points tracking
    - This allows displaying XM Point bonus credit information in the dashboard
  
  2. Security
    - No RLS changes needed (already enabled)
*/

-- Add bonus_credit column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'account_summary' AND column_name = 'bonus_credit'
  ) THEN
    ALTER TABLE account_summary
    ADD COLUMN bonus_credit numeric DEFAULT 0;
  END IF;
END $$;