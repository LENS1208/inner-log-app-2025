/*
  # Simplify get_demo_account_summary function

  1. Changes
    - Make function generic for all users
    - Use correct column name `type` instead of `transaction_type`
    - Return empty data if no records found

  2. Purpose
    - Function works for any authenticated user
    - No hardcoded user IDs
*/

CREATE OR REPLACE FUNCTION get_demo_account_summary(p_dataset text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result json;
  v_user_id uuid;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  
  -- Return empty object if no user is authenticated
  IF v_user_id IS NULL THEN
    RETURN '{}'::json;
  END IF;

  -- Get account summary from account_summary table
  SELECT json_build_object(
    'balance', COALESCE(balance, 0),
    'equity', COALESCE(equity, 0),
    'profit', COALESCE(profit, 0),
    'deposit', COALESCE(deposit, 0),
    'withdraw', COALESCE(withdraw, 0),
    'commission', COALESCE(commission, 0),
    'swap', COALESCE(swap, 0),
    'swap_long', COALESCE(swap_long, 0),
    'swap_short', COALESCE(swap_short, 0),
    'swap_positive', COALESCE(GREATEST(swap, 0), 0),
    'swap_negative', COALESCE(LEAST(swap, 0), 0)
  ) INTO v_result
  FROM account_summary
  WHERE user_id = v_user_id;

  -- Return empty object if no summary found
  IF v_result IS NULL THEN
    RETURN '{}'::json;
  END IF;

  RETURN v_result;
END;
$$;
