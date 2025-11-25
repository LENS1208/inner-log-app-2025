/*
  # Create get_demo_account_summary function

  1. Purpose
    - Calculate account summary for demo datasets (A, B, C)
    - Aggregate deposit, withdraw, swap, commission, and bonus credit from CSV data

  2. Function
    - `get_demo_account_summary(p_dataset text)`: Returns aggregated account summary for the specified dataset
    - Returns placeholder structure for frontend CSV parsing

  3. Security
    - Function is accessible to all users (public demo data)
*/

CREATE OR REPLACE FUNCTION get_demo_account_summary(p_dataset text DEFAULT 'A')
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
  v_result json;
BEGIN
  -- This function returns a placeholder structure
  -- The actual calculation is done on the frontend by parsing CSV files

  SELECT json_build_object(
    'balance', 0,
    'equity', 0,
    'profit', 0,
    'deposit', 0,
    'withdraw', 0,
    'commission', 0,
    'swap', 0,
    'swap_long', 0,
    'swap_short', 0,
    'swap_positive', 0,
    'swap_negative', 0,
    'bonus_credit', 0
  ) INTO v_result;

  RETURN v_result;
END;
$$;
