/*
  # Fix daily_notes unique constraint for multi-user support

  ## Changes

  1. Drop the old UNIQUE constraint on date_key column
    - The current constraint allows only one daily note per date globally
    - This prevents multiple users from having daily notes for the same date

  2. Add composite unique constraint on (user_id, date_key)
    - Allows different users to have daily notes for the same date
    - Ensures each user's date keys remain unique

  3. Handle demo data (user_id IS NULL)
    - Demo data will have a separate constraint
    - Ensures demo data date keys remain unique among themselves

  ## Important Notes

  - This migration is critical for multi-user support on daily_notes table
  - The upsert operation in saveDailyNote will now work correctly per user
*/

-- Step 1: Drop the old unique constraint on date_key
ALTER TABLE daily_notes DROP CONSTRAINT IF EXISTS daily_notes_date_key_key CASCADE;

-- Step 2: Add composite unique constraint for user daily notes (user_id, date_key)
-- This allows different users to have daily notes for the same date
CREATE UNIQUE INDEX IF NOT EXISTS daily_notes_user_date_unique
  ON daily_notes(user_id, date_key)
  WHERE user_id IS NOT NULL;

-- Step 3: Add separate unique constraint for demo data (where user_id IS NULL)
CREATE UNIQUE INDEX IF NOT EXISTS daily_notes_demo_date_unique
  ON daily_notes(date_key)
  WHERE user_id IS NULL;
