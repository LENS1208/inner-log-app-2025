/*
  # Add Admin Access to All Tables

  1. Changes
    - Update RLS policies on trades table to allow admin read access
    - Update RLS policies on import_history table to allow admin read access
    - Update RLS policies on other user tables to allow admin read access

  2. Security
    - Admins can read all data for monitoring purposes
    - Regular users can only read/write their own data
    - Admin status is checked from user_settings table
*/

-- Helper function to check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN (
    SELECT is_admin
    FROM user_settings
    WHERE user_id = auth.uid()
    LIMIT 1
  ) = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update trades table policies
DROP POLICY IF EXISTS "Users can read own trades" ON trades;
CREATE POLICY "Users can read own trades or admins can read all"
  ON trades
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR is_admin());

-- Update import_history table policies
DROP POLICY IF EXISTS "Users can read own import history" ON import_history;
CREATE POLICY "Users can read own import history or admins can read all"
  ON import_history
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR is_admin());

-- Update trade_notes table policies
DROP POLICY IF EXISTS "Users can read own trade notes" ON trade_notes;
CREATE POLICY "Users can read own trade notes or admins can read all"
  ON trade_notes
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR is_admin());

-- Update daily_notes table policies
DROP POLICY IF EXISTS "Users can read own daily notes" ON daily_notes;
CREATE POLICY "Users can read own daily notes or admins can read all"
  ON daily_notes
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR is_admin());

-- Update account_summary table policies
DROP POLICY IF EXISTS "Users can read own account summary" ON account_summary;
CREATE POLICY "Users can read own account summary or admins can read all"
  ON account_summary
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR is_admin());

-- Update account_transactions table policies
DROP POLICY IF EXISTS "Users can read own account transactions" ON account_transactions;
CREATE POLICY "Users can read own account transactions or admins can read all"
  ON account_transactions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR is_admin());
