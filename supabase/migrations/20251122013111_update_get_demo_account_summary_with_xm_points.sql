/*
  # Update get_demo_account_summary function with XM Points fields

  1. Changes
    - Add `xm_points_earned` and `xm_points_used` fields to the return structure
    - This allows displaying separate earned and used XM Points cards

  2. Security
    - No changes to security (function remains public for demo data)
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
    'bonus_credit', 0,
    'xm_points_earned', 0,
    'xm_points_used', 0
  ) INTO v_result;

  RETURN v_result;
END;
$$;