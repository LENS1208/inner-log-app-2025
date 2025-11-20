/*
  # Update Demo Datasets A, B, C with Comprehensive Trading Data

  1. Overview
    This migration replaces existing demo trading data with new comprehensive datasets
    that showcase different trader profiles and tool features.

  2. Dataset Characteristics
    
    Dataset A (262 trades, Dec 2024 - Nov 2025):
    - High-frequency trader profile
    - Fluctuating performance with final profit: ¥1,215,332
    - Up and down cycles demonstrating recovery patterns
    - Comprehensive pair coverage: EURUSD, GBPUSD, USDJPY, AUDUSD, EURJPY, GBPJPY

    Dataset B (754 trades, Aug 2024 - Nov 2025):
    - Multi-pair diversified trader
    - 16 different currency pairs
    - Variable performance by pair (some pairs more profitable than others)
    - Demonstrates pair-specific strategy effectiveness

    Dataset C (213 trades, Jan 2025 - Nov 2025):
    - Mistake-prone trader profile
    - Builds profit then experiences large losses (FOMO/Revenge trades)
    - Random loss patterns to demonstrate risk management failures
    - Shows realistic emotional trading behavior

  3. Data Changes
    - Deletes all existing demo trades for datasets A, B, C
    - Inserts comprehensive new trade data
    - All trades include proper pips calculations
    - Setup types include: Trend, Breakout, Reversal, Pullback, Range, Scalp, FOMO, Revenge, News, Pattern

  4. Security
    - Data is scoped per user
    - Uses ON CONFLICT to prevent duplicates
    - Maintains existing RLS policies
*/