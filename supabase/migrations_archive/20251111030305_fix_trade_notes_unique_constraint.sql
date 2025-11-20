/*
  # Fix trade_notes unique constraint for multi-user support

  ## Changes

  1. Drop the old UNIQUE constraint on ticket column (CASCADE removes dependent constraints)
    - The current constraint allows only one trade note per ticket globally
    - This prevents multiple users from having trade notes with the same ticket number

  2. Add user_id column if it doesn't exist (it should already exist from previous migration)

  3. Add composite unique constraint on (user_id, ticket)
    - Allows different users to have trade notes with the same ticket number
    - Ensures each user's trade note tickets remain unique

  4. Handle demo data (user_id IS NULL)
    - Demo data will have a separate constraint
    - Ensures demo data tickets remain unique among themselves

  ## Important Notes

  - This migration is critical for multi-user support on trade_notes table
  - The upsert operation in saveTradeNote will now work correctly per user
*/

-- Step 1: Drop the old unique constraint on ticket (CASCADE removes dependent constraints)
ALTER TABLE trade_notes DROP CONSTRAINT IF EXISTS trade_notes_ticket_key CASCADE;

-- Step 2: Ensure user_id column exists (should already exist from previous migration)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trade_notes' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE trade_notes ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_trade_notes_user_id ON trade_notes(user_id);
  END IF;
END $$;

-- Step 3: Add composite unique constraint for user trade notes (user_id, ticket)
-- This allows different users to have trade notes with the same ticket number
CREATE UNIQUE INDEX IF NOT EXISTS trade_notes_user_ticket_unique
  ON trade_notes(user_id, ticket)
  WHERE user_id IS NOT NULL;

-- Step 4: Add separate unique constraint for demo data (where user_id IS NULL)
CREATE UNIQUE INDEX IF NOT EXISTS trade_notes_demo_ticket_unique
  ON trade_notes(ticket)
  WHERE user_id IS NULL;
