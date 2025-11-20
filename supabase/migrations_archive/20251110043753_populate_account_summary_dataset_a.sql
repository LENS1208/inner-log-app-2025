/*
  # Populate Account Summary for Dataset A
  
  1. Summary
    This migration calculates and populates the account_summary table for dataset A
    based on the transactions in account_transactions table.
  
  2. Calculated Values
    - **total_deposits**: Sum of all deposit transactions (¥1,550,000)
    - **total_withdrawals**: Sum of all withdrawal transactions (¥530,000)
    - **xm_points_earned**: Sum of all credit_in transactions (¥290,500)
    - **xm_points_used**: Sum of all credit_out transactions (¥122,000)
    - **total_swap**: Calculated from trades table
    - **total_commission**: Calculated from trades table
    - **total_profit**: Calculated from trades table
    - **closed_pl**: Total P/L including commission, swap, and profit
  
  3. Data Processing
    - Aggregates data from account_transactions and trades tables
    - Creates or updates summary record for each user with dataset A data
    - Uses UPSERT pattern to handle existing records
  
  4. Important Notes
    - Summary is automatically calculated from source data
    - All values are in Japanese Yen (JPY)
    - Updated timestamp is set to current time
*/

DO $$
DECLARE
  user_record RECORD;
  deposits numeric;
  withdrawals numeric;
  xm_earned numeric;
  xm_used numeric;
  swap_total numeric;
  commission_total numeric;
  profit_total numeric;
  closed_pl_total numeric;
BEGIN
  FOR user_record IN SELECT id FROM auth.users LOOP
    SELECT 
      COALESCE(SUM(CASE WHEN transaction_type = 'deposit' THEN amount ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN transaction_type = 'withdrawal' THEN ABS(amount) ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN transaction_type = 'credit_in' THEN amount ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN transaction_type = 'credit_out' THEN ABS(amount) ELSE 0 END), 0)
    INTO deposits, withdrawals, xm_earned, xm_used
    FROM account_transactions
    WHERE user_id = user_record.id AND dataset = 'A';

    SELECT 
      COALESCE(SUM(swap), 0),
      COALESCE(SUM(commission), 0),
      COALESCE(SUM(profit), 0)
    INTO swap_total, commission_total, profit_total
    FROM trades
    WHERE user_id = user_record.id AND dataset = 'A';

    closed_pl_total := commission_total + swap_total + profit_total;

    INSERT INTO account_summary (
      user_id, 
      dataset, 
      total_deposits, 
      total_withdrawals, 
      xm_points_earned, 
      xm_points_used,
      total_swap,
      total_commission,
      total_profit,
      closed_pl,
      updated_at
    ) VALUES (
      user_record.id,
      'A',
      deposits,
      withdrawals,
      xm_earned,
      xm_used,
      swap_total,
      commission_total,
      profit_total,
      closed_pl_total,
      now()
    )
    ON CONFLICT (user_id, dataset) 
    DO UPDATE SET
      total_deposits = EXCLUDED.total_deposits,
      total_withdrawals = EXCLUDED.total_withdrawals,
      xm_points_earned = EXCLUDED.xm_points_earned,
      xm_points_used = EXCLUDED.xm_points_used,
      total_swap = EXCLUDED.total_swap,
      total_commission = EXCLUDED.total_commission,
      total_profit = EXCLUDED.total_profit,
      closed_pl = EXCLUDED.closed_pl,
      updated_at = now();
  END LOOP;
END $$;
