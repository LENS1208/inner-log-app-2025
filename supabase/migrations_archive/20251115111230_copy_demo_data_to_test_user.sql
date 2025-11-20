/*
  # Copy demo data to test user

  1. Purpose
    - Copy all demo trades from takuan_1000@yahoo.co.jp to kan.yamaji@gmail.com
    - This allows testing with the test2025 password that works

  2. Changes
    - Update user_id for all trades from datasets A, B, C
    - Update user_id for all related data (trade_notes, daily_notes, account_transactions)
*/

DO $$
DECLARE
  source_user_id uuid := '4e4b6842-84ea-45a4-a8d0-e31a133bf054';
  target_user_id uuid := '9cdbc5c1-d973-4585-96e5-0a76a330adfb';
  trades_count int;
  notes_count int;
  daily_notes_count int;
  transactions_count int;
BEGIN
  -- Update trades
  UPDATE trades 
  SET user_id = target_user_id
  WHERE user_id = source_user_id;
  GET DIAGNOSTICS trades_count = ROW_COUNT;

  -- Update trade_notes
  UPDATE trade_notes 
  SET user_id = target_user_id
  WHERE user_id = source_user_id;
  GET DIAGNOSTICS notes_count = ROW_COUNT;

  -- Update daily_notes
  UPDATE daily_notes 
  SET user_id = target_user_id
  WHERE user_id = source_user_id;
  GET DIAGNOSTICS daily_notes_count = ROW_COUNT;

  -- Update account_transactions
  UPDATE account_transactions 
  SET user_id = target_user_id
  WHERE user_id = source_user_id;
  GET DIAGNOSTICS transactions_count = ROW_COUNT;

  -- Update user_settings if exists
  UPDATE user_settings 
  SET user_id = target_user_id
  WHERE user_id = source_user_id;

  RAISE NOTICE 'Demo data copied to test user:';
  RAISE NOTICE '  - Trades: % records', trades_count;
  RAISE NOTICE '  - Trade notes: % records', notes_count;
  RAISE NOTICE '  - Daily notes: % records', daily_notes_count;
  RAISE NOTICE '  - Account transactions: % records', transactions_count;
  RAISE NOTICE 'Login with: kan.yamaji@gmail.com / test2025';
END $$;
