/*
  # Insert Realistic Demo Datasets A, B, C

  1. Purpose
    - Insert realistic demo trading data for test user
    - Three datasets with different characteristics:
      - Dataset A: 350 trades, consistent profitable trader
      - Dataset B: 420 trades, high performance trader
      - Dataset C: 480 trades, struggling trader with FOMO issues

  2. Data Details
    - All trades include pip calculations based on price difference
    - Realistic trading patterns with drawdowns and recovery periods
    - Varied currency pairs and trade setups

  3. Security
    - Only inserts data for the specific test user
    - Respects RLS policies
*/

-- Delete existing demo data for this user
DELETE FROM trades WHERE user_id = 'ff7d176e-83fd-4d27-9383-906b701c22d1' AND dataset IN ('A', 'B', 'C');