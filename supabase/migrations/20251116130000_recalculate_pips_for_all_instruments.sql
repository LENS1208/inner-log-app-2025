/*
  # Recalculate Pips for All Instruments (Gold, Silver, Oil, Crypto, etc.)

  This migration updates the pips calculation to support various instrument types
  beyond standard forex pairs, including precious metals, commodities, and crypto.

  ## Updated Calculation Logic
  - JPY pairs: multiplier = 100
  - Gold (XAU): multiplier = 10
  - Silver (XAG): multiplier = 1000
  - Oil (WTI, BRENT): multiplier = 100
  - Crypto (BTC, ETH): multiplier = 1
  - Indices (US30, JP225, etc.): multiplier = 1
  - Standard forex pairs: multiplier = 10000

  ## Safety
  - Does not delete any data
  - Only updates the pips column
  - Skips trades with invalid price data
*/

CREATE OR REPLACE FUNCTION get_pip_multiplier(symbol TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  upper_symbol TEXT;
BEGIN
  upper_symbol := UPPER(symbol);

  IF upper_symbol LIKE '%JPY%' THEN
    RETURN 100;
  ELSIF upper_symbol LIKE '%GOLD%' OR upper_symbol LIKE '%XAU%' THEN
    RETURN 10;
  ELSIF upper_symbol LIKE '%SILVER%' OR upper_symbol LIKE '%XAG%' THEN
    RETURN 1000;
  ELSIF upper_symbol LIKE '%OIL%' OR upper_symbol LIKE '%WTI%' OR upper_symbol LIKE '%BRENT%' THEN
    RETURN 100;
  ELSIF upper_symbol LIKE '%BTC%' OR upper_symbol LIKE '%ETH%' OR upper_symbol LIKE '%CRYPTO%' THEN
    RETURN 1;
  ELSIF upper_symbol ~ '^(US|JP|DE|UK|FR)[0-9]+' THEN
    RETURN 1;
  ELSE
    RETURN 10000;
  END IF;
END;
$$;

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
    pip_multiplier := get_pip_multiplier(trade_record.item);

    IF trade_record.side = 'LONG' THEN
      price_diff := trade_record.close_price - trade_record.open_price;
    ELSE
      price_diff := trade_record.open_price - trade_record.close_price;
    END IF;

    calculated_pips := ROUND((price_diff * pip_multiplier)::NUMERIC, 1);

    UPDATE trades
    SET pips = calculated_pips
    WHERE id = trade_record.id;

    updated_count := updated_count + 1;
  END LOOP;

  RAISE NOTICE 'Successfully recalculated pips for % trades with new instrument support', updated_count;
END $$;
