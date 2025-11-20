/*
  # Recalculate Pips for All Trades (Version 2)

  This migration recalculates the pips value for all trades in the database
  based on their open_price, close_price, item (currency pair), and side.

  ## Calculation Logic
  - For JPY pairs: pips = (close_price - open_price) * 100 (for LONG) or (open_price - close_price) * 100 (for SHORT)
  - For other pairs: pips = (close_price - open_price) * 10000 (for LONG) or (open_price - close_price) * 10000 (for SHORT)
  - Only recalculates if open_price and close_price are both greater than 0

  ## Safety
  - Does not delete any data
  - Only updates the pips column
  - Skips trades with invalid price data
*/

DO $$
DECLARE
  trade_record RECORD;
  calculated_pips DECIMAL;
  pip_multiplier INTEGER;
  price_diff DECIMAL;
  updated_count INTEGER := 0;
BEGIN
  FOR trade_record IN 
    SELECT id, item, side, open_price, close_price, pips
    FROM trades
    WHERE open_price > 0 AND close_price > 0
  LOOP
    -- Determine pip multiplier based on currency pair
    IF trade_record.item ILIKE '%jpy%' THEN
      pip_multiplier := 100;
    ELSE
      pip_multiplier := 10000;
    END IF;

    -- Calculate price difference based on trade direction
    IF trade_record.side = 'LONG' THEN
      price_diff := trade_record.close_price - trade_record.open_price;
    ELSE
      price_diff := trade_record.open_price - trade_record.close_price;
    END IF;

    -- Calculate pips
    calculated_pips := ROUND((price_diff * pip_multiplier)::NUMERIC, 1);

    -- Update the trade
    UPDATE trades
    SET pips = calculated_pips
    WHERE id = trade_record.id;

    updated_count := updated_count + 1;
  END LOOP;

  RAISE NOTICE 'Successfully recalculated pips for % trades', updated_count;
END $$;
