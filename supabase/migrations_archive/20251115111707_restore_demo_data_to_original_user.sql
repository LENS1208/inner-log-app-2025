/*
  # Restore demo data to original user

  1. Purpose
    - Restore demo data back to the original demo user (takuan_1000@yahoo.co.jp)
    - This undoes the previous migration that copied data to test user

  2. Changes
    - Move all dataset A, B, C data back to original demo user
*/

DO $$
DECLARE
  demo_user_id uuid := '4e4b6842-84ea-45a4-a8d0-e31a133bf054'; -- takuan_1000@yahoo.co.jp
  test_user_id uuid := '9cdbc5c1-d973-4585-96e5-0a76a330adfb'; -- kan.yamaji@gmail.com
  trades_count int;
  notes_count int;
  daily_notes_count int;
  transactions_count int;
BEGIN
  -- Restore trades with dataset A, B, C to demo user
  UPDATE trades 
  SET user_id = demo_user_id
  WHERE user_id = test_user_id 
    AND dataset IN ('A', 'B', 'C');
  GET DIAGNOSTICS trades_count = ROW_COUNT;

  -- Restore trade_notes for those trades
  UPDATE trade_notes 
  SET user_id = demo_user_id
  WHERE user_id = test_user_id
    AND EXISTS (
      SELECT 1 FROM trades 
      WHERE trades.ticket = trade_notes.ticket 
      AND trades.dataset IN ('A', 'B', 'C')
    );
  GET DIAGNOSTICS notes_count = ROW_COUNT;

  -- Restore daily_notes for demo user
  UPDATE daily_notes 
  SET user_id = demo_user_id
  WHERE user_id = test_user_id;
  GET DIAGNOSTICS daily_notes_count = ROW_COUNT;

  -- Restore account_transactions
  UPDATE account_transactions 
  SET user_id = demo_user_id
  WHERE user_id = test_user_id
    AND dataset IN ('A', 'B', 'C');
  GET DIAGNOSTICS transactions_count = ROW_COUNT;

  -- Restore account_summary
  UPDATE account_summary 
  SET user_id = demo_user_id
  WHERE user_id = test_user_id
    AND dataset IN ('A', 'B', 'C');

  -- Restore user_settings if exists
  DELETE FROM user_settings WHERE user_id = test_user_id;

  RAISE NOTICE 'Demo data restored:';
  RAISE NOTICE '  - Trades: % records', trades_count;
  RAISE NOTICE '  - Trade notes: % records', notes_count;
  RAISE NOTICE '  - Daily notes: % records', daily_notes_count;
  RAISE NOTICE '  - Account transactions: % records', transactions_count;
END $$;
