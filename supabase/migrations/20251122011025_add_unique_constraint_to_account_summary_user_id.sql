/*
  # Add unique constraint to account_summary.user_id

  1. Changes
    - Add UNIQUE constraint to `account_summary.user_id` column
    - This allows upsert operations with ON CONFLICT to work correctly
  
  2. Security
    - No RLS changes needed (already enabled)
*/

-- Add unique constraint to user_id if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'account_summary_user_id_key'
  ) THEN
    ALTER TABLE account_summary
    ADD CONSTRAINT account_summary_user_id_key UNIQUE (user_id);
  END IF;
END $$;