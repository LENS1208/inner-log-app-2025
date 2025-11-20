/*
  # Fix trades unique constraint - Use regular constraint instead of partial index

  ## Changes

  This replaces the partial index with a regular UNIQUE constraint that works with upsert.

  1. Drop partial indexes
  2. Add regular UNIQUE constraint on (user_id, ticket)

  ## Important Notes

  - Regular UNIQUE constraints work with Supabase upsert's onConflict parameter
  - This allows different users to have trades with the same ticket number
  - Demo data will need to have a dummy user_id or be handled separately
*/

-- Step 1: Drop the partial indexes if they exist
DROP INDEX IF EXISTS trades_user_ticket_unique;
DROP INDEX IF EXISTS trades_demo_ticket_unique;

-- Step 2: Add regular UNIQUE constraint
-- This will work with upsert's onConflict parameter
ALTER TABLE trades
  DROP CONSTRAINT IF EXISTS trades_user_ticket_key CASCADE;

ALTER TABLE trades
  ADD CONSTRAINT trades_user_ticket_key
  UNIQUE (user_id, ticket);
