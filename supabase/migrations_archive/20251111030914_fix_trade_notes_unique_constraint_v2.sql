/*
  # Fix trade_notes unique constraint - Use regular constraint instead of partial index

  ## Changes

  This replaces the partial index with a regular UNIQUE constraint that works with upsert.

  1. Drop partial indexes
  2. Add regular UNIQUE constraint on (user_id, ticket)

  ## Important Notes

  - Regular UNIQUE constraints work with Supabase upsert's onConflict parameter
  - This allows different users to have trade notes with the same ticket number
*/

-- Step 1: Drop the partial indexes if they exist
DROP INDEX IF EXISTS trade_notes_user_ticket_unique;
DROP INDEX IF EXISTS trade_notes_demo_ticket_unique;

-- Step 2: Add regular UNIQUE constraint
-- This will work with upsert's onConflict parameter
ALTER TABLE trade_notes
  DROP CONSTRAINT IF EXISTS trade_notes_user_ticket_key CASCADE;

ALTER TABLE trade_notes
  ADD CONSTRAINT trade_notes_user_ticket_key
  UNIQUE (user_id, ticket);
