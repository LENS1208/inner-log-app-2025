/*
  # Recalculate Pips for Existing Trades

  1. Purpose
    - Recalculate pips for all existing trades where pips is 0 or null
    - Use open_price, close_price, item (currency pair), and side to calculate pips

  2. Calculation Logic
    - JPY cross pairs (e.g., USDJPY): multiplier = 100
    - Non-JPY pairs (e.g., EURUSD): multiplier = 10000
    - LONG: pips = (close_price - open_price) * multiplier
    - SHORT: pips = (open_price - close_price) * multiplier

  3. Changes
    - Update pips column for all trades where pips is 0 or null
    - Only update trades that have valid open_price and close_price
*/

-- Function to calculate pips for a single trade
CREATE OR REPLACE FUNCTION calculate_pips(
  p_item TEXT,
  p_side TEXT,
  p_open_price NUMERIC,
  p_close_price NUMERIC
) RETURNS NUMERIC AS $$
DECLARE
  v_multiplier NUMERIC;
  v_diff NUMERIC;
  v_pips NUMERIC;
BEGIN
  -- Determine multiplier based on currency pair
  IF p_item ~ 'JPY$' THEN
    v_multiplier := 100;
  ELSE
    v_multiplier := 10000;
  END IF;

  -- Calculate price difference based on side
  IF p_side = 'LONG' OR p_side = 'BUY' THEN
    v_diff := p_close_price - p_open_price;
  ELSE
    v_diff := p_open_price - p_close_price;
  END IF;

  -- Calculate pips
  v_pips := ROUND(v_diff * v_multiplier, 1);

  RETURN v_pips;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update existing trades with calculated pips
UPDATE trades
SET pips = calculate_pips(item, side, open_price, close_price)
WHERE (pips = 0 OR pips IS NULL)
  AND open_price IS NOT NULL
  AND close_price IS NOT NULL
  AND open_price > 0
  AND close_price > 0;
