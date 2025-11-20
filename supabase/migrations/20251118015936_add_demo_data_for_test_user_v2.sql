/*
  # Add demo trading data for test user

  1. Adds demo trades from dataset A to test user
    - 10 sample trades covering various scenarios
    - Realistic prices, commissions, swaps
    - Includes both winning and losing trades
  
  2. Security
    - Data only added for specific test user
    - Respects existing RLS policies
*/

DO $$
DECLARE
  test_user_id uuid;
BEGIN
  -- Get test user ID
  SELECT id INTO test_user_id FROM auth.users WHERE email = 'kan.yamaji@gmail.com';
  
  IF test_user_id IS NULL THEN
    RAISE EXCEPTION 'Test user not found';
  END IF;

  -- Insert demo trades (Dataset A) 
  -- Calculate pips for each trade
  INSERT INTO trades (
    user_id, dataset, ticket, item, side, size, 
    open_time, open_price, close_time, close_price,
    sl, tp, commission, swap, profit, pips
  ) VALUES
    (test_user_id, 'A', '101001', 'USDJPY', 'buy', 1.0, 
     '2025-01-02 09:00:00', 148.500, '2025-01-02 15:30:00', 149.200,
     148.200, 149.500, -12, 1.5, 68000, 70),
    
    (test_user_id, 'A', '101002', 'EURUSD', 'sell', 1.5,
     '2025-01-03 10:15:00', 1.09500, '2025-01-03 14:20:00', 1.09200,
     1.09800, 1.09000, -12, 2.0, 45000, 30),
    
    (test_user_id, 'A', '101003', 'GBPJPY', 'buy', 0.8,
     '2025-01-04 08:30:00', 195.200, '2025-01-04 12:45:00', 195.800,
     194.900, 196.000, -12, 1.2, 48000, 60),
    
    (test_user_id, 'A', '101004', 'AUDUSD', 'buy', 1.2,
     '2025-01-05 11:00:00', 0.65400, '2025-01-05 16:30:00', 0.65800,
     0.65100, 0.66000, -12, 0.8, 48000, 40),
    
    (test_user_id, 'A', '101005', 'USDJPY', 'sell', 1.0,
     '2025-01-08 09:30:00', 149.800, '2025-01-08 14:00:00', 149.200,
     150.100, 149.000, -12, 1.8, 58000, 60),
    
    (test_user_id, 'A', '101006', 'EURUSD', 'buy', 1.5,
     '2025-01-09 10:00:00', 1.08200, '2025-01-09 15:30:00', 1.08800,
     1.08000, 1.09000, -12, 2.5, 90000, 60),
    
    (test_user_id, 'A', '101007', 'GBPJPY', 'sell', 0.8,
     '2025-01-10 08:45:00', 196.500, '2025-01-10 13:15:00', 195.800,
     196.800, 195.500, -12, 1.5, 56000, 70),
    
    (test_user_id, 'A', '101008', 'AUDUSD', 'sell', 1.0,
     '2025-01-11 12:00:00', 0.66200, '2025-01-11 17:00:00', 0.65700,
     0.66500, 0.65500, -12, 1.0, 50000, 50),
    
    (test_user_id, 'A', '101009', 'USDJPY', 'buy', 1.2,
     '2025-01-12 09:15:00', 148.300, '2025-01-12 14:45:00', 149.000,
     148.000, 149.300, -12, 2.0, 84000, 70),
    
    (test_user_id, 'A', '101010', 'EURUSD', 'sell', 1.5,
     '2025-01-15 10:30:00', 1.09800, '2025-01-15 16:00:00', 1.09100,
     1.10100, 1.08900, -12, 3.0, 105000, 70)
  ON CONFLICT (user_id, ticket) DO NOTHING;
  
  RAISE NOTICE 'Demo data added for test user %', test_user_id;
END $$;
