/*
  # Create get_demo_account_summary function

  1. Function Purpose
    - Retrieves account summary data for demo datasets (A/B/C)
    - Returns aggregated transaction data including deposits, withdrawals, swap points, and XM points
    - Called from frontend components to display financial summaries

  2. Return Fields
    - total_deposits: Sum of all deposit transactions
    - total_withdrawals: Sum of all withdrawal transactions
    - total_swap: Total swap points (positive + negative)
    - swap_positive: Sum of positive swap points
    - swap_negative: Absolute value of negative swap points
    - xm_points_earned: Sum of earned XM loyalty points
    - xm_points_used: Sum of used XM loyalty points

  3. Security
    - Function uses SECURITY DEFINER to access account_transactions table
    - Filters data by dataset and specific test user ID
    - Returns JSON object with aggregated data
*/

CREATE OR REPLACE FUNCTION get_demo_account_summary(p_dataset text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result json;
BEGIN
  SELECT json_build_object(
    'total_deposits', COALESCE(SUM(CASE WHEN transaction_type = 'deposit' THEN amount ELSE 0 END), 0),
    'total_withdrawals', COALESCE(SUM(CASE WHEN transaction_type = 'withdrawal' THEN amount ELSE 0 END), 0),
    'total_swap', COALESCE(SUM(CASE WHEN transaction_type = 'swap' THEN amount ELSE 0 END), 0),
    'swap_positive', COALESCE(SUM(CASE WHEN transaction_type = 'swap' AND amount > 0 THEN amount ELSE 0 END), 0),
    'swap_negative', COALESCE(ABS(SUM(CASE WHEN transaction_type = 'swap' AND amount < 0 THEN amount ELSE 0 END)), 0),
    'xm_points_earned', COALESCE(SUM(CASE WHEN category = 'credit' AND amount > 0 THEN amount ELSE 0 END), 0),
    'xm_points_used', COALESCE(SUM(CASE WHEN category = 'credit' AND amount < 0 THEN ABS(amount) ELSE 0 END), 0)
  ) INTO v_result
  FROM account_transactions
  WHERE dataset = p_dataset
    AND user_id = '9cdbc5c1-d973-4585-96e5-0a76a330adfb';

  RETURN v_result;
END;
$$;
