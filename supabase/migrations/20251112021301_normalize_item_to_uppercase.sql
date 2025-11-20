/*
  # Normalize item (currency pair) to uppercase

  1. Changes
    - Update all existing trades to have uppercase item values
    - Convert: usdjpy → USDJPY, gold → GOLD, etc.
  
  2. Data Integrity
    - Uses UPPER() function to safely convert existing data
    - No data loss, only case normalization
  
  3. Notes
    - This ensures consistency across the application
    - All new data should also be stored in uppercase
*/

-- Update all existing trades to uppercase
UPDATE trades 
SET item = UPPER(item)
WHERE item != UPPER(item);
