/*
  # Remove all dangerous public access policies

  1. Critical Security Issue
    - Multiple tables have "Allow all access" policies with role {public}
    - This allows ANYONE (including unauthenticated users) to DELETE, UPDATE, INSERT data
    - This is a CRITICAL security vulnerability

  2. Tables with dangerous policies
    - trades: "Allow all access to trades"
    - trade_notes: "Allow all access to trade_notes"
    - daily_notes: "Allow all access to daily_notes"
    - free_memos: "Allow all access to free_memos"
    - note_links: "Allow all access to note_links"

  3. Action
    - DROP all "Allow all access" policies
    - Keep only authenticated user policies that check user_id
*/

-- Drop dangerous public policies
DROP POLICY IF EXISTS "Allow all access to trades" ON trades;
DROP POLICY IF EXISTS "Allow all access to trade_notes" ON trade_notes;
DROP POLICY IF EXISTS "Allow all access to daily_notes" ON daily_notes;
DROP POLICY IF EXISTS "Allow all access to free_memos" ON free_memos;
DROP POLICY IF EXISTS "Allow all access to note_links" ON note_links;

-- Verify no more public policies with ALL permissions exist
DO $$
DECLARE
  dangerous_policy RECORD;
BEGIN
  FOR dangerous_policy IN 
    SELECT tablename, policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' 
      AND 'public' = ANY(roles)
      AND cmd = 'ALL'
      AND qual = 'true'
  LOOP
    RAISE WARNING 'Found remaining dangerous policy: %.%', dangerous_policy.tablename, dangerous_policy.policyname;
  END LOOP;
END $$;
