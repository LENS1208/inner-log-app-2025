/*
  # Fix daily_notes unique constraint - Use regular constraint instead of partial index

  ## Changes

  This replaces the partial index with a regular UNIQUE constraint that works with upsert.

  1. Drop partial indexes
  2. Add regular UNIQUE constraint on (user_id, date_key)

  ## Important Notes

  - Regular UNIQUE constraints work with Supabase upsert's onConflict parameter
  - This allows different users to have daily notes for the same date
*/

-- Step 1: Drop the partial indexes if they exist
DROP INDEX IF EXISTS daily_notes_user_date_unique;
DROP INDEX IF EXISTS daily_notes_demo_date_unique;

-- Step 2: Add regular UNIQUE constraint
-- This will work with upsert's onConflict parameter
ALTER TABLE daily_notes
  DROP CONSTRAINT IF EXISTS daily_notes_user_date_key CASCADE;

ALTER TABLE daily_notes
  ADD CONSTRAINT daily_notes_user_date_key
  UNIQUE (user_id, date_key);
