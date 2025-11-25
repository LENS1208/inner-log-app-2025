/*
  # Fix get_demo_account_summary function

  1. Changes
    - Update column name from `transaction_type` to `type`
    - Remove hardcoded user_id and make it generic
    - Remove `category` column reference (doesn't exist)

  2. Purpose
    - Function now works for any user
    - Correctly references actual table columns
*/

CREATE OR REPLACE FUNCTION get_demo_account_summary(p_dataset text, p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result json;
BEGIN
  SELECT json_build_object(
    'total_deposits', COALESCE(SUM(CASE WHEN type = 'deposit' THEN amount ELSE 0 END), 0),
    'total_withdrawals', COALESCE(SUM(CASE WHEN type = 'withdrawal' THEN amount ELSE 0 END), 0),
    'total_swap', COALESCE(SUM(CASE WHEN type = 'swap' THEN amount ELSE 0 END), 0),
    'swap_positive', COALESCE(SUM(CASE WHEN type = 'swap' AND amount > 0 THEN amount ELSE 0 END), 0),
    'swap_negative', COALESCE(ABS(SUM(CASE WHEN type = 'swap' AND amount < 0 THEN amount ELSE 0 END)), 0),
    'xm_points_earned', COALESCE(SUM(CASE WHEN type = 'credit' AND amount > 0 THEN amount ELSE 0 END), 0),
    'xm_points_used', COALESCE(SUM(CASE WHEN type = 'credit' AND amount < 0 THEN ABS(amount) ELSE 0 END), 0)
  ) INTO v_result
  FROM account_transactions
  WHERE user_id = p_user_id;

  RETURN v_result;
END;
$$;
