/*
  # Add Minimal Demo Data for Testing (v2)

  1. Purpose
    - Add a small set of demo trades to verify RLS policies work correctly
    - Other users should be able to view this demo data

  2. Changes
    - Insert 10 sample trades for dataset A
    - All data belongs to demo user but is viewable by all authenticated users
*/

DO $$
DECLARE
  demo_user_id uuid := '4e4b6842-84ea-45a4-a8d0-e31a133bf054';
BEGIN
  -- Delete existing demo data first
  DELETE FROM trades WHERE dataset IN ('A', 'B', 'C');
  
  -- Insert sample trades
  INSERT INTO trades (user_id, dataset, ticket, item, side, size, open_time, open_price, close_time, close_price, sl, tp, commission, swap, profit, pips)
  VALUES
    (demo_user_id, 'A', '101000001', 'EURUSD', 'buy', 1.0, '2025-04-01 09:00:00+00', 1.0800, '2025-04-01 15:00:00+00', 1.0850, 1.0750, 1.0900, -10, 2.5, 5000, 50),
    (demo_user_id, 'A', '101000002', 'GBPUSD', 'sell', 0.5, '2025-04-02 10:30:00+00', 1.2650, '2025-04-02 16:45:00+00', 1.2600, 1.2700, 1.2550, -8, 1.8, 2500, 50),
    (demo_user_id, 'A', '101000003', 'USDJPY', 'buy', 1.5, '2025-04-03 08:15:00+00', 149.50, '2025-04-03 14:20:00+00', 150.00, 149.00, 150.50, -12, 3.2, 7500, 50),
    (demo_user_id, 'A', '101000004', 'AUDUSD', 'buy', 1.2, '2025-04-04 11:00:00+00', 0.6600, '2025-04-04 17:30:00+00', 0.6650, 0.6550, 0.6700, -9, 2.0, 6000, 50),
    (demo_user_id, 'A', '101000005', 'EURJPY', 'sell', 0.8, '2025-04-05 09:45:00+00', 162.00, '2025-04-05 15:15:00+00', 161.20, 162.50, 160.50, -11, 2.8, 6400, 80),
    (demo_user_id, 'A', '101000006', 'GBPJPY', 'buy', 0.6, '2025-04-08 10:20:00+00', 192.00, '2025-04-08 16:50:00+00', 193.00, 191.00, 194.00, -10, 2.2, 6000, 100),
    (demo_user_id, 'A', '101000007', 'EURUSD', 'sell', 1.1, '2025-04-09 08:00:00+00', 1.0900, '2025-04-09 14:25:00+00', 1.0850, 1.0950, 1.0800, -9, 1.5, 5500, 50),
    (demo_user_id, 'A', '101000008', 'GBPUSD', 'buy', 0.9, '2025-04-10 09:30:00+00', 1.2700, '2025-04-10 15:40:00+00', 1.2750, 1.2650, 1.2800, -10, 2.0, 4500, 50),
    (demo_user_id, 'A', '101000009', 'USDJPY', 'sell', 1.3, '2025-04-11 10:10:00+00', 150.50, '2025-04-11 16:20:00+00', 150.00, 151.00, 149.50, -11, 3.0, 6500, 50),
    (demo_user_id, 'A', '101000010', 'AUDUSD', 'sell', 1.0, '2025-04-14 11:15:00+00', 0.6700, '2025-04-14 17:45:00+00', 0.6650, 0.6750, 0.6600, -8, 1.8, 5000, 50);
  
  RAISE NOTICE 'Inserted % demo trades', 10;
END $$;
