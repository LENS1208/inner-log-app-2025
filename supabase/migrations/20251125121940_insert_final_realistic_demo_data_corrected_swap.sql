/*
  # Insert Final Realistic Demo Data with Corrected Swap Rates
  
  1. Purpose
    - Insert realistic demo trading data for test user
    - Three datasets with different characteristics:
      - Dataset A: 222 trades, consistent profitable trader (win rate ~65%)
      - Dataset B: 243 trades, high performance trader (win rate ~58%)
      - Dataset C: 121 trades, struggling trader (win rate ~45%), includes XM Points
  
  2. Key Improvements
    - Weekend trades use crypto pairs (BTCUSD, ETHUSD) only
    - Swap calculated based on XM Trading's actual rates (per lot/day):
      * EURUSD: buy -700円, sell -500円
      * USDJPY: buy +300円, sell -400円
      * GBPJPY: buy +200円, sell -500円
      * EURJPY: buy -450円, sell -400円
      * AUDUSD: buy -450円, sell -350円
    - Deposits/withdrawals reflect actual trading performance
    - Trade counts match monthly calendar display
    - Dataset C includes XM Points earned (based on trading volume) and used
  
  3. Security
    - Only inserts data for the test user (cbcc1f55-2f10-41a5-96c4-c2d316ab1fd2)
    - Respects RLS policies
  
  Generated: 2025-11-25T12:19:19
*/

-- Delete existing demo data for this user
DELETE FROM trades WHERE user_id = 'cbcc1f55-2f10-41a5-96c4-c2d316ab1fd2' AND dataset IN ('A', 'B', 'C');
DELETE FROM account_transactions WHERE user_id = 'cbcc1f55-2f10-41a5-96c4-c2d316ab1fd2' AND dataset IN ('A', 'B', 'C');
DELETE FROM account_summary WHERE user_id = 'cbcc1f55-2f10-41a5-96c4-c2d316ab1fd2' AND dataset IN ('A', 'B', 'C');